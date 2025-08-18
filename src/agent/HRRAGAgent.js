const axios = require('axios');
import GroqClient from "../Clients/GroqClient.js";
import QdrantManager from "../Clients/QdrantManager.js";
import JinaClient from "../Clients/JinaClient.js";
import MongoManager from "../Clients/MongoManager.js";

class HRRAGAgent {
    constructor(config) {
        const {
            mongoDbName = "hr_assistant",
            collectionName = "embeddings",
            maxHistoryLength = 20,
            chunkSize = 1000,
            chunkOverlap = 200,
            maxContextLength = 4000,
            similarityThreshold = 0.7,
        } = config;

        // Initialize clients
        this.qdrantManager = new QdrantManager();
        this.jina = new JinaClient();
        this.groqClient = new GroqClient();
        this.mongoDbName = mongoDbName;
        this.dbPromise = new MongoManager({ dbName: 'hr_assistant' }).connect();
        this.db = null;

        this.collectionName = collectionName;
        this.maxHistoryLength = maxHistoryLength;
        this.chunkSize = chunkSize;
        this.chunkOverlap = chunkOverlap;
        this.maxContextLength = maxContextLength;
        this.similarityThreshold = similarityThreshold;
    }
    async initializeDB() {
        if (!this.db) {
            try {
                this.db = await this.dbPromise;
                console.log("Database connection established");
                const collections = await this.db.listCollections().toArray();
                console.log("Available collections:", collections.map(c => c.name));
            } catch (error) {
                console.error("Error initializing database:", error);
                throw error;
            }
        }
    }

    /**
     * Close MongoDB connection
     */
    async closeDB() {
        if (this.mongoClient) {
            await this.mongoClient.close();
        }
    }

    /**
     * Create or get chat session
     */
    async createChatSession(userId, sessionId = null) {
        if (!this.db) await this.initializeDB();

        const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const existingSession = await this.db.collection('chat_sessions').findOne({ sessionId: id });

        if (!existingSession) {
            const session = {
                sessionId: id,
                userId: userId,
                createdAt: new Date(),
                lastActivity: new Date(),
                messageCount: 0,
                searchCount: 0,
                status: 'active'
            };

            await this.db.collection('chat_sessions').insertOne(session);
        } else {
            // Update last activity
            await this.db.collection('chat_sessions').updateOne(
                { sessionId: id },
                { $set: { lastActivity: new Date() } }
            );
        }

        return id;
    }

    /**
     * Add message to chat history in MongoDB
     */
    async addToHistory(sessionId, role, content, metadata = {}) {
        if (!this.db) await this.initializeDB();

        const message = {
            sessionId,
            role,
            content,
            timestamp: new Date(),
            metadata
        };

        await this.db.collection('chat_messages').insertOne(message);

        // Update session stats
        await this.db.collection('chat_sessions').updateOne(
            { sessionId },
            {
                $inc: { messageCount: 1 },
                $set: { lastActivity: new Date() }
            }
        );

        // Clean up old messages if needed
        await this.cleanupOldMessages(sessionId);
    }

    /**
     * Get chat history from MongoDB
     */
    async getChatHistory(sessionId, limit = null) {
        if (!this.db) await this.initializeDB();

        const query = { sessionId };
        const options = {
            sort: { timestamp: 1 },
            limit: limit || this.maxHistoryLength
        };

        const messages = await this.db.collection('chat_messages')
            .find(query, options)
            .toArray();

        return messages;
    }

    /**
     * Clean up old messages to maintain performance
     */
    async cleanupOldMessages(sessionId) {
        if (!this.db) return;

        const totalMessages = await this.db.collection('chat_messages').countDocuments({ sessionId });
        
        if (totalMessages > this.maxHistoryLength) {
            // Keep only the most recent messages
            const messagesToDelete = await this.db.collection('chat_messages')
                .find({ sessionId })
                .sort({ timestamp: 1 })
                .limit(totalMessages - this.maxHistoryLength)
                .toArray();

            const idsToDelete = messagesToDelete.map(msg => msg._id);
            await this.db.collection('chat_messages').deleteMany({
                _id: { $in: idsToDelete }
            });
        }
    }

    /**
     * Get user's active sessions
     */
    async getUserSessions(userId, limit = 10) {
        if (!this.db) await this.initializeDB();

        return await this.db.collection('chat_sessions')
            .find({ userId, status: 'active' })
            .sort({ lastActivity: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * Log search analytics
     */
    async logSearchAnalytics(sessionId, query, resultsCount, averageScore, processingTime) {
        if (!this.db) await this.initializeDB();

        const analytics = {
            sessionId,
            query,
            resultsCount,
            averageScore,
            processingTime,
            timestamp: new Date()
        };

        await this.db.collection('search_analytics').insertOne(analytics);
        
        // Update session search count
        await this.db.collection('chat_sessions').updateOne(
            { sessionId },
            { $inc: { searchCount: 1 } }
        );
    }

    /**
     * Search for similar candidates in Qdrant
     */
    async searchSimilarCandidates(queryVector) {
        try {
            const searchResult = await this.qdrantManager.search('hr', queryVector);

            const candidates = searchResult.map(result => ({
                id: result.id,
                score: result.score,
                content: result.payload?.content || '',
                candidateData: result.payload?.candidateData || {},
                metadata: result.payload?.metadata || {}
            }));
            return candidates
        } catch (error) {
            console.error('Error searching candidates:', error);
            throw error;
        }
    }

    /**
     * Determine if query is asking for specific candidate details or multiple candidates
     */
    isSpecificCandidateQuery(question) {
        const specificIndicators = [
            'tell me about',
            'details of',
            'information about',
            'profile of',
            'background of',
            'show me',
            'specific',
            'particular',
            'individual'
        ];

        const multipleIndicators = [
            'find candidates',
            'search for',
            'show candidates',
            'list candidates',
            'who are the',
            'candidates with',
            'developers who',
            'people with',
            'professionals with'
        ];

        const lowerQuestion = question.toLowerCase();

        const hasSpecificIndicators = specificIndicators.some(indicator =>
            lowerQuestion.includes(indicator)
        );

        const hasMultipleIndicators = multipleIndicators.some(indicator =>
            lowerQuestion.includes(indicator)
        );

        if (hasSpecificIndicators && hasMultipleIndicators) {
            return false;
        }

        return hasSpecificIndicators;
    }

    /**
     * Generate HR-specific response with chat history context
     */
    async generateHRResponse(sessionId, question, contextCandidates) {
        const isSpecificQuery = this.isSpecificCandidateQuery(question);

        // Get chat history for context
        const chatHistory = await this.getChatHistory(sessionId, 10);

        // Prepare context from retrieved candidates
        const context = contextCandidates
            .map((candidate, i) => {
                const data = candidate.candidateData || {};
                return `Candidate ${i + 1} (Relevance Score: ${candidate.score.toFixed(3)}):
Name: ${data.name || 'N/A'}
Title: ${data.title || 'N/A'}
Email: ${data.email || 'N/A'}
Phone: ${data.phone || 'N/A'}
Location: ${data.location || 'N/A'}
Skills: ${Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || 'N/A')}
Experience: ${Array.isArray(data.experience) ? data.experience.map(exp => `${exp.role} (${exp.period})`).join('; ') : (data.experience || 'N/A')}
Summary: ${data.summary || 'N/A'}
Content: ${candidate.content}`;
            })
            .join('\n\n');

        // Prepare chat history context
        const historyContext = chatHistory.length > 0 ?
            chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n') :
            'No previous conversation history.';

        let systemPrompt, userPrompt;

        if (isSpecificQuery) {
            systemPrompt = `You are an HR assistant helping to provide detailed information about specific candidates.
You have access to conversation history and should use it to provide more contextual and personalized responses.
Based on the candidate data provided, give comprehensive details about the candidate including their background, skills, experience, and suitability.
Provide a natural, conversational response with all relevant details, referencing previous conversation if relevant.`;

            userPrompt = `Previous conversation:
${historyContext}

Current candidate information:
${context}

Current question: ${question}

Provide detailed information about the candidate(s) that best match the query, considering the conversation context. Include their background, skills, experience, and any other relevant details in a conversational format.`;

        } else {
            systemPrompt = `You are an HR assistant that helps find candidates from a database. 
You have access to conversation history to provide more contextual responses.
When searching for multiple candidates, you must respond with a JSON array containing candidate objects in this exact format:

[
  {
    "name": "Full Name",
    "title": "Job Title",
    "email": "email@domain.com",
    "phone": "+1 (XXX) XXX-XXXX",
    "location": "City, State/Country",
    "skills": ["skill1", "skill2", "skill3", "X more"],
    "experience": [
      {
        "role": "Position at Company",
        "period": "Start – End • Duration"
      }
    ],
    "summary": "Brief professional summary",
    "projects": [
      {
        "title": "Project Name",
        "desc": "Project description"
      }
    ],
    "avatar": "👨‍💻" or "👩‍💻"
  }
]

IMPORTANT: 
- Respond ONLY with valid JSON array, no other text
- Use the exact field names shown above
- If a field is missing from the data, use reasonable defaults or "N/A"
- For skills, if there are more than 6, list first 5-6 and add "X more"
- Choose appropriate avatar emoji based on role/gender
- Ensure JSON is properly formatted and parseable
- Consider conversation history to refine search results`;

            userPrompt = `Previous conversation:
${historyContext}

Current search query: ${question}

Candidate data:
${context}

Return the matching candidates as a JSON array using the specified format, considering the conversation context to provide the most relevant results.`;
        }

        let messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]


        const result = await this.groqClient.chat(messages);
        return result
    }

   
    async chatWithHistory(userId, query, options = {}) {
        const startTime = Date.now();

        const {
            embeddingModel = 'jina-embeddings-v3',
            chatModel = 'llama3-8b-8192'
        } = options;

        try {
            // Step 1: Create or get chat session
            const sessionId = await this.createChatSession(userId);

            // Step 2: Add user query to history
            await this.addToHistory(sessionId, 'user', query);

            // Step 3: Generate query embedding
            const queryVector = await this.jina.embedText(query, embeddingModel);

            // Step 4: Search for similar candidates
            const similarCandidates = await this.searchSimilarCandidates(queryVector);

            // Step 5: Handle no results case
            const noResultsMessage = 'No relevant candidates found in the database for your search criteria. Could you try rephrasing your query or adjusting the requirements?';

            if (!similarCandidates || similarCandidates.length === 0) {
                await this.addToHistory(sessionId, 'assistant', noResultsMessage, {
                    type: 'no_results',
                    candidatesFound: 0
                });

                return {
                    sessionId,
                    query,
                    answer: noResultsMessage,
                    rawCandidates: [],
                    metadata: {
                        candidatesFound: 0,
                        averageScore: 0,
                        processingTime: Date.now() - startTime,
                        embeddingModel,
                        chatModel
                    }
                };
            }

            // Step 6: Generate contextual response with history
            const response = await this.generateHRResponse(sessionId, query, similarCandidates);

            // Step 7: Calculate metrics
            const averageScore = similarCandidates.reduce((sum, candidate) => sum + candidate.score, 0) / similarCandidates.length;
            const processingTime = Date.now() - startTime;

            // Step 8: Parse response if needed
            let parsedResponse = this.parseResponse(response);

            // Step 9: Add assistant response to history
            await this.addToHistory(sessionId, 'assistant', parsedResponse, {
                type: response.type || 'success',
                candidatesFound: similarCandidates.length,
                averageScore: averageScore
            });

            // Step 10: Log analytics
            await this.logSearchAnalytics(sessionId, query, similarCandidates.length, averageScore, processingTime);

            // Step 11: Return formatted response
            return {
                sessionId,
                query,
                answer: parsedResponse,
                rawCandidates: similarCandidates,
                metadata: {
                    candidatesFound: similarCandidates.length,
                    averageScore,
                    processingTime,
                    embeddingModel,
                    chatModel
                }
            };

        } catch (error) {
            console.error('Error in chat session:', error);
            throw Error 
        }
    }

    // Helper method to parse response consistently
    parseResponse(response) {
        if (typeof response === 'string') {
            try {
                const parsed = JSON.parse(response);
                return (Array.isArray(parsed) || typeof parsed === 'object') ? parsed : response;
            } catch {
                return response;
            }
        }
        return response;
    }
    /**
     * Get conversation summary for a session
     */
    async getConversationSummary(sessionId) {
        if (!this.db) await this.initializeDB();

        const session = await this.db.collection('chat_sessions').findOne({ sessionId });
        const messageCount = await this.db.collection('chat_messages').countDocuments({ sessionId });
        const analytics = await this.db.collection('search_analytics')
            .find({ sessionId })
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        return {
            session,
            messageCount,
            recentSearches: analytics
        };
    }

    /**
     * Add candidate profiles to the Qdrant collection
     */
    async addCandidates(candidates) {
        try {
            const points = [];

            for (const [i, candidate] of candidates.entries()) {
                const searchableContent = `
        Name: ${candidate.name || ''}
        Title: ${candidate.title || ''}
        Skills: ${Array.isArray(candidate.skills) ? candidate.skills.join(', ') : (candidate.skills || '')}
        Experience: ${Array.isArray(candidate.experience) ? candidate.experience.map(exp => exp.role).join(', ') : (candidate.experience || '')}
        Location: ${candidate.location || ''}
        Summary: ${candidate.summary || ''}
        ${candidate.content || ''}
    `.trim();

                const embedding = await this.jina.embedText(
                    searchableContent,
                    "jina-embeddings-v3"
                );

                points.push({
                    vector: embedding,
                    payload: {
                        content: searchableContent,
                        candidateData: candidate,
                    }
                });
            }
            await this.qdrantManager.addDocuments("hr", points);
            const results = [];
            results.push({
                success: true,
                message: `candidates added successfully`,
            });
            return results
        } catch (error) {
            console.error('Error adding candidates:', error);
            throw error;
        }
    }
}

// Example usage with MongoDB history
async function main() {
    const hrAgent = new HRRAGAgent({
        qdrantUrl: 'http://localhost:6333',
        jinaApiKey: 'your-jina-api-key-here',
        groqApiKey: 'your-groq-api-key-here',
        mongoUrl: 'mongodb://localhost:27017',
        mongoDbName: 'hr_assistant',
        collectionName: 'candidates'
    });

    try {
        // Initialize database connection
        await hrAgent.initializeDB();

        // Create or use existing chat session
        const userId = 'hr_manager_123';
        const sessionId = await hrAgent.createChatSession(userId);

        console.log(`Created chat session: ${sessionId}`);

        // Example conversation with history
        console.log('\n=== Chat 1: Initial Search ===');
        const result1 = await hrAgent.chatWithHistory(
            sessionId,
            userId,
            'Find experienced React developers with TypeScript skills'
        );

        if (result1.type === 'candidates_list') {
            console.log('Found candidates:', JSON.stringify(result1.data, null, 2));
        } else {
            console.log('Response:', result1.data);
        }

        console.log('\n=== Chat 2: Follow-up Question ===');
        const result2 = await hrAgent.chatWithHistory(
            sessionId,
            userId,
            'Which of these candidates have the most senior experience?'
        );

        console.log('Follow-up Response:', result2.data);

        // Get conversation summary
        const summary = await hrAgent.getConversationSummary(sessionId);
        console.log('\n=== Conversation Summary ===');
        console.log('Total messages:', summary.messageCount);
        console.log('Search count:', summary.session.searchCount);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        // Close database connection
        await hrAgent.closeDB();
    }
}

// Export the class
export default HRRAGAgent;

// Uncomment to run example
// main();