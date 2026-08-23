import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Document from '@/lib/models/Document';
import Client from '@/lib/models/Client';
import { verifyToken } from '@/lib/auth';

export async function GET(req) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    const query = { uploadedBy: payload.userId };

    if (clientId) {
      // Verify client belongs to logged in CA
      const client = await Client.findOne({ _id: clientId, createdBy: payload.userId });
      if (!client) {
        return NextResponse.json({ message: 'Client not found or unauthorized' }, { status: 404 });
      }
      query.clientId = clientId;
    }

    const documents = await Document.find(query)
      .populate('clientId', 'name whatsappNumber')
      .sort({ uploadDate: -1 })
      .lean();

    const formattedDocs = documents.map(doc => ({
      ...doc,
      documentName: doc.documentName || doc.fileName || `${doc.documentType}_${doc.year || doc.financialYear}`,
      financialYear: doc.financialYear || doc.year || '2024-25',
      category: doc.category || doc.documentType || 'General',
      originalFilename: doc.originalFilename || doc.fileName || '',
      fileUrl: `/api/documents/download?id=${doc._id}`
    }));

    return NextResponse.json(formattedDocs);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching documents' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      clientId,
      year,
      financialYear,
      documentType,
      category,
      documentName,
      description,
      originalFilename,
      fileUrl,
      fileName,
      s3Key,
      bucket,
      mimeType,
      fileSize,
      storageType
    } = body;

    if (!clientId || (!year && !financialYear) || (!documentType && !category) || (!fileUrl && !s3Key)) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Verify client belongs to logged in CA
    const client = await Client.findOne({ _id: clientId, createdBy: payload.userId });
    if (!client) {
      return NextResponse.json({ message: 'Invalid client or unauthorized' }, { status: 403 });
    }

    const fy = financialYear || year || '2024-25';
    const docType = documentType || category || 'ITR';
    const cat = category || documentType || 'General';
    const name = documentName || fileName || `${docType}_${fy}.pdf`;

    const doc = new Document({
      clientId,
      year: fy,
      financialYear: fy,
      documentType: docType,
      category: cat,
      documentName: name,
      description: description || '',
      originalFilename: originalFilename || fileName || '',
      fileUrl: fileUrl || '',
      fileName: fileName || name,
      s3Key: s3Key || '',
      bucket: bucket || (s3Key ? 'caapp123' : ''),
      mimeType: mimeType || '',
      fileSize: fileSize || 0,
      storageType: storageType || (s3Key ? 's3' : 'local'),
      uploadedBy: payload.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await doc.save();

    // Set fileUrl to point to secure pre-signed download route
    doc.fileUrl = `/api/documents/download?id=${doc._id}`;
    await doc.save();

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Error saving document' }, { status: 400 });
  }
}
