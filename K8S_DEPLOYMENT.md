# Kubernetes Deployment Guide - Digital Ocean

Deploy MCP OAuth Server to Digital Ocean Kubernetes cluster in the `mcp-client` namespace.

## 🚀 Quick Deploy (Replace Existing)

```bash
./deploy-k8s.sh
```

This will:
1. Build Docker image with timestamp tag
2. Push to Digital Ocean Container Registry
3. Update existing K8s deployment
4. Roll out new version with zero downtime
5. Verify deployment

---

## 📋 Prerequisites

### 1. Install Tools

```bash
# Install doctl (Digital Ocean CLI)
brew install doctl

# Install kubectl
brew install kubectl

# Verify installations
doctl version
kubectl version --client
```

### 2. Authenticate with Digital Ocean

```bash
# Login to Digital Ocean
doctl auth init

# Login to Container Registry
doctl registry login
```

### 3. Connect to K8s Cluster

```bash
# List your clusters
doctl kubernetes cluster list

# Get kubeconfig (connect kubectl to your cluster)
doctl kubernetes cluster kubeconfig save YOUR_CLUSTER_ID

# Verify connection
kubectl get nodes
kubectl get namespaces
```

---

## 🐳 Docker Registry Setup

### Get Your Registry Name

```bash
# List registries
doctl registry get

# Output will show your registry name, e.g.:
# Name: my-registry
# Endpoint: registry.digitalocean.com/my-registry
```

### Update Scripts with Registry Name

Edit these files and replace `YOUR_REGISTRY`:

1. **k8s/deployment.yaml** (line 23)
```yaml
image: registry.digitalocean.com/YOUR_REGISTRY/mcp-oauth-server:latest
```

2. **build-docker.sh** (line 11)
```bash
REGISTRY="registry.digitalocean.com/YOUR_REGISTRY"
```

3. **deploy-k8s.sh** (line 45)
```bash
kubectl set image deployment/${DEPLOYMENT} \
  ${DEPLOYMENT}=registry.digitalocean.com/YOUR_REGISTRY/mcp-oauth-server:${TAG} \
  -n ${NAMESPACE}
```

---

## 📦 Manual Deployment Steps

### Step 1: Build Docker Image

```bash
# Build with specific tag
./build-docker.sh v1.0.0

# Or build with timestamp tag
./build-docker.sh $(date +%Y%m%d-%H%M%S)
```

### Step 2: Verify Image in Registry

```bash
# List images in registry
doctl registry repository list-tags mcp-oauth-server
```

### Step 3: Deploy to Kubernetes

Since you have an **existing cluster**, just update the deployment:

```bash
# Update the image (triggers rolling update)
kubectl set image deployment/mcp-oauth-server \
  mcp-oauth-server=registry.digitalocean.com/YOUR_REGISTRY/mcp-oauth-server:v1.0.0 \
  -n mcp-client

# Watch the rollout
kubectl rollout status deployment/mcp-oauth-server -n mcp-client
```

---

## 🔄 Rolling Update Process

Kubernetes will perform a zero-downtime rolling update:

1. Creates new pod with new image
2. Waits for new pod to be ready
3. Terminates old pod
4. Repeats for all replicas

```bash
# Watch pods during update
kubectl get pods -n mcp-client -w

# Check rollout history
kubectl rollout history deployment/mcp-oauth-server -n mcp-client
```

---

## 🔍 Verification & Monitoring

### Check Deployment Status

```bash
# View all resources
kubectl get all -n mcp-client

# View deployment
kubectl get deployment mcp-oauth-server -n mcp-client

# View pods
kubectl get pods -n mcp-client -l app=mcp-oauth-server

# View service
kubectl get service mcp-oauth-server -n mcp-client

# View ingress
kubectl get ingress mcp-oauth-server -n mcp-client
```

### View Logs

```bash
# Tail logs from all pods
kubectl logs -n mcp-client -l app=mcp-oauth-server -f

# Logs from specific pod
kubectl logs -n mcp-client <pod-name> -f

# Previous logs (if pod crashed)
kubectl logs -n mcp-client <pod-name> --previous
```

### Debug Pod Issues

```bash
# Describe pod (shows events)
kubectl describe pod <pod-name> -n mcp-client

# Get shell in running pod
kubectl exec -it <pod-name> -n mcp-client -- sh

# Port forward to test locally
kubectl port-forward <pod-name> 3000:3000 -n mcp-client
```

---

## 🆘 Troubleshooting

### Image Pull Errors

```bash
# Error: ImagePullBackOff or ErrImagePull

# 1. Verify registry authentication
doctl registry login

# 2. Create/update image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=registry.digitalocean.com \
  --docker-username=$(doctl registry docker-config | jq -r '.auths."registry.digitalocean.com".username') \
  --docker-password=$(doctl registry docker-config | jq -r '.auths."registry.digitalocean.com".password') \
  -n mcp-client

# 3. Update deployment to use secret (if not already)
# Add to k8s/deployment.yaml under spec.template.spec:
#   imagePullSecrets:
#   - name: regcred
```

### Pod CrashLoopBackOff

```bash
# View logs to see error
kubectl logs <pod-name> -n mcp-client --previous

# Common causes:
# - Missing environment variables
# - Port conflict
# - Application error
# - Health check failing too early
```

### Rollback Deployment

```bash
# Rollback to previous version
kubectl rollout undo deployment/mcp-oauth-server -n mcp-client

# Rollback to specific revision
kubectl rollout undo deployment/mcp-oauth-server -n mcp-client --to-revision=2

# View rollout history
kubectl rollout history deployment/mcp-oauth-server -n mcp-client
```

### Check Health Checks

```bash
# Exec into pod and test health endpoint
kubectl exec -it <pod-name> -n mcp-client -- wget -O- http://localhost:3000/api
```

---

## 🔧 Configuration Updates

### Update Environment Variables

Edit `k8s/deployment.yaml` and update the `env` section:

```yaml
env:
- name: NODE_ENV
  value: "production"
- name: API_SERVER
  value: "https://mcp-client.owlfort.io"
```

Then apply:

```bash
kubectl apply -f k8s/deployment.yaml
```

### Scale Deployment

```bash
# Scale to 3 replicas
kubectl scale deployment/mcp-oauth-server --replicas=3 -n mcp-client

# Or edit deployment.yaml and apply
```

---

## 📊 Monitoring

### Resource Usage

```bash
# View resource usage
kubectl top pods -n mcp-client
kubectl top nodes

# View events
kubectl get events -n mcp-client --sort-by='.lastTimestamp'
```

### Application Metrics

```bash
# Test API endpoint
curl https://mcp-client.owlfort.io/api

# Test OAuth endpoints
curl https://mcp-client.owlfort.io/mcp/oauth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"registrationUrl": "https://mcp.asana.com/register", "redirectUris": ["https://mcp-client.owlfort.io/oauth/callback"]}'
```

---

## 🗑️ Cleanup (If Needed)

```bash
# Delete deployment only (keeps namespace)
kubectl delete deployment mcp-oauth-server -n mcp-client

# Delete all resources
kubectl delete -f k8s/ -n mcp-client

# Delete namespace (deletes everything in it)
kubectl delete namespace mcp-client
```

---

## 📝 Quick Reference

### Common Commands

```bash
# Deploy
./deploy-k8s.sh

# View logs
kubectl logs -n mcp-client -l app=mcp-oauth-server -f

# Restart deployment
kubectl rollout restart deployment/mcp-oauth-server -n mcp-client

# Scale up/down
kubectl scale deployment/mcp-oauth-server --replicas=3 -n mcp-client

# Get shell
kubectl exec -it <pod-name> -n mcp-client -- sh

# Port forward
kubectl port-forward service/mcp-oauth-server 3000:80 -n mcp-client

# Rollback
kubectl rollout undo deployment/mcp-oauth-server -n mcp-client
```

### Build & Push Only

```bash
# Build and push new image
./build-docker.sh v1.0.1
```

### Manual Image Update

```bash
kubectl set image deployment/mcp-oauth-server \
  mcp-oauth-server=registry.digitalocean.com/YOUR_REGISTRY/mcp-oauth-server:NEW_TAG \
  -n mcp-client
```

---

## 🎯 Next Steps After Deployment

1. ✅ Verify application is running: `kubectl get pods -n mcp-client`
2. ✅ Test API endpoint: `curl https://mcp-client.owlfort.io/api`
3. ✅ Test OAuth flow: Visit `https://mcp-client.owlfort.io/oauth-mcp.html`
4. ✅ Monitor logs: `kubectl logs -n mcp-client -l app=mcp-oauth-server -f`
5. ✅ Set up monitoring/alerts (optional)

---

## 🔗 Resources

- [Digital Ocean Kubernetes Documentation](https://docs.digitalocean.com/products/kubernetes/)
- [doctl CLI Reference](https://docs.digitalocean.com/reference/doctl/)
- [Kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Digital Ocean Container Registry](https://docs.digitalocean.com/products/container-registry/)
