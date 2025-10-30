# Deployment Guide - Digital Ocean

This guide walks you through deploying the MCP OAuth server to Digital Ocean.

## 📋 Prerequisites

- Digital Ocean account
- Domain name (optional but recommended)
- GitHub repository with your code

## 🚀 Quick Deploy

### Option 1: Using Digital Ocean App Platform (Easiest)

The simplest way to deploy - fully managed, auto-scaling, SSL included.

#### Step 1: Prepare Your App

1. **Create `app.yaml` in your repository root** (already created for you)

2. **Set environment variables** in Digital Ocean dashboard:
   ```
   NODE_ENV=production
   PORT=8080
   SSL_ENABLED=false  # App Platform handles SSL
   ```

#### Step 2: Deploy

1. Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. Digital Ocean will auto-detect settings from `app.yaml`
5. Review and deploy!

**Cost:** ~$12/month for basic plan

---

### Option 2: Using a Droplet (More Control)

For full control over the server environment.

## 📦 Step-by-Step Droplet Deployment

### Step 1: Create a Droplet

1. Go to Digital Ocean → Droplets → Create
2. **Choose an image:** Ubuntu 22.04 LTS
3. **Choose a plan:** Basic, $6/month (1GB RAM)
4. **Choose a datacenter region:** Nearest to your users
5. **Authentication:** SSH keys (recommended)
6. Click "Create Droplet"

### Step 2: Initial Server Setup

SSH into your droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Create a non-root user:

```bash
adduser mcp
usermod -aG sudo mcp
su - mcp
```

### Step 3: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
sudo apt install -y build-essential

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Step 4: Clone and Setup Application

```bash
# Clone your repository
cd /home/mcp
git clone https://github.com/YOUR_USERNAME/simple-mcp-client.git
cd simple-mcp-client

# Install dependencies
npm install

# Build the application
npm run build
```

### Step 5: Configure Environment Variables

Create production environment file:

```bash
nano .env.production
```

Add:

```env
NODE_ENV=production
PORT=3000
SSL_ENABLED=false  # Nginx will handle SSL
API_SERVER=https://yourdomain.com
```

### Step 6: Setup PM2

Start the application with PM2:

```bash
pm2 start dist/src/main.js --name mcp-server
pm2 save
pm2 startup
```

Copy the command PM2 gives you and run it.

### Step 7: Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/mcp-server
```

Paste the configuration (see `nginx.conf` file created for you).

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/mcp-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Setup SSL with Let's Encrypt

**If you have a domain:**

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically:
- Obtain SSL certificates
- Configure Nginx for HTTPS
- Set up auto-renewal

**Test auto-renewal:**

```bash
sudo certbot renew --dry-run
```

### Step 9: Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 🔒 Security Hardening

### 1. Setup Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Configure Automatic Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 3. Setup Monitoring

```bash
# Install monitoring agent
pm2 install pm2-logrotate

# View logs
pm2 logs mcp-server
```

## 🔄 Deployment Updates

### Manual Updates

```bash
cd /home/mcp/simple-mcp-client
git pull origin main
npm install
npm run build
pm2 restart mcp-server
```

### Automated Deployments with GitHub Actions

See `.github/workflows/deploy.yml` (created for you).

## 📊 Monitoring

### View Application Logs

```bash
pm2 logs mcp-server
pm2 monit
```

### View Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🌐 DNS Setup

Point your domain to the droplet:

1. Go to your domain registrar
2. Add an A record:
   - **Type:** A
   - **Name:** @ (or subdomain)
   - **Value:** YOUR_DROPLET_IP
   - **TTL:** 3600

3. Add CNAME for www (optional):
   - **Type:** CNAME
   - **Name:** www
   - **Value:** yourdomain.com
   - **TTL:** 3600

## 🔧 Environment Variables

### Required Variables

```env
NODE_ENV=production
PORT=3000
API_SERVER=https://yourdomain.com
```

### Optional Variables

```env
SSL_ENABLED=false  # Nginx handles SSL
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

## 🐛 Troubleshooting

### Application won't start

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs mcp-server --lines 100

# Restart application
pm2 restart mcp-server
```

### Nginx errors

```bash
# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### SSL certificate issues

```bash
# Test certificate
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check auto-renewal timer
sudo systemctl status certbot.timer
```

## 💰 Cost Estimates

### App Platform (Managed)
- **Basic Plan:** $12/month
- Includes: SSL, auto-scaling, monitoring
- Best for: Quick deployment, less maintenance

### Droplet (Self-Managed)
- **Basic Droplet:** $6/month
- **Domain:** ~$12/year
- Total: ~$7/month
- Best for: Full control, learning

## 📚 Additional Resources

- [Digital Ocean Documentation](https://docs.digitalocean.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## 🎯 Post-Deployment Checklist

- [ ] Application accessible via HTTPS
- [ ] SSL certificate valid
- [ ] PM2 auto-restart enabled
- [ ] Firewall configured
- [ ] Monitoring setup
- [ ] Automatic updates enabled
- [ ] Backup strategy in place
- [ ] DNS properly configured
- [ ] OAuth callback URLs updated in MCP registration
- [ ] Test OAuth flow end-to-end

## 🔄 Backup Strategy

### Database Backups (if using)

```bash
# Create backup script
nano ~/backup.sh
```

### Application Backups

```bash
# Backup application directory
tar -czf backup-$(date +%Y%m%d).tar.gz /home/mcp/simple-mcp-client
```

### Automated Backups

Use Digital Ocean's automated backups:
- Droplet Settings → Backups → Enable
- Cost: 20% of droplet price (~$1.20/month for $6 droplet)

## 🆘 Support

If you encounter issues:
1. Check application logs: `pm2 logs mcp-server`
2. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify DNS: `dig yourdomain.com`
4. Test SSL: `curl -I https://yourdomain.com`
5. Check firewall: `sudo ufw status`

## 🚀 Next Steps

After deployment:
1. Update OAuth redirect URIs to use your domain
2. Test the OAuth flow
3. Monitor application performance
4. Set up monitoring alerts
5. Configure backups
