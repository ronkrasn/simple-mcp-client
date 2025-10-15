import { SimpleMCPClient } from '../index.js';

/**
 * Quick test script for immediate MCP server testing
 */

async function quickTest(): Promise<void> {
  console.log('⚡ Quick MCP Server Test\n');

  const client = new SimpleMCPClient();

  // Test 1: stdio connection to MCP Memory Server
  console.log('🔍 Test 1: Connecting to MCP Memory Server (stdio)...');
  const stdioResult = await client.getTools({
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory']
  });

  if (stdioResult.success) {
    console.log(`✅ SUCCESS: Found ${stdioResult.toolCount ?? 0} tools!`);
    console.log('\nAvailable tools:');
    stdioResult.tools.slice(0, 10).forEach((tool, idx) => {
      console.log(`  ${idx + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`     ${tool.description.substring(0, 60)}...`);
      }
    });
    if ((stdioResult.toolCount ?? 0) > 10) {
      console.log(`  ... and ${(stdioResult.toolCount ?? 0) - 10} more tools`);
    }
  } else {
    console.log(`❌ FAILED: ${stdioResult.error}`);
  }

  console.log('\n');

  // Test 2: HTTP Stream connection
  console.log('🔍 Test 2: Testing HTTP Stream connection...');
  const httpResult = await client.getTools({
    url: 'http://localhost:3000',
    type: 'httpStream'
  });

  if (httpResult.success) {
    console.log(`✅ SUCCESS: Found ${httpResult.toolCount ?? 0} tools!`);
    console.log('\nAvailable tools:');
    httpResult.tools.slice(0, 5).forEach((tool, idx) => {
      console.log(`  ${idx + 1}. ${tool.name}`);
    });
  } else {
    console.log(`❌ FAILED: ${httpResult.error}`);
    console.log('(This is expected if no local server is running)');
  }

  console.log('\n⚡ Quick test completed!');
}

quickTest().catch(console.error);
