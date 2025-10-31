# MCP OAuth Quick Reference

Quick reference for the MCP OAuth flow API calls using `https://mcp-client.owlfort.io`.

## Complete Flow in 4 Steps

### Step 1: Register OAuth Client

```bash
curl -X POST https://mcp-client.owlfort.io/mcp/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "registrationUrl": "https://mcp.asana.com/register",
    "redirectUris": ["http://localhost:3000/oauth/callback"],
    "clientName": "My MCP Client",
    "clientUri": "https://github.com/your-org/your-app"
  }'
```

**Save from response:** `client_id`

---

### Step 2: Generate Authorization URL

```bash
curl -X POST https://mcp-client.owlfort.io/mcp/oauth/authorize-url \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "YOUR_CLIENT_ID",
    "redirectUri": "http://localhost:3000/oauth/callback",
    "serverUrl": "https://mcp.asana.com"
  }'
```

**Save from response:** `authorizationUrl`, `codeVerifier`

---

### Step 3: User Authorization

1. Open `authorizationUrl` in browser
2. User authorizes the application
3. Browser redirects to: `http://localhost:3000/oauth/callback?code=AUTH_CODE&state=...`
4. Extract `code` from URL

---

### Step 4: Exchange Code for Token

```bash
curl -X POST https://mcp-client.owlfort.io/mcp/oauth/exchange-token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AUTH_CODE_FROM_STEP_3",
    "codeVerifier": "CODE_VERIFIER_FROM_STEP_2",
    "clientId": "CLIENT_ID_FROM_STEP_1",
    "redirectUri": "http://localhost:3000/oauth/callback",
    "serverUrl": "https://mcp.asana.com"
  }'
```

**Save from response:** `access_token`

---

## Using the Access Token

### Fetch Available Tools

```bash
curl -X POST https://mcp-client.owlfort.io/mcp/tools-remote \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_ACCESS_TOKEN"
  }'
```

**Response:**
```json
{
  "tools": [
    {
      "name": "asana_get_workspaces",
      "description": "Get all workspaces",
      "inputSchema": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  ]
}
```

---

### Call a Tool

```bash
curl -X POST https://mcp-client.owlfort.io/mcp/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_ACCESS_TOKEN",
    "toolName": "asana_get_workspaces",
    "arguments": {}
  }'
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "..."
    }
  ]
}
```

---

## One-Liner Examples

### All steps in sequence (bash)

```bash
# Step 1: Register
CLIENT_ID=$(curl -s -X POST https://mcp-client.owlfort.io/mcp/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"registrationUrl":"https://mcp.asana.com/register","redirectUris":["http://localhost:3000/oauth/callback"],"clientName":"CLI Client"}' \
  | jq -r '.client_id')

# Step 2: Get auth URL
AUTH_RESPONSE=$(curl -s -X POST https://mcp-client.owlfort.io/mcp/oauth/authorize-url \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"redirectUri\":\"http://localhost:3000/oauth/callback\",\"serverUrl\":\"https://mcp.asana.com\"}")

AUTH_URL=$(echo $AUTH_RESPONSE | jq -r '.authorizationUrl')
CODE_VERIFIER=$(echo $AUTH_RESPONSE | jq -r '.codeVerifier')

echo "Open this URL: $AUTH_URL"
echo "After authorization, paste the redirect URL:"
read REDIRECT_URL

# Step 3: Extract code
CODE=$(echo $REDIRECT_URL | grep -oP 'code=\K[^&]+')

# Step 4: Exchange for token
TOKEN=$(curl -s -X POST https://mcp-client.owlfort.io/mcp/oauth/exchange-token \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"codeVerifier\":\"$CODE_VERIFIER\",\"clientId\":\"$CLIENT_ID\",\"redirectUri\":\"http://localhost:3000/oauth/callback\",\"serverUrl\":\"https://mcp.asana.com\"}" \
  | jq -r '.access_token')

echo "Access Token: $TOKEN"

# Fetch tools
curl -s -X POST https://mcp-client.owlfort.io/mcp/tools-remote \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://mcp.asana.com/sse\",\"type\":\"sse\",\"token\":\"$TOKEN\"}" \
  | jq .
```

---

## Environment Variables

```bash
export API_SERVER=https://mcp-client.owlfort.io
export MCP_SERVER=https://mcp.asana.com
export CLIENT_NAME="My MCP Client"
export REDIRECT_URI=http://localhost:3000/oauth/callback
```

---

## Common MCP Servers

| Server | URL |
|--------|-----|
| Asana MCP | `https://mcp.asana.com` |
| Your custom server | Update as needed |

---

## Response Formats

### Registration Response
```json
{
  "client_id": "ikOptM5Alt3QmQ6q",
  "client_name": "My MCP Client",
  "redirect_uris": ["http://localhost:3000/oauth/callback"],
  "token_endpoint_auth_method": "none"
}
```

### Authorization URL Response
```json
{
  "authorizationUrl": "https://mcp.asana.com/authorize?response_type=code&client_id=...",
  "codeVerifier": "K2A0Lu1~CHX.saE8M5y..."
}
```

### Token Response
```json
{
  "access_token": "1/abc123...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "1/def456..."
}
```

### Tools Response
```json
{
  "tools": [
    {
      "name": "tool_name",
      "description": "Tool description",
      "inputSchema": {
        "type": "object",
        "properties": {
          "param1": { "type": "string", "description": "..." }
        },
        "required": ["param1"]
      }
    }
  ]
}
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Client not found" | Use client_id from registration step |
| "Invalid redirect_uri" | Exact match required (including trailing slash) |
| "Invalid code_verifier" | Use same verifier from authorize-url step |
| "Token expired" | Request new token or use refresh_token |

---

## See Also

- Full documentation: [scripts/README.md](README.md)
- OAuth guide: [../MCP_OAUTH_GUIDE.md](../MCP_OAUTH_GUIDE.md)
- Demo scripts: Run `npm run oauth-demo`
