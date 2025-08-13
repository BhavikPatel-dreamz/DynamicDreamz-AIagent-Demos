import { Server } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool,
  TextContent
} from '@modelcontextprotocol/sdk/types.js';

class GitHubMCPServerSDK {
  private server: Server;
  private apiToken: string;
  
  private tools: Tool[] = [
    {
      name: 'github_repositories',
      description: 'Manage and query GitHub repositories',
      inputSchema: {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['list', 'get', 'search', 'create', 'update'],
            description: 'Action to perform on repositories'
          },
          owner: { 
            type: 'string', 
            description: 'Repository owner (username or organization)' 
          },
          repo: { 
            type: 'string', 
            description: 'Repository name' 
          },
          query: { 
            type: 'string', 
            description: 'Search query for repository search' 
          },
          params: { 
            type: 'object', 
            description: 'Additional parameters for the action' 
          }
        },
        required: ['action']
      }
    },
    {
      name: 'github_issues',
      description: 'Manage GitHub issues and pull requests',
      inputSchema: {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['list', 'get', 'create', 'update', 'close', 'comment'],
            description: 'Action to perform on issues'
          },
          owner: { 
            type: 'string', 
            description: 'Repository owner' 
          },
          repo: { 
            type: 'string', 
            description: 'Repository name' 
          },
          issueNumber: { 
            type: 'number', 
            description: 'Issue or PR number' 
          },
          issueData: { 
            type: 'object', 
            description: 'Data for creating/updating issues' 
          },
          comment: { 
            type: 'string', 
            description: 'Comment text for commenting action' 
          }
        },
        required: ['action']
      }
    },
    {
      name: 'github_analytics',
      description: 'Get GitHub repository analytics and insights',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { 
            type: 'string', 
            description: 'Repository owner' 
          },
          repo: { 
            type: 'string', 
            description: 'Repository name' 
          },
          analysisType: { 
            type: 'string', 
            enum: ['overview', 'activity', 'contributors', 'languages', 'traffic'],
            description: 'Type of analysis to perform'
          },
          timeRange: { 
            type: 'object', 
            description: 'Time range for analysis' 
          }
        },
        required: ['owner', 'repo', 'analysisType']
      }
    },
    {
      name: 'github_workflows',
      description: 'Manage GitHub Actions workflows',
      inputSchema: {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['list', 'get', 'trigger', 'status'],
            description: 'Action to perform on workflows'
          },
          owner: { 
            type: 'string', 
            description: 'Repository owner' 
          },
          repo: { 
            type: 'string', 
            description: 'Repository name' 
          },
          workflowId: { 
            type: 'string', 
            description: 'Workflow ID or filename' 
          },
          branch: { 
            type: 'string', 
            description: 'Branch to trigger workflow on' 
          }
        },
        required: ['action', 'owner', 'repo']
      }
    }
  ];

  constructor() {
    this.apiToken = process.env.GITHUB_TOKEN || '';
    
    this.server = new Server(
      {
        name: 'github-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
          
          case 'github_analytics':
            result = await this.handleAnalytics(args);
            break;
          
          case 'github_workflows':
            result = await this.handleWorkflows(args);
            break;
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            } as TextContent
          ]
        };
      } catch (error) {
        throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : error}`);
      }
    });
  }

  private async handleRepositories(args: any): Promise<any> {
    const { action, owner, repo, query, params } = args;

    switch (action) {
      case 'list':
        if (!owner) throw new Error('Owner required for listing repositories');
        return {
          message: `Listing repositories for ${owner}`,
          action: 'list',
          owner,
          params: params || {}
        };
      
      case 'get':
        if (!owner || !repo) throw new Error('Owner and repo required for getting repository');
        return {
          message: `Getting repository: ${owner}/${repo}`,
          action: 'get',
          owner,
          repo,
          params: params || {}
        };
      
      case 'search':
        if (!query) throw new Error('Query required for repository search');
        return {
          message: `Searching repositories with query: "${query}"`,
          action: 'search',
          query,
          params: params || {}
        };
      
      case 'create':
        if (!owner) throw new Error('Owner required for creating repository');
        return {
          message: `Creating repository for ${owner}`,
          action: 'create',
          owner,
          params: params || {}
        };
      
      case 'update':
        if (!owner || !repo) throw new Error('Owner and repo required for updating repository');
        return {
          message: `Updating repository: ${owner}/${repo}`,
          action: 'update',
          owner,
          repo,
          params: params || {}
        };
      
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  private async handleIssues(args: any): Promise<any> {
    const { action, owner, repo, issueNumber, issueData, comment } = args;

    switch (action) {
      case 'list':
        if (!owner || !repo) throw new Error('Owner and repo required for listing issues');
        return {
          message: `Listing issues for ${owner}/${repo}`,
          action: 'list',
          owner,
          repo,
          params: args.params || {}
        };
      
      case 'get':
        if (!owner || !repo || !issueNumber) {
          throw new Error('Owner, repo, and issue number required for getting issue');
        }
        return {
          message: `Getting issue #${issueNumber} from ${owner}/${repo}`,
          action: 'get',
          owner,
          repo,
          issueNumber,
          params: args.params || {}
        };
      
      case 'create':
        if (!owner || !repo || !issueData) {
          throw new Error('Owner, repo, and issue data required for creating issue');
        }
        return {
          message: `Creating issue in ${owner}/${repo}`,
          action: 'create',
          owner,
          repo,
          issueData,
          params: args.params || {}
        };
      
      case 'update':
        if (!owner || !repo || !issueNumber || !issueData) {
          throw new Error('Owner, repo, issue number, and issue data required for updating issue');
        }
        return {
          message: `Updating issue #${issueNumber} in ${owner}/${repo}`,
          action: 'update',
          owner,
          repo,
          issueNumber,
          issueData,
          params: args.params || {}
        };
      
      case 'close':
        if (!owner || !repo || !issueNumber) {
          throw new Error('Owner, repo, and issue number required for closing issue');
        }
        return {
          message: `Closing issue #${issueNumber} in ${owner}/${repo}`,
          action: 'close',
          owner,
          repo,
          issueNumber,
          params: args.params || {}
        };
      
      case 'comment':
        if (!owner || !repo || !issueNumber || !comment) {
          throw new Error('Owner, repo, issue number, and comment required for commenting');
        }
        return {
          message: `Adding comment to issue #${issueNumber} in ${owner}/${repo}`,
          action: 'comment',
          owner,
          repo,
          issueNumber,
          comment,
          params: args.params || {}
        };
      
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  private async handleAnalytics(args: any): Promise<any> {
    const { owner, repo, analysisType, timeRange } = args;

    if (!owner || !repo) {
      throw new Error('Owner and repo required for analytics');
    }

    switch (analysisType) {
      case 'overview':
        return {
          message: `Getting overview analytics for ${owner}/${repo}`,
          analysisType: 'overview',
          owner,
          repo,
          timeRange: timeRange || 'last 30 days'
        };
      
      case 'activity':
        return {
          message: `Getting activity analytics for ${owner}/${repo}`,
          analysisType: 'activity',
          owner,
          repo,
          timeRange: timeRange || 'last 30 days'
        };
      
      case 'contributors':
        return {
          message: `Getting contributor analytics for ${owner}/${repo}`,
          analysisType: 'contributors',
          owner,
          repo,
          timeRange: timeRange || 'all time'
        };
      
      case 'languages':
        return {
          message: `Getting language analytics for ${owner}/${repo}`,
          analysisType: 'languages',
          owner,
          repo
        };
      
      case 'traffic':
        return {
          message: `Getting traffic analytics for ${owner}/${repo}`,
          analysisType: 'traffic',
          owner,
          repo,
          timeRange: timeRange || 'last 14 days'
        };
      
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }
  }

  private async handleWorkflows(args: any): Promise<any> {
    const { action, owner, repo, workflowId, branch } = args;

    if (!owner || !repo) {
      throw new Error('Owner and repo required for workflow operations');
    }

    switch (action) {
      case 'list':
        return {
          message: `Listing workflows for ${owner}/${repo}`,
          action: 'list',
          owner,
          repo
        };
      
      case 'get':
        if (!workflowId) throw new Error('Workflow ID required for getting workflow');
        return {
          message: `Getting workflow ${workflowId} for ${owner}/${repo}`,
          action: 'get',
          owner,
          repo,
          workflowId
        };
      
      case 'trigger':
        if (!workflowId) throw new Error('Workflow ID required for triggering workflow');
        return {
          message: `Triggering workflow ${workflowId} for ${owner}/${repo}`,
          action: 'trigger',
          owner,
          repo,
          workflowId,
          branch: branch || 'main'
        };
      
      case 'status':
        if (!workflowId) throw new Error('Workflow ID required for workflow status');
        return {
          message: `Getting status for workflow ${workflowId} in ${owner}/${repo}`,
          action: 'status',
          owner,
          repo,
          workflowId
        };
      
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  async start(): Promise<void> {
    try {
      await this.server.connect(new StdioServerTransport());
      console.log('🚀 GitHub MCP Server (SDK) started successfully');
      
      if (!this.apiToken) {
        console.warn('⚠️  No GitHub token provided. Some operations may be limited.');
      }
    } catch (error) {
      console.error('Failed to start GitHub MCP Server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.server.close();
      console.log('🛑 GitHub MCP Server (SDK) stopped');
    } catch (error) {
      console.error('Error stopping GitHub MCP Server:', error);
    }
  }

  getApiToken(): string {
    return this.apiToken;
  }

  setApiToken(token: string): void {
    this.apiToken = token;
  }
}

// Start server if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new GitHubMCPServerSDK();
  server.start().catch(console.error);
}

export { GitHubMCPServerSDK }; 