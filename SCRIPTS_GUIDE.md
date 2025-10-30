# MCP OAuth Scripts Guide

This project includes automated scripts to simplify the OAuth authentication flow with MCP servers.

## 📦 Available Scripts

### `npm run oauth`

Automated OAuth authentication script. Runs the complete 3-step OAuth flow:

```bash
npm run oauth
```

**What it does:**

1. **Registers OAuth Client**
   - Calls `POST /mcp/oauth/register`
   - Creates a new OAuth client with MCP server
   - No pre-registration needed!

2. **Opens Authorization**
   - Generates authorization URL with PKCE
   - Opens your default browser automatically
   - Waits for you to authorize

3. **Exchanges Token**
   - Takes the authorization code from callback URL
   - Exchanges it for an access token
   - Saves token to `.mcp-token.json`

**Options:**

```bash
# Use a different MCP server
npm run oauth -- --server=https://custom-mcp.example.com

# Custom client name
npm run oauth -- --name="My Custom Client"
```

**Output:**

```
======================================================================
                  MCP OAuth Flow - Automated
======================================================================

ℹ MCP Server: https://mcp.asana.com
ℹ API Server: https://localhost:3000
ℹ Client Name: MCP CLI Client

[Step 1/3] Registering OAuth client
ℹ Registering with: https://mcp.asana.com/register
✓ Client registered successfully!
   Client ID: abc123xyz
   Auth Method: none

[Step 2/3] Generating authorization URL
✓ Authorization URL generated
✓ Opened browser

======================================================================
After authorizing in your browser, you will be redirected to:
  http://localhost:3000/oauth/callback?code=AUTHORIZATION_CODE&state=...
======================================================================

Paste the full redirect URL here: [waiting for input]

✓ Authorization code received
   Code: abcd1234...

[Step 3/3] Exchanging authorization code for access token
✓ Access token received!

======================================================================
YOUR ACCESS TOKEN:
1/abc123def456ghi789...
======================================================================

✓ Token saved to .mcp-token.json

======================================================================
                        ✓ SUCCESS!
======================================================================

ℹ Next steps:
  1. Use the token to list available tools:
     npm run test-tools
```

---

### `npm run test-tools`

Tests your saved OAuth token by fetching available tools from the MCP server.

```bash
npm run test-tools
```

**What it does:**

1. Loads token from `.mcp-token.json`
2. Calls `POST /mcp/tools-remote` with your token
3. Displays all available tools
4. Saves tools list to `.mcp-tools.json`

**Requirements:**
- Must run `npm run oauth` first
- Server must be running (`npm run start:server`)

**Output:**

```
======================================================================
                    MCP Tools Test
======================================================================

Loading saved token...
✓ Token loaded (from 2025-10-30T17:56:48.000Z)
  MCP Server: https://mcp.asana.com
  Client ID: abc123xyz

Fetching tools from MCP server...
✓ Successfully retrieved 43 tools!

Available Tools:

1. asana_get_attachment
   Get detailed attachment data for a specific attachment

2. asana_get_workspaces
   List all workspaces

3. asana_get_tasks
   List tasks in a project

[... 40 more tools ...]

======================================================================
Total: 43 tools available

✓ Tools list saved to .mcp-tools.json
```

---

## 📁 Generated Files

### `.mcp-token.json`

Stores your OAuth credentials:

```json
{
  "access_token": "1/abc123...",
  "refresh_token": "1/def456...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "expires_at": 1730316608000,
  "client_id": "abc123xyz",
  "mcp_server": "https://mcp.asana.com",
  "created_at": "2025-10-30T17:56:48.000Z"
}
```

⚠️ **Security:** This file contains sensitive credentials. Never commit it to version control (already in `.gitignore`).

### `.mcp-tools.json`

Lists all available tools from the MCP server:

```json
[
  {
    "name": "asana_get_attachment",
    "description": "Get detailed attachment data...",
    "inputSchema": {
      "type": "object",
      "properties": {
        "attachment_gid": {
          "type": "string",
          "description": "The globally unique identifier for the attachment"
        }
      },
      "required": ["attachment_gid"]
    }
  },
  ...
]
```

---

## 🔧 Advanced Usage

### Custom MCP Server

```bash
# Authenticate with a different MCP server
npm run oauth -- --server=https://custom-mcp.example.com

# The token will be saved with the server URL
# test-tools will automatically use the correct server
npm run test-tools
```

### Environment Variables

You can also use environment variables:

```bash
# Set API server (if not using default https://localhost:3000)
export API_SERVER=https://api.example.com

npm run oauth
```

### Debugging

Enable verbose output:

```bash
# Run with tsx directly for more control
tsx scripts/mcp-oauth.ts

# Or with Node.js debugging
node --inspect node_modules/.bin/tsx scripts/mcp-oauth.ts
```

---

## 🆘 Troubleshooting

### "Token file not found"

**Error:** `Token file not found. Please run "npm run oauth" first`

**Solution:** Run `npm run oauth` to authenticate first.

---

### "Cannot POST /mcp/oauth/register"

**Error:** `HTTP 404: Cannot POST /mcp/oauth/register`

**Solution:** Make sure the API server is running:
```bash
npm run start:server
```

---

### "Failed to open browser"

**Error:** `Could not open browser automatically`

**Solution:** The script will display the authorization URL. Copy and paste it into your browser manually.

---

### Token Expired

**Error:** `HTTP 401: Token expired or invalid`

**Solution:** Run the OAuth flow again to get a fresh token:
```bash
npm run oauth
```

---

## 💡 Tips

1. **Keep the server running:** The API server must be running for the scripts to work
   ```bash
   # Terminal 1
   npm run start:server

   # Terminal 2
   npm run oauth
   ```

2. **Token reuse:** The token is saved and reused. You don't need to re-authenticate unless the token expires.

3. **Multiple servers:** You can authenticate with multiple MCP servers. Each server gets its own token in the file.

4. **Inspect tokens:** Use `cat .mcp-token.json` to view your saved credentials.

5. **Check expiration:** The token file includes `expires_at` timestamp for easy checking.

---

## 🔗 Related Documentation

- [MCP_OAUTH_GUIDE.md](./MCP_OAUTH_GUIDE.md) - Complete OAuth flow documentation
- [README.md](./README.md) - Main project documentation
- [Swagger API Docs](https://localhost:3000/api) - Interactive API documentation

---

## 📝 Script Implementation

The scripts are written in TypeScript and use:
- Node.js `fetch` for HTTP requests
- `readline` for user input
- `child_process` for opening browser
- File system APIs for saving tokens

Source code:
- [`scripts/mcp-oauth.ts`](./scripts/mcp-oauth.ts) - OAuth automation
- [`scripts/test-tools.ts`](./scripts/test-tools.ts) - Tools testing

You can modify these scripts to fit your specific needs!
