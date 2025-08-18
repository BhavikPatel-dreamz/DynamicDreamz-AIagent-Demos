import { NextRequest, NextResponse } from 'next/server';
import ShopifyAIAgent from '../../../../src/agent/ShopifyAIAgent';

const shopifyAgent = new ShopifyAIAgent();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const priceRange = searchParams.get('priceRange') || '';

    if (!query && !category) {
      // Return featured products if no search query
      const featuredProducts = await shopifyAgent.getProductRecommendations(null, null);
      
      return NextResponse.json({
        success: true,
        products: featuredProducts,
        total: featuredProducts.length,
        page,
        limit,
        query: 'featured'
      });
    }

    // Process search through AI agent
    const result = await shopifyAgent.processMessage(
      `search for ${query} ${category ? `in ${category}` : ''} ${priceRange ? `price ${priceRange}` : ''}`,
      null
    );

    if (result.success && result.intent === 'product_search') {
      // Extract products from the response
      const products = await shopifyAgent.getProductRecommendations(null, null);
      
      return NextResponse.json({
        success: true,
        products,
        total: products.length,
        page,
        limit,
        query,
        category,
        priceRange,
        intent: result.intent,
        suggestions: result.suggestions
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Product search failed',
        message: result.response
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search products' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { productIds, userId } = await request.json();

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'Product IDs array is required' },
        { status: 400 }
      );
    }

    // Get detailed product information
    const products = await Promise.all(
      productIds.map(async (id) => {
        // Mock product data - replace with real Shopify API call
        const mockProduct = {
          id: parseInt(id),
          title: `Product ${id}`,
          description: `Detailed description for product ${id}`,
          price: Math.floor(Math.random() * 100) + 19.99,
          category: 'Electronics',
          rating: 4.0 + (Math.random() * 1.0),
          reviewCount: Math.floor(Math.random() * 200) + 10,
          inStock: Math.random() > 0.3,
          images: [`/product-${id}.jpg`],
          variants: [
            {
              id: parseInt(id) * 100,
              title: 'Default',
              price: Math.floor(Math.random() * 100) + 19.99,
              sku: `SKU-${id}`,
              inStock: Math.random() > 0.3
            }
          ],
          tags: ['electronics', 'featured'],
          specifications: {
            weight: '0.5 lbs',
            dimensions: '5" x 3" x 1"',
            warranty: '1 year'
          }
        };

        return mockProduct;
      })
    );

    return NextResponse.json({
      success: true,
      products,
      count: products.length
    });

  } catch (error) {
    console.error('Products detail API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get product details' 
      },
      { status: 500 }
    );
  }
} 