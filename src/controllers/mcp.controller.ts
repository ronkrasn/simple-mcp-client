import { Controller, Post, Get, Body, Query, Res, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { MCPService } from '../services/mcp.service.js';
import { ConnectMCPDto, CallToolDto } from '../dto/connect-mcp.dto.js';
import { MCPToolsResponseDto, MCPToolCallResponseDto } from '../dto/mcp-response.dto.js';

@ApiTags('mcp')
@Controller('mcp')
export class MCPController {
  private readonly logger = new Logger(MCPController.name);

  constructor(private readonly mcpService: MCPService) {}

  @Post('tools')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get tools from MCP server',
    description: 'Connects to an MCP server and retrieves all available tools. Supports SSE, HTTP Stream, and stdio transports.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved tools from MCP server',
    type: MCPToolsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiBody({
    type: ConnectMCPDto,
    examples: {
      'stdio-example': {
        summary: 'stdio connection (local MCP server)',
        value: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-memory'],
        },
      },
      'sse-example': {
        summary: 'SSE connection',
        value: {
          url: 'https://mcp.asana.com/sse',
          type: 'sse',
          token: 'your-access-token',
        },
      },
      'http-example': {
        summary: 'HTTP Stream connection',
        value: {
          url: 'https://api.example.com/mcp',
          type: 'httpStream',
        },
      },
    },
  })
  async getTools(@Body() connectDto: ConnectMCPDto): Promise<MCPToolsResponseDto> {
    this.logger.log('Received request to fetch MCP tools');
    return this.mcpService.getTools(connectDto);
  }

  @Post('tools-remote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get tools from remote MCP server (using mcp-remote)',
    description: 'Connects to a remote MCP server using mcp-remote. This method works reliably with Asana MCP and other remote SSE servers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved tools from MCP server',
    type: MCPToolsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiBody({
    type: ConnectMCPDto,
    examples: {
      'asana-mcp': {
        summary: 'Asana MCP server with OAuth token',
        value: {
          url: 'https://mcp.asana.com/sse',
          type: 'sse',
          token: '1211621829218860:6X5qcqDT7OlE6a6w:y6sKmQMOp7fpA0nN8Ea0Njby9gsSimSX',
        },
      },
    },
  })
  async getToolsRemote(@Body() connectDto: ConnectMCPDto): Promise<MCPToolsResponseDto> {
    this.logger.log('Received request to fetch MCP tools via mcp-remote');
    return this.mcpService.getToolsWithMcpRemote(connectDto);
  }

  @Post('call-tool')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Call a tool on MCP server',
    description: 'Executes a specific tool on an MCP server with the provided arguments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tool executed successfully',
    type: MCPToolCallResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters or tool execution failed',
  })
  @ApiBody({
    schema: {
      allOf: [
        { $ref: '#/components/schemas/ConnectMCPDto' },
        { $ref: '#/components/schemas/CallToolDto' },
      ],
    },
    examples: {
      example: {
        summary: 'Create entities in knowledge graph',
        value: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-memory'],
          toolName: 'create_entities',
          arguments: {
            entities: [
              {
                name: 'Alice',
                entityType: 'person',
                observations: ['Software engineer', 'Works at Tech Corp'],
              },
            ],
          },
        },
      },
    },
  })
  async callTool(
    @Body() body: ConnectMCPDto & CallToolDto,
  ): Promise<MCPToolCallResponseDto> {
    this.logger.log(`Received request to call tool: ${body.toolName}`);

    const { toolName, arguments: args, ...config } = body;

    return this.mcpService.callTool(config, toolName, args);
  }

  @Post('test-multiple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test multiple MCP servers',
    description: 'Tests connectivity to multiple MCP servers simultaneously and returns their available tools.',
  })
  @ApiResponse({
    status: 200,
    description: 'Results from testing all servers',
    type: [MCPToolsResponseDto],
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        servers: {
          type: 'array',
          items: { $ref: '#/components/schemas/ConnectMCPDto' },
        },
      },
      required: ['servers'],
    },
    examples: {
      example: {
        summary: 'Test multiple servers',
        value: {
          servers: [
            {
              url: 'https://mcp.asana.com/sse',
              type: 'sse',
              token: 'your-token',
            },
            {
              type: 'stdio',
              command: 'npx',
              args: ['-y', '@modelcontextprotocol/server-memory'],
            },
          ],
        },
      },
    },
  })
  async testMultipleServers(
    @Body() body: { servers: ConnectMCPDto[] },
  ): Promise<MCPToolsResponseDto[]> {
    this.logger.log(`Received request to test ${body.servers.length} MCP servers`);
    return this.mcpService.testMultipleServers(body.servers);
  }

  @Post('oauth/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register a new OAuth client with MCP server',
    description: 'Dynamically registers a new OAuth client with the MCP server (RFC 7591). Required before starting OAuth flow.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client registered successfully',
    schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        client_secret: { type: 'string' },
        registration_access_token: { type: 'string' },
        registration_client_uri: { type: 'string' },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        registrationUrl: {
          type: 'string',
          example: 'https://mcp.asana.com/register',
          description: 'OAuth registration endpoint URL'
        },
        redirectUris: {
          type: 'array',
          items: { type: 'string' },
          example: ['http://localhost:3000/oauth/callback'],
          description: 'Array of redirect URIs for OAuth callback'
        },
        clientName: {
          type: 'string',
          example: 'My MCP Client',
          description: 'Name for your client application'
        },
        clientUri: {
          type: 'string',
          example: 'https://github.com/your-org/your-app',
          description: 'Homepage URL for your client application'
        },
      },
      required: ['registrationUrl', 'redirectUris'],
    },
  })
  async registerOAuthClient(
    @Body()
    body: {
      registrationUrl: string;
      redirectUris: string[];
      clientName?: string;
      clientUri?: string;
    },
  ) {
    this.logger.log('Registering new OAuth client');
    return this.mcpService.registerOAuthClient(
      body.registrationUrl,
      body.redirectUris,
      body.clientName,
      body.clientUri,
    );
  }

  @Get('oauth/start')
  @ApiOperation({
    summary: '[DEPRECATED] Use /oauth/register instead',
    description: 'This endpoint is deprecated. Use POST /oauth/register to dynamically register a client, then use /oauth/authorize-url.',
  })
  @ApiQuery({ name: 'clientId', required: true, example: '38TvGGPlI0PCzc0u', description: 'Your MCP Client ID (from registration)' })
  @ApiQuery({ name: 'clientSecret', required: true, example: 'bkRBZmZdTsJaiJKLMHzIb3wZd2DvPO9A', description: 'Your MCP Client Secret (from registration)' })
  async startOAuthFlow(
    @Query('clientId') clientId: string,
    @Query('clientSecret') clientSecret: string,
    @Res() res: Response,
  ) {
    this.logger.log(`[DEPRECATED] Starting MCP OAuth flow for clientId: ${clientId}`);

    // Store credentials in a temporary in-memory store (for callback)
    // In production, use a proper session store or database
    const g = global as any;
    g.oauthTemp = g.oauthTemp || {};
    const sessionId = Math.random().toString(36).substring(7);
    g.oauthTemp[sessionId] = { clientId, clientSecret };

    const redirectUri = 'http://localhost:3000/mcp/oauth/callback';
    // Use MCP OAuth endpoints (not standard Asana OAuth)
    const authUrl = `https://mcp.asana.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${sessionId}`;

    res.redirect(authUrl);
  }

  @Get('oauth/callback')
  @ApiOperation({
    summary: 'OAuth callback endpoint',
    description: 'Handles the OAuth callback from Asana and exchanges code for access token.',
  })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'error', required: false })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (error) {
      this.logger.error(`OAuth error: ${error}`);
      return res.send(`<h1>OAuth Error</h1><p>${error}</p>`);
    }

    if (!code) {
      return res.send('<h1>Error</h1><p>No authorization code received</p>');
    }

    // Retrieve stored credentials from session
    const g = global as any;
    const oauthTemp = g.oauthTemp || {};
    const session = oauthTemp[state];

    if (!session) {
      return res.send('<h1>Error</h1><p>Invalid session. Please start the OAuth flow again.</p>');
    }

    const { clientId, clientSecret } = session;

    this.logger.log('Received OAuth callback, exchanging code for token');

    try {
      // Exchange code for token using MCP token endpoint
      const tokenResponse = await this.mcpService.exchangeAuthorizationCode(
        'https://mcp.asana.com',
        code,
        undefined, // no code verifier for standard OAuth
        clientId,
        clientSecret,
        'http://localhost:3000/mcp/oauth/callback',
        'https://mcp.asana.com/token',  // Use MCP token endpoint, not Asana's
      );

      const accessToken = tokenResponse.access_token;

      // Clean up session
      delete oauthTemp[state];

      this.logger.log('Successfully obtained access token');

      // Return token to user
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Success</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .token { background: #f4f4f4; padding: 15px; border-radius: 5px; word-break: break-all; margin: 20px 0; }
            .copy-btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
            .copy-btn:hover { background: #45a049; }
          </style>
        </head>
        <body>
          <h1>✅ OAuth Success!</h1>
          <p>Your ASANA_ACCESS_TOKEN is:</p>
          <div class="token" id="token">${accessToken}</div>
          <button class="copy-btn" onclick="copyToken()">📋 Copy Token</button>
          <p><strong>Next steps:</strong></p>
          <ol>
            <li>Copy the token above</li>
            <li>Use it in your API calls to <code>POST /mcp/tools</code></li>
            <li>Example: <code>{ "url": "https://mcp.asana.com/sse", "type": "sse", "token": "YOUR_TOKEN" }</code></li>
          </ol>
          <script>
            function copyToken() {
              const token = document.getElementById('token').textContent;
              navigator.clipboard.writeText(token).then(() => {
                alert('Token copied to clipboard!');
              });
            }
          </script>
        </body>
        </html>
      `);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to exchange token: ${error.message}`, error.stack);
      res.send(`<h1>Error</h1><p>Failed to exchange authorization code: ${error.message}</p>`);
    }
  }

  @Post('oauth/authorize-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate OAuth authorization URL (API)',
    description: 'Generates the authorization URL to initiate OAuth flow for Asana MCP server (for programmatic use).',
  })
  @ApiResponse({
    status: 200,
    description: 'Authorization URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        authorizationUrl: { type: 'string' },
        codeVerifier: { type: 'string' },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', example: '1211623437527998' },
        redirectUri: { type: 'string', example: 'http://localhost:3000/oauth/callback' },
        serverUrl: { type: 'string', example: 'https://mcp.asana.com' },
        oauthAuthUrl: { type: 'string', example: 'https://app.asana.com/-/oauth_authorize', description: 'Custom OAuth authorization URL (e.g., for Asana)' },
        oauthScopes: { type: 'string', example: 'default openid email', description: 'Space-separated OAuth scopes' },
      },
      required: ['clientId', 'redirectUri', 'serverUrl'],
    },
  })
  async getAuthorizationUrl(
    @Body() body: {
      clientId: string;
      redirectUri: string;
      serverUrl: string;
      oauthAuthUrl?: string;
      oauthScopes?: string;
    },
  ) {
    this.logger.log('Generating OAuth authorization URL');
    return this.mcpService.generateAuthorizationUrl(
      body.serverUrl,
      body.clientId,
      body.redirectUri,
      body.oauthAuthUrl,
      body.oauthScopes,
    );
  }

  @Post('oauth/exchange-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange OAuth authorization code for access token',
    description: 'Exchanges the authorization code received from OAuth callback for an access token. Works with dynamically registered clients (no secret needed) or standard OAuth clients.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token exchanged successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        token_type: { type: 'string' },
        expires_in: { type: 'number' },
        refresh_token: { type: 'string' },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Authorization code from OAuth callback' },
        codeVerifier: { type: 'string', description: 'PKCE code verifier (required for MCP OAuth)' },
        clientId: { type: 'string', description: 'Client ID from registration' },
        clientSecret: { type: 'string', description: 'Client secret (optional for public clients registered with token_endpoint_auth_method=none)' },
        redirectUri: { type: 'string', description: 'Redirect URI used during authorization' },
        serverUrl: { type: 'string', example: 'https://mcp.asana.com', description: 'MCP server base URL' },
        oauthTokenUrl: { type: 'string', example: 'https://app.asana.com/-/oauth_token', description: 'Custom OAuth token URL (e.g., for standard Asana OAuth)' },
      },
      required: ['code', 'clientId', 'redirectUri', 'serverUrl'],
    },
  })
  async exchangeToken(
    @Body()
    body: {
      code: string;
      codeVerifier?: string;
      clientId: string;
      clientSecret?: string;
      redirectUri: string;
      serverUrl: string;
      oauthTokenUrl?: string;
    },
  ) {
    this.logger.log('Exchanging OAuth authorization code for token');
    return this.mcpService.exchangeAuthorizationCode(
      body.serverUrl,
      body.code,
      body.codeVerifier,
      body.clientId,
      body.clientSecret,
      body.redirectUri,
      body.oauthTokenUrl,
    );
  }
}
