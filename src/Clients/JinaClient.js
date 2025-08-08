import axios from 'axios';
/**
 * Jina Embeddings Client
 */
class JinaClient {
    constructor(config = {}) {
        const {
            apiKey = process.env.JINA_API_KEY,
            baseURL = 'https://api.jina.ai/v1',
            defaultModel = 'jina-embeddings-v2-base-en',
            timeout = 30000
        } = config;

        if (!apiKey) {
            throw new Error('Jina API key is required');
        }

        this.apiKey = apiKey;
        this.baseURL = baseURL;
        this.defaultModel = defaultModel;
        this.timeout = timeout;
        this.embedURL = `${baseURL}/embeddings`;
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
            encoding_format = 'float'
        } = options;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };

        const payload = {
            model: model,
            input: Array.isArray(input) ? input : [input],
            encoding_format: encoding_format
        };

        try {
            const response = await axios.post(this.embedURL, payload, {
                headers: headers,
                timeout: this.timeout
            });

            const embeddings = response.data.data.map(item => item.embedding);
            return Array.isArray(input) ? embeddings : embeddings[0];
        } catch (error) {
            console.error('Jina API error:', error.response?.data || error.message);
            throw new Error(`Jina API error: ${error.response?.data?.detail || error.message}`);
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
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`
        };

        try {
            const response = await axios.get(`${this.baseURL}/models`, {
                headers: headers,
                timeout: this.timeout
            });

            return response.data.data.filter(model => model.id.includes('embedding'));
        } catch (error) {
            console.error('Error fetching Jina models:', error.response?.data || error.message);
            throw error;
        }
    }
}

export default JinaClient;