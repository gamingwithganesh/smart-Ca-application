import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Payment from '@/lib/models/Payment';
import Document from '@/lib/models/Document';
import User from '@/lib/models/User';
import { getAuthenticatedUser } from '@/lib/auth';
import { verifyPaymentSignature, SUBSCRIPTION_PLANS } from '@/lib/razorpay';

export async function POST(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error || !auth.user) {
      return NextResponse.json({ message: auth.error || 'Authentication required' }, { status: auth.status || 401 });
    }

    await dbConnect();
    const user = auth.user;
    const body = await req.json().catch(() => ({}));

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderRef,
      paymentMethod = 'Razorpay'
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { message: 'Missing Razorpay order ID or payment ID' },
        { status: 400 }
      );
    }

    // Cryptographic signature verification
    const isValidSignature = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    // Find the corresponding Payment record in DB
    const payment = await Payment.findOne({
      $or: [
        { razorpayOrderId: razorpay_order_id },
        ...(orderRef ? [{ orderRef }] : [])
      ]
    });

    if (!payment) {
      return NextResponse.json(
        { message: 'Payment record not found for this order' },
        { status: 404 }
      );
    }

    if (!isValidSignature) {
      payment.status = 'FAILED';
      payment.failureReason = 'Signature verification failed';
      payment.updatedAt = new Date();
      await payment.save();

      return NextResponse.json(
        { message: 'Invalid payment signature. Payment could not be verified.' },
        { status: 400 }
      );
    }

    // Idempotency check: If already marked PAID, return success immediately
    if (payment.status === 'PAID') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified and active',
        payment: {
          orderRef: payment.orderRef,
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
          amount: payment.amount,
          status: payment.status,
          purpose: payment.purpose,
          paidAt: payment.paidAt
        }
      });
    }

    // Mark payment as PAID
    payment.status = 'PAID';
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature || '';
    payment.paymentMethod = paymentMethod;
    payment.paidAt = new Date();
    await payment.save();

    let activationResult = {};

    // =========================================================================
    // 1. Activate Document Unlock
    // =========================================================================
    if (payment.purpose === 'document_fee' && payment.documentId) {
      const doc = await Document.findById(payment.documentId);
      if (doc) {
        doc.paymentStatus = 'COMPLETED';
        doc.paidAt = new Date();
        doc.paymentId = razorpay_payment_id;
        doc.paymentMethod = paymentMethod;
        doc.paymentAmount = payment.amount;
        doc.updatedAt = new Date();
        await doc.save();

        // Direct atomic update for failover persistence
        await Document.collection.updateOne(
          { _id: doc._id },
          {
            $set: {
              paymentStatus: 'COMPLETED',
              paidAt: doc.paidAt,
              paymentId: razorpay_payment_id,
              paymentMethod: paymentMethod,
              paymentAmount: payment.amount,
              updatedAt: new Date()
            }
          }
        );

        activationResult = {
          documentId: doc._id.toString(),
          documentName: doc.documentName,
          paymentStatus: 'COMPLETED',
          downloadUrl: `/api/documents/download?id=${doc._id}`
        };
      }
    }

    // =========================================================================
    // 2. Activate / Upgrade CA Firm Subscription Plan
    // =========================================================================
    if (payment.purpose === 'subscription_plan') {
      const caUser = await User.findById(payment.userId);
      if (caUser) {
        const planKey = payment.planId || 'Professional';
        const planConfig = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.Professional;
        const cycle = payment.billingCycle || 'monthly';
        const durationDays = planConfig.durationDays[cycle] || 30;

        // Calculate expiration date (extend if currently active)
        const now = new Date();
        const currentExpires = caUser.subscription?.expiresAt ? new Date(caUser.subscription.expiresAt) : null;
        const baseDate = (currentExpires && currentExpires > now) ? currentExpires : now;
        const newExpiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

        caUser.subscription = {
          plan: planConfig.id,
          status: 'active',
          startDate: now,
          expiresAt: newExpiresAt,
          pricePerMonth: planConfig.prices.monthly,
          billingCycle: cycle,
          maxSubCas: planConfig.maxSubCas,
          maxClients: planConfig.maxClients,
          notes: `Purchased via Razorpay (${payment.orderRef})`
        };

        // Unpause account if it was paused
        caUser.status = 'active';
        caUser.pauseReason = '';
        caUser.updatedAt = new Date();
        await caUser.save();

        activationResult = {
          plan: planConfig.name,
          status: 'active',
          expiresAt: newExpiresAt,
          maxSubCas: planConfig.maxSubCas,
          maxClients: planConfig.maxClients
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and service activated successfully!',
      payment: {
        orderRef: payment.orderRef,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        purpose: payment.purpose,
        paidAt: payment.paidAt
      },
      activation: activationResult
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { message: error.message || 'Server error during payment verification' },
      { status: 500 }
    );
  }
}
