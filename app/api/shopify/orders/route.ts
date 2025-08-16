import { NextRequest, NextResponse } from 'next/server';
import ShopifyAIAgent from '../../../../agent/ShopifyAIAgent';

const shopifyAgent = new ShopifyAIAgent();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!orderNumber && !email) {
      return NextResponse.json(
        { error: 'Order number or email is required' },
        { status: 400 }
      );
    }

    // Process order status request through AI agent
    const query = orderNumber 
      ? `check order status for order #${orderNumber}`
      : `check order status for email ${email}`;

    const result = await shopifyAgent.processMessage(query);

    if (result.success && result.intent === 'order_status') {
      return NextResponse.json({
        success: true,
        response: result.response,
        intent: result.intent,
        suggestions: result.suggestions
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Order status check failed',
        message: result.response
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check order status' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, orderData, userId } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    let result;
    let query = '';

    switch (action) {
      case 'create_return':
        query = `create return request for order ${orderData.orderNumber} with items ${orderData.items.join(', ')}`;
        break;
      case 'cancel_order':
        query = `cancel order ${orderData.orderNumber}`;
        break;
      case 'modify_order':
        query = `modify order ${orderData.orderNumber} with changes ${JSON.stringify(orderData.changes)}`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    result = await shopifyAgent.processMessage(query, userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        response: result.response,
        intent: result.intent,
        suggestions: result.suggestions
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Order action failed',
        message: result.response
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Orders action API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process order action' 
      },
      { status: 500 }
    );
  }
} 