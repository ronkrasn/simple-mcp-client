#!/usr/bin/env python3
"""
MCP OAuth Flow Demo Script (Python version)

This script demonstrates the complete OAuth flow for MCP servers:
1. Register OAuth client
2. Generate authorization URL
3. Exchange authorization code for access token
4. Fetch available tools from MCP server

Usage:
    python scripts/mcp-oauth-demo.py
    python scripts/mcp-oauth-demo.py --server https://mcp.asana.com
"""

import sys
import json
import subprocess
import platform
import urllib.parse
import argparse
import requests
from typing import Dict, Any, Optional

# Configuration
API_BASE = "https://mcp-client.owlfort.io"
DEFAULT_MCP_SERVER = "https://mcp.asana.com"
CLIENT_NAME = "MCP OAuth Demo Client (Python)"
REDIRECT_URI = "http://localhost:3000/oauth/callback"

# Color codes
class Colors:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    GREEN = '\033[32m'
    BLUE = '\033[34m'
    YELLOW = '\033[33m'
    RED = '\033[31m'
    CYAN = '\033[36m'


def log(message: str, color: str = '') -> None:
    """Print colored message"""
    print(f"{color}{message}{Colors.RESET}")


def log_step(step: int, total: int, message: str) -> None:
    """Print step header"""
    log(f"\n{Colors.BOLD}[Step {step}/{total}]{Colors.RESET} {Colors.CYAN}{message}{Colors.RESET}")


def log_success(message: str) -> None:
    """Print success message"""
    log(f"✓ {message}", Colors.GREEN)


def log_error(message: str) -> None:
    """Print error message"""
    log(f"✗ {message}", Colors.RED)


def log_info(message: str) -> None:
    """Print info message"""
    log(f"ℹ {message}", Colors.BLUE)


def api_call(endpoint: str, body: Dict[str, Any]) -> Dict[str, Any]:
    """Make API call to the MCP server"""
    url = f"{API_BASE}{endpoint}"

    try:
        response = requests.post(
            url,
            json=body,
            headers={'Content-Type': 'application/json'},
            verify=False  # Disable SSL verification for development
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to call {endpoint}: {str(e)}")


def open_browser(url: str) -> None:
    """Open URL in default browser"""
    system = platform.system()

    try:
        if system == 'Darwin':  # macOS
            subprocess.run(['open', url], check=True)
        elif system == 'Windows':
            subprocess.run(['start', url], shell=True, check=True)
        else:  # Linux
            subprocess.run(['xdg-open', url], check=True)
        log_success('Opened browser')
    except subprocess.CalledProcessError:
        log_info('Could not open browser automatically')
        log(f"\n{Colors.BOLD}Please open this URL manually:{Colors.RESET}")
        log(url, Colors.YELLOW)


def register_client(mcp_server: str) -> Dict[str, Any]:
    """Step 1: Register OAuth Client"""
    log_step(1, 4, 'Registering OAuth client')

    registration_url = f"{mcp_server}/register"
    log_info(f"Registration endpoint: {registration_url}")

    response = api_call('/mcp/oauth/register', {
        'registrationUrl': registration_url,
        'redirectUris': [REDIRECT_URI],
        'clientName': CLIENT_NAME,
        'clientUri': 'https://github.com/your-org/simple-mcp-client'
    })

    log_success('Client registered successfully!')
    log(f"   Client ID: {Colors.BOLD}{response['client_id']}{Colors.RESET}")
    log(f"   Auth Method: {response['token_endpoint_auth_method']}")

    return response


def get_authorization_url(client_id: str, mcp_server: str) -> Dict[str, Any]:
    """Step 2: Generate Authorization URL"""
    log_step(2, 4, 'Generating authorization URL')

    response = api_call('/mcp/oauth/authorize-url', {
        'clientId': client_id,
        'redirectUri': REDIRECT_URI,
        'serverUrl': mcp_server
    })

    log_success('Authorization URL generated')
    return response


def get_user_authorization(authorization_url: str) -> str:
    """Step 3: Get authorization code from user"""
    log_step(3, 4, 'Getting user authorization')

    log(f"\n{Colors.BOLD}Opening authorization page in your browser...{Colors.RESET}\n")
    open_browser(authorization_url)

    log('\n' + Colors.BOLD + '=' * 70 + Colors.RESET)
    log('After authorizing, you will be redirected to:', Colors.CYAN)
    log(f"  {REDIRECT_URI}?code=AUTHORIZATION_CODE&state=...", Colors.YELLOW)
    log('\n' + Colors.BOLD + '=' * 70 + Colors.RESET + '\n')

    redirect_url = input(f"{Colors.BOLD}Paste the full redirect URL here:{Colors.RESET} ").strip()

    # Extract code from URL
    parsed_url = urllib.parse.urlparse(redirect_url)
    params = urllib.parse.parse_qs(parsed_url.query)
    code = params.get('code', [None])[0]

    if not code:
        raise Exception('No authorization code found in URL')

    log_success('Authorization code received')
    log(f"   Code: {code[:20]}...")

    return code


def exchange_token(client_id: str, code: str, code_verifier: str, mcp_server: str) -> Dict[str, Any]:
    """Step 4: Exchange code for token"""
    log_step(4, 4, 'Exchanging authorization code for access token')

    response = api_call('/mcp/oauth/exchange-token', {
        'code': code,
        'codeVerifier': code_verifier,
        'clientId': client_id,
        'redirectUri': REDIRECT_URI,
        'serverUrl': mcp_server
    })

    log_success('Access token received!')
    log(f"\n{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    log(f"{Colors.BOLD}ACCESS TOKEN:{Colors.RESET}", Colors.GREEN)
    log(f"{Colors.YELLOW}{response['access_token']}{Colors.RESET}")
    log(f"{Colors.BOLD}{'=' * 70}{Colors.RESET}\n")

    if 'expires_in' in response:
        log_info(f"Token expires in: {response['expires_in']} seconds")

    return response


def fetch_tools(token: str, mcp_server: str) -> Dict[str, Any]:
    """Step 5: Fetch tools from MCP server"""
    log(f"\n{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    log(f"{Colors.BOLD}Fetching available tools from MCP server...{Colors.RESET}", Colors.CYAN)
    log(f"{Colors.BOLD}{'=' * 70}{Colors.RESET}\n")

    try:
        response = api_call('/mcp/tools-remote', {
            'url': f"{mcp_server}/sse",
            'type': 'sse',
            'token': token
        })

        log_success('Tools retrieved successfully!')

        tools = response.get('tools', [])
        if tools:
            log(f"\nFound {len(tools)} tool(s):\n", Colors.GREEN)

            for index, tool in enumerate(tools, 1):
                log(f"{index}. {Colors.BOLD}{tool['name']}{Colors.RESET}", Colors.CYAN)

                if 'description' in tool:
                    log(f"   {tool['description']}", Colors.BLUE)

                if 'inputSchema' in tool and 'properties' in tool['inputSchema']:
                    params = list(tool['inputSchema']['properties'].keys())
                    if params:
                        log(f"   Parameters: {', '.join(params)}", Colors.YELLOW)

                print()
        else:
            log_info('No tools found on this server')

        return response
    except Exception as e:
        log_error(f"Failed to fetch tools: {str(e)}")
        raise


def main():
    """Main flow"""
    # Parse arguments
    parser = argparse.ArgumentParser(description='MCP OAuth Flow Demo')
    parser.add_argument('--server', default=DEFAULT_MCP_SERVER, help='MCP server URL')
    args = parser.parse_args()

    mcp_server = args.server

    # Disable SSL warnings for development
    requests.packages.urllib3.disable_warnings()

    log('\n' + Colors.BOLD + Colors.CYAN + '=' * 70 + Colors.RESET)
    log(Colors.BOLD + '           MCP OAuth Flow - Complete Demo Script            ' + Colors.RESET, Colors.CYAN)
    log(Colors.CYAN + '=' * 70 + Colors.RESET + '\n')

    log_info(f"MCP Server: {mcp_server}")
    log_info(f"API Base: {API_BASE}")
    log_info(f"Client Name: {CLIENT_NAME}")
    print()

    try:
        # Step 1: Register OAuth client
        registration = register_client(mcp_server)

        # Step 2: Get authorization URL
        auth_url_data = get_authorization_url(registration['client_id'], mcp_server)

        # Step 3: Get user authorization
        code = get_user_authorization(auth_url_data['authorizationUrl'])

        # Step 4: Exchange for token
        token_response = exchange_token(
            registration['client_id'],
            code,
            auth_url_data['codeVerifier'],
            mcp_server
        )

        # Step 5: Fetch tools using the token
        tools_response = fetch_tools(token_response['access_token'], mcp_server)

        # Success!
        log('\n' + Colors.BOLD + Colors.GREEN + '=' * 70 + Colors.RESET)
        log(Colors.BOLD + '                     ✓ ALL STEPS COMPLETED!                     ' + Colors.RESET, Colors.GREEN)
        log(Colors.GREEN + '=' * 70 + Colors.RESET + '\n')

        log_info('Token saved for future use. You can now:')
        log('  1. Call tools on the MCP server:', Colors.BLUE)
        log(f"     {Colors.YELLOW}curl -X POST {API_BASE}/mcp/call-tool \\{Colors.RESET}")
        log(f"       {Colors.YELLOW}-H 'Content-Type: application/json' \\{Colors.RESET}")
        log(f"       {Colors.YELLOW}-d '{{\"url\":\"{mcp_server}/sse\",\"type\":\"sse\",\"token\":\"<TOKEN>\",\"toolName\":\"<TOOL_NAME>\",\"arguments\":{{}}}}'{{Colors.RESET}}")
        print()
        log('  2. Refresh tool list:', Colors.BLUE)
        log(f"     {Colors.YELLOW}curl -X POST {API_BASE}/mcp/tools-remote \\{Colors.RESET}")
        log(f"       {Colors.YELLOW}-H 'Content-Type: application/json' \\{Colors.RESET}")
        log(f"       {Colors.YELLOW}-d '{{\"url\":\"{mcp_server}/sse\",\"type\":\"sse\",\"token\":\"<TOKEN>\"}}'{{Colors.RESET}}")
        print()

    except KeyboardInterrupt:
        log('\n\nOperation cancelled by user', Colors.YELLOW)
        sys.exit(1)
    except Exception as e:
        log('\n' + Colors.BOLD + Colors.RED + '=' * 70 + Colors.RESET)
        log(Colors.BOLD + '                         ✗ FAILED                               ' + Colors.RESET, Colors.RED)
        log(Colors.RED + '=' * 70 + Colors.RESET + '\n')

        log_error(str(e))
        sys.exit(1)


if __name__ == '__main__':
    main()
