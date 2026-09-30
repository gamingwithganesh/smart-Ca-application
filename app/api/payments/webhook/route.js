import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Payment from '@/lib/models/Payment';
import Document from '@/lib/models/Document';
import User from '@/lib/models/User';
import { verifyWebhookSignature, SUBSCRIPTION_PLANS } from '@/lib/razorpay';

export async function POST(req) {
  try {
    // 1. Read raw body as text for HMAC verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ message: 'Missing x-razorpay-signature header' }, { status: 400 });
    }

    // 2. Verify webhook authenticity
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('❌ Razorpay Webhook signature verification failed');
      return NextResponse.json({ message: 'Invalid webhook signature' }, { status: 400 });
    }

    // 3. Parse JSON event payload
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ message: 'Malformed JSON payload' }, { status: 400 });
    }

    const eventName = event.event;
    const eventId = event.id || `evt_${Date.now()}`;
    const payload = event.payload;

    await dbConnect();

    // =========================================================================
    // A. Handle: payment.captured OR order.paid
    // =========================================================================
    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const orderEntity = payload.order?.entity;

      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const rzpPaymentId = paymentEntity?.id;
      const paymentMethod = paymentEntity?.method || 'Razorpay Webhook';

      if (!rzpOrderId && !rzpPaymentId) {
        return NextResponse.json({ status: 'ignored_missing_ids' });
      }

      const payment = await Payment.findOne({
        $or: [
          ...(rzpOrderId ? [{ razorpayOrderId: rzpOrderId }] : []),
          ...(rzpPaymentId ? [{ razorpayPaymentId: rzpPaymentId }] : [])
        ]
      });

      if (payment) {
        // Idempotency: check if this event was already logged
        const alreadyProcessed = payment.webhookEvents?.some((e) => e.eventId === eventId);
        if (alreadyProcessed && payment.status === 'PAID') {
          return NextResponse.json({ status: 'already_processed' });
        }

        payment.status = 'PAID';
        if (rzpPaymentId) payment.razorpayPaymentId = rzpPaymentId;
        payment.paymentMethod = paymentMethod;
        if (!payment.paidAt) payment.paidAt = new Date();

        payment.webhookEvents.push({
          eventId,
          eventName,
          processedAt: new Date(),
          summary: `Payment captured via webhook (${rzpPaymentId || 'N/A'})`
        });

        await payment.save();

        // Fulfill Document unlock
        if (payment.purpose === 'document_fee' && payment.documentId) {
          await Document.collection.updateOne(
            { _id: payment.documentId },
            {
              $set: {
                paymentStatus: 'COMPLETED',
                paidAt: payment.paidAt || new Date(),
                paymentId: rzpPaymentId || payment.razorpayPaymentId,
                paymentMethod,
                updatedAt: new Date()
              }
            }
          );
        }

        // Fulfill CA Plan Upgrade
        if (payment.purpose === 'subscription_plan') {
          const caUser = await User.findById(payment.userId);
          if (caUser && caUser.subscription?.status !== 'active') {
            const planKey = payment.planId || 'Professional';
            const planConfig = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.Professional;
            const cycle = payment.billingCycle || 'monthly';
            const durationDays = planConfig.durationDays[cycle] || 30;

            const now = new Date();
            const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

            caUser.subscription = {
              plan: planConfig.id,
              status: 'active',
              startDate: now,
              expiresAt,
              pricePerMonth: planConfig.prices.monthly,
              billingCycle: cycle,
              maxSubCas: planConfig.maxSubCas,
              maxClients: planConfig.maxClients,
              notes: `Auto-renewed via Razorpay Webhook (${eventId})`
            };
            caUser.status = 'active';
            caUser.pauseReason = '';
            await caUser.save();
          }
        }
      }
    }

    // =========================================================================
    // B. Handle: payment.failed
    // =========================================================================
    if (eventName === 'payment.failed') {
      const paymentEntity = payload.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const rzpPaymentId = paymentEntity?.id;
      const reason = paymentEntity?.error_description || paymentEntity?.error_reason || 'Payment failed';

      if (rzpOrderId || rzpPaymentId) {
        const payment = await Payment.findOne({
          $or: [
            ...(rzpOrderId ? [{ razorpayOrderId: rzpOrderId }] : []),
            ...(rzpPaymentId ? [{ razorpayPaymentId: rzpPaymentId }] : [])
          ]
        });

        if (payment && payment.status !== 'PAID') {
          payment.status = 'FAILED';
          payment.failureReason = reason;
          payment.webhookEvents.push({
            eventId,
            eventName,
            processedAt: new Date(),
            summary: `Failed: ${reason}`
          });
          await payment.save();
        }
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ message: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
