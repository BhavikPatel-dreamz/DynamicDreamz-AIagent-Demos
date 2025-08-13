import { NextRequest, NextResponse } from 'next/server';
import { GitHubMCPServer } from '../../../../lib/mcp-servers/github-mcp';

const githubServer = new GitHubMCPServer();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await githubServer.handleRequest(body);
    return NextResponse.json(response);
  } catch (error) {
    console.error('GitHub MCP API error:', error);
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
      server: 'GitHub MCP',
      port: githubServer.getPort(),
      tools: githubServer.getTools()
    });
  } catch (error) {
    console.error('GitHub MCP status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 