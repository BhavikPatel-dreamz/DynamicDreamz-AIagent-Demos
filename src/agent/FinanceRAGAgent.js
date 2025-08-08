import QdrantManager from "../Clients/QdrantManager.js";
import JinaClient from "../Clients/JinaClient.js";
import MongoManager from "../Clients/MongoManager.js";
import Groqclient from "../Clients/GroqClient.js";

class FinanceRAGAgent {
  constructor(config) {
    const {
      collectionName = "financial_documents",
      mongoDbName = "finance_assistant",
      maxHistoryLength = 20,
    } = config;

    // Initialize Qdrant client
    this.qdrantClient = new QdrantManager();
    this.jinaClient = new JinaClient();
    this.groqClient = new Groqclient();

    this.collectionName = collectionName;
    this.maxHistoryLength = maxHistoryLength;
    this.dbPromise = new MongoManager({ dbName: mongoDbName }).connect();
    this.db = null;

    // In-memory financial data (like your original code)
    this.expenseDB = [];
    this.incomeDB = [];
  }
  /**
   * Initialize MongoDB connection
   */
  async initializeDB() {
    try {
      if (!this.db) {
        this.db = await this.dbPromise;
      }

      // Create indexes for better performance
    //   await this.db.collection('chat_sessions').createIndex({ sessionId: 1 });
    //   await this.db.collection('chat_sessions').createIndex({ userId: 1 });
    //   await this.db.collection('chat_sessions').createIndex({ lastActivity: -1 });
    //   await this.db.collection('chat_messages').createIndex({ sessionId: 1, timestamp: 1 });
    //   await this.db.collection('financial_transactions').createIndex({ userId: 1, date: -1 });
    //   await this.db.collection('financial_analytics').createIndex({ timestamp: -1 });

      console.log("MongoDB connected successfully");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw error;
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
   * Generate embeddings using Jina API
   */
  async embedText(text, model = "jina-embeddings-v2-base-en") {

    const embedding = await this.jinaClient.embedText(text, model);
    if (!embedding || embedding.length === 0) {
      throw new Error("Failed to generate embedding for the text.");
    }
     
  }

  /**
   * Search for similar financial documents in Qdrant
   */
  async searchFinancialDocuments(queryVector, limit = 5, scoreThreshold = 0.6) {
    try {
      const searchResult = await this.qdrantClient.search(this.collectionName, {
        vector: queryVector,
        limit: limit,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vector: false,
      });

      const documents = searchResult.map((result) => ({
        id: result.id,
        score: result.score,
        content: result.payload?.content || "",
        documentData: result.payload?.documentData || {},
        metadata: result.payload?.metadata || {},
      }));

      return documents;
    } catch (error) {
      console.error("Error searching financial documents:", error);
      throw error;
    }
  }

  /**
   * Create or get chat session
   */
  async createChatSession(userId, sessionId = null) {
    if (!this.db) await this.initializeDB();

    const id =
      sessionId ||
      `finance_session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    console.log(
      `Creating or updating chat session for user ${userId} with session ID: ${id}`
    );
    const existingSession = await this.db
      .collection("chat_sessions")
      .findOne({ sessionId: id });
    console.log(existingSession);

    if (!existingSession) {
      const session = {
        sessionId: id,
        userId: userId,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        queryCount: 0,
        status: "active",
        type: "finance",
      };

      await this.db.collection("chat_sessions").insertOne(session);
    } else {
      await this.db
        .collection("chat_sessions")
        .updateOne({ sessionId: id }, { $set: { lastActivity: new Date() } });
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
      metadata,
    };

    await this.db.collection("chat_messages").insertOne(message);

    await this.db.collection("chat_sessions").updateOne(
      { sessionId },
      {
        $inc: { messageCount: 1 },
        $set: { lastActivity: new Date() },
      }
    );

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
      limit: limit || this.maxHistoryLength,
    };

    const messages = await this.db
      .collection("chat_messages")
      .find(query, options)
      .toArray();

    return messages;
  }

  /**
   * Clean up old messages
   */
  async cleanupOldMessages(sessionId) {
    if (!this.db) return;

    const totalMessages = await this.db
      .collection("chat_messages")
      .countDocuments({ sessionId });

    if (totalMessages > this.maxHistoryLength) {
      const messagesToDelete = await this.db
        .collection("chat_messages")
        .find({ sessionId })
        .sort({ timestamp: 1 })
        .limit(totalMessages - this.maxHistoryLength)
        .toArray();

      const idsToDelete = messagesToDelete.map((msg) => msg._id);
      await this.db.collection("chat_messages").deleteMany({
        _id: { $in: idsToDelete },
      });
    }
  }

  /**
   * Get financial context for AI
   */
  async getFinancialContext(userId) {
    // Get transactions from MongoDB
    const transactions = await this.getUserTransactions(userId);

    const expenses = transactions.filter((t) => t.type === "expense");
    const income = transactions.filter((t) => t.type === "income");

    const totalIncome = income.reduce((acc, item) => acc + item.amount, 0);
    const totalExpense = expenses.reduce((acc, item) => acc + item.amount, 0);
    const balance = totalIncome - totalExpense;

    let context = `\n=== CURRENT FINANCIAL STATUS ===\n`;
    context += `Balance: ₹${balance}\n`;
    context += `Total Income: ₹${totalIncome}\n`;
    context += `Total Expenses: ₹${totalExpense}\n`;
    context += `Total Transactions: ${transactions.length}\n\n`;

    if (income.length > 0) {
      context += `=== RECENT INCOME ===\n`;
      income.slice(-5).forEach((item, index) => {
        const date = new Date(item.date).toLocaleDateString();
        context += `${index + 1}. ${item.name}: ₹${item.amount} (${date})\n`;
      });
      context += `\n`;
    }

    if (expenses.length > 0) {
      context += `=== RECENT EXPENSES ===\n`;
      expenses.slice(-5).forEach((item, index) => {
        const date = new Date(item.date).toLocaleDateString();
        context += `${index + 1}. ${item.name}: ₹${item.amount} (${date})\n`;
      });
      context += `\n`;
    }

    // Add spending categories
    if (expenses.length > 0) {
      const categories = {};
      expenses.forEach((expense) => {
        const category = this.categorizeExpense(expense.name);
        categories[category] = (categories[category] || 0) + expense.amount;
      });

      context += `=== SPENDING BY CATEGORY ===\n`;
      Object.entries(categories).forEach(([category, amount]) => {
        context += `${category}: ₹${amount}\n`;
      });
      context += `\n`;
    }

    return context;
  }

  /**
   * Categorize expenses
   */
  categorizeExpense(name) {
    const lowercaseName = name.toLowerCase();

    if (
      lowercaseName.includes("food") ||
      lowercaseName.includes("restaurant") ||
      lowercaseName.includes("grocery") ||
      lowercaseName.includes("meal")
    ) {
      return "Food & Dining";
    }
    if (
      lowercaseName.includes("transport") ||
      lowercaseName.includes("fuel") ||
      lowercaseName.includes("taxi") ||
      lowercaseName.includes("bus")
    ) {
      return "Transportation";
    }
    if (
      lowercaseName.includes("shopping") ||
      lowercaseName.includes("clothes") ||
      lowercaseName.includes("electronics")
    ) {
      return "Shopping";
    }
    if (
      lowercaseName.includes("entertainment") ||
      lowercaseName.includes("movie") ||
      lowercaseName.includes("game")
    ) {
      return "Entertainment";
    }
    if (
      lowercaseName.includes("medical") ||
      lowercaseName.includes("health") ||
      lowercaseName.includes("doctor")
    ) {
      return "Healthcare";
    }
    if (
      lowercaseName.includes("rent") ||
      lowercaseName.includes("utilities") ||
      lowercaseName.includes("electricity")
    ) {
      return "Housing";
    }

    return "Other";
  }

  /**
   * Generate finance-specific response with RAG and chat history
   */
  async generateFinanceResponse(
    sessionId,
    userId,
    question,
    contextDocuments,
    model = "llama3-8b-8192"
  ) {
    // Get chat history and financial context
    const chatHistory = await this.getChatHistory(sessionId, 10);
    const financialContext = await this.getFinancialContext(userId);

    // Prepare context from retrieved documents
    const ragContext =
      contextDocuments.length > 0
        ? contextDocuments
            .map(
              (doc, i) =>
                `Document ${i + 1} (Score: ${doc.score.toFixed(3)}):\n${
                  doc.content
                }`
            )
            .join("\n\n")
        : "No relevant financial documents found in knowledge base.";

    // Prepare chat history context
    const historyContext =
      chatHistory.length > 0
        ? chatHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")
        : "No previous conversation history.";

    const systemPrompt = `You are Bhavik Patel, a helpful personal finance assistant. You help users manage their expenses, income, and financial planning.

You have access to:
1. User's current financial status and transaction history
2. Relevant financial documents from knowledge base
3. Previous conversation history

${financialContext}

Available tools (respond with EXACTLY this format when needed):
- TOOL:addExpense:{"name":"description","amount":123} - to add an expense
- TOOL:addIncome:{"name":"description","amount":123} - to add income  
- TOOL:getTotalExpense:{} - to get total expenses
- TOOL:getBalance:{} - to get current balance
- TOOL:getExpensesByCategory:{} - to get expenses grouped by category
- TOOL:getRecentTransactions:{} - to get recent transactions
- TOOL:getBudgetAdvice:{} - to get personalized budget advice
- TOOL:getInvestmentSuggestions:{} - to get investment suggestions

Guidelines:
- Provide personalized financial advice based on user's transaction history
- Use RAG context to provide accurate financial information
- When users mention spending, ask if they want to add it as expense
- When users mention earning, ask if they want to add it as income
- Give specific advice based on spending patterns and categories
- Alert about overspending in certain categories
- Suggest budgeting and investment strategies
- Keep responses helpful and educational
- Reference previous conversation context when relevant`;

    const userPrompt = `Previous conversation:
${historyContext}

Financial knowledge base context:
${ragContext}

Current question: ${question}

Provide helpful financial advice, answer the question using available context, and suggest tools if needed.`;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.groqApiKey}`,
    };

    const message =  [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]

    try {
      return  await this.groqClient.chat(message)
       
    } catch (error) {
      console.error(
        "Error generating response:",
        error.response?.data || error.message
      );
      throw error;
    }


  }

  /**
   * Main chat method with RAG and history
   */
  async chatWithFinanceHistory(sessionId, userId, query, options = {}) {
    const startTime = Date.now();

    const {
      limit = 5,
      scoreThreshold = 0.6,
      embeddingModel = "jina-embeddings-v2-base-en",
      chatModel = "llama3-8b-8192",
    } = options;

    try {
      // Ensure session exists
      await this.createChatSession(userId, sessionId);
      console.log(`Processing finance query for session ${sessionId}:`, query);

      // Add user message to history
      await this.addToHistory(sessionId, "user", query);

      // Step 1: Generate embedding and search knowledge base
      console.log("Searching financial knowledge base...");
      let contextDocuments = [];

    //   try {
    //     const queryVector = await this.embedText(query, embeddingModel);
    //     contextDocuments = await this.searchFinancialDocuments(
    //       queryVector,
    //       limit,
    //       scoreThreshold
    //     );
    //   } catch (error) {
    //     console.warn(
    //       "RAG search failed, continuing without knowledge base context:",
    //       error.message
    //     );
    //   }

      // Step 2: Generate contextual response
      console.log("Generating financial advice...");
      const response = await this.generateFinanceResponse(
        sessionId,
        userId,
        query,
        contextDocuments,
        chatModel
      );


      


       const processingTime = Date.now() - startTime;
        const chatHistory = await this.getChatHistory(sessionId, 10);
        console.log(`Chat history for session ${sessionId}:`, chatHistory);

      // Handle tool usage
      if ((chatHistory.length > 0)  &&  response.includes("TOOL:")) 
        {
        const toolResult = await this.handleFinanceTools(response, userId);

        // Add tool result to history
        await this.addToHistory(sessionId, "assistant", toolResult, {
          type: "tool_response",
          documentsFound: contextDocuments.length,
          processingTime: processingTime,
        });

        return {
          sessionId: sessionId,
          query: query,
          type: "tool_response",
          response: toolResult,
          contextDocuments: contextDocuments,
          metadata: {
            documentsFound: contextDocuments.length,
            processingTime: processingTime,
          },
        };
      } else {
        // Add response to history
        await this.addToHistory(sessionId, "assistant", response, {
          type: "advice",
          documentsFound: contextDocuments.length,
          processingTime: processingTime,
        });

        return {
          sessionId: sessionId,
          query: query,
          type: "advice",
          response: response,
          contextDocuments: contextDocuments,
          metadata: {
            documentsFound: contextDocuments.length,
            processingTime: processingTime,
          },
        };
      }
    } catch (error) {
      console.error("Error in finance chat session:", error);

      // Add error to history
      await this.addToHistory(sessionId, "system", `Error: ${error.message}`, {
        type: "error",
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Handle finance tools
   */
  async handleFinanceTools(response, userId) {
    const toolMatch = response.match(/TOOL:(\w+):({.*?})/);
    if (!toolMatch) return response;

    const [, toolName, toolParams] = toolMatch;

    try {
      const params = JSON.parse(toolParams);

      switch (toolName) {
        case "addExpense":
          return await this.addExpense(userId, params);
        case "addIncome":
          return await this.addIncome(userId, params);
        case "getTotalExpense":
          return await this.getTotalExpense(userId);
        case "getBalance":
          return await this.getBalance(userId);
        case "getExpensesByCategory":
          return await this.getExpensesByCategory(userId);
        case "getRecentTransactions":
          return await this.getRecentTransactions(userId);
        case "getBudgetAdvice":
          return await this.getBudgetAdvice(userId);
        case "getInvestmentSuggestions":
          return await this.getInvestmentSuggestions(userId);
        default:
          return `Unknown tool: ${toolName}`;
      }
    } catch (error) {
      return `Error using tool: ${error.message}`;
    }
  }

  // Finance tool methods
  async addExpense(userId, { name, amount }) {
    if (!this.db) await this.initializeDB();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "Invalid amount. Please enter a valid number.";

    const expense = {
      userId,
      name: name || "Expense",
      amount: numAmount,
      date: new Date(),
      type: "expense",
      category: this.categorizeExpense(name || "Expense"),
    };

    await this.db.collection("financial_transactions").insertOne(expense);
    return `✅ Added expense: ${name} - ₹${numAmount}`;
  }

  async addIncome(userId, { name, amount }) {
    if (!this.db) await this.initializeDB();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "Invalid amount. Please enter a valid number.";

    const income = {
      userId,
      name: name || "Income",
      amount: numAmount,
      date: new Date(),
      type: "income",
    };

    await this.db.collection("financial_transactions").insertOne(income);
    return `✅ Added income: ${name} - ₹${numAmount}`;
  }

  async getUserTransactions(userId, limit = 100) {
    if (!this.db) await this.initializeDB();

    return await this.db
      .collection("financial_transactions")
      .find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
  }

  async getTotalExpense(userId) {
    const transactions = await this.getUserTransactions(userId);
    const expenses = transactions.filter((t) => t.type === "expense");

    if (expenses.length === 0) return "No expenses recorded yet.";

    const total = expenses.reduce((acc, item) => acc + item.amount, 0);
    return `📊 Total expenses: ₹${total} (${expenses.length} transactions)`;
  }

  async getBalance(userId) {
    const transactions = await this.getUserTransactions(userId);
    const income = transactions.filter((t) => t.type === "income");
    const expenses = transactions.filter((t) => t.type === "expense");

    const totalIncome = income.reduce((acc, item) => acc + item.amount, 0);
    const totalExpense = expenses.reduce((acc, item) => acc + item.amount, 0);
    const balance = totalIncome - totalExpense;

    if (transactions.length === 0) return "No transactions recorded yet.";

    const status = balance >= 0 ? "✅" : "⚠️";
    return `${status} Balance: ₹${balance} | Income: ₹${totalIncome} | Expenses: ₹${totalExpense}`;
  }

  async getExpensesByCategory(userId) {
    const transactions = await this.getUserTransactions(userId);
    const expenses = transactions.filter((t) => t.type === "expense");

    if (expenses.length === 0) return "No expenses recorded yet.";

    const categories = {};
    expenses.forEach((expense) => {
      const category = expense.category || this.categorizeExpense(expense.name);
      if (!categories[category]) {
        categories[category] = { total: 0, count: 0 };
      }
      categories[category].total += expense.amount;
      categories[category].count += 1;
    });

    let result = "📋 Expenses by Category:\n\n";
    Object.entries(categories).forEach(([category, data]) => {
      result += `${category}: ₹${data.total} (${data.count} transactions)\n`;
    });

    return result;
  }

  async getRecentTransactions(userId, limit = 10) {
    const transactions = await this.getUserTransactions(userId, limit);

    if (transactions.length === 0) return "No transactions recorded yet.";

    let result = "🕒 Recent Transactions:\n\n";
    transactions.forEach((transaction, index) => {
      const date = new Date(transaction.date).toLocaleDateString();
      const emoji = transaction.type === "income" ? "💰" : "💸";
      const sign = transaction.type === "income" ? "+" : "-";
      result += `${index + 1}. ${emoji} ${transaction.name}: ${sign}₹${
        transaction.amount
      } (${date})\n`;
    });

    return result;
  }

  async getBudgetAdvice(userId) {
    const transactions = await this.getUserTransactions(userId);
    // Implementation for budget advice based on spending patterns
    return "💡 Based on your spending patterns, consider setting monthly budgets for your top expense categories.";
  }

  async getInvestmentSuggestions(userId) {
    // Implementation for investment suggestions based on balance and income
    return "📈 Consider investing in diversified mutual funds or SIPs based on your surplus income.";
  }

  /**
   * Add financial documents to knowledge base
   */
  async addFinancialDocuments(documents) {
    try {
      const points = [];

      for (const doc of documents) {
        const searchableContent = `
                    Title: ${doc.title || ""}
                    Content: ${doc.content || ""}
                    Category: ${doc.category || ""}
                    Tags: ${
                      Array.isArray(doc.tags)
                        ? doc.tags.join(", ")
                        : doc.tags || ""
                    }
                `.trim();

        const embedding = await this.embedText(searchableContent);

        points.push({
          id: doc.id || Math.random().toString(36).substr(2, 9),
          vector: embedding,
          payload: {
            content: searchableContent,
            documentData: doc,
            metadata: doc.metadata || {},
          },
        });
      }

      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: points,
      });

      console.log(
        `Added ${points.length} financial documents to collection ${this.collectionName}`
      );
    } catch (error) {
      console.error("Error adding financial documents:", error);
      throw error;
    }
  }
}

export default FinanceRAGAgent;
