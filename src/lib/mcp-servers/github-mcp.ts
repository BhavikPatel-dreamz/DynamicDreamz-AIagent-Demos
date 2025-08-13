import { MCPRequest, MCPResponse, MCPTool } from '../../types/mcp';

class GitHubMCPServer {
  private port: number;
  private apiToken: string;
  
  private tools: MCPTool[] = [
    {
      name: 'github_repositories',
      description: 'Manage GitHub repositories',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'get', 'search'] },
          owner: { type: 'string' },
          repo: { type: 'string' },
          params: { type: 'object' }
        },
        required: ['action']
      }
    },
    {
      name: 'github_issues',
      description: 'Manage GitHub issues',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'get', 'create'] },
          owner: { type: 'string' },
          repo: { type: 'string' },
          issueNumber: { type: 'number' },
          issueData: { type: 'object' }
        },
        required: ['action']
      }
    }
  ];

  constructor() {
    this.port = parseInt(process.env.GITHUB_MCP_PORT || '3003');
    this.apiToken = process.env.GITHUB_TOKEN || '';
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    switch (request.method) {
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { tools: this.tools }
        };
      
      case 'tools/call':
        return await this.callTool(request);
      
      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32601, message: 'Method not found' }
        };
    }
  }

  private async callTool(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params;

    try {
      let result;

      switch (name) {
        case 'github_repositories':
          result = await this.handleRepositories(args);
          break;
        
        case 'github_issues':
          result = await this.handleIssues(args);
          break;
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { 
          code: -32603, 
          message: 'Tool execution failed',
          data: error instanceof Error ? error.message : error
        }
      };
    }
  }

  private async handleRepositories(args: any): Promise<any> {
    const { action, owner, repo, params } = args;

    switch (action) {
      case 'list':
        return { message: `Listing repositories for ${owner || 'user'}` };
      
      case 'get':
        return { message: `Getting repository: ${owner}/${repo}` };
      
      case 'search':
        return { message: `Searching repositories with params: ${JSON.stringify(params)}` };
      
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  private async handleIssues(args: any): Promise<any> {
    const { action, owner, repo, issueNumber, issueData } = args;

    switch (action) {
      case 'list':
        return { message: `Listing issues for ${owner}/${repo}` };
      
      case 'get':
        return { message: `Getting issue #${issueNumber} from ${owner}/${repo}` };
      
      case 'create':
        return { message: `Creating issue in ${owner}/${repo}` };
      
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  getPort(): number {
    return this.port;
  }

  getTools(): MCPTool[] {
    return this.tools;
  }
}

export { GitHubMCPServer }; 