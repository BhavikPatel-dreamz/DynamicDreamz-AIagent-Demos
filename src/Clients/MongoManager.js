import { MongoClient } from 'mongodb';
/**
 * MongoDB Client Manager
 */
class MongoManager {
    constructor(config = {}) {
        const {
            url = process.env.MONGO_URL || 'mongodb://localhost:27017',
            dbName = process.env.MONGO_DB_NAME || 'ai_assistant',
            options = {}
        } = config;

        this.url = url;
        this.dbName = dbName;
        this.options = options;
        this.client = null;
        this.db = null;
        this.isConnected = false;
    }

    /**
     * Connect to MongoDB
     */
    async connect() {
        try {
            this.client = new MongoClient(this.url, this.options);
            await this.client.connect();
            this.db = this.client.db(this.dbName);
            this.isConnected = true;

            console.log(`✅ Connected to MongoDB: ${this.dbName}`);
            
            // Create default indexes
            await this.createDefaultIndexes();
            
            return this.db;
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    }

    /**
     * Disconnect from MongoDB
     */
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.isConnected = false;
            console.log('✅ Disconnected from MongoDB');
        }
    }

    /**
     * Get database instance
     */
    getDB() {
        if (!this.isConnected || !this.db) {
            throw new Error('MongoDB not connected. Call connect() first.');
        }
        return this.db;
    }

    /**
     * Create default indexes for common collections
     */
    async createDefaultIndexes() {
        try {
            const db = this.getDB();

            // Chat sessions indexes
            await db.collection('chat_sessions').createIndex({ sessionId: 1 }, { unique: true });
            await db.collection('chat_sessions').createIndex({ userId: 1 });
            await db.collection('chat_sessions').createIndex({ lastActivity: -1 });

            // Chat messages indexes
            await db.collection('chat_messages').createIndex({ sessionId: 1, timestamp: 1 });
            await db.collection('chat_messages').createIndex({ userId: 1, timestamp: -1 });

            // General analytics indexes
            await db.collection('analytics').createIndex({ timestamp: -1 });
            await db.collection('analytics').createIndex({ sessionId: 1 });

            console.log('✅ Created default MongoDB indexes');
        } catch (error) {
            console.warn('Warning: Could not create some indexes:', error.message);
        }
    }

    /**
     * Create or get chat session
     */
    async createChatSession(userId, sessionId = null, sessionType = 'general') {
        const db = this.getDB();
        const id = sessionId || `${sessionType}_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const existingSession = await db.collection('chat_sessions').findOne({ sessionId: id });
        
        if (!existingSession) {
            const session = {
                sessionId: id,
                userId: userId,
                sessionType: sessionType,
                createdAt: new Date(),
                lastActivity: new Date(),
                messageCount: 0,
                queryCount: 0,
                status: 'active'
            };
            
            await db.collection('chat_sessions').insertOne(session);
        } else {
            await db.collection('chat_sessions').updateOne(
                { sessionId: id },
                { $set: { lastActivity: new Date() } }
            );
        }
        
        return id;
    }

    /**
     * Add message to chat history
     */
    async addMessage(sessionId, role, content, metadata = {}) {
        const db = this.getDB();

        const message = {
            sessionId,
            role,
            content,
            timestamp: new Date(),
            metadata
        };

        await db.collection('chat_messages').insertOne(message);

        // Update session stats
        await db.collection('chat_sessions').updateOne(
            { sessionId },
            { 
                $inc: { messageCount: 1 },
                $set: { lastActivity: new Date() }
            }
        );
    }

    /**
     * Get chat history
     */
    async getChatHistory(sessionId, limit = 20) {
        const db = this.getDB();

        return await db.collection('chat_messages')
            .find({ sessionId })
            .sort({ timestamp: 1 })
            .limit(limit)
            .toArray();
    }

    /**
     * Clear chat history
     */
    async clearChatHistory(sessionId) {
        const db = this.getDB();
        
        await db.collection('chat_messages').deleteMany({ sessionId });
        await db.collection('chat_sessions').updateOne(
            { sessionId },
            { 
                $set: { messageCount: 0, lastActivity: new Date() }
            }
        );
    }

    /**
     * Get user sessions
     */
    async getUserSessions(userId, limit = 10) {
        const db = this.getDB();

        return await db.collection('chat_sessions')
            .find({ userId, status: 'active' })
            .sort({ lastActivity: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * Log analytics data
     */
    async logAnalytics(sessionId, eventType, data = {}) {
        const db = this.getDB();

        const analytics = {
            sessionId,
            eventType,
            data,
            timestamp: new Date()
        };

        await db.collection('analytics').insertOne(analytics);
    }

    /**
     * Clean up old messages (keep only recent ones per session)
     */
    async cleanupOldMessages(sessionId, keepCount = 20) {
        const db = this.getDB();

        const totalMessages = await db.collection('chat_messages').countDocuments({ sessionId });
        
        if (totalMessages > keepCount) {
            const messagesToDelete = await db.collection('chat_messages')
                .find({ sessionId })
                .sort({ timestamp: 1 })
                .limit(totalMessages - keepCount)
                .toArray();

            const idsToDelete = messagesToDelete.map(msg => msg._id);
            await db.collection('chat_messages').deleteMany({
                _id: { $in: idsToDelete }
            });

            console.log(`🧹 Cleaned up ${idsToDelete.length} old messages for session ${sessionId}`);
        }
    }
}

export default MongoManager;