#!/bin/bash

# Remote deployment script - Run from your local machine
# Usage: ./deploy-remote.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SERVER="mcp@mcp-client.owlfort.io"
APP_DIR="/home/mcp/simple-mcp-client"

echo -e "${GREEN}🚀 Starting remote deployment to mcp-client.owlfort.io${NC}"
echo ""

# Check if there are uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git status -s
    echo ""
    read -p "Do you want to commit and push? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}📝 Committing changes...${NC}"
        git add .
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
    else
        echo -e "${RED}❌ Deployment cancelled. Please commit your changes first.${NC}"
        exit 1
    fi
fi

# Push to repository
echo -e "${YELLOW}📤 Pushing to repository...${NC}"
git push origin main
echo -e "${GREEN}✅ Code pushed${NC}"
echo ""

# Deploy to server
echo -e "${YELLOW}🌐 Connecting to server and deploying...${NC}"
ssh -t $SERVER << 'ENDSSH'
    set -e

    echo "📂 Navigating to application directory..."
    cd /home/mcp/simple-mcp-client

    echo "🔄 Pulling latest code..."
    git pull origin main

    echo "📦 Installing dependencies..."
    npm install

    echo "🔨 Building application..."
    npm run build

    echo "🔄 Restarting PM2..."
    pm2 restart ecosystem.config.js --update-env
    pm2 save

    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "📊 Application Status:"
    pm2 status

    echo ""
    echo "Testing server..."
    sleep 2
ENDSSH

# Test the deployment from local machine
echo ""
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://mcp-client.owlfort.io/api)

if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "301" ] || [ "$RESPONSE" == "302" ]; then
    echo -e "${GREEN}✅ Server is responding correctly (HTTP $RESPONSE)${NC}"
else
    echo -e "${RED}⚠️  Warning: Server returned HTTP $RESPONSE${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${GREEN}🌐 Visit: https://mcp-client.owlfort.io${NC}"
echo ""
echo "📝 To view logs: ssh $SERVER 'pm2 logs mcp-server'"
echo "🔍 To monitor: ssh $SERVER 'pm2 monit'"
