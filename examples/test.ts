import { SimpleMCPClient } from '../index.js';
import type { ServerTestConfig } from '../index.js';

/**
 * Example usage of Simple MCP Client with official mcp-client package
 */

async function runExamples(): Promise<void> {
  console.log('🚀 Simple MCP Client Examples');
  console.log('==============================\n');

  const client = new SimpleMCPClient();

  // Example 1: Connect via HTTP Stream
  console.log('📋 Example 1: Connect via HTTP Stream');
  const httpResult = await client.getTools({
    url: 'https://api.example.com/mcp',
    type: 'httpStream'
  });

  console.log('Result:', {
    success: httpResult.success,
    toolCount: httpResult.toolCount,
    error: httpResult.error
  });
  console.log('');

  // Example 2: Connect via SSE
  console.log('📋 Example 2: Connect via SSE');
  const sseResult = await client.getTools({
    url: 'https://mcp.asana.com/sse',
    type: 'sse'
  });

  console.log('Result:', {
    success: sseResult.success,
    toolCount: sseResult.toolCount,
    error: sseResult.error
  });
  console.log('');

  // Example 3: Connect via stdio
  console.log('📋 Example 3: Connect via stdio (MCP Memory Server)');
  const stdioResult = await client.getTools({
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory']
  });

  console.log('Result:', {
    success: stdioResult.success,
    toolCount: stdioResult.toolCount,
    error: stdioResult.error
  });
  if (stdioResult.success) {
    console.log('Tools found:');
    stdioResult.tools.forEach((tool, idx) => {
      console.log(`  ${idx + 1}. ${tool.name}`);
    });
  }
  console.log('');

  // Example 4: Test multiple servers
  console.log('📋 Example 4: Test Multiple Servers');
  const servers: ServerTestConfig[] = [
    {
      name: 'Asana MCP (SSE)',
      url: 'https://mcp.asana.com/sse',
      type: 'sse'
    },
    {
      name: 'Example API (HTTP)',
      url: 'https://api.example.com/mcp',
      type: 'httpStream'
    },
    {
      name: 'Memory Server (stdio)',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory']
    }
  ];

  const results = await client.testMultipleServers(servers);

  console.log('📊 Summary:');
  results.forEach(result => {
    const name = result.name || result.url || 'Unknown';
    console.log(`${name}: ${result.success ? '✅' : '❌'} ${result.success ? result.toolCount + ' tools' : result.error}`);
  });

  console.log('\n✅ Examples completed!');
}

// Run examples
runExamples().catch(console.error);
