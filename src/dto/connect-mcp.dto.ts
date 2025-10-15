import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MCPTransportType {
  SSE = 'sse',
  HTTP_STREAM = 'httpStream',
  STDIO = 'stdio',
}

export class ConnectMCPDto {
  @ApiPropertyOptional({
    description: 'MCP server URL (required for SSE/HTTP connections)',
    example: 'https://mcp.example.com/sse',
  })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Alternative to url field',
    example: 'https://mcp.example.com',
  })
  @IsString()
  @IsOptional()
  host?: string;

  @ApiPropertyOptional({
    description: 'Authentication token for the MCP server',
    example: 'your-access-token',
  })
  @IsString()
  @IsOptional()
  token?: string;

  @ApiPropertyOptional({
    description: 'OAuth Client ID',
    example: '1211623437527998',
  })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'OAuth Client Secret',
    example: 'your-client-secret',
  })
  @IsString()
  @IsOptional()
  clientSecret?: string;

  @ApiPropertyOptional({
    description: 'OAuth Authorization URL (for custom OAuth flows, e.g., Asana)',
    example: 'https://app.asana.com/-/oauth_authorize',
  })
  @IsString()
  @IsOptional()
  oauthAuthUrl?: string;

  @ApiPropertyOptional({
    description: 'OAuth Token URL (for custom OAuth flows, e.g., Asana)',
    example: 'https://app.asana.com/-/oauth_token',
  })
  @IsString()
  @IsOptional()
  oauthTokenUrl?: string;

  @ApiPropertyOptional({
    description: 'OAuth Redirect URI',
    example: 'http://localhost:3000/oauth/callback',
  })
  @IsString()
  @IsOptional()
  redirectUri?: string;

  @ApiPropertyOptional({
    description: 'OAuth Scopes (space-separated)',
    example: 'default openid email',
  })
  @IsString()
  @IsOptional()
  oauthScopes?: string;

  @ApiPropertyOptional({
    description: 'Custom headers for the connection (e.g., {"ASANA_ACCESS_TOKEN": "your-token"})',
    type: 'object',
    additionalProperties: true,
    example: { 'ASANA_ACCESS_TOKEN': 'your-token' },
  })
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Connection transport type',
    enum: MCPTransportType,
    default: MCPTransportType.HTTP_STREAM,
    example: MCPTransportType.SSE,
  })
  @IsEnum(MCPTransportType)
  @IsOptional()
  type?: MCPTransportType;

  @ApiPropertyOptional({
    description: 'Command to execute for stdio connections (e.g., "npx")',
    example: 'npx',
  })
  @IsString()
  @IsOptional()
  command?: string;

  @ApiPropertyOptional({
    description: 'Arguments for the stdio command',
    type: [String],
    example: ['-y', '@modelcontextprotocol/server-memory'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  args?: string[];

  @ApiPropertyOptional({
    description: 'Environment variables for stdio connections',
    type: 'object',
    additionalProperties: true,
    example: { NODE_ENV: 'production' },
  })
  @IsOptional()
  env?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Working directory for stdio connections',
    example: '/path/to/directory',
  })
  @IsString()
  @IsOptional()
  cwd?: string;
}

export class CallToolDto {
  @ApiProperty({
    description: 'Name of the tool to call',
    example: 'create_entities',
  })
  @IsString()
  toolName!: string;

  @ApiPropertyOptional({
    description: 'Arguments to pass to the tool',
    type: 'object',
    additionalProperties: true,
    example: {
      entities: [
        {
          name: 'John Doe',
          entityType: 'person',
          observations: ['Software engineer'],
        },
      ],
    },
  })
  @IsOptional()
  arguments?: Record<string, unknown>;
}
