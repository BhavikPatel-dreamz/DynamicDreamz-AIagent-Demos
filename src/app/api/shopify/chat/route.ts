import { NextRequest, NextResponse } from 'next/server';
import ShopifyAIAgent from '../../../../agent/ShopifyAIAgent';

const shopifyAgent = new ShopifyAIAgent();

export async function POST(request: NextRequest) {
  try {
    const { message, userId, sessionId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Process message through Shopify AI agent
    const result = await shopifyAgent.processMessage(message, userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        response: result.response,
        intent: result.intent,
        entities: result.entities,
        suggestions: result.suggestions,
        sessionId: sessionId || `session_${Date.now()}`
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          response: result.response 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        response: "I'm sorry, I'm experiencing technical difficulties. Please try again in a moment."
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get conversation history
    const history = await shopifyAgent.getConversationHistory(userId, limit);

    return NextResponse.json({
      success: true,
      history,
      count: history.length
    });

  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve conversation history' 
      },
      { status: 500 }
    );
  }
} 