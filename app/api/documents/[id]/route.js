import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Document from '@/lib/models/Document';
import { verifyToken } from '@/lib/auth';
import { deleteFromS3 } from '@/lib/s3';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    const document = await Document.findOne({ _id: docId, uploadedBy: payload.userId }).populate('clientId', 'name whatsappNumber');
    if (!document) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

    const formattedDoc = {
      ...document.toObject(),
      fileUrl: `/api/documents/download?id=${document._id}`
    };

    return NextResponse.json(formattedDoc);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    const doc = await Document.findById(docId);
    if (!doc) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

    const body = await req.json();
    const {
      documentName,
      category,
      financialYear,
      description,
      paymentAmount,
      paymentStatus,
      paymentNotes,
      // File replacement fields if file was replaced
      newS3Key,
      newFileName,
      newMimeType,
      newFileSize
    } = body;

    const oldS3Key = doc.s3Key;

    if (documentName !== undefined) doc.documentName = documentName;
    if (category !== undefined) {
      doc.category = category;
      doc.documentType = category;
    }
    if (financialYear !== undefined) {
      doc.financialYear = financialYear;
      doc.year = financialYear;
    }
    if (description !== undefined) doc.description = description;
    if (paymentAmount !== undefined) doc.paymentAmount = Number(paymentAmount);
    if (paymentStatus !== undefined) {
      doc.paymentStatus = paymentStatus;
      if (paymentStatus === 'COMPLETED' && !doc.paidAt) {
        doc.paidAt = new Date();
        doc.paymentMethod = doc.paymentMethod || 'MANUAL';
      }
    }
    if (paymentNotes !== undefined) doc.paymentNotes = paymentNotes;

    // Handle File Replacement
    let fileReplaced = false;
    if (newS3Key && newS3Key !== oldS3Key) {
      doc.s3Key = newS3Key;
      doc.bucket = 'caapp123';
      doc.storageType = 's3';
      if (newFileName) {
        doc.fileName = newFileName;
        doc.originalFilename = newFileName;
      }
      if (newMimeType) doc.mimeType = newMimeType;
      if (newFileSize) doc.fileSize = newFileSize;
      fileReplaced = true;
    }

    doc.updatedAt = new Date();
    await doc.save();

    await Document.collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          documentName: doc.documentName,
          category: doc.category,
          documentType: doc.documentType,
          financialYear: doc.financialYear,
          year: doc.year,
          description: doc.description,
          paymentAmount: doc.paymentAmount,
          paymentStatus: doc.paymentStatus,
          paidAt: doc.paidAt,
          paymentMethod: doc.paymentMethod,
          paymentNotes: doc.paymentNotes,
          updatedAt: new Date()
        }
      }
    );

    // Delete old S3 key ONLY AFTER new DB record update succeeds
    if (fileReplaced && oldS3Key && oldS3Key !== newS3Key) {
      try {
        await deleteFromS3(oldS3Key);
        console.log('🗑️ Successfully deleted replaced old S3 object:', oldS3Key);
      } catch (delErr) {
        console.warn('⚠️ Warning: Failed to clean up old S3 object:', oldS3Key, delErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Document updated successfully',
      document: {
        ...doc.toObject(),
        fileUrl: `/api/documents/download?id=${doc._id}`
      }
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ message: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const payload = verifyToken(req);
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    const document = await Document.findById(docId);
    if (!document) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

    // Authorization check: Super Admin, CA Firm Owner, or Document's Client
    const isSuper = payload.role === 'superadmin';
    const isOwnerCa = document.uploadedBy && document.uploadedBy.toString() === payload.userId?.toString();
    const isClientOwner = payload.role === 'client' && (
      (payload.clientId && document.clientId && document.clientId.toString() === payload.clientId.toString()) ||
      (document.clientId && document.clientId.toString() === payload.userId?.toString())
    );

    if (!isSuper && !isOwnerCa && !isClientOwner && payload.role !== 'admin' && payload.role !== 'sub_ca') {
      return NextResponse.json({ message: 'Unauthorized to delete this document' }, { status: 403 });
    }

    // Delete S3 object if present
    if (document.s3Key) {
      try {
        await deleteFromS3(document.s3Key, document.bucket);
        console.log('🗑️ Successfully deleted S3 object:', document.s3Key);
      } catch (s3Err) {
        console.warn('⚠️ S3 delete warning:', s3Err.message);
      }
    }

    await Document.deleteOne({ _id: docId });
    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
