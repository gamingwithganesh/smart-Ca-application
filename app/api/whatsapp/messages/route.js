import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Client from '@/lib/models/Client';
import Message from '@/lib/models/Message';
import { verifyToken } from '@/lib/auth';

export async function GET(req) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ message: 'Client ID is required' }, { status: 400 });
    }

    // Verify client belongs to logged in CA
    const client = await Client.findOne({ _id: clientId, createdBy: payload.userId });
    if (!client) {
      return NextResponse.json({ message: 'Client not found or unauthorized' }, { status: 404 });
    }

    const messages = await Message.find({ clientId })
      .sort({ createdAt: 1 })
      .populate('documentId', 'documentName fileName mimeType fileSize category')
      .lean();

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching WhatsApp message history:', error);
    return NextResponse.json({ message: 'Failed to fetch WhatsApp history' }, { status: 500 });
  }
}
