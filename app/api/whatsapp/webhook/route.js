import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Client from '@/lib/models/Client';
import Message from '@/lib/models/Message';

export async function POST(req) {
  try {
    await dbConnect();

    // Twilio sends webhooks as application/x-www-form-urlencoded or multipart/form-data
    const contentType = req.headers.get('content-type') || '';
    let params = {};

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        params[key] = value;
      }
    } else {
      try {
        params = await req.json();
      } catch (e) {}
    }

    const fromNumber = params.From || '';
    const toNumber = params.To || '';
    const messageBody = params.Body || '';
    const messageSid = params.MessageSid || '';
    const numMedia = parseInt(params.NumMedia || '0', 10);
    const mediaUrl0 = params.MediaUrl0 || '';

    if (!fromNumber) {
      return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    // Extract digits for robust phone matching
    const digits = fromNumber.replace(/\D/g, '');
    const client = await Client.findOne({
      $or: [
        { whatsappNumber: fromNumber },
        { whatsappNumber: `+${digits}` },
        { whatsappNumber: { $regex: `${digits}$`, $options: 'i' } }
      ]
    });

    let twimlReply = '';

    if (client) {
      // Save inbound message in MongoDB
      const inboundMsg = new Message({
        clientId: client._id,
        direction: 'inbound',
        to: toNumber,
        from: fromNumber,
        body: messageBody.trim(),
        twilioMessageSid: messageSid,
        status: 'received',
        messageType: numMedia > 0 ? (params.MediaContentType0?.includes('image') ? 'image' : 'document') : 'text',
        mediaUrl: mediaUrl0,
        createdBy: client.createdBy
      });

      await inboundMsg.save();
      twimlReply = `Hello ${client.name}. Your message has been received.`;
      console.log(`📩 Inbound WhatsApp message received from ${client.name} (${fromNumber}): "${messageBody}"`);
    } else {
      twimlReply = `Hello. Your phone number (${fromNumber}) is not registered in our CA Document Portal. Please contact your CA.`;
      console.warn(`⚠️ Unregistered inbound WhatsApp message from ${fromNumber}`);
    }

    const twimlXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${twimlReply}</Message>
</Response>`;

    return new NextResponse(twimlXml, {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('Error handling Twilio WhatsApp webhook:', error);
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Server error processing WhatsApp webhook.</Message>
</Response>`;
    return new NextResponse(fallbackXml, { status: 500, headers: { 'Content-Type': 'text/xml' } });
  }
}
