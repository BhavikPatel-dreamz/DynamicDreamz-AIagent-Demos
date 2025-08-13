import express from 'express';
import cors from 'cors';
import { MCPRequest, MCPResponse, MCPTool } from '../../types/mcp';
import { mongodb } from '../mongodb';

class MongoDBMCPServer {
  private app: express.Application;
  private port: number;
  
  private tools: MCPTool[] = [
    {
      name: 'mongodb_query',
      description: 'Query MongoDB collections',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection name' },
          operation: { 
            type: 'string', 
            enum: ['find', 'insert', 'update', 'aggregate', 'delete'],
            description: 'Operation to perform'
          },
          query: { type: 'object', description: 'Query parameters' },
          data: { type: 'object', description: 'Data for insert/update operations' },
          pipeline: { type: 'array', description: 'Aggregation pipeline' }
        },
        required: ['collection', 'operation']
      }
    },
    {
      name: 'mongodb_analytics',
      description: 'Analyze MongoDB data',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection to analyze' },
          analysisType: {
            type: 'string',
            enum: ['count', 'aggregate', 'trends', 'summary', 'schema'],
            description: 'Type of analysis'
          },
          filters: { type: 'object', description: 'Filters to apply' },
          groupBy: { type: 'string', description: 'Field to group by' },
          timeRange: { type: 'object', description: 'Time range for analysis' }
        },
        required: ['collection', 'analysisType']
      }
    }
  ];

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.MONGODB_MCP_PORT || '3001');
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    this.app.post('/mcp', async (req, res) => {
      try {
        const mcpRequest: MCPRequest = req.body;
        const response = await this.handleRequest(mcpRequest);
        res.json(response);
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id || null,
          error: { code: -32603, message: 'Internal error', data: error }
        });
      }
    });

    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', server: 'MongoDB MCP', port: this.port });
    });

    this.app.get('/tools', (req, res) => {
      res.json({ tools: this.tools });
    });
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
        case 'mongodb_query':
          result = await this.handleQuery(args);
          break;
        
        case 'mongodb_analytics':
          result = await this.handleAnalytics(args);
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

  private async handleQuery(args: any): Promise<any> {
    const { collection, operation, query = {}, data, pipeline } = args;

    switch (operation) {
      case 'find':
        return await mongodb.findData(collection, query);
      
      case 'insert':
        return await mongodb.insertData(collection, data);
      
      case 'update':
        return await mongodb.updateData(collection, query, data);
      
      case 'aggregate':
        return await mongodb.aggregateData(collection, pipeline);
      
      case 'delete':
        return await mongodb.deleteData(collection, query);
      
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  private async handleAnalytics(args: any): Promise<any> {
    const { collection, analysisType, filters = {}, groupBy, timeRange } = args;

    switch (analysisType) {
      case 'count':
        const data = await mongodb.findData(collection, filters);
        return { count: data.length };
      
      case 'summary':
        const summaryData = await mongodb.findData(collection, filters, { limit: 100 });
        return {
          totalRecords: summaryData.length,
          sampleData: summaryData.slice(0, 5),
          fields: summaryData.length > 0 ? Object.keys(summaryData[0]) : []
        };
      
      case 'schema':
        const schemaData = await mongodb.findData(collection, {}, { limit: 1000 });
        const schema = this.analyzeSchema(schemaData);
        return { schema };
      
      case 'trends':
        if (!timeRange || !groupBy) throw new Error('timeRange and groupBy required for trends');
        return await this.analyzeTrends(collection, filters, groupBy, timeRange);
      
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }
  }

  private analyzeSchema(data: any[]): any {
    if (data.length === 0) return {};
    
    const schema: any = {};
    
    data.forEach(doc => {
      Object.keys(doc).forEach(key => {
        const value = doc[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        
        if (!schema[key]) {
          schema[key] = { type, examples: [] };
        }
        
        if (schema[key].examples.length < 3) {
          schema[key].examples.push(value);
        }
      });
    });
    
    return schema;
  }

  private async analyzeTrends(collection: string, filters: any, groupBy: string, timeRange: any): Promise<any> {
    const pipeline = [
      { $match: { ...filters, [groupBy]: { $gte: new Date(timeRange.start), $lte: new Date(timeRange.end) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: `$${groupBy}` } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    return await mongodb.aggregateData(collection, pipeline);
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 MongoDB MCP Server running on port ${this.port}`);
    });
  }

  getPort(): number {
    return this.port;
  }

  getTools(): MCPTool[] {
    return this.tools;
  }
}

export { MongoDBMCPServer }; 