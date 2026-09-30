import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = (process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1').trim();
const bucketName = (process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'zintech-ca-documents-prod').trim();

const awsAccessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
const awsSecretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();
const awsSessionToken = (process.env.AWS_SESSION_TOKEN || '').trim();

// Support standard IAM access keys (AKIA/ASIA) and any configured AWS credentials
const isAwsCredentialsConfigured = Boolean(
  awsAccessKeyId &&
  awsSecretAccessKey &&
  !awsAccessKeyId.includes('your_')
);

const clientConfig = { region };

if (isAwsCredentialsConfigured) {
  clientConfig.credentials = {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    ...(awsSessionToken ? { sessionToken: awsSessionToken } : {})
  };
}

export const s3Client = new S3Client(clientConfig);
export const BUCKET_NAME = bucketName;
export const AWS_REGION = region;

/**
 * Check if S3 credentials and bucket name are configured properly
 */
export function isS3Configured() {
  return isAwsCredentialsConfigured && Boolean(bucketName);
}

/**
 * Upload a file buffer directly to S3 bucket (default: zintech-ca-documents-prod)
 */
export async function uploadToS3({ buffer, key, contentType, bucket }) {
  if (!isAwsCredentialsConfigured) {
    throw new Error('AWS credentials (AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY) are not configured');
  }

  const targetBucket = (bucket || BUCKET_NAME).trim();

  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream'
  });

  await s3Client.send(command);
  return {
    bucket: targetBucket,
    key,
    region
  };
}

/**
 * Check if an object exists in S3
 */
export async function checkS3ObjectExists(key, bucket) {
  if (!key || !isAwsCredentialsConfigured) return false;
  try {
    const targetBucket = (bucket || BUCKET_NAME).trim();
    const command = new HeadObjectCommand({
      Bucket: targetBucket,
      Key: key
    });
    await s3Client.send(command);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Generate a fresh temporary S3 pre-signed URL for accessing private objects
 */
export async function getS3PresignedUrl(key, expiresIn = 3600, bucket) {
  if (!key || !isAwsCredentialsConfigured) return null;
  try {
    const targetBucket = (bucket || BUCKET_NAME).trim();
    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (err) {
    console.warn('Error generating S3 presigned URL:', err.message);
    return null;
  }
}

/**
 * Generate a pre-signed URL for direct client-side upload to S3 (PUT method)
 */
export async function getS3UploadPresignedUrl({ key, contentType, expiresIn = 3600, bucket }) {
  if (!key) throw new Error('S3 key is required for upload URL generation');
  const targetBucket = (bucket || BUCKET_NAME).trim();
  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream'
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return {
    uploadUrl,
    bucket: targetBucket,
    key,
    region
  };
}

/**
 * Delete an object from S3 bucket
 */
export async function deleteFromS3(key, bucket) {
  if (!key || !isAwsCredentialsConfigured) return;
  const targetBucket = (bucket || BUCKET_NAME).trim();
  const command = new DeleteObjectCommand({
    Bucket: targetBucket,
    Key: key
  });
  await s3Client.send(command);
}
