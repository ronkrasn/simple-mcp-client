# Troubleshooting Guide

Common issues and solutions for the MCP OAuth flow.

## Token Exchange Fails with 500 Error

### Symptoms
```bash
[Step 4/4] Exchanging authorization code for access token
✗ Token exchange failed:
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

### Common Causes

#### 1. Authorization Code Expired
**Problem:** Authorization codes typically expire after 10 minutes or less.

**Solution:** Run the OAuth flow again from the beginning. Authorization codes can only be used once and must be used quickly after receiving them.

```bash
# Start fresh
./scripts/mcp-oauth-demo.sh
```

#### 2. Code Verifier Mismatch
**Problem:** The code verifier used in token exchange must match the one generated when creating the authorization URL.

**Check:** Make sure your script saves and uses the same `codeVerifier` from step 2 in step 4.

**Example (correct flow):**
```bash
# Step 2: Save the code verifier
CODE_VERIFIER=$(echo $AUTH_RESPONSE | jq -r '.codeVerifier')

# Step 4: Use the SAME code verifier
curl -X POST /mcp/oauth/exchange-token \
  -d "{\"codeVerifier\": \"$CODE_VERIFIER\", ...}"
```

#### 3. Invalid Authorization Code
**Problem:** The authorization code was not properly extracted from the redirect URL.

**Check:** Make sure you're extracting just the code value, not the entire URL.

```bash
# ✅ Correct: Extract just the code
code=$(echo $REDIRECT_URL | grep -oP 'code=\K[^&]+')

# ❌ Wrong: Using the entire URL as the code
code=$REDIRECT_URL
```

#### 4. MCP SDK OAuth Discovery Issue
**Problem:** The MCP SDK's `exchangeAuthorization` function may be failing to discover or use the OAuth metadata.

**Check server logs:** If you're running the server locally, check the logs for detailed error messages:

```bash
npm run dev:server
```

Look for error messages like:
- "Could not discover OAuth metadata"
- "Code verifier is required"
- HTTP errors from the token endpoint

#### 5. Token Endpoint Not Responding
**Problem:** The MCP server's token endpoint may be down or unreachable.

**Test:** Try to access the MCP server's metadata:

```bash
curl https://mcp.asana.com/.well-known/oauth-authorization-server
```

You should see OAuth configuration including `token_endpoint`.

### Debugging Steps

#### Step 1: Check Authorization Code
Make sure the authorization code is valid:

```bash
echo "Code: $CODE"
echo "Length: ${#CODE}"
```

Authorization codes are typically 20-100 characters long and alphanumeric.

#### Step 2: Check Code Verifier
Verify the code verifier is present:

```bash
echo "Code Verifier: $CODE_VERIFIER"
echo "Length: ${#CODE_VERIFIER}"
```

Code verifiers are typically 43-128 characters long.

#### Step 3: Check Client ID
Verify you're using the correct client ID from registration:

```bash
echo "Client ID: $CLIENT_ID"
```

#### Step 4: Try Manual Token Exchange
Test the token exchange manually with curl:

```bash
curl -v -X POST https://mcp-client.owlfort.io/mcp/oauth/exchange-token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "YOUR_AUTH_CODE",
    "codeVerifier": "YOUR_CODE_VERIFIER",
    "clientId": "YOUR_CLIENT_ID",
    "redirectUri": "http://localhost:3000/oauth/callback",
    "serverUrl": "https://mcp.asana.com"
  }'
```

The `-v` flag will show you the full HTTP exchange.

#### Step 5: Check Server Logs
If you're running the API server yourself:

```bash
# Start in development mode to see detailed logs
npm run dev:server

# In another terminal, run the OAuth flow
./scripts/mcp-oauth-demo.sh
```

Look for detailed error messages in the server logs.

### Workarounds

#### Option 1: Use Standard Asana OAuth (if applicable)
If you're using Asana, you can use their standard OAuth endpoint instead of MCP's:

```bash
curl -X POST https://mcp-client.owlfort.io/mcp/oauth/exchange-token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "YOUR_AUTH_CODE",
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "redirectUri": "http://localhost:3000/oauth/callback",
    "serverUrl": "https://mcp.asana.com",
    "oauthTokenUrl": "https://app.asana.com/-/oauth_token"
  }'
```

#### Option 2: Restart the OAuth Flow
Sometimes the simplest solution is to start fresh:

```bash
# Clear any cached data
rm -f .mcp-token.json

# Run again
./scripts/mcp-oauth-demo.sh
```

### Getting More Information

Enable verbose logging in the scripts:

#### Bash Script
```bash
# Add -x flag to enable debug output
bash -x ./scripts/mcp-oauth-demo.sh
```

#### JavaScript
```bash
# Add NODE_DEBUG environment variable
NODE_DEBUG=* npm run oauth-demo
```

#### Python
```python
# Add logging to the script
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## Other Common Issues

### "Client not found" Error

**Problem:** Using a `client_id` that wasn't registered.

**Solution:** Always use the `client_id` returned from the `/mcp/oauth/register` endpoint.

### "Invalid redirect_uri" Error

**Problem:** The redirect URI doesn't exactly match what was registered.

**Solution:** Ensure exact match including:
- Protocol (http vs https)
- Domain/hostname
- Port number
- Path
- Trailing slash (or lack thereof)

```bash
# ✅ Correct: Exact match
Registered: "http://localhost:3000/oauth/callback"
Used:       "http://localhost:3000/oauth/callback"

# ❌ Wrong: Trailing slash mismatch
Registered: "http://localhost:3000/oauth/callback"
Used:       "http://localhost:3000/oauth/callback/"
```

### "Invalid code_verifier" Error

**Problem:** Using a different code verifier than the one that generated the authorization URL.

**Solution:** Store and reuse the exact `codeVerifier` from step 2:

```javascript
// Step 2
const authResponse = await generateAuthUrl(clientId);
const codeVerifier = authResponse.codeVerifier; // SAVE THIS

// Step 4
await exchangeToken(code, codeVerifier); // USE SAME ONE
```

### Authorization URL Doesn't Open

**Problem:** Browser doesn't open automatically.

**Solution:** Copy the URL and paste it manually in your browser.

### Browser Shows Security Warning

**Problem:** SSL certificate issues with `https://localhost`.

**Solution:** This is normal for development. Click "Advanced" → "Proceed anyway" (or similar).

---

## Getting Help

If you're still stuck:

1. **Check server logs** for detailed error messages
2. **Try a different MCP server** to isolate the issue
3. **Use curl directly** to test the API endpoints
4. **File an issue** with:
   - Full error message
   - Steps to reproduce
   - Script being used
   - MCP server URL
   - Redacted logs (remove sensitive tokens!)

---

## Quick Fixes Checklist

- [ ] Authorization code is recent (less than 10 minutes old)
- [ ] Code verifier matches the one from step 2
- [ ] Client ID matches the one from registration
- [ ] Redirect URI exactly matches the registered one
- [ ] MCP server is accessible and responding
- [ ] No typos in the authorization code
- [ ] Using latest version of the scripts
- [ ] API server at https://mcp-client.owlfort.io is accessible

---

## Testing the API Server

Quick health check:

```bash
# Test if server is up
curl -k https://mcp-client.owlfort.io/

# Test registration endpoint
curl -k -X POST https://mcp-client.owlfort.io/mcp/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "registrationUrl": "https://mcp.asana.com/register",
    "redirectUris": ["http://localhost:3000/oauth/callback"],
    "clientName": "Test Client"
  }'
```

Both should return successful responses.
