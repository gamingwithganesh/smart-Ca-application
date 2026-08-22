#!/bin/bash

# ==============================================================================
# SMART CA APPLICATION - AWS EC2 AUTOMATED DEPLOYMENT SCRIPT
# ==============================================================================

set -e

echo "🚀 Starting Smart CA Application AWS EC2 Deployment Setup..."

# Update package list and install prerequisites
sudo apt-get update -y
sudo apt-get install -y curl git nginx ufw certbot python3-certbot-nginx

# Install Node.js 20.x if not already installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20.x LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 process manager globally
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installing PM2 globally..."
    sudo npm install -g pm2
fi

# Install app dependencies
echo "📥 Installing npm dependencies..."
npm install

# Build Next.js application for production
echo "🏗️ Building Next.js production bundle..."
npm run build

# Ensure PM2 starts app
echo "🔄 Starting application with PM2..."
pm2 start ecosystem.config.js --env production || pm2 restart smart-ca-app

# Save PM2 startup state so app restarts automatically on server reboot
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER || true
pm2 save

# Configure firewall
sudo ufw allow OpenSSH || true
sudo ufw allow 'Nginx Full' || true

echo "✅ Deployment completed successfully!"
echo "📍 Application running locally on port 3000 via PM2."
echo "🔗 Configure Nginx using nginx-ca-app.conf to map your domain!"
