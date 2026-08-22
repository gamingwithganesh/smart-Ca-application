import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Client from '@/lib/models/Client';
import Document from '@/lib/models/Document';
import { verifyToken } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    const client = await Client.findOne({ _id: clientId, createdBy: payload.userId }).populate('createdBy', 'name');
    if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const clientId = resolvedParams.id;
    const body = await req.json();

    const client = await Client.findOneAndUpdate(
      { _id: clientId, createdBy: payload.userId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!client) return NextResponse.json({ message: 'Client not found or unauthorized' }, { status: 404 });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Error updating client' }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    const client = await Client.findOneAndDelete({ _id: clientId, createdBy: payload.userId });
    if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 });

    await Document.deleteMany({ clientId: clientId, uploadedBy: payload.userId });
    return NextResponse.json({ message: 'Client and associated documents deleted successfully' });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

