#!/bin/bash

# Deployment script for mcp-client.owlfort.io
# Usage: ./deploy.sh
#
# Can be run:
# - On the server directly (after SSH)
# - From local machine (will SSH and deploy)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER="mcp@mcp-client.owlfort.io"
SERVER_APP_DIR="/home/mcp/simple-mcp-client"
LOCAL_APP_DIR="$(pwd)"
BRANCH="main"

# Detect if we're running on the server or locally
if [ -d "$SERVER_APP_DIR" ] && [ "$(hostname)" != "$(hostname -s)" ]; then
    # Running on server
    IS_LOCAL=false
    APP_DIR="$SERVER_APP_DIR"
else
    # Running locally
    IS_LOCAL=true
    APP_DIR="$LOCAL_APP_DIR"
fi

echo -e "${GREEN}🚀 Starting deployment...${NC}"
echo ""

if [ "$IS_LOCAL" = true ]; then
    echo -e "${BLUE}📍 Detected: Running locally${NC}"
    echo -e "${BLUE}🌐 Will deploy to: $SERVER${NC}"
    echo ""

    # Check for uncommitted changes
    if [[ -n $(git status -s) ]]; then
        echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
        git status -s
        echo ""
        read -p "Commit and push changes? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            read -p "Enter commit message: " commit_msg
            git commit -m "$commit_msg"
            echo -e "${GREEN}✅ Changes committed${NC}"
        else
            echo -e "${YELLOW}⚠️  Deploying without local changes...${NC}"
        fi
    fi

    # Push to repository
    echo -e "${YELLOW}📤 Pushing to repository...${NC}"
    git push origin $BRANCH
    echo -e "${GREEN}✅ Code pushed${NC}"
    echo ""

    # Deploy to server via SSH
    echo -e "${YELLOW}🌐 Connecting to server and deploying...${NC}"
    ssh -t $SERVER "cd $SERVER_APP_DIR && ./deploy.sh"

    # Test from local
    echo ""
    echo -e "${YELLOW}🧪 Testing deployment...${NC}"
    sleep 2
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://mcp-client.owlfort.io/api)

    if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "301" ] || [ "$RESPONSE" == "302" ]; then
        echo -e "${GREEN}✅ Server is responding correctly (HTTP $RESPONSE)${NC}"
    else
        echo -e "${RED}⚠️  Warning: Server returned HTTP $RESPONSE${NC}"
    fi

    echo ""
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
    echo -e "${GREEN}🌐 Visit: https://mcp-client.owlfort.io${NC}"

    exit 0
fi

# Running on server - do actual deployment
echo -e "${BLUE}📍 Detected: Running on server${NC}"
echo ""

echo -e "${YELLOW}📦 Step 1: Pulling latest code...${NC}"
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
