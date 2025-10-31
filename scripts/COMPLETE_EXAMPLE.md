# Complete MCP OAuth Flow Example with Tool Fetching

This document shows a **complete end-to-end example** of the MCP OAuth flow, including token exchange and fetching tools.

## Full Flow with Real API Calls

### Step 1: Register OAuth Client

**Request:**
```bash
curl -X POST https://mcp-client.owlfort.io/mcp/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "registrationUrl": "https://mcp.asana.com/register",
    "redirectUris": ["http://localhost:3000/oauth/callback"],
    "clientName": "Demo MCP Client",
    "clientUri": "https://github.com/your-org/simple-mcp-client"
  }'
```

**Response Example:**
```json
{
  "client_id": "xhkJa4g91o2QXcGf",
  "client_name": "Demo MCP Client",
  "redirect_uris": ["http://localhost:3000/oauth/callback"],
  "token_endpoint_auth_method": "none",
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "client_id_issued_at": 1730369124
}
```

✅ **Save:** `client_id = xhkJa4g91o2QXcGf`

---

### Step 2: Generate Authorization URL

**Request:**
```bash
curl -X POST https://mcp-client.owlfort.io/mcp/oauth/authorize-url \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "xhkJa4g91o2QXcGf",
    "redirectUri": "http://localhost:3000/oauth/callback",
    "serverUrl": "https://mcp.asana.com"
  }'
```

**Response Example:**
```json
{
  "authorizationUrl": "https://mcp.asana.com/authorize?response_type=code&client_id=xhkJa4g91o2QXcGf&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth%2Fcallback&state=abc123&code_challenge=xyz789&code_challenge_method=S256",
  "codeVerifier": "K2A0Lu1~CHX.saE8M5yH3PnR4vW7ZqBtCuD0FmGfJkLxNo"
}
```

✅ **Save:**
- `authorizationUrl` (to open in browser)
- `codeVerifier = K2A0Lu1~CHX.saE8M5yH3PnR4vW7ZqBtCuD0FmGfJkLxNo`

---

### Step 3: User Authorization

**Action:** Open the `authorizationUrl` in your browser.

**Browser Flow:**
1. User sees Asana authorization page
2. User clicks "Allow" to authorize the application
3. Browser redirects to:
   ```
   http://localhost:3000/oauth/callback?code=1/abc123def456ghi789&state=abc123
   ```

✅ **Save:** `code = 1/abc123def456ghi789`

---

### Step 4: Exchange Authorization Code for Access Token

**Request:**
```bash
curl -X POST https://mcp-client.owlfort.io/mcp/oauth/exchange-token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "1/abc123def456ghi789",
    "codeVerifier": "K2A0Lu1~CHX.saE8M5yH3PnR4vW7ZqBtCuD0FmGfJkLxNo",
    "clientId": "xhkJa4g91o2QXcGf",
    "redirectUri": "http://localhost:3000/oauth/callback",
    "serverUrl": "https://mcp.asana.com"
  }'
```

**Response Example:**
```json
{
  "access_token": "1/1234567890:abc123def456:xyz789ghi012jkl345mno678pqr901stu234",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "1/refresh_abc123def456ghi789jkl012mno345",
  "data": {
    "id": "1234567890",
    "gid": "1234567890",
    "name": "Demo MCP Client",
    "email": "user@example.com"
  }
}
```

✅ **Save:** `access_token = 1/1234567890:abc123def456:xyz789ghi012jkl345mno678pqr901stu234`

---

### Step 5: Fetch Available Tools

**Request:**
```bash
curl -X POST https://mcp-client.owlfort.io/mcp/tools-remote \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "1/1234567890:abc123def456:xyz789ghi012jkl345mno678pqr901stu234"
  }'
```

**Response Example:**
```json
{
  "tools": [
    {
      "name": "asana_get_workspaces",
      "description": "Get all workspaces for the authenticated user",
      "inputSchema": {
        "type": "object",
        "properties": {},
        "required": []
      }
    },
    {
      "name": "asana_get_projects",
      "description": "Get projects in a workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "workspace": {
            "type": "string",
            "description": "The workspace GID"
          }
        },
        "required": ["workspace"]
      }
    },
    {
      "name": "asana_create_task",
      "description": "Create a new task in Asana",
      "inputSchema": {
        "type": "object",
        "properties": {
          "workspace": {
            "type": "string",
            "description": "The workspace GID"
          },
          "project": {
            "type": "string",
            "description": "The project GID"
          },
          "name": {
            "type": "string",
            "description": "The name of the task"
          },
          "notes": {
            "type": "string",
            "description": "The notes/description for the task"
          }
        },
        "required": ["workspace", "name"]
      }
    },
    {
      "name": "asana_get_tasks",
      "description": "Get tasks from a project",
      "inputSchema": {
        "type": "object",
        "properties": {
          "project": {
            "type": "string",
            "description": "The project GID"
          }
        },
        "required": ["project"]
      }
    }
  ],
  "serverInfo": {
    "name": "asana-mcp-server",
    "version": "1.0.0"
  }
}
```

✅ **Result:** You now have a list of all available MCP tools!

---

### Step 6: Call a Tool

**Request:**
```bash
curl -X POST https://mcp-client.owlfort.io/mcp/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "1/1234567890:abc123def456:xyz789ghi012jkl345mno678pqr901stu234",
    "toolName": "asana_get_workspaces",
    "arguments": {}
  }'
```

**Response Example:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"data\": [\n    {\n      \"gid\": \"1234567890\",\n      \"name\": \"My Workspace\",\n      \"resource_type\": \"workspace\"\n    },\n    {\n      \"gid\": \"9876543210\",\n      \"name\": \"Another Workspace\",\n      \"resource_type\": \"workspace\"\n    }\n  ]\n}"
    }
  ],
  "isError": false
}
```

---

## Complete Bash Script (Copy-Paste Ready)

```bash
#!/bin/bash

# Step 1: Register Client
echo "Step 1: Registering client..."
REGISTER_RESPONSE=$(curl -s -X POST https://mcp-client.owlfort.io/mcp/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "registrationUrl": "https://mcp.asana.com/register",
    "redirectUris": ["http://localhost:3000/oauth/callback"],
    "clientName": "Demo MCP Client"
  }')

CLIENT_ID=$(echo $REGISTER_RESPONSE | jq -r '.client_id')
echo "✓ Client ID: $CLIENT_ID"

# Step 2: Generate Auth URL
echo -e "\nStep 2: Generating authorization URL..."
AUTH_RESPONSE=$(curl -s -X POST https://mcp-client.owlfort.io/mcp/oauth/authorize-url \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"redirectUri\": \"http://localhost:3000/oauth/callback\",
    \"serverUrl\": \"https://mcp.asana.com\"
  }")

AUTH_URL=$(echo $AUTH_RESPONSE | jq -r '.authorizationUrl')
CODE_VERIFIER=$(echo $AUTH_RESPONSE | jq -r '.codeVerifier')
echo "✓ Authorization URL generated"
echo "Open this URL in your browser:"
echo "$AUTH_URL"

# Step 3: Get authorization code
echo -e "\nStep 3: Waiting for authorization..."
echo "After authorizing, paste the redirect URL here:"
read REDIRECT_URL
CODE=$(echo $REDIRECT_URL | grep -oP 'code=\K[^&]+')
echo "✓ Authorization code received"

# Step 4: Exchange for token
echo -e "\nStep 4: Exchanging code for token..."
TOKEN_RESPONSE=$(curl -s -X POST https://mcp-client.owlfort.io/mcp/oauth/exchange-token \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": \"$CODE\",
    \"codeVerifier\": \"$CODE_VERIFIER\",
    \"clientId\": \"$CLIENT_ID\",
    \"redirectUri\": \"http://localhost:3000/oauth/callback\",
    \"serverUrl\": \"https://mcp.asana.com\"
  }")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')
echo "✓ Access token received"
echo "Token: $ACCESS_TOKEN"

# Step 5: Fetch tools
echo -e "\nStep 5: Fetching available tools..."
TOOLS_RESPONSE=$(curl -s -X POST https://mcp-client.owlfort.io/mcp/tools-remote \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://mcp.asana.com/sse\",
    \"type\": \"sse\",
    \"token\": \"$ACCESS_TOKEN\"
  }")

echo "✓ Tools retrieved!"
echo "$TOOLS_RESPONSE" | jq '.tools[] | {name, description}'

# Step 6: Call a tool
echo -e "\nStep 6: Calling asana_get_workspaces tool..."
TOOL_RESPONSE=$(curl -s -X POST https://mcp-client.owlfort.io/mcp/call-tool \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://mcp.asana.com/sse\",
    \"type\": \"sse\",
    \"token\": \"$ACCESS_TOKEN\",
    \"toolName\": \"asana_get_workspaces\",
    \"arguments\": {}
  }")

echo "✓ Tool executed!"
echo "$TOOL_RESPONSE" | jq '.'

echo -e "\n✅ Complete flow finished!"
```

---

## Python Example

```python
import requests
import json
from urllib.parse import urlparse, parse_qs

API_BASE = "https://mcp-client.owlfort.io"
MCP_SERVER = "https://mcp.asana.com"

# Step 1: Register client
print("Step 1: Registering client...")
response = requests.post(f"{API_BASE}/mcp/oauth/register", json={
    "registrationUrl": f"{MCP_SERVER}/register",
    "redirectUris": ["http://localhost:3000/oauth/callback"],
    "clientName": "Demo MCP Client"
})
client_id = response.json()["client_id"]
print(f"✓ Client ID: {client_id}")

# Step 2: Generate auth URL
print("\nStep 2: Generating authorization URL...")
response = requests.post(f"{API_BASE}/mcp/oauth/authorize-url", json={
    "clientId": client_id,
    "redirectUri": "http://localhost:3000/oauth/callback",
    "serverUrl": MCP_SERVER
})
auth_data = response.json()
print(f"✓ Open this URL: {auth_data['authorizationUrl']}")

# Step 3: Get authorization code
redirect_url = input("\nPaste redirect URL: ")
code = parse_qs(urlparse(redirect_url).query)['code'][0]
print(f"✓ Code received")

# Step 4: Exchange for token
print("\nStep 4: Exchanging for token...")
response = requests.post(f"{API_BASE}/mcp/oauth/exchange-token", json={
    "code": code,
    "codeVerifier": auth_data["codeVerifier"],
    "clientId": client_id,
    "redirectUri": "http://localhost:3000/oauth/callback",
    "serverUrl": MCP_SERVER
})
token = response.json()["access_token"]
print(f"✓ Token: {token}")

# Step 5: Fetch tools
print("\nStep 5: Fetching tools...")
response = requests.post(f"{API_BASE}/mcp/tools-remote", json={
    "url": f"{MCP_SERVER}/sse",
    "type": "sse",
    "token": token
})
tools = response.json()["tools"]
print(f"✓ Found {len(tools)} tools:")
for tool in tools:
    print(f"  - {tool['name']}: {tool.get('description', 'No description')}")

# Step 6: Call a tool
print("\nStep 6: Calling asana_get_workspaces...")
response = requests.post(f"{API_BASE}/mcp/call-tool", json={
    "url": f"{MCP_SERVER}/sse",
    "type": "sse",
    "token": token,
    "toolName": "asana_get_workspaces",
    "arguments": {}
})
result = response.json()
print(f"✓ Result: {json.dumps(result, indent=2)}")
```

---

## Key Points

1. **Client Registration** returns a `client_id` that you'll use for all subsequent calls
2. **Authorization URL** includes PKCE challenge - save the `codeVerifier`!
3. **User Authorization** happens in the browser - user must click "Allow"
4. **Token Exchange** uses the code AND the code verifier from step 2
5. **Fetch Tools** shows all available MCP tools on the server
6. **Call Tool** executes a specific tool with the access token

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Client not found" | Use the `client_id` from Step 1 response |
| "Invalid code_verifier" | Must use the same `codeVerifier` from Step 2 |
| "Invalid redirect_uri" | Must exactly match what was registered |
| "Code expired" | Authorization codes expire quickly - start over from Step 2 |
| "Token expired" | Use `refresh_token` to get a new `access_token` |

---

## Next Steps

After getting your tools:
1. **Explore available tools** - check `inputSchema` for parameters
2. **Call tools** - use `/mcp/call-tool` endpoint
3. **Handle responses** - tools return structured data
4. **Refresh tokens** - implement token refresh logic
5. **Error handling** - handle expired tokens, rate limits, etc.
