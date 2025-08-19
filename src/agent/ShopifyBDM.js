import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import GroqClient from "../Clients/GroqClient.js";
import QdrantManager from "../Clients/QdrantManager.js";
import JinaClient from "../Clients/JinaClient.js";
import MongoManager from "../Clients/MongoManager.js";

class ShopifyDevConsultantAgent {

  constructor(config = {}) {
    const {
      mongoDbName = "shopify_consultant",
      collectionName = "shopify_quotes",
      maxHistoryLength = 20,
      chunkSize = 1000,
      chunkOverlap = 200,
      maxContextLength = 4000,
      similarityThreshold = 0.7,
    } = config;

    this.qdrantManager = new QdrantManager();
    this.jina = new JinaClient();
    this.groqClient = new GroqClient();

    this.mongoDbName = mongoDbName;
    this.dbPromise = new MongoManager({ dbName: mongoDbName }).connect();
    this.db = null;

    this.collectionName = collectionName;
    this.maxHistoryLength = maxHistoryLength;
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.maxContextLength = maxContextLength;
    this.similarityThreshold = similarityThreshold;

    this.config = config;
  }

  async initializeDB() {
    if (!this.db) {
      try {
        this.db = await this.dbPromise;
        console.log("✅ Database connection established");
        const collections = await this.db.listCollections().toArray();
        console.log("Available collections:", collections.map(c => c.name));
      } catch (error) {
        console.error(" Error initializing database:", error);
        throw error;
      }
    }
  }

  async processConsultationMessage(message, clientInfo = null) {
    try {
      console.log('🔄 Processing consultation message:', message);

      if (clientInfo) {
        this.currentClient = await this.upsertClient(clientInfo);
      }

      const conversationId = await this.storeConversation({
        role: 'user',
        content: message,
        clientId: this.currentClient?._id,
        timestamp: new Date()
      });

      const intent = await this.analyzeConsultationIntent(message);
      console.log('🎯 Detected intent:', intent);

      let response;
      let metadata = { conversationId, intent };

      switch (intent.type) {
        case 'quote_request':
          response = await this.handleQuoteRequest(message, intent);
          break;
        case 'technical_question':
          response = await this.handleTechnicalQuestion(message, intent);
          break;
        case 'project_scope':
          response = await this.handleProjectScoping(message, intent);
          break;
        case 'pricing_inquiry':
          response = await this.handlePricingInquiry(message, intent);
          break;
        case 'timeline_question':
          response = await this.handleTimelineQuestion(message, intent);
          break;
        case 'capability_question':
          response = await this.handleCapabilityQuestion(message, intent);
          break;
        case 'previous_work':
          response = await this.handlePreviousWorkInquiry(message, intent);
          break;
        default:
          response = await this.handleGeneralConsultation(message, intent);
      }

      // Store assistant response
      await this.storeConversation({
        role: 'assistant',
        content: response,
        clientId: this.currentClient?._id,
        timestamp: new Date(),
        metadata
      });

      return {
        success: true,
        response,
        metadata,
        clientId: this.currentClient?._id
      };

    } catch (error) {
      console.error('❌ Error processing consultation message:', error);
      return {
        success: false,
        response: "I apologize, but I encountered an error. Let me get back to you with a proper consultation response.",
        error: error.message
      };
    }
  }

  async analyzeConsultationIntent(message) {
    const systemPrompt = `You are a Shopify development consultant intent analyzer. Analyze the client message and classify it into one of these categories:

Categories:
- quote_request: Client wants a quote/estimate for a project
- technical_question: Questions about Shopify features, APIs, capabilities
- project_scope: Discussing project requirements and scope
- pricing_inquiry: General pricing questions
- timeline_question: Questions about project timelines
- capability_question: What we can/cannot do with Shopify
- previous_work: Asking about past projects or portfolio
- general: General consultation or unclear intent

Return JSON with: {"type": "category", "confidence": 0.9, "entities": ["extracted", "key", "terms"], "complexity": "low|medium|high"}`;

    try {
      const response = await this.callGroqAPI(message, systemPrompt);
      const cleanResponse = response.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error("Intent analysis failed:", error);
      return { type: 'general', confidence: 0.5, entities: [], complexity: 'medium' };
    }
  }

  async handleQuoteRequest(message, intent) {
    console.log('💰 Handling quote request');
    
    // Get similar past quotes using RAG
    const similarQuotes = await this.getSimilarQuotes(message);
    
    // Get Shopify development guidance
    const shopifyGuidance = await this.getShopifyDevGuidance(intent.entities);
    
    // Generate comprehensive quote response
    const context = {
      message,
      intent,
      similarQuotes,
      shopifyGuidance,
      clientInfo: this.currentClient
    };

    const systemPrompt = `You are a senior Shopify development consultant. Based on the context provided, generate a professional quote response that includes:

1. Acknowledgment of the request
2. Key requirements understanding
3. Estimated pricing ranges (based on similar projects)
4. Timeline estimates
5. Next steps for detailed scoping
6. What information you need from the client

Be professional, detailed but not overwhelming, and always suggest a follow-up call for complex projects.

Context: ${JSON.stringify(context)}`;

    try {
      let response = await this.callGroqAPI(message, systemPrompt);
      
      // Enhance with specific Shopify pricing guidance
      response += await this.addShopifyPricingContext(intent);
      
      // Store this quote request for future RAG
      await this.storeQuoteRequest(message, response, intent);
      
      return response;
    } catch (error) {
      return this.getFallbackQuoteResponse(intent);
    }
  }

  async handleTechnicalQuestion(message, intent) {
    console.log('🔧 Handling technical question');
    
    // Get relevant technical knowledge from RAG
    const technicalKnowledge = await this.getTechnicalKnowledge(message);
    
    // Use Shopify Dev MCP for official guidance
    const officialGuidance = await this.getOfficialShopifyGuidance(intent.entities);
    
    const systemPrompt = `You are a Shopify technical expert. Answer the technical question using:
1. Official Shopify documentation and best practices
2. Real-world implementation experience
3. Code examples where appropriate
4. Limitations and considerations
5. Alternative approaches if applicable

Be accurate, practical, and include implementation details.`;

    const context = {
      question: message,
      technicalKnowledge,
      officialGuidance,
      intent
    };

    try {
      const response = await this.callGroqAPI(
        `Technical Question: ${message}\n\nContext: ${JSON.stringify(context)}`,
        systemPrompt
      );
      
      return response + this.addTechnicalResources(intent.entities);
    } catch (error) {
      return this.getFallbackTechnicalResponse(intent);
    }
  }

  async handleProjectScoping(message, intent) {
    console.log('📋 Handling project scoping');
    
    // Get similar project scopes
    const similarProjects = await this.getSimilarProjects(message);
    
    const systemPrompt = `You are a Shopify project manager helping scope a project. Provide:

1. Detailed breakdown of requirements
2. Technical considerations
3. Potential challenges and solutions
4. Resource requirements
5. Phase-wise approach
6. Dependencies and integrations needed

Be thorough and ask clarifying questions to better understand the scope.`;

    const context = {
      message,
      intent,
      similarProjects,
      clientInfo: this.currentClient
    };

    try {
      const response = await this.callGroqAPI(
        `Project Scoping Request: ${message}`,
        systemPrompt
      );
      
      // Store scoping session for future reference
      await this.storeScopingSession(message, response, intent);
      
      return response;
    } catch (error) {
     console.error("Project scoping failed:", error);
    }
  }

  async handlePricingInquiry(message, intent) {
    console.log('💵 Handling pricing inquiry');
    
    // Get pricing data from similar projects
    const pricingData = await this.getPricingBenchmarks(intent.entities);
    
    const systemPrompt = `You are a Shopify development pricing specialist. Provide transparent, value-based pricing information including:

1. Typical price ranges for requested services
2. Factors that affect pricing
3. Value proposition and ROI
4. Different service tiers/packages
5. What's included/excluded
6. Next steps for detailed estimate

Be honest about pricing while highlighting value.`;

    try {
      const response = await this.callGroqAPI(message, systemPrompt);
      return response + await this.addPricingDisclaimer();
    } catch (error) {
      return this.getFallbackPricingResponse();
    }
  }

  async handleTimelineQuestion(message, intent) {
    console.log('⏰ Handling timeline question');
    
    const timelineData = await this.getTimelineBenchmarks(intent.entities);
    
    const systemPrompt = `You are a Shopify project timeline specialist. Provide realistic timeline estimates including:

1. Typical development phases and durations
2. Factors that affect timeline
3. Dependencies and potential delays
4. Milestone breakdown
5. Client involvement requirements
6. Buffer time recommendations

Be realistic and account for common delays.`;

    try {
      const response = await this.callGroqAPI(message, systemPrompt);
      return response;
    } catch (error) {
      return this.getFallbackTimelineResponse();
    }
  }

  async handleCapabilityQuestion(message, intent) {
    console.log('🚀 Handling capability question');
    
    // Use MCP to get current Shopify capabilities
    const capabilities = await this.getShopifyCapabilities(intent.entities);
    
    const systemPrompt = `You are a Shopify capabilities expert. Explain what's possible with Shopify including:

1. Native features and limitations
2. App ecosystem solutions
3. Custom development options
4. Integration possibilities
5. Scalability considerations
6. Best practices and recommendations

Be comprehensive and suggest optimal approaches.`;

    try {
      const response = await this.callGroqAPI(message, systemPrompt);
      return response;
    } catch (error) {
      return this.getFallbackCapabilityResponse();
    }
  }

  async handlePreviousWorkInquiry(message, intent) {
    console.log('📁 Handling previous work inquiry');
    
    // Get relevant case studies and projects from RAG
    const relevantWork = await this.getRelevantCaseStudies(intent.entities);
    
    const systemPrompt = `You are showcasing relevant Shopify development work. Present case studies that demonstrate:

1. Similar project complexity and scope
2. Technical solutions implemented
3. Results and outcomes achieved
4. Challenges overcome
5. Client testimonials or feedback
6. Lessons learned and improvements made

Focus on relevant examples that match the client's needs.`;

    try {
      const response = await this.callGroqAPI(
        `Previous Work Inquiry: ${message}\n\nRelevant Work: ${JSON.stringify(relevantWork)}`,
        systemPrompt
      );
      return response;
    } catch (error) {
      return this.getFallbackPortfolioResponse();
    }
  }

  async handleGeneralConsultation(message, intent) {
    console.log('💬 Handling general consultation');
    
    const systemPrompt = `You are a senior Shopify consultant providing general guidance. Be helpful, professional, and guide the conversation toward actionable next steps. Always offer to schedule a detailed consultation call.`;

    try {
      const response = await this.callGroqAPI(message, systemPrompt);
      return response + "\n\nWould you like to schedule a detailed consultation call to discuss your specific needs?";
    } catch (error) {
      return "Thank you for reaching out! I'd be happy to help with your Shopify project. Could you share more details about what you're looking to accomplish?";
    }
  }

  // MongoDB Operations
  async upsertClient(clientInfo) {
      if (!this.db) await this.initializeDB();
    
    try {
      const result = await this.db.collection('clients')
        .findOneAndUpdate(
          { email: clientInfo.email },
          { 
            $set: { 
              ...clientInfo, 
              lastContact: new Date(),
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true, returnDocument: 'after' }
        );
      return result.value;
    } catch (error) {
      console.error("Client upsert error:", error);
      return null;
    }
  }

  async storeConversation(conversationData) {
      if (!this.db) await this.initializeDB();
    
    try {
      const result = await this.db.collection('chat_messages')
        .insertOne(conversationData);
      return result.insertedId;
    } catch (error) {
      console.error("Conversation storage error:", error);
      return null;
    }
  }

  async getConversationHistory(clientId, limit = 10) {
       if (!this.db) await this.initializeDB();
    
    try {
      return await this.db.collection('chat_messages')
        .find({ clientId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error("Conversation history error:", error);
      return [];
    }
  }

  async getSimilarQuotes(query) {

    try {
     const embedding = await this.jina.embedText(
        query,
        "jina-embeddings-v2-base-en"
      );
      if (!embedding) return [];

   const results =  await this.qdrantManager.search(this.collectionName, embedding);

      return results.map(r => r.payload);
    } catch (error) {
      console.error("Similar quotes search error:", error);
      return [];
    }
  }

  async getSimilarProjects(query) {
   
    try {
      const embedding = await this.jina.embedText(
        query,
        "jina-embeddings-v2-base-en"
      );
      if (!embedding) return [];

   const results =  await this.qdrantManager.search(this.collectionName, embedding);

      return results.map(r => r.payload);
    } catch (error) {
      console.error("Similar projects search error:", error);
      return [];
    }
  }

  async getTechnicalKnowledge(query) {
    if (!this.qdrantClient) return [];

    try {
       const embedding = await this.jina.embedText(
        query,
        "jina-embeddings-v2-base-en"
      );
      if (!embedding) return [];

        const results =  await this.qdrantManager.search(this.collectionName, embedding);

      return results.map(r => r.payload);
    } catch (error) {
      console.error("Technical knowledge search error:", error);
      return [];
    }
  }

  async storeQuoteRequest(query, response, intent) {

    try {
      const points = [];
      const embedding = await this.jina.embedText(
        query,
        "jina-embeddings-v2-base-en"
      );
      points.push({
        vector: embedding,
        payload: {
          query,
          response,
          intent,
          timestamp: new Date().toISOString(),
          clientId: this.currentClient?._id?.toString()
        }
      });
      // 5️⃣ Store in Qdrant
      await this.qdrantManager.addDocuments(this.collectionName, points);

    } catch (error) {
      console.error("Quote storage error:", error);
    }
  }

  // Shopify MCP Integration
  async getOfficialShopifyGuidance(entities) {
    if (!this.mcpClient) return null;

    try {
      const tools = await this.mcpClient.listTools();
      // Use available Shopify dev tools based on the query
      // This will depend on what tools are available in @shopify/dev-mcp
      
      return { guidance: "Official Shopify guidance would be fetched here", tools: tools.tools?.map(t => t.name) };
    } catch (error) {
      console.error("Shopify MCP error:", error);
      return null;
    }
  }

  async getShopifyDevGuidance(entities) {
    // Similar implementation for development guidance
    return this.getOfficialShopifyGuidance(entities);
  }

  async getShopifyCapabilities(entities) {
    // Get current Shopify platform capabilities
    return this.getOfficialShopifyGuidance(entities);
  }

  // Utility methods
  async callGroqAPI(prompt, systemMessage = null) {
    if (!this.groqClient) {
      throw new Error("Groq client not configured");
    }

    const messages = [];
    if (systemMessage) {
      messages.push({ role: "system", content: systemMessage });
    }
    messages.push({ role: "user", content: prompt });

    return await this.groqClient.chat(messages, {
      temperature: 0.7,
      maxTokens: 2000,
    });
  }

  // Fallback responses
  getFallbackQuoteResponse(intent) {
    return `Thank you for your quote request! Based on your requirements, I'd like to schedule a detailed consultation call to provide you with an accurate estimate. 

Typically, Shopify development projects range from:
• Basic store setup: $2,000 - $5,000
• Custom theme development: $5,000 - $15,000  
• Complex integrations: $10,000 - $50,000+

The exact pricing depends on your specific needs, timeline, and complexity. 

Would you like to schedule a 30-minute consultation call to discuss your project in detail?`;
  }

  getFallbackTechnicalResponse(intent) {
    return `Great technical question! While I gather the most current information for you, here are some key considerations:

• Shopify provides robust APIs for most customization needs
• The platform is highly scalable and secure
• Custom apps can extend functionality significantly
• Integration with third-party services is well-supported

I'd be happy to provide more specific technical details in a consultation call. What's the main challenge you're trying to solve?`;
  }

  async addPricingDisclaimer() {
    return "\n\n*Note: Pricing estimates are based on typical project requirements and may vary based on specific needs, timeline, and complexity. All quotes are subject to detailed project scoping.*";
  }

  async disconnect() {
    try {
      if (this.mcpClient) await this.mcpClient.close();
      if (this.mongoClient) await this.mongoClient.close();
      console.log("✅ Shopify Development Consultant Agent disconnected");
    } catch (error) {
      console.error("❌ Disconnect error:", error);
    }
  }
}

export default ShopifyDevConsultantAgent;