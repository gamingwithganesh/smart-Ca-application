import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Payment from '@/lib/models/Payment';
import { requireSuperAdmin } from '@/lib/auth';

export async function GET(req) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || 'all';
    const purpose = searchParams.get('purpose') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let query = {};

    if (status !== 'all') {
      query.status = status;
    }

    if (purpose !== 'all') {
      query.purpose = purpose;
    }

    if (search) {
      query.$or = [
        { orderRef: { $regex: search, $options: 'i' } },
        { razorpayOrderId: { $regex: search, $options: 'i' } },
        { razorpayPaymentId: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } },
        { 'customerDetails.email': { $regex: search, $options: 'i' } },
        { 'customerDetails.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const [payments, totalRevenueAgg, countsByStatus] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name email firmName phone role')
        .populate('clientId', 'name whatsappNumber email')
        .populate('documentId', 'documentName fileName year')
        .lean(),

      Payment.aggregate([
        { $match: { status: 'PAID' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      Payment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const totalRevenue = totalRevenueAgg[0]?.total || 0;
    const statusMap = countsByStatus.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        paidCount: statusMap.PAID || 0,
        pendingCount: (statusMap.CREATED || 0) + (statusMap.PENDING || 0),
        failedCount: statusMap.FAILED || 0,
        totalTransactions: payments.length
      },
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
        user: p.userId
          ? {
              id: p.userId._id,
              name: p.userId.name,
              email: p.userId.email,
              firmName: p.userId.firmName,
              role: p.userId.role
            }
          : null,
        client: p.clientId
          ? {
              id: p.clientId._id,
              name: p.clientId.name,
              whatsappNumber: p.clientId.whatsappNumber
            }
          : null,
        document: p.documentId
          ? {
              id: p.documentId._id,
              name: p.documentId.documentName || p.documentId.fileName,
              year: p.documentId.year
            }
          : null
      }))
    });
  } catch (error) {
    console.error('Super Admin payments fetch error:', error);
    return NextResponse.json({ message: 'Failed to fetch platform payments' }, { status: 500 });
  }
}
