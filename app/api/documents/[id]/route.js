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

    const doc = await Document.findOne({ _id: docId, uploadedBy: payload.userId });
    if (!doc) return NextResponse.json({ message: 'Document not found or unauthorized' }, { status: 404 });

    const body = await req.json();
    const {
      documentName,
      category,
      financialYear,
      description,
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

    const document = await Document.findOne({ _id: docId, uploadedBy: payload.userId });
    if (!document) return NextResponse.json({ message: 'Document not found or unauthorized' }, { status: 404 });

    // Delete S3 object FIRST before removing database record
    if (document.storageType === 's3' && document.s3Key) {
      try {
        await deleteFromS3(document.s3Key);
        console.log('🗑️ Successfully deleted S3 object:', document.s3Key);
      } catch (s3Err) {
        console.error('❌ S3 deletion failed for key:', document.s3Key, s3Err);
        return NextResponse.json({
          message: `Failed to delete S3 storage file (${s3Err.message}). Database record was preserved for retry.`
        }, { status: 500 });
      }
    }

    await Document.deleteOne({ _id: docId });
    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
