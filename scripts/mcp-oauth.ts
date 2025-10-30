#!/usr/bin/env tsx
/**
 * MCP OAuth Helper Script
 *
 * Automates the OAuth flow for MCP servers:
 * 1. Registers a new OAuth client
 * 2. Generates authorization URL
 * 3. Exchanges authorization code for access token
 *
 * Usage:
 *   npm run oauth
 *   npm run oauth -- --server https://mcp.asana.com
 */

import * as readline from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Disable SSL certificate verification for self-signed certificates
// This is needed for development with self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configuration
const API_SERVER = process.env.API_SERVER || 'https://localhost:3000';
const MCP_SERVER = process.argv.find(arg => arg.startsWith('--server='))?.split('=')[1] || 'https://mcp.asana.com';
const CLIENT_NAME = process.argv.find(arg => arg.startsWith('--name='))?.split('=')[1] || 'MCP CLI Client';
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

interface RegistrationResponse {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
  token_endpoint_auth_method: string;
}

interface AuthUrlResponse {
  authorizationUrl: string;
  codeVerifier: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

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

function logStep(step: number, message: string) {
  log(`\n${colors.bright}[Step ${step}/3]${colors.reset} ${colors.cyan}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ ${message}`, 'blue');
}

// HTTP helper
async function apiCall<T>(endpoint: string, body: any): Promise<T> {
  const url = `${API_SERVER}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to call ${endpoint}: ${error.message}`);
    }
    throw error;
  }
}

// Open URL in browser
async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  let command: string;

  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  try {
    await execAsync(command);
    logSuccess('Opened browser');
  } catch (error) {
    logInfo('Could not open browser automatically');
    log(`\n${colors.bright}Please open this URL manually:${colors.reset}`);
    log(url, 'yellow');
  }
}

// Get user input
function getUserInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Step 1: Register OAuth Client
async function registerClient(): Promise<RegistrationResponse> {
  logStep(1, 'Registering OAuth client');

  const registrationUrl = `${MCP_SERVER}/register`;
  logInfo(`Registering with: ${registrationUrl}`);

  try {
    const response = await apiCall<RegistrationResponse>('/mcp/oauth/register', {
      registrationUrl,
      redirectUris: [REDIRECT_URI],
      clientName: CLIENT_NAME,
      clientUri: 'https://github.com/your-org/simple-mcp-client',
    });

    logSuccess(`Client registered successfully!`);
    log(`   Client ID: ${colors.bright}${response.client_id}${colors.reset}`);
    log(`   Auth Method: ${response.token_endpoint_auth_method}`);

    return response;
  } catch (error) {
    logError(`Registration failed: ${error}`);
    throw error;
  }
}

// Step 2: Generate Authorization URL and get user authorization
async function authorize(clientId: string): Promise<{ code: string; codeVerifier: string }> {
  logStep(2, 'Generating authorization URL');

  try {
    const response = await apiCall<AuthUrlResponse>('/mcp/oauth/authorize-url', {
      clientId,
      redirectUri: REDIRECT_URI,
      serverUrl: MCP_SERVER,
    });

    logSuccess('Authorization URL generated');
    log(`\n${colors.bright}Opening authorization page in your browser...${colors.reset}\n`);

    // Open browser
    await openBrowser(response.authorizationUrl);

    log('\n' + colors.bright + '=' .repeat(70) + colors.reset);
    log('After authorizing in your browser, you will be redirected to:', 'cyan');
    log(`  ${REDIRECT_URI}?code=AUTHORIZATION_CODE&state=...`, 'yellow');
    log('\n' + colors.bright + '=' .repeat(70) + colors.reset + '\n');

    // Get authorization code from user
    const redirectUrl = await getUserInput(
      `${colors.bright}Paste the full redirect URL here:${colors.reset} `
    );

    // Extract code from URL
    const urlParams = new URLSearchParams(redirectUrl.split('?')[1]);
    const code = urlParams.get('code');

    if (!code) {
      throw new Error('No authorization code found in URL');
    }

    logSuccess('Authorization code received');
    log(`   Code: ${code.substring(0, 20)}...`);

    return {
      code,
      codeVerifier: response.codeVerifier,
    };
  } catch (error) {
    logError(`Authorization failed: ${error}`);
    throw error;
  }
}

// Step 3: Exchange code for token
async function exchangeToken(
  clientId: string,
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  logStep(3, 'Exchanging authorization code for access token');

  try {
    const response = await apiCall<TokenResponse>('/mcp/oauth/exchange-token', {
      code,
      codeVerifier,
      clientId,
      redirectUri: REDIRECT_URI,
      serverUrl: MCP_SERVER,
    });

    logSuccess('Access token received!');
    log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
    log(`${colors.bright}YOUR ACCESS TOKEN:${colors.reset}`, 'green');
    log(`${colors.yellow}${response.access_token}${colors.reset}`);
    log(`${colors.bright}${'='.repeat(70)}${colors.reset}\n`);

    if (response.expires_in) {
      logInfo(`Token expires in: ${response.expires_in} seconds`);
    }

    if (response.refresh_token) {
      logInfo('Refresh token received (saved separately)');
    }

    // Save to file
    const tokenData = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      token_type: response.token_type,
      expires_in: response.expires_in,
      expires_at: response.expires_in ? Date.now() + response.expires_in * 1000 : undefined,
      client_id: clientId,
      mcp_server: MCP_SERVER,
      created_at: new Date().toISOString(),
    };

    const fs = await import('fs/promises');
    await fs.writeFile('.mcp-token.json', JSON.stringify(tokenData, null, 2));
    logSuccess('Token saved to .mcp-token.json');

    return response;
  } catch (error) {
    logError(`Token exchange failed: ${error}`);
    throw error;
  }
}

// Main flow
async function main() {
  log('\n' + colors.bright + colors.cyan + '='.repeat(70) + colors.reset);
  log(colors.bright + '                  MCP OAuth Flow - Automated                    ' + colors.reset, 'cyan');
  log(colors.cyan + '='.repeat(70) + colors.reset + '\n');

  logInfo(`MCP Server: ${MCP_SERVER}`);
  logInfo(`API Server: ${API_SERVER}`);
  logInfo(`Client Name: ${CLIENT_NAME}`);
  log('');

  try {
    // Step 1: Register client
    const registration = await registerClient();

    // Step 2: Get authorization
    const { code, codeVerifier } = await authorize(registration.client_id);

    // Step 3: Exchange for token
    const token = await exchangeToken(registration.client_id, code, codeVerifier);

    // Success!
    log('\n' + colors.bright + colors.green + '='.repeat(70) + colors.reset);
    log(colors.bright + '                        ✓ SUCCESS!                              ' + colors.reset, 'green');
    log(colors.green + '='.repeat(70) + colors.reset + '\n');

    logInfo('Next steps:');
    log('  1. Use the token to list available tools:', 'blue');
    log(`     ${colors.yellow}npm run test-tools${colors.reset}`);
    log('');
    log('  2. Or call the API directly:', 'blue');
    log(`     ${colors.yellow}curl -k -X POST ${API_SERVER}/mcp/tools-remote \\${colors.reset}`);
    log(`       ${colors.yellow}-H "Content-Type: application/json" \\${colors.reset}`);
    log(`       ${colors.yellow}-d '{"url":"${MCP_SERVER}/sse","type":"sse","token":"<YOUR_TOKEN>"}'${colors.reset}`);
    log('');

  } catch (error) {
    log('\n' + colors.bright + colors.red + '='.repeat(70) + colors.reset);
    log(colors.bright + '                        ✗ FAILED                                ' + colors.reset, 'red');
    log(colors.red + '='.repeat(70) + colors.reset + '\n');

    if (error instanceof Error) {
      logError(error.message);
    } else {
      logError('Unknown error occurred');
    }

    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
