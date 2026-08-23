import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Message from '@/lib/models/Message';

export async function POST(req) {
  try {
    await dbConnect();
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

    const messageSid = params.MessageSid || params.SmsSid || '';
    const messageStatus = (params.MessageStatus || params.SmsStatus || '').toLowerCase();

    if (messageSid && messageStatus) {
      await Message.findOneAndUpdate(
        { twilioMessageSid: messageSid },
        { status: messageStatus, updatedAt: new Date() }
      );
      console.log(`📊 Updated Twilio Message SID (${messageSid}) status to: ${messageStatus}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling Twilio status callback:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
