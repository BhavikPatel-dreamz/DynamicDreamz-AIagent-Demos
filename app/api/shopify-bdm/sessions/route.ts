import { NextRequest, NextResponse } from 'next/server';
import ShopifyDevConsultantAgent from '../../../../src/agent/ShopifyBDM.js';

// Global agent instance for session management
let globalAgent: ShopifyDevConsultantAgent | null = null;

async function getAgent(): Promise<ShopifyDevConsultantAgent> {
  if (!globalAgent) {
    globalAgent = new ShopifyDevConsultantAgent();
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return globalAgent;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const sessionId = searchParams.get('sessionId');
    
    const agent = await getAgent();
    
    if (action === 'list') {
      // For demo purposes, using null as default. In production, get from auth
      const sessions = await agent.getAllSessions();
      
      return NextResponse.json({
        success: true,
        sessions: sessions || []
      });
    }
    
    if (action === 'load' && sessionId) {
      const loaded = await agent.loadSession(sessionId);
      if (loaded) {
        // Get the session title and history that were loaded into the agent
        return NextResponse.json({
          success: true,
          title: `Chat Session`,
          history: agent.conversationHistory || []
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing parameters'
    }, { status: 400 });
    
  } catch (error) {
    console.error('GET /api/shopify-bdm/sessions error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const agent = await getAgent();
    const { action, sessionId, userId, title } = await request.json();

    switch (action) {
      case 'create':
        const newSession = await agent.createNewSession(userId);
        if (newSession) {
          // Store the new agent instance globally for this session
          globalAgent = newSession.agent;
          return NextResponse.json({
            success: true,
            sessionId: newSession.sessionId,
            title: newSession.title,
            message: 'New session created successfully'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Failed to create new session'
          }, { status: 500 });
        }

      case 'update_title':
        if (!sessionId || !title) {
          return NextResponse.json({
            success: false,
            error: 'Session ID and title required'
          }, { status: 400 });
        }

        const updated = await agent.updateSessionTitle(sessionId, title);
        return NextResponse.json({
          success: updated,
          message: updated ? 'Session title updated' : 'Failed to update session title'
        });

      case 'delete':
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'Session ID required for deletion'
          }, { status: 400 });
        }

        const deleted = await agent.deleteSession(sessionId);
        return NextResponse.json({
          success: deleted,
          message: deleted ? 'Session deleted successfully' : 'Failed to delete session'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: create, update_title, delete'
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Session management error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
