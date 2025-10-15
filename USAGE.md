# Simple MCP Client - Usage Guide

## ✅ Ready to Use!

Your simple MCP client is complete and ready to test. Here's how to use it:

## 🚀 Quick Start

### 1. NestJS REST API Server (Recommended)

Use the NestJS server with full REST API and Swagger documentation:

```bash
cd /Users/ronkrasnopolski/simple-mcp-client
npm install

# Start the server
npm run start:server

# Or for development with hot reload
npm run dev:server
```

The server will be available at:
- **API Endpoint**: http://localhost:3000/mcp/tools
- **Swagger Documentation**: http://localhost:3000/api

#### Available Endpoints:

**POST /mcp/tools** - Get tools from MCP server
```bash
curl -X POST http://localhost:3000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"]
  }'
```

**POST /mcp/call-tool** - Execute a tool
```bash
curl -X POST http://localhost:3000/mcp/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"],
    "toolName": "create_entities",
    "arguments": {
      "entities": [
        {
          "name": "Alice",
          "entityType": "person",
          "observations": ["Software engineer"]
        }
      ]
    }
  }'
```

**POST /mcp/test-multiple** - Test multiple MCP servers
```bash
curl -X POST http://localhost:3000/mcp/test-multiple \
  -H "Content-Type: application/json" \
  -d '{
    "servers": [
      {
        "url": "https://mcp.asana.com/sse",
        "type": "sse",
        "token": "your-token"
      },
      {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-memory"]
      }
    ]
  }'
```

### 2. Zero Dependencies Version

Use `simple-client.js` (no npm install needed):

```bash
cd /Users/ronkrasnopolski/simple-mcp-client

# Test with your Asana token
node simple-client.js https://mcp.asana.com/sse 2/1211621829218860/1211623817715223:915fa3f5312ee516b9d98bdde09b9d78

# Test with OAuth credentials
node simple-client.js https://api.example.com client-id client-secret

# Test local server
node simple-client.js http://localhost:3000
```

### 3. Full Featured Version

Use `index.js` (requires npm install):

```bash
cd /Users/ronkrasnopolski/simple-mcp-client
npm install
node index.js https://mcp.asana.com/sse your-token
```

## 📋 How It Works

The client attempts to:

1. **Authenticate** with the MCP server (OAuth or token)
2. **Connect** using JSON-RPC 2.0 MCP protocol
3. **Discover** available tools via `tools/list` request
4. **Return** structured results

## 📊 Expected Output

**Success:**
```
🔗 Connecting to: https://mcp.asana.com/sse

✅ Success! Found 22 tools:
1. asana_list_workspaces
   → List all available workspaces in Asana
2. asana_search_projects
   → Search for projects in Asana using name pattern matching
3. asana_create_task
   → Create a new task in a project
...
```

**Failure:**
```
🔗 Connecting to: https://mcp.asana.com/sse

❌ Failed: HTTP 401: Unauthorized
```

## 🔧 Programmatic Usage

```javascript
const SimpleMCPClient = require('./simple-client.js');

const client = new SimpleMCPClient();

// Test your server
const result = await client.getTools({
  host: 'https://mcp.asana.com/sse',
  token: 'your-token-here'
});

console.log('Result:', result);
// {
//   success: true,
//   host: 'https://mcp.asana.com/sse',
//   toolCount: 22,
//   tools: [...]
// }
```

## 🧪 Test Multiple Servers

Create a test script:

```javascript
const SimpleMCPClient = require('./simple-client.js');

async function testServers() {
  const client = new SimpleMCPClient();

  const servers = [
    {
      host: 'https://mcp.asana.com/sse',
      token: 'your-asana-token'
    },
    {
      host: 'https://api.company.com',
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret'
    },
    {
      host: 'http://localhost:3000'
    }
  ];

  for (const server of servers) {
    const result = await client.getTools(server);
    console.log(`${server.host}: ${result.success ? '✅ ' + result.toolCount + ' tools' : '❌ ' + result.error}`);
  }
}

testServers();
```

## ⚡ Key Features

- **NestJS REST API**: Professional REST API server with validation and error handling
- **Swagger Documentation**: Interactive API documentation at /api endpoint
- **Multiple Transport Types**: Supports SSE, HTTP Stream, and stdio connections
- **TypeScript**: Full type safety and IntelliSense support
- **Simple API**: One method `getTools()` returns everything you need
- **OAuth Support**: Automatic OAuth flow for servers requiring it
- **Zero Dependencies**: `simple-client.js` uses only built-in Node.js modules
- **Error Handling**: All errors returned in result object, no exceptions
- **Multiple Protocols**: Tries JSON-RPC 2.0 first, falls back to REST APIs
- **Flexible Auth**: Supports tokens, OAuth, or no authentication

## 🔍 Troubleshooting

**401 Unauthorized**: Your token is invalid or expired
**404 Not Found**: MCP server endpoint doesn't exist
**Timeout**: Network or server issues
**0 tools found**: Server connected but no tools available

## 📁 Files Created

- `simple-client.js` - Zero dependency version ⭐
- `index.js` - Full featured version (requires node-fetch)
- `package.json` - Project configuration
- `examples/test.js` - Usage examples
- `examples/quick-test.js` - Quick test with your Asana token
- `README.md` - Full documentation

## 🎯 Your Simple MCP Client is Ready!

The client successfully:
- ✅ Takes MCP server host + optional auth
- ✅ Connects to MCP servers
- ✅ Returns list of available tools
- ✅ Handles OAuth authentication
- ✅ Works with most MCP servers

Just run it and see what tools your MCP servers provide!