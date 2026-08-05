# AWS S3 Setup Guide for Document Storage

## Overview
Yeh guide aapko AWS S3 setup karne mein help karegi document storage ke liye. Supabase ki jagah AWS S3 use karke aap apne AWS credits ka fayda utha sakte ho.

## Prerequisites
- AWS Account with credits
- AWS CLI installed (optional but recommended)
- IAM user with S3 access

---

## Step 1: Create S3 Bucket

### Using AWS Console:

1. **AWS Console Login**
   - https://console.aws.amazon.com/ par jao
   - Apne credentials se login karo

2. **S3 Service Open Karo**
   - Search bar mein "S3" type karo
   - S3 service select karo

3. **Create Bucket**
   - "Create bucket" button click karo
   - **Bucket name**: `your-ca-documents-bucket` (unique name choose karo)
   - **Region**: `ap-south-1` (Mumbai) - India ke liye best
   - **Block Public Access**: ✅ Keep all checkboxes checked (security ke liye)
   - **Bucket Versioning**: Enable (optional - file versions track karne ke liye)
   - **Encryption**: Enable (Server-side encryption with Amazon S3 managed keys)
   - "Create bucket" click karo

---

## Step 2: Create IAM User for S3 Access

### Create IAM User:

1. **IAM Service Open Karo**
   - AWS Console mein "IAM" search karo
   - IAM Dashboard open karo

2. **Create User**
   - Left sidebar mein "Users" click karo
   - "Create user" button click karo
   - **User name**: `ca-document-system-s3-user`
   - "Next" click karo

3. **Set Permissions**
   - "Attach policies directly" select karo
   - Search bar mein "S3" type karo
   - ✅ **AmazonS3FullAccess** select karo (ya custom policy banao)
   - "Next" click karo
   - "Create user" click karo

4. **Create Access Keys**
   - User list mein apne user ko click karo
   - "Security credentials" tab open karo
   - "Create access key" button click karo
   - **Use case**: "Application running outside AWS" select karo
   - "Next" click karo
   - **Description**: "CA Document System S3 Access"
   - "Create access key" click karo
   - ⚠️ **IMPORTANT**: Access Key ID aur Secret Access Key ko save kar lo
   - Yeh keys sirf ek baar dikhenge!

---

## Step 3: Configure Environment Variables

Apne `.env` file mein yeh values add karo:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=your-ca-documents-bucket
```

**Replace karo:**
- `AWS_ACCESS_KEY_ID` - Step 2 se mila Access Key ID
- `AWS_SECRET_ACCESS_KEY` - Step 2 se mila Secret Access Key
- `AWS_S3_BUCKET_NAME` - Step 1 mein banaya bucket name

---

## Step 4: S3 Bucket Policy (Optional - For Better Security)

Agar aap specific permissions chahte ho, toh custom policy banao:

1. S3 Console mein apne bucket ko open karo
2. "Permissions" tab click karo
3. "Bucket policy" section mein "Edit" click karo
4. Yeh policy paste karo:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCADocumentSystemAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/ca-document-system-s3-user"
            },
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-ca-documents-bucket/*",
                "arn:aws:s3:::your-ca-documents-bucket"
            ]
        }
    ]
}
```

**Replace karo:**
- `YOUR_ACCOUNT_ID` - Apna AWS Account ID
- `your-ca-documents-bucket` - Apna bucket name

---

## Step 5: Test S3 Connection

Backend server start karo aur test karo:

```bash
cd backend
npm start
```

Document upload karke test karo - files S3 mein upload honi chahiye.

---

## Step 6: Monitor S3 Usage

### Check Storage:
1. S3 Console mein apne bucket ko open karo
2. "Metrics" tab click karo
3. Storage usage aur request metrics dekho

### Cost Monitoring:
1. AWS Console mein "Billing" search karo
2. "Cost Explorer" open karo
3. S3 costs track karo

---

## S3 Pricing (ap-south-1 Mumbai Region)

### Storage:
- **First 50 TB/month**: $0.023 per GB
- **Next 450 TB/month**: $0.022 per GB

### Requests:
- **PUT, COPY, POST, LIST**: $0.005 per 1,000 requests
- **GET, SELECT**: $0.0004 per 1,000 requests

### Data Transfer:
- **Upload to S3**: FREE
- **Download from S3**: First 100 GB/month FREE, then $0.109 per GB

### Example Cost:
- 1000 documents (10 MB each) = 10 GB storage
- Monthly cost: 10 GB × $0.023 = **$0.23/month**
- Bahut sasta! 🎉

---

## Benefits of S3 over Supabase

✅ **Cost Effective**: Pay only for what you use
✅ **Scalable**: Unlimited storage
✅ **Reliable**: 99.999999999% durability
✅ **Fast**: Low latency in India (ap-south-1)
✅ **Secure**: Encryption at rest and in transit
✅ **AWS Credits**: Use your company's AWS credits
✅ **Integration**: Easy integration with other AWS services

---

## Folder Structure in S3

Documents S3 mein is structure mein store honge:

```
your-ca-documents-bucket/
├── {clientId}/
│   ├── ITR/
│   │   ├── 2025-26/
│   │   │   └── 1234567890_document.pdf
│   │   └── 2024-25/
│   │       └── 1234567891_document.pdf
│   ├── GST-MAR/
│   │   └── 2025-26/
│   │       └── 1234567892_document.pdf
│   └── TDS/
│       └── 2025-26/
│           └── 1234567893_document.pdf
```

---

## Security Best Practices

1. ✅ **Never commit** AWS credentials to Git
2. ✅ **Use IAM roles** for EC2/Lambda if deploying on AWS
3. ✅ **Enable MFA** on your AWS account
4. ✅ **Rotate access keys** regularly (every 90 days)
5. ✅ **Enable CloudTrail** for audit logging
6. ✅ **Use presigned URLs** for temporary access (already implemented)
7. ✅ **Enable S3 versioning** for backup

---

## Troubleshooting

### Error: "Access Denied"
- Check IAM user permissions
- Verify bucket policy
- Confirm AWS credentials in .env file

### Error: "Bucket not found"
- Check bucket name spelling
- Verify region is correct
- Ensure bucket exists in your account

### Error: "Invalid credentials"
- Regenerate access keys
- Update .env file
- Restart server

---

## Migration from Supabase to S3

Agar aapke paas already Supabase mein documents hain:

1. **Backup**: Supabase se sab files download karo
2. **Upload to S3**: Script run karke S3 mein upload karo
3. **Update Database**: Document records mein S3 URLs update karo
4. **Test**: Verify all documents accessible hain
5. **Cleanup**: Supabase files delete karo

---

## Support

Agar koi problem ho toh:
- AWS Documentation: https://docs.aws.amazon.com/s3/
- AWS Support: https://console.aws.amazon.com/support/
- Stack Overflow: https://stackoverflow.com/questions/tagged/amazon-s3

---

## Next Steps

1. ✅ S3 bucket create karo
2. ✅ IAM user banao aur access keys generate karo
3. ✅ .env file update karo
4. ✅ Server restart karo
5. ✅ Document upload test karo
6. ✅ WhatsApp bot se document access test karo

**All set! 🚀 Aapka AWS S3 storage ready hai!**
