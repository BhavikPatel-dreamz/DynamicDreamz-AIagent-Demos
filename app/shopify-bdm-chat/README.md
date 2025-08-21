# Shopify BDM Consultant Chat

A ChatGPT-style interface for Shopify Business Development Manager consultation powered by AI. This application provides intelligent responses for quotes, technical questions, project scoping, and more.

## Features

### 🤖 AI-Powered Consultation
- **Quote Requests**: Get detailed project estimates with pricing breakdowns
- **Technical Questions**: Expert answers about Shopify APIs, features, and limitations
- **Project Scoping**: Comprehensive project breakdown and planning
- **Pricing Inquiries**: Transparent pricing information with value propositions
- **Timeline Estimates**: Realistic project timeline assessments
- **Capability Questions**: What's possible with Shopify development

### 💬 Chat Interface
- **Real-time messaging** with ChatGPT-style UI
- **Message formatting** with support for tables, lists, and emphasis
- **Intent detection** showing the type of consultation query
- **Client information** collection and management
- **Conversation history** stored in MongoDB

### 📊 Smart Response Formatting
- **Pricing tables** automatically rendered for quote responses
- **Technical documentation** with code examples and best practices
- **Project breakdowns** with phase-wise approach
- **Resource recommendations** and next steps

### 🔧 Technical Architecture
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: API routes with ShopifyDevConsultantAgent
- **AI**: Groq LLM for conversation processing
- **Database**: MongoDB for conversation and client storage
- **Vector DB**: Qdrant for RAG (Retrieval Augmented Generation)
- **Embeddings**: Jina AI for semantic search

## Usage

### Starting a Conversation
1. Navigate to `/shopify-bdm-chat`
2. The AI will greet you with available services
3. Start asking questions about your Shopify project

### Example Queries
```
"I need a quote for a custom Shopify store with product customization"
"What are the limitations of Shopify's API for inventory management?"
"How long would it take to migrate from WooCommerce to Shopify?"
"Can Shopify handle B2B wholesale pricing?"
"What integrations are possible with Shopify Plus?"
```

### Client Information
- Click "Add Contact Info" to provide your details
- This helps the AI provide more personalized responses
- Information is stored securely in MongoDB

## Response Types

### Quote Requests
- Detailed pricing breakdowns
- Project scope analysis
- Timeline estimates
- Similar project examples
- Next steps for detailed scoping

### Technical Questions
- Official Shopify documentation references
- Code examples and best practices
- Limitations and workarounds
- Integration possibilities
- Performance considerations

### Project Scoping
- Requirement analysis
- Technical architecture recommendations
- Resource planning
- Risk assessment
- Phase-wise development approach

## API Endpoints

### POST `/api/shopify-bdm`
Process consultation messages and return AI responses.

**Request Body:**
```json
{
  "message": "Your consultation question",
  "clientInfo": {
    "name": "John Doe",
    "email": "john@company.com",
    "company": "ABC Corp",
    "phone": "+1-555-0123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "AI-generated consultation response",
  "metadata": {
    "conversationId": "mongo-id",
    "intent": {
      "type": "quote_request",
      "confidence": 0.9,
      "entities": ["custom store", "product customization"]
    }
  },
  "clientId": "client-mongo-id"
}
```

## Environment Variables

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=shopify_consultant

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-api-key

# AI Services
GROQ_API_KEY=your-groq-api-key
JINA_API_KEY=your-jina-api-key

# Optional: MCP Integration
SHOPIFY_MCP_SERVER=@shopify/dev-mcp@latest
```

## Database Collections

### MongoDB Collections
- **bdm_conversations**: Chat messages and responses
- **bdm_clients**: Client contact information
- **bdm_quotes**: Quote requests and estimates
- **bdm_projects**: Project scoping sessions

### Qdrant Collections
- **shopify_quotes**: Vector embeddings of past quotes
- **shopify_projects**: Project similarity matching
- **shopify_knowledge**: Technical knowledge base

## Future Enhancements

- [ ] Integration with Shopify Partner API
- [ ] Automated quote generation with PDF export
- [ ] Calendar integration for consultation scheduling
- [ ] Multi-language support
- [ ] Voice message support
- [ ] Screen sharing for technical demonstrations
- [ ] Integration with CRM systems
- [ ] Automated follow-up sequences

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`

3. Start MongoDB and Qdrant services

4. Run the development server:
```bash
npm run dev
```

5. Navigate to `/shopify-bdm-chat` to start using the consultant

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is part of the Dynamic Dreams AI agent demos and is licensed under the MIT License.
