# MCP Client API Documentation

REST API for connecting to MCP servers and fetching available tools.

## Base URL

```
http://localhost:3000
```

## Endpoints

### 1. Get Tools from MCP Server

Connects to an MCP server and retrieves all available tools.

**Endpoint:** `POST /mcp/tools`

**Request Body:**

```json
{
  "url": "https://api.example.com/mcp",
  "type": "httpStream",  // Optional: "sse" | "httpStream" | "stdio"
  "token": "optional-auth-token"
}
```

**For stdio connections:**

```json
{
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```

**Response:**

```json
{
  "success": true,
  "toolCount": 9,
  "tools": [
    {
      "name": "create_entities",
      "description": "Create multiple new entities in the knowledge graph",
      "inputSchema": { ... }
    }
  ]
}
```

**Example curl:**

```bash
# HTTP Stream
curl -X POST http://localhost:3000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.example.com/mcp","type":"httpStream"}'

# SSE
curl -X POST http://localhost:3000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{"url":"https://mcp.asana.com/sse","type":"sse","token":"your-token"}'

# stdio
curl -X POST http://localhost:3000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{"type":"stdio","command":"npx","args":["-y","@modelcontextprotocol/server-memory"]}'
```

---

### 2. Call a Tool

Executes a specific tool on an MCP server.

**Endpoint:** `POST /mcp/call-tool`

**Request Body:**

```json
{
  "url": "https://api.example.com/mcp",
  "type": "httpStream",
  "toolName": "create_entities",
  "arguments": {
    "entities": [
      {
        "name": "John Doe",
        "entityType": "person",
        "observations": ["Software engineer", "Works at Acme Corp"]
      }
    ]
  }
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully created entity: John Doe"
      }
    ]
  }
}
```

**Example curl:**

```bash
curl -X POST http://localhost:3000/mcp/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "type":"stdio",
    "command":"npx",
    "args":["-y","@modelcontextprotocol/server-memory"],
    "toolName":"create_entities",
    "arguments":{
      "entities":[
        {
          "name":"Alice",
          "entityType":"person",
          "observations":["Engineer"]
        }
      ]
    }
  }'
```

---

### 3. Test Multiple Servers

Tests connectivity to multiple MCP servers at once.

**Endpoint:** `POST /mcp/test-multiple`

**Request Body:**

```json
{
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
    },
    {
      "url": "https://api.example.com/mcp",
      "type": "httpStream"
    }
  ]
}
```

**Response:**

```json
[
  {
    "success": true,
    "url": "https://mcp.asana.com/sse",
    "toolCount": 15,
    "tools": [...]
  },
  {
    "success": true,
    "toolCount": 9,
    "tools": [...]
  },
  {
    "success": false,
    "url": "https://api.example.com/mcp",
    "error": "Connection timeout",
    "tools": []
  }
]
```

---

## Configuration Options

### ServerConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | No | MCP server URL (required for SSE/HTTP) |
| `host` | string | No | Alternative to `url` |
| `type` | enum | No | Connection type: `"sse"`, `"httpStream"`, `"stdio"` (default: `httpStream`) |
| `token` | string | No | Authentication token |
| `command` | string | No | Command for stdio connections |
| `args` | string[] | No | Arguments for stdio command |
| `env` | object | No | Environment variables for stdio |
| `cwd` | string | No | Working directory for stdio |

### Transport Types

- **httpStream**: Streaming HTTP connection (default)
- **sse**: Server-Sent Events for real-time updates
- **stdio**: Local process communication (for local MCP servers)

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Error message here",
  "tools": []
}
```

Common error scenarios:
- Invalid connection parameters
- Server not reachable
- Authentication failure
- Tool execution failure

---

## Running the Server

### Development Mode

```bash
npm run dev:server
```

### Production Mode

```bash
npm run start:server
```

The server will start on **http://localhost:3000** by default.

Set a custom port using the `PORT` environment variable:

```bash
PORT=8080 npm run start:server
```

---

## Examples

### Connect to MCP Memory Server (stdio)

```bash
curl -X POST http://localhost:3000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"]
  }'
```

### Connect to Asana MCP (SSE)

```bash
curl -X POST http://localhost:3000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "your-asana-token"
  }'
```

### Create an Entity

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
          "name": "Project Alpha",
          "entityType": "project",
          "observations": ["High priority", "Q4 2024"]
        }
      ]
    }
  }'
```

---

## TypeScript Types

The API uses fully typed DTOs:

```typescript
// Request
interface ConnectMCPDto {
  url?: string;
  host?: string;
  token?: string;
  type?: 'sse' | 'httpStream' | 'stdio';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

// Response
interface MCPToolsResponseDto {
  success: boolean;
  host?: string;
  url?: string;
  toolCount?: number;
  tools: Tool[];
  error?: string;
}
```

---

## Health Check

The server logs indicate successful startup:

```
🚀 MCP Client Server is running on: http://localhost:3000
📡 API Endpoint: http://localhost:3000/mcp/tools
```

Check the server is running:

```bash
curl http://localhost:3000/mcp/tools -X POST -H "Content-Type: application/json" -d '{}'
```

(Will return validation errors but confirms the server is responsive)
