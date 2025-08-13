export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPServerConfig {
  name: string;
  port: number;
  baseUrl: string;
  enabled: boolean;
  tools: MCPTool[];
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    mcpServers?: string[];
    toolCalls?: any[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: any;
  server: string;
}

export interface AgentResponse {
  message: string;
  toolCalls: MCPToolCall[];
  metadata: {
    serversUsed: string[];
    executionTime: number;
  };
} 