#!/bin/bash
###############################################################################
# MCP OAuth Flow Demo Script (Bash + curl)
#
# This script demonstrates the complete OAuth flow for MCP servers using curl
# 1. Register OAuth client
# 2. Generate authorization URL
# 3. Exchange authorization code for access token
# 4. Fetch available tools from MCP server
#
# Usage:
#   ./scripts/mcp-oauth-demo.sh
#   ./scripts/mcp-oauth-demo.sh https://mcp.asana.com
###############################################################################

set -e  # Exit on error

# Configuration
API_BASE="${API_SERVER:-https://mcp-client.owlfort.io}"
MCP_SERVER="${1:-https://mcp.asana.com}"
CLIENT_NAME="MCP OAuth Demo Client (Bash)"
REDIRECT_URI="http://localhost:3000/oauth/callback"

# Colors
RESET='\033[0m'
BOLD='\033[1m'
GREEN='\033[32m'
BLUE='\033[34m'
YELLOW='\033[33m'
RED='\033[31m'
CYAN='\033[36m'

# Helper functions
log() {
    echo -e "$1"
}

log_step() {
    log "\n${BOLD}[Step $1/4]${RESET} ${CYAN}$2${RESET}"
}

log_success() {
    log "${GREEN}✓ $1${RESET}"
}

log_error() {
    log "${RED}✗ $1${RESET}"
}

log_info() {
    log "${BLUE}ℹ $1${RESET}"
}

# Open browser
open_browser() {
    local url="$1"
    if command -v open &> /dev/null; then
        open "$url" 2>/dev/null || true
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$url" 2>/dev/null || true
    elif command -v start &> /dev/null; then
        start "$url" 2>/dev/null || true
    else
        log_info "Could not open browser automatically"
        log "\n${BOLD}Please open this URL manually:${RESET}"
        log "${YELLOW}$url${RESET}"
        return 1
    fi
    log_success "Opened browser"
}

# Check dependencies
if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed. Install it with:"
    log "  macOS:  brew install jq"
    log "  Ubuntu: sudo apt-get install jq"
    log "  CentOS: sudo yum install jq"
    exit 1
fi

# Print header
log "\n${BOLD}${CYAN}======================================================================${RESET}"
log "${BOLD}${CYAN}           MCP OAuth Flow - Complete Demo Script (Bash)           ${RESET}"
log "${BOLD}${CYAN}======================================================================${RESET}\n"

log_info "MCP Server: $MCP_SERVER"
log_info "API Base: $API_BASE"
log_info "Client Name: $CLIENT_NAME"
log ""

# Temporary file for responses
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Step 1: Register OAuth Client
log_step 1 "Registering OAuth client"

REGISTRATION_URL="$MCP_SERVER/register"
log_info "Registration endpoint: $REGISTRATION_URL"

REGISTER_RESPONSE=$(curl -s -k -X POST "$API_BASE/mcp/oauth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"registrationUrl\": \"$REGISTRATION_URL\",
        \"redirectUris\": [\"$REDIRECT_URI\"],
        \"clientName\": \"$CLIENT_NAME\",
        \"clientUri\": \"https://github.com/your-org/simple-mcp-client\"
    }")

if [ -z "$REGISTER_RESPONSE" ]; then
    log_error "Registration failed - no response"
    exit 1
fi

CLIENT_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.client_id')
AUTH_METHOD=$(echo "$REGISTER_RESPONSE" | jq -r '.token_endpoint_auth_method')

if [ "$CLIENT_ID" = "null" ] || [ -z "$CLIENT_ID" ]; then
    log_error "Registration failed:"
    echo "$REGISTER_RESPONSE" | jq .
    exit 1
fi

log_success "Client registered successfully!"
log "   Client ID: ${BOLD}$CLIENT_ID${RESET}"
log "   Auth Method: $AUTH_METHOD"

# Step 2: Generate Authorization URL
log_step 2 "Generating authorization URL"

AUTH_URL_RESPONSE=$(curl -s -k -X POST "$API_BASE/mcp/oauth/authorize-url" \
    -H "Content-Type: application/json" \
    -d "{
        \"clientId\": \"$CLIENT_ID\",
        \"redirectUri\": \"$REDIRECT_URI\",
        \"serverUrl\": \"$MCP_SERVER\"
    }")

if [ -z "$AUTH_URL_RESPONSE" ]; then
    log_error "Failed to generate authorization URL"
    exit 1
fi

AUTHORIZATION_URL=$(echo "$AUTH_URL_RESPONSE" | jq -r '.authorizationUrl')
CODE_VERIFIER=$(echo "$AUTH_URL_RESPONSE" | jq -r '.codeVerifier')

if [ "$AUTHORIZATION_URL" = "null" ] || [ -z "$AUTHORIZATION_URL" ]; then
    log_error "Failed to get authorization URL:"
    echo "$AUTH_URL_RESPONSE" | jq .
    exit 1
fi

log_success "Authorization URL generated"

# Step 3: Get User Authorization
log_step 3 "Getting user authorization"

log "\n${BOLD}Opening authorization page in your browser...${RESET}\n"
open_browser "$AUTHORIZATION_URL"

log "\n${BOLD}======================================================================${RESET}"
log "${CYAN}After authorizing, you will be redirected to:${RESET}"
log "${YELLOW}  $REDIRECT_URI?code=AUTHORIZATION_CODE&state=...${RESET}"
log "${BOLD}======================================================================${RESET}\n"

read -p "$(echo -e ${BOLD}Paste the FULL redirect URL here:${RESET} )" REDIRECT_URL

# Extract code from URL using sed (more portable than grep -P)
CODE=$(echo "$REDIRECT_URL" | sed -n 's/.*[?&]code=\([^&]*\).*/\1/p')

# If sed didn't extract anything, maybe user pasted just the code
if [ -z "$CODE" ]; then
    # Clean up the input in case user pasted just the code
    CODE=$(echo "$REDIRECT_URL" | tr -d '[:space:]' | tr -d '\n' | tr -d '\r')
fi

if [ -z "$CODE" ]; then
    log_error "No authorization code found"
    log_error "Please paste the full redirect URL like:"
    log_error "  http://localhost:3000/oauth/callback?code=...&state=..."
    exit 1
fi

# Trim any whitespace
CODE=$(echo "$CODE" | tr -d '[:space:]' | tr -d '\n' | tr -d '\r')

# URL decode the code using Python (more reliable than printf)
CODE=$(python3 -c "import sys; from urllib.parse import unquote; print(unquote(sys.argv[1]))" "$CODE" 2>/dev/null || echo "$CODE")

log_success "Authorization code received"
log "   Code: ${CODE:0:20}... (length: ${#CODE})"

# Check if this is already an Asana access token (format: number:string:string)
if [[ "$CODE" =~ ^[0-9]+:[a-zA-Z0-9]+:[a-zA-Z0-9]+$ ]]; then
    log_info "Detected Asana token format - skipping exchange step"
    ACCESS_TOKEN="$CODE"
    EXPIRES_IN="N/A"

    log_success "Using token directly (already in access token format)!"
    log "\n${BOLD}======================================================================${RESET}"
    log "${BOLD}${GREEN}ACCESS TOKEN:${RESET}"
    log "${YELLOW}$ACCESS_TOKEN${RESET}"
    log "${BOLD}======================================================================${RESET}\n"
else
    # Step 4: Exchange Code for Token
    log_step 4 "Exchanging authorization code for access token"

    TOKEN_RESPONSE=$(curl -s -k -X POST "$API_BASE/mcp/oauth/exchange-token" \
        -H "Content-Type: application/json" \
        -d "{
            \"code\": \"$CODE\",
            \"codeVerifier\": \"$CODE_VERIFIER\",
            \"clientId\": \"$CLIENT_ID\",
            \"redirectUri\": \"$REDIRECT_URI\",
            \"serverUrl\": \"$MCP_SERVER\"
        }")

    if [ -z "$TOKEN_RESPONSE" ]; then
        log_error "Token exchange failed - no response"
        exit 1
    fi

    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
    EXPIRES_IN=$(echo "$TOKEN_RESPONSE" | jq -r '.expires_in // "N/A"')

    if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
        log_error "Token exchange failed:"
        echo "$TOKEN_RESPONSE" | jq .
        exit 1
    fi

    log_success "Access token received!"
    log "\n${BOLD}======================================================================${RESET}"
    log "${BOLD}${GREEN}ACCESS TOKEN:${RESET}"
    log "${YELLOW}$ACCESS_TOKEN${RESET}"
    log "${BOLD}======================================================================${RESET}\n"

    if [ "$EXPIRES_IN" != "N/A" ]; then
        log_info "Token expires in: $EXPIRES_IN seconds"
    fi
fi

# Step 5 (or 4 if we skipped exchange): Fetch Tools
log "\n${BOLD}======================================================================${RESET}"
log "${BOLD}${CYAN}Fetching available tools from MCP server...${RESET}"
log "${BOLD}======================================================================${RESET}\n"

TOOLS_RESPONSE=$(curl -s -k -X POST "$API_BASE/mcp/tools-remote" \
    -H "Content-Type: application/json" \
    -d "{
        \"url\": \"$MCP_SERVER/sse\",
        \"type\": \"sse\",
        \"token\": \"$ACCESS_TOKEN\"
    }")

if [ -z "$TOOLS_RESPONSE" ]; then
    log_error "Failed to fetch tools"
    exit 1
fi

TOOLS_COUNT=$(echo "$TOOLS_RESPONSE" | jq -r '.tools | length')

if [ "$TOOLS_COUNT" = "null" ] || [ "$TOOLS_COUNT" = "0" ]; then
    log_info "No tools found on this server"
else
    log_success "Tools retrieved successfully!"
    log "\n${GREEN}Found $TOOLS_COUNT tool(s):${RESET}\n"

    # Display tools
    echo "$TOOLS_RESPONSE" | jq -r '.tools[] | "\(.name)|\(.description // "No description")"' | while IFS='|' read -r name desc; do
        log "${CYAN}• ${BOLD}$name${RESET}"
        log "${BLUE}  $desc${RESET}"
        log ""
    done
fi

# Success!
log "\n${BOLD}${GREEN}======================================================================${RESET}"
log "${BOLD}${GREEN}                     ✓ ALL STEPS COMPLETED!                     ${RESET}"
log "${BOLD}${GREEN}======================================================================${RESET}\n"

log_info "Token saved for future use. You can now:"
log "${BLUE}  1. Call tools on the MCP server:${RESET}"
log "${YELLOW}     curl -k -X POST $API_BASE/mcp/call-tool \\${RESET}"
log "${YELLOW}       -H 'Content-Type: application/json' \\${RESET}"
log "${YELLOW}       -d '{\"url\":\"$MCP_SERVER/sse\",\"type\":\"sse\",\"token\":\"<TOKEN>\",\"toolName\":\"<TOOL_NAME>\",\"arguments\":{}}'${RESET}"
log ""
log "${BLUE}  2. Refresh tool list:${RESET}"
log "${YELLOW}     curl -k -X POST $API_BASE/mcp/tools-remote \\${RESET}"
log "${YELLOW}       -H 'Content-Type: application/json' \\${RESET}"
log "${YELLOW}       -d '{\"url\":\"$MCP_SERVER/sse\",\"type\":\"sse\",\"token\":\"<TOKEN>\"}'${RESET}"
log ""
