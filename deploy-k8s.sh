#!/bin/bash

# Deploy to Digital Ocean Kubernetes
# Usage: ./deploy-k8s.sh [tag]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="mcp-client"
DEPLOYMENT="mcp-client"
TAG="${1:-$(date +%Y%m%d-%H%M%S)}"

echo -e "${GREEN}🚀 Deploying to Digital Ocean Kubernetes${NC}"
echo -e "${YELLOW}Namespace: ${NAMESPACE}${NC}"
echo -e "${YELLOW}Deployment: ${DEPLOYMENT}${NC}"
echo -e "${YELLOW}Tag: ${TAG}${NC}"
echo ""

# Step 1: Build and push Docker image
echo -e "${YELLOW}📦 Step 1: Building and pushing Docker image...${NC}"
AUTO_PUSH=true ./build-docker.sh ${TAG} --auto-push

echo ""

# Step 2: Update deployment
echo -e "${YELLOW}🔄 Step 2: Rolling out new version to Kubernetes...${NC}"

# Get current image from deployment
CURRENT_IMAGE=$(kubectl get deployment ${DEPLOYMENT} -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "none")

echo -e "${BLUE}Current image: ${CURRENT_IMAGE}${NC}"
echo ""

# Update the image in deployment
# This triggers a rolling update
kubectl set image deployment/${DEPLOYMENT} \
  ${DEPLOYMENT}=registry.digitalocean.com/owlfortcontainerregistry/mcp-oauth-server:${TAG} \
  -n ${NAMESPACE}

echo -e "${GREEN}✅ Deployment updated${NC}"
echo ""

# Step 3: Watch rollout status
echo -e "${YELLOW}👀 Watching rollout status...${NC}"
kubectl rollout status deployment/${DEPLOYMENT} -n ${NAMESPACE} --timeout=5m

echo ""
echo -e "${GREEN}✅ Rollout complete!${NC}"
echo ""

# Step 4: Verify deployment
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
echo ""

# Show pod status
echo -e "${BLUE}Pods:${NC}"
kubectl get pods -n ${NAMESPACE} -l app=${DEPLOYMENT}

echo ""

# Show deployment status
echo -e "${BLUE}Deployment:${NC}"
kubectl get deployment ${DEPLOYMENT} -n ${NAMESPACE}

echo ""

# Show service and ingress
echo -e "${BLUE}Service:${NC}"
kubectl get service ${DEPLOYMENT} -n ${NAMESPACE}

echo ""

echo -e "${BLUE}Ingress:${NC}"
kubectl get ingress ${DEPLOYMENT} -n ${NAMESPACE}

echo ""

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
sleep 5

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://mcp-client.owlfort.io/api || echo "000")

if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "301" ] || [ "$RESPONSE" == "302" ]; then
    echo -e "${GREEN}✅ Server is responding correctly (HTTP $RESPONSE)${NC}"
else
    echo -e "${RED}⚠️  Warning: Server returned HTTP $RESPONSE${NC}"
    echo -e "${YELLOW}Check logs with: kubectl logs -n ${NAMESPACE} -l app=${DEPLOYMENT} --tail=50${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo -e "${GREEN}🌐 Visit: https://mcp-client.owlfort.io${NC}"
echo ""

# Useful commands
echo -e "${BLUE}📝 Useful commands:${NC}"
echo "  View logs:    kubectl logs -n ${NAMESPACE} -l app=${DEPLOYMENT} -f"
echo "  View pods:    kubectl get pods -n ${NAMESPACE}"
echo "  Describe pod: kubectl describe pod <pod-name> -n ${NAMESPACE}"
echo "  Shell into:   kubectl exec -it <pod-name> -n ${NAMESPACE} -- sh"
echo "  Rollback:     kubectl rollout undo deployment/${DEPLOYMENT} -n ${NAMESPACE}"
echo ""
