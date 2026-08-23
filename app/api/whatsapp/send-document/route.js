import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Client from '@/lib/models/Client';
import Document from '@/lib/models/Document';
import Message from '@/lib/models/Message';
import { verifyToken } from '@/lib/auth';
import { getS3PresignedUrl } from '@/lib/s3';
import { sendWhatsAppMedia, formatWhatsAppNumber, getTwilioSenderNumber } from '@/lib/twilio';

export async function POST(req) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clientId, documentId, body: customText } = body;

    if (!clientId || !documentId) {
      return NextResponse.json({ message: 'Client ID and Document ID are required' }, { status: 400 });
    }

    // Verify client belongs to logged in CA
    const client = await Client.findOne({ _id: clientId, createdBy: payload.userId });
    if (!client) {
      return NextResponse.json({ message: 'Client not found or unauthorized' }, { status: 403 });
    }

    // Verify document belongs to client & CA
    const doc = await Document.findOne({ _id: documentId, clientId, uploadedBy: payload.userId });
    if (!doc) {
      return NextResponse.json({ message: 'Document not found or unauthorized' }, { status: 404 });
    }

    // Generate S3 pre-signed URL (expires in 3600 seconds) from private bucket caapp123
    let mediaUrl = '';
    if (doc.storageType === 's3' && doc.s3Key) {
      mediaUrl = await getS3PresignedUrl(doc.s3Key, 3600);
    } else if (doc.fileUrl) {
      mediaUrl = doc.fileUrl;
    }

    if (!mediaUrl) {
      return NextResponse.json({ message: 'Failed to generate document media URL for Twilio delivery' }, { status: 500 });
    }

    const ext = (doc.originalFilename || doc.fileName || '').split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || (doc.mimeType && doc.mimeType.includes('image'));
    const messageType = isImage ? 'image' : 'document';

    const messageText = customText ? customText.trim() : `📄 *${doc.documentName || doc.fileName}* (${doc.financialYear || doc.year || '2024-25'})`;

    // Send media via Twilio SDK
    const twilioRes = await sendWhatsAppMedia({
      to: client.whatsappNumber,
      mediaUrl,
      body: messageText
    });

    // Save outbound message record in MongoDB
    const msgRecord = new Message({
      clientId: client._id,
      direction: 'outbound',
      to: formatWhatsAppNumber(client.whatsappNumber),
      from: getTwilioSenderNumber(),
      body: messageText,
      twilioMessageSid: twilioRes.sid || '',
      status: twilioRes.status || 'sent',
      messageType,
      mediaUrl,
      documentId: doc._id,
      createdBy: payload.userId
    });

    await msgRecord.save();

    return NextResponse.json({
      success: true,
      message: 'WhatsApp document sent successfully',
      data: msgRecord
    });
  } catch (error) {
    console.error('Error sending WhatsApp document:', error);
    return NextResponse.json({ message: error.message || 'Failed to send WhatsApp document' }, { status: 500 });
  }
}
