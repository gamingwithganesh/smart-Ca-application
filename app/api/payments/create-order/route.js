import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Payment from '@/lib/models/Payment';
import Document from '@/lib/models/Document';
import Client from '@/lib/models/Client';
import User from '@/lib/models/User';
import { getAuthenticatedUser } from '@/lib/auth';
import { createRazorpayOrder, getPublicRazorpayKey, SUBSCRIPTION_PLANS } from '@/lib/razorpay';

export async function POST(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error || !auth.user) {
      return NextResponse.json({ message: auth.error || 'Authentication required to initiate payment' }, { status: auth.status || 401 });
    }

    await dbConnect();
    const user = auth.user;
    const body = await req.json().catch(() => ({}));
    const { purpose = 'document_fee', documentId, planId, billingCycle = 'monthly' } = body;

    let payableAmount = 0;
    let targetDoc = null;
    let targetClient = null;
    let planData = null;
    let orderNotes = {
      userId: user._id.toString(),
      userEmail: user.email,
      userName: user.name,
      purpose
    };

    // =========================================================================
    // 1. Purpose: Document Fee (Client Portal Tax Return / Document Unlock)
    // =========================================================================
    if (purpose === 'document_fee') {
      if (!documentId) {
        return NextResponse.json({ message: 'Document ID is required for document payment' }, { status: 400 });
      }

      targetDoc = await Document.findById(documentId);
      if (!targetDoc) {
        return NextResponse.json({ message: 'Document not found' }, { status: 404 });
      }

      // Check if already paid
      if (targetDoc.paymentStatus === 'COMPLETED' || targetDoc.paymentStatus === 'FREE') {
        return NextResponse.json({ message: 'This document is already unlocked and paid' }, { status: 400 });
      }

      // Access verification: Client or CA Firm
      targetClient = await Client.findById(targetDoc.clientId);
      const cleanEmail = (user.email || '').toLowerCase().trim();
      const cleanPhone = (user.phone || '').replace(/\D/g, '').slice(-10);

      const isClientOwner =
        (user.clientId && user.clientId.toString() === targetDoc.clientId.toString()) ||
        (targetClient && targetClient.userId && targetClient.userId.toString() === user._id.toString()) ||
        (targetClient && cleanEmail && targetClient.email && targetClient.email.toLowerCase() === cleanEmail) ||
        (targetClient && cleanPhone && targetClient.whatsappNumber && targetClient.whatsappNumber.includes(cleanPhone));

      const isCaOwner =
        user.role === 'admin' ||
        user.role === 'sub_ca' ||
        user.role === 'superadmin' ||
        (targetDoc.uploadedBy && targetDoc.uploadedBy.toString() === user._id.toString());

      if (!isClientOwner && !isCaOwner) {
        return NextResponse.json({ message: 'Access denied: You are not authorized to pay for this document' }, { status: 403 });
      }

      // Fetch server-enforced price (NEVER trust frontend amount)
      payableAmount = targetDoc.paymentAmount !== undefined && targetDoc.paymentAmount >= 0 ? targetDoc.paymentAmount : 500;
      
      orderNotes.documentId = targetDoc._id.toString();
      orderNotes.documentName = targetDoc.documentName || targetDoc.fileName || 'Tax Return Document';
      orderNotes.clientId = targetDoc.clientId.toString();
      orderNotes.clientName = targetClient?.name || 'Client';
    } 
    // =========================================================================
    // 2. Purpose: Subscription Plan (CA Firm Plan Upgrade / Renewal)
    // =========================================================================
    else if (purpose === 'subscription_plan') {
      if (user.role === 'client') {
        return NextResponse.json({ message: 'Clients cannot purchase CA Firm subscriptions' }, { status: 403 });
      }

      const selectedPlanKey = planId || user.subscription?.plan || 'Professional';
      planData = SUBSCRIPTION_PLANS[selectedPlanKey];

      if (!planData) {
        return NextResponse.json({ message: `Invalid subscription plan: ${selectedPlanKey}` }, { status: 400 });
      }

      const validBillingCycles = ['monthly', 'quarterly', 'annual'];
      const cycle = validBillingCycles.includes(billingCycle) ? billingCycle : 'monthly';

      // Fetch official server-side price
      payableAmount = planData.prices[cycle];
      if (!payableAmount || payableAmount <= 0) {
        return NextResponse.json({ message: 'Unable to determine price for selected plan & cycle' }, { status: 400 });
      }

      orderNotes.planId = planData.id;
      orderNotes.planName = planData.name;
      orderNotes.billingCycle = cycle;
      orderNotes.firmName = user.firmName || 'CA Firm';
    } else {
      return NextResponse.json({ message: `Unsupported payment purpose: ${purpose}` }, { status: 400 });
    }

    if (payableAmount < 1) {
      return NextResponse.json({ message: 'Payable amount must be at least ₹1' }, { status: 400 });
    }

    // Convert to smallest currency unit (Paise for INR)
    const amountInPaise = Math.round(payableAmount * 100);
    const orderRef = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create order with Razorpay
    const rzpOrder = await createRazorpayOrder({
      amountInPaise,
      currency: 'INR',
      receipt: orderRef,
      notes: orderNotes
    });

    // Save pending Payment record in Database
    const payment = new Payment({
      orderRef,
      razorpayOrderId: rzpOrder.orderId,
      userId: user._id,
      clientId: targetDoc ? targetDoc.clientId : (user.clientId || null),
      purpose,
      documentId: targetDoc ? targetDoc._id : null,
      planId: planData ? planData.id : '',
      billingCycle: purpose === 'subscription_plan' ? billingCycle : 'monthly',
      amount: payableAmount,
      amountInPaise,
      currency: 'INR',
      status: 'CREATED',
      customerDetails: {
        name: user.name || targetClient?.name || 'Customer',
        email: user.email || targetClient?.email || '',
        phone: user.phone || targetClient?.whatsappNumber || ''
      },
      notes: orderNotes
    });

    await payment.save();

    return NextResponse.json({
      success: true,
      orderId: rzpOrder.orderId,
      orderRef: payment.orderRef,
      amount: payableAmount,
      amountInPaise,
      currency: 'INR',
      keyId: getPublicRazorpayKey(),
      isMockOrder: rzpOrder.isMock,
      purpose,
      description:
        purpose === 'document_fee'
          ? `Document Unlock: ${orderNotes.documentName}`
          : `Smart CA ${planData?.name} (${billingCycle})`,
      customer: {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      }
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    return NextResponse.json(
      { message: error.message || 'Server error while generating payment order' },
      { status: 500 }
    );
  }
}
