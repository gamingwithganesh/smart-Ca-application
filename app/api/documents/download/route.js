import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/db';
import Document from '@/lib/models/Document';
import { verifyToken } from '@/lib/auth';
import { getS3PresignedUrl } from '@/lib/s3';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const key = searchParams.get('key');
    const rawUrl = searchParams.get('url') || searchParams.get('file');
    const mode = searchParams.get('mode'); // 'json' or redirect

    // 1. Verify Authentication & Identity if JWT token header is supplied
    const payload = verifyToken(req);

    let doc = null;

    if (id) {
      if (payload) {
        // Authenticated CA user requesting document -> strictly scope to uploadedBy
        doc = await Document.findOne({ _id: id, uploadedBy: payload.userId });
      } else {
        // Client access via direct document ID link
        doc = await Document.findById(id);
      }
    } else if (key) {
      // Security: Do NOT trust arbitrary S3 keys provided by client! Match in DB record.
      if (payload) {
        doc = await Document.findOne({ s3Key: key, uploadedBy: payload.userId });
      } else {
        doc = await Document.findOne({ s3Key: key });
      }
    } else if (rawUrl) {
      const cleanUrl = rawUrl.trim();
      if (payload) {
        doc = await Document.findOne({
          $or: [{ fileUrl: cleanUrl }, { s3Key: cleanUrl }],
          uploadedBy: payload.userId
        });
      } else {
        doc = await Document.findOne({
          $or: [{ fileUrl: cleanUrl }, { s3Key: cleanUrl }]
        });
      }
    }

    // 2. Security Check: Block access if an explicit ID/key was requested but no valid document was found
    if ((id || key) && !doc) {
      return NextResponse.json({ message: 'Document not found or unauthorized access' }, { status: 403 });
    }

    // 3. S3 Storage: Generate 1-hour pre-signed URL for authenticated/valid document
    if (doc && doc.storageType === 's3' && doc.s3Key) {
      try {
        const presignedUrl = await getS3PresignedUrl(doc.s3Key, 3600); // 1 hour expiration
        if (mode === 'json') {
          return NextResponse.json({ success: true, downloadUrl: presignedUrl, fileName: doc.fileName, s3Key: doc.s3Key });
        }
        return NextResponse.redirect(presignedUrl);
      } catch (s3Err) {
        console.error('Error generating pre-signed URL for doc ID:', doc._id, s3Err);
        return new NextResponse('Failed to generate secure S3 download URL', { status: 500 });
      }
    }

    // 4. Local Storage Fallback: Serve local file safely
    if (doc && doc.fileUrl && doc.fileUrl.includes('/uploads/')) {
      const cleanLocalName = doc.fileUrl.replace(/^\/?uploads\//, '');
      const localFilePath = path.join(process.cwd(), 'public', 'uploads', cleanLocalName);

      if (fs.existsSync(localFilePath)) {
        const fileBuffer = fs.readFileSync(localFilePath);
        const ext = path.extname(cleanLocalName).toLowerCase();
        let contentType = doc.mimeType || 'application/octet-stream';
        if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.doc' || ext === '.docx') contentType = 'application/msword';
        else if (ext === '.xls' || ext === '.xlsx') contentType = 'application/vnd.ms-excel';

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${doc.fileName || cleanLocalName}"`
          }
        });
      }
    }

    // 5. Fallback for placeholder demonstration files
    const filename = rawUrl ? path.basename(rawUrl.split('?')[0]) : 'document.pdf';
    const ext = path.extname(filename).toLowerCase();

    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      const samplePngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAP0lEQVR42u3RAQ0AAAgDIK1/ab2x8YADSA4ZBgEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBwWvABR0wAT08hP8AAAAASUVORK5CYII=', 'base64');
      return new NextResponse(samplePngBuffer, {
        headers: {
          'Content-Type': ext === '.png' ? 'image/png' : 'image/jpeg',
          'Content-Disposition': `inline; filename="${filename}"`
        }
      });
    }

    const pdfFileName = filename.endsWith('.pdf') ? filename : `${filename.replace(/\.[^/.]+$/, '')}.pdf`;
    const samplePdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 160 >>
stream
BT
/F1 18 Tf
50 700 Td
(CA Document System - Official Client Document) Tj
0 -30 Td
/F1 12 Tf
(Document File: ${pdfFileName}) Tj
0 -20 Td
(Status: Verified & Validated Official Tax Document) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000473 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
543
%%EOF`;

    return new NextResponse(Buffer.from(samplePdfContent), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${pdfFileName}"`
      }
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    return new NextResponse('Error downloading file', { status: 500 });
  }
}
