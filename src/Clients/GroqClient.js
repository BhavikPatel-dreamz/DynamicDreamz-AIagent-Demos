import axios from "axios";

class GroqClient {
    constructor(config = {}) {
        const {
            apiKey = process.env.GROQ_API_KEY,
            baseURL = 'https://api.groq.com/openai/v1',
            defaultModel = 'llama3-8b-8192',
            timeout = 30000
        } = config;

        if (!apiKey) {
            throw new Error('Groq API key is required');
        }

        this.apiKey = apiKey;
        this.baseURL = baseURL;
        this.defaultModel = defaultModel;
        this.timeout = timeout;
        this.chatURL = `${baseURL}/chat/completions`;
    }

    /**
     * Generate chat completion
     * @param {Array} messages - Array of message objects {role, content}
     * @param {Object} options - Optional parameters
     * @returns {Promise<string>} Generated response
     */
    async chat(messages, options = {}) {
        const {
            model = this.defaultModel,
            temperature = 0.1,
            maxTokens = 1500,
            stream = false
        } = options;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };

        const payload = {
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            stream: stream
        };

        try {
            const response = await axios.post(this.chatURL, payload, {
                headers: headers,
                timeout: this.timeout
            });

            console.log('Groq API response:', response.data.choices[0]?.message.content);

            return response.data.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('Groq API error:', error.response?.data || error.message);
            throw new Error(`Groq API error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    /**
     * Check if Groq API is available
     */
    async isAvailable() {
        try {
            await this.chat([{ role: 'user', content: 'test' }], { maxTokens: 1 });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get available models
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

            return response.data.data;
        } catch (error) {
            console.error('Error fetching Groq models:', error.response?.data || error.message);
            throw error;
        }
    }
}

export default GroqClient;