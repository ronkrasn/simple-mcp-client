import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

/**
 * Ultra-Simple MCP Client
 *
 * No external dependencies - uses built-in Node.js modules only.
 * Connects to MCP servers and returns available tools.
 */

interface ServerConfig {
  host: string;
  token?: string;
  clientId?: string;
  clientSecret?: string;
}

interface Tool {
  name?: string;
  id?: string;
  description?: string;
  [key: string]: any;
}

interface ToolsResult {
  success: boolean;
  host: string;
  toolCount?: number;
  tools: Tool[];
  error?: string;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

interface HttpResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  data: any;
}

class SimpleMCPClient {
  /**
   * Connect to an MCP server and get available tools
   */
  async getTools(config: ServerConfig): Promise<ToolsResult> {
    const { host, token, clientId, clientSecret } = config;

    try {
      // Step 1: Get authentication if needed
      let authToken = token;
      if (!authToken && clientId && clientSecret) {
        authToken = await this.getOAuthToken(host, clientId, clientSecret);
      }

      // Step 2: Discover tools
      const tools = await this.discoverTools(host, authToken);

      return {
        success: true,
        host,
        toolCount: tools.length,
        tools: tools
      };

    } catch (error) {
      return {
        success: false,
        host,
        error: (error as Error).message,
        tools: [],
        toolCount: 0
      };
    }
  }

  /**
   * Make HTTP request (supports both HTTP and HTTPS)
   */
  private makeRequest(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'SimpleMCPClient/1.0',
          ...options.headers
        }
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              status: res.statusCode || 0,
              headers: res.headers,
              data: jsonData
            });
          } catch (e) {
            resolve({
              status: res.statusCode || 0,
              headers: res.headers,
              data: data
            });
          }
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Get OAuth token
   */
  private async getOAuthToken(host: string, clientId: string, clientSecret: string): Promise<string> {
    const tokenEndpoints = [
      `${host}/oauth/token`,
      `${host}/token`,
      `${host}/auth/token`
    ];

    for (const endpoint of tokenEndpoints) {
      try {
        const response = await this.makeRequest(endpoint, {
          method: 'POST',
          body: {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret
          }
        });

        if (response.status >= 200 && response.status < 300) {
          return response.data.access_token;
        }
      } catch (err) {
        continue;
      }
    }

    throw new Error('OAuth token request failed');
  }

  /**
   * Discover tools from MCP server
   */
  private async discoverTools(host: string, authToken?: string): Promise<Tool[]> {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const tools: Tool[] = [];

    // Try JSON-RPC MCP protocol
    try {
      const rpcRequests = [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'simple-mcp-client', version: '1.0.0' }
          }
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        }
      ];

      for (const request of rpcRequests) {
        const response = await this.makeRequest(host, {
          method: 'POST',
          headers,
          body: request
        });

        if (response.status >= 200 && response.status < 300) {
          if (request.method === 'tools/list' && response.data.result?.tools) {
            tools.push(...response.data.result.tools);
          }
        }
      }
    } catch (error) {
      // JSON-RPC failed, try REST endpoints
    }

    // If no tools found via JSON-RPC, try REST endpoints
    if (tools.length === 0) {
      const restEndpoints = [
        `${host}/tools`,
        `${host}/mcp/tools`,
        `${host}/api/tools`
      ];

      for (const endpoint of restEndpoints) {
        try {
          const response = await this.makeRequest(endpoint, { headers });

          if (response.status >= 200 && response.status < 300) {
            if (Array.isArray(response.data)) {
              tools.push(...response.data);
              break;
            } else if (response.data.tools && Array.isArray(response.data.tools)) {
              tools.push(...response.data.tools);
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    return tools;
  }
}

// CLI usage
if (require.main === module) {
  const client = new SimpleMCPClient();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Simple MCP Client (No Dependencies)');
    console.log('==================================');
    console.log('');
    console.log('Usage:');
    console.log('  node simple-client.js <host> [token]');
    console.log('  node simple-client.js <host> <clientId> <clientSecret>');
    console.log('');
    console.log('Examples:');
    console.log('  node simple-client.js https://mcp.asana.com/sse your-token');
    console.log('  node simple-client.js https://api.example.com client123 secret456');
    console.log('');
    process.exit(0);
  }

  const [host, tokenOrClientId, clientSecret] = args;

  const config: ServerConfig = {
    host: host.startsWith('http') ? host : `https://${host}`
  };

  if (clientSecret) {
    config.clientId = tokenOrClientId;
    config.clientSecret = clientSecret;
  } else if (tokenOrClientId) {
    config.token = tokenOrClientId;
  }

  console.log(`🔗 Connecting to: ${config.host}`);

  client.getTools(config).then(result => {
    if (result.success) {
      console.log(`\n✅ Success! Found ${result.toolCount} tools:`);
      result.tools.forEach((tool, idx) => {
        console.log(`${idx + 1}. ${tool.name || tool.id || 'Unnamed Tool'}`);
        if (tool.description) {
          const desc = tool.description.substring(0, 60);
          console.log(`   → ${desc}${tool.description.length > 60 ? '...' : ''}`);
        }
      });
    } else {
      console.log(`\n❌ Failed: ${result.error}`);
    }
  }).catch(console.error);
}

export default SimpleMCPClient;
