import { Injectable, Logger } from '@nestjs/common';
import { MCPClient } from 'mcp-client';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  startAuthorization,
  exchangeAuthorization,
  discoverAuthorizationServerMetadata,
} from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConnectMCPDto } from '../dto/connect-mcp.dto.js';
import { MCPToolsResponseDto, MCPToolCallResponseDto } from '../dto/mcp-response.dto.js';
import { spawn } from 'child_process';

@Injectable()
export class MCPService {
  private readonly logger = new Logger(MCPService.name);
  private readonly clientInfo = {
    name: 'simple-mcp-client-nestjs',
    version: '1.0.0',
  };

  /**
   * Connect to an MCP server and get available tools
   */
  async getTools(config: ConnectMCPDto): Promise<MCPToolsResponseDto> {
    const url = config.url || config.host;
    const type = config.type || 'httpStream';

    this.logger.log(`Connecting to MCP server: ${url || config.command} (type: ${type})`);

    try {
      // Create MCP client
      const client = new MCPClient(this.clientInfo);

      // Connect based on type
      if (type === 'stdio') {
        if (!config.command) {
          throw new Error('command is required for stdio connections');
        }

        await client.connect({
          type: 'stdio',
          command: config.command,
          args: config.args || [],
          env: config.env,
          cwd: config.cwd,
        });
      } else if (type === 'sse') {
        if (!url) {
          throw new Error('url or host is required for SSE connections');
        }

        // If token or custom headers are provided, use SDK directly
        if (config.token || config.headers) {
          const sdkClient = new Client(this.clientInfo, {});

          // Create custom fetch that adds authentication headers
          const customFetch: typeof fetch = async (input, init) => {
            const headers = new Headers(init?.headers);

            // Add custom headers if provided
            if (config.headers) {
              Object.entries(config.headers).forEach(([key, value]) => {
                headers.set(key, value);
              });
            }

            // Add Authorization Bearer token if provided and no custom headers
            if (config.token && !config.headers) {
              headers.set('Authorization', `Bearer ${config.token!}`);
            }

            return fetch(input, {
              ...init,
              headers,
            });
          };

          // For Asana MCP, try adding token as URL parameter
          const sseUrl = new URL(url);
          if (config.token) {
            sseUrl.searchParams.set('token', config.token);
          }

          const transport = new SSEClientTransport(sseUrl, {
            fetch: customFetch,
          });

          await sdkClient.connect(transport);

          // Get tools
          const response = await sdkClient.request(
            { method: 'tools/list' },
            { tools: [] } as any,
          );
          const tools = response.tools || [];

          this.logger.log(`Successfully retrieved ${tools.length} tools`);
          await transport.close();

          return {
            success: true,
            host: config.host,
            url: url,
            toolCount: tools.length,
            tools: tools,
          };
        } else {
          await client.connect({
            type: 'sse',
            url: url,
          });
        }
      } else {
        // Default to httpStream
        if (!url) {
          throw new Error('url or host is required for HTTP connections');
        }

        await client.connect({
          type: 'httpStream',
          url: url,
        });
      }

      // Get all available tools
      const tools = await client.getAllTools();

      this.logger.log(`Successfully retrieved ${tools.length} tools`);

      // Close the connection
      await client.close();

      return {
        success: true,
        host: config.host,
        url: url,
        toolCount: tools.length,
        tools: tools,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to connect to MCP server: ${err.message}`, err.stack);

      return {
        success: false,
        host: config.host,
        url: url,
        error: (error as Error).message,
        tools: [],
        toolCount: 0,
      };
    }
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(
    config: ConnectMCPDto,
    toolName: string,
    args?: Record<string, unknown>,
  ): Promise<MCPToolCallResponseDto> {
    const url = config.url || config.host;
    const type = config.type || 'httpStream';

    this.logger.log(`Calling tool '${toolName}' on MCP server: ${url || config.command}`);

    try {
      const client = new MCPClient(this.clientInfo);

      // Connect
      if (type === 'stdio' && config.command) {
        await client.connect({
          type: 'stdio',
          command: config.command,
          args: config.args || [],
          env: config.env,
          cwd: config.cwd,
        });
      } else if (type === 'sse' && url) {
        if (config.token || config.headers) {
          const sdkClient = new Client(this.clientInfo, {});

          // Create custom fetch that adds authentication headers
          const customFetch: typeof fetch = async (input, init) => {
            const headers = new Headers(init?.headers);

            // Add custom headers if provided
            if (config.headers) {
              Object.entries(config.headers).forEach(([key, value]) => {
                headers.set(key, value);
              });
            }

            // Add Authorization Bearer token if provided and no custom headers
            if (config.token && !config.headers) {
              headers.set('Authorization', `Bearer ${config.token!}`);
            }

            return fetch(input, {
              ...init,
              headers,
            });
          };

          const transport = new SSEClientTransport(new URL(url), {
            fetch: customFetch,
          });

          await sdkClient.connect(transport);

          // Call the tool
          const result = await sdkClient.callTool({
            name: toolName,
            arguments: args,
          });

          this.logger.log(`Successfully called tool '${toolName}'`);
          await transport.close();

          return {
            success: true,
            result: result,
          };
        } else {
          await client.connect({
            type: 'sse',
            url: url,
          });
        }
      } else if (url) {
        await client.connect({
          type: 'httpStream',
          url: url,
        });
      } else {
        throw new Error('Invalid configuration');
      }

      // Call the tool
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      this.logger.log(`Successfully called tool '${toolName}'`);

      // Close the connection
      await client.close();

      return {
        success: true,
        result: result,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to call tool '${toolName}': ${err.message}`, err.stack);

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Test multiple MCP servers
   */
  async testMultipleServers(servers: ConnectMCPDto[]): Promise<MCPToolsResponseDto[]> {
    this.logger.log(`Testing ${servers.length} MCP servers...`);

    const results: MCPToolsResponseDto[] = [];

    for (const server of servers) {
      const result = await this.getTools(server);
      results.push(result);
    }

    return results;
  }

  /**
   * Register a new OAuth client with MCP server (Dynamic Client Registration)
   * Used by MCP Asana and other MCP servers that support RFC 7591
   */
  async registerOAuthClient(
    registrationUrl: string,
    redirectUris: string[],
    clientName: string = 'simple-mcp-client',
    clientUri?: string,
  ): Promise<{
    client_id: string;
    client_secret?: string;
    registration_access_token?: string;
    registration_client_uri?: string;
  }> {
    this.logger.log(`Registering OAuth client at ${registrationUrl}`);

    try {
      const response = await fetch(registrationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirect_uris: redirectUris,
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          client_name: clientName,
          client_uri: clientUri || 'https://github.com/your-org/simple-mcp-client',
          scope: '',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const registration = await response.json() as {
        client_id: string;
        client_secret?: string;
        registration_access_token?: string;
        registration_client_uri?: string;
      };
      this.logger.log(`Successfully registered client: ${registration.client_id}`);

      return registration;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to register OAuth client: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Generate OAuth authorization URL
   * Supports both MCP SDK OAuth discovery and custom OAuth URLs (e.g., Asana)
   */
  async generateAuthorizationUrl(
    serverUrl: string,
    clientId: string,
    redirectUri: string,
    customAuthUrl?: string,
    scopes?: string,
  ): Promise<{ authorizationUrl: string; codeVerifier?: string; state?: string }> {
    this.logger.log(`Generating OAuth authorization URL for ${serverUrl}`);

    try {
      // If custom auth URL is provided, use standard OAuth 2.0 (e.g., Asana)
      if (customAuthUrl) {
        this.logger.log(`Using custom OAuth URL: ${customAuthUrl}`);

        // Generate random state for CSRF protection
        const state = Math.random().toString(36).substring(7);

        // Build authorization URL
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: state,
        });

        // Add scopes if provided
        if (scopes) {
          params.set('scope', scopes);
        }

        const authorizationUrl = `${customAuthUrl}?${params.toString()}`;

        return {
          authorizationUrl,
          state,  // Return state so client can verify it later
        };
      }

      // Otherwise, use MCP SDK OAuth discovery
      const metadata = await discoverAuthorizationServerMetadata(serverUrl);

      if (!metadata) {
        throw new Error('Could not discover OAuth metadata');
      }

      // Start authorization flow
      const result = await startAuthorization(serverUrl, {
        metadata,
        clientInformation: {
          client_id: clientId,
        },
        redirectUrl: redirectUri,
      });

      return {
        authorizationUrl: result.authorizationUrl.toString(),
        codeVerifier: result.codeVerifier,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to generate authorization URL: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   * Supports both MCP SDK OAuth discovery and custom token URLs (e.g., Asana)
   */
  async exchangeAuthorizationCode(
    serverUrl: string,
    code: string,
    codeVerifier: string | undefined,
    clientId: string,
    clientSecret: string | undefined,
    redirectUri: string,
    customTokenUrl?: string,
  ): Promise<OAuthTokens> {
    this.logger.log('Exchanging authorization code for access token');

    try {
      // If custom token URL is provided, use standard OAuth 2.0 (e.g., Asana)
      if (customTokenUrl) {
        this.logger.log(`Using custom token URL: ${customTokenUrl}`);

        // Build request body for standard OAuth 2.0
        const params = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectUri,
          code: code,
        });

        // Only add client_secret if provided (not needed for public clients)
        if (clientSecret) {
          params.set('client_secret', clientSecret);
        }

        // Exchange code for token
        const response = await fetch(customTokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const tokens = (await response.json()) as OAuthTokens;
        this.logger.log('Successfully exchanged authorization code for tokens');
        this.logger.log(`Token response from ${customTokenUrl}:`);
        this.logger.log(JSON.stringify(tokens, null, 2));
        this.logger.log(`Access token format: ${tokens.access_token?.substring(0, 50)}...`);
        this.logger.log(`Token type: ${tokens.token_type}`);
        return tokens;
      }

      // Otherwise, use MCP SDK OAuth discovery
      const metadata = await discoverAuthorizationServerMetadata(serverUrl);

      if (!metadata) {
        throw new Error('Could not discover OAuth metadata');
      }

      if (!codeVerifier) {
        throw new Error('Code verifier is required for MCP SDK OAuth');
      }

      // Build client information - only include secret if provided
      const clientInformation: any = {
        client_id: clientId,
      };

      if (clientSecret) {
        clientInformation.client_secret = clientSecret;
      }

      this.logger.log('Calling exchangeAuthorization with:');
      this.logger.log(`- serverUrl: ${serverUrl}`);
      this.logger.log(`- clientId: ${clientId}`);
      this.logger.log(`- code length: ${code.length}`);
      this.logger.log(`- codeVerifier length: ${codeVerifier.length}`);
      this.logger.log(`- redirectUri: ${redirectUri}`);
      this.logger.log(`- token endpoint: ${metadata.token_endpoint}`);

      // Exchange code for tokens
      const tokens = await exchangeAuthorization(serverUrl, {
        metadata,
        clientInformation,
        authorizationCode: code,
        codeVerifier: codeVerifier,
        redirectUri: redirectUri,
      });

      this.logger.log('Successfully exchanged authorization code for tokens');
      return tokens;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to exchange authorization code: ${err.message}`);
      this.logger.error(`Error stack: ${err.stack}`);

      // Try to extract more information from the error
      if (error && typeof error === 'object') {
        this.logger.error(`Error details: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      }

      throw error;
    }
  }

  /**
   * Get tools using SDK with raw SSE fetch (works around parsing bug)
   */
  async getToolsWithRawSSE(config: ConnectMCPDto): Promise<MCPToolsResponseDto> {
    const url = config.url || config.host;

    if (!url) {
      throw new Error('url or host is required');
    }

    // Build URL with token as query parameter if provided
    let targetUrl = url;
    if (config.token) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('token', config.token);
      targetUrl = urlObj.toString();
    }

    this.logger.log(`Connecting to MCP server via raw SSE: ${url}`);

    try {
      // Create MCP Client
      const client = new Client(this.clientInfo, {});

      // Create SSE transport with token
      const transport = new SSEClientTransport(new URL(targetUrl));

      // Connect to server
      await client.connect(transport);
      this.logger.log('Connected to MCP server successfully');

      // Request tools list - use any type to bypass schema validation
      const response: any = await client.request(
        { method: 'tools/list' },
        {} as any  // Empty schema to bypass validation
      );

      // Extract tools from response
      const tools = response.tools || [];
      this.logger.log(`Successfully retrieved ${tools.length} tools`);

      // Close connection
      await transport.close();

      return {
        success: true,
        host: config.host,
        url: url,
        toolCount: tools.length,
        tools: tools,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to get tools: ${err.message}`, err.stack);

      return {
        success: false,
        host: config.host,
        url: url,
        error: err.message,
        tools: [],
        toolCount: 0,
      };
    }
  }

  /**
   * Get tools using mcp-remote (works with remote SSE servers)
   * Uses JSON-RPC communication via stdin/stdout like the MCP Inspector does
   */
  async getToolsWithMcpRemote(config: ConnectMCPDto): Promise<MCPToolsResponseDto> {
    const url = config.url || config.host;

    if (!url) {
      throw new Error('url or host is required');
    }

    // Build URL with token as query parameter if provided
    let targetUrl = url;
    if (config.token) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('token', config.token);
      targetUrl = urlObj.toString();
    }

    this.logger.log(`Connecting to MCP server using mcp-remote: ${url}`);

    return new Promise((resolve, reject) => {
      let stdoutBuffer = '';
      let stderrBuffer = '';
      let tools: Tool[] = [];
      let initializationComplete = false;
      let foundTools = false;
      let requestId = 1;

      // Spawn mcp-remote-client process with stdin pipe for JSON-RPC communication
      const child = spawn('npx', [
        '-y',
        '-p',
        'mcp-remote@latest',
        'mcp-remote-client',
        targetUrl,
        '--transport',
        'sse-only'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],  // Enable stdin for sending JSON-RPC requests
        env: { ...process.env, NODE_NO_WARNINGS: '1' }
      });

      // Process stdout for JSON-RPC responses
      child.stdout?.on('data', (data) => {
        const output = data.toString();
        stdoutBuffer += output;

        this.logger.debug(`[MCP STDOUT] ${output.trim()}`);

        // Try to parse JSON-RPC responses from stdout
        this.processJsonRpcResponses(stdoutBuffer, (response) => {
          this.logger.log(`Received JSON-RPC response: ${JSON.stringify(response).substring(0, 200)}...`);

          // Check if this is the initialization response
          if (response.result && response.id === 0) {
            initializationComplete = true;
            this.logger.log('MCP initialization complete, requesting tools list...');

            // Send tools/list request
            const toolsRequest = {
              jsonrpc: '2.0',
              id: requestId++,
              method: 'tools/list',
              params: {}
            };

            this.logger.log(`Sending tools/list request: ${JSON.stringify(toolsRequest)}`);
            child.stdin?.write(JSON.stringify(toolsRequest) + '\n');
          }

          // Check if this is the tools/list response
          if (response.result && response.result.tools && Array.isArray(response.result.tools)) {
            tools = response.result.tools;
            foundTools = true;
            this.logger.log(`✅ Found ${tools.length} tools from MCP server`);

            // We got what we need, close the process
            child.kill();
          }
        });
      });

      // Capture stderr and also process JSON-RPC responses (mcp-remote outputs to stderr)
      child.stderr?.on('data', (data) => {
        const output = data.toString();
        stderrBuffer += output;
        this.logger.debug(`[MCP STDERR] ${output.trim()}`);

        // Also try to parse JSON-RPC responses from stderr (mcp-remote outputs here)
        this.processJsonRpcResponses(stderrBuffer, (response) => {
          this.logger.log(`Received JSON-RPC response from stderr: ${JSON.stringify(response).substring(0, 200)}...`);

          // Check if this is the tools/list response
          if (response.result && response.result.tools && Array.isArray(response.result.tools)) {
            tools = response.result.tools;
            foundTools = true;
            this.logger.log(`✅ Found ${tools.length} tools from MCP server (via stderr)`);

            // We got what we need, close the process
            child.kill();
          }
        });
      });

      // Handle process exit
      child.on('close', (code) => {
        setTimeout(() => {
          if (foundTools) {
            this.logger.log(`Successfully retrieved ${tools.length} tools via mcp-remote`);
            resolve({
              success: true,
              host: config.host,
              url: url,
              toolCount: tools.length,
              tools: tools,
            });
          } else if (initializationComplete) {
            // Connected but didn't get tools
            this.logger.warn('Connected to MCP server but did not receive tools list');
            resolve({
              success: false,
              host: config.host,
              url: url,
              error: 'Connected successfully but tools/list request returned no tools',
              tools: [],
              toolCount: 0,
            });
          } else {
            const error = stderrBuffer || stdoutBuffer || `Process exited with code ${code}`;
            this.logger.error(`MCP Remote failed: ${error}`);
            resolve({
              success: false,
              host: config.host,
              url: url,
              error: error.substring(0, 500), // Limit error message length
              tools: [],
              toolCount: 0,
            });
          }
        }, 500);
      });

      // Handle errors
      child.on('error', (error) => {
        this.logger.error(`Failed to spawn mcp-remote: ${error.message}`);
        resolve({
          success: false,
          host: config.host,
          url: url,
          error: error.message,
          tools: [],
          toolCount: 0,
        });
      });

      // Send initialize request when process starts
      // Give it a moment to start up
      setTimeout(() => {
        const initRequest = {
          jsonrpc: '2.0',
          id: 0,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: this.clientInfo
          }
        };

        this.logger.log(`Sending initialize request: ${JSON.stringify(initRequest)}`);
        child.stdin?.write(JSON.stringify(initRequest) + '\n');
      }, 1000);

      // Set timeout (90 seconds for initial connection - Asana MCP can be slow)
      setTimeout(() => {
        if (!child.killed) {
          this.logger.warn('MCP Remote timeout - killing process after 90s');
          child.kill();
          if (!foundTools) {
            resolve({
              success: false,
              host: config.host,
              url: url,
              error: 'Connection timeout after 90 seconds - Asana MCP server did not respond',
              tools: [],
              toolCount: 0,
            });
          }
        }
      }, 90000);
    });
  }

  /**
   * Helper method to parse JSON-RPC responses from a buffer
   * Handles both single-line and multi-line JSON from mcp-remote
   */
  private processJsonRpcResponses(buffer: string, callback: (response: any) => void): void {
    // Try to find "Received message:" pattern followed by JSON (mcp-remote outputs this)
    const receivedIdx = buffer.indexOf('Received message:');
    if (receivedIdx !== -1) {
      // Find the first { after "Received message:"
      const jsonStart = buffer.indexOf('{', receivedIdx);
      if (jsonStart !== -1) {
        // Count braces to find the matching closing brace
        let braceCount = 0;
        let jsonEnd = -1;

        for (let i = jsonStart; i < buffer.length; i++) {
          if (buffer[i] === '{') braceCount++;
          else if (buffer[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }

        if (jsonEnd !== -1) {
          const jsonStr = buffer.substring(jsonStart, jsonEnd);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.jsonrpc === '2.0') {
              callback(parsed);
              return;
            }
          } catch (e) {
            // Not complete or valid JSON yet
          }
        }
      }
    }

    // Also try line-by-line parsing for single-line JSON-RPC messages
    const lines = buffer.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('{')) {
        continue;
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.jsonrpc === '2.0') {
          callback(parsed);
        }
      } catch (e) {
        // Not a complete JSON object yet, continue
      }
    }
  }
}
