import { NextRequest, NextResponse } from 'next/server';
import { MongoDBMCPServer } from '../../../../lib/mcp-servers/mongodb-mcp';

const mongodbServer = new MongoDBMCPServer();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await mongodbServer.handleRequest(body);
    return NextResponse.json(response);
  } catch (error) {
    console.error('MongoDB MCP API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      server: 'MongoDB MCP',
      port: mongodbServer.getPort(),
      tools: mongodbServer.getTools()
    });
  } catch (error) {
    console.error('MongoDB MCP status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 