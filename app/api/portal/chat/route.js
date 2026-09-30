import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Client from '@/lib/models/Client';
import Document from '@/lib/models/Document';
import { getAuthenticatedUser } from '@/lib/auth';
import { processWhatsAppMessage } from '@/lib/bedrock';

export async function POST(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const user = auth.user;
    const body = await req.json();
    const messageText = (body.message || body.text || '').trim();

    if (!messageText) {
      return NextResponse.json({ message: 'Message cannot be empty' }, { status: 400 });
    }

    const cleanEmail = user.email ? user.email.toLowerCase().trim() : '';
    const cleanPhone = user.phone ? user.phone.trim() : '';
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    const last10 = phoneDigits.slice(-10);

    const clientConditions = [
      { userId: user._id },
      ...(user.clientId ? [{ _id: user.clientId }] : []),
      ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ...(last10 ? [
        { whatsappNumber: cleanPhone },
        { whatsappNumber: phoneDigits },
        { whatsappNumber: `+${phoneDigits}` },
        { whatsappNumber: { $regex: `${last10}$`, $options: 'i' } }
      ] : [])
    ];

    const matchingClients = await Client.find({ $or: clientConditions }).populate('createdBy', 'name firmName email phone');
    const client = matchingClients[0] || null;

    if (!client) {
      return NextResponse.json({
        success: true,
        reply: `Hello ${user.name}! Your account is not yet linked to a CA Firm vault. Please share your mobile number (${user.phone || user.email}) with your Chartered Accountant so they can issue your documents.`,
        responseText: `Hello ${user.name}! Your account is not yet linked to a CA Firm vault. Please share your mobile number (${user.phone || user.email}) with your Chartered Accountant so they can issue your documents.`,
        documents: []
      });
    }

    const effectiveCaId = client.createdBy?._id || client.createdBy;
    const result = await processWhatsAppMessage(messageText, client.whatsappNumber, effectiveCaId);

    // Extract any document download links mentioned in the response
    const docMatches = [];
    const linkRegex = /\/api\/documents\/download\?id=([a-f0-9]{24})/g;
    let match;
    const foundDocIds = [];

    while ((match = linkRegex.exec(result.responseText || '')) !== null) {
      foundDocIds.push(match[1]);
    }

    if (foundDocIds.length > 0) {
      const matchedDocsFromDb = await Document.find({ _id: { $in: foundDocIds } }).lean();
      for (const d of matchedDocsFromDb) {
        docMatches.push({
          id: d._id,
          name: d.documentName || d.fileName,
          type: d.documentType,
          year: d.year || d.financialYear,
          size: d.fileSize,
          fileUrl: `/api/documents/download?id=${d._id}`
        });
      }
    }

    return NextResponse.json({
      success: true,
      reply: result.responseText || 'How can I assist you with your tax documents today?',
      responseText: result.responseText || 'How can I assist you with your tax documents today?',
      documents: docMatches,
      client: {
        name: client.name,
        whatsappNumber: client.whatsappNumber
      }
    });
  } catch (error) {
    console.error('Portal chat error:', error);
    return NextResponse.json({
      success: false,
      reply: 'An error occurred while communicating with the AI Assistant.',
      responseText: 'An error occurred while communicating with the AI Assistant.'
    }, { status: 500 });
  }
}
