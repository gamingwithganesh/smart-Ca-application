import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Client from '@/lib/models/Client';
import Document from '@/lib/models/Document';
import { requireSuperAdmin } from '@/lib/auth';

export async function GET(req) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    await dbConnect();

    const superAdminEmails = [
      'admin@zintech.in',
      'admin.zintech.in',
      'superadmin@zintech.in',
      'superadmin@smartca.com'
    ];

    const caQuery = {
      email: { $nin: superAdminEmails },
      role: { $ne: 'superadmin', $ne: 'sub_ca' }
    };

    // Fetch all CA admins (excluding superadmin and sub_ca)
    const [
      totalCas,
      activeCas,
      pausedCas,
      totalSubCas,
      totalClients,
      totalDocuments,
      allCaUsers
    ] = await Promise.all([
      User.countDocuments(caQuery),
      User.countDocuments({ ...caQuery, status: 'active' }),
      User.countDocuments({ ...caQuery, status: { $in: ['paused', 'suspended', 'expired'] } }),
      User.countDocuments({ role: 'sub_ca' }),
      Client.countDocuments({}),
      Document.countDocuments({}),
      User.find(caQuery).select('subscription status')
    ]);

    // Calculate MRR (Monthly Recurring Revenue)
    let totalMRR = 0;
    const planCounts = {
      Starter: 0,
      Professional: 0,
      Enterprise: 0,
      Trial: 0,
      Custom: 0
    };

    allCaUsers.forEach((ca) => {
      const plan = ca.subscription?.plan || 'Professional';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
      
      if (ca.status !== 'paused' && ca.status !== 'suspended') {
        const price = Number(ca.subscription?.pricePerMonth) || 2499;
        totalMRR += price;
      }
    });

    return NextResponse.json({
      totalCas,
      activeCas,
      pausedCas,
      totalSubCas,
      totalClients,
      totalDocuments,
      totalMRR,
      planCounts
    });
  } catch (error) {
    console.error('Super Admin stats error:', error);
    return NextResponse.json({ message: 'Error fetching platform statistics' }, { status: 500 });
  }
}
