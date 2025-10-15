import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MCPToolsResponseDto {
  @ApiProperty({
    description: 'Whether the connection was successful',
    example: true,
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: 'The MCP server host',
    example: 'https://mcp.example.com',
  })
  host?: string;

  @ApiPropertyOptional({
    description: 'The MCP server URL',
    example: 'https://mcp.example.com/sse',
  })
  url?: string;

  @ApiPropertyOptional({
    description: 'Number of tools found',
    example: 9,
  })
  toolCount?: number;

  @ApiProperty({
    description: 'Array of MCP tools',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'create_entities' },
        description: { type: 'string', example: 'Create entities in the knowledge graph' },
        inputSchema: { type: 'object' },
      },
    },
  })
  tools!: Tool[];

  @ApiPropertyOptional({
    description: 'Error message if connection failed',
    example: 'Connection timeout',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Additional message or information',
    example: 'Successfully authenticated with Asana MCP!',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Server information',
    type: 'object',
    properties: {
      name: { type: 'string' },
      version: { type: 'string' },
    },
  })
  serverInfo?: {
    name?: string;
    version?: string;
  };
}

export class MCPToolCallResponseDto {
  @ApiProperty({
    description: 'Whether the tool call was successful',
    example: true,
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: 'Result from the tool execution',
    type: 'object',
    additionalProperties: true,
    example: {
      content: [
        {
          type: 'text',
          text: 'Successfully created entity',
        },
      ],
    },
  })
  result?: any;

  @ApiPropertyOptional({
    description: 'Error message if tool call failed',
    example: 'Tool execution failed',
  })
  error?: string;
}
