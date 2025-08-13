import GroqClient from "../Clients/GroqClient.js";
import QdrantManager from "../Clients/QdrantManager.js";
import JinaClient from "../Clients/JinaClient.js";
import MongoManager from "../Clients/MongoManager.js";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
  process.cwd(),
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
);

class PDFRAGAgent {
  constructor(config) {
    const {
      mongoDbName = "Pdf_based_chat_history",
      collectionName = "pdf-base",
      maxHistoryLength = 20,
      chunkSize = 1000,
      chunkOverlap = 200,
      maxContextLength = 4000,
      similarityThreshold = 0.7,
    } = config;

    // Initialize clients
    this.qdrantManager = new QdrantManager();
    this.jina = new JinaClient();
    this.groqClient = new GroqClient();
    this.mongoDbName = mongoDbName;
     this.dbPromise = new MongoManager({ dbName: 'Pdf_based_chat_history' }).connect();
    this.db = null;

    this.collectionName = collectionName;
    this.maxHistoryLength = maxHistoryLength;
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.maxContextLength = maxContextLength;
    this.similarityThreshold = similarityThreshold;
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
  /**
   * Close MongoDB connection
   */
  async closeDB() {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }

  // Text chunking utility
  chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      if (chunk.trim()) {
        chunks.push({
          text: chunk.trim(),
          startIndex: i,
          endIndex: Math.min(i + chunkSize, words.length),
        });
      }
    }

    return chunks;
  }

  async uploadPdf(userId, files) {
    try {
      // Convert single file to array
      const fileList = Array.isArray(files) ? files : [files];

      // 🚀 NEW: Validate maximum number of files (3 max)
      if (fileList.length > 3) {
        throw new Error("Maximum 3 files allowed per upload");
      }

      const results = [];
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

      for (const file of fileList) {

        // 1️⃣ Validate file
        if (!file) {
          throw new Error("No file uploaded");
        }

        if (file.type !== "application/pdf") {
          throw new Error("Invalid file type. Only PDFs are allowed");
        }

        if (file.size === 0) {
          throw new Error("Uploaded file is empty");
        }

        // 🚀 NEW: Validate file size (10MB max)
        if (file.size > MAX_FILE_SIZE) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          throw new Error(`File "${file.name}" is too large (${fileSizeMB}MB). Maximum size allowed is 10MB`);
        }


        // 2️⃣ Convert to buffer and extract text
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdfDoc = await loadingTask.promise;

        let fullText = "";
        const pageTexts = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
          pageTexts.push({ pageNumber: i, text: pageText });
          fullText += pageText + "\n";
        }

        // 3️⃣ Create chunks
        const chunks = this.chunkText(
          fullText,
          this.chunkSize,
          this.chunkOverlap
        );

        // 4️⃣ Generate embeddings for each chunk
        const points = [];
        for (let i = 0; i < chunks.length; i++) {
          const embeddingData = await this.jina.embedText(
            chunks[i].text,
            "jina-embeddings-v2-base-en"
          );

          points.push({
            vector: embeddingData,
            payload: {
              userId,
              filename: file.name,
              text: chunks[i].text,
              chunkIndex: i,
              totalChunks: chunks.length,
              startIndex: chunks[i].startIndex,
              endIndex: chunks[i].endIndex,
              uploadedAt: new Date().toISOString(),
            },
          });
        }

        // 5️⃣ Store in Qdrant
        await this.qdrantManager.addDocuments(this.collectionName, points);

        results.push({
          success: true,
          message: `${file.name} uploaded successfully`,
          filename: file.name,
          userId,
          totalChunks: chunks.length,
          totalPages: pdfDoc.numPages,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        });
      }

      return results.length === 1 ? results[0] : results;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }


  async getChatHistory(userId, conversationId = null, limit = 10) {
  if (!this.db) await this.initializeDB();

  try {
    const filter = { userId };
    if (conversationId) {
      filter.conversationId = conversationId;
    }

    const history = await this.db
      .collection("Pdf_based_chat_history")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    console.log(history);
    return history.reverse(); // chronological order
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
}

  async saveChatMessage(
    userId,
    conversationId,
    message,
    response,
    searchResults = []
  ) {
    if (!this.db) await this.initializeDB();
    try {
     const test= await this.db.collection("Pdf_based_chat_history").insertOne({
        userId,
        conversationId,
        message,
        response,
        searchResults: searchResults.map((r) => ({
          filename: r.payload?.filename,
          text: r.payload?.text?.substring(0, 200) + "...",
          score: r.score,
          chunkIndex: r.payload?.chunkIndex,
        })),
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Error saving chat message:", error);
    }
  }

  formatChatHistory(history) {
    return history
      .map((chat) => `Human: ${chat.message}\nAssistant: ${chat.response}`)
      .join("\n\n");
  }

  async chatMessage(userId, query, conversationId = null) {
    try {

      const chatHistory = await this.getChatHistory(
        userId,
        conversationId,
        this.maxHistoryLength
      );
      const formattedHistory = this.formatChatHistory(chatHistory);

      // 2️⃣ Generate embeddings for the query
      const embeddingData = await this.jina.embedText(
        query,
        "jina-embeddings-v2-base-en"
      );

      // 3️⃣ Search relevant documents
      const searchResults = await this.qdrantManager.searchByUserID(
        this.collectionName,
        embeddingData,
        userId,
        10 // Get top 10 results
      );

      // 4️⃣ Filter results by similarity threshold
      const relevantResults = searchResults.filter(
        (result) => result.score >= this.similarityThreshold
      );

      if (relevantResults.length === 0) {
        const noResultsResponse =
          "I couldn't find relevant information in your uploaded PDFs to answer this question. Could you try rephrasing your question or upload more relevant documents?";

        // Save to chat history
          if (userId) {
          await this.saveChatMessage(
            userId,
            conversationId,
            query,
            noResultsResponse,
            []
          );
          }

        return {
          success: true,
          userId,
          query,
          answer: noResultsResponse,
          searchResultsCount: 0,
          sources: [],
        };
      }

      // 5️⃣ Build context from relevant chunks
      let context = "";
      let currentLength = 0;
      const usedSources = new Set();

      for (const result of relevantResults) {
        const chunkText = result.payload.text;
        if (currentLength + chunkText.length <= this.maxContextLength) {
          context += `Source: ${result.payload.filename} (Chunk ${result.payload.chunkIndex + 1
            })\n${chunkText}\n\n`;
          currentLength += chunkText.length;
          usedSources.add(result.payload.filename);
        } else {
          break;
        }
      }

      // 6️⃣ Build prompt for Groq
      const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided PDF documents. 
      
      Instructions:
      - Answer the user's question using ONLY the information provided in the context
      - If the context doesn't contain enough information to answer the question, say so clearly
      - Always cite the source documents when providing information
      - Be concise and accurate
      - If there's conflicting information in different sources, mention this
      
      Context from PDF documents:
      ${context}
      
      ${formattedHistory
          ? `Previous conversation history:\n${formattedHistory}\n\n`
          : ""
        }`;

      const userPrompt = `Question: ${query}`;

      // 7️⃣ Generate answer using Groq
      const groqResponse = await this.groqClient.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      const answer =
        groqResponse ||
        "I apologize, but I couldn't generate a response. Please try again.";

      // 8️⃣ Save to chat history
        if (userId) {
        await this.saveChatMessage(
          userId,
          conversationId,
          query,
          answer,
          relevantResults
        );
       }

      // 9️⃣ Return response
      return {
        success: true,
        userId,
        query,
        answer,
        searchResultsCount: relevantResults.length,
        sources: Array.from(usedSources),
        relevantChunks: relevantResults.map((r) => ({
          filename: r.payload.filename,
          chunkIndex: r.payload.chunkIndex + 1,
          score: r.score,
          preview: r.payload.text.substring(0, 150) + "...",
        })),
      };
    } catch (error) {
      console.error("Chat message error:", error);
      throw new Error(`Failed to process chat message: ${error.message}`);
    }
  }

  async getPdfList(userId) {
    try {
      const response = await this.qdrantManager.getDocumentsByUserID(
        "pdf-base",
        userId
      );

      return {
        success: true,
        response,
      };
    } catch (error) {
      console.error("Error fetching PDF list:", error);
      throw new Error("Failed to fetch PDF list");
    }
  }

  async deletePdf(ids) {
    try {
      // Delete from Qdrant
      console.log(ids)
      await this.qdrantManager.deleteDocuments(
        "pdf-base",
        ids
      );
      return {
        success: true,
        message: `${ids.length} document(s) with IDs [${ids.join(', ')}] deleted successfully`,
        deletedIds: ids,
        count: ids.length
      };
    } catch (error) {
      console.error("Error deleting PDF:", error);
      throw new Error(`Failed to delete PDF(s): ${error.message}`);
    }
  }


  async getChatSessions(userId) {
    try {
      const sessions = await this.db.collection("Pdf_based_chat_history").aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$conversationId",
            lastMessage: { $last: "$message" },
            lastResponse: { $last: "$response" },
            messageCount: { $sum: 1 },
            lastUpdated: { $max: "$createdAt" },
            firstMessage: { $first: "$createdAt" },
          },
        },
        { $sort: { lastUpdated: -1 } },
      ]
      );

      return {
        success: true,
        sessions,
      };
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      return { success: false, sessions: [] };
    }
  }

  async searchPdfs(userId, searchQuery, limit = 5) {
    try {
      const embeddingData = await this.jina.embedText(
        searchQuery,
        "jina-embeddings-v2-base-en"
      );
      const searchResults = await this.qdrantManager.searchByUserID(
        this.collectionName,
        embeddingData,
        userId,
        limit
      );

      return {
        success: true,
        query: searchQuery,
        results: searchResults.map((result) => ({
          filename: result.payload.filename,
          text: result.payload.text,
          score: result.score,
          chunkIndex: result.payload.chunkIndex,
        })),
      };
    } catch (error) {
      console.error("Search error:", error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }
}

export default PDFRAGAgent;
