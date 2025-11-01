#!/bin/bash

# Quick token test script
# Usage: ./test-token.sh YOUR_TOKEN

TOKEN="${1:-1211621829218860:kfyomdWAUC4HLKF3:eo8A2FDJbGv9uoOxbNvZxRm1VeGxMZNQ}"
API_BASE="https://mcp-client.owlfort.io"

echo "Testing Asana MCP token..."
echo "Token: ${TOKEN:0:20}..."
echo ""
echo "Making request (this may take 30-90 seconds on first connection)..."
echo ""

START_TIME=$(date +%s)

RESPONSE=$(curl -s --max-time 120 "$API_BASE/mcp/tools-remote" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://mcp.asana.com/sse\",
    \"type\": \"sse\",
    \"token\": \"$TOKEN\"
  }")

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Response received in ${DURATION}s:"
echo ""

if echo "$RESPONSE" | jq -e '.tools' > /dev/null 2>&1; then
  TOOL_COUNT=$(echo "$RESPONSE" | jq '.tools | length')
  echo "✅ SUCCESS! Found $TOOL_COUNT tools:"
  echo ""
  echo "$RESPONSE" | jq -r '.tools[] | "  - \(.name): \(.description // "No description")"'
else
  echo "❌ FAILED:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi
