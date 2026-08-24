import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getS3UploadPresignedUrl, isS3Configured, BUCKET_NAME } from '@/lib/s3';

export async function POST(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, contentType, clientId } = await req.json();

    if (!fileName) {
      return NextResponse.json({ message: 'fileName is required' }, { status: 400 });
    }

    if (!isS3Configured()) {
      return NextResponse.json({
        message: 'AWS S3 is not configured in environment variables. Please configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, and AWS_S3_REGION in your Vercel Project Settings.'
      }, { status: 500 });
    }

    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const savedFileName = `${timestamp}_${cleanFileName}`;
    const targetClientId = clientId || 'general';
    const s3Key = `clients/${targetClientId}/documents/${savedFileName}`;

    const { uploadUrl, region } = await getS3UploadPresignedUrl({
      key: s3Key,
      contentType: contentType || 'application/octet-stream',
      expiresIn: 3600
    });

    return NextResponse.json({
      success: true,
      uploadUrl,
      s3Key,
      bucket: BUCKET_NAME,
      savedFileName,
      region,
      fileUrl: `/api/documents/download?key=${encodeURIComponent(s3Key)}`
    });
  } catch (error) {
    console.error('Error generating pre-signed upload URL:', error);
    return NextResponse.json({
      message: `Failed to generate AWS S3 upload URL: ${error.message}`
    }, { status: 500 });
  }
}
