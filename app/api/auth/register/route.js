import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Client from '@/lib/models/Client';
import { signToken } from '@/lib/auth';

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password, firmName, firmCity, phone, accountType } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Name, email, and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = (phone || '').trim();
    const digits = cleanPhone.replace(/\D/g, '');
    const last10 = digits.slice(-10);

    let existingUser = await User.findOne({
      $or: [
        { email: cleanEmail },
        ...(digits ? [
          { phone: cleanPhone },
          { phone: digits },
          { phone: `+${digits}` },
          ...(last10 ? [{ phone: { $regex: `${last10}$`, $options: 'i' } }] : [])
        ] : [])
      ]
    });

    // If client self-registers and an auto-created client record or user already exists, update and take ownership
    if (existingUser) {
      if (existingUser.role === 'client' || accountType === 'client') {
        existingUser.name = name.trim();
        existingUser.password = password;
        if (cleanEmail) existingUser.email = cleanEmail;
        if (cleanPhone) existingUser.phone = cleanPhone;
        existingUser.role = 'client';
        existingUser.status = 'active';

        // Find all matching Client profiles added by CA
        const clientConditions = [
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ...(last10 ? [
            { whatsappNumber: cleanPhone },
            { whatsappNumber: digits },
            { whatsappNumber: `+${digits}` },
            { whatsappNumber: { $regex: `${last10}$`, $options: 'i' } }
          ] : [])
        ];

        if (clientConditions.length > 0) {
          const matchingClients = await Client.find({ $or: clientConditions });
          if (matchingClients.length > 0) {
            existingUser.clientId = matchingClients[0]._id;
            await Client.updateMany(
              { _id: { $in: matchingClients.map(c => c._id) } },
              { $set: { userId: existingUser._id, ...(cleanEmail ? { email: cleanEmail } : {}) } }
            );
          }
        }

        await existingUser.save();
        const token = signToken(existingUser);

        return NextResponse.json({
          token,
          user: {
            id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            phone: existingUser.phone,
            role: existingUser.role,
            clientId: existingUser.clientId,
            status: existingUser.status
          }
        }, { status: 200 });
      }

      return NextResponse.json({ message: 'An account with this email or mobile number already exists. Please sign in.' }, { status: 400 });
    }

    // Determine initial role: 'client' or 'admin' or 'superadmin'
    let role = accountType === 'client' ? 'client' : 'admin';
    if (cleanEmail === 'superadmin@smartca.com' || cleanEmail.startsWith('superadmin@') || cleanEmail === 'admin@zintech.in') {
      role = 'superadmin';
    }

    // If client, look up existing Client record added by their CA
    let matchedClientId = null;
    let matchingClients = [];
    if (role === 'client') {
      const clientConditions = [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(last10 ? [
          { whatsappNumber: cleanPhone },
          { whatsappNumber: digits },
          { whatsappNumber: `+${digits}` },
          { whatsappNumber: { $regex: `${last10}$`, $options: 'i' } }
        ] : [])
      ];

      if (clientConditions.length > 0) {
        matchingClients = await Client.find({ $or: clientConditions });
        if (matchingClients.length > 0) {
          matchedClientId = matchingClients[0]._id;
        }
      }
    }

    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      password,
      role,
      status: 'active',
      phone: cleanPhone,
      clientId: matchedClientId,
      firmName: role === 'client' ? '' : (firmName || `${name.trim()}'s CA Firm`).trim(),
      firmCity: (firmCity || '').trim(),
      subscription: role === 'client' ? null : {
        plan: 'Professional',
        status: 'active',
        startDate: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        pricePerMonth: 2499,
        billingCycle: 'monthly',
        maxSubCas: 5,
        maxClients: 200
      }
    });

    await user.save();

    // Link all matching client records with this newly created user ID
    if (matchingClients.length > 0) {
      await Client.updateMany(
        { _id: { $in: matchingClients.map(c => c._id) } },
        { $set: { userId: user._id, ...(cleanEmail ? { email: cleanEmail } : {}) } }
      );
    }

    const token = signToken(user);

    return NextResponse.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        clientId: user.clientId,
        status: user.status,
        firmName: user.firmName,
        subscription: user.subscription
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: error.message || 'Server error during registration' }, { status: 500 });
  }
}
