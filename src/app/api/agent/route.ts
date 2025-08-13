import { NextRequest, NextResponse } from 'next/server';
import { aiAgent } from '../../../lib/agent';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const response = await aiAgent.processMessage(message);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [tools, status] = await Promise.all([
      aiAgent.getAvailableTools(),
      aiAgent.getSystemStatus()
    ]);

    return NextResponse.json({
      tools,
      status,
      conversationHistory: aiAgent.getConversationHistory()
    });
  } catch (error) {
    console.error('Agent status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 