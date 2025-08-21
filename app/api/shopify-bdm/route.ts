import { NextRequest, NextResponse } from 'next/server';
import ShopifyDevConsultantAgent from '../../../src/agent/ShopifyBDM.js';

// Store multiple agent instances by session ID
const sessionAgents = new Map<string, ShopifyDevConsultantAgent>();

// Initialize or get agent instance for a session
async function getAgentInstance(sessionId?: string): Promise<{ agent: ShopifyDevConsultantAgent, sessionId: string }> {
  let actualSessionId = sessionId;
  
  if (!actualSessionId) {
    // Create new session if none provided
    const tempAgent = new ShopifyDevConsultantAgent();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newSession = await tempAgent.createNewSession();
    actualSessionId = newSession?.sessionId || `session_${Date.now()}`;
    sessionAgents.set(actualSessionId, newSession?.agent || tempAgent);
    return { agent: newSession?.agent || tempAgent, sessionId: actualSessionId };
  }

  // Get existing session agent or create new one
  let agent = sessionAgents.get(actualSessionId);
  if (!agent) {
    agent = new (ShopifyDevConsultantAgent as any)(actualSessionId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (agent) {
      // Try to load existing session
      const loaded = await agent.loadSession(actualSessionId);
      if (!loaded) {
        // Session doesn't exist, create new one with this ID
        console.log(`Creating new session with ID: ${actualSessionId}`);
      }
      sessionAgents.set(actualSessionId, agent);
    }
  }

  if (!agent) {
    throw new Error('Failed to create or retrieve agent instance');
  }

  return { agent, sessionId: actualSessionId };
}

export async function POST(request: NextRequest) {
  try {
    const { message, clientInfo, sessionId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Get the agent instance for this session
    const { agent, sessionId: actualSessionId } = await getAgentInstance(sessionId);

    // Process the consultation message with enhanced search
    const result = await agent.processConsultationMessage(message, clientInfo);

    if (result.success) {
      return NextResponse.json({
        success: true,
        response: result.response,
        metadata: result.metadata,
        clientId: result.clientId,
        sessionId: actualSessionId
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to process message',
          response: result.response,
          sessionId: actualSessionId
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('API Error:', error);
    
    // Return a fallback response
    const fallbackResponse = generateFallbackResponse();
    
    return NextResponse.json({
      success: true,
      response: fallbackResponse,
      metadata: { 
        intent: { type: 'general' },
        fallback: true,
        error: error?.message || 'Unknown error'
      }
    });
  }
}

function generateFallbackResponse() {
  return `Thank you for reaching out about your Shopify project! I'm here to help you with:

**🛍️ Shopify Development Services:**
• Custom store setup and configuration
• Theme development and customization
• App integrations and custom functionality
• Performance optimization
• Migration from other platforms

** What I Need to Help You:**
• Project requirements and scope
• Current store status (if any)
• Budget range and timeline
• Specific features needed
• Integration requirements

I'd be happy to provide detailed pricing and timeline estimates based on your specific project requirements. 

Would you like to schedule a **free 30-minute consultation call** to discuss your project in detail?

*Please note: All estimates will be based on your specific needs and project complexity.*`;
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy', 
    service: 'Shopify BDM Chat API',
    timestamp: new Date().toISOString()
  });
}
