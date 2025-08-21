import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import GroqClient from "../Clients/GroqClient.js";
import QdrantManager from "../Clients/QdrantManager.js";
import JinaClient from "../Clients/JinaClient.js";
import MongoManager from "../Clients/MongoManager.js";


class ShopifyDevConsultantAgent {
  constructor(sessionId = null) {
    this.mcpClient = null;
    this.mongoManager = null;
    this.db = null;
    this.qdrantClient = null;
    this.groqClient = null;
    
    // Session management
    this.sessionId = sessionId || this.generateSessionId();
    this.conversationHistory = [];
    this.currentClient = null;
    
    // Configuration
    this.config = {
      mongodb: {
        url: process.env.MONGO_URL,
        dbName: 'shopify_consultant',
        collections: {
          conversations: 'bdm_conversations',
          clients: 'bdm_clients',
          quotes: 'bdm_quotes',
          projects: 'bdm_projects',
          sessions: 'chat_sessions'
        }
      },
      qdrant: {
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY,
        collections: {
          quotes: 'shopify_quotes',
          projects: 'shopify_projects',
          knowledge: 'shopify_knowledge'
        }
      },
      jina: {
        apiKey: process.env.JINA_API_KEY,
        baseUrl: 'https://api.jina.ai/v1/embeddings'
      }
    };
    
    // Initialize all services
    this.initialize();
  }

  // Session management methods
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createNewSession(userId = null) {
    const newSessionId = this.generateSessionId();
    
    try {
      if (this.db) {
        await this.db.collection(this.config.mongodb.collections.sessions).insertOne({
          sessionId: newSessionId,
          userId: userId,
          createdAt: new Date(),
          lastActivity: new Date(),
          messageCount: 0,
          title: 'New Chat',
          status: 'active'
        });
      }
      
      // Create new instance with new session
      const newAgent = new ShopifyDevConsultantAgent(newSessionId);
      newAgent.currentClient = this.currentClient;
      
      return {
        sessionId: newSessionId,
        agent: newAgent,
        title: 'New Chat'
      };
    } catch (error) {
      console.error('Error creating new session:', error);
      return null;
    }
  }

  async loadSession(sessionId) {
    try {
      if (!this.db) return false;

      // Load session data
      const session = await this.db.collection(this.config.mongodb.collections.sessions)
        .findOne({ sessionId });

      if (!session) return false;

      // Load conversation history for this session
      const conversations = await this.db.collection(this.config.mongodb.collections.conversations)
        .find({ sessionId })
        .sort({ timestamp: 1 })
        .toArray();

      this.sessionId = sessionId;
      this.conversationHistory = conversations;

      // Update last activity
      await this.db.collection(this.config.mongodb.collections.sessions)
        .updateOne(
          { sessionId },
          { $set: { lastActivity: new Date() } }
        );

      return true;
    } catch (error) {
      console.error('Error loading session:', error);
      return false;
    }
  }

  async getAllSessions(userId = null) {
    try {
      if (!this.db) return [];

      const query = userId ? { userId } : {};
      const sessions = await this.db.collection(this.config.mongodb.collections.sessions)
        .find(query)
        .sort({ lastActivity: -1 })
        .toArray();

      return sessions.map(session => ({
        sessionId: session.sessionId,
        title: session.title || 'Chat Session',
        lastActivity: session.lastActivity,
        messageCount: session.messageCount,
        createdAt: session.createdAt
      }));
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  }

  async updateSessionTitle(sessionId, title) {
    try {
      if (!this.db) return false;

      await this.db.collection(this.config.mongodb.collections.sessions)
        .updateOne(
          { sessionId },
          { $set: { title } }
        );

      return true;
    } catch (error) {
      console.error('Error updating session title:', error);
      return false;
    }
  }

  async deleteSession(sessionId) {
    try {
      if (!this.db) return false;

      // Delete session and its conversations
      await Promise.all([
        this.db.collection(this.config.mongodb.collections.sessions).deleteOne({ sessionId }),
        this.db.collection(this.config.mongodb.collections.conversations).deleteMany({ sessionId })
      ]);

      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  async initialize() {
    try {
      // Initialize Groq client
      this.groqClient = new GroqClient();
      console.log("✅ Groq client initialized");

      // Initialize MongoDB
      await this.initializeMongoDB();
      
      // Initialize Qdrant
      await this.initializeQdrant();
      
      // Initialize MCP
      await this.initializeShopifyMCP();
      
      console.log("🚀 Shopify Development Consultant Agent ready!");
    } catch (error) {
      console.error("❌ Initialization error:", error);
    }
  }

  async initializeMongoDB() {
    try {
      this.mongoManager = new MongoManager({
        url: this.config.mongodb.url,
        dbName: this.config.mongodb.dbName
      });
      
      this.db = await this.mongoManager.connect();
      
      // Create indexes for better performance
      await this.createMongoIndexes();
      console.log("✅ MongoDB connected via MongoManager");
    } catch (error) {
      console.error("❌ MongoDB initialization failed:", error);
      this.mongoManager = null;
      this.db = null;
    }
  }

  async createMongoIndexes() {
    try {
      await this.db.collection(this.config.mongodb.collections.conversations)
        .createIndex({ clientId: 1, timestamp: -1 });
      await this.db.collection(this.config.mongodb.collections.clients)
        .createIndex({ email: 1 }, { unique: true });
      await this.db.collection(this.config.mongodb.collections.quotes)
        .createIndex({ clientId: 1, createdAt: -1 });
    } catch (error) {
      console.log("Index creation warning:", error.message);
    }
  }

  async initializeQdrant() {
    try {
      this.qdrantClient = new QdrantClient({
        url: this.config.qdrant.url,
        apiKey: this.config.qdrant.apiKey,
      });
      
      // Check connection
      await this.qdrantClient.getCollections();
      console.log("✅ Qdrant connected");
      
      // Initialize required collections
      await this.initializeQdrantCollections();
    } catch (error) {
      console.error("❌ Qdrant initialization failed:", error);
      this.qdrantClient = null;
    }
  }

  async initializeQdrantCollections() {
    if (!this.qdrantClient) return;

    const collections = [
      this.config.qdrant.collections.quotes,
      this.config.qdrant.collections.projects, 
      this.config.qdrant.collections.knowledge
    ];

    for (const collectionName of collections) {
      try {
        // Check if collection exists
        const collectionInfo = await this.qdrantClient.getCollection(collectionName);
        console.log(`✅ Collection ${collectionName} exists`);
      } catch (error) {
        // Collection doesn't exist, create it
        try {
          await this.qdrantClient.createCollection(collectionName, {
            vectors: {
              size: 1024, // Jina embeddings are 1024 dimensions
              distance: 'Cosine'
            }
          });
          console.log(`✅ Created collection ${collectionName}`);
        } catch (createError) {
          console.error(`❌ Failed to create collection ${collectionName}:`, createError);
        }
      }
    }
  }

  async initializeShopifyMCP() {
    try {
      const transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@shopify/dev-mcp@latest"],
        env: {
          ...process.env,
        }
      });

      this.mcpClient = new Client(
        { name: "shopify-dev-consultant", version: "1.0.0" },
        { capabilities: { tools: {}, resources: {} } }
      );

      const connectPromise = this.mcpClient.connect(transport);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("MCP connect timeout")), 10000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      const tools = await this.mcpClient.listTools();
      console.log("✅ Shopify Dev MCP connected. Available tools:", 
        tools.tools?.map(t => t.name).slice(0, 5));
    } catch (error) {
      console.error("❌ Shopify MCP initialization failed:", error);
      this.mcpClient = null;
    }
  }

  async processConsultationMessage(message, clientInfo = null) {
    try {
      console.log('🔄 Processing consultation message:', message);
      
      // Store client info if provided
      if (clientInfo) {
        this.currentClient = await this.upsertClient(clientInfo);
      }

      // Store conversation in MongoDB with session ID
      const conversationId = await this.storeConversation({
        role: 'user',
        content: message,
        sessionId: this.sessionId,
        clientId: this.currentClient?._id,
        timestamp: new Date()
      });

      // Comprehensive search across all data sources
      const searchResults = await this.performComprehensiveSearch(message);

      // Analyze the message intent with enhanced context
      const intent = await this.analyzeConsultationIntent(message, searchResults);
      console.log('🎯 Detected intent:', intent);

      let response;
      let metadata = { conversationId, intent, sessionId: this.sessionId, searchResults };

      // Enhanced response generation with comprehensive context
      switch (intent.type) {
        case 'quote_request':
          response = await this.handleQuoteRequest(message, intent, searchResults);
          break;
        case 'technical_question':
          response = await this.handleTechnicalQuestion(message, intent, searchResults);
          break;
        case 'project_scope':
          response = await this.handleProjectScoping(message, intent, searchResults);
          break;
        case 'pricing_inquiry':
          response = await this.handlePricingInquiry(message, intent, searchResults);
          break;
        case 'timeline_question':
          response = await this.handleTimelineQuestion(message, intent, searchResults);
          break;
        case 'capability_question':
          response = await this.handleCapabilityQuestion(message, intent, searchResults);
          break;
        case 'previous_work':
          response = await this.handlePreviousWorkInquiry(message, intent, searchResults);
          break;
        default:
          response = await this.handleGeneralConsultation(message, intent, searchResults);
      }

      // Store assistant response with session context
      await this.storeConversation({
        role: 'assistant',
        content: response,
        sessionId: this.sessionId,
        clientId: this.currentClient?._id,
        timestamp: new Date(),
        metadata
      });

      // Update session activity
      await this.updateSessionActivity();

      return {
        success: true,
        response,
        metadata,
        sessionId: this.sessionId,
        clientId: this.currentClient?._id
      };

    } catch (error) {
      console.error('❌ Error processing consultation message:', error);
      return {
        success: false,
        response: "I apologize, but I encountered an error. Let me get back to you with a proper consultation response.",
        error: error.message,
        sessionId: this.sessionId
      };
    }
  }

  // Comprehensive search across all data sources
  async performComprehensiveSearch(query) {
    console.log('🔍 Performing comprehensive search for:', query);
    
    try {
      const searchResults = {
        projects: [],
        quotes: [],
        knowledge: [],
        conversations: [],
        totalResults: 0
      };

      // Parallel search across all sources
      const searchPromises = [
        this.searchMongoDBProjects(query),
        this.searchMongoDBQuotes(query),
        this.searchConversationHistory(query),
        this.searchQdrantProjects(query),
        this.searchQdrantQuotes(query),
        this.searchQdrantKnowledge(query)
      ];

      const [
        mongoProjects,
        mongoQuotes,
        conversations,
        qdrantProjects,
        qdrantQuotes,
        qdrantKnowledge
      ] = await Promise.all(searchPromises);

      // Combine and deduplicate results
      searchResults.projects = this.combineAndDeduplicateResults(mongoProjects, qdrantProjects, 'title');
      searchResults.quotes = this.combineAndDeduplicateResults(mongoQuotes, qdrantQuotes, 'title');
      searchResults.knowledge = qdrantKnowledge || [];
      searchResults.conversations = conversations || [];
      
      searchResults.totalResults = 
        searchResults.projects.length + 
        searchResults.quotes.length + 
        searchResults.knowledge.length + 
        searchResults.conversations.length;

      console.log(`📊 Search results: ${searchResults.totalResults} total items found`);
      
      return searchResults;
    } catch (error) {
      console.error('❌ Comprehensive search error:', error);
      return {
        projects: [],
        quotes: [],
        knowledge: [],
        conversations: [],
        totalResults: 0
      };
    }
  }

  // Enhanced MongoDB search methods
  async searchMongoDBProjects(query) {
    try {
      if (!this.db) return [];

      const keywords = this.extractKeywords(query);
      const searchQuery = {
        $or: [
          { title: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } },
          { industry: { $regex: keywords.join('|'), $options: 'i' } },
          { projectType: { $regex: keywords.join('|'), $options: 'i' } },
          { features: { $in: keywords.map(k => new RegExp(k, 'i')) } },
          { technologies: { $in: keywords.map(k => new RegExp(k, 'i')) } },
          { challenges: { $regex: keywords.join('|'), $options: 'i' } },
          { results: { $regex: keywords.join('|'), $options: 'i' } }
        ]
      };

      const projects = await this.db.collection(this.config.mongodb.collections.projects)
        .find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      return projects.map(project => ({
        ...project,
        source: 'mongodb',
        relevanceScore: this.calculateRelevanceScore(query, project)
      }));
    } catch (error) {
      console.error('MongoDB projects search error:', error);
      return [];
    }
  }

  async searchMongoDBQuotes(query) {
    try {
      if (!this.db) return [];

      const keywords = this.extractKeywords(query);
      const searchQuery = {
        $or: [
          { title: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } },
          { clientName: { $regex: keywords.join('|'), $options: 'i' } },
          { scope: { $in: keywords.map(k => new RegExp(k, 'i')) } },
          { terms: { $regex: keywords.join('|'), $options: 'i' } },
          { amount: { $regex: keywords.join('|'), $options: 'i' } }
        ]
      };

      const quotes = await this.db.collection(this.config.mongodb.collections.quotes)
        .find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      return quotes.map(quote => ({
        ...quote,
        source: 'mongodb',
        relevanceScore: this.calculateRelevanceScore(query, quote)
      }));
    } catch (error) {
      console.error('MongoDB quotes search error:', error);
      return [];
    }
  }

  async searchConversationHistory(query) {
    try {
      if (!this.db) return [];

      const keywords = this.extractKeywords(query);
      const searchQuery = {
        content: { $regex: keywords.join('|'), $options: 'i' }
      };

      const conversations = await this.db.collection(this.config.mongodb.collections.conversations)
        .find(searchQuery)
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();

      return conversations.map(conv => ({
        ...conv,
        source: 'conversations',
        relevanceScore: this.calculateRelevanceScore(query, conv)
      }));
    } catch (error) {
      console.error('Conversation history search error:', error);
      return [];
    }
  }

  // Enhanced Qdrant search methods
  async searchQdrantProjects(query) {
    try {
      if (!this.qdrantClient) return [];

      const embedding = await this.generateEmbedding(query);
      if (!embedding) return [];

      // Ensure collection exists
      try {
        await this.qdrantClient.getCollection(this.config.qdrant.collections.projects);
      } catch (error) {
        // Collection doesn't exist, create it
        try {
          await this.qdrantClient.createCollection(this.config.qdrant.collections.projects, {
            vectors: { size: 1024, distance: 'Cosine' }
          });
        } catch (createError) {
          console.error("Failed to create projects collection:", createError);
          return [];
        }
      }

      const results = await this.qdrantClient.search(
        this.config.qdrant.collections.projects, 
        embedding, 
        {
          limit: 10,
          withPayload: true,
          scoreThreshold: 0.2
        }
      );

      return results.map(result => ({
        ...result.payload,
        source: 'qdrant',
        relevanceScore: result.score,
        vectorId: result.id
      }));
    } catch (error) {
      console.error('Qdrant projects search error:', error);
      return [];
    }
  }

  async searchQdrantQuotes(query) {
    try {
      if (!this.qdrantClient) return [];

      const embedding = await this.generateEmbedding(query);
      if (!embedding) return [];

      // Ensure collection exists
      try {
        await this.qdrantClient.getCollection(this.config.qdrant.collections.quotes);
      } catch (error) {
        // Collection doesn't exist, create it
        try {
          await this.qdrantClient.createCollection(this.config.qdrant.collections.quotes, {
            vectors: { size: 1024, distance: 'Cosine' }
          });
        } catch (createError) {
          console.error("Failed to create quotes collection:", createError);
          return [];
        }
      }

      const results = await this.qdrantClient.search(
        this.config.qdrant.collections.quotes, 
        embedding, 
        {
          limit: 10,
          withPayload: true,
          scoreThreshold: 0.2
        }
      );

      return results.map(result => ({
        ...result.payload,
        source: 'qdrant',
        relevanceScore: result.score,
        vectorId: result.id
      }));
    } catch (error) {
      console.error('Qdrant quotes search error:', error);
      return [];
    }
  }

  async searchQdrantKnowledge(query) {
    try {
      if (!this.qdrantClient) return [];

      const embedding = await this.generateEmbedding(query);
      if (!embedding) return [];

      // Ensure collection exists
      try {
        await this.qdrantClient.getCollection(this.config.qdrant.collections.knowledge);
      } catch (error) {
        // Collection doesn't exist, create it
        try {
          await this.qdrantClient.createCollection(this.config.qdrant.collections.knowledge, {
            vectors: { size: 1024, distance: 'Cosine' }
          });
        } catch (createError) {
          console.error("Failed to create knowledge collection:", createError);
          return [];
        }
      }

      const results = await this.qdrantClient.search(
        this.config.qdrant.collections.knowledge, 
        embedding, 
        {
          limit: 5,
          withPayload: true,
          scoreThreshold: 0.3
        }
      );

      return results.map(result => ({
        ...result.payload,
        source: 'qdrant_knowledge',
        relevanceScore: result.score,
        vectorId: result.id
      }));
    } catch (error) {
      console.error('Qdrant knowledge search error:', error);
      return [];
    }
  }

  // Utility methods for search enhancement
  extractKeywords(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 10); // Limit keywords for performance
  }

  calculateRelevanceScore(query, document) {
    const queryWords = this.extractKeywords(query);
    const documentText = JSON.stringify(document).toLowerCase();
    
    let score = 0;
    queryWords.forEach(word => {
      const occurrences = (documentText.match(new RegExp(word, 'g')) || []).length;
      score += occurrences;
    });
    
    return Math.min(score / queryWords.length, 1); // Normalize to 0-1
  }

  combineAndDeduplicateResults(mongoResults, qdrantResults, keyField) {
    const combined = [...mongoResults];
    const existingKeys = new Set(mongoResults.map(item => item[keyField]));
    
    qdrantResults.forEach(result => {
      if (!existingKeys.has(result[keyField])) {
        combined.push(result);
        existingKeys.add(result[keyField]);
      }
    });
    
    // Sort by relevance score
    return combined.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  // Session activity tracking
  async updateSessionActivity() {
    try {
      if (!this.db) return;

      await this.db.collection(this.config.mongodb.collections.sessions)
        .updateOne(
          { sessionId: this.sessionId },
          { 
            $set: { lastActivity: new Date() },
            $inc: { messageCount: 1 }
          },
          { upsert: true }
        );
    } catch (error) {
      console.error('Session activity update error:', error);
    }
  }

  async analyzeConsultationIntent(message, searchResults = null) {
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

${searchResults && searchResults.totalResults > 0 ? `
Available context from search:
- Projects found: ${searchResults.projects.length}
- Quotes found: ${searchResults.quotes.length}
- Knowledge entries: ${searchResults.knowledge.length}
- Previous conversations: ${searchResults.conversations.length}

Use this context to better understand the intent and extract relevant entities.
` : ''}

Return JSON with: {"type": "category", "confidence": 0.9, "entities": ["extracted", "key", "terms"], "complexity": "low|medium|high", "contextRelevance": "high|medium|low"}`;

    try {
      const analysisInput = searchResults && searchResults.totalResults > 0 
        ? `Message: ${message}\n\nContext: ${JSON.stringify(searchResults, null, 2)}`
        : message;

      const response = await this.callGroqAPI(analysisInput, systemPrompt);
      const cleanResponse = response.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error("Intent analysis failed:", error);
      return { 
        type: 'general', 
        confidence: 0.5, 
        entities: [], 
        complexity: 'medium',
        contextRelevance: 'low'
      };
    }
  }

  async handleQuoteRequest(message, intent) {
    console.log('💰 Handling quote request');
    
    // Get similar past quotes using RAG
    const similarQuotes = await this.getSimilarQuotes(message);
    
    // Get historical data for context
    const historicalQuotes = await this.getHistoricalQuotes(intent.entities.join(' '));
    
    // Get Shopify development guidance
    const shopifyGuidance = await this.getShopifyDevGuidance(intent.entities);
    
    // Generate comprehensive quote response
    const context = {
      message,
      intent,
      similarQuotes,
      historicalQuotes,
      shopifyGuidance,
      clientInfo: this.currentClient
    };

    const systemPrompt = `You are a senior Shopify development consultant. Based on the context provided, generate a professional quote response that includes:

1. Acknowledgment of the request
2. Key requirements understanding
3. Estimated pricing ranges (ONLY based on historicalQuotes data - do not use generic numbers)
4. Timeline estimates (ONLY based on historical project data)
5. Next steps for detailed scoping
6. What information you need from the client

IMPORTANT: 
- Use ONLY the historicalQuotes data to provide realistic pricing based on actual past projects
- Do NOT use generic or estimated pricing if no historical data is available
- Reference actual project examples from the context when possible
- Be professional, detailed but not overwhelming
- Always suggest a follow-up call for complex projects
- If no historical data is available, focus on consultation rather than specific numbers

Context: ${JSON.stringify(context)}`;

    try {
      let response = await this.callGroqAPI(message, systemPrompt);
      
      // Add historical context from our database
      response = await this.addHistoricalContext(response, message, intent.entities.join(' '));
      
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
      return this.getFallbackScopingResponse(intent);
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
    
    const timelineData = await this.getTimelineBenchmarks();
    
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
    if (!this.db) return null;
    
    try {
      const result = await this.db.collection(this.config.mongodb.collections.clients)
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
    if (!this.db) return null;
    
    try {
      const conversation = {
        ...conversationData,
        sessionId: conversationData.sessionId || this.sessionId,
        timestamp: conversationData.timestamp || new Date()
      };
      
      const result = await this.db.collection(this.config.mongodb.collections.conversations)
        .insertOne(conversation);
      return result.insertedId;
    } catch (error) {
      console.error("Conversation storage error:", error);
      return null;
    }
  }

  async getConversationHistory(clientId, limit = 10) {
    if (!this.db || !clientId) return [];
    
    try {
      return await this.db.collection(this.config.mongodb.collections.conversations)
        .find({ clientId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error("Conversation history error:", error);
      return [];
    }
  }

  // RAG Operations with Qdrant + Jina
  async generateEmbedding(text) {
    if (!this.config.jina.apiKey) {
      console.error("Jina API key not configured");
      return null;
    }

    try {
      const response = await fetch(this.config.jina.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.jina.apiKey}`
        },
        body: JSON.stringify({
          input: [text],
          model: 'jina-embeddings-v2-base-en'
        })
      });

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("Embedding generation error:", error);
      return null;
    }
  }

  async getSimilarQuotes(query) {
    if (!this.qdrantClient) return [];

    try {
      const embedding = await this.generateEmbedding(query);
      if (!embedding) return [];

      // Ensure the collection exists before searching
      try {
        await this.qdrantClient.createCollection(this.config.qdrant.collections.quotes);
      } catch (error) {
        // Collection might already exist, ignore error
      }

      const results = await this.qdrantClient.search(
        this.config.qdrant.collections.quotes, 
        embedding, 
        {
          limit: 5,
          withPayload: true,
          scoreThreshold: 0.3
        }
      );

      return results.map(r => r.payload);
    } catch (error) {
      console.error("Similar quotes search error:", error);
      return [];
    }
  }

  async getSimilarProjects(query) {
    if (!this.qdrantClient) return [];

    try {
      const embedding = await this.generateEmbedding(query);
      if (!embedding) return [];

      // Ensure the collection exists with proper configuration
      try {
        await this.qdrantClient.getCollection(this.config.qdrant.collections.projects);
      } catch (error) {
        // Collection doesn't exist, create it
        try {
          await this.qdrantClient.createCollection(this.config.qdrant.collections.projects, {
            vectors: {
              size: 1024, // Jina embeddings are 1024 dimensions
              distance: 'Cosine'
            }
          });
        } catch (createError) {
          console.error("Failed to create projects collection:", createError);
          return [];
        }
      }

      const results = await this.qdrantClient.search(
        this.config.qdrant.collections.projects, 
        embedding, 
        {
          limit: 5,
          withPayload: true,
          scoreThreshold: 0.3
        }
      );

      return results.map(r => r.payload);
    } catch (error) {
      console.error("Similar projects search error:", error);
      return [];
    }
  }

  async getTechnicalKnowledge(query) {
    if (!this.qdrantClient) return [];

    try {
      const embedding = await this.generateEmbedding(query);
      if (!embedding) return [];

      // Ensure the collection exists with proper configuration
      try {
        await this.qdrantClient.getCollection(this.config.qdrant.collections.knowledge);
      } catch (error) {
        // Collection doesn't exist, create it
        try {
          await this.qdrantClient.createCollection(this.config.qdrant.collections.knowledge, {
            vectors: {
              size: 1024, // Jina embeddings are 1024 dimensions
              distance: 'Cosine'
            }
          });
        } catch (createError) {
          console.error("Failed to create knowledge collection:", createError);
          return [];
        }
      }

      const results = await this.qdrantClient.search(
        this.config.qdrant.collections.knowledge, 
        embedding, 
        {
          limit: 3,
          withPayload: true,
          scoreThreshold: 0.3
        }
      );

      return results.map(r => r.payload);
    } catch (error) {
      console.error("Technical knowledge search error:", error);
      return [];
    }
  }

  async storeQuoteRequest(query, response, intent) {
    if (!this.qdrantClient) return;

    try {
      const embedding = await this.generateEmbedding(query);
      if (!embedding) return;

      await this.qdrantClient.upsert(this.config.qdrant.collections.quotes, {
        points: [{
          id: Date.now(),
          vector: embedding,
          payload: {
            query,
            response,
            intent,
            timestamp: new Date().toISOString(),
            clientId: this.currentClient?._id?.toString()
          }
        }]
      });
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

  // Timeline and benchmarking methods - Dynamic from database
  async getTimelineBenchmarks() {
    try {
      if (!this.mongoManager.db) {
        console.warn('Database not connected, using minimal fallback');
        return null;
      }

      // Get actual timeline data from historical projects
      const projects = await this.mongoManager.db
        .collection('shopify_projects')
        .find({ timeline: { $exists: true, $ne: '' } })
        .toArray();

      if (projects.length === 0) return null;

      // Extract timeline numbers from strings like "8 weeks", "12 weeks", etc.
      const timelines = projects.map(p => {
        const match = p.timeline.match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
      }).filter(t => t !== null);

      if (timelines.length === 0) return null;

      // Calculate dynamic benchmarks based on actual data
      const sorted = timelines.sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);

      return {
        min,
        max,
        typical: avg,
        projectCount: timelines.length
      };
    } catch (error) {
      console.error('Error getting timeline benchmarks:', error);
      return null;
    }
  }

  async getPricingBenchmarks() {
    try {
      if (!this.mongoManager.db) {
        console.warn('Database not connected, using minimal fallback');
        return null;
      }

      // Get actual pricing data from historical projects and quotes
      const [projects, quotes] = await Promise.all([
        this.mongoManager.db.collection('shopify_projects')
          .find({ budget: { $exists: true, $ne: '' } })
          .toArray(),
        this.mongoManager.db.collection('shopify_quotes')
          .find({ budget: { $exists: true, $ne: '' } })
          .toArray()
      ]);

      const allBudgets = [...projects, ...quotes];
      if (allBudgets.length === 0) return null;

      // Extract budget numbers from strings like "$25,000", "$5000", etc.
      const budgets = allBudgets.map(item => {
        const budgetStr = item.budget.replace(/[,$]/g, '');
        const match = budgetStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
      }).filter(b => b !== null);

      if (budgets.length === 0) return null;

      // Calculate dynamic benchmarks based on actual data
      const sorted = budgets.sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);

      return {
        min,
        max,
        typical: avg,
        projectCount: budgets.length
      };
    } catch (error) {
      console.error('Error getting pricing benchmarks:', error);
      return null;
    }
  }

  // Context enhancement methods - Dynamic from database
  async addShopifyPricingContext(response) {
    try {
      const pricingBenchmarks = await this.getPricingBenchmarks();
      
      if (!pricingBenchmarks) {
        // Only if no database data available
        return response + "\n\n*Contact us for detailed pricing based on your specific requirements.*";
      }

      const pricingContext = `

**Pricing Based on Our Recent Projects:**
- Budget range: $${pricingBenchmarks.min.toLocaleString()} - $${pricingBenchmarks.max.toLocaleString()}
- Typical investment: $${pricingBenchmarks.typical.toLocaleString()}
- Based on ${pricingBenchmarks.projectCount} completed projects

*Pricing varies based on complexity, timeline, and specific requirements.*`;
      
      return response + pricingContext;
    } catch (error) {
      return response + "\n\n*Contact us for detailed pricing based on your specific requirements.*";
    }
  }

  async addTechnicalResources(response) {
    try {
      if (!this.mongoManager.db) return response;

      // Get actual technologies from completed projects
      const projects = await this.mongoManager.db
        .collection('shopify_projects')
        .find({ technologies: { $exists: true, $ne: [] } })
        .limit(10)
        .toArray();

      if (projects.length === 0) return response;

      // Extract unique technologies from all projects
      const allTechs = projects.reduce((acc, project) => {
        return acc.concat(project.technologies || []);
      }, []);
      
      const uniqueTechs = [...new Set(allTechs)].slice(0, 8); // Limit to top 8

      const resources = `

**Our Technical Expertise (from recent projects):**
${uniqueTechs.map(tech => `- ${tech}`).join('\n')}

*Based on ${projects.length} recent projects*`;
      
      return response + resources;
    } catch (error) {
      return response;
    }
  }

  // Storage methods
  async storeScopingSession(sessionData) {
    try {
      if (!this.mongoManager.db) return;
      
      const session = {
        ...sessionData,
        timestamp: new Date(),
        type: 'scoping_session'
      };
      
      await this.mongoManager.db.collection('shopify_sessions').insertOne(session);
      console.log("✅ Scoping session stored");
    } catch (error) {
      console.error("❌ Error storing scoping session:", error);
    }
  }

  async storeQuoteRequest(quoteData) {
    try {
      if (!this.mongoManager.db) return;
      
      const quote = {
        ...quoteData,
        timestamp: new Date(),
        type: 'quote_request',
        status: 'pending'
      };
      
      await this.mongoManager.db.collection('shopify_quotes').insertOne(quote);
      console.log("✅ Quote request stored");
    } catch (error) {
      console.error("❌ Error storing quote request:", error);
    }
  }

  // Fallback response methods - Dynamic from database
  async getFallbackTimelineResponse() {
    try {
      const benchmarks = await this.getTimelineBenchmarks();
      
      if (!benchmarks) {
        return `I'd be happy to help you understand project timelines based on your specific requirements. Could you share more details about your project so I can provide a more accurate estimate?`;
      }

      return `Based on our ${benchmarks.projectCount} completed projects:

**Timeline Estimates:**
- Minimum: ${benchmarks.min} weeks
- Maximum: ${benchmarks.max} weeks
- Typical: ${benchmarks.typical} weeks

The actual timeline depends on your specific requirements. Would you like to discuss your project details so I can provide a more accurate estimate?`;
    } catch (error) {
      return `I'd be happy to help with timeline estimates. Could you share more details about your project scope and requirements?`;
    }
  }

  async getFallbackTechnicalResponse() {
    try {
      if (!this.mongoManager.db) {
        return `I can help with various Shopify technical questions. What specific technical challenge are you facing?`;
      }

      // Get actual technologies from recent projects
      const projects = await this.mongoManager.db
        .collection('shopify_projects')
        .find({ technologies: { $exists: true, $ne: [] } })
        .limit(5)
        .toArray();

      if (projects.length === 0) {
        return `I can help with various Shopify technical questions. What specific technical challenge are you facing?`;
      }

      const allTechs = projects.reduce((acc, project) => {
        return acc.concat(project.technologies || []);
      }, []);
      const uniqueTechs = [...new Set(allTechs)].slice(0, 6);

      return `I can help with various Shopify technical questions:

**Recent Technical Experience:**
${uniqueTechs.map(tech => `- ${tech}`).join('\n')}

*Based on ${projects.length} recent projects*

What specific technical challenge are you facing? I'd be happy to provide detailed guidance.`;
    } catch (error) {
      return `I can help with various Shopify technical questions. What specific technical challenge are you facing?`;
    }
  }

  async getFallbackCapabilityResponse() {
    try {
      if (!this.mongoManager.db) {
        return `I can help with various Shopify development needs. What specific capability or service are you interested in?`;
      }

      // Get actual services from project data
      const projects = await this.mongoManager.db
        .collection('shopify_projects')
        .find({})
        .limit(10)
        .toArray();

      if (projects.length === 0) {
        return `I can help with various Shopify development needs. What specific capability are you interested in?`;
      }

      // Extract unique project types and features
      const projectTypes = [...new Set(projects.map(p => p.projectType).filter(Boolean))];
      const allFeatures = projects.reduce((acc, project) => {
        return acc.concat(project.features || []);
      }, []);
      const uniqueFeatures = [...new Set(allFeatures)].slice(0, 8);

      return `Here's an overview based on our recent project experience:

**Project Types We've Completed:**
${projectTypes.slice(0, 5).map(type => `- ${type}`).join('\n')}

**Key Capabilities:**
${uniqueFeatures.map(feature => `- ${feature}`).join('\n')}

*Based on ${projects.length} recent projects*

Would you like to know more about any specific service or see examples of similar projects?`;
    } catch (error) {
      return `I can help with various Shopify development needs. What specific capability are you interested in?`;
    }
  }

  async getFallbackPricingResponse() {
    try {
      const benchmarks = await this.getPricingBenchmarks();
      
      if (!benchmarks) {
        return `I can provide pricing information based on your specific project requirements. Could you share more details about what you're looking to build?`;
      }

      return `Based on our ${benchmarks.projectCount} completed projects:

**Investment Ranges:**
- Starting from: $${benchmarks.min.toLocaleString()}
- Up to: $${benchmarks.max.toLocaleString()}
- Typical project: $${benchmarks.typical.toLocaleString()}

Factors affecting pricing:
- Project complexity and scope
- Timeline requirements
- Custom functionality needs
- Integration requirements

Would you like a detailed quote for your specific project?`;
    } catch (error) {
      return `I can provide pricing information based on your specific requirements. Could you share more details about your project?`;
    }
  }

  async getFallbackPortfolioResponse() {
    try {
      if (!this.mongoManager.db) {
        return `I'd be happy to share examples of our work. What type of project or industry are you most interested in?`;
      }

      // Get actual completed projects
      const projects = await this.mongoManager.db
        .collection('shopify_projects')
        .find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();

      if (projects.length === 0) {
        return `I'd be happy to share examples of our work once we have some projects in our portfolio. What type of project are you interested in?`;
      }

      let response = `Here are examples from our recent project portfolio:\n\n`;
      
      projects.forEach((project, index) => {
        response += `**${project.title}**\n`;
        response += `Industry: ${project.industry}\n`;
        response += `Timeline: ${project.timeline}\n`;
        if (project.budget) response += `Investment: ${project.budget}\n`;
        if (project.features && project.features.length > 0) {
          response += `Key Features: ${project.features.slice(0, 3).join(', ')}\n`;
        }
        if (project.results) {
          response += `Results: ${project.results}\n`;
        }
        response += '\n';
      });

      response += `Would you like to see more details about any of these projects or discuss a similar project for your needs?`;
      
      return response;
    } catch (error) {
      return `I'd be happy to share examples of our work. What type of project are you most interested in?`;
    }
  }

  // Utility methods - Fully dynamic from database
  async getRelevantCaseStudies(query) {
    try {
      // Get historical projects from database only
      const historicalProjects = await this.getHistoricalProjects(query);
      if (historicalProjects.length > 0) {
        return historicalProjects.map(project => ({
          title: project.title,
          description: project.description,
          industry: project.industry,
          timeline: project.timeline,
          features: project.features || [],
          budget: project.budget,
          results: project.results,
          technologies: project.technologies || [],
          challenges: project.challenges,
          clientFeedback: project.clientFeedback
        }));
      }

      // If no specific matches, get any recent projects
      if (!this.mongoManager.db) return [];
      
      const recentProjects = await this.mongoManager.db
        .collection('shopify_projects')
        .find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();

      return recentProjects.map(project => ({
        title: project.title,
        description: project.description,
        industry: project.industry,
        timeline: project.timeline,
        features: project.features || [],
        budget: project.budget,
        results: project.results,
        technologies: project.technologies || [],
        challenges: project.challenges,
        clientFeedback: project.clientFeedback
      }));
    } catch (error) {
      console.error('Error fetching case studies:', error);
      return [];
    }
  }

  async getHistoricalProjects(query = '') {
    try {
      if (!this.mongoManager.db) return [];

      let searchQuery = {};
      
      if (query) {
        // Handle both string and array inputs
        let queryString = '';
        if (Array.isArray(query)) {
          queryString = query.join(' ');
        } else if (typeof query === 'string') {
          queryString = query;
        } else {
          queryString = String(query);
        }
        
        const keywords = queryString.toLowerCase().split(' ').filter(k => k.length > 2);
        if (keywords.length > 0) {
          searchQuery = {
            $or: [
              { title: { $regex: keywords.join('|'), $options: 'i' } },
              { description: { $regex: keywords.join('|'), $options: 'i' } },
              { industry: { $regex: keywords.join('|'), $options: 'i' } },
              { projectType: { $regex: keywords.join('|'), $options: 'i' } },
              { features: { $in: keywords.map(k => new RegExp(k, 'i')) } },
              { technologies: { $in: keywords.map(k => new RegExp(k, 'i')) } }
            ]
          };
        }
      }

      const projects = await this.mongoManager.db
        .collection('shopify_projects')
        .find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      return projects;
    } catch (error) {
      console.error('Error fetching historical projects:', error);
      return [];
    }
  }

  async getHistoricalQuotes(projectType = '', budgetRange = null) {
    try {
      if (!this.mongoManager.db) return [];

      let searchQuery = {};
      
      if (projectType) {
        // Handle both string and array inputs
        let typeString = '';
        if (Array.isArray(projectType)) {
          typeString = projectType.join(' ');
        } else if (typeof projectType === 'string') {
          typeString = projectType;
        } else {
          typeString = String(projectType);
        }
        
        if (typeString) {
          searchQuery.projectType = { $regex: typeString, $options: 'i' };
        }
      }

      const quotes = await this.mongoManager.db
        .collection('shopify_quotes')
        .find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();

      return quotes;
    } catch (error) {
      console.error('Error fetching historical quotes:', error);
      return [];
    }
  }

  async addHistoricalContext(response, query, projectType = '') {
    try {
      const [projects, quotes] = await Promise.all([
        this.getHistoricalProjects(query),
        this.getHistoricalQuotes(projectType)
      ]);

      let contextualInfo = response;

      if (projects.length > 0) {
        const relevantProject = projects[0]; // Get the most relevant project
        contextualInfo += `\n\n**Similar Project Experience:**\n`;
        contextualInfo += `We recently completed "${relevantProject.title}" in the ${relevantProject.industry} industry. `;
        contextualInfo += `This ${relevantProject.timeline} project involved ${relevantProject.features.slice(0, 3).join(', ')}`;
        if (relevantProject.budget) {
          contextualInfo += ` with a budget of ${relevantProject.budget}`;
        }
        if (relevantProject.results) {
          contextualInfo += `.\n\n**Results:** ${relevantProject.results}`;
        }
      }

      if (quotes.length > 0) {
        const recentQuotes = quotes.slice(0, 2);
        const avgBudget = this.calculateAverageQuoteBudget(recentQuotes);
        if (avgBudget) {
          contextualInfo += `\n\n**Recent Similar Projects:** Based on our recent ${projectType} projects, typical investments range around ${avgBudget}.`;
        }
      }

      return contextualInfo;
    } catch (error) {
      console.error('Error adding historical context:', error);
      return response;
    }
  }

  calculateAverageQuoteBudget(quotes) {
    try {
      const budgets = quotes
        .map(q => q.budget)
        .filter(b => b)
        .map(b => {
          // Extract number from budget string (e.g., "$25,000" -> 25000)
          const match = b.replace(/[,$]/g, '').match(/\d+/);
          return match ? parseInt(match[0]) : null;
        })
        .filter(b => b !== null);

      if (budgets.length === 0) return null;

      const avg = budgets.reduce((a, b) => a + b, 0) / budgets.length;
      return `$${avg.toLocaleString()}`;
    } catch (error) {
      return null;
    }
  }

  async formatQuoteResponse(estimate) {
    if (!estimate || typeof estimate !== 'object') {
      return `**Project Consultation:**

I'd be happy to provide a detailed quote for your project. To give you the most accurate estimate, I'll need to understand your specific requirements.

**Next Steps:**
1. Detailed project scoping session
2. Technical requirements analysis  
3. Custom proposal with accurate pricing
4. Project timeline & milestone planning

Would you like to schedule a consultation to discuss your project in detail?`;
    }
    
    try {
      // Get dynamic pricing context if available
      const benchmarks = await this.getPricingBenchmarks();
      let pricingNote = '';
      
      if (benchmarks) {
        pricingNote = `*Based on ${benchmarks.projectCount} completed projects with typical investments around $${benchmarks.typical.toLocaleString()}*`;
      }
      
      return `**Project Estimate:**

**Timeline:** ${estimate.timeline || 'TBD - will be determined during scoping'}
**Investment Range:** $${estimate.minPrice?.toLocaleString() || 'TBD'} - $${estimate.maxPrice?.toLocaleString() || 'TBD'}

**Included Services:**
${estimate.services ? estimate.services.map(service => `- ${service}`).join('\n') : '- Custom development as discussed'}

**Next Steps:**
1. Detailed project scoping session
2. Technical requirements analysis
3. Formal proposal with fixed pricing
4. Project timeline & milestone planning

${pricingNote}

Would you like to schedule a detailed consultation to discuss your project further?`;
    } catch (error) {
      return `**Project Consultation:**

I'd be happy to provide a detailed quote for your project. Would you like to schedule a consultation to discuss your specific requirements?`;
    }
  }

  async disconnect() {
    try {
      if (this.mcpClient) await this.mcpClient.close();
      if (this.mongoManager) await this.mongoManager.disconnect();
      console.log("✅ Shopify Development Consultant Agent disconnected");
    } catch (error) {
      console.error("❌ Disconnect error:", error);
    }
  }
}

export default ShopifyDevConsultantAgent;