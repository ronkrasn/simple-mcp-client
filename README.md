# Simple MCP Client

A straightforward TypeScript client that connects to MCP (Model Context Protocol) servers using the official `mcp-client` package. Supports multiple transport types: SSE, HTTP Streaming, and stdio.

## Features

- 🔌 Multiple transport types: **SSE**, **HTTP Stream**, and **stdio**
- 🛠️ Automatic tool discovery from MCP servers
- 📊 Multiple server testing
- 🚀 Easy to use API built on official `mcp-client` package
- 📘 Full TypeScript support with type definitions
- 🎯 Strict type safety
- ⚡ Works with any MCP-compliant server

## Installation

```bash
cd simple-mcp-client
npm install
```

## Building

```bash
# Build TypeScript to JavaScript
npm run build

# Development mode (runs TypeScript directly)
npm run dev
```

## Usage

### Command Line

```bash
# HTTP Stream (default)
npm start -- https://api.example.com/mcp

# SSE connection
npm start -- https://mcp.asana.com/sse --type=sse

# stdio connection (local MCP server)
npm start -- npx --type=stdio @modelcontextprotocol/server-memory

# Development mode
npm run dev https://api.example.com/mcp
```

### Programmatic API

#### TypeScript/ES Modules

```typescript
import { SimpleMCPClient } from './index.js';

const client = new SimpleMCPClient();

// Example 1: Connect via HTTP Stream
const httpResult = await client.getTools({
  url: 'https://api.example.com/mcp',
  type: 'httpStream'
});

// Example 2: Connect via SSE
const sseResult = await client.getTools({
  url: 'https://mcp.asana.com/sse',
  type: 'sse'
});

// Example 3: Connect via stdio (local server)
const stdioResult = await client.getTools({
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-memory']
});

// Result format (fully typed)
console.log(stdioResult);
// {
//   success: true,
//   url: 'stdio',
//   toolCount: 9,
//   tools: [
//     { name: 'create_entities', description: '...' },
//     { name: 'create_relations', description: '...' },
//     ...
//   ]
// }
```

#### Call Tools

```typescript
// Call a tool on an MCP server
const result = await client.callTool(
  {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory']
  },
  'create_entities',
  {
    entities: [
      { name: 'John', entityType: 'person', observations: ['software engineer'] }
    ]
  }
);

console.log(result);
```

### Test Multiple Servers

```typescript
import type { ServerTestConfig } from './index.js';

const servers: ServerTestConfig[] = [
  {
    name: 'Asana MCP (SSE)',
    url: 'https://mcp.asana.com/sse',
    type: 'sse'
  },
  {
    name: 'Memory Server (stdio)',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory']
  },
  {
    name: 'Custom API (HTTP)',
    url: 'https://api.company.com/mcp',
    type: 'httpStream'
  }
];

const results = await client.testMultipleServers(servers);
```

## Configuration Options

### ServerConfig Interface

| Option | Type | Description |
|--------|------|-------------|
| `url` | string? | MCP server URL (for SSE/HTTP) |
| `type` | 'sse' \| 'httpStream' \| 'stdio'? | Connection type (default: httpStream) |
| `command` | string? | Command for stdio connections |
| `args` | string[]? | Arguments for stdio command |
| `env` | Record<string, string>? | Environment variables for stdio |
| `cwd` | string? | Working directory for stdio |

### ToolsResult Interface

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the operation succeeded |
| `url` | string? | The MCP server URL |
| `toolCount` | number? | Number of tools found |
| `tools` | Tool[] | Array of discovered tools (from @modelcontextprotocol/sdk) |
| `error` | string? | Error message if failed |

## Examples

Run the examples:

```bash
# Run compiled examples
npm test

# Run TypeScript examples directly (development)
npm run dev:test
npm run dev:quick-test
```

Example output from quick test:
```
⚡ Quick MCP Server Test

🔍 Test 1: Connecting to MCP Memory Server (stdio)...
✅ SUCCESS: Found 9 tools!

Available tools:
  1. create_entities
  2. create_relations
  3. add_observations
  ...
```

Example files:
- `examples/test.ts` - Complete usage examples (SSE, HTTP, stdio)
- `examples/quick-test.ts` - Quick server testing

## How It Works

This client uses the official **[mcp-client](https://github.com/punkpeye/mcp-client)** package, which wraps the `@modelcontextprotocol/sdk` for a cleaner API:

1. **Connection**: Creates an MCPClient instance and connects using the specified transport
2. **Tool Discovery**: Calls `getAllTools()` to discover available tools
3. **Tool Execution**: Use `callTool()` to execute tools with typed parameters
4. **Response**: Returns structured results with full TypeScript types

### Transport Types

- **httpStream**: Streaming HTTP connection (default)
- **sse**: Server-Sent Events for real-time updates
- **stdio**: Local process communication (ideal for local MCP servers)

## Supported MCP Servers

This client works with any MCP-compliant server:

- ✅ **stdio servers**: Local MCP servers via process communication
  - `@modelcontextprotocol/server-memory`
  - `@modelcontextprotocol/server-filesystem`
  - Custom stdio servers
- ✅ **HTTP servers**: Remote MCP servers via HTTP streaming
- ✅ **SSE servers**: Real-time MCP servers via Server-Sent Events
  - Asana MCP Server
  - Custom SSE implementations

## Error Handling

The client gracefully handles:
- Connection failures
- Network timeouts
- Invalid server responses
- Missing tools
- Malformed requests

All errors are returned in the result object rather than throwing exceptions, making it easy to handle failures gracefully.

## TypeScript Support

This project is written in TypeScript and provides full type definitions from the official SDK:

- **Type-safe API**: All methods and interfaces are fully typed
- **IntelliSense support**: Get autocomplete in your IDE
- **Compile-time safety**: Catch errors before runtime
- **Type definitions**: Uses types from `@modelcontextprotocol/sdk`

### Available Types

```typescript
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ServerConfig {
  name?: string;
  url?: string;
  host?: string;
  token?: string;
  type?: 'sse' | 'httpStream' | 'stdio';
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
```

## Project Structure

```
simple-mcp-client/
├── index.ts              # Main client using mcp-client
├── simple-client.ts      # Legacy zero-dependency client
├── examples/
│   ├── test.ts          # Complete examples (SSE, HTTP, stdio)
│   └── quick-test.ts    # Quick testing
├── dist/                # Compiled JavaScript output
│   ├── index.js
│   ├── index.d.ts       # Type definitions
│   └── ...
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project configuration
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode (no build needed)
npm run dev

# Run tests in development mode
npm run dev:test
npm run dev:quick-test
```

## Dependencies

- **[mcp-client](https://github.com/punkpeye/mcp-client)**: Clean API wrapper for MCP SDK
- **[@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)**: Official Model Context Protocol SDK

## License

MIT
