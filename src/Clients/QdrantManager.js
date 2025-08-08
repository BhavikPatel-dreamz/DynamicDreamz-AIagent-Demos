import { QdrantClient } from '@qdrant/js-client-rest';

/**
 * Qdrant Vector Database Client
 */
class QdrantManager {
    constructor(config = {}) {
        const {
            url = process.env.QDRANT_URL || 'http://localhost:6333',
            apiKey = process.env.QDRANT_API_KEY || null,
            timeout = 30000
        } = config;

        this.client = new QdrantClient({
            url: url,
            apiKey: apiKey,
            timeout: timeout
        });

        this.url = url;
        this.apiKey = apiKey;
    }

    /**
     * Create a new collection
     * @param {string} collectionName - Name of the collection
     * @param {Object} config - Collection configuration
     */
    async createCollection(collectionName, config = {}) {
        const {
            vectorSize = 768,
            distance = 'Cosine',
            onDiskPayload = true
        } = config;

        try {
            await this.client.createCollection(collectionName, {
                vectors: {
                    size: vectorSize,
                    distance: distance,
                    on_disk: onDiskPayload
                }
            });

            console.log(`✅ Created collection: ${collectionName}`);
            return true;
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log(`⚠️ Collection ${collectionName} already exists`);
                return true;
            }
            console.error('Error creating collection:', error);
            throw error;
        }
    }

    /**
     * Check if collection exists
     * @param {string} collectionName - Name of the collection
     * @returns {Promise<boolean>} Whether collection exists
     */
    async collectionExists(collectionName) {
        try {
            await this.client.getCollection(collectionName);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Add documents to collection
     * @param {string} collectionName - Name of the collection
     * @param {Array} documents - Array of document objects
     * @returns {Promise<Array>} Operation results
     */
    async addDocuments(collectionName, documents) {
        try {
            const points = documents.map(doc => ({
                id: doc.id || Math.random().toString(36).substr(2, 9),
                vector: doc.vector,
                payload: doc.payload || {}
            }));

            const result = await this.client.upsert(collectionName, {
                wait: true,
                points: points
            });

            console.log(`✅ Added ${points.length} documents to ${collectionName}`);
            return result;
        } catch (error) {
            console.error('Error adding documents:', error);
            throw error;
        }
    }

    /**
     * Search for similar vectors
     * @param {string} collectionName - Name of the collection
     * @param {Array} queryVector - Query vector
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search results
     */
    async search(collectionName, queryVector, options = {}) {
        const {
            limit = 5,
            scoreThreshold = 0.6,
            withPayload = true,
            withVector = false,
            filter = null
        } = options;

        try {
            const searchResult = await this.client.search(collectionName, {
                vector: queryVector,
                limit: limit,
                score_threshold: scoreThreshold,
                with_payload: withPayload,
                with_vector: withVector,
                filter: filter
            });

            return searchResult.map(result => ({
                id: result.id,
                score: result.score,
                payload: result.payload || {},
                vector: result.vector || null
            }));
        } catch (error) {
            console.error('Error searching collection:', error);
            throw error;
        }
    }

    /**
     * Delete documents from collection
     * @param {string} collectionName - Name of the collection
     * @param {Array} ids - Array of document IDs to delete
     */
    async deleteDocuments(collectionName, ids) {
        try {
            await this.client.delete(collectionName, {
                ids: ids,
                wait: true
            });

            console.log(`✅ Deleted ${ids.length} documents from ${collectionName}`);
        } catch (error) {
            console.error('Error deleting documents:', error);
            throw error;
        }
    }

    /**
     * Get collection info
     * @param {string} collectionName - Name of the collection
     */
    async getCollectionInfo(collectionName) {
        try {
            return await this.client.getCollection(collectionName);
        } catch (error) {
            console.error('Error getting collection info:', error);
            throw error;
        }
    }

    /**
     * List all collections
     */
    async listCollections() {
        try {
            const result = await this.client.getCollections();
            return result.collections;
        } catch (error) {
            console.error('Error listing collections:', error);
            throw error;
        }
    }
}

export default QdrantManager;
