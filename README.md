# Client SDKs - Updated Implementation

This directory contains updated client implementations using official SDKs with proper environment variable handling.

## Changes Made

### 1. **QdrantManager.js**
- ✅ Added `import 'dotenv/config';` for automatic environment variable loading
- ✅ Uses official `@qdrant/js-client-rest` SDK
- ✅ Proper error handling and logging

### 2. **GroqClient.js**
- ✅ Replaced axios-based implementation with official `groq-sdk`
- ✅ Added `import 'dotenv/config';` for automatic environment variable loading
- ✅ Updated to use `llama-3.1-70b-versatile` as default model
- ✅ Simplified API calls using SDK methods

### 3. **JinaClient.js**
- ✅ Replaced axios-based implementation with official `jinaai` SDK
- ✅ Added `import 'dotenv/config';` for automatic environment variable loading
- ✅ Streamlined embedding generation using SDK methods

### 4. **MongoManager.js**
- ✅ Added `import 'dotenv/config';` for consistency
- ✅ Already using official MongoDB SDK

## Environment Variables

Make sure you have these environment variables set in your `.env` file:

```env
# Groq API
GROQ_API_KEY=your_groq_api_key_here

# Jina AI
JINA_API_KEY=your_jina_api_key_here

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_here

# MongoDB
MONGO_URL=mongodb://localhost:27017
MONGO_DB_NAME=ai_assistant
```

## Usage Examples

### Groq Client
```javascript
import 'dotenv/config';
import GroqClient from './GroqClient.js';

const groq = new GroqClient();

const completion = await groq.chat([
    { role: 'system', content: 'You are concise and helpful.' },
    { role: 'user', content: 'Explain LangChain in one sentence.' },
], {
    model: 'llama-3.1-70b-versatile',
    temperature: 0.2,
});

console.log(completion);
```

### Jina Client
```javascript
import 'dotenv/config';
import JinaClient from './JinaClient.js';

const jina = new JinaClient();

const embedding = await jina.embedText('Hello, world!');
console.log('Embedding length:', embedding.length);
```

### Qdrant Manager
```javascript
import 'dotenv/config';
import QdrantManager from './QdrantManager.js';

const qdrant = new QdrantManager();

await qdrant.createCollection('my-collection', {
    vectorSize: 768,
    distance: 'Cosine'
});
```

### MongoDB Manager
```javascript
import 'dotenv/config';
import MongoManager from './MongoManager.js';

const mongo = new MongoManager();
await mongo.connect();

const sessionId = await mongo.createChatSession('user123');
```

## Benefits of SDK Approach

1. **Automatic Environment Loading**: `dotenv/config` automatically loads environment variables
2. **Official SDKs**: Using official SDKs ensures better compatibility and features
3. **Simplified Code**: Less boilerplate code compared to axios implementations
4. **Better Error Handling**: SDKs provide more detailed error information
5. **Type Safety**: Better TypeScript support with official SDKs
6. **Automatic Updates**: SDKs handle API changes automatically

## Dependencies Added

- `groq-sdk`: Official Groq SDK
- `jinaai`: Official Jina AI SDK
- `dotenv`: Already present, now used consistently

## Testing

Run the example file to test all clients:

```bash
node src/Clients/example-usage.js
```

This will test all the updated clients and verify they're working correctly with the new SDK approach.
