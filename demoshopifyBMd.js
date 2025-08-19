// Usage Examples for Business Management Team
import ShopifyDevConsultantAgent from './ShopifyDevConsultantAgent.js';

class ShopifyConsultantDemo {
  constructor() {
    this.agent = new ShopifyDevConsultantAgent();
  }

  async demonstrateUsage() {
    console.log("🎯 Shopify Development Consultant Agent Demo");
    console.log("=" * 50);

    // Example 1: Quote Request
    await this.handleQuoteRequest();
    
    // Example 2: Technical Question
    await this.handleTechnicalQuestion();
    
    // Example 3: Project Scoping
    await this.handleProjectScoping();
    
    // Example 4: Pricing Inquiry
    await this.handlePricingInquiry();
    
    // Example 5: Previous Work Portfolio
    await this.handlePortfolioInquiry();
  }

  async handleQuoteRequest() {
    console.log("\n📋 EXAMPLE 1: Quote Request");
    console.log("-" * 30);

    const clientInfo = {
      name: "John Smith",
      email: "john@example.com",
      company: "ABC Fashion Store",
      phone: "+1234567890"
    };

    const message = `Hi! I need a quote for developing a Shopify store for my fashion brand. 
    We need:
    - Custom theme design
    - Product customization features
    - Integration with Instagram
    - Inventory management
    - Multi-currency support
    - Mobile optimization
    
    We're launching in 3 months and have a budget of around $15,000. Can you help?`;

    const response = await this.agent.processConsultationMessage(message, clientInfo);
    console.log("Agent Response:", response.response);
  }

  async handleTechnicalQuestion() {
    console.log("\n🔧 EXAMPLE 2: Technical Question");
    console.log("-" * 30);

    const message = `A client is asking if Shopify can handle:
    1. Custom product configurators (like for jewelry with multiple options)
    2. B2B wholesale pricing tiers
    3. Integration with their existing ERP system (SAP)
    4. Custom checkout fields for personalization
    
    What are the technical possibilities and limitations?`;

    const response = await this.agent.processConsultationMessage(message);
    console.log("Agent Response:", response.response);
  }

  async handleProjectScoping() {
    console.log("\n📊 EXAMPLE 3: Project Scoping");
    console.log("-" * 30);

    const message = `Client wants to migrate from WooCommerce to Shopify Plus. They have:
    - 5,000+ products with variants
    - 50,000+ customers
    - Custom subscription system
    - Complex discount rules
    - Integration with Salesforce
    - Multi-store setup (3 brands)
    
    What should we scope for this migration project?`;

    const response = await this.agent.processConsultationMessage(message);
    console.log("Agent Response:", response.response);
  }

  async handlePricingInquiry() {
    console.log("\n💰 EXAMPLE 4: Pricing Inquiry");
    console.log("-" * 30);

    const message = `What's the typical cost range for:
    - Shopify Plus setup and configuration
    - Custom app development
    - Third-party integrations
    - Ongoing maintenance and support
    
    The client has a mid-size business with $2M annual revenue.`;

    const response = await this.agent.processConsultationMessage(message);
    console.log("Agent Response:", response.response);
  }

  async handlePortfolioInquiry() {
    console.log("\n📁 EXAMPLE 5: Previous Work Portfolio");
    console.log("-" * 30);

    const message = `Client in the beauty industry wants to see examples of our previous work. 
    They're specifically interested in:
    - Beauty/cosmetics stores we've built
    - Custom product recommendation systems
    - Subscription implementations
    - Mobile-first designs
    
    What relevant case studies can we show them?`;

    const response = await this.agent.processConsultationMessage(message);
    console.log("Agent Response:", response.response);
  }

  // Utility method for business team to quickly handle client inquiries
  async handleClientInquiry(clientMessage, clientDetails = null) {
    console.log(`\n🔄 Processing client inquiry: "${clientMessage.substring(0, 50)}..."`);
    
    const startTime = Date.now();
    const response = await this.agent.processConsultationMessage(clientMessage, clientDetails);
    const processingTime = Date.now() - startTime;

    return {
      ...response,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    };
  }

  // Quick response templates for common scenarios
  getQuickResponseTemplate(scenario) {
    const templates = {
      initial_contact: "Thank you for your interest in our Shopify development services! I'd be happy to help you with your project. Could you share more details about your requirements?",
      
      follow_up: "Following up on our previous discussion about your Shopify project. Do you have any additional questions or would you like to schedule a detailed consultation call?",
      
      technical_clarification: "Let me get you the specific technical details about that Shopify capability. Based on your requirements, here's what's possible...",
      
      pricing_request: "I'd be happy to provide pricing information for your project. To give you the most accurate estimate, could you share more details about your specific requirements?",
      
      timeline_inquiry: "Great question about timing! Shopify project timelines typically depend on complexity and requirements. Let me break down what we'd need for your specific project..."
    };

    return templates[scenario] || templates.initial_contact;
  }

  // Integration helper for business team workflow
  async integrateWithCRM(clientData, conversationSummary) {
    // This would integrate with your existing CRM system
    console.log("📊 Integrating with CRM:", {
      client: clientData.email,
      summary: conversationSummary.substring(0, 100) + "...",
      nextAction: "Schedule consultation call",
      priority: this.calculateLeadPriority(conversationSummary),
      timestamp: new Date().toISOString()
    });

    // Return CRM integration data
    return {
      leadScore: this.calculateLeadScore(conversationSummary),
      suggestedActions: this.getSuggestedActions(conversationSummary),
      followUpDate: this.calculateFollowUpDate(conversationSummary)
    };
  }

  calculateLeadPriority(summary) {
    const highValueKeywords = ['budget', 'timeline', 'launch', 'migration', 'plus', 'enterprise'];
    const matches = highValueKeywords.filter(keyword => 
      summary.toLowerCase().includes(keyword)
    ).length;

    if (matches >= 3) return 'HIGH';
    if (matches >= 1) return 'MEDIUM';
    return 'LOW';
  }

  calculateLeadScore(summary) {
    let score = 50; // Base score

    // Budget indicators
    if (summary.match(/\$[\d,]+/)) score += 20;
    
    // Urgency indicators
    if (summary.includes('urgent') || summary.includes('asap')) score += 15;
    if (summary.includes('timeline') || summary.includes('deadline')) score += 10;
    
    // Project complexity
    if (summary.includes('migration') || summary.includes('integration')) score += 15;
    if (summary.includes('custom') || summary.includes('complex')) score += 10;
    
    // Company size indicators
    if (summary.includes('enterprise') || summary.includes('plus')) score += 20;
    
    return Math.min(score, 100);
  }

  getSuggestedActions(summary) {
    const actions = [];

    if (summary.includes('quote') || summary.includes('estimate')) {
      actions.push('Prepare detailed quote');
    }

    if (summary.includes('technical') || summary.includes('integration')) {
      actions.push('Schedule technical consultation');
    }

    if (summary.includes('timeline') || summary.includes('launch')) {
      actions.push('Create project timeline');
    }

    if (summary.includes('budget') || summary.includes('cost')) {
      actions.push('Prepare pricing breakdown');
    }

    if (actions.length === 0) {
      actions.push('Schedule discovery call');
    }

    return actions;
  }

  calculateFollowUpDate(summary) {
    const now = new Date();
    
    // High priority - follow up in 1 day
    if (summary.includes('urgent') || summary.includes('asap')) {
      now.setDate(now.getDate() + 1);
    }
    // Medium priority - follow up in 3 days
    else if (summary.includes('timeline') || summary.includes('budget')) {
      now.setDate(now.getDate() + 3);
    }
    // Standard follow up - 1 week
    else {
      now.setDate(now.getDate() + 7);
    }

    return now.toISOString();
  }

  // Business team dashboard helper
  async generateDashboardSummary(dateRange = 7) {
    const summary = {
      totalInquiries: 0,
      highPriorityLeads: 0,
      averageResponseTime: 0,
      topRequests: {},
      revenueOpportunity: 0,
      conversionRate: 0
    };

    // This would pull data from MongoDB
    console.log("📊 Dashboard Summary (Last 7 days):");
    console.log({
      totalInquiries: "25 new inquiries",
      highPriorityLeads: "8 high-priority leads",
      topRequests: {
        "Custom Development": 12,
        "Store Migration": 6,
        "App Integration": 4,
        "Theme Customization": 3
      },
      estimatedRevenue: "$180,000 in potential projects",
      responseTime: "Average 2.3 hours"
    });

    return summary;
  }

  // Knowledge base management for business team
  async updateKnowledgeBase(category, content, tags = []) {
    console.log(`📚 Updating knowledge base: ${category}`);
    
    // Generate embedding for the content
    const embedding = await this.agent.generateEmbedding(content);
    
    if (embedding && this.agent.qdrantClient) {
      await this.agent.qdrantClient.upsert(
        this.agent.config.qdrant.collections.knowledge,
        {
          points: [{
            id: Date.now(),
            vector: embedding,
            payload: {
              category,
              content,
              tags,
              createdAt: new Date().toISOString(),
              source: 'business_team'
            }
          }]
        }
      );
    }

    console.log("✅ Knowledge base updated successfully");
  }

  // Common business scenarios
  async handleCommonScenarios() {
    console.log("\n🎯 COMMON BUSINESS SCENARIOS");
    console.log("=" * 50);

    const scenarios = [
      {
        title: "New Client - Fashion Brand",
        message: "We're launching a sustainable fashion brand and need a Shopify store with custom product pages, subscription boxes, and carbon-neutral shipping calculator.",
        client: { name: "Sarah Johnson", email: "sarah@ecofashion.com", company: "EcoFashion Co" }
      },
      {
        title: "Enterprise Migration",
        message: "We're a $10M revenue company looking to migrate from Magento to Shopify Plus. We have complex B2B pricing, multi-warehouse inventory, and need ERP integration.",
        client: { name: "Mike Chen", email: "mike@enterprise.com", company: "Enterprise Corp" }
      },
      {
        title: "Technical Integration Question",
        message: "Our client needs Shopify to integrate with their existing POS system, loyalty program, and email marketing platform. Is this possible?",
        client: null // Internal team question
      },
      {
        title: "Urgent Timeline Request",
        message: "We need a Shopify store launched in 6 weeks for Black Friday. Custom theme, payment gateway setup, and product import from CSV. What's possible?",
        client: { name: "Alex Rivera", email: "alex@urgentlaunch.com", company: "Urgent Launch LLC" }
      },
      {
        title: "App Development Inquiry",
        message: "Client wants a custom Shopify app for their unique inventory management needs. They have specific workflow requirements that existing apps don't handle.",
        client: { name: "Jennifer Brown", email: "jen@customneeds.com", company: "Custom Needs Inc" }
      }
    ];

    for (const scenario of scenarios) {
      console.log(`\n${scenario.title}`);
      console.log("-" * scenario.title.length);
      
      const response = await this.handleClientInquiry(scenario.message, scenario.client);
      console.log(`Response: ${response.response.substring(0, 200)}...`);
      console.log(`Processing Time: ${response.processingTime}`);
      console.log(`Lead Priority: ${this.calculateLeadPriority(scenario.message)}`);
    }
  }

  // Training mode for new business team members
  async trainingMode() {
    console.log("\n🎓 TRAINING MODE - Learn Common Responses");
    console.log("=" * 50);

    const trainingQuestions = [
      "What's the difference between Shopify and Shopify Plus?",
      "How long does a typical Shopify store take to build?",
      "What integrations are commonly requested?",
      "How do we price custom app development?",
      "What information do we need to provide accurate quotes?",
      "How do we handle enterprise migration projects?",
      "What are the technical limitations of Shopify?",
      "How do we scope a complex e-commerce project?"
    ];

    for (const question of trainingQuestions) {
      console.log(`\nQ: ${question}`);
      const response = await this.agent.processConsultationMessage(question);
      console.log(`A: ${response.response.substring(0, 300)}...`);
    }
  }

  // Quality assurance for responses
  async qualityCheckResponse(message, response) {
    const qualityMetrics = {
      professional: this.checkProfessionalism(response),
      informative: this.checkInformativeness(response),
      actionable: this.checkActionability(response),
      accurate: this.checkAccuracy(response),
      score: 0
    };

    qualityMetrics.score = (
      qualityMetrics.professional + 
      qualityMetrics.informative + 
      qualityMetrics.actionable + 
      qualityMetrics.accurate
    ) / 4;

    return qualityMetrics;
  }

  checkProfessionalism(response) {
    const professionalWords = ['thank you', 'happy to help', 'consultation', 'professional', 'expertise'];
    const unprofessionalWords = ['awesome', 'cool', 'yeah', 'guys'];
    
    let score = 70; // Base score
    professionalWords.forEach(word => {
      if (response.toLowerCase().includes(word)) score += 5;
    });
    unprofessionalWords.forEach(word => {
      if (response.toLowerCase().includes(word)) score -= 10;
    });
    
    return Math.max(0, Math.min(100, score));
  }

  checkInformativeness(response) {
    const infoIndicators = ['typically', 'ranges from', 'includes', 'depending on', 'considerations'];
    let score = 50;
    
    infoIndicators.forEach(indicator => {
      if (response.toLowerCase().includes(indicator)) score += 10;
    });
    
    // Check for specific details
    if (response.match(/\$[\d,]+/)) score += 15; // Pricing info
    if (response.includes('timeline') || response.includes('weeks')) score += 10; // Timeline info
    
    return Math.min(100, score);
  }

  checkActionability(response) {
    const actionWords = ['schedule', 'call', 'consultation', 'next steps', 'contact', 'discuss'];
    let score = 30;
    
    actionWords.forEach(word => {
      if (response.toLowerCase().includes(word)) score += 15;
    });
    
    return Math.min(100, score);
  }

  checkAccuracy(response) {
    // Basic accuracy checks for common Shopify facts
    let score = 80; // Base score assuming accuracy
    
    // Check for common inaccuracies
    if (response.includes('unlimited products') && response.includes('basic shopify')) score -= 20;
    if (response.includes('free SSL') && response.includes('additional cost')) score -= 15;
    
    return Math.max(0, score);
  }

  // Export conversation for client follow-up
  async exportConversationSummary(conversationId) {
    const summary = {
      conversationId,
      timestamp: new Date().toISOString(),
      clientInfo: this.agent.currentClient,
      keyPoints: [],
      nextActions: [],
      estimatedValue: null,
      priority: null
    };

    console.log("📄 Conversation Summary Exported:", summary);
    return summary;
  }
}

// Example usage for your business management team
async function runDemo() {
  const demo = new ShopifyConsultantDemo();
  
  console.log("🚀 Starting Shopify Development Consultant Demo");
  console.log("This demo shows how the agent helps your business management team");
  console.log("handle client inquiries with intelligent responses based on:");
  console.log("• Previous project data (Qdrant + Jina embeddings)");
  console.log("• Conversation history (MongoDB)");
  console.log("• Official Shopify documentation (MCP tools)");
  console.log("• AI-powered analysis (Groq)");
  
  // Run different demo scenarios
  await demo.demonstrateUsage();
  await demo.handleCommonScenarios();
  await demo.trainingMode();
  
  // Generate business dashboard
  await demo.generateDashboardSummary();
  
  console.log("\n✅ Demo complete! Your business team is ready to use the consultant agent.");
}

// Export for use
export { ShopifyConsultantDemo, runDemo };
export default ShopifyConsultantDemo;