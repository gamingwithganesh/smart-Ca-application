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
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const statusFilter = searchParams.get('status');
    const planFilter = searchParams.get('plan');

    const superAdminEmails = [
      'admin@zintech.in',
      'admin.zintech.in',
      'superadmin@zintech.in',
      'superadmin@smartca.com'
    ];

    let query = {
      email: { $nin: superAdminEmails },
      role: { $ne: 'superadmin', $ne: 'sub_ca' }
    };

    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { firmName: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { firmCity: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter;
    }

    if (planFilter && planFilter !== 'all') {
      query['subscription.plan'] = planFilter;
    }

    const cas = await User.find(query).select('-password').sort({ createdAt: -1 });

    // Aggregate sub_cas, clients, and documents counts for each CA
    const caIds = cas.map(ca => ca._id);

    const [subCaCounts, clientCounts, documentCounts] = await Promise.all([
      User.aggregate([
        { $match: { role: 'sub_ca', parentCa: { $in: caIds } } },
        { $group: { _id: '$parentCa', count: { $sum: 1 } } }
      ]),
      Client.aggregate([
        { $match: { createdBy: { $in: caIds } } },
        { $group: { _id: '$createdBy', count: { $sum: 1 } } }
      ]),
      Document.aggregate([
        { $match: { uploadedBy: { $in: caIds } } },
        { $group: { _id: '$uploadedBy', count: { $sum: 1 } } }
      ])
    ]);

    const subCaMap = Object.fromEntries(subCaCounts.map(i => [i._id.toString(), i.count]));
    const clientMap = Object.fromEntries(clientCounts.map(i => [i._id.toString(), i.count]));
    const docMap = Object.fromEntries(documentCounts.map(i => [i._id.toString(), i.count]));

    const enrichedCas = cas.map(ca => {
      const idStr = ca._id.toString();
      return {
        ...ca.toObject(),
        role: ca.role || 'admin',
        status: ca.status || 'active',
        subscription: ca.subscription || {
          plan: 'Professional',
          status: 'active',
          pricePerMonth: 2499,
          billingCycle: 'monthly',
          maxSubCas: 5,
          maxClients: 200,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        subCaCount: subCaMap[idStr] || 0,
        clientCount: clientMap[idStr] || 0,
        documentCount: docMap[idStr] || 0
      };
    });

    return NextResponse.json(enrichedCas);
  } catch (error) {
    console.error('Super Admin get CAs error:', error);
    return NextResponse.json({ message: 'Error fetching CA accounts' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requireSuperAdmin(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const body = await req.json();
    const {
      name,
      email,
      password,
      firmName,
      firmCity,
      phone,
      plan = 'Professional',
      pricePerMonth = 2499,
      billingCycle = 'monthly',
      durationMonths = 1,
      maxSubCas = 5,
      maxClients = 200,
      notes = ''
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Name, email, and initial password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json({ message: 'An account with this email already exists' }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + Number(durationMonths || 1));

    const newCa = new User({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'admin',
      status: 'active',
      firmName: (firmName || `${name.trim()}'s CA Firm`).trim(),
      firmCity: (firmCity || '').trim(),
      phone: (phone || '').trim(),
      subscription: {
        plan,
        status: 'active',
        startDate: new Date(),
        expiresAt,
        pricePerMonth: Number(pricePerMonth),
        billingCycle,
        maxSubCas: Number(maxSubCas),
        maxClients: Number(maxClients),
        notes
      }
    });

    await newCa.save();

    return NextResponse.json({
      message: 'CA Firm account created successfully',
      ca: {
        id: newCa._id,
        name: newCa.name,
        email: newCa.email,
        firmName: newCa.firmName,
        subscription: newCa.subscription,
        status: newCa.status
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Super Admin create CA error:', error);
    return NextResponse.json({ message: error.message || 'Error creating CA account' }, { status: 500 });
  }
}
