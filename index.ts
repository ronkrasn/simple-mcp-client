/**
 * Simple MCP Client
 *
 * A straightforward client that connects to MCP servers using the official mcp-client package.
 * Supports multiple transport types: SSE, HTTP Streaming, and stdio.
 */

import { MCPClient } from 'mcp-client';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ServerConfig {
  name?: string;
  url?: string;
  host?: string;
  token?: string;
  type?: 'sse' | 'httpStream' | 'stdio';
  // For stdio connections
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface ToolsResult {
  success: boolean;
  host?: string;
  url?: string;
  toolCount?: number;
  tools: Tool[];
  error?: string;
  serverInfo?: {
    name?: string;
    version?: string;
  };
}

export interface ServerTestConfig extends ServerConfig {
  name: string;
}

export interface TestResult extends ToolsResult {
  name?: string;
}

export class SimpleMCPClient {
  private clientInfo = {
    name: 'simple-mcp-client',
    version: '1.0.0'
  };

  /**
   * Connect to an MCP server and get available tools
   * @param config - Server configuration
   * @returns Promise with list of available tools
   */
  async getTools(config: ServerConfig): Promise<ToolsResult> {
    const url = config.url || config.host;
    const type = config.type || 'httpStream';

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
          cwd: config.cwd
        });
      } else if (type === 'sse') {
        if (!url) {
          throw new Error('url or host is required for SSE connections');
        }

        await client.connect({
          type: 'sse',
          url: url
        });
      } else {
        // Default to httpStream
        if (!url) {
          throw new Error('url or host is required for HTTP connections');
        }

        await client.connect({
          type: 'httpStream',
          url: url
        });
      }

      // Get all available tools
      const tools = await client.getAllTools();

      // Close the connection
      await client.close();

      return {
        success: true,
        host: config.host,
        url: url,
        toolCount: tools.length,
        tools: tools
      };

    } catch (error) {
      return {
        success: false,
        host: config.host,
        url: url,
        error: (error as Error).message,
        tools: [],
        toolCount: 0
      };
    }
  }

  /**
   * Quick test of multiple MCP servers
   */
  async testMultipleServers(servers: ServerTestConfig[]): Promise<TestResult[]> {
    console.log(`🧪 Testing ${servers.length} MCP servers...\n`);

    const results: TestResult[] = [];

    for (const server of servers) {
      const displayName = server.name || server.url || server.host || 'Unknown';
      console.log(`📡 Testing: ${displayName}`);

      const result = await this.getTools(server);
      results.push({ ...result, name: server.name });

      if (result.success) {
        console.log(`✅ Success: ${result.toolCount ?? 0} tools found`);
        result.tools.slice(0, 3).forEach((tool, idx) => {
          console.log(`   ${idx + 1}. ${tool.name || 'Unnamed tool'}`);
        });
        if ((result.toolCount ?? 0) > 3) {
          console.log(`   ... and ${(result.toolCount ?? 0) - 3} more`);
        }
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
      console.log('');
    }

    return results;
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(config: ServerConfig, toolName: string, args?: Record<string, unknown>): Promise<any> {
    const url = config.url || config.host;
    const type = config.type || 'httpStream';

    try {
      const client = new MCPClient(this.clientInfo);

      // Connect
      if (type === 'stdio' && config.command) {
        await client.connect({
          type: 'stdio',
          command: config.command,
          args: config.args || [],
          env: config.env,
          cwd: config.cwd
        });
      } else if (type === 'sse' && url) {
        await client.connect({
          type: 'sse',
          url: url
        });
      } else if (url) {
        await client.connect({
          type: 'httpStream',
          url: url
        });
      } else {
        throw new Error('Invalid configuration');
      }

      // Call the tool
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      // Close the connection
      await client.close();

      return result;

    } catch (error) {
      throw new Error(`Failed to call tool: ${(error as Error).message}`);
    }
  }
}

// Export for use as module
export default SimpleMCPClient;

// CLI usage if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new SimpleMCPClient();

  // Simple CLI interface
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Simple MCP Client');
    console.log('================');
    console.log('');
    console.log('Usage:');
    console.log('  node index.js <url> [--type=sse|httpStream]');
    console.log('  node index.js <command> --type=stdio [args...]');
    console.log('');
    console.log('Examples:');
    console.log('  node index.js https://mcp.asana.com/sse --type=sse');
    console.log('  node index.js https://api.example.com --type=httpStream');
    console.log('  node index.js npx --type=stdio @modelcontextprotocol/server-memory');
    console.log('');
    process.exit(0);
  }

  const [urlOrCommand, ...rest] = args;

  // Parse type from args
  let type: 'sse' | 'httpStream' | 'stdio' = 'httpStream';
  let additionalArgs: string[] = [];

  for (const arg of rest) {
    if (arg.startsWith('--type=')) {
      type = arg.split('=')[1] as any;
    } else {
      additionalArgs.push(arg);
    }
  }

  const config: ServerConfig = {
    type: type
  };

  if (type === 'stdio') {
    config.command = urlOrCommand;
    config.args = additionalArgs;
  } else {
    config.url = urlOrCommand.startsWith('http') ? urlOrCommand : `https://${urlOrCommand}`;
  }

  const displayUrl = config.url || `${config.command} ${config.args?.join(' ')}`;
  console.log(`🔗 Connecting to: ${displayUrl}`);

  client.getTools(config).then(result => {
    if (result.success) {
      console.log(`\n✅ Connected successfully!`);
      console.log(`📊 Found ${result.toolCount ?? 0} tools:\n`);

      result.tools.forEach((tool, idx) => {
        console.log(`${idx + 1}. ${tool.name || 'Unnamed Tool'}`);
        if (tool.description) {
          console.log(`   → ${tool.description.substring(0, 80)}${tool.description.length > 80 ? '...' : ''}`);
        }
      });
    } else {
      console.log(`\n❌ Connection failed: ${result.error}`);
    }
  }).catch(console.error);
}
