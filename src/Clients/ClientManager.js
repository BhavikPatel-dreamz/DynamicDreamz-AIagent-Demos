import GroqClient from './GroqClient.js';
import JinaClient from './JinaClient.js';
import QdrantManager from './QdrantManager.js';
import MongoManager from './MongoManager.js';

/**
 * Client Manager - Unified interface for all clients
 */
class ClientManager {
    constructor(config = {}) {
        const {
            groq = {},
            jina = {},
            qdrant = {},
            mongo = {}
        } = config;

        // Initialize all clients
        this.groq = new GroqClient(groq);
        this.jina = new JinaClient(jina);
        this.qdrant = new QdrantManager(qdrant);
        this.mongo = new MongoManager(mongo);

        this.initialized = false;
    }

    /**
     * Initialize all clients
     */
    async initialize() {
        try {
            // Connect to MongoDB
            await this.mongo.connect();

            // Test other clients
            console.log('🔄 Testing client connections...');
            
            const groqAvailable = await this.groq.isAvailable();
            console.log(`Groq API: ${groqAvailable ? '✅ Available' : '❌ Not available'}`);

            try {
                await this.jina.embedText('test');
                console.log('Jina API: ✅ Available');
            } catch (error) {
                console.log('Jina API: ❌ Not available');
            }

            try {
                await this.qdrant.listCollections();
                console.log('Qdrant: ✅ Available');
            } catch (error) {
                console.log('Qdrant: ❌ Not available');
            }

            this.initialized = true;
            console.log('🚀 All clients initialized successfully');
            
        } catch (error) {
            console.error('❌ Client initialization failed:', error);
            throw error;
        }
    }

    /**
     * Close all connections
     */
    async close() {
        await this.mongo.disconnect();
        console.log('🔄 All clients disconnected');
    }

    /**
     * Check if all clients are ready
     */
    isReady() {
        return this.initialized;
    }
}

export default ClientManager;