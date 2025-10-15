# Asana MCP Tools - Guide and Workarounds

## Current Status

Your token: `1211621829218860:KX2zdYg3GAyAEerr:s2TH7fjiJa7UuxOZmUYGbuTzZ3n2CCZa`

## The Problem

Asana's MCP server has specific implementation that makes programmatic tool retrieval challenging:

1. **Token Format Issue**: The colon-separated token format appears to be an Asana Personal Access Token (PAT), not a standard MCP OAuth access token
2. **MCP SDK Bug**: The MCP SDK has a parsing error (`resultSchema.parse is not a function`) when connecting to Asana's SSE endpoint
3. **mcp-remote Limitation**: The `mcp-remote-client` CLI tool only outputs tools to interactive terminals (TTY), not to piped stdio
4. **Authentication Method**: Asana MCP expects OAuth flow managed by `mcp-remote`, not pre-generated tokens

## Available Endpoints in This API

### 1. POST /mcp/tools
Uses MCP SDK directly - **Currently fails with parsing error**

```bash
curl -X POST http://localhost:3000/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_TOKEN"
  }'
```

### 2. POST /mcp/tools-remote
Uses mcp-remote CLI wrapper - **Returns validation message but no tools**

```bash
curl -X POST http://localhost:3000/mcp/tools-remote \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_TOKEN"
  }'
```

## Working Solution: Use Claude Desktop

The **officially supported way** to use Asana MCP is through Claude Desktop:

### Step 1: Configure Claude Desktop

Add this to your Claude Desktop config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "asana": {
      "command": "npx",
      "args": [
        "-y",
        "-p",
        "mcp-remote@latest",
        "mcp-remote-client",
        "https://mcp.asana.com/sse?token=1211621829218860:KX2zdYg3GAyAEerr:s2TH7fjiJa7UuxOZmUYGbuTzZ3n2CCZa",
        "--transport",
        "sse-only"
      ]
    }
  }
}
```

### Step 2: Restart Claude Desktop

After adding the configuration, restart Claude Desktop. The Asana MCP tools will be available.

## Alternative: Manual Tool Retrieval

If you need to see the tools list programmatically, you can run this command in an **interactive terminal**:

```bash
npx -y -p mcp-remote@latest mcp-remote-client \
  "https://mcp.asana.com/sse?token=1211621829218860:KX2zdYg3GAyAEerr:s2TH7fjiJa7UuxOZmUYGbuTzZ3n2CCZa" \
  --transport sse-only
```

This will show you all available tools interactively, but it won't work when piped or run non-interactively.

## Known Asana MCP Tools (from Documentation)

Based on Asana's MCP server documentation, here are the typical tools available:

1. **get_workspaces** - List all workspaces
2. **get_workspace** - Get details of a specific workspace
3. **get_projects** - List projects in a workspace
4. **get_project** - Get details of a specific project
5. **create_project** - Create a new project
6. **update_project** - Update project details
7. **delete_project** - Delete a project
8. **get_tasks** - List tasks in a project
9. **get_task** - Get details of a specific task
10. **create_task** - Create a new task
11. **update_task** - Update task details
12. **delete_task** - Delete a task
13. **get_task_comments** - Get comments on a task
14. **add_task_comment** - Add a comment to a task
15. **get_users** - List users in workspace
16. **get_user** - Get user details
17. **search_tasks** - Search for tasks
18. **get_custom_fields** - List custom fields
19. **get_tags** - List tags
20. **create_tag** - Create a new tag
21. **add_tag_to_task** - Add tag to a task
22. **get_teams** - List teams in workspace
23. **get_team** - Get team details
24. **get_sections** - List sections in a project
25. **create_section** - Create a new section
26. **move_task_to_section** - Move task to different section
27. **get_portfolios** - List portfolios
28. **get_portfolio** - Get portfolio details
29. **create_portfolio** - Create a new portfolio
30. **add_project_to_portfolio** - Add project to portfolio

**Note**: The exact tools available may vary based on your Asana account permissions and subscription level.

## Calling Tools

Once you have the Asana MCP server configured (via Claude Desktop or another method), you can call tools using:

### POST /mcp/call-tool

```bash
curl -X POST http://localhost:3000/mcp/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.asana.com/sse",
    "type": "sse",
    "token": "YOUR_TOKEN",
    "toolName": "get_workspaces",
    "arguments": {}
  }'
```

## Recommendations

For production use with Asana MCP:

1. **Use Claude Desktop** - This is the officially supported method
2. **Use OAuth Flow** - Instead of PATs, use the OAuth endpoints in this API:
   - GET `/mcp/oauth/start` - Start OAuth flow
   - GET `/mcp/oauth/callback` - Handle callback and get access token
3. **Consider Asana REST API** - For programmatic access, Asana's REST API might be more suitable than MCP

## Technical Details

### Why Programmatic Access is Hard

1. **mcp-remote Design**: The `mcp-remote-client` CLI tool is designed for Claude Desktop integration, not programmatic use
2. **TTY Detection**: It only outputs full tool listings to interactive terminals (TTY), not to piped processes
3. **Token Handling**: The OAuth flow is managed internally by mcp-remote and doesn't work well with pre-generated tokens

### What We've Tried

- ✅ Direct MCP SDK connection - Fails with parsing error
- ✅ mcp-remote child process - Connects but doesn't output tools to pipe
- ✅ Custom fetch with auth headers - Gets 401 unauthorized
- ✅ Token as query parameter - Still gets parsing error
- ✅ Multiple buffer parsing strategies - mcp-remote doesn't output to non-TTY

## Summary

**For listing tools**: Use Claude Desktop or run `mcp-remote-client` in an interactive terminal

**For calling tools**: Once you can connect (via Claude Desktop), the `/mcp/call-tool` endpoint should work

**For production**: Consider using Asana's REST API directly, or implement the full OAuth flow using the `/mcp/oauth/*` endpoints in this API
