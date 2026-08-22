# 🚀 AWS EC2 Git Clone Deployment Guide (No Docker Required)

This guide walks you through deploying the **Smart CA Application** directly on an AWS EC2 instance using **Git**, **PM2**, **Nginx**, and **Certbot (Free SSL)**.

---

## 📋 Prerequisites
- An active AWS Account.
- A GitHub repository containing this codebase.
- A domain name (Optional, required for SSL/HTTPS).

---

## 1. Launch AWS EC2 Instance

1. Go to **AWS Console** → **EC2** → **Launch Instance**.
2. **Name**: `Smart-CA-Server`
3. **AMI**: `Ubuntu Server 22.04 LTS` (64-bit x86).
4. **Instance Type**: `t3.micro` (Free Tier) or `t3.small` (Recommended for production).
5. **Key Pair**: Select existing key pair or create new (`.pem`) file.
6. **Network & Security Groups**:
   - Check **Allow SSH traffic** (Port 22)
   - Check **Allow HTTP traffic** (Port 80)
   - Check **Allow HTTPS traffic** (Port 443)
7. Click **Launch Instance**.

---

## 2. Connect to EC2 & Clone GitHub Repository

1. Open your terminal on your computer and connect to EC2:
   ```bash
   chmod 400 your-key.pem
   ssh -i "your-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
   ```

2. Clone your repository from GitHub:
   ```bash
   git clone https://github.com/YOUR_USERNAME/smart-Ca-application.git
   cd smart-Ca-application
   ```

---

## 3. Create Production `.env` File

Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
nano .env
```

Paste your actual credentials:
```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ca-document-system?retryWrites=true&w=majority
AWS_ACCESS_KEY_ID=your_bedrock_key
AWS_SECRET_ACCESS_KEY=your_bedrock_secret
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-micro-v1:0
AWS_S3_BUCKET_NAME=your_s3_bucket_name
AWS_S3_REGION=us-east-1
PORT=3000
NODE_ENV=production
JWT_SECRET=your_super_secret_production_key_2026
NEXT_PUBLIC_API_URL=/api
```
*(Press `CTRL+O`, `ENTER` to save, and `CTRL+X` to exit nano)*

---

## 4. Run Automated EC2 Setup Script

Run the included `deploy-ec2.sh` script to install Node.js 20, PM2, Nginx, build Next.js, and start the app:

```bash
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```

---

## 5. Configure Nginx & SSL Certificate

### Step 5.1: Enable Nginx Reverse Proxy
```bash
# Copy Nginx configuration file
sudo cp nginx-ca-app.conf /etc/nginx/sites-available/smart-ca-app

# Enable the site configuration
sudo ln -s /etc/nginx/sites-available/smart-ca-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test & restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

Now open your browser and visit `http://<YOUR_EC2_PUBLIC_IP>`. Your Smart CA Portal is live! 🎉

---

### Step 5.2: Enable Free HTTPS/SSL (Optional)
If you pointed a domain (e.g. `ca.yourdomain.com`) to your EC2 Public IP:

```bash
sudo certbot --nginx -d ca.yourdomain.com
```
Certbot will issue a free SSL certificate and automatically update Nginx to force HTTPS!

---

## 🔄 Updating / Redeploying Code Future Upgrades

When you push new changes to GitHub, update your server in 1 minute with:

```bash
cd ~/smart-Ca-application
git pull origin main
npm install
npm run build
pm2 restart smart-ca-app
```

---

## 🛠️ Useful PM2 Commands

- View live application logs:
  ```bash
  pm2 logs smart-ca-app
  ```
- Check process status & memory usage:
  ```bash
  pm2 status
  ```
- Restart application:
  ```bash
  pm2 restart smart-ca-app
  ```
