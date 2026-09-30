import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Payment from '@/lib/models/Payment';
import Client from '@/lib/models/Client';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error || !auth.user) {
      return NextResponse.json({ message: auth.error || 'Authentication required' }, { status: auth.status || 401 });
    }

    await dbConnect();
    const user = auth.user;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const purpose = searchParams.get('purpose');

    let query = {};

    if (purpose) {
      query.purpose = purpose;
    }

    // Role-based visibility
    if (user.role === 'client') {
      const clientConditions = [{ userId: user._id }];
      if (user.clientId) clientConditions.push({ clientId: user.clientId });
      query.$or = clientConditions;
    } else if (user.role === 'admin' || user.role === 'sub_ca') {
      const effectiveCaId = auth.effectiveCaId || user._id;
      // Get all clients managed by this CA
      const caClients = await Client.find({ caId: effectiveCaId }).select('_id');
      const clientIds = caClients.map((c) => c._id);

      query.$or = [
        { userId: effectiveCaId },
        { userId: user._id },
        { clientId: { $in: clientIds } }
      ];
    } else if (user.role === 'superadmin') {
      // Super admin can see all payments without filter
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('documentId', 'documentName fileName year documentType')
      .populate('userId', 'name email firmName phone')
      .populate('clientId', 'name whatsappNumber email')
      .lean();

    return NextResponse.json({
      success: true,
      count: payments.length,
      payments: payments.map((p) => ({
        id: p._id.toString(),
        orderRef: p.orderRef,
        razorpayOrderId: p.razorpayOrderId,
        razorpayPaymentId: p.razorpayPaymentId,
        purpose: p.purpose,
        planId: p.planId,
        billingCycle: p.billingCycle,
        amount: p.amount,
        currency: p.currency || 'INR',
        status: p.status,
        paymentMethod: p.paymentMethod || 'Razorpay',
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        customerName: p.customerDetails?.name || p.userId?.name || p.clientId?.name || 'Customer',
        customerEmail: p.customerDetails?.email || p.userId?.email || p.clientId?.email || '',
        customerPhone: p.customerDetails?.phone || p.userId?.phone || p.clientId?.whatsappNumber || '',
        document: p.documentId
          ? {
              id: p.documentId._id,
              name: p.documentId.documentName || p.documentId.fileName,
              year: p.documentId.year,
              type: p.documentId.documentType
            }
          : null
      }))
    });
  } catch (error) {
    console.error('Payment history fetch error:', error);
    return NextResponse.json({ message: 'Failed to fetch payment history' }, { status: 500 });
  }
}
