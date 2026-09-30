import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';

export async function POST(req) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email/ID and password are required' }, { status: 400 });
    }

    const cleanInput = (email || '').toLowerCase().trim();
    const digits = cleanInput.replace(/\D/g, '');

    // Support email, phone numbers, and special admin aliases
    let user = await User.findOne({
      $or: [
        { email: cleanInput },
        { phone: cleanInput },
        ...(digits.length >= 10 ? [
          { phone: digits },
          { phone: `+91${digits.slice(-10)}` },
          { phone: digits.slice(-10) },
          { email: digits },
          { email: `+91${digits.slice(-10)}` },
          { email: digits.slice(-10) }
        ] : []),
        { email: cleanInput.replace('admin.zintech.in', 'admin@zintech.in') },
        { email: cleanInput.replace('admin@zintech.in', 'admin.zintech.in') },
        ...(cleanInput === 'admin.zintech.in' ? [{ email: 'admin@zintech.in' }, { email: 'superadmin@zintech.in' }] : [])
      ]
    });

    // If user not found directly, check if a Client record has this phone/email and has an associated User
    if (!user && digits.length >= 10) {
      const Client = (await import('@/lib/models/Client')).default;
      const matchClient = await Client.findOne({
        $or: [
          { whatsappNumber: cleanInput },
          { whatsappNumber: digits },
          { whatsappNumber: digits.slice(-10) },
          { whatsappNumber: `+91${digits.slice(-10)}` },
          { whatsappNumber: { $regex: `${digits.slice(-10)}$`, $options: 'i' } }
        ]
      });
      if (matchClient) {
        if (matchClient.userId) {
          user = await User.findById(matchClient.userId);
        }
        if (!user && matchClient.email) {
          user = await User.findOne({ email: matchClient.email });
        }
      }
    }

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials. Account not found with this Mobile / Email.' }, { status: 400 });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials. Incorrect password.' }, { status: 400 });
    }

    // Determine role (superadmin override if platform or zintech admin email)
    const isSuperAdminEmail = 
      user.email === 'admin@zintech.in' ||
      user.email === 'admin.zintech.in' ||
      user.email === 'superadmin@zintech.in' ||
      user.email === 'superadmin@smartca.com' ||
      user.email.startsWith('superadmin@');

    const effectiveRole = isSuperAdminEmail ? 'superadmin' : (user.role || 'admin');

    if (user.role !== effectiveRole) {
      user.role = effectiveRole;
      await user.save();
    }

    // If client, ensure clientId is linked to their client record and sync latest client name
    let clientId = user.clientId;
    if (effectiveRole === 'client') {
      const Client = (await import('@/lib/models/Client')).default;
      const userPhone = user.phone || '';
      const phoneDigits = userPhone.replace(/\D/g, '');
      const matchClient = await Client.findOne({
        $or: [
          ...(clientId ? [{ _id: clientId }] : []),
          { userId: user._id },
          { email: user.email },
          ...(phoneDigits ? [
            { whatsappNumber: userPhone },
            { whatsappNumber: phoneDigits },
            { whatsappNumber: `+${phoneDigits}` },
            { whatsappNumber: { $regex: `${phoneDigits.slice(-10)}$`, $options: 'i' } }
          ] : [])
        ]
      });
      if (matchClient) {
        clientId = matchClient._id;
        user.clientId = matchClient._id;
        matchClient.userId = user._id;
        if (matchClient.name && matchClient.name.trim()) {
          user.name = matchClient.name.trim();
        }
        await Promise.all([user.save(), matchClient.save()]);
      }
    }

    // Check if parent CA is paused for sub_ca
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
