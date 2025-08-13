import { NextResponse } from 'next/server';
import { mcpOrchestrator } from '../../../lib/mcp-orchestrator';

export async function GET() {
  try {
    const healthStatus = await mcpOrchestrator.healthCheck();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      mcp: healthStatus
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
} 