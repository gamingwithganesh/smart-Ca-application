import { NextResponse } from 'next/server';
import { processWhatsAppMessage } from '@/lib/bedrock';
import { verifyToken } from '@/lib/auth';

export async function POST(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please sign in to access simulator.' }, { status: 401 });
    }

    const body = await req.json();
    const incomingMessage = (body.message || body.Body)?.trim();
    const fromNumber = (body.fromNumber || body.phoneNumber || body.From)?.replace('whatsapp:', '');

    if (!incomingMessage || !fromNumber) {
      return NextResponse.json({ success: false, message: 'Message and phone number are required' }, { status: 400 });
    }

    const result = await processWhatsAppMessage(incomingMessage, fromNumber, payload.userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Next.js webhook test-chat error:', error);
    return NextResponse.json({
      success: false,
      responseText: 'An error occurred while processing your message in Next.js backend.'
    }, { status: 500 });
  }
}

