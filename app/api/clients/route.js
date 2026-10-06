import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Client from '@/lib/models/Client';
import User from '@/lib/models/User';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const filterCaId = searchParams.get('caId');

    // If superadmin, can see all clients or filter by CA
    let query = {};
    if (auth.isSuperAdmin) {
      if (filterCaId) query.createdBy = filterCaId;
    } else {
      query.createdBy = auth.effectiveCaId;
    }

    const clients = await Client.find(query)
      .populate('createdBy', 'name firmName')
      .sort({ createdAt: -1 });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Fetch clients error:', error);
    return NextResponse.json({ message: 'Error fetching clients' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    await dbConnect();
    const body = await req.json();
    const { name, whatsappNumber } = body;

    if (!name || !whatsappNumber) {
      return NextResponse.json({ message: 'Client name and WhatsApp number are required' }, { status: 400 });
    }

    const caId = auth.effectiveCaId;
    if (!caId) {
      return NextResponse.json({ message: 'Invalid CA firm context' }, { status: 400 });
    }

    // Check CA Firm client subscription limits
    const caFirm = await User.findById(caId);
    if (caFirm) {
      const maxClients = caFirm.subscription?.maxClients || 200;
      const currentClientCount = await Client.countDocuments({ createdBy: caId });
      if (currentClientCount >= maxClients) {
        return NextResponse.json({
          message: `Your CA Firm has reached its maximum client limit (${maxClients} clients). Please ask Super Admin to upgrade your subscription plan.`
        }, { status: 400 });
      }
    }

    const cleanEmail = (body.email || '').toLowerCase().trim();
    const cleanPhone = whatsappNumber.trim();
    const portalPassword = (body.portalPassword || '').trim();

    // Check duplicate phone number for this CA firm
    const existingClient = await Client.findOne({ createdBy: caId, whatsappNumber: cleanPhone });
    if (existingClient) {
      return NextResponse.json({ message: 'A client with this WhatsApp number already exists in your CA portal.' }, { status: 400 });
    }

    // Check if there is an existing user with matching email or phone
    let matchingUser = await User.findOne({
      $or: [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        { phone: cleanPhone },
        { phone: cleanPhone.replace(/^\+91/, '') },
        { phone: `+91${cleanPhone.replace(/^\+91/, '')}` }
      ]
    });

    // If portalPassword provided, create or update User account
    if (portalPassword) {
      if (matchingUser) {
        matchingUser.password = portalPassword;
        matchingUser.role = matchingUser.role || 'client';
        if (!matchingUser.phone) matchingUser.phone = cleanPhone;
        await matchingUser.save();
      } else {
        const userEmail = cleanEmail || `${cleanPhone.replace(/\D/g, '')}@client.smartca.com`;
        matchingUser = new User({
          name: name.trim(),
          email: userEmail,
          phone: cleanPhone,
          password: portalPassword,
          role: 'client',
          status: 'active'
        });
        await matchingUser.save();
      }
    }

    const client = new Client({
      ...body,
      name: name.trim(),
      email: cleanEmail,
      whatsappNumber: cleanPhone,
      userId: matchingUser ? matchingUser._id : null,
      createdBy: caId
    });

    await client.save();

    if (matchingUser) {
      matchingUser.clientId = client._id;
      await matchingUser.save();
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Error creating client' }, { status: 400 });
  }
}
