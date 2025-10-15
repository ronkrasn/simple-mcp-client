#!/bin/bash

# Test script to retrieve Asana MCP tools using mcp-remote-client
# This script runs the command and captures all output to a file

TOKEN="1211621829218860:KX2zdYg3GAyAEerr:s2TH7fjiJa7UuxOZmUYGbuTzZ3n2CCZa"
URL="https://mcp.asana.com/sse?token=${TOKEN}"

echo "Starting mcp-remote-client..."
echo "URL: $URL"
echo ""

# Run mcp-remote-client with a timeout
# Use script command to simulate a TTY so it outputs tools
timeout 10s script -q /dev/null npx -y -p mcp-remote@latest mcp-remote-client "$URL" --transport sse-only 2>&1 | tee /tmp/mcp-asana-output.txt

echo ""
echo "===== Output saved to /tmp/mcp-asana-output.txt ====="
