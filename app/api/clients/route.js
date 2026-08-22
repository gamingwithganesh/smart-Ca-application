import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Client from '@/lib/models/Client';
import { verifyToken } from '@/lib/auth';

export async function GET(req) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const clients = await Client.find({ createdBy: payload.userId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching clients' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, whatsappNumber } = body;

    if (!name || !whatsappNumber) {
      return NextResponse.json({ message: 'Client name and WhatsApp number are required' }, { status: 400 });
    }

    // Check duplicate phone number for this CA
    const existingClient = await Client.findOne({ createdBy: payload.userId, whatsappNumber: whatsappNumber.trim() });
    if (existingClient) {
      return NextResponse.json({ message: 'A client with this WhatsApp number already exists in your portal.' }, { status: 400 });
    }

    const client = new Client({
      ...body,
      name: name.trim(),
      whatsappNumber: whatsappNumber.trim(),
      createdBy: payload.userId
    });

    await client.save();
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Error creating client' }, { status: 400 });
  }
}

