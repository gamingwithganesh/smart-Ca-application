import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Document from '@/lib/models/Document';
import Client from '@/lib/models/Client';
import { verifyToken } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    // Verify client belongs to logged in CA
    const client = await Client.findOne({ _id: clientId, createdBy: payload.userId });
    if (!client) {
      return NextResponse.json({ message: 'Client not found or unauthorized' }, { status: 404 });
    }

    const documents = await Document.find({ clientId, uploadedBy: payload.userId })
      .sort({ uploadDate: -1 });

    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching client documents' }, { status: 500 });
  }
}

