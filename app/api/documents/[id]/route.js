import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Document from '@/lib/models/Document';
import { verifyToken } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    const document = await Document.findOne({ _id: docId, uploadedBy: payload.userId }).populate('clientId', 'name whatsappNumber');
    if (!document) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    const document = await Document.findOneAndDelete({ _id: docId, uploadedBy: payload.userId });
    if (!document) return NextResponse.json({ message: 'Document not found or unauthorized' }, { status: 404 });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
