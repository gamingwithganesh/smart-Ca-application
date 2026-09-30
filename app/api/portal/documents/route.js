import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Document from '@/lib/models/Document';
import Client from '@/lib/models/Client';
import User from '@/lib/models/User';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    await dbConnect();
    const user = auth.user;

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

    if (matchingClients.length > 0 && !user.clientId) {
      user.clientId = matchingClients[0]._id;
      await user.save();
    }

    if (!client && matchingClients.length === 0) {
      return NextResponse.json({
        client: {
          name: user.name,
          email: user.email,
          whatsappNumber: user.phone || '',
          isLinked: false
        },
        caFirm: null,
        documents: []
      });
    }

    const allClientIds = matchingClients.map((c) => c._id);
    const documents = await Document.find({ clientId: { $in: allClientIds } })
      .sort({ uploadDate: -1, createdAt: -1 })
      .lean();

    const formattedDocs = documents.map((doc) => {
      const fallbackTitle = `${doc.documentType || doc.category || 'Tax Return'} (FY ${doc.financialYear || doc.year || '2024-25'})`;
      const displayTitle = doc.documentName && !doc.documentName.includes('Static') && !doc.documentName.includes('Art Deco')
        ? doc.documentName
        : fallbackTitle;

      return {
        _id: doc._id,
        id: doc._id,
        documentName: displayTitle,
        fileName: doc.fileName || displayTitle,
        documentType: doc.documentType || doc.category || 'General',
        category: doc.category || doc.documentType || 'General',
        financialYear: doc.financialYear || doc.year || '2024-25',
        year: doc.year || doc.financialYear || '2024-25',
        description: doc.description || '',
        fileSize: doc.fileSize || 0,
        mimeType: doc.mimeType || 'application/octet-stream',
        storageType: doc.storageType || 'local',
        paymentAmount: doc.paymentAmount !== undefined ? doc.paymentAmount : 500,
        paymentStatus: doc.paymentStatus || 'PENDING',
        paymentId: doc.paymentId || '',
        paymentMethod: doc.paymentMethod || '',
        paidAt: doc.paidAt || null,
        uploadDate: doc.uploadDate || doc.createdAt,
        fileUrl: `/api/documents/download?id=${doc._id}`
      };
    });

    return NextResponse.json({
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        whatsappNumber: client.whatsappNumber,
        clientType: client.clientType,
        isLinked: true
      },
      caFirm: client.createdBy ? {
        id: client.createdBy._id,
        name: client.createdBy.name,
        firmName: client.createdBy.firmName || 'CA Firm Practice',
        email: client.createdBy.email,
        phone: client.consultantPhone || client.createdBy.phone || ''
      } : null,
      documents: formattedDocs
    });
  } catch (error) {
    console.error('Portal documents fetch error:', error);
    return NextResponse.json({ message: 'Error fetching client documents' }, { status: 500 });
  }
}
