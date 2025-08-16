import Groq from 'groq-sdk';

class GroqClient {
    constructor(config = {}) {
        const {
            apiKey = process.env.GROQ_API_KEY,
            defaultModel = 'llama-3.1-70b-versatile',
            timeout = 30000
        } = config;

        if (!apiKey) {
            throw new Error('Groq API key is required');
        }

        this.groq = new Groq({ apiKey: apiKey });
        this.defaultModel = defaultModel;
        this.timeout = timeout;
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
            temperature = 0.2,
            maxTokens = 1500,
            stream = false
        } = options;

        try {
            const completion = await this.groq.chat.completions.create({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens,
                stream: stream
            });

            const response = completion.choices[0]?.message?.content || '';
            console.log('Groq API response:', response);

            return response;
        } catch (error) {
            console.error('Groq API error:', error.message);
            throw new Error(`Groq API error: ${error.message}`);
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
        try {
            const models = await this.groq.models.list();
            return models.data;
        } catch (error) {
            console.error('Error fetching Groq models:', error.message);
            throw error;
        }
    }
}

export default GroqClient;