import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Document from '@/lib/models/Document';
import Client from '@/lib/models/Client';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const user = auth.user;
    const body = await req.json();
    const { documentId, amount, paymentMethod = 'UPI', upiId, transactionRef } = body;

    if (!documentId) {
      return NextResponse.json({ message: 'Document ID is required' }, { status: 400 });
    }

    const doc = await Document.findById(documentId);
    if (!doc) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Verify user owns or is associated with the document's client
    const cleanEmail = user.email ? user.email.toLowerCase().trim() : '';
    const cleanPhone = user.phone ? user.phone.trim() : '';
    const last10 = cleanPhone.replace(/\D/g, '').slice(-10);

    const client = await Client.findById(doc.clientId);
    const isOwner =
      (user.clientId && user.clientId.toString() === doc.clientId.toString()) ||
      (client && client.userId && client.userId.toString() === user._id.toString()) ||
      (client && cleanEmail && client.email && client.email.toLowerCase() === cleanEmail) ||
      (client && last10 && client.whatsappNumber && client.whatsappNumber.includes(last10));

    if (!isOwner && user.role === 'client') {
      return NextResponse.json({ message: 'Unauthorized access to document' }, { status: 403 });
    }

    // Generate Razorpay-ready mock payment ID
    const paymentId = transactionRef || `pay_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const finalAmount = amount !== undefined ? Number(amount) : (doc.paymentAmount || 500);

    doc.paymentStatus = 'COMPLETED';
    doc.paidAt = new Date();
    doc.paymentId = paymentId;
    doc.paymentMethod = paymentMethod || 'UPI';
    doc.paymentAmount = finalAmount;
    doc.updatedAt = new Date();

    await doc.save();

    // Also perform atomic direct update to guarantee persistence across all connections & failovers
    await Document.collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          paymentStatus: 'COMPLETED',
          paidAt: doc.paidAt,
          paymentId: paymentId,
          paymentMethod: paymentMethod || 'UPI',
          paymentAmount: finalAmount,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully! Document is permanently unlocked and watermark removed.',
      document: {
        _id: doc._id.toString(),
        id: doc._id.toString(),
        documentName: doc.documentName,
        paymentStatus: 'COMPLETED',
        paymentAmount: finalAmount,
        paymentId: paymentId,
        paymentMethod: paymentMethod || 'UPI',
        paidAt: doc.paidAt,
        fileUrl: `/api/documents/download?id=${doc._id}`
      }
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json({ message: error.message || 'Payment processing failed' }, { status: 500 });
  }
}
