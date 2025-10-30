#!/usr/bin/env tsx
/**
 * Test MCP Tools Script
 *
 * Uses the saved OAuth token to fetch available tools from MCP server
 *
 * Usage:
 *   npm run test-tools
 */

import * as fs from 'fs/promises';

// Disable SSL certificate verification for self-signed certificates
// This is needed for development with self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : '';
  console.log(`${colorCode}${message}${colors.reset}`);
}

interface TokenData {
  access_token: string;
  client_id: string;
  mcp_server: string;
  expires_at?: number;
  created_at: string;
}

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface ToolsResponse {
  success: boolean;
  url?: string;
  toolCount?: number;
  tools?: Tool[];
  error?: string;
}

async function loadToken(): Promise<TokenData> {
  try {
    const data = await fs.readFile('.mcp-token.json', 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(
      'Token file not found. Please run "npm run oauth" first to authenticate.'
    );
  }
}

async function getTools(tokenData: TokenData): Promise<ToolsResponse> {
  const API_SERVER = process.env.API_SERVER || 'https://localhost:3000';
  const url = `${API_SERVER}/mcp/tools-remote`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: `${tokenData.mcp_server}/sse`,
      type: 'sse',
      token: tokenData.access_token,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return await response.json() as ToolsResponse;
}

async function main() {
  log('\n' + colors.bright + colors.cyan + '='.repeat(70) + colors.reset);
  log(colors.bright + '                    MCP Tools Test                            ' + colors.reset, 'cyan');
  log(colors.cyan + '='.repeat(70) + colors.reset + '\n');

  try {
    // Load token
    log('Loading saved token...', 'blue');
    const tokenData = await loadToken();

    // Check expiration
    if (tokenData.expires_at && Date.now() > tokenData.expires_at) {
      log('⚠ Warning: Token may be expired', 'yellow');
    }

    log(`✓ Token loaded (from ${tokenData.created_at})`, 'green');
    log(`  MCP Server: ${tokenData.mcp_server}`);
    log(`  Client ID: ${tokenData.client_id}\n`);

    // Fetch tools
    log('Fetching tools from MCP server...', 'blue');
    const result = await getTools(tokenData);

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch tools');
    }

    log(`✓ Successfully retrieved ${result.toolCount} tools!\n`, 'green');

    // Display tools
    log(colors.bright + 'Available Tools:' + colors.reset + '\n');

    result.tools?.forEach((tool, index) => {
      log(`${colors.cyan}${index + 1}. ${colors.bright}${tool.name}${colors.reset}`);
      if (tool.description) {
        log(`   ${tool.description}`, 'blue');
      }
      log('');
    });

    // Summary
    log(colors.bright + '='.repeat(70) + colors.reset);
    log(`${colors.green}Total: ${result.toolCount} tools available${colors.reset}\n`);

    // Save tools list
    await fs.writeFile(
      '.mcp-tools.json',
      JSON.stringify(result.tools, null, 2)
    );
    log(`Tools list saved to ${colors.yellow}.mcp-tools.json${colors.reset}`, 'green');
    log('');

  } catch (error) {
    log('\n' + colors.red + '✗ Error:' + colors.reset, 'red');
    if (error instanceof Error) {
      log(error.message, 'red');
    }
    log('');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
