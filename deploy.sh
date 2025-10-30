#!/bin/bash

# Deployment script for mcp-client.owlfort.io
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/home/mcp/simple-mcp-client"
BRANCH="main"

echo "${YELLOW}📦 Step 1: Pulling latest code...${NC}"
cd $APP_DIR
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

echo "${YELLOW}📦 Step 2: Installing dependencies...${NC}"
npm install --production=false

echo "${YELLOW}🔨 Step 3: Building application...${NC}"
npm run build

echo "${YELLOW}🔄 Step 4: Restarting PM2...${NC}"
pm2 restart ecosystem.config.js --update-env
pm2 save

echo "${YELLOW}🧹 Step 5: Cleaning up...${NC}"
# Remove old build artifacts if needed
# npm prune --production

echo "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Application Status:"
pm2 status

echo ""
echo "📝 View logs with: pm2 logs mcp-server"
echo "🔍 Monitor with: pm2 monit"
echo ""

# Optional: Test the deployment
echo "${YELLOW}🧪 Testing deployment...${NC}"
sleep 2
RESPONSE=$(curl -k -s -o /dev/null -w "%{http_code}" https://mcp-client.owlfort.io/api)

if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "301" ] || [ "$RESPONSE" == "302" ]; then
    echo "${GREEN}✅ Server is responding correctly (HTTP $RESPONSE)${NC}"
else
    echo "${RED}⚠️  Warning: Server returned HTTP $RESPONSE${NC}"
    echo "Check logs with: pm2 logs mcp-server"
fi

echo ""
echo "${GREEN}🎉 Deployment successful!${NC}"
echo "Visit: https://mcp-client.owlfort.io"
