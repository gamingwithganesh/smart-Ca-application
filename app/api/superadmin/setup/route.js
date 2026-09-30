import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

export async function POST(req) {
  try {
    await dbConnect();
    
    const body = await req.json().catch(() => ({}));
    const email = (body.email || 'admin@zintech.in').toLowerCase().trim();
    const name = body.name || 'Zintech Super Admin';
    const password = body.password || 'admin.zintech.in';

    let user = await User.findOne({
      $or: [
        { email },
        { email: 'admin@zintech.in' },
        { email: 'admin.zintech.in' }
      ]
    });

    if (!user) {
      user = new User({
        name,
        email,
        password,
        role: 'superadmin',
        status: 'active',
        firmName: 'Zintech Super Admin HQ',
        firmCity: 'System Core',
        phone: '+91 9999999999',
        subscription: {
          plan: 'Enterprise',
          status: 'active',
          startDate: new Date(),
          expiresAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000),
          pricePerMonth: 0,
          billingCycle: 'lifetime',
          maxSubCas: 999,
          maxClients: 99999,
          notes: 'Master Super Admin'
        }
      });
    } else {
      user.name = name;
      user.email = email;
      user.password = password; // pre-save will bcrypt hash it once
      user.role = 'superadmin';
      user.status = 'active';
      user.firmName = 'Zintech Super Admin HQ';
    }

    await user.save();

    return NextResponse.json({
      message: 'Super Admin credentials provisioned successfully.',
      superadminEmail: user.email,
      role: user.role,
      status: user.status
    });
  } catch (error) {
    console.error('Super Admin setup error:', error);
    return NextResponse.json({ message: error.message || 'Setup error' }, { status: 500 });
  }
}
