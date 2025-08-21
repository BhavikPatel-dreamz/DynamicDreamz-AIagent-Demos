import { NextRequest, NextResponse } from 'next/server';
import ShopifyDevConsultantAgent from '../../../../src/agent/ShopifyBDM';

const shopifyAgent = new ShopifyDevConsultantAgent();

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Process message through Shopify AI agent
    const result = await shopifyAgent.processConsultationMessage(message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        response: result.response
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
