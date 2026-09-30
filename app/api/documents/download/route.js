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
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const key = searchParams.get('key');
    const rawUrl = searchParams.get('url') || searchParams.get('file');

    let doc = null;

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

    // 1. Check if the physical file exists on Local Disk (public/uploads/)
    if (doc) {
      const candidateNames = [
        doc.savedFileName,
        doc.localFilePath ? doc.localFilePath.replace(/^\/?uploads\//, '') : null,
        doc.s3Key ? path.basename(doc.s3Key) : null,
        doc.fileName,
        doc.originalFilename
      ].filter(Boolean);

      // Check direct candidate filenames on local disk
      for (const cand of candidateNames) {
        const localPath = path.join(uploadsDir, cand);
        if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
          const fileBuffer = fs.readFileSync(localPath);
          const ext = path.extname(cand).toLowerCase();
          const contentType = ext ? getMimeType(cand) : (doc.mimeType || 'application/octet-stream');
          const sendName = doc.fileName || cand;

          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `inline; filename="${encodeURIComponent(sendName)}"`,
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
              const contentType = getMimeType(f, doc.mimeType || 'application/octet-stream');
              const sendName = doc.fileName || f;

              return new NextResponse(fileBuffer, {
                headers: {
                  'Content-Type': contentType,
                  'Content-Disposition': `inline; filename="${encodeURIComponent(sendName)}"`,
                  'Cache-Control': 'public, max-age=3600'
                }
              });
            }
          }
        }
      }

      // 2. S3 Storage: Stream directly if S3 configured
      if (doc.s3Key && isS3Configured()) {
        try {
          const { GetObjectCommand } = await import('@aws-sdk/client-s3');
          const s3Response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: doc.s3Key
          }));

          if (s3Response.Body) {
            const byteArray = await s3Response.Body.transformToByteArray();
            const contentType = s3Response.ContentType || getMimeType(doc.s3Key, 'application/octet-stream');
            return new NextResponse(Buffer.from(byteArray), {
              headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName || path.basename(doc.s3Key))}"`,
                'Cache-Control': 'public, max-age=3600'
              }
            });
          }
        } catch (s3Err) {
          console.warn('S3 stream fallback:', s3Err.message);
        }
      }
    }

    // 3. If direct key provided without DB record
    if (key || id) {
      const searchKey = key || id;
      const keyBase = path.basename(searchKey);
      const localPath = path.join(uploadsDir, keyBase);
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const fileBuffer = fs.readFileSync(localPath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': getMimeType(keyBase),
            'Content-Disposition': `inline; filename="${encodeURIComponent(keyBase)}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }

      // Check if any file in uploadsDir matches searchKey
      if (fs.existsSync(uploadsDir)) {
        const diskFiles = fs.readdirSync(uploadsDir).filter(f => f !== '.gitkeep');
        const match = diskFiles.find(f => f.includes(keyBase) || keyBase.includes(f));
        if (match) {
          const fileBuffer = fs.readFileSync(path.join(uploadsDir, match));
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': getMimeType(match),
              'Content-Disposition': `inline; filename="${encodeURIComponent(match)}"`,
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
      }
    }

    // 4. Default to serving the newest uploaded file on disk if any file exists
    if (fs.existsSync(uploadsDir)) {
      const diskFiles = fs.readdirSync(uploadsDir).filter(f => f !== '.gitkeep');
      if (diskFiles.length > 0) {
        const newestFile = diskFiles.sort((a, b) => {
          const statA = fs.statSync(path.join(uploadsDir, a));
          const statB = fs.statSync(path.join(uploadsDir, b));
          return statB.mtimeMs - statA.mtimeMs;
        })[0];

        const fileBuffer = fs.readFileSync(path.join(uploadsDir, newestFile));
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': getMimeType(newestFile),
            'Content-Disposition': `inline; filename="${encodeURIComponent(doc?.fileName || newestFile)}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
    }

    return NextResponse.json({ message: 'Document file not found' }, { status: 404 });
  } catch (error) {
    console.error('Error serving document:', error);
    return new NextResponse('Error downloading file', { status: 500 });
  }
}


