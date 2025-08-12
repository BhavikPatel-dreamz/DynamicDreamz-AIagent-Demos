import MongoManager from "../Clients/MongoManager.js";
import GroqClient from "../Clients/GroqClient.js";
import QdrantManager from "../Clients/QdrantManager.js";
import JinaClient from "../Clients/JinaClient.js"
import path from 'path';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
  process.cwd(),
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
);

class PDFRAGAgent {

  constructor(config) {
    const {
      qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333',
      qdrantApiKey = process.env.QDRANT_API_KEY,
      jinaApiKey = process.env.JINA_API_KEY,
      groqApiKey = process.env.GROQ_API_KEY,
      collectionName = 'pdf-base',
      mongoUrl = 'mongodb://localhost:27017',
      mongoDbName = "PDF_assistant",
      maxHistoryLength = 20,
    } = config;

    // Initialize Qdrant client
    this.qdrantManager = new QdrantManager({
            url: qdrantUrl,
            apiKey: qdrantApiKey
        });
    this.jina = new JinaClient(jinaApiKey);
    // this.jinaApiKey = jinaApiKey;
    this.groqApiKey = groqApiKey;
    this.collectionName = collectionName;
    this.maxHistoryLength = maxHistoryLength;

    // MongoDB configuration
    this.mongoUrl = mongoUrl;
    this.mongoDbName = mongoDbName;
    this.mongoClient = null;
    this.db = null;
    this.groqClient = new GroqClient();
    this.dbPromise = new MongoManager({ dbName: mongoDbName }).connect();
    this.jinaEmbedUrl = 'https://api.jina.ai/v1/embeddings';
    this.groqChatUrl = 'https://api.groq.com/openai/v1/chat/completions';
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


  async uploadPdf(userId, file) {
    try {
      await this.initializeDB();
      const uploadStatus = new Map();

      const updateStatus = (userId, status, progress = 0, message = "", data = null) => {
        const statusObj = {
          status,
          progress,
          message,
          data,
          timestamp: new Date()
        };
        uploadStatus.set(userId, statusObj);
        console.log(`Status Update [${userId}]: ${status} - ${progress}% - ${message}`);
      };

      // 1️⃣ Validate file
      if (!file) {
        updateStatus(userId, "error", 0, "No file uploaded");
        throw new Error("No file uploaded");
      }

      if (file.type !== "application/pdf") {
        updateStatus(userId, "error", 0, "Invalid file type. Only PDFs are allowed");
        throw new Error("Invalid file type. Only PDFs are allowed");
      }

      if (file.size === 0) {
        updateStatus(userId, "error", 0, "Uploaded file is empty");
        throw new Error("Uploaded file is empty");
      }

      // 2️⃣ Convert to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 5️⃣ Extract text using pdfjs-dist
      const uint8Array = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDoc = await loadingTask.promise;

      let fullText = "";
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n";
      }
 
      let embeddingData = await this.jina.embedText(fullText, "jina-embeddings-v2-base-en");
     

    // Save in MongoDB
      const pdfRecord = await this.db.collection("pdf-base").insertOne({
        filename: file.name,
        originalname: file.name,
        size: file.size,
        mimetype: file.type,
        createdAt: new Date(),
        userId,
        pdfText: fullText
      });

      const points = [
        {
          
          vector: embeddingData,
          payload: {
            userId,
            filename: file.name,
            text: fullText
          }
        }
      ];
     
      await this.qdrantManager.addDocuments('pdf-base', points);
     
      return {
        success: true,
        message: "PDF uploaded successfully",
        documentId: pdfRecord.insertedId,
        fileUrl: publicUrl,
        userId
      };

    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }

}


export default PDFRAGAgent;


