import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Client from '@/lib/models/Client';
import Message from '@/lib/models/Message';
import { verifyToken } from '@/lib/auth';
import { sendWhatsAppMessage, formatWhatsAppNumber, getTwilioSenderNumber } from '@/lib/twilio';

export async function POST(req) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clientId, body: textBody } = body;

    if (!clientId || !textBody || !textBody.trim()) {
      return NextResponse.json({ message: 'Client ID and message body are required' }, { status: 400 });
    }

    // Verify client belongs to logged in CA
    const client = await Client.findOne({ _id: clientId, createdBy: payload.userId });
    if (!client) {
      return NextResponse.json({ message: 'Client not found or unauthorized' }, { status: 403 });
    }

    const recipientNumber = client.whatsappNumber;
    if (!recipientNumber) {
      return NextResponse.json({ message: 'Client has no WhatsApp number configured' }, { status: 400 });
    }

    // Send via Twilio SDK
    const twilioRes = await sendWhatsAppMessage({
      to: recipientNumber,
      body: textBody.trim()
    });

    // Save outbound message in MongoDB
    const msgRecord = new Message({
      clientId: client._id,
      direction: 'outbound',
      to: formatWhatsAppNumber(recipientNumber),
      from: getTwilioSenderNumber(),
      body: textBody.trim(),
      twilioMessageSid: twilioRes.sid || '',
      status: twilioRes.status || 'sent',
      messageType: 'text',
      createdBy: payload.userId
    });

    await msgRecord.save();

    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: msgRecord
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json({ message: error.message || 'Failed to send WhatsApp message' }, { status: 500 });
  }
}
