import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email !== undefined ? String(body.email) : '';
    const rawPassword = body.password !== undefined ? String(body.password) : '';

    const cleanInput = rawEmail.trim().toLowerCase();
    const cleanPassword = rawPassword.trim();

    if (!cleanInput || !cleanPassword) {
      return NextResponse.json({ message: 'Email/ID and password are required' }, { status: 400 });
    }

    // Generate phone number variants if input contains digits
    const digits = cleanInput.replace(/\D/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    
    const phoneVariants = [
      cleanInput,
      rawEmail.trim(),
      digits,
      last10,
      `+91${last10}`,
      `91${last10}`,
      `0${last10}`
    ].filter(Boolean);

    // 1. Check for Super Admin master login
    const isSuperAdminIdentifier = 
      cleanInput === 'superadmin@zintech.in' ||
      cleanInput === 'admin@zintech.in' ||
      cleanInput === 'admin.zintech.in' ||
      cleanInput === 'superadmin@smartca.com' ||
      cleanInput.startsWith('superadmin@');

    if (isSuperAdminIdentifier && cleanPassword === 'superadmin@zintech.in') {
      let superAdmin = await User.findOne({
        $or: [
          { email: 'superadmin@zintech.in' },
          { email: 'admin@zintech.in' },
          { role: 'superadmin' }
        ]
      });

      if (!superAdmin) {
        superAdmin = new User({
          name: 'Zintech Super Admin',
          email: 'superadmin@zintech.in',
          password: 'superadmin@zintech.in',
          role: 'superadmin',
          status: 'active',
          firmName: 'Zintech Super Admin HQ'
        });
        await superAdmin.save();
      } else {
        superAdmin.role = 'superadmin';
        superAdmin.status = 'active';
        superAdmin.email = 'superadmin@zintech.in';
        superAdmin.password = 'superadmin@zintech.in';
        await superAdmin.save();
      }

      const token = signToken({
        _id: superAdmin._id,
        id: superAdmin._id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: 'superadmin'
      });

      return NextResponse.json({
        token,
        user: {
          id: superAdmin._id,
          name: superAdmin.name,
          email: superAdmin.email,
          phone: superAdmin.phone || '',
          role: 'superadmin',
          status: 'active',
          firmName: superAdmin.firmName || 'Zintech Super Admin HQ'
        }
      });
    }

    // 2. Lookup existing User by email or phone
    const userQueries = [
      { email: cleanInput },
      { email: rawEmail.trim() },
      { phone: { $in: phoneVariants } }
    ];

    if (last10 && last10.length === 10) {
      userQueries.push({ phone: { $regex: `${last10}$` } });
      userQueries.push({ email: { $regex: `${last10}`, $options: 'i' } });
    }

    let user = await User.findOne({ $or: userQueries });

    // 3. If user not found, or is a client, check Client collection
    const Client = (await import('@/lib/models/Client')).default;
    const clientQueries = [
      { email: cleanInput },
      { email: rawEmail.trim() },
      { whatsappNumber: { $in: phoneVariants } }
    ];
    if (last10 && last10.length === 10) {
      clientQueries.push({ whatsappNumber: { $regex: `${last10}$` } });
    }

    const matchClient = await Client.findOne({ $or: clientQueries });

    if (!user && matchClient) {
      if (matchClient.userId) {
        user = await User.findById(matchClient.userId);
      }
      if (!user && matchClient.email) {
        user = await User.findOne({ email: matchClient.email.toLowerCase() });
      }
    }

    // 4. Handle client without User record yet but with matching portalPassword
    if (!user && matchClient && matchClient.portalPassword && matchClient.portalPassword === cleanPassword) {
      const clientEmail = matchClient.email ? matchClient.email.toLowerCase().trim() : `${last10 || 'client'}@client.smartca.com`;
      user = new User({
        name: matchClient.name,
        email: clientEmail,
        phone: matchClient.whatsappNumber || cleanInput,
        password: cleanPassword,
        role: 'client',
        clientId: matchClient._id,
        status: 'active'
      });
      await user.save();
      matchClient.userId = user._id;
      await matchClient.save();
    }

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials. Account not found with this Mobile / Email.' }, { status: 400 });
    }

    // 5. Compare Password
    let isMatch = false;
    try {
      isMatch = await user.comparePassword(cleanPassword);
    } catch (e) {
      isMatch = false;
    }

    // Fallback: Check if client portal password matches plain text
    if (!isMatch && matchClient?.portalPassword && matchClient.portalPassword === cleanPassword) {
      isMatch = true;
      user.password = cleanPassword;
      await user.save();
    }

    // Fallback: Check superadmin override
    if (!isMatch && (user.role === 'superadmin' || user.email === 'superadmin@zintech.in')) {
      if (cleanPassword === 'superadmin@zintech.in') {
        isMatch = true;
        user.password = cleanPassword;
        await user.save();
      }
    }

    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials. Incorrect password.' }, { status: 400 });
    }

    // 6. Resolve effective role
    const isSuper = 
      user.email === 'superadmin@zintech.in' ||
      user.email === 'admin@zintech.in' ||
      user.email === 'superadmin@smartca.com' ||
      user.role === 'superadmin';

    const effectiveRole = isSuper ? 'superadmin' : (user.role || 'admin');

    if (user.role !== effectiveRole) {
      user.role = effectiveRole;
      await user.save();
    }

    // 7. Sync client record if client
    let clientId = user.clientId;
    if (effectiveRole === 'client' && matchClient) {
      clientId = matchClient._id;
      user.clientId = matchClient._id;
      matchClient.userId = user._id;
      if (matchClient.name && matchClient.name.trim()) {
        user.name = matchClient.name.trim();
      }
      await Promise.all([user.save(), matchClient.save()]);
    }

    // 8. Check parent CA firm status for sub_ca
    let isParentPaused = false;
    let parentReason = '';
    if (effectiveRole === 'sub_ca' && user.parentCa) {
      const parent = await User.findById(user.parentCa);
      if (parent && (parent.status === 'paused' || parent.status === 'suspended')) {
        isParentPaused = true;
        parentReason = parent.pauseReason || 'Subscription expired/paused by Super Admin';
      }
    }

    const token = signToken({
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      role: effectiveRole,
      clientId: clientId || user.clientId
    });

    return NextResponse.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: effectiveRole,
        clientId: clientId || user.clientId || null,
        status: user.status || 'active',
        pauseReason: user.pauseReason || parentReason || '',
        isParentPaused,
        firmName: user.firmName || (effectiveRole === 'client' ? 'Client Portal' : 'CA Firm'),
        firmCity: user.firmCity || '',
        subscription: user.subscription || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Server error during login' }, { status: 500 });
  }
}
