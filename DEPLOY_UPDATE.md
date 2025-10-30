# Quick Deployment Update - mcp-client.owlfort.io

This guide is for updating the **existing** deployment at mcp-client.owlfort.io with the new OAuth features.

## 🚀 Quick Deploy (5 minutes)

### Step 1: Push Your Code

```bash
git add .
git commit -m "feat: add dynamic OAuth registration and automation scripts"
git push origin main
```

### Step 2: SSH to Server

```bash
ssh mcp@mcp-client.owlfort.io
# or
ssh root@YOUR_DROPLET_IP
```

### Step 3: Run Deployment Script

```bash
cd /home/mcp/simple-mcp-client
./deploy.sh
```

That's it! The script will:
- ✅ Pull latest code
- ✅ Install dependencies
- ✅ Build TypeScript
- ✅ Restart PM2
- ✅ Test the deployment

---

## 📋 Manual Deployment (if script fails)

### 1. Navigate to app directory

```bash
cd /home/mcp/simple-mcp-client
```

### 2. Pull latest code

```bash
git pull origin main
```

### 3. Install dependencies

```bash
npm install
```

### 4: Build application

```bash
npm run build
```

### 5. Restart PM2

```bash
pm2 restart ecosystem.config.js
pm2 save
```

### 6. Check status

```bash
pm2 status
pm2 logs mcp-server --lines 50
```

---

## 🔧 First-Time Setup (if not already deployed)

If this is your first deployment on this server:

### 1. Install PM2 globally

```bash
sudo npm install -g pm2
```

### 2. Clone repository

```bash
cd /home/mcp
git clone YOUR_REPO_URL simple-mcp-client
cd simple-mcp-client
```

### 3. Install dependencies and build

```bash
npm install
npm run build
```

### 4. Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions it gives you
```

### 5. Configure Nginx

Copy the nginx.conf file:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/mcp-server
sudo ln -s /etc/nginx/sites-available/mcp-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL (if not already done)

```bash
sudo certbot --nginx -d mcp-client.owlfort.io
```

---

## 🧪 Testing the Deployment

### Test API Endpoint

```bash
curl https://mcp-client.owlfort.io/api
```

### Test OAuth Registration

```bash
curl -k -X POST https://mcp-client.owlfort.io/mcp/oauth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "registrationUrl": "https://mcp.asana.com/register",
    "redirectUris": ["https://mcp-client.owlfort.io/oauth/callback"],
    "clientName": "MCP Client Production"
  }'
```

### Test OAuth Web Interface

Visit: https://mcp-client.owlfort.io/oauth-mcp.html

---

## 🔍 Monitoring & Debugging

### View Application Logs

```bash
pm2 logs mcp-server
pm2 logs mcp-server --lines 100
```

### View Real-time Monitoring

```bash
pm2 monit
```

### View Nginx Logs

```bash
sudo tail -f /var/log/nginx/mcp-client.access.log
sudo tail -f /var/log/nginx/mcp-client.error.log
```

### Check Application Status

```bash
pm2 status
pm2 describe mcp-server
```

### Restart Application

```bash
pm2 restart mcp-server
```

---

## 🔐 Update OAuth Redirect URIs

After deployment, you need to update OAuth configurations:

### In Your Scripts

Update `scripts/mcp-oauth.ts` line 28:

```typescript
const API_SERVER = process.env.API_SERVER || 'https://mcp-client.owlfort.io';
```

### In HTML Helpers

Update `public/oauth-mcp.html` to use production URL:

```javascript
const apiServer = 'https://mcp-client.owlfort.io';
```

### In Environment Variables

Create `/home/mcp/simple-mcp-client/.env.production`:

```env
NODE_ENV=production
PORT=3000
SSL_ENABLED=false
API_SERVER=https://mcp-client.owlfort.io
```

---

## 📊 Performance Optimization

### Enable Nginx Caching

Add to nginx.conf inside server block:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Enable Gzip Compression

Add to nginx.conf:

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1000;
```

Then reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🚨 Rollback Procedure

If deployment fails:

### 1. Check previous commit

```bash
git log --oneline -5
```

### 2. Rollback to previous version

```bash
git checkout PREVIOUS_COMMIT_HASH
npm install
npm run build
pm2 restart mcp-server
```

### 3. Return to latest after fixing

```bash
git checkout main
git pull
./deploy.sh
```

---

## 📝 Environment-Specific Configuration

### Production OAuth Redirect URIs

When registering OAuth clients in production, use:

```json
{
  "redirectUris": [
    "https://mcp-client.owlfort.io/oauth/callback",
    "https://mcp-client.owlfort.io/oauth/callback/debug"
  ]
}
```

### Update npm Scripts for Production

In package.json, you can add:

```json
{
  "scripts": {
    "deploy": "npm run build && pm2 restart ecosystem.config.js",
    "logs": "pm2 logs mcp-server",
    "status": "pm2 status"
  }
}
```

---

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] Application is running: `pm2 status`
- [ ] HTTPS is working: `curl https://mcp-client.owlfort.io/api`
- [ ] Swagger docs accessible: https://mcp-client.owlfort.io/api
- [ ] OAuth registration works: Test `/mcp/oauth/register`
- [ ] OAuth authorization works: Test `/mcp/oauth/authorize-url`
- [ ] OAuth web interface loads: https://mcp-client.owlfort.io/oauth-mcp.html
- [ ] No errors in logs: `pm2 logs mcp-server --lines 50`
- [ ] SSL certificate valid: `sudo certbot certificates`
- [ ] Nginx running: `sudo systemctl status nginx`

---

## 🆘 Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs mcp-server --err --lines 50

# Check if port is in use
sudo lsof -i :3000

# Restart PM2
pm2 restart mcp-server
```

### 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Check nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew if expired
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### "Cannot find module" errors

```bash
# Reinstall dependencies
cd /home/mcp/simple-mcp-client
rm -rf node_modules package-lock.json
npm install
npm run build
pm2 restart mcp-server
```

---

## 📞 Support

If issues persist:

1. Check logs: `pm2 logs mcp-server`
2. Check nginx: `sudo tail -f /var/log/nginx/error.log`
3. Verify DNS: `dig mcp-client.owlfort.io`
4. Test connectivity: `curl -I https://mcp-client.owlfort.io`

---

## 🎯 Quick Commands Reference

```bash
# Deploy
./deploy.sh

# View logs
pm2 logs mcp-server

# Monitor
pm2 monit

# Restart
pm2 restart mcp-server

# Status
pm2 status

# Stop
pm2 stop mcp-server

# Reload nginx
sudo systemctl reload nginx

# View nginx logs
sudo tail -f /var/log/nginx/mcp-client.access.log
```
