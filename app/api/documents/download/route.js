import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/db';
import Document from '@/lib/models/Document';
import Client from '@/lib/models/Client';
import User from '@/lib/models/User';
import { isS3Configured, s3Client, BUCKET_NAME } from '@/lib/s3';

function getMimeType(fileName, defaultMime = 'application/octet-stream') {
  const ext = path.extname(fileName || '').toLowerCase();
  const mimeMap = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.json': 'application/json'
  };
  return mimeMap[ext] || defaultMime;
}

export async function GET(req) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const key = searchParams.get('key');
  const rawUrl = searchParams.get('url') || searchParams.get('file');

  let doc = null;
  let storageError = null;
  let signedUrl = null;
  let finalStatus = 404;

  try {
    await dbConnect();

    if (id) {
      doc = await Document.findById(id).populate('clientId').catch(() => null);
      if (!doc) {
        doc = await Document.findOne({ clientId: id }).populate('clientId').sort({ uploadDate: -1, createdAt: -1 }).catch(() => null);
      }
    }
    
    if (!doc && key) {
      doc = await Document.findOne({ $or: [{ s3Key: key }, { savedFileName: key }, { fileName: key }] }).populate('clientId').catch(() => null);
    }

    if (!doc && rawUrl) {
      const cleanUrl = rawUrl.trim();
      doc = await Document.findOne({
        $or: [{ fileUrl: cleanUrl }, { s3Key: cleanUrl }, { fileName: cleanUrl }, { savedFileName: cleanUrl }]
      }).populate('clientId').catch(() => null);
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const effectiveClientId = doc?.clientId?._id || doc?.clientId || 'N/A';
    const effectiveBucket = doc?.bucket || BUCKET_NAME || 'caapp123';
    const effectiveStoragePath = doc?.s3Key || doc?.savedFileName || doc?.localFilePath || 'N/A';

    // DIAGNOSTIC LOGGING (Step 1 requirement)
    console.log('=== [DOCUMENT DOWNLOAD DIAGNOSTIC] ===');
    console.log('DOCUMENT ID:', id || key || rawUrl || 'N/A');
    console.log('DATABASE RECORD:', doc ? 'EXISTS' : 'MISSING');
    console.log('CLIENT ID:', effectiveClientId);
    console.log('BUCKET:', effectiveBucket);
    console.log('STORAGE PATH:', effectiveStoragePath);

    if (doc) {
      const sendName = doc.originalFilename || doc.fileName || `${doc.documentType || 'document'}_${doc.financialYear || doc.year || 'file'}.pdf`;
      const fallbackMime = doc.mimeType || getMimeType(sendName);

      // 1. Cloud Database Storage: check doc.fileBase64 or doc.fileData
      const base64Data = doc.fileBase64 || doc.fileData;
      if (base64Data && typeof base64Data === 'string' && base64Data.length > 20) {
        const fileBuffer = Buffer.from(base64Data, 'base64');
        finalStatus = 200;
        console.log('STORAGE PROVIDER: MongoDB Cloud Buffer (100% Serverless Resilient)');
        console.log('FINAL STATUS: 200 OK');

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': fallbackMime,
            'Content-Disposition': `inline; filename="${encodeURIComponent(sendName)}"`,
            'Content-Length': String(fileBuffer.length),
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }

      // 2. Local Disk Storage: public/uploads/
      const candidateNames = [
        doc.savedFileName,
        doc.localFilePath ? doc.localFilePath.replace(/^\/?uploads\//, '') : null,
        doc.s3Key ? path.basename(doc.s3Key) : null,
        doc.fileName,
        doc.originalFilename
      ].filter(Boolean);

      for (const cand of candidateNames) {
        const localPath = path.join(uploadsDir, cand);
        if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
          const fileBuffer = fs.readFileSync(localPath);
          const ext = path.extname(cand).toLowerCase();
          const contentType = ext ? getMimeType(cand) : fallbackMime;
          finalStatus = 200;
          console.log('STORAGE PROVIDER: Local Ephemeral Disk');
          console.log('FINAL STATUS: 200 OK');

          return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `inline; filename="${encodeURIComponent(sendName)}"`,
              'Content-Length': String(fileBuffer.length),
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
      }

      // Check fuzzy match in uploads folder
      if (fs.existsSync(uploadsDir)) {
        const diskFiles = fs.readdirSync(uploadsDir);
        for (const f of diskFiles) {
          if (f === '.gitkeep') continue;
          if (
            (doc.fileName && f.toLowerCase().endsWith(doc.fileName.toLowerCase())) ||
            (doc.originalFilename && f.toLowerCase().endsWith(doc.originalFilename.toLowerCase())) ||
            (doc.savedFileName && f.toLowerCase().includes(doc.savedFileName.toLowerCase())) ||
            (doc.s3Key && f.toLowerCase().includes(path.basename(doc.s3Key).toLowerCase()))
          ) {
            const localPath = path.join(uploadsDir, f);
            if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
              const fileBuffer = fs.readFileSync(localPath);
              const contentType = getMimeType(f, fallbackMime);
              finalStatus = 200;
              console.log('STORAGE PROVIDER: Local Disk (Fuzzy Match)');
              console.log('FINAL STATUS: 200 OK');

              return new NextResponse(fileBuffer, {
                status: 200,
                headers: {
                  'Content-Type': contentType,
                  'Content-Disposition': `inline; filename="${encodeURIComponent(sendName)}"`,
                  'Content-Length': String(fileBuffer.length),
                  'Cache-Control': 'public, max-age=3600'
                }
              });
            }
          }
        }
      }

      // 3. AWS S3 Storage
      if (doc.s3Key && isS3Configured()) {
        try {
          const { GetObjectCommand } = await import('@aws-sdk/client-s3');
          const s3Response = await s3Client.send(new GetObjectCommand({
            Bucket: effectiveBucket,
            Key: doc.s3Key
          }));

          if (s3Response.Body) {
            const byteArray = await s3Response.Body.transformToByteArray();
            const contentType = s3Response.ContentType || getMimeType(doc.s3Key, 'application/octet-stream');
            finalStatus = 200;
            console.log('STORAGE PROVIDER: AWS S3 Stream');
            console.log('FINAL STATUS: 200 OK');

            return new NextResponse(Buffer.from(byteArray), {
              status: 200,
              headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${encodeURIComponent(sendName)}"`,
                'Cache-Control': 'public, max-age=3600'
              }
            });
          }
        } catch (s3Err) {
          storageError = s3Err.message;
          console.warn('STORAGE ERROR (S3 Stream):', s3Err.message);
        }
      }
    }

    // 4. Fallback search by key/id on disk
    if (key || id) {
      const searchKey = key || id;
      const keyBase = path.basename(searchKey);
      const localPath = path.join(uploadsDir, keyBase);
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const fileBuffer = fs.readFileSync(localPath);
        finalStatus = 200;
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': getMimeType(keyBase),
            'Content-Disposition': `inline; filename="${encodeURIComponent(keyBase)}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
    }

    console.log('STORAGE ERROR:', storageError || 'File binary missing from all storage providers');
    console.log('SIGNED URL:', signedUrl || 'NONE');
    console.log('FINAL STATUS: 404 NOT FOUND');
    console.log('======================================');

    return NextResponse.json(
      {
        success: false,
        message: 'Document file not found',
        code: 'DOCUMENT_STORAGE_MISSING',
        documentId: id || 'N/A'
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error serving document download:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal error downloading file',
        code: 'DOCUMENT_DOWNLOAD_ERROR'
      },
      { status: 500 }
    );
  }
}
