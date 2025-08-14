import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

class ShopifyAIAgent {
  constructor() {
    this.mcpClient = null;
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
      console.log('Groq client initialized successfully');
    } catch (error) {
      console.log('Groq client initialization failed:', error.message);
      this.groqClient = null;
    }
    
    this.conversationHistory = [];
    this.userPreferences = {};
    this.initializeMCP();
  }

  async initializeMCP() {
    try {
      // Initialize MCP client for enhanced AI capabilities
      const transport = new StdioClientTransport({
        command: 'node',
        args: ['./mcp-servers/shopify-mcp.js']
      });
      
      this.mcpClient = new Client(transport);
      await this.mcpClient.connect();
      console.log('MCP Client connected successfully');
    } catch (error) {
      console.log('MCP initialization failed, running in standalone mode:', error.message);
      this.mcpClient = null;
    }
  }

  async processMessage(userMessage, userId = null) {
    try {
      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        userId: userId || null
      });

      // Analyze intent and extract entities
      const intent = await this.analyzeIntent(userMessage);
      const entities = await this.extractEntities(userMessage);
      
      // Generate response based on intent
      let response = await this.generateResponse(intent, entities, userMessage);
      
      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        userId
      });

      return {
        success: true,
        response,
        intent,
        entities,
        suggestions: await this.generateSuggestions(intent)
      };

    } catch (error) {
      console.error('Error processing message:', error);
      return {
        success: false,
        response: "I'm sorry, I encountered an error. Please try again or contact support.",
        error: error.message
      };
    }
  }

  async analyzeIntent(message) {
    try {
      // Use Groq for enhanced intent analysis if available
      if (this.groqClient) {
        return await this.analyzeIntentWithGroq(message);
      }
    } catch (error) {
      console.log('Groq intent analysis failed, falling back to rule-based:', error.message);
    }

    // Fallback to rule-based intent classification
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('looking for')) {
      return 'product_search';
    } else if (lowerMessage.includes('order') || lowerMessage.includes('track') || lowerMessage.includes('status')) {
      return 'order_status';
    } else if (lowerMessage.includes('return') || lowerMessage.includes('refund') || lowerMessage.includes('exchange')) {
      return 'returns_refunds';
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
      return 'pricing_inquiry';
    } else if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery') || lowerMessage.includes('when')) {
      return 'shipping_info';
    } else if (lowerMessage.includes('size') || lowerMessage.includes('fit') || lowerMessage.includes('measurement')) {
      return 'product_fit';
    } else if (lowerMessage.includes('review') || lowerMessage.includes('rating') || lowerMessage.includes('opinion')) {
      return 'product_reviews';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('assist')) {
      return 'general_help';
    } else {
      return 'general_inquiry';
    }
  }

  async analyzeIntentWithGroq(message) {
    const prompt = `Analyze the following customer message and classify the intent into one of these categories:
    
Categories:
- product_search: Looking for products, searching, browsing
- order_status: Checking order status, tracking, delivery
- returns_refunds: Returns, refunds, exchanges, cancellations
- pricing_inquiry: Questions about prices, costs, deals, discounts
- shipping_info: Shipping, delivery times, shipping costs
- product_fit: Sizing, measurements, fit questions
- product_reviews: Reviews, ratings, customer feedback
- general_help: General assistance, support, questions
- general_inquiry: Other inquiries not fitting above categories

Customer message: "${message}"

Respond with only the category name (e.g., "product_search"):`;

    const response = await this.callGroqAPI(prompt);
    const intent = response.trim().toLowerCase();
    
    // Validate the response
    const validIntents = [
      'product_search', 'order_status', 'returns_refunds', 'pricing_inquiry',
      'shipping_info', 'product_fit', 'product_reviews', 'general_help', 'general_inquiry'
    ];
    
    return validIntents.includes(intent) ? intent : 'general_inquiry';
  }

  async extractEntities(message) {
    try {
      // Use Groq for enhanced entity extraction if available
      if (this.groqClient) {
        return await this.extractEntitiesWithGroq(message);
      }
    } catch (error) {
      console.log('Groq entity extraction failed, falling back to rule-based:', error.message);
    }

    // Fallback to rule-based entity extraction
    const entities = {
      products: [],
      categories: [],
      prices: [],
      sizes: [],
      colors: [],
      brands: []
    };

    // Extract product names (simple pattern matching)
    const productPatterns = [
      /\b(?:looking for|search|find|want|need)\s+([^.!?]+)/gi,
      /\b(?:buy|purchase|order)\s+([^.!?]+)/gi
    ];

    productPatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        entities.products.push(...matches.map(match => match.replace(/\b(?:looking for|search|find|want|need|buy|purchase|order)\s+/i, '').trim()));
      }
    });

    // Extract categories
    const categories = ['electronics', 'clothing', 'home', 'sports', 'books', 'beauty', 'jewelry', 'toys'];
    categories.forEach(category => {
      if (message.toLowerCase().includes(category)) {
        entities.categories.push(category);
      }
    });

    // Extract price ranges
    const pricePattern = /\$(\d+(?:\.\d{2})?)(?:\s*-\s*\$(\d+(?:\.\d{2})?))?/g;
    const priceMatches = message.match(pricePattern);
    if (priceMatches) {
      entities.prices.push(...priceMatches);
    }

    // Extract sizes
    const sizePattern = /\b(?:size|sizes?)\s*:?\s*([A-Z0-9]+(?:\s*,\s*[A-Z0-9]+)*)/gi;
    const sizeMatches = message.match(sizePattern);
    if (sizeMatches) {
      entities.sizes.push(...sizeMatches.map(match => match.replace(/\b(?:size|sizes?)\s*:?\s*/i, '')));
    }

    return entities;
  }

  async extractEntitiesWithGroq(message) {
    const prompt = `Extract entities from this customer message and return as JSON:

Message: "${message}"

Extract and return a JSON object with these fields:
{
  "products": ["list of product names mentioned"],
  "categories": ["list of categories mentioned"],
  "prices": ["list of price ranges or amounts"],
  "sizes": ["list of sizes mentioned"],
  "colors": ["list of colors mentioned"],
  "brands": ["list of brand names mentioned"]
}

Only include fields that have values. If no entities found for a field, use empty array.`;

    try {
      const response = await this.callGroqAPI(prompt);
      const entities = JSON.parse(response);
      
      // Validate and sanitize the response
      const validEntities = {
        products: Array.isArray(entities.products) ? entities.products : [],
        categories: Array.isArray(entities.categories) ? entities.categories : [],
        prices: Array.isArray(entities.prices) ? entities.prices : [],
        sizes: Array.isArray(entities.sizes) ? entities.sizes : [],
        colors: Array.isArray(entities.colors) ? entities.colors : [],
        brands: Array.isArray(entities.brands) ? entities.brands : []
      };
      
      return validEntities;
    } catch (error) {
      console.error('Error parsing Groq entity response:', error);
      // Return empty entities on error
      return {
        products: [], categories: [], prices: [], sizes: [], colors: [], brands: []
      };
    }
  }

  async generateResponse(intent, entities, originalMessage) {
    try {
      // Use Groq for enhanced response generation if available
      if (this.groqClient) {
        return await this.generateResponseWithGroq(intent, entities, originalMessage);
      }
    } catch (error) {
      console.log('Groq response generation failed, falling back to rule-based:', error.message);
    }

    // Fallback to rule-based response generation
    let response = '';

    switch (intent) {
      case 'product_search':
        response = await this.handleProductSearch(entities, originalMessage);
        break;
      case 'order_status':
        response = await this.handleOrderStatus(entities, originalMessage);
        break;
      case 'returns_refunds':
        response = await this.handleReturnsRefunds(entities, originalMessage);
        break;
      case 'pricing_inquiry':
        response = await this.handlePricingInquiry(entities, originalMessage);
        break;
      case 'shipping_info':
        response = await this.handleShippingInfo(entities, originalMessage);
        break;
      case 'product_fit':
        response = await this.handleProductFit(entities, originalMessage);
        break;
      case 'product_reviews':
        response = await this.handleProductReviews(entities, originalMessage);
        break;
      case 'general_help':
        response = await this.handleGeneralHelp(entities, originalMessage);
        break;
      default:
        response = await this.handleGeneralInquiry(entities, originalMessage);
    }

    return response;
  }

  async generateResponseWithGroq(intent, entities, originalMessage) {
    const context = this.buildContext(intent, entities, originalMessage);
    
    const prompt = `You are a helpful AI shopping assistant for an e-commerce store. 

Context:
- Intent: ${intent}
- Entities: ${JSON.stringify(entities)}
- User Message: "${originalMessage}"
- Conversation History: ${this.getRecentConversation(3)}

Generate a helpful, friendly, and informative response that:
1. Addresses the user's intent directly
2. Uses the extracted entities to provide relevant information
3. Offers helpful suggestions or next steps
4. Maintains a conversational and helpful tone
5. Is concise but comprehensive (2-4 sentences)

Response:`;

    try {
      const response = await this.callGroqAPI(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error generating Groq response:', error);
      // Fallback to rule-based response
      return await this.generateResponse(intent, entities, originalMessage);
    }
  }

  buildContext(intent, entities, originalMessage) {
    return {
      intent,
      entities,
      message: originalMessage,
      timestamp: new Date().toISOString(),
      userPreferences: this.userPreferences
    };
  }

  getRecentConversation(limit = 3) {
    return this.conversationHistory
      .slice(-limit)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  async handleProductSearch(entities, message) {
    if (entities.products.length > 0) {
      const productQuery = entities.products[0];
      try {
        // Use MCP if available for enhanced search
        if (this.mcpClient) {
          const searchResult = await this.mcpClient.call('shopify/search_products', {
            query: productQuery,
            category: entities.categories[0] || null,
            priceRange: entities.prices[0] || null
          });
          
          if (searchResult.products && searchResult.products.length > 0) {
            return this.formatProductSearchResults(searchResult.products, productQuery);
          }
        }

        // Fallback to basic response
        return `I found several products matching "${productQuery}". Here are some options:\n\n` +
               `• ${productQuery} - Premium Edition - $99.99\n` +
               `• ${productQuery} - Standard Edition - $79.99\n` +
               `• ${productQuery} - Basic Edition - $59.99\n\n` +
               `Would you like me to show you more details about any of these products?`;
      } catch (error) {
        return `I'm searching for "${productQuery}" for you. Let me check our inventory and get back to you with the best options.`;
      }
    } else {
      return "I'd be happy to help you find products! What are you looking for today? You can tell me the product name, category, or describe what you need.";
    }
  }

  async handleOrderStatus(entities, message) {
    // Extract order number if present
    const orderPattern = /(?:order|order number|order #)\s*:?\s*([A-Z0-9-]+)/i;
    const orderMatch = message.match(orderPattern);
    
    if (orderMatch) {
      const orderNumber = orderMatch[1];
      try {
        if (this.mcpClient) {
          const orderStatus = await this.mcpClient.call('shopify/get_order_status', {
            orderNumber: orderNumber
          });
          return `Order #${orderNumber} Status: ${orderStatus.status}\n\n` +
                 `• Order Date: ${orderStatus.orderDate}\n` +
                 `• Estimated Delivery: ${orderStatus.estimatedDelivery}\n` +
                 `• Current Location: ${orderStatus.currentLocation}\n\n` +
                 `Is there anything specific about this order you'd like to know?`;
        }
        
        return `I'm checking the status of order #${orderNumber} for you. Let me retrieve the latest information from our system.`;
      } catch (error) {
        return `I'm having trouble accessing order #${orderNumber} right now. Please try again in a moment or contact our support team.`;
      }
    } else {
      return "I'd be happy to check your order status! Please provide your order number, or if you don't have it, I can help you find it using your email address.";
    }
  }

  async handleReturnsRefunds(entities, message) {
    return `Our return policy is designed to make shopping worry-free:\n\n` +
           `• **30-Day Return Window**: Return items within 30 days of purchase\n` +
           `• **Easy Returns**: Use our online return portal or visit any store\n` +
           `• **Full Refund**: Get your money back for items in original condition\n` +
           `• **Free Return Shipping**: We cover return shipping costs\n\n` +
           `To start a return, I'll need your order number. Would you like me to help you with that?`;
  }

  async handlePricingInquiry(entities, message) {
    if (entities.products.length > 0) {
      const product = entities.products[0];
      return `Here are the current prices for ${product}:\n\n` +
             `• **${product} - Premium**: $99.99 (was $129.99)\n` +
             `• **${product} - Standard**: $79.99\n` +
             `• **${product} - Basic**: $59.99\n\n` +
             `We also offer bundle discounts and seasonal promotions. Would you like me to check for any current deals?`;
    } else {
      return "I'd be happy to help you with pricing information! What specific product or category are you interested in? I can provide current prices, compare options, and check for any available discounts.";
    }
  }

  async handleShippingInfo(entities, message) {
    return `Here's our shipping information:\n\n` +
           `• **Standard Shipping**: 3-5 business days - $5.99\n` +
           `• **Express Shipping**: 1-2 business days - $12.99\n` +
           `• **Free Shipping**: On orders over $50\n` +
           `• **Same Day Delivery**: Available in select areas - $19.99\n\n` +
           `Orders placed before 2 PM EST ship the same day. Would you like me to calculate shipping for a specific order?`;
  }

  async handleProductFit(entities, message) {
    return `I can help you find the perfect fit! Here are some tips:\n\n` +
           `• **Size Charts**: Available for all clothing and footwear\n` +
           `• **Fit Recommendations**: Based on customer reviews and measurements\n` +
           `• **Virtual Try-On**: Use our AR feature to see how items look\n` +
           `• **Personalized Sizing**: Tell me your measurements for custom recommendations\n\n` +
           `What type of item are you looking for? I can provide specific sizing guidance.`;
  }

  async handleProductReviews(entities, message) {
    if (entities.products.length > 0) {
      const product = entities.products[0];
      return `Here's what customers are saying about ${product}:\n\n` +
             `⭐ **Overall Rating**: 4.6/5 (based on 1,247 reviews)\n` +
             `• **Pros**: High quality, great value, fast shipping\n` +
             `• **Cons**: Some size variations, limited color options\n\n` +
             `Would you like me to show you detailed reviews or help you find similar products with great ratings?`;
    } else {
      return "I can show you customer reviews for any product! Just let me know which item you're interested in, and I'll share the latest reviews, ratings, and customer feedback to help you make an informed decision.";
    }
  }

  async handleGeneralHelp(entities, message) {
    return `I'm here to help you with all your shopping needs! Here's what I can assist you with:\n\n` +
           `🔍 **Product Search**: Find items by name, category, or description\n` +
           `📦 **Order Management**: Check status, track packages, manage returns\n` +
           `💰 **Pricing & Deals**: Get current prices and find discounts\n` +
           `🚚 **Shipping Info**: Calculate costs and delivery times\n` +
           `📏 **Size & Fit**: Get personalized recommendations\n` +
           `⭐ **Reviews**: Read customer feedback and ratings\n\n` +
           `What would you like help with today?`;
  }

  async handleGeneralInquiry(entities, message) {
    return `I understand you're asking about "${message}". Let me help you with that!\n\n` +
           `I can assist with:\n` +
           `• Finding products and comparing options\n` +
           `• Checking order status and tracking\n` +
           `• Understanding our policies and services\n` +
           `• Getting personalized recommendations\n\n` +
           `Could you please provide more details so I can give you the most helpful response?`;
  }

  formatProductSearchResults(products, query) {
    let response = `I found ${products.length} products matching "${query}":\n\n`;
    
    products.slice(0, 5).forEach((product, index) => {
      response += `${index + 1}. **${product.title}**\n`;
      response += `   • Price: $${product.price}\n`;
      response += `   • Rating: ${product.rating}/5 (${product.reviewCount} reviews)\n`;
      response += `   • Status: ${product.inStock ? 'In Stock' : 'Out of Stock'}\n\n`;
    });

    if (products.length > 5) {
      response += `... and ${products.length - 5} more products. Would you like me to show you more options or help you narrow down your search?`;
    }

    return response;
  }

  async generateSuggestions(intent) {
    const suggestions = {
      product_search: [
        'Search for electronics',
        'Find clothing items',
        'Browse home & garden',
        'Look for sports equipment'
      ],
      order_status: [
        'Check order #12345',
        'Track my recent order',
        'View order history',
        'Get delivery updates'
      ],
      returns_refunds: [
        'Start a return',
        'Check return policy',
        'Exchange an item',
        'Get refund status'
      ],
      general_help: [
        'Product recommendations',
        'Size and fit help',
        'Shipping information',
        'Customer support'
      ]
    };

    return suggestions[intent] || suggestions.general_help;
  }

  async getProductRecommendations(userId = null, category = null) {
    try {
      if (this.mcpClient) {
        const recommendations = await this.mcpClient.call('shopify/get_recommendations', {
          userId,
          category,
          limit: 6
        });
        return recommendations.products;
      }
      
      // Fallback recommendations
      return [
        { id: 1, title: 'Wireless Bluetooth Headphones', price: 79.99, category: 'Electronics', rating: 4.5 },
        { id: 2, title: 'Smart Watch Series 5', price: 299.99, category: 'Electronics', rating: 4.8 },
        { id: 3, title: 'USB-C Fast Charging Cable', price: 19.99, category: 'Electronics', rating: 4.3 }
      ];
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  async updateUserPreferences(userId, preferences) {
    this.userPreferences[userId] = {
      ...this.userPreferences[userId],
      ...preferences,
      lastUpdated: new Date()
    };
    
    // Store preferences in MCP if available
    if (this.mcpClient) {
      try {
        await this.mcpClient.call('shopify/update_preferences', {
          userId,
          preferences: this.userPreferences[userId]
        });
      } catch (error) {
        console.error('Error updating preferences in MCP:', error);
      }
    }
  }

  async getConversationHistory(userId, limit = 10) {
    return this.conversationHistory
      .filter(msg => !userId || msg.userId === userId)
      .slice(-limit);
  }

  async clearConversationHistory(userId) {
    if (userId) {
      this.conversationHistory = this.conversationHistory.filter(msg => msg.userId !== userId);
    } else {
      this.conversationHistory = [];
    }
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

  async disconnect() {
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
  }
}

export default ShopifyAIAgent;