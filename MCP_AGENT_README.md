# Multi-MCP AI Agent Architecture - Next.js Demo

This demo shows how to create an AI agent that orchestrates multiple MCP servers (MongoDB, GitHub) where each service has its own dedicated MCP server.

## 🚀 Features

- **Multi-MCP Orchestration**: Coordinate multiple MCP servers through a central orchestrator
- **MongoDB Integration**: Database operations, analytics, and data management
- **GitHub Integration**: Repository and issue management
- **AI Agent**: Intelligent tool selection and execution
- **Real-time Chat Interface**: Interactive chat with the AI agent
- **System Monitoring**: Health checks and status monitoring

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── agent/           # AI Agent API endpoints
│   │   ├── mcp/             # MCP server endpoints
│   │   │   ├── mongodb/     # MongoDB MCP server
│   │   │   └── github/      # GitHub MCP server
│   │   └── health/          # System health check
│   ├── components/           # React components
│   │   └── AgentChat.tsx    # Chat interface
│   └── mcp-agent/           # Main demo page
├── lib/
│   ├── mcp-servers/         # Individual MCP server implementations
│   │   ├── mongodb-mcp.ts   # MongoDB MCP server
│   │   └── github-mcp.ts    # GitHub MCP server
│   ├── mcp-orchestrator.ts  # MCP server coordination
│   ├── mongodb.ts           # MongoDB connection utility
│   └── agent.ts             # AI agent logic
└── types/
    └── mcp.ts               # MCP protocol types
```

## 🛠️ Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```env
# MongoDB MCP Server
MONGODB_URI=mongodb://localhost:27017/ai-agent-demo
MONGODB_MCP_PORT=3001

# GitHub MCP Server
GITHUB_TOKEN=your-github-token
GITHUB_MCP_PORT=3003

# OpenAI (for future AI integration)
OPENAI_API_KEY=your-openai-api-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Access the Demo

Navigate to `http://localhost:3000/mcp-agent` to see the demo in action.

## 🔧 MCP Server Architecture

### MongoDB MCP Server

**Port**: 3001  
**Tools Available**:
- `mongodb_query`: Execute database operations (find, insert, update, aggregate, delete)
- `mongodb_analytics`: Analyze data (count, summary, schema, trends)

**Example Usage**:
```typescript
// Query users collection
{
  "name": "mongodb_mongodb_query",
  "arguments": {
    "collection": "users",
    "operation": "find",
    "query": { "status": "active" }
  }
}

// Analyze data
{
  "name": "mongodb_mongodb_analytics",
  "arguments": {
    "collection": "users",
    "analysisType": "summary"
  }
}
```

### GitHub MCP Server

**Port**: 3003  
**Tools Available**:
- `github_repositories`: Manage repositories (list, get, search)
- `github_issues`: Handle issues (list, get, create)

**Example Usage**:
```typescript
// List repositories
{
  "name": "github_github_repositories",
  "arguments": {
    "action": "list",
    "owner": "username"
  }
}

// Get issues
{
  "name": "github_github_issues",
  "arguments": {
    "action": "list",
    "owner": "username",
    "repo": "repo-name"
  }
}
```

## 🤖 AI Agent

The AI agent intelligently:
1. **Analyzes** user requests to determine required tools
2. **Orchestrates** multiple MCP servers
3. **Executes** tool calls in the appropriate order
4. **Provides** comprehensive responses with context

### Tool Selection Logic

The agent uses rule-based logic to determine which tools to call:
- **MongoDB-related**: Database queries, analytics, data operations
- **GitHub-related**: Repository management, issue tracking
- **General requests**: Default to MongoDB analytics for demonstration

## 📡 API Endpoints

### Agent API
- `POST /api/agent` - Send message to AI agent
- `GET /api/agent` - Get available tools and system status

### MCP Server APIs
- `POST /api/mcp/mongodb` - MongoDB MCP server
- `GET /api/mcp/mongodb` - MongoDB server status
- `POST /api/mcp/github` - GitHub MCP server
- `GET /api/mcp/github` - GitHub server status

### Health Check
- `GET /api/health` - Overall system health status

## 🔍 How It Works

1. **User Input**: User sends a message through the chat interface
2. **Request Analysis**: AI agent analyzes the request to determine required tools
3. **Tool Selection**: Agent selects appropriate MCP tools from available servers
4. **Tool Execution**: MCP orchestrator executes tools across multiple servers
5. **Response Generation**: Agent generates a comprehensive response with results
6. **Display**: Results are displayed in the chat interface with server indicators

## 🚀 Extending the System

### Adding New MCP Servers

1. Create a new MCP server class in `src/lib/mcp-servers/`
2. Implement the required interface methods
3. Add the server to the orchestrator in `mcp-orchestrator.ts`
4. Create API routes for the new server
5. Update the AI agent's tool selection logic

### Example: Adding a Slack MCP Server

```typescript
// src/lib/mcp-servers/slack-mcp.ts
class SlackMCPServer {
  private tools: MCPTool[] = [
    {
      name: 'slack_messages',
      description: 'Send and retrieve Slack messages',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['send', 'get'] },
          channel: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['action']
      }
    }
  ];

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    // Implementation
  }

  getTools(): MCPTool[] {
    return this.tools;
  }
}
```

## 🧪 Testing

### Manual Testing

1. Start the development server
2. Navigate to the demo page
3. Try different types of requests:
   - "Show me MongoDB data"
   - "List GitHub repositories"
   - "Analyze user data"
   - "Get repository issues"

### API Testing

Test the MCP servers directly:

```bash
# Test MongoDB MCP server
curl -X POST http://localhost:3000/api/mcp/mongodb \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "mongodb_query",
      "arguments": {
        "collection": "users",
        "operation": "find"
      }
    }
  }'

# Test GitHub MCP server
curl -X GET http://localhost:3000/api/mcp/github
```

## 🔒 Security Considerations

- **Environment Variables**: Keep sensitive tokens in `.env.local`
- **API Rate Limiting**: Implement rate limiting for production use
- **Authentication**: Add authentication for production deployments
- **Input Validation**: Validate all user inputs and API requests

## 🚧 Future Enhancements

- **AI-Powered Tool Selection**: Use OpenAI to intelligently select tools
- **More MCP Servers**: Add Shopify, Stripe, HubSpot, etc.
- **Real-time Updates**: WebSocket support for live updates
- **Advanced Analytics**: More sophisticated data analysis tools
- **User Management**: Multi-user support with conversation history
- **Plugin System**: Dynamic MCP server loading

## 📚 Resources

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
- [GitHub REST API](https://docs.github.com/en/rest)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Note**: This is a demonstration project. For production use, implement proper error handling, logging, monitoring, and security measures. 