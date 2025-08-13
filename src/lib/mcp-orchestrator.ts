import { MCPRequest, MCPResponse, MCPTool, MCPServerConfig, MCPToolCall } from '../types/mcp';
import { MongoDBMCPServer } from './mcp-servers/mongodb-mcp';
import { GitHubMCPServer } from './mcp-servers/github-mcp';

class MCPOrchestrator {
  private servers: Map<string, any> = new Map();
  private serverConfigs: MCPServerConfig[] = [];

  constructor() {
    this.initializeServers();
  }

  private initializeServers(): void {
    // Initialize MongoDB MCP Server
    const mongodbServer = new MongoDBMCPServer();
    this.servers.set('mongodb', mongodbServer);
    this.serverConfigs.push({
      name: 'mongodb',
      port: 3001,
      baseUrl: 'http://localhost:3001',
      enabled: true,
      tools: mongodbServer.getTools?.() || []
    });

    // Initialize GitHub MCP Server
    const githubServer = new GitHubMCPServer();
    this.servers.set('github', githubServer);
    this.serverConfigs.push({
      name: 'github',
      port: 3003,
      baseUrl: 'http://localhost:3003',
      enabled: true,
      tools: githubServer.getTools?.() || []
    });
  }

  async getAvailableTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];
    
    for (const [serverName, server] of this.servers) {
      try {
        const tools = server.getTools?.() || [];
        tools.forEach((tool: MCPTool) => {
          allTools.push({
            ...tool,
            name: `${serverName}_${tool.name}`,
            description: `[${serverName.toUpperCase()}] ${tool.description}`
          });
        });
      } catch (error) {
        console.error(`Error getting tools from ${serverName}:`, error);
      }
    }
    
    return allTools;
  }

  async executeToolCall(toolCall: MCPToolCall): Promise<any> {
    const [serverName, toolName] = toolCall.name.split('_', 2);
    
    if (!serverName || !toolName) {
      throw new Error(`Invalid tool name format: ${toolCall.name}`);
    }

    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`Unknown MCP server: ${serverName}`);
    }

    try {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: toolCall.arguments
        }
      };

      const response = await server.handleRequest(request);
      
      if (response.error) {
        throw new Error(`Tool execution failed: ${response.error.message}`);
      }

      return response.result;
    } catch (error) {
      console.error(`Error executing tool ${toolCall.name}:`, error);
      throw error;
    }
  }

  async executeMultipleToolCalls(toolCalls: MCPToolCall[]): Promise<any[]> {
    const results = [];
    
    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeToolCall(toolCall);
        results.push({ tool: toolCall.name, success: true, result });
      } catch (error) {
        results.push({ tool: toolCall.name, success: false, error: error instanceof Error ? error.message : error });
      }
    }
    
    return results;
  }

  getServerStatus(): any[] {
    return this.serverConfigs.map(config => ({
      name: config.name,
      port: config.port,
      baseUrl: config.baseUrl,
      enabled: config.enabled,
      toolCount: config.tools.length
    }));
  }

  async healthCheck(): Promise<any> {
    const status = {
      orchestrator: 'healthy',
      servers: [] as any[],
      timestamp: new Date().toISOString()
    };

    for (const [serverName, server] of this.servers) {
      try {
        const serverStatus = {
          name: serverName,
          status: 'healthy',
          tools: server.getTools?.()?.length || 0
        };
        status.servers.push(serverStatus);
      } catch (error) {
        status.servers.push({
          name: serverName,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : error
        });
      }
    }

    return status;
  }
}

export const mcpOrchestrator = new MCPOrchestrator(); 