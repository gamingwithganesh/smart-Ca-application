import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { uploadToS3, getS3PresignedUrl, BUCKET_NAME } from '@/lib/s3';

export async function POST(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const clientId = formData.get('clientId') || 'general';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const savedFileName = `${timestamp}_${cleanFileName}`;
    const contentType = file.type || 'application/octet-stream';

    let fileUrl = `/uploads/${savedFileName}`;
    let storageType = 'local';
    let s3Key = '';

    // Attempt S3 upload using AWS SDK v3
    try {
      s3Key = `clients/${clientId}/documents/${savedFileName}`;
      await uploadToS3({
        buffer,
        key: s3Key,
        contentType
      });

      storageType = 's3';
      // Route access through secure download route with pre-signed URL generator
      fileUrl = `/api/documents/download?key=${encodeURIComponent(s3Key)}`;
      console.log('✅ Document uploaded successfully to AWS S3 Bucket (caapp123):', s3Key);
    } catch (s3Err) {
      console.warn('⚠️ AWS S3 Bucket upload failed, using local storage fallback:', s3Err.message);

      // Save to local public/uploads directory as fallback
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, savedFileName);
      fs.writeFileSync(filePath, buffer);
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: contentType,
      savedFileName,
      storageType,
      s3Key,
      bucket: BUCKET_NAME
    });
  } catch (error) {
    console.error('File upload API error:', error);
    return NextResponse.json({ message: 'Failed to upload file' }, { status: 500 });
  }
}
