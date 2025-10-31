# MCP OAuth Demo Scripts

This directory contains demo scripts that show the complete OAuth flow for MCP servers, including fetching tools after authentication.

## Available Scripts

### 1. `mcp-oauth-demo.sh` (Bash + curl)
Simple OAuth flow using bash and curl - no programming language required!

**Usage:**
```bash
# Direct execution
./scripts/mcp-oauth-demo.sh

# With custom MCP server
./scripts/mcp-oauth-demo.sh https://mcp.asana.com
```

**Requirements:**
- bash
- curl
- jq (JSON processor)
  - macOS: `brew install jq`
  - Ubuntu/Debian: `sudo apt-get install jq`
  - CentOS/RHEL: `sudo yum install jq`

### 2. `mcp-oauth-demo.js` (Node.js)
Complete OAuth flow demonstration in JavaScript.

**Usage:**
```bash
# Using npm script (recommended)
npm run oauth-demo

# Or directly
node scripts/mcp-oauth-demo.js

# With custom MCP server
node scripts/mcp-oauth-demo.js --server=https://mcp.asana.com
```

**Requirements:**
- Node.js 18+
- No additional dependencies (uses built-in fetch)

### 3. `mcp-oauth-demo.py` (Python)
Complete OAuth flow demonstration in Python.

**Usage:**
```bash
# Direct execution
python3 scripts/mcp-oauth-demo.py

# With custom MCP server
python3 scripts/mcp-oauth-demo.py --server https://mcp.asana.com
```

**Requirements:**
- Python 3.7+
- `requests` library: `pip install requests`

### 4. `mcp-oauth.ts` (TypeScript)
Advanced OAuth flow with TypeScript and additional features.

**Usage:**
```bash
npm run oauth

# With custom MCP server
npm run oauth -- --server=https://mcp.asana.com
```

## Complete Working Example

👉 **See [COMPLETE_EXAMPLE.md](COMPLETE_EXAMPLE.md)** for a full end-to-end example with:
- All 5 steps including token exchange and tool fetching
- Copy-paste ready bash script
- Python implementation
- Real API request/response examples

## What These Scripts Do

All scripts perform these **5 steps**:

### Step 1: Register OAuth Client
```bash
POST https://mcp-client.owlfort.io/mcp/oauth/register
{
  "registrationUrl": "https://mcp.asana.com/register",
  "redirectUris": ["http://localhost:3000/oauth/callback"],
  "clientName": "MCP OAuth Demo Client",
  "clientUri": "https://github.com/your-org/simple-mcp-client"
}
```

**Response:**
```json
{
  "client_id": "ikOptM5Alt3QmQ6q",
  "redirect_uris": ["http://localhost:3000/oauth/callback"],
  "token_endpoint_auth_method": "none"
}
```

### Step 2: Generate Authorization URL
```bash
POST https://mcp-client.owlfort.io/mcp/oauth/authorize-url
{
  "clientId": "ikOptM5Alt3QmQ6q",
  "redirectUri": "http://localhost:3000/oauth/callback",
  "serverUrl": "https://mcp.asana.com"
}
```

**Response:**
```json
{
  "authorizationUrl": "https://mcp.asana.com/authorize?response_type=code&client_id=...",
  "codeVerifier": "K2A0Lu1~CHX.saE..."
}
```

### Step 3: User Authorization
The script opens the authorization URL in your browser. After you authorize:
- You'll be redirected to: `http://localhost:3000/oauth/callback?code=AUTH_CODE&state=...`
- Copy and paste the full redirect URL back into the script

### Step 4: Exchange Code for Token
```bash
POST https://mcp-client.owlfort.io/mcp/oauth/exchange-token
{
  "code": "AUTHORIZATION_CODE",
  "codeVerifier": "K2A0Lu1~CHX.saE...",
  "clientId": "ikOptM5Alt3QmQ6q",
  "redirectUri": "http://localhost:3000/oauth/callback",
  "serverUrl": "https://mcp.asana.com"
}
```

**Response:**
```json
{
  "access_token": "1/abc123...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "1/def456..."
}
```

### Step 5: Fetch Tools
```bash
POST https://mcp-client.owlfort.io/mcp/tools-remote
{
  "url": "https://mcp.asana.com/sse",
  "type": "sse",
  "token": "YOUR_ACCESS_TOKEN"
}
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
        "properties": {}
      }
    }
  ]
}
```

## API Endpoints Used

All scripts use the following API endpoints on `https://mcp-client.owlfort.io`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/oauth/register` | POST | Register a new OAuth client |
| `/mcp/oauth/authorize-url` | POST | Generate authorization URL with PKCE |
| `/mcp/oauth/exchange-token` | POST | Exchange auth code for access token |
| `/mcp/tools-remote` | POST | Fetch tools from MCP server |
| `/mcp/call-tool` | POST | Call a specific tool |

## Environment Variables

You can customize the behavior with environment variables:

```bash
# Change API server (default: https://mcp-client.owlfort.io)
export API_SERVER=https://your-server.com

# Then run the script
npm run oauth-demo
```

## Next Steps After Running

Once you have your access token, you can:

### 1. List Tools
```bash
curl -X POST https://mcp-client.owlfort.io/mcp/tools-remote \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_ACCESS_TOKEN"
  }'
```

### 2. Call a Tool
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

## Troubleshooting

### "Client not found" Error
- Make sure you're using the `client_id` returned from the registration step
- Don't reuse client IDs from previous registrations

### "Invalid redirect_uri" Error
- The redirect URI must exactly match what you registered
- Check for trailing slashes and protocol (http vs https)

### "Invalid code_verifier" Error
- Use the same `codeVerifier` returned from the authorize-url step
- Don't generate a new one for the token exchange

### Browser Doesn't Open
- The script will display the URL - copy and paste it into your browser manually
- Make sure you have a default browser configured

## See Also

- [MCP_OAUTH_GUIDE.md](../MCP_OAUTH_GUIDE.md) - Detailed OAuth flow documentation
- [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591) - Dynamic Client Registration
- [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) - PKCE
- [MCP Specification](https://spec.modelcontextprotocol.io/)
