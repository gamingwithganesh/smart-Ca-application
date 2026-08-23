import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';

export async function POST(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const savedFileName = `${timestamp}_${cleanFileName}`;

    let fileUrl = `/uploads/${savedFileName}`;
    let storageType = 'local';
    let s3Key = '';

    const s3BucketName = (process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '').trim();
    const awsAccessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
    const awsSecretKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();

    // Check if valid AWS S3 credentials exist
    if (s3BucketName && awsAccessKeyId && awsSecretKey && !awsAccessKeyId.includes('your_') && !awsAccessKeyId.includes('BedrockAPIKey')) {
      try {
        const region = (process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1').trim();
        const s3 = new AWS.S3({
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretKey,
          region
        });

        s3Key = `documents/${savedFileName}`;
        const uploadResult = await s3.upload({
          Bucket: s3BucketName,
          Key: s3Key,
          Body: buffer,
          ContentType: file.type || 'application/octet-stream'
        }).promise();

        fileUrl = uploadResult.Location || `https://${s3BucketName}.s3.${region}.amazonaws.com/${s3Key}`;
        storageType = 's3';
      } catch (s3Err) {
        console.warn('⚠️ AWS S3 Bucket upload failed, using local storage fallback:', s3Err.message);
      }
    }

    // Save to local public/uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, savedFileName);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      savedFileName,
      storageType,
      s3Key
    });
  } catch (error) {
    console.error('File upload API error:', error);
    return NextResponse.json({ message: 'Failed to upload file' }, { status: 500 });
  }
}

