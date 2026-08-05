require('dotenv').config();
const { deleteAllFiles } = require('../middleware/s3Upload');

async function clearS3Files() {
  try {
    console.log('🚀 Starting S3 cleanup...\n');
    
    console.log('✅ Connected to AWS S3\n');
    console.log(`📦 Bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
    console.log(`🌍 Region: ${process.env.AWS_REGION}\n`);
    
    // Delete all files
    const result = await deleteAllFiles();
    
    if (result.deleted === 0) {
      console.log('✅ No files found in S3 bucket\n');
    } else {
      console.log(`\n✅ Successfully deleted ${result.deleted} files from S3`);
      console.log('\n🎉 S3 storage cleared successfully!\n');
    }
    
  } catch (error) {
    console.error('❌ Error clearing S3:', error.message);
    process.exit(1);
  }
}

clearS3Files();
