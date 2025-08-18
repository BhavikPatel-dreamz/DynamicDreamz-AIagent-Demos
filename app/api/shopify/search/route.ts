import { NextRequest, NextResponse } from 'next/server';
import ShopifyAIAgent from '../../../../src/agent/ShopifyAIAgent';

const shopifyAgent = new ShopifyAIAgent();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const priceRange = searchParams.get('priceRange');
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Process search through AI agent
    const searchQuery = `search for ${query} ${category ? `in ${category}` : ''} ${priceRange ? `price ${priceRange}` : ''}`;
    const result = await shopifyAgent.processMessage(searchQuery, null);

    if (result.success && result.intent === 'product_search') {
      // Get product recommendations based on search
      const products = await shopifyAgent.getProductRecommendations(null, null);

      return NextResponse.json({
        success: true,
        query,
        category,
        priceRange,
        products,
        total: products.length,
        page,
        limit,
        sortBy,
        intent: result.intent,
        suggestions: result.suggestions,
        response: result.response
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Search failed',
        message: result.response
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Search failed' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, filters, userId } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Build advanced search query
    let searchQuery = `search for ${query}`;
    
    if (filters) {
      if (filters.category) searchQuery += ` in ${filters.category}`;
      if (filters.priceRange) searchQuery += ` price ${filters.priceRange}`;
      if (filters.brand) searchQuery += ` brand ${filters.brand}`;
      if (filters.rating) searchQuery += ` rating ${filters.rating}+`;
    }

    // Process advanced search through AI agent
    const result = await shopifyAgent.processMessage(searchQuery, userId);

    if (result.success && result.intent === 'product_search') {
      // Get filtered product recommendations
      const products = await shopifyAgent.getProductRecommendations(userId || null, null);
      
      return NextResponse.json({
        success: true,
        query,
        filters,
        products,
        total: products.length,
        intent: result.intent,
        suggestions: result.suggestions,
        response: result.response
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Advanced search failed',
        message: result.response
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Advanced search API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Advanced search failed' 
      },
      { status: 500 }
    );
  }
} 