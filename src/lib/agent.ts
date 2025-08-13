import { AgentMessage, AgentResponse, MCPToolCall } from '../types/mcp';
import { mcpOrchestrator } from './mcp-orchestrator';

class AIAgent {
  private conversationHistory: AgentMessage[] = [];
  private systemPrompt: string;

  constructor() {
    this.systemPrompt = `You are an AI agent that can orchestrate multiple MCP (Model Context Protocol) servers to help users with various tasks.

Available MCP servers:
- MongoDB: Database operations and analytics
- GitHub: Repository and issue management

You can use tools from these servers to:
1. Query and analyze data from MongoDB
2. Manage GitHub repositories and issues
3. Combine data from multiple sources
4. Provide insights and recommendations

When a user asks a question, determine which tools you need and execute them in the right order. Always explain what you're doing and provide helpful responses.`;
  }

  async processMessage(userMessage: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    // Add user message to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    try {
      // Analyze the user's request and determine required tools
      const toolCalls = await this.analyzeRequest(userMessage);
      
      // Execute the tool calls
      const results = await mcpOrchestrator.executeMultipleToolCalls(toolCalls);
      
      // Generate response based on results
      const response = await this.generateResponse(userMessage, results);
      
      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: {
          mcpServers: response.metadata.serversUsed,
          toolCalls: toolCalls
        }
      });

      return response;
    } catch (error) {
      const errorMessage = `I encountered an error while processing your request: ${error instanceof Error ? error.message : error}`;
      
      this.conversationHistory.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      });

      return {
        message: errorMessage,
        toolCalls: [],
        metadata: {
          serversUsed: [],
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  private async analyzeRequest(userMessage: string): Promise<MCPToolCall[]> {
    const toolCalls: MCPToolCall[] = [];
    const lowerMessage = userMessage.toLowerCase();

    // Simple rule-based tool selection (in a real implementation, this would use AI)
    if (lowerMessage.includes('mongodb') || lowerMessage.includes('database') || lowerMessage.includes('data')) {
      if (lowerMessage.includes('query') || lowerMessage.includes('find')) {
        toolCalls.push({
          name: 'mongodb_mongodb_query',
          arguments: {
            collection: 'users',
            operation: 'find',
            query: {}
          },
          server: 'mongodb'
        });
      } else if (lowerMessage.includes('analytics') || lowerMessage.includes('analyze')) {
        toolCalls.push({
          name: 'mongodb_mongodb_analytics',
          arguments: {
            collection: 'users',
            analysisType: 'summary'
          },
          server: 'mongodb'
        });
      }
    }

    if (lowerMessage.includes('github') || lowerMessage.includes('repository') || lowerMessage.includes('issue')) {
      if (lowerMessage.includes('repository') || lowerMessage.includes('repo')) {
        toolCalls.push({
          name: 'github_github_repositories',
          arguments: {
            action: 'list',
            owner: 'user'
          },
          server: 'github'
        });
      } else if (lowerMessage.includes('issue')) {
        toolCalls.push({
          name: 'github_github_issues',
          arguments: {
            action: 'list',
            owner: 'user',
            repo: 'demo-repo'
          },
          server: 'github'
        });
      }
    }

    // If no specific tools identified, provide general information
    if (toolCalls.length === 0) {
      toolCalls.push({
        name: 'mongodb_mongodb_analytics',
        arguments: {
          collection: 'users',
          analysisType: 'count'
        },
        server: 'mongodb'
      });
    }

    return toolCalls;
  }

  private async generateResponse(userMessage: string, toolResults: any[]): Promise<AgentResponse> {
    const serversUsed = [...new Set(toolResults.map(result => result.tool.split('_')[0]))];
    
    let responseMessage = `I've processed your request: "${userMessage}"\n\n`;

    if (toolResults.length > 0) {
      responseMessage += `Here's what I found:\n\n`;
      
      toolResults.forEach((result, index) => {
        if (result.success) {
          responseMessage += `${index + 1}. **${result.tool}**: Successfully executed\n`;
          if (result.result && typeof result.result === 'object') {
            if (result.result.message) {
              responseMessage += `   ${result.result.message}\n`;
            } else if (result.result.count !== undefined) {
              responseMessage += `   Found ${result.result.count} records\n`;
            } else {
              responseMessage += `   Operation completed successfully\n`;
            }
          }
        } else {
          responseMessage += `${index + 1}. **${result.tool}**: Failed - ${result.error}\n`;
        }
        responseMessage += '\n';
      });
    }

    responseMessage += `I used ${serversUsed.length} MCP server(s): ${serversUsed.join(', ')}. `;
    responseMessage += `Is there anything specific you'd like me to help you with?`;

    return {
      message: responseMessage,
      toolCalls: toolResults.map(result => ({
        name: result.tool,
        arguments: {},
        server: result.tool.split('_')[0]
      })),
      metadata: {
        serversUsed,
        executionTime: Date.now()
      }
    };
  }

  getConversationHistory(): AgentMessage[] {
    return [...this.conversationHistory];
  }

  clearConversation(): void {
    this.conversationHistory = [];
  }

  async getAvailableTools(): Promise<any[]> {
    return await mcpOrchestrator.getAvailableTools();
  }

  async getSystemStatus(): Promise<any> {
    return await mcpOrchestrator.healthCheck();
  }
}

export const aiAgent = new AIAgent(); 