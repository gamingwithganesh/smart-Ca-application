import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = (process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1').trim();
const bucketName = (process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'caapp123').trim();

const awsAccessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
const awsSecretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();

const clientConfig = { region };

// If explicit IAM credentials are set and not placeholder values, pass them.
// Otherwise, AWS SDK v3 automatically uses the default credential provider chain (EC2 IAM Role).
if (awsAccessKeyId && awsSecretAccessKey && !awsAccessKeyId.includes('your_')) {
  clientConfig.credentials = {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey
  };
}

export const s3Client = new S3Client(clientConfig);
export const BUCKET_NAME = bucketName;

/**
 * Upload a file buffer directly to S3 bucket caapp123
 */
export async function uploadToS3({ buffer, key, contentType }) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream'
  });

  await s3Client.send(command);
  return {
    bucket: BUCKET_NAME,
    key,
    region
  };
}

/**
 * Generate a 1-hour S3 pre-signed URL for accessing private objects
 */
export async function getS3PresignedUrl(key, expiresIn = 3600) {
  if (!key) return null;
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Check if S3 credentials and bucket name are configured properly
 */
export function isS3Configured() {
  return Boolean(
    awsAccessKeyId &&
    awsSecretAccessKey &&
    !awsAccessKeyId.includes('your_') &&
    bucketName
  );
}

/**
 * Generate a pre-signed URL for direct client-side upload to S3 (PUT method)
 */
export async function getS3UploadPresignedUrl({ key, contentType, expiresIn = 3600 }) {
  if (!key) throw new Error('S3 key is required for upload URL generation');
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType || 'application/octet-stream'
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return {
    uploadUrl,
    bucket: BUCKET_NAME,
    key,
    region
  };
}

/**
 * Delete an object from S3 bucket caapp123
 */
export async function deleteFromS3(key) {
  if (!key) return;
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });
  await s3Client.send(command);
}

