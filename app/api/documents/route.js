import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Document from '@/lib/models/Document';
import Client from '@/lib/models/Client';
import { verifyToken } from '@/lib/auth';

export async function GET(req) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const documents = await Document.find({ uploadedBy: payload.userId })
      .populate('clientId', 'name whatsappNumber')
      .sort({ uploadDate: -1 });

    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching documents' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clientId, year, documentType, fileUrl, fileName } = body;

    if (!clientId || !year || !documentType || !fileUrl) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Verify client belongs to logged in CA
    const client = await Client.findOne({ _id: clientId, createdBy: payload.userId });
    if (!client) {
      return NextResponse.json({ message: 'Invalid client or unauthorized' }, { status: 403 });
    }

    const doc = new Document({
      clientId,
      year,
      documentType,
      fileUrl,
      fileName: fileName || `${documentType}_${year}.pdf`,
      uploadedBy: payload.userId
    });

    await doc.save();
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Error saving document' }, { status: 400 });
  }
}

