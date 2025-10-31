#!/bin/bash

# Build and push Docker image to Digital Ocean Container Registry
# Usage: ./build-docker.sh [tag]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
REGISTRY="registry.digitalocean.com/owlfortcontainerregistry"
IMAGE_NAME="mcp-oauth-server"
TAG="${1:-latest}"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo -e "${GREEN}🐳 Building Docker image for Digital Ocean${NC}"
echo -e "${YELLOW}Registry: ${REGISTRY}${NC}"
echo -e "${YELLOW}Image: ${IMAGE_NAME}${NC}"
echo -e "${YELLOW}Tag: ${TAG}${NC}"
echo ""

# Build the image
echo -e "${YELLOW}📦 Building Docker image...${NC}"
docker build -t ${FULL_IMAGE} .

# Also tag as latest if specific tag provided
if [ "$TAG" != "latest" ]; then
    docker tag ${FULL_IMAGE} ${REGISTRY}/${IMAGE_NAME}:latest
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"
echo ""

# Push to registry
# Check if AUTO_PUSH is set (for CI/CD)
if [ "${AUTO_PUSH}" = "true" ] || [ "${2}" = "--auto-push" ]; then
    PUSH_CONFIRMED=true
else
    read -p "Push to Digital Ocean Registry? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        PUSH_CONFIRMED=true
    else
        PUSH_CONFIRMED=false
    fi
fi

if [ "$PUSH_CONFIRMED" = true ]; then
    echo -e "${YELLOW}📤 Pushing to Digital Ocean Container Registry...${NC}"

    # Login to Digital Ocean registry
    echo -e "${YELLOW}🔐 Logging in to Digital Ocean...${NC}"
    doctl registry login

    # Push image
    docker push ${FULL_IMAGE}

    # Push latest tag if different
    if [ "$TAG" != "latest" ]; then
        docker push ${REGISTRY}/${IMAGE_NAME}:latest
    fi

    echo -e "${GREEN}✅ Image pushed successfully${NC}"
    echo ""
    echo -e "${GREEN}📝 Image URL:${NC}"
    echo -e "${FULL_IMAGE}"

    # Show next steps
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Update k8s/deployment.yaml with the image URL"
    echo "2. Run: ./deploy-k8s.sh"
else
    echo -e "${YELLOW}⏭️  Skipping push to registry${NC}"
    echo ""
    echo -e "${YELLOW}To push manually later:${NC}"
    echo "  doctl registry login"
    echo "  docker push ${FULL_IMAGE}"
fi

echo ""
echo -e "${GREEN}✨ Done!${NC}"
