# Simple MCP Client - NestJS REST API

A production-ready NestJS REST API server for connecting to MCP (Model Context Protocol) servers. Features full Swagger documentation, OAuth support for Asana MCP, and multiple connection methods including support for remote MCP servers via `mcp-remote`.

## 🌟 Features

- 🚀 **REST API Server** built with NestJS and TypeScript
- 📚 **Full Swagger/OpenAPI Documentation** at `/api`
- 🔌 **Multiple Transport Types**: SSE, HTTP Stream, and stdio
- 🛠️ **Automatic Tool Discovery** from MCP servers
- 🔐 **OAuth Integration** for Asana MCP server
- 🌐 **Remote MCP Support** via `mcp-remote` package
- 📊 **Multiple Server Testing** in parallel
- ⚡ **Works with any MCP-compliant server**
- 🎯 **Full TypeScript Support** with strict type safety

## ⚡ Quick Start (Automated OAuth)

The fastest way to get started with MCP OAuth authentication:

### 1. Start the API server

```bash
npm install
npm run start:server
```

### 2. Run the OAuth script

In a new terminal:

```bash
npm run oauth
```

This automated script will:
1. ✅ Register a new OAuth client with the MCP server
2. 🌐 Open your browser for authorization
3. 🔑 Exchange the authorization code for an access token
4. 💾 Save the token to `.mcp-token.json`

### 3. Test your connection

```bash
npm run test-tools
```

This will fetch and display all available tools from the MCP server.

**That's it!** 🎉 You now have a working MCP OAuth connection.

---

## 📋 Manual Setup

### Installation

```bash
cd simple-mcp-client
npm install
```

### Building

```bash
# Build TypeScript to JavaScript
npm run build

# Start the server (production)
npm run start:server

# Development mode with auto-reload
npm run dev:server
```

### Access the API

Once the server is running:

- **API Server**: https://localhost:3000
- **Swagger Documentation**: https://localhost:3000/api
- **OAuth Helper**: https://localhost:3000/oauth/oauth-asana.html

**Note**: By default, the server uses HTTPS with self-signed certificates. Your browser may show a security warning - this is normal for development. See the [SSL/HTTPS Configuration](#sslhttps-configuration) section below for more details.

## 🔥 API Endpoints

### 1. Get Tools from MCP Server

**Endpoint**: `POST /mcp/tools`

Connects to an MCP server and retrieves all available tools. Supports SSE, HTTP Stream, and stdio transports.

#### stdio Example (Local MCP Server)

```bash
curl -k -X POST https://localhost:3000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"]
  }'
```

#### SSE Example (Remote MCP Server)

```bash
curl -k -X POST https://localhost:3000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_ACCESS_TOKEN"
  }'
```

**Note**: The `-k` flag allows curl to work with self-signed certificates. Remove it if using a valid SSL certificate.

### 2. Get Tools via mcp-remote (Recommended for Remote Servers)

**Endpoint**: `POST /mcp/tools-remote`

Uses `mcp-remote` package to connect to remote MCP servers with proper OAuth handling. **This is the recommended method for Asana MCP and other remote SSE servers.**

#### Example Request

```bash
curl -k -X POST https://localhost:3000/mcp/tools-remote \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_ACCESS_TOKEN"
  }'
```

#### Example Response

```json
{
  "success": true,
  "url": "https://mcp.asana.com/sse",
  "toolCount": 43,
  "tools": [
    {
      "name": "asana_get_attachment",
      "description": "Get detailed attachment data...",
      "inputSchema": { ... }
    },
    {
      "name": "asana_get_tasks",
      "description": "List tasks in a project...",
      "inputSchema": { ... }
    },
    ...
  ]
}
```

**Key Advantages**:
- ✅ Successfully retrieves all 43 Asana MCP tools
- ✅ Handles OAuth tokens properly via mcp-remote
- ✅ Uses JSON-RPC communication like MCP Inspector
- ✅ Works reliably with Asana MCP and other remote servers

### 3. Call a Tool

**Endpoint**: `POST /mcp/call-tool`

Executes a specific tool on an MCP server with provided arguments.

```bash
curl -k -X POST https://localhost:3000/mcp/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"],
    "toolName": "create_entities",
    "arguments": {
      "entities": [{
        "name": "Alice",
        "entityType": "person",
        "observations": ["Software engineer", "Works at Tech Corp"]
      }]
    }
  }'
```

### 4. Test Multiple Servers

**Endpoint**: `POST /mcp/test-multiple`

Tests connectivity to multiple MCP servers simultaneously.

```bash
curl -k -X POST https://localhost:3000/mcp/test-multiple \
  -H "Content-Type: application/json" \
  -d '{
    "servers": [
      {
        "url": "https://mcp.asana.com/sse",
        "type": "sse",
        "token": "YOUR_TOKEN"
      },
      {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-memory"]
      }
    ]
  }'
```

## 🔐 OAuth Integration for Asana MCP

The server includes full OAuth support with **dynamic client registration** (RFC 7591).

### Method 1: Automated Script (Easiest) ⭐

Use the automated OAuth script that handles everything for you:

```bash
npm run oauth
```

This will:
- ✅ Register a new client dynamically
- 🌐 Open authorization in your browser
- 🔑 Exchange code for token
- 💾 Save token to `.mcp-token.json`

Then test with:
```bash
npm run test-tools
```

See [MCP_OAUTH_GUIDE.md](./MCP_OAUTH_GUIDE.md) for detailed documentation.

### Method 2: Web Interface

Open in your browser:
```
https://localhost:3000/oauth-mcp.html
```

Follow the 3-step wizard to complete the OAuth flow.

### Method 3: Manual API Calls

**Step 1**: Generate Authorization URL

```bash
curl -k -X POST https://localhost:3000/mcp/oauth/authorize-url \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "YOUR_CLIENT_ID",
    "redirectUri": "https://localhost:3000/mcp/oauth/callback",
    "serverUrl": "https://mcp.asana.com",
    "oauthAuthUrl": "https://app.asana.com/-/oauth_authorize",
    "oauthScopes": "default openid email"
  }'
```

**Step 2**: Direct user to the `authorizationUrl` from response

**Step 3**: Exchange code for token

```bash
curl -k -X POST https://localhost:3000/mcp/oauth/exchange-token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AUTHORIZATION_CODE",
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "redirectUri": "https://localhost:3000/mcp/oauth/callback",
    "serverUrl": "https://mcp.asana.com",
    "oauthTokenUrl": "https://app.asana.com/-/oauth_token"
  }'
```

## 📖 API Documentation

### Full Interactive Documentation

Visit **https://localhost:3000/api** for the complete Swagger UI documentation with:
- All available endpoints
- Request/response schemas
- Interactive API testing
- Example requests
- Authentication details

**Note**: When accessing the Swagger UI with self-signed certificates, you may need to accept the security warning in your browser.

### Configuration Options

#### ConnectMCPDto

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Conditional | MCP server URL (required for SSE/HTTP) |
| `type` | 'sse' \| 'httpStream' \| 'stdio' | No | Connection type (default: httpStream) |
| `token` | string | No | OAuth access token for SSE connections |
| `headers` | object | No | Custom headers for HTTP requests |
| `command` | string | Conditional | Command for stdio (required for stdio) |
| `args` | string[] | No | Arguments for stdio command |
| `env` | object | No | Environment variables for stdio |
| `cwd` | string | No | Working directory for stdio |

#### MCPToolsResponseDto

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the operation succeeded |
| `url` | string? | The MCP server URL |
| `toolCount` | number? | Number of tools found |
| `tools` | Tool[] | Array of discovered tools |
| `error` | string? | Error message if failed |
| `message` | string? | Additional information |
| `serverInfo` | object? | Server name and version |

## 🎯 Working with Asana MCP

### Complete Example

```bash
# 1. Get tools using mcp-remote (recommended)
curl -k -X POST https://localhost:3000/mcp/tools-remote \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_ACCESS_TOKEN"
  }'

# 2. Call a tool (e.g., get workspaces)
curl -k -X POST https://localhost:3000/mcp/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_ACCESS_TOKEN",
    "toolName": "asana_get_workspaces",
    "arguments": {}
  }'
```

### Available Asana MCP Tools

The Asana MCP server provides **43 tools** for managing your Asana workspace:

**Attachments**: `asana_get_attachment`, `asana_get_attachments_for_object`

**Goals**: `asana_get_goals`, `asana_get_goal`, `asana_create_goal`, `asana_update_goal`, `asana_update_goal_metric`, `asana_get_parent_goals_for_goal`

**Portfolios**: `asana_get_portfolio`, `asana_get_portfolios`, `asana_get_items_for_portfolio`

**Projects**: `asana_get_project`, `asana_get_projects`, `asana_get_project_sections`, `asana_get_project_status`, `asana_get_project_statuses`, `asana_create_project_status`, `asana_get_project_task_counts`, `asana_get_projects_for_team`

**Tasks**: `asana_get_task`, `asana_get_tasks`, `asana_create_task`, `asana_update_task`, `asana_delete_task`, `asana_duplicate_task`, `asana_get_subtasks_for_task`, `asana_set_parent_for_task`, `asana_search_tasks_for_workspace`, `asana_add_dependencies_for_task`, `asana_add_dependents_for_task`

**Stories (Comments)**: `asana_get_stories_for_task`, `asana_create_story_for_task`

**Tags**: `asana_get_tags_for_workspace`, `asana_create_tag_for_workspace`

**Teams**: `asana_get_team`, `asana_get_teams_for_workspace`, `asana_get_teams_for_user`

**Users**: `asana_get_user`, `asana_get_users_for_workspace`, `asana_get_favorites_for_user`

**Workspaces**: `asana_get_workspaces`, `asana_get_workspace`, `asana_typeahead_search`

**Custom Fields**: `asana_get_custom_field_settings_for_project`

## 🔧 Technical Implementation

### How /mcp/tools-remote Works

The `/mcp/tools-remote` endpoint uses the same approach as the **MCP Inspector**:

1. **Spawns mcp-remote-client** process with stdin/stdout pipes
2. **Sends JSON-RPC `initialize` request** via stdin to establish MCP session
3. **Waits for initialization response**
4. **Sends `tools/list` request** via stdin
5. **Parses multi-line JSON** from stderr (where mcp-remote outputs messages)
6. **Extracts tools array** from JSON-RPC response
7. **Returns formatted response** to client

This implementation successfully retrieves all tools from Asana MCP and other remote servers.

### Architecture

```
simple-mcp-client/
├── src/
│   ├── main.ts                    # NestJS application entry
│   ├── controllers/
│   │   └── mcp.controller.ts      # REST API endpoints
│   ├── services/
│   │   └── mcp.service.ts         # MCP client logic
│   ├── dto/
│   │   ├── connect-mcp.dto.ts     # Request DTOs
│   │   └── mcp-response.dto.ts    # Response DTOs
│   └── modules/
│       └── mcp.module.ts          # NestJS module
├── dist/                          # Compiled JavaScript
├── oauth/                         # OAuth helper pages
├── test-mcp-remote.js            # Test scripts
└── package.json
```

## 🚀 Supported MCP Servers

### Tested and Working

- ✅ **Asana MCP** (`https://mcp.asana.com/sse`) - 43 tools
- ✅ **Memory Server** (`@modelcontextprotocol/server-memory`) - stdio
- ✅ **Filesystem Server** (`@modelcontextprotocol/server-filesystem`) - stdio
- ✅ **Custom HTTP Stream servers**
- ✅ **Custom SSE servers with mcp-remote**

### Connection Methods by Server Type

| Server Type | Recommended Endpoint | Transport |
|-------------|---------------------|-----------|
| Local (stdio) | `/mcp/tools` | stdio |
| Remote SSE | `/mcp/tools-remote` | sse-only |
| HTTP Stream | `/mcp/tools` | httpStream |

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server (production)
npm run start:server

# Development mode with auto-reload
npm run dev:server

# Run tests
npm test
```

### Environment

The server runs on **port 3000** by default. You can change this by setting the `PORT` environment variable in your `.env` file.

## 🔒 SSL/HTTPS Configuration

By default, the server is configured to use HTTPS with self-signed SSL certificates for secure communication.

### Quick Start

The project includes generated self-signed SSL certificates in the `certs/` directory. To enable/disable SSL:

1. **Edit your `.env` file**:
   ```env
   SSL_ENABLED=true  # Set to 'false' to use HTTP
   ```

2. **Start the server**:
   ```bash
   npm run dev:server
   ```

3. **Access the API** at `https://localhost:3000`

### Using Self-Signed Certificates

When using self-signed certificates, you'll need to accept security warnings:

**In your browser**: Click "Advanced" → "Proceed to localhost (unsafe)"

**With curl**: Use the `-k` or `--insecure` flag:
```bash
curl -k https://localhost:3000/mcp/tools
```

### Using Custom Certificates

To use your own SSL certificates (e.g., from Let's Encrypt):

1. **Place your certificate files** in the `certs/` directory or another location

2. **Update your `.env` file**:
   ```env
   SSL_ENABLED=true
   SSL_CERT_PATH=/path/to/your/cert.pem
   SSL_KEY_PATH=/path/to/your/key.pem
   ```

3. **Restart the server**

### Generating New Self-Signed Certificates

If you need to regenerate the self-signed certificates:

```bash
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### Disabling SSL for Development

If you prefer to use HTTP during development:

1. **Set `SSL_ENABLED=false` in your `.env` file**

2. **Restart the server**

3. **Access the API** at `http://localhost:3000`

## 📦 Dependencies

### Core
- **@nestjs/common**, **@nestjs/core**, **@nestjs/platform-express**: NestJS framework
- **@nestjs/swagger**: OpenAPI/Swagger documentation
- **mcp-client**: Clean API wrapper for MCP SDK
- **@modelcontextprotocol/sdk**: Official Model Context Protocol SDK
- **mcp-remote**: Remote MCP server support

### Development
- **TypeScript**: Type safety and modern JavaScript features
- **tsx**: TypeScript execution for development

## 📚 OAuth Documentation

Complete guides and examples for MCP OAuth authentication:

- **[MCP OAuth Flow](MCP_OAUTH_FLOW.md)** - Visual guide with flow diagram
- **[Complete Example](scripts/COMPLETE_EXAMPLE.md)** - End-to-end working examples
- **[Quick Reference](scripts/QUICK_REFERENCE.md)** - Copy-paste curl commands
- **[Scripts Guide](scripts/README.md)** - Demo scripts in multiple languages
- **[OAuth Guide](MCP_OAUTH_GUIDE.md)** - Detailed technical documentation
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions ⚠️

### Demo Scripts

```bash
# JavaScript/Node.js
npm run oauth-demo

# Python
python3 scripts/mcp-oauth-demo.py

# Bash + curl
./scripts/mcp-oauth-demo.sh

# TypeScript (advanced)
npm run oauth
```

All scripts demonstrate the complete flow:
1. Register OAuth client
2. Generate authorization URL
3. User authorization (browser)
4. Exchange code for token
5. **Fetch available tools**
6. Call tools with the access token

## 🎓 Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Asana MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/asana)
- [NestJS Documentation](https://docs.nestjs.com/)

## 📝 License

MIT

## 🙏 Acknowledgments

- Built with the official [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- Uses [mcp-client](https://github.com/punkpeye/mcp-client) for simplified API
- Uses [mcp-remote](https://www.npmjs.com/package/mcp-remote) for remote server support
- Powered by [NestJS](https://nestjs.com/)
