import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    if (auth.user.role !== 'admin') {
      return NextResponse.json({ message: 'Only CA Firm Admins can manage Sub-CAs' }, { status: 403 });
    }

    await dbConnect();
    const subCas = await User.find({ parentCa: auth.user._id, role: 'sub_ca' })
      .select('-password')
      .sort({ createdAt: -1 });

    const maxAllowed = auth.user.subscription?.maxSubCas || 5;

    return NextResponse.json({
      subCas,
      totalCount: subCas.length,
      maxAllowed,
      seatsRemaining: Math.max(0, maxAllowed - subCas.length)
    });
  } catch (error) {
    console.error('Get sub-cas error:', error);
    return NextResponse.json({ message: 'Error fetching Sub-CAs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    if (auth.user.role !== 'admin') {
      return NextResponse.json({ message: 'Only CA Firm Admins can add Sub-CAs' }, { status: 403 });
    }

    await dbConnect();

    // Check Sub-CA limit based on CA's subscription plan
    const currentCount = await User.countDocuments({ parentCa: auth.user._id, role: 'sub_ca' });
    const maxAllowed = auth.user.subscription?.maxSubCas || 5;

    if (currentCount >= maxAllowed) {
      return NextResponse.json({
        message: `Your current subscription limit allows a maximum of ${maxAllowed} Sub-CAs. Please contact Super Admin to upgrade.`
      }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, password, phone, designation = 'Associate CA' } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Name, email, and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json({ message: 'An account with this email already exists' }, { status: 400 });
    }

    const subCa = new User({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'sub_ca',
      status: 'active',
      parentCa: auth.user._id,
      phone: (phone || '').trim(),
      firmName: auth.user.firmName,
      firmCity: auth.user.firmCity,
      subscription: {
        plan: auth.user.subscription?.plan || 'Professional',
        status: 'active',
        notes: `Sub-CA / Staff of ${auth.user.name} (${designation})`
      }
    });

    await subCa.save();

    return NextResponse.json({
      message: 'Sub-CA team member created successfully',
      subCa: {
        id: subCa._id,
        name: subCa.name,
        email: subCa.email,
        phone: subCa.phone,
        status: subCa.status,
        role: subCa.role
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create sub-ca error:', error);
    return NextResponse.json({ message: error.message || 'Error creating Sub-CA' }, { status: 500 });
  }
}
