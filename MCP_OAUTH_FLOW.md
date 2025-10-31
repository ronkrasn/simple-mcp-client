# MCP OAuth Flow - Visual Guide

Complete OAuth flow for fetching tools from MCP servers using `https://mcp-client.owlfort.io`.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MCP OAuth Flow Sequence                          │
└─────────────────────────────────────────────────────────────────────┘

Client                API Server              MCP Server          User
  │                       │                       │                │
  │                                                                 │
  ├─[1]─Register─────────>│                       │                │
  │   POST /register      │                       │                │
  │                       ├───────────────────────>│                │
  │                       │  Register client      │                │
  │                       │<───────────────────────┤                │
  │<──────────────────────┤  client_id            │                │
  │   client_id           │                       │                │
  │                       │                       │                │
  ├─[2]─Auth URL─────────>│                       │                │
  │   POST /authorize-url │                       │                │
  │<──────────────────────┤                       │                │
  │   authorizationUrl    │                       │                │
  │   codeVerifier        │                       │                │
  │                       │                       │                │
  ├─[3]─Open Browser─────────────────────────────────────────────>│
  │                       │                       │  Authorize?    │
  │                       │                       │<───────────────┤
  │                       │                       │  ✓ Allow       │
  │<────────────────────────────────────────────────────────────────┤
  │   Redirect with code  │                       │                │
  │                       │                       │                │
  ├─[4]─Exchange Token───>│                       │                │
  │   POST /exchange      │                       │                │
  │   code + verifier     ├───────────────────────>│                │
  │                       │  Exchange code        │                │
  │                       │<───────────────────────┤                │
  │<──────────────────────┤  access_token         │                │
  │   access_token        │                       │                │
  │                       │                       │                │
  ├─[5]─Get Tools────────>│                       │                │
  │   POST /tools-remote  ├───────────────────────>│                │
  │   token               │  List tools (SSE)     │                │
  │                       │<───────────────────────┤                │
  │<──────────────────────┤  tools[]              │                │
  │   tools[]             │                       │                │
  │                       │                       │                │
  ├─[6]─Call Tool────────>│                       │                │
  │   POST /call-tool     ├───────────────────────>│                │
  │   token + toolName    │  Execute tool (SSE)   │                │
  │                       │<───────────────────────┤                │
  │<──────────────────────┤  result               │                │
  │   result              │                       │                │
  │                       │                       │                │
```

## API Endpoints Summary

| Step | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| 1 | `/mcp/oauth/register` | POST | Register OAuth client with MCP server |
| 2 | `/mcp/oauth/authorize-url` | POST | Generate authorization URL with PKCE |
| 3 | Browser | - | User authorizes application |
| 4 | `/mcp/oauth/exchange-token` | POST | Exchange auth code for access token |
| 5 | `/mcp/tools-remote` | POST | Fetch available tools from MCP server |
| 6 | `/mcp/call-tool` | POST | Execute a specific tool |

## Data Flow

### Step 1: Register Client
**Input:**
- `registrationUrl`: MCP server's registration endpoint
- `redirectUris`: Where to redirect after authorization
- `clientName`: Your application name

**Output:**
- `client_id`: Unique identifier for your client
- `token_endpoint_auth_method`: Usually "none" for public clients

---

### Step 2: Generate Authorization URL
**Input:**
- `clientId`: From step 1
- `redirectUri`: Must match registered URI
- `serverUrl`: MCP server base URL

**Output:**
- `authorizationUrl`: URL to open in browser
- `codeVerifier`: PKCE verifier (keep secret!)

---

### Step 3: User Authorization
**Input:**
- User opens `authorizationUrl` in browser

**Output:**
- Redirect to `redirectUri?code=AUTH_CODE&state=...`
- Extract `code` from URL

---

### Step 4: Exchange Token
**Input:**
- `code`: From step 3
- `codeVerifier`: From step 2 (IMPORTANT!)
- `clientId`: From step 1
- `redirectUri`: Same as before
- `serverUrl`: MCP server URL

**Output:**
- `access_token`: Use for API calls
- `refresh_token`: Use to get new access tokens
- `expires_in`: Token lifetime in seconds

---

### Step 5: Fetch Tools
**Input:**
- `url`: MCP server SSE endpoint
- `type`: "sse" for Server-Sent Events
- `token`: Access token from step 4

**Output:**
- `tools[]`: Array of available tools
  - `name`: Tool identifier
  - `description`: What the tool does
  - `inputSchema`: Required parameters

---

### Step 6: Call Tool
**Input:**
- `url`: MCP server SSE endpoint
- `type`: "sse"
- `token`: Access token
- `toolName`: Name from tools list
- `arguments`: Parameters for the tool

**Output:**
- `content[]`: Tool execution results
- `isError`: Whether execution failed

## Security Features

### PKCE (Proof Key for Code Exchange)
- Protects against authorization code interception
- `codeVerifier` generated in step 2
- `code_challenge` sent to authorization endpoint
- Verifier sent to token endpoint

### Token Management
- **Access Token**: Short-lived (typically 1 hour)
- **Refresh Token**: Long-lived, use to get new access tokens
- **No Client Secret**: Public clients don't need secrets

### Dynamic Registration
- Clients register on-demand
- No pre-configuration required
- Each registration gets unique credentials

## Example Tool Usage

### Get Asana Workspaces
```json
{
  "url": "https://mcp.asana.com/sse",
  "type": "sse",
  "token": "YOUR_TOKEN",
  "toolName": "asana_get_workspaces",
  "arguments": {}
}
```

### Create Asana Task
```json
{
  "url": "https://mcp.asana.com/sse",
  "type": "sse",
  "token": "YOUR_TOKEN",
  "toolName": "asana_create_task",
  "arguments": {
    "workspace": "1234567890",
    "name": "New Task",
    "notes": "Task description"
  }
}
```

## Quick Reference

| What You Need | Where to Get It |
|---------------|-----------------|
| API Base URL | `https://mcp-client.owlfort.io` |
| MCP Server | `https://mcp.asana.com` (or your server) |
| Client ID | Response from step 1 |
| Code Verifier | Response from step 2 (keep secret!) |
| Auth Code | Redirect URL after step 3 |
| Access Token | Response from step 4 |
| Tool Names | Response from step 5 |

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Client not found" | Wrong client_id | Use ID from registration |
| "Invalid redirect_uri" | URI mismatch | Exact match required |
| "Invalid code_verifier" | Wrong or missing verifier | Use same verifier from step 2 |
| "Code expired" | Too much time passed | Generate new auth URL |
| "Token expired" | access_token expired | Use refresh_token |
| "Tool not found" | Wrong tool name | Check tools list from step 5 |

## Try It Yourself

### Using the Demo Scripts
```bash
# JavaScript
npm run oauth-demo

# Python
python3 scripts/mcp-oauth-demo.py

# Bash
./scripts/mcp-oauth-demo.sh

# TypeScript
npm run oauth
```

### Manual Testing
```bash
# See complete curl examples
cat scripts/COMPLETE_EXAMPLE.md

# See quick reference
cat scripts/QUICK_REFERENCE.md
```

## Resources

- **Complete Example**: [scripts/COMPLETE_EXAMPLE.md](scripts/COMPLETE_EXAMPLE.md)
- **Quick Reference**: [scripts/QUICK_REFERENCE.md](scripts/QUICK_REFERENCE.md)
- **Scripts Guide**: [scripts/README.md](scripts/README.md)
- **OAuth Guide**: [MCP_OAUTH_GUIDE.md](MCP_OAUTH_GUIDE.md)

## Standards

This implementation follows:
- [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591) - Dynamic Client Registration
- [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) - PKCE
- [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) - OAuth 2.0
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol
