import 'dotenv/config';

import axios from 'axios';

// /**
//  * Jina Embeddings Client Old code
//  */
// class JinaClient {
//     constructor(config = {}) {
//         const {
//             apiKey = process.env.JINA_API_KEY,
//             defaultModel = 'jina-embeddings-v3',
//             timeout = 30000
//         } = config;

//         if (!apiKey) {
//             throw new Error('Jina API key is required');
//         }

//         this.jina = new JinaAI({ apiKey: apiKey });
//         this.defaultModel = defaultModel;
//         this.timeout = timeout;
//     }

//     /**
//      * Generate embeddings for text
//      * @param {string|Array} input - Text or array of texts to embed
//      * @param {Object} options - Optional parameters
//      * @returns {Promise<Array>} Embedding vectors
//      */
//     async embed(input, options = {}) {
//         const {
//             model = this.defaultModel,
//         } = options;
//            try {
    
//         const response = await axios.post(
//             "https://api.jina.ai/v1/embeddings",
//             {
//                 model: "jina-embeddings-v2-base-en", // or jina-embeddings-v3, etc.
//                 input: [input],
//               //  task: "retrieval.passage",
//                 dimensions: 768,
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${process.env.JINA_API_KEY}`,
//                     "Content-Type": "application/json",
//                 },
//                 timeout: 30000,
//             }
//         );

//             const embeddings = response.data.data.map(item => item.embedding);
//             return Array.isArray(input) ? embeddings : embeddings[0];
//     } catch (err) {
//         console.error("Jina API Error:", err.response?.data || err.message);
//     }
//     }

//     /**
//      * Generate embedding for single text (convenience method)
//      * @param {string} text - Text to embed
//      * @param {string} model - Model to use
//      * @returns {Promise<Array>} Embedding vector
//      */
//     async embedText(text, model = this.defaultModel) {
//         return await this.embed(text, { model });
//     }

//     /**
//      * Generate embeddings for multiple texts
//      * @param {Array} texts - Array of texts to embed
//      * @param {string} model - Model to use
//      * @returns {Promise<Array>} Array of embedding vectors
//      */
//     async embedBatch(texts, model = this.defaultModel) {
//         return await this.embed(texts, { model });
//     }

//     /**
//      * Get available embedding models
//      */
//     async getModels() {
//         try {
//             const models = await this.jina.models.list();
//             return models.data.filter(model => model.id.includes('embedding'));
//         } catch (error) {
//             console.error('Error fetching Jina models:', error.message);
//             throw error;
//         }
//     }
// }


class JinaClient {
  constructor({
    apiKey = process.env.JINA_API_KEY,
    defaultModel = 'jina-embeddings-v2-base-en',
    timeout = 30000,
    baseURL = 'https://api.jina.ai/v1',
    retries = 3,
    retryDelay = 1000
  } = {}) {
    if (!apiKey) throw new Error('Jina API key is required.');

    this.defaultModel = defaultModel;
    this.retries = retries;
    this.retryDelay = retryDelay;

    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'JinaClient/1.0.0'
      }
    });
  }

  async _retry(fn) {
    for (let i = 0; i < this.retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (err.response?.status >= 400 && err.response?.status < 500) throw err;
        if (i < this.retries - 1) await new Promise(r => setTimeout(r, this.retryDelay * (i + 1)));
        else throw err;
      }
    }
  }

  async embed(input, { model = this.defaultModel, dimensions, task } = {}) {
    const inputArray = Array.isArray(input) ? input : [input];
    const body = { model, input: inputArray, ...(dimensions && { dimensions }), ...(task && { task }) };

    const res = await this._retry(() => this.client.post('/embeddings', body));
    const embeddings = res.data?.data?.map(d => d.embedding) || [];

    return Array.isArray(input) ? embeddings : embeddings[0];
  }

  async embedText(text, opts) {
    if (typeof text !== 'string') throw new Error('Input must be a string');
    return this.embed(text, opts);
  }

  async embedBatch(texts, { batchSize = 100, ...opts } = {}) {
    if (!Array.isArray(texts)) throw new Error('Input must be an array of strings');
    const results = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      results.push(...await this.embed(texts.slice(i, i + batchSize), opts));
    }
    return results;
  }

  async getModels() {
    const res = await this.client.get('/models');
    return res.data?.data?.filter(m => m.id.includes('embedding') || m.object === 'embedding') || [];
  }
}

export default  JinaClient;