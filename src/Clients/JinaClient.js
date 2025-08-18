import 'dotenv/config';
import JinaAI from 'jinaai';
import axios from 'axios';

/**
 * Jina Embeddings Client
 */
class JinaClient {
    constructor(config = {}) {
        const {
            apiKey = process.env.JINA_API_KEY,
            defaultModel = 'jina-embeddings-v3',
            timeout = 30000
        } = config;

        if (!apiKey) {
            throw new Error('Jina API key is required');
        }

        this.jina = new JinaAI({ apiKey: apiKey });
        this.defaultModel = defaultModel;
        this.timeout = timeout;
    }

    /**
     * Generate embeddings for text
     * @param {string|Array} input - Text or array of texts to embed
     * @param {Object} options - Optional parameters
     * @returns {Promise<Array>} Embedding vectors
     */
    async embed(input, options = {}) {
        const {
            model = this.defaultModel,
        } = options;
           try {
    
        const response = await axios.post(
            "https://api.jina.ai/v1/embeddings",
            {
                model: "jina-embeddings-v3", // or jina-embeddings-v3, etc.
                input: [input],
                task: "retrieval.passage",
                dimensions: 768,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.JINA_API_KEY}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        );

            const embeddings = response.data.data.map(item => item.embedding);
            return Array.isArray(input) ? embeddings : embeddings[0];
    } catch (err) {
        console.error("Jina API Error:", err.response?.data || err.message);
    }
    }

    /**
     * Generate embedding for single text (convenience method)
     * @param {string} text - Text to embed
     * @param {string} model - Model to use
     * @returns {Promise<Array>} Embedding vector
     */
    async embedText(text, model = this.defaultModel) {
        return await this.embed(text, { model });
    }

    /**
     * Generate embeddings for multiple texts
     * @param {Array} texts - Array of texts to embed
     * @param {string} model - Model to use
     * @returns {Promise<Array>} Array of embedding vectors
     */
    async embedBatch(texts, model = this.defaultModel) {
        return await this.embed(texts, { model });
    }

    /**
     * Get available embedding models
     */
    async getModels() {
        try {
            const models = await this.jina.models.list();
            return models.data.filter(model => model.id.includes('embedding'));
        } catch (error) {
            console.error('Error fetching Jina models:', error.message);
            throw error;
        }
    }
}

export default JinaClient;