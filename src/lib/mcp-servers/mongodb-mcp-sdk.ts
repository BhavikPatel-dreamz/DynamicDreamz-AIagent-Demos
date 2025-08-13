import { Server } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool,
  TextContent,
  ImageContent,
  EmbeddedResource
} from '@modelcontextprotocol/sdk/types.js';
import { mongodb } from '../mongodb';

class MongoDBMCPServerSDK {
  private server: Server;
  private tools: Tool[] = [
    {
      name: 'mongodb_query',
      description: 'Query MongoDB collections with various operations',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { 
            type: 'string', 
            description: 'Collection name to operate on' 
          },
          operation: { 
            type: 'string', 
            enum: ['find', 'insert', 'update', 'aggregate', 'delete'],
            description: 'Database operation to perform'
          },
          query: { 
            type: 'object', 
            description: 'Query parameters for find/update/delete operations' 
          },
          data: { 
            type: 'object', 
            description: 'Data for insert/update operations' 
          },
          pipeline: { 
            type: 'array', 
            description: 'Aggregation pipeline for aggregate operations' 
          },
          options: {
            type: 'object',
            description: 'Additional options like limit, sort, projection'
          }
        },
        required: ['collection', 'operation']
      }
    },
    {
      name: 'mongodb_analytics',
      description: 'Analyze MongoDB data with various analysis types',
      inputSchema: {
        type: 'object',
        properties: {
          collection: { 
            type: 'string', 
            description: 'Collection to analyze' 
          },
          analysisType: {
            type: 'string',
            enum: ['count', 'summary', 'schema', 'trends', 'distribution', 'correlation'],
            description: 'Type of analysis to perform'
          },
          filters: { 
            type: 'object', 
            description: 'Filters to apply before analysis' 
          },
          groupBy: { 
            type: 'string', 
            description: 'Field to group by for trends/distribution' 
          },
          timeRange: { 
            type: 'object', 
            description: 'Time range for temporal analysis' 
          },
          limit: {
            type: 'number',
            description: 'Limit number of results'
          }
        },
        required: ['collection', 'analysisType']
      }
    },
    {
      name: 'mongodb_collections',
      description: 'List and manage MongoDB collections',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'info', 'stats'],
            description: 'Action to perform on collections'
          },
          collectionName: {
            type: 'string',
            description: 'Specific collection name for info/stats'
          }
        },
        required: ['action']
      }
    }
  ];

  constructor() {
    this.server = new Server(
      {
        name: 'mongodb-mcp-server',
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
          case 'mongodb_query':
            result = await this.handleQuery(args);
            break;
          
          case 'mongodb_analytics':
            result = await this.handleAnalytics(args);
            break;
          
          case 'mongodb_collections':
            result = await this.handleCollections(args);
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

  private async handleQuery(args: any): Promise<any> {
    const { collection, operation, query = {}, data, pipeline, options = {} } = args;

    switch (operation) {
      case 'find':
        return await mongodb.findData(collection, query, options);
      
      case 'insert':
        if (!data) throw new Error('Data required for insert operation');
        return await mongodb.insertData(collection, data);
      
      case 'update':
        if (!data) throw new Error('Data required for update operation');
        return await mongodb.updateData(collection, query, data);
      
      case 'aggregate':
        if (!pipeline) throw new Error('Pipeline required for aggregate operation');
        return await mongodb.aggregateData(collection, pipeline);
      
      case 'delete':
        return await mongodb.deleteData(collection, query);
      
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  private async handleAnalytics(args: any): Promise<any> {
    const { collection, analysisType, filters = {}, groupBy, timeRange, limit = 1000 } = args;

    switch (analysisType) {
      case 'count':
        const countData = await mongodb.findData(collection, filters);
        return { 
          count: countData.length,
          collection,
          filters 
        };
      
      case 'summary':
        const summaryData = await mongodb.findData(collection, filters, { limit });
        return {
          totalRecords: summaryData.length,
          sampleData: summaryData.slice(0, 5),
          fields: summaryData.length > 0 ? Object.keys(summaryData[0]) : [],
          collection,
          filters
        };
      
      case 'schema':
        const schemaData = await mongodb.findData(collection, {}, { limit });
        const schema = this.analyzeSchema(schemaData);
        return { 
          schema,
          collection,
          sampleSize: schemaData.length
        };
      
      case 'trends':
        if (!timeRange || !groupBy) {
          throw new Error('timeRange and groupBy required for trends analysis');
        }
        return await this.analyzeTrends(collection, filters, groupBy, timeRange);
      
      case 'distribution':
        if (!groupBy) throw new Error('groupBy required for distribution analysis');
        return await this.analyzeDistribution(collection, filters, groupBy, limit);
      
      case 'correlation':
        return await this.analyzeCorrelation(collection, filters, limit);
      
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }
  }

  private async handleCollections(args: any): Promise<any> {
    const { action, collectionName } = args;

    try {
      await mongodb.connect();
      const db = mongodb.getDatabase();

      switch (action) {
        case 'list':
          const collections = await db.listCollections().toArray();
          return {
            collections: collections.map(col => ({
              name: col.name,
              type: col.type,
              options: col.options
            }))
          };
        
        case 'info':
          if (!collectionName) throw new Error('Collection name required for info action');
          const collection = db.collection(collectionName);
          const count = await collection.countDocuments();
          const stats = await db.command({ collStats: collectionName });
          return {
            name: collectionName,
            count,
            stats
          };
        
        case 'stats':
          if (!collectionName) throw new Error('Collection name required for stats action');
          const collStats = await db.command({ collStats: collectionName });
          return {
            name: collectionName,
            stats: collStats
          };
        
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      throw new Error(`Collection operation failed: ${error instanceof Error ? error.message : error}`);
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
          schema[key] = { 
            type, 
            examples: [],
            count: 0,
            nullable: false
          };
        }
        
        schema[key].count++;
        
        if (value === null || value === undefined) {
          schema[key].nullable = true;
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

  private async analyzeDistribution(collection: string, filters: any, groupBy: string, limit: number): Promise<any> {
    const pipeline = [
      { $match: filters },
      {
        $group: {
          _id: `$${groupBy}`,
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ];

    return await mongodb.aggregateData(collection, pipeline);
  }

  private async analyzeCorrelation(collection: string, filters: any, limit: number): Promise<any> {
    const data = await mongodb.findData(collection, filters, { limit });
    
    if (data.length < 2) {
      return { message: 'Insufficient data for correlation analysis' };
    }

    // Simple correlation analysis - find numeric fields and calculate basic correlations
    const numericFields = Object.keys(data[0]).filter(key => 
      typeof data[0][key] === 'number'
    );

    if (numericFields.length < 2) {
      return { message: 'Need at least 2 numeric fields for correlation analysis' };
    }

    const correlations: any = {};
    
    for (let i = 0; i < numericFields.length; i++) {
      for (let j = i + 1; j < numericFields.length; j++) {
        const field1 = numericFields[i];
        const field2 = numericFields[j];
        
        const correlation = this.calculateCorrelation(
          data.map(doc => doc[field1]),
          data.map(doc => doc[field2])
        );
        
        correlations[`${field1}_vs_${field2}`] = correlation;
      }
    }

    return {
      correlations,
      numericFields,
      sampleSize: data.length
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  async start(): Promise<void> {
    try {
      await this.server.connect(new StdioServerTransport());
      console.log('🚀 MongoDB MCP Server (SDK) started successfully');
    } catch (error) {
      console.error('Failed to start MongoDB MCP Server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.server.close();
      console.log('🛑 MongoDB MCP Server (SDK) stopped');
    } catch (error) {
      console.error('Error stopping MongoDB MCP Server:', error);
    }
  }
}

// Start server if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MongoDBMCPServerSDK();
  server.start().catch(console.error);
}

export { MongoDBMCPServerSDK }; 