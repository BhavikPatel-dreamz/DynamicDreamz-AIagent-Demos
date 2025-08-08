// Final Fixed FinanceRAGAgent.js (Enhanced Prompt: includes historyContext)
import MongoManager from "../Clients/MongoManager.js";
import GroqClient from "../Clients/GroqClient.js";

class FinanceRAGAgent {
  constructor(config) {
    const {
      mongoDbName = "finance_assistant",
      maxHistoryLength = 20,
    } = config;

    this.groqClient = new GroqClient();
    this.maxHistoryLength = maxHistoryLength;
    this.dbPromise = new MongoManager({ dbName: mongoDbName }).connect();
    this.db = null;
  }

  async initializeDB() {
    if (!this.db) {
      try {
        this.db = await this.dbPromise;
        console.log("Database connection established");
        const collections = await this.db.listCollections().toArray();
        console.log("Available collections:", collections.map(c => c.name));
      } catch (error) {
        console.error("Error initializing database:", error);
        throw error;
      }
    }
  }

  async createChatSession(userId) {
    await this.initializeDB();
    const session = await this.db.collection("chat_sessions").findOne({ userId });
    if (!session) {
      const sessionId = `finance_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.db.collection("chat_sessions").insertOne({
        sessionId,
        userId,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        type: "finance",
        status: "active",
      });
    } else {
      await this.db.collection("chat_sessions").updateOne(
        { userId },
        { $set: { lastActivity: new Date() } }
      );
    }
  }

  async addToHistory(userId, role, content, metadata = {}) {
    await this.initializeDB();
    await this.db.collection("chat_messages").insertOne({
      userId,
      role,
      content,
      timestamp: new Date(),
      metadata,
    });
    await this.db.collection("chat_sessions").updateOne(
      { userId },
      { $inc: { messageCount: 1 }, $set: { lastActivity: new Date() } }
    );
    await this.cleanupOldMessages(userId);
  }

  async getChatHistory(userId, limit = this.maxHistoryLength) {
    await this.initializeDB();
    return this.db
      .collection("chat_messages")
      .find({ userId })
      .sort({ timestamp: 1 })
      .limit(limit)
      .toArray();
  }

  async cleanupOldMessages(userId) {
    const count = await this.db.collection("chat_messages").countDocuments({ userId });
    if (count > this.maxHistoryLength) {
      const old = await this.db.collection("chat_messages")
        .find({ userId })
        .sort({ timestamp: 1 })
        .limit(count - this.maxHistoryLength)
        .toArray();
      const ids = old.map((m) => m._id);
      await this.db.collection("chat_messages").deleteMany({ _id: { $in: ids } });
    }
  }

  async chatWithFinanceHistory(userId, query) {
    await this.createChatSession(userId);
    await this.addToHistory(userId, "user", query);

    const financialContext = await this.getFinancialContext(userId);
    const chatHistory = await this.getChatHistory(userId);

    const historyContext = chatHistory.length > 0
      ? chatHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")
      : "No previous conversation history.";

    const systemPrompt = `
You are Bhavik Patel, a helpful personal finance assistant.

When you need to use a tool, respond with EXACTLY ONE line in this format:
TOOL:<tool_name>:<JSON_arguments>
Example: TOOL:addIncome:{"name":"salary","amount":50000}

Never output more than one TOOL line per message. If you do not need a tool, do not output any TOOL line.

If the user mentions earning or receiving money, use TOOL:addIncome.
If the user mentions spending or paying, use TOOL:addExpense.

Do not output malformed TOOL lines. Only output valid JSON.

Guidelines:
- Provide personalized financial advice based on user's transaction history.
- Use RAG context to provide accurate financial information.
- Give specific advice based on spending patterns and categories.
- Alert about overspending in certain categories.
- Suggest budgeting and investment strategies.
- Keep responses helpful and educational.
- Reference previous conversation context when relevant`;

    const userPrompt = `Previous conversation:\n${historyContext}\n\nCurrent question: ${query}\n\nProvide helpful financial advice, answer the question using available context, and suggest tools if needed.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const result = await this.groqClient.chat(messages);

    // Find all tool calls in the response
    const toolMatches = [...result.matchAll(/TOOL:(\w+):(\{[^}]*\})/g)];
    let toolOutput = null;

    // Process each tool call
    for (const match of toolMatches) {
      const tool = match[1];
      const json = match[2];
      let args = {};
      try {
        args = JSON.parse(json);
      } catch (e) {
        // If JSON parsing fails, try to extract name and amount manually
        const nameMatch = json.match(/"name"\s*:\s*"([^"]+)"/);
        const amountMatch = json.match(/"amount"\s*:\s*([\d.]+)/);
        if (nameMatch && amountMatch) {
          args = { name: nameMatch[1], amount: parseFloat(amountMatch[1]) };
        }
      }

      let currentToolOutput = null;
      if (tool === "addExpense") {
        currentToolOutput = await this.addExpense(userId, args);
      } else if (tool === "addIncome") {
        currentToolOutput = await this.addIncome(userId, args);
      } else if (tool === "getTotalExpense") {
        currentToolOutput = await this.getTotalExpense(userId);
      } else if (tool === "getBalance") {
        currentToolOutput = await this.getBalance(userId);
      } else if (tool === "getExpensesByCategory") {
        currentToolOutput = await this.getExpensesByCategory(userId);
      } else if (tool === "getRecentTransactions") {
        currentToolOutput = await this.getRecentTransactions(userId);
      } else if (tool === "getBudgetAdvice") {
        currentToolOutput = await this.getBudgetAdvice(userId);
      } else if (tool === "getInvestmentSuggestions") {
        currentToolOutput = await this.getInvestmentSuggestions(userId);
      }

      // Only keep the first tool output for user display
      if (!toolOutput) {
        toolOutput = currentToolOutput;
      }
    }

    // Remove TOOL lines from the AI response for the user
    const userVisibleResponse = result
      .split('\n')
      .filter(line => !line.trim().startsWith('TOOL:'))
      .join('\n')
      .trim();

    await this.addToHistory(userId, "assistant", userVisibleResponse);
    if (toolOutput) await this.addToHistory(userId, "assistant", toolOutput, { type: "tool_execution" });

    return { response: userVisibleResponse, toolResult: toolOutput };
  }

  async getFinancialContext(userId) {
    const txns = await this.getUserTransactions(userId);
    const income = txns.filter(t => t.type === "income");
    const expenses = txns.filter(t => t.type === "expense");
    const totalIncome = income.reduce((a, b) => a + b.amount, 0);
    const totalExpenses = expenses.reduce((a, b) => a + b.amount, 0);
    const balance = totalIncome - totalExpenses;

    let out = `Balance: ₹${balance}\nIncome: ₹${totalIncome} | Expenses: ₹${totalExpenses}`;
    return out;
  }

  async getUserTransactions(userId, limit = 100) {
    await this.initializeDB();
    try {
      const collections = await this.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      if (!collectionNames.includes("financial_transactions")) {
        await this.db.createCollection("financial_transactions");
        return [];
      }
      const transactions = await this.db
        .collection("financial_transactions")
        .find({ userId })
        .sort({ date: -1 })
        .limit(limit)
        .toArray();
      return transactions;
    } catch (error) {
      return [];
    }
  }

  async addExpense(userId, { name, amount }) {
    await this.initializeDB();
    const amt = parseFloat(amount);
    if (isNaN(amt)) return "Invalid amount.";
    try {
      const collections = await this.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      if (!collectionNames.includes("financial_transactions")) {
        await this.db.createCollection("financial_transactions");
      }
      await this.db.collection("financial_transactions").insertOne({
        userId,
        name,
        amount: amt,
        type: "expense",
        date: new Date(),
      });
      return `✅ Expense recorded: ₹${amt} - ${name}`;
    } catch (error) {
      return "Error recording expense.";
    }
  }

  async addIncome(userId, { name, amount }) {
    await this.initializeDB();
    const amt = parseFloat(amount);
    if (isNaN(amt)) return "Invalid amount.";
    try {
      const collections = await this.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      if (!collectionNames.includes("financial_transactions")) {
        await this.db.createCollection("financial_transactions");
      }
      await this.db.collection("financial_transactions").insertOne({
        userId,
        name,
        amount: amt,
        type: "income",
        date: new Date(),
      });
      return `✅ Income recorded: ₹${amt} - ${name}`;
    } catch (error) {
      return "Error recording income.";
    }
  }

  async getTotalExpense(userId) {
    const txns = await this.getUserTransactions(userId);
    const expenses = txns.filter(t => t.type === "expense");
    const total = expenses.reduce((a, b) => a + b.amount, 0);
    return `Total expenses: ₹${total}`;
  }

  async getBalance(userId) {
    const txns = await this.getUserTransactions(userId);
    const income = txns.filter(t => t.type === "income");
    const expenses = txns.filter(t => t.type === "expense");
    const totalIncome = income.reduce((a, b) => a + b.amount, 0);
    const totalExpenses = expenses.reduce((a, b) => a + b.amount, 0);
    const balance = totalIncome - totalExpenses;
    return `Current balance: ₹${balance}`;
  }

  async getExpensesByCategory(userId) {
    const txns = await this.getUserTransactions(userId);
    const expenses = txns.filter(t => t.type === "expense");
    const categoryTotals = {};
    expenses.forEach(expense => {
      const category = expense.category || "Uncategorized";
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += expense.amount;
    });
    let result = "Expenses by category:\n";
    for (const [category, total] of Object.entries(categoryTotals)) {
      result += `${category}: ₹${total}\n`;
    }
    return result.trim();
  }

  async getRecentTransactions(userId, limit = 5) {
    const txns = await this.getUserTransactions(userId);
    const recent = txns.slice(0, limit);
    let result = "Recent transactions:\n";
    recent.forEach(txn => {
      const type = txn.type === "income" ? "Income" : "Expense";
      result += `${type}: ${txn.name} - ₹${txn.amount}\n`;
    });
    return result.trim();
  }

  async getBudgetAdvice(userId) {
    const txns = await this.getUserTransactions(userId);
    const income = txns.filter(t => t.type === "income");
    const expenses = txns.filter(t => t.type === "expense");
    const totalIncome = income.reduce((a, b) => a + b.amount, 0);
    const totalExpenses = expenses.reduce((a, b) => a + b.amount, 0);
    if (totalIncome === 0) {
      return "No income recorded yet. Please add some income to get personalized budget advice.";
    }
    const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
    let advice = `Your current savings rate is ${savingsRate.toFixed(2)}%.\n`;
    if (savingsRate < 10) {
      advice += "Consider reducing expenses or increasing income to improve your savings rate.";
    } else if (savingsRate < 20) {
      advice += "Good job! Try to increase your savings rate to 20% for better financial health.";
    } else {
      advice += "Excellent! You're maintaining a healthy savings rate.";
    }
    return advice;
  }

  async getInvestmentSuggestions(userId) {
    const txns = await this.getUserTransactions(userId);
    const income = txns.filter(t => t.type === "income");
    const expenses = txns.filter(t => t.type === "expense");
    const balance = income.reduce((a, b) => a + b.amount, 0) - expenses.reduce((a, b) => a + b.amount, 0);
    if (balance < 1000) {
      return "Your balance is low. Focus on building an emergency fund before considering investments.";
    }
    let suggestions = "Investment suggestions based on your balance:\n";
    suggestions += "- Consider a high-yield savings account for your emergency fund\n";
    suggestions += "- Look into index funds for long-term growth\n";
    suggestions += "- Consider diversifying with bonds or other assets";
    return suggestions;
  }
}

export default FinanceRAGAgent;


