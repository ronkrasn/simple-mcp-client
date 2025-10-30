# MCP OAuth Guide - Dynamic Client Registration

This guide shows you how to authenticate with MCP servers (like Asana MCP) using **dynamic client registration** (RFC 7591). This is the proper way to authenticate with MCP servers.

## Quick Start - Use the HTML Helper

The easiest way to get started is to use the web interface:

1. **Start your server**:
   ```bash
   npm run start:server
   ```

2. **Open the OAuth helper**:
   ```
   https://localhost:3000/oauth-mcp.html
   ```

3. **Follow the 3-step process**:
   - Step 1: Register a new OAuth client
   - Step 2: Authorize the application
   - Step 3: Get your access token

4. **Use your token**:
   ```bash
   curl -k -X POST https://localhost:3000/mcp/tools-remote \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://mcp.asana.com/sse",
       "type": "sse",
       "token": "YOUR_ACCESS_TOKEN"
     }'
   ```

## Manual Flow - Using cURL

### Step 1: Register OAuth Client

Register a new client with the MCP server:

```bash
curl -k -X POST https://localhost:3000/mcp/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "registrationUrl": "https://mcp.asana.com/register",
    "redirectUris": ["http://localhost:3000/oauth/callback"],
    "clientName": "My MCP Client",
    "clientUri": "http://localhost:3000"
  }'
```

**Response**:
```json
{
  "client_id": "ikOptM5Alt3QmQ6q",
  "redirect_uris": ["http://localhost:3000/oauth/callback"],
  "client_name": "My MCP Client",
  "token_endpoint_auth_method": "none",
  ...
}
```

**Save the `client_id`** - you'll need it for the next steps!

### Step 2: Generate Authorization URL

```bash
curl -k -X POST https://localhost:3000/mcp/oauth/authorize-url \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "ikOptM5Alt3QmQ6q",
    "redirectUri": "http://localhost:3000/oauth/callback",
    "serverUrl": "https://mcp.asana.com"
  }'
```

**Response**:
```json
{
  "authorizationUrl": "https://mcp.asana.com/authorize?response_type=code&client_id=...",
  "codeVerifier": "K2A0Lu1~CHX.saE..."
}
```

**Save the `codeVerifier`** - you'll need it to exchange the authorization code!

### Step 3: User Authorization

1. Visit the `authorizationUrl` in your browser
2. Log in to Asana and authorize the application
3. You'll be redirected to your `redirectUri` with a `code` parameter

Example redirect:
```
http://localhost:3000/oauth/callback?code=AUTHORIZATION_CODE&state=...
```

### Step 4: Exchange Code for Token

```bash
curl -k -X POST https://localhost:3000/mcp/oauth/exchange-token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AUTHORIZATION_CODE",
    "codeVerifier": "K2A0Lu1~CHX.saE...",
    "clientId": "ikOptM5Alt3QmQ6q",
    "redirectUri": "http://localhost:3000/oauth/callback",
    "serverUrl": "https://mcp.asana.com"
  }'
```

**Response**:
```json
{
  "access_token": "1/abc123...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "1/def456..."
}
```

### Step 5: Use the Access Token

Now you can use the access token to fetch tools and call MCP server methods:

```bash
# Get available tools
curl -k -X POST https://localhost:3000/mcp/tools-remote \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_ACCESS_TOKEN"
  }'

# Call a tool
curl -k -X POST https://localhost:3000/mcp/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_ACCESS_TOKEN",
    "toolName": "asana_get_workspaces",
    "arguments": {}
  }'
```

## Why Dynamic Client Registration?

The old approach required pre-registered client credentials that didn't work with MCP Asana:

❌ **Old Way (Doesn't Work)**:
- Had to use hardcoded client IDs that were registered elsewhere
- Got "Client not found" errors
- Mixed up standard Asana OAuth with MCP OAuth

✅ **New Way (Works!)**:
- Dynamically register a new client on-demand
- No pre-registration needed
- Uses proper MCP OAuth endpoints
- Works with `token_endpoint_auth_method: "none"` (no client secret required)

## Technical Details

### What is RFC 7591?

[RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591) is the OAuth 2.0 Dynamic Client Registration Protocol. It allows clients to register themselves with authorization servers without manual administrator intervention.

### MCP OAuth Flow

1. **Registration**: POST to `/register` endpoint with client metadata
2. **Authorization**: Use MCP SDK's `startAuthorization()` with PKCE
3. **Token Exchange**: POST to `/token` endpoint with authorization code and PKCE verifier

### Key Differences from Standard OAuth

| Standard OAuth | MCP OAuth |
|---------------|-----------|
| Pre-registered clients | Dynamic registration |
| Usually requires client_secret | Supports `token_endpoint_auth_method: "none"` |
| Optional PKCE | PKCE is mandatory |
| Manual redirect URI registration | Dynamic redirect URI registration |

## Troubleshooting

### "Client not found" Error

This means you're using a client ID that wasn't registered with the MCP server. Solution:
- Use `/mcp/oauth/register` to register a new client first
- Don't use client IDs from standard Asana OAuth

### "Invalid redirect_uri" Error

The redirect URI must exactly match what you registered:
- Include or exclude trailing slashes consistently
- Use the same protocol (http vs https)
- Use the same port

### "Invalid code_verifier" Error

Make sure you're using the same `codeVerifier` that was returned when you generated the authorization URL. Don't generate a new one.

### Authorization URL Doesn't Work

Make sure you're using:
- The correct `client_id` from registration
- The full authorization URL (with PKCE challenge)
- The MCP OAuth endpoints, not standard Asana OAuth

## API Endpoints Reference

### POST /mcp/oauth/register
Register a new OAuth client dynamically.

**Request**:
```json
{
  "registrationUrl": "https://mcp.asana.com/register",
  "redirectUris": ["http://localhost:3000/oauth/callback"],
  "clientName": "My MCP Client",
  "clientUri": "http://localhost:3000"
}
```

### POST /mcp/oauth/authorize-url
Generate an authorization URL for user authentication.

**Request**:
```json
{
  "clientId": "YOUR_CLIENT_ID",
  "redirectUri": "http://localhost:3000/oauth/callback",
  "serverUrl": "https://mcp.asana.com"
}
```

### POST /mcp/oauth/exchange-token
Exchange authorization code for access token.

**Request**:
```json
{
  "code": "AUTHORIZATION_CODE",
  "codeVerifier": "CODE_VERIFIER",
  "clientId": "YOUR_CLIENT_ID",
  "redirectUri": "http://localhost:3000/oauth/callback",
  "serverUrl": "https://mcp.asana.com"
}
```

## Next Steps

After obtaining your access token:
1. Use `/mcp/tools-remote` to list available tools
2. Use `/mcp/call-tool` to execute specific tools
3. Store your token securely (consider using refresh tokens)
4. Check token expiration and refresh as needed

## Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [RFC 7591 - Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
