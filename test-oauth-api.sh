#!/bin/bash

echo "Testing improved OAuth error logging on https://mcp-client.owlfort.io"
echo "=========================================================================="
echo ""

# Step 1: Register
echo "Step 1: Testing registration..."
REGISTER_RESPONSE=$(curl -s https://mcp-client.owlfort.io/mcp/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"registrationUrl":"https://mcp.asana.com/register","redirectUris":["http://localhost:3000/oauth/callback"],"clientName":"Test Error Logging"}')

echo "$REGISTER_RESPONSE" | jq '.'
CLIENT_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.client_id')

if [ "$CLIENT_ID" != "null" ] && [ -n "$CLIENT_ID" ]; then
  echo "✓ Registration successful! Client ID: $CLIENT_ID"
else
  echo "✗ Registration failed"
  exit 1
fi

echo ""
echo "Step 2: Testing authorization URL generation..."
AUTH_RESPONSE=$(curl -s https://mcp-client.owlfort.io/mcp/oauth/authorize-url \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"redirectUri\":\"http://localhost:3000/oauth/callback\",\"serverUrl\":\"https://mcp.asana.com\"}")

echo "$AUTH_RESPONSE" | jq '.'
CODE_VERIFIER=$(echo "$AUTH_RESPONSE" | jq -r '.codeVerifier')

if [ "$CODE_VERIFIER" != "null" ] && [ -n "$CODE_VERIFIER" ]; then
  echo "✓ Auth URL generated! Verifier length: ${#CODE_VERIFIER}"
else
  echo "✗ Auth URL generation failed"
  exit 1
fi

echo ""
echo "Step 3: Testing token exchange with invalid code (to see error messages)..."
echo "This should fail intentionally to show improved error logging..."
TOKEN_RESPONSE=$(curl -s https://mcp-client.owlfort.io/mcp/oauth/exchange-token \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"INVALID_CODE_FOR_TESTING\",\"codeVerifier\":\"$CODE_VERIFIER\",\"clientId\":\"$CLIENT_ID\",\"redirectUri\":\"http://localhost:3000/oauth/callback\",\"serverUrl\":\"https://mcp.asana.com\"}")

echo "$TOKEN_RESPONSE" | jq '.'

echo ""
echo "=========================================================================="
echo "Test complete! Check if error messages are more detailed now."
echo ""
echo "The deployment with improved error logging is live at:"
echo "https://mcp-client.owlfort.io"
echo ""
echo "You can now run the full OAuth script and see detailed error messages:"
echo "  ./scripts/mcp-oauth-demo.sh"
