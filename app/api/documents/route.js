import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Document from '@/lib/models/Document';
import Client from '@/lib/models/Client';
import User from '@/lib/models/User';
import mongoose from 'mongoose';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    const caId = auth.isSuperAdmin ? null : auth.effectiveCaId;
    const query = caId ? { uploadedBy: caId } : {};

    if (clientId) {
      if (caId) {
        // Verify client belongs to logged in CA firm
        const client = await Client.findOne({ _id: clientId, createdBy: caId });
        if (!client) {
          return NextResponse.json({ message: 'Client not found or unauthorized' }, { status: 404 });
        }
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
    console.error('Fetch documents error:', error);
    return NextResponse.json({ message: 'Error fetching documents' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

    await dbConnect();
    const body = await req.json();
    const {
      clientId,
      clientMobile,
      clientEmail,
      clientName,
      whatsappNumber,
      year,
      financialYear,
      documentType,
      category,
      documentName,
      description,
      originalFilename,
      fileUrl,
      fileName,
      savedFileName,
      localFilePath,
      s3Key,
      bucket,
      mimeType,
      fileSize,
      storageType,
      paymentAmount,
      paymentStatus,
      paymentNotes
    } = body;

    const caId = auth.effectiveCaId;
    if (!caId) {
      return NextResponse.json({ message: 'Invalid CA firm context' }, { status: 400 });
    }

    if ((!clientId && !clientMobile && !whatsappNumber && !clientEmail) || (!year && !financialYear) || (!documentType && !category) || (!fileUrl && !s3Key)) {
      return NextResponse.json({ message: 'Missing required fields (Client, Financial Year, Document Type, and File)' }, { status: 400 });
    }

    // Resolve or find client
    let client = null;
    if (clientId && clientId !== 'NEW' && mongoose.Types.ObjectId.isValid(clientId)) {
      client = await Client.findOne({ _id: clientId, createdBy: caId });
    }

    // If client not found by ID, look up or auto-create by mobile/email
    if (!client && (clientMobile || whatsappNumber || clientEmail)) {
      const phone = (clientMobile || whatsappNumber || '').trim();
      const email = (clientEmail || '').trim().toLowerCase();
      const digits = phone.replace(/\D/g, '');
      const last10 = digits.slice(-10);

      const searchConditions = [
        ...(email ? [{ email }] : []),
        ...(last10 ? [
          { whatsappNumber: phone },
          { whatsappNumber: digits },
          { whatsappNumber: `+${digits}` },
          { whatsappNumber: { $regex: `${last10}$`, $options: 'i' } }
        ] : [])
      ];

      if (searchConditions.length > 0) {
        client = await Client.findOne({ createdBy: caId, $or: searchConditions });
      }

      if (!client) {
        // Auto-create client profile under this CA firm
        client = new Client({
          name: (clientName || (last10 ? `Client (${last10})` : email) || 'New Client').trim(),
          whatsappNumber: phone || '+910000000000',
          email: email || '',
          clientType: 'INDIVIDUAL',
          createdBy: caId
        });
        await client.save();
      }

      // Check if a self-registered User exists and link userId
      const userConditions = [
        ...(email ? [{ email }] : []),
        ...(last10 ? [
          { phone },
          { phone: digits },
          { phone: `+${digits}` },
          { phone: { $regex: `${last10}$`, $options: 'i' } }
        ] : [])
      ];
      if (userConditions.length > 0 && !client.userId) {
        const registeredUser = await User.findOne({ role: 'client', $or: userConditions });
        if (registeredUser) {
          client.userId = registeredUser._id;
          if (!registeredUser.clientId) {
            registeredUser.clientId = client._id;
            await registeredUser.save();
          }
          await client.save();
        }
      }
    }

    if (!client) {
      return NextResponse.json({ message: 'Invalid client or unauthorized' }, { status: 403 });
    }

    const fy = financialYear || year || '2024-25';
    const docType = documentType || category || 'ITR';
    const cat = category || documentType || 'General';
    const name = documentName || fileName || `${docType}_${fy}.pdf`;

    let computedBase64 = body.fileBase64 || body.fileData || '';
    if (!computedBase64 && computedSavedFileName) {
      try {
        const fs = (await import('fs')).default;
        const path = (await import('path')).default;
        const diskPath = path.join(process.cwd(), 'public', 'uploads', computedSavedFileName);
        if (fs.existsSync(diskPath)) {
          computedBase64 = fs.readFileSync(diskPath).toString('base64');
        }
      } catch (_) {}
    }

    const doc = new Document({
      clientId: client._id,
      year: fy,
      financialYear: fy,
      documentType: docType,
      category: cat,
      documentName: name,
      description: description || '',
      originalFilename: originalFilename || fileName || '',
      fileUrl: fileUrl || '',
      fileName: fileName || name,
      savedFileName: computedSavedFileName,
      localFilePath: computedLocalFilePath,
      fileBase64: computedBase64,
      fileData: computedBase64,
      s3Key: s3Key || '',
      bucket: bucket || (s3Key ? 'caapp123' : ''),
      mimeType: mimeType || '',
      fileSize: fileSize || 0,
      storageType: computedBase64 ? 'cloud_db' : (storageType || (s3Key ? 's3' : 'local')),
      paymentAmount: paymentAmount !== undefined ? Number(paymentAmount) : 500,
      paymentStatus: paymentStatus || 'PENDING',
      paymentNotes: paymentNotes || '',
      uploadedBy: caId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await doc.save();

    // Set fileUrl to point to secure download route
    doc.fileUrl = `/api/documents/download?id=${doc._id}`;
    await doc.save();

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Error saving document' }, { status: 400 });
  }
}
