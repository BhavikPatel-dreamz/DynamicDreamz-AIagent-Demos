const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio');
const GroqClient = require('../../Clients/GroqClient.js');

class ShopifyMCPServer {
  constructor() {
    this.server = new Server({
      name: 'shopify-mcp',
      version: '1.0.0'
    });

    this.shopifyConfig = {
      shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
      apiVersion: '2024-01'
    };

    // Initialize Groq client
    try {
      this.groqClient = new GroqClient({
        apiKey: process.env.GROQ_API_KEY,
        defaultModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
      });
      console.log('Groq client initialized successfully in MCP server');
    } catch (error) {
      console.log('Groq client initialization failed in MCP server:', error.message);
      this.groqClient = null;
    }

    this.setupHandlers();
  }

  setupHandlers() {
    // Product search with AI enhancement
    this.server.setRequestHandler('shopify/search_products', async (params) => {
      try {
        const { query, category, priceRange, limit = 10 } = params;
        
        // Enhanced search with AI understanding
        const enhancedQuery = await this.enhanceSearchQuery(query, category, priceRange);
        const products = await this.searchShopifyProducts(enhancedQuery, limit);
        
        return {
          products: products.map(product => ({
            id: product.id,
            title: product.title,
            price: parseFloat(product.variants[0]?.price || 0),
            category: product.product_type,
            rating: this.calculateProductRating(product),
            reviewCount: product.review_count || 0,
            inStock: product.variants[0]?.inventory_quantity > 0,
            image: product.images[0]?.src,
            description: product.body_html,
            tags: product.tags.split(',').map(tag => tag.trim()),
            variants: product.variants.map(variant => ({
              id: variant.id,
              title: variant.title,
              price: parseFloat(variant.price),
              sku: variant.sku,
              inStock: variant.inventory_quantity > 0
            }))
          }))
        };
      } catch (error) {
        throw new Error(`Product search failed: ${error.message}`);
      }
    });

    // Get order status and tracking
    this.server.setRequestHandler('shopify/get_order_status', async (params) => {
      try {
        const { orderNumber, email } = params;
        
        if (!orderNumber && !email) {
          throw new Error('Order number or email is required');
        }

        const order = await this.getShopifyOrder(orderNumber, email);
        
        return {
          orderNumber: order.order_number,
          status: order.fulfillment_status || 'unfulfilled',
          orderDate: order.created_at,
          estimatedDelivery: this.calculateEstimatedDelivery(order),
          currentLocation: this.getCurrentLocation(order),
          items: order.line_items.map(item => ({
            title: item.title,
            quantity: item.quantity,
            price: parseFloat(item.price),
            status: item.fulfillment_status
          })),
          total: parseFloat(order.total_price),
          shippingAddress: order.shipping_address,
          billingAddress: order.billing_address
        };
      } catch (error) {
        throw new Error(`Order status check failed: ${error.message}`);
      }
    });

    // Get personalized product recommendations
    this.server.setRequestHandler('shopify/get_recommendations', async (params) => {
      try {
        const { userId, category, limit = 6, recentPurchases = [] } = params;
        
        // AI-powered recommendation algorithm
        const recommendations = await this.generateRecommendations(userId, category, recentPurchases, limit);
        
        return {
          products: recommendations.map(product => ({
            id: product.id,
            title: product.title,
            price: parseFloat(product.price),
            category: product.category,
            rating: product.rating,
            reason: product.recommendationReason,
            matchScore: product.matchScore
          }))
        };
      } catch (error) {
        throw new Error(`Recommendations failed: ${error.message}`);
      }
    });

    // Update user preferences
    this.server.setRequestHandler('shopify/update_preferences', async (params) => {
      try {
        const { userId, preferences } = params;
        
        // Store user preferences (could be in database or cache)
        await this.storeUserPreferences(userId, preferences);
        
        return {
          success: true,
          message: 'Preferences updated successfully',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        throw new Error(`Preference update failed: ${error.message}`);
      }
    });

    // Get inventory status
    this.server.setRequestHandler('shopify/check_inventory', async (params) => {
      try {
        const { productIds } = params;
        
        const inventory = await this.getShopifyInventory(productIds);
        
        return {
          inventory: inventory.map(item => ({
            productId: item.product_id,
            variantId: item.variant_id,
            available: item.inventory_quantity,
            reserved: item.inventory_reserved,
            incoming: item.incoming_inventory,
            lowStock: item.inventory_quantity < 10
          }))
        };
      } catch (error) {
        throw new Error(`Inventory check failed: ${error.message}`);
      }
    });

    // Process returns and exchanges
    this.server.setRequestHandler('shopify/process_return', async (params) => {
      try {
        const { orderId, items, reason, returnType } = params;
        
        const returnRequest = await this.createReturnRequest(orderId, items, reason, returnType);
        
        return {
          returnId: returnRequest.id,
          status: 'pending',
          estimatedRefund: returnRequest.estimatedRefund,
          returnLabel: returnRequest.returnLabel,
          instructions: returnRequest.instructions
        };
      } catch (error) {
        throw new Error(`Return processing failed: ${error.message}`);
      }
    });

    // Get shipping rates and options
    this.server.setRequestHandler('shopify/get_shipping_rates', async (params) => {
      try {
        const { origin, destination, items, weight } = params;
        
        const shippingRates = await this.calculateShippingRates(origin, destination, items, weight);
        
        return {
          rates: shippingRates.map(rate => ({
            service: rate.service_name,
            price: rate.rate,
            deliveryDays: rate.delivery_days,
            guaranteed: rate.guaranteed,
            tracking: rate.tracking_available
          }))
        };
      } catch (error) {
        throw new Error(`Shipping calculation failed: ${error.message}`);
      }
    });
  }

  async enhanceSearchQuery(query, category, priceRange) {
    try {
      // Use Groq for enhanced query understanding if available
      if (this.groqClient) {
        return await this.enhanceSearchQueryWithGroq(query, category, priceRange);
      }
    } catch (error) {
      console.log('Groq search enhancement failed, falling back to basic:', error.message);
    }

    // Fallback to basic query enhancement
    let enhancedQuery = query;
    
    if (category) {
      enhancedQuery += ` category:${category}`;
    }
    
    if (priceRange) {
      enhancedQuery += ` price:${priceRange}`;
    }
    
    // Add synonyms and related terms
    const synonyms = await this.getProductSynonyms(query);
    if (synonyms.length > 0) {
      enhancedQuery += ` OR ${synonyms.join(' OR ')}`;
    }
    
    return enhancedQuery;
  }

  async enhanceSearchQueryWithGroq(query, category, priceRange) {
    const prompt = `Enhance this e-commerce search query to improve product discovery:

Original Query: "${query}"
Category: ${category || 'any'}
Price Range: ${priceRange || 'any'}

Enhance the query by:
1. Adding relevant synonyms and related terms
2. Including common product variations
3. Adding category-specific terminology
4. Including price-related terms if applicable
5. Making it more search-friendly

Return only the enhanced query string:`;

    try {
      const enhancedQuery = await this.callGroqAPI(prompt);
      return enhancedQuery.trim();
    } catch (error) {
      console.error('Error enhancing search query with Groq:', error);
      // Fallback to basic enhancement
      return this.enhanceSearchQuery(query, category, priceRange);
    }
  }

  async searchShopifyProducts(query, limit) {
    // Mock Shopify API call - replace with real implementation
    const mockProducts = [
      {
        id: 1,
        title: 'Wireless Bluetooth Headphones',
        product_type: 'Electronics',
        variants: [{ price: '79.99', inventory_quantity: 50 }],
        images: [{ src: '/headphones.jpg' }],
        body_html: 'High-quality wireless headphones with noise cancellation',
        tags: 'wireless, bluetooth, noise-cancelling, audio',
        review_count: 128
      },
      {
        id: 2,
        title: 'Smart Watch Series 5',
        product_type: 'Electronics',
        variants: [{ price: '299.99', inventory_quantity: 25 }],
        images: [{ src: '/smartwatch.jpg' }],
        body_html: 'Advanced smartwatch with health monitoring',
        tags: 'smartwatch, health, fitness, technology',
        review_count: 89
      }
    ];
    
    // Filter based on query
    return mockProducts.filter(product => 
      product.title.toLowerCase().includes(query.toLowerCase()) ||
      product.tags.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);
  }

  async getShopifyOrder(orderNumber, email) {
    // Mock order data - replace with real Shopify API call
    return {
      order_number: orderNumber || '12345',
      fulfillment_status: 'fulfilled',
      created_at: '2024-01-15T10:30:00Z',
      line_items: [
        {
          title: 'Wireless Bluetooth Headphones',
          quantity: 1,
          price: '79.99',
          fulfillment_status: 'fulfilled'
        }
      ],
      total_price: '79.99',
      shipping_address: {
        address1: '123 Main St',
        city: 'New York',
        province: 'NY',
        country: 'US'
      },
      billing_address: {
        address1: '123 Main St',
        city: 'New York',
        province: 'NY',
        country: 'US'
      }
    };
  }

  calculateEstimatedDelivery(order) {
    const orderDate = new Date(order.created_at);
    const estimatedDate = new Date(orderDate);
    estimatedDate.setDate(estimatedDate.getDate() + 5); // 5 business days
    return estimatedDate.toISOString();
  }

  getCurrentLocation(order) {
    if (order.fulfillment_status === 'fulfilled') {
      return 'Delivered to customer';
    } else if (order.fulfillment_status === 'partial') {
      return 'Partially shipped';
    } else {
      return 'Processing at warehouse';
    }
  }

  calculateProductRating(product) {
    // Mock rating calculation - replace with real review data
    return 4.5 + (Math.random() * 0.5);
  }

  async generateRecommendations(userId, category, recentPurchases, limit) {
    // AI-powered recommendation algorithm
    const recommendations = [
      {
        id: 1,
        title: 'Wireless Bluetooth Headphones',
        price: 79.99,
        category: 'Electronics',
        rating: 4.5,
        recommendationReason: 'Based on your interest in audio equipment',
        matchScore: 0.95
      },
      {
        id: 2,
        title: 'Smart Watch Series 5',
        price: 299.99,
        category: 'Electronics',
        rating: 4.8,
        recommendationReason: 'Popular in your preferred category',
        matchScore: 0.87
      }
    ];
    
    return recommendations.slice(0, limit);
  }

  async storeUserPreferences(userId, preferences) {
    // Mock storage - replace with real database implementation
    console.log(`Storing preferences for user ${userId}:`, preferences);
    return true;
  }

  async getProductSynonyms(query) {
    try {
      // Use Groq for enhanced synonym generation if available
      if (this.groqClient) {
        return await this.getProductSynonymsWithGroq(query);
      }
    } catch (error) {
      console.log('Groq synonym generation failed, falling back to basic:', error.message);
    }

    // Fallback to basic synonym mapping
    const synonymMap = {
      'headphones': ['earphones', 'earbuds', 'audio', 'sound'],
      'laptop': ['computer', 'notebook', 'pc', 'macbook'],
      'phone': ['smartphone', 'mobile', 'cellphone', 'iphone']
    };
    
    return synonymMap[query.toLowerCase()] || [];
  }

  async getProductSynonymsWithGroq(query) {
    const prompt = `Generate relevant synonyms and related terms for this e-commerce product query:

Query: "${query}"

Generate a list of:
1. Direct synonyms
2. Related product terms
3. Common variations
4. Category-specific terminology
5. Popular search terms

Return as a comma-separated list:`;

    try {
      const response = await this.callGroqAPI(prompt);
      const synonyms = response.split(',').map(s => s.trim()).filter(s => s.length > 0);
      return synonyms.slice(0, 10); // Limit to 10 synonyms
    } catch (error) {
      console.error('Error generating synonyms with Groq:', error);
      return [];
    }
  }

  async getShopifyInventory(productIds) {
    // Mock inventory data - replace with real Shopify API call
    return productIds.map(id => ({
      product_id: id,
      variant_id: id * 100,
      inventory_quantity: Math.floor(Math.random() * 100),
      inventory_reserved: Math.floor(Math.random() * 10),
      incoming_inventory: Math.floor(Math.random() * 50)
    }));
  }

  async createReturnRequest(orderId, items, reason, returnType) {
    // Mock return processing - replace with real implementation
    return {
      id: `RET-${Date.now()}`,
      estimatedRefund: 79.99,
      returnLabel: 'https://example.com/return-label.pdf',
      instructions: 'Please package items securely and affix the return label'
    };
  }

  async calculateShippingRates(origin, destination, items, weight) {
    // Mock shipping calculation - replace with real shipping API
    return [
      {
        service_name: 'Standard Shipping',
        rate: 5.99,
        delivery_days: 5,
        guaranteed: false,
        tracking_available: true
      },
      {
        service_name: 'Express Shipping',
        rate: 12.99,
        delivery_days: 2,
        guaranteed: true,
        tracking_available: true
      }
    ];
  }

  async callGroqAPI(prompt, systemMessage = null) {
    if (!this.groqClient) {
      throw new Error('Groq client not configured');
    }

    try {
      const messages = [];
      
      if (systemMessage) {
        messages.push({
          role: 'system',
          content: systemMessage
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await this.groqClient.chat(messages, {
        temperature: 0.7,
        maxTokens: 1000
      });
      
      return response || 'No response from Groq';
      
    } catch (error) {
      console.error('Groq API call failed:', error);
      throw error;
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Shopify MCP Server started');
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new ShopifyMCPServer();
  server.start().catch(console.error);
}

module.exports = ShopifyMCPServer; 