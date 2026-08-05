# Storage Migration Guide: Supabase → AWS S3

## Overview

Yeh project ab **AWS S3** use karta hai document storage ke liye instead of Supabase. Yeh migration aapko:
- ✅ AWS credits ka fayda lene dega
- ✅ Better scalability provide karega
- ✅ Lower costs dega
- ✅ Better integration with AWS services

---

## What Changed?

### Files Modified:

1. **New Files Created:**
   - `backend/middleware/s3Upload.js` - AWS S3 upload middleware
   - `backend/scripts/clearS3Files.js` - S3 cleanup script
   - `AWS_S3_SETUP_GUIDE.md` - Complete S3 setup guide

2. **Files Updated:**
   - `backend/models/Document.js` - Added S3 fields (s3Key, bucket, storageType)
   - `backend/controllers/documentController.js` - Updated to use S3
   - `backend/routes/documentRoutes.js` - Changed middleware to s3Upload
   - `backend/.env.example` - Added AWS S3 configuration

3. **Files Kept (Legacy):**
   - `backend/middleware/supabaseUpload.js` - Kept for reference
   - `backend/scripts/clearSupabaseFiles.js` - Kept for cleanup

---

## Quick Start

### Option 1: Use AWS S3 (Recommended)

1. **Setup AWS S3:**
   ```bash
   # Read the complete guide
   cat AWS_S3_SETUP_GUIDE.md
   ```

2. **Update .env file:**
   ```env
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=ap-south-1
   AWS_S3_BUCKET_NAME=your-bucket-name
   ```

3. **Start server:**
   ```bash
   cd backend
   npm start
   ```

4. **Test upload:**
   - Frontend se document upload karo
   - Check S3 console mein file upload hui ya nahi

### Option 2: Continue with Supabase

Agar aap abhi Supabase use karna chahte ho:

1. **Revert to Supabase:**
   ```bash
   # In backend/routes/documentRoutes.js
   # Change: const { upload } = require('../middleware/s3Upload');
   # To: const { upload } = require('../middleware/supabaseUpload');
   ```

2. **Update documentController.js:**
   ```bash
   # Change imports back to supabaseUpload
   # Revert upload logic to use uploadToSupabase
   ```

---

## Feature Comparison

| Feature | Supabase | AWS S3 |
|---------|----------|--------|
| **Cost** | $25/month (50GB) | $0.23/month (10GB) |
| **Scalability** | Limited | Unlimited |
| **Durability** | 99.9% | 99.999999999% |
| **Region** | Global | ap-south-1 (Mumbai) |
| **Credits** | ❌ No | ✅ Yes (AWS credits) |
| **Setup** | Easy | Medium |
| **Integration** | Limited | Full AWS ecosystem |

---

## Key Differences

### 1. File URLs

**Supabase:**
```
https://your-project.supabase.co/storage/v1/object/public/documents/file.pdf
```

**AWS S3:**
```
https://your-bucket.s3.ap-south-1.amazonaws.com/client123/ITR/2025-26/file.pdf
```

### 2. Presigned URLs

S3 uses **presigned URLs** for security:
- URLs expire after 7 days (configurable)
- Automatically refreshed when documents are fetched
- More secure than public URLs

### 3. File Organization

**Supabase:**
```
documents/
  └── userId_clientId_year_documentType_file.pdf
```

**AWS S3:**
```
clientId/
  └── documentType/
      └── year/
          └── timestamp_file.pdf
```

---

## Migration Steps (Supabase → S3)

Agar aapke paas already Supabase mein documents hain:

### Step 1: Backup Existing Documents

```bash
# Run Supabase backup script
cd backend/scripts
node backupSupabaseToS3.js
```

### Step 2: Update Database

```javascript
// Update all documents to use S3
const Document = require('./models/Document');

async function updateDocuments() {
  const docs = await Document.find({ storageType: { $exists: false } });
  
  for (const doc of docs) {
    doc.storageType = 'supabase'; // Mark old documents
    await doc.save();
  }
}
```

### Step 3: Test S3 Upload

```bash
# Upload a test document
# Verify it appears in S3 console
# Verify it's accessible via WhatsApp bot
```

### Step 4: Gradual Migration

- New uploads → S3
- Old documents → Keep in Supabase
- Gradually migrate old documents to S3

### Step 5: Cleanup

```bash
# After all documents migrated
cd backend/scripts
node clearSupabaseFiles.js
```

---

## Code Examples

### Upload to S3

```javascript
const { uploadToS3 } = require('../middleware/s3Upload');

// Upload file
const result = await uploadToS3(
  file,           // Multer file object
  clientId,       // Client ID
  'ITR',          // Document type
  '2025-26'       // Year
);

console.log(result);
// {
//   fileUrl: 'https://...',
//   fileName: 'document.pdf',
//   s3Key: 'client123/ITR/2025-26/1234567890_document.pdf',
//   bucket: 'your-bucket-name'
// }
```

### Generate Presigned URL

```javascript
const { getPresignedUrl } = require('../middleware/s3Upload');

// Generate URL valid for 1 hour
const url = await getPresignedUrl(s3Key, 3600);
```

### Delete from S3

```javascript
const { deleteFromS3 } = require('../middleware/s3Upload');

// Delete file
await deleteFromS3(s3Key);
```

---

## Environment Variables

### Required for S3:

```env
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-south-1

# S3 Configuration
AWS_S3_BUCKET_NAME=your-ca-documents-bucket
```

### Optional (Legacy):

```env
# Supabase (can be removed after migration)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

---

## Testing

### Test S3 Upload:

```bash
# Start server
npm start

# Upload document via frontend
# Check logs for S3 upload confirmation
# Verify file in S3 console
```

### Test WhatsApp Bot:

```bash
# Send message: "ITR 2025-26"
# Bot should return S3 presigned URL
# Click URL to verify document opens
```

### Test Cleanup:

```bash
# Clear all S3 files
cd backend/scripts
node clearS3Files.js
```

---

## Troubleshooting

### Issue: "Access Denied"

**Solution:**
```bash
# Check IAM permissions
# Verify bucket policy
# Confirm AWS credentials in .env
```

### Issue: "Presigned URL Expired"

**Solution:**
```javascript
// URLs auto-refresh when fetching documents
// If needed, manually refresh:
const freshUrl = await getPresignedUrl(doc.s3Key, 7 * 24 * 60 * 60);
```

### Issue: "Bucket Not Found"

**Solution:**
```bash
# Verify bucket name in .env
# Check bucket exists in correct region
# Confirm region matches AWS_REGION
```

---

## Cost Estimation

### Scenario: 100 Clients, 10 Documents Each

**Storage:**
- 1000 documents × 5 MB = 5 GB
- Cost: 5 GB × $0.023 = **$0.115/month**

**Requests:**
- 1000 uploads/month = $0.005
- 5000 downloads/month = $0.002
- Total: **$0.007/month**

**Total Monthly Cost: ~$0.12** 🎉

Compare to Supabase: $25/month

**Savings: $24.88/month = $298/year!**

---

## Security Checklist

- ✅ AWS credentials in .env (not committed to Git)
- ✅ S3 bucket is private (Block Public Access enabled)
- ✅ IAM user has minimal required permissions
- ✅ Presigned URLs expire after 7 days
- ✅ Server-side encryption enabled
- ✅ MFA enabled on AWS account
- ✅ CloudTrail logging enabled
- ✅ Regular access key rotation

---

## Rollback Plan

Agar S3 mein koi problem ho:

1. **Immediate Rollback:**
   ```bash
   # Change back to Supabase in routes
   # Restart server
   ```

2. **Data Recovery:**
   ```bash
   # S3 versioning enabled hai toh
   # Previous versions restore kar sakte ho
   ```

3. **Support:**
   - AWS Support Console
   - Check CloudWatch logs
   - Review CloudTrail events

---

## Next Steps

1. ✅ Read `AWS_S3_SETUP_GUIDE.md`
2. ✅ Create S3 bucket
3. ✅ Setup IAM user
4. ✅ Update .env file
5. ✅ Test upload
6. ✅ Test WhatsApp bot
7. ✅ Monitor costs
8. ✅ Plan Supabase migration (if needed)

---

## Support & Resources

- **AWS S3 Docs**: https://docs.aws.amazon.com/s3/
- **AWS Pricing**: https://aws.amazon.com/s3/pricing/
- **IAM Best Practices**: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- **S3 Security**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html

---

**Happy Coding! 🚀**

Agar koi doubt ho toh AWS_S3_SETUP_GUIDE.md dekho ya AWS documentation check karo.
