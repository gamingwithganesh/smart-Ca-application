const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1' // Mumbai region by default
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Only accept PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload file to S3
const uploadToS3 = async (file, clientId, documentType, year) => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${clientId}/${documentType}/${year}/${timestamp}_${sanitizedFileName}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private', // Files are private by default
      Metadata: {
        clientId: clientId,
        documentType: documentType,
        year: year,
        uploadDate: new Date().toISOString()
      }
    };

    const result = await s3.upload(params).promise();

    return {
      fileUrl: result.Location,
      fileName: sanitizedFileName,
      s3Key: result.Key,
      bucket: result.Bucket
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3: ' + error.message);
  }
};

// Generate presigned URL for secure file access
const getPresignedUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Expires: expiresIn // URL expires in seconds (default 1 hour)
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error('Presigned URL Error:', error);
    throw new Error('Failed to generate presigned URL: ' + error.message);
  }
};

// Delete file from S3
const deleteFromS3 = async (s3Key) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error('Failed to delete file from S3: ' + error.message);
  }
};

// List all files for a client
const listClientFiles = async (clientId) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Prefix: `${clientId}/`
    };

    const result = await s3.listObjectsV2(params).promise();
    return result.Contents || [];
  } catch (error) {
    console.error('S3 List Error:', error);
    throw new Error('Failed to list files from S3: ' + error.message);
  }
};

// Delete all files in S3 bucket (for cleanup)
const deleteAllFiles = async () => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME
    };

    const listedObjects = await s3.listObjectsV2(params).promise();

    if (listedObjects.Contents.length === 0) {
      return { deleted: 0 };
    }

    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({ Key }))
      }
    };

    await s3.deleteObjects(deleteParams).promise();

    return { deleted: listedObjects.Contents.length };
  } catch (error) {
    console.error('S3 Delete All Error:', error);
    throw new Error('Failed to delete all files from S3: ' + error.message);
  }
};

module.exports = {
  upload,
  uploadToS3,
  getPresignedUrl,
  deleteFromS3,
  listClientFiles,
  deleteAllFiles,
  s3
};
