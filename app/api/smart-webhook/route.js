import { NextResponse } from 'next/server';
import { processWhatsAppMessage } from '@/lib/bedrock';
import { verifyToken, getAuthenticatedUser } from '@/lib/auth';

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body = {};

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
    } else {
      try {
        body = await req.json();
      } catch (e) {
        body = {};
      }
    }

    const incomingMessage = (body.message || body.Body || body.text || '')?.trim();
    const rawPhone = (body.fromNumber || body.phoneNumber || body.From || body.from || '')?.replace('whatsapp:', '').trim();

    if (!incomingMessage || !rawPhone) {
      return NextResponse.json({
        success: false,
        reply: 'Message and phone number are required',
        responseText: 'Message and phone number are required'
      }, { status: 400 });
    }

    // Attempt to extract CA context if token header exists
    let caId = null;
    const auth = await getAuthenticatedUser(req);
    if (auth && !auth.error && auth.effectiveCaId) {
      caId = auth.effectiveCaId;
    }

    const result = await processWhatsAppMessage(incomingMessage, rawPhone, caId);

    return NextResponse.json({
      success: result.success !== false,
      reply: result.responseText || result.reply || 'Message processed',
      responseText: result.responseText || result.reply || 'Message processed',
      mediaUrl: result.mediaUrl || null,
      client: result.client || null
    });
  } catch (error) {
    console.error('Smart Webhook route error:', error);
    return NextResponse.json({
      success: false,
      reply: `Server error processing message: ${error.message || 'Unknown error'}`,
      responseText: `Server error processing message: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'active', message: 'Smart CA WhatsApp Webhook Engine is online' });
}
