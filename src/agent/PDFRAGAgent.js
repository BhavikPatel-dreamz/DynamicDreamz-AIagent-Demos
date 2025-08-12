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
  
      groqApiKey = process.env.GROQ_API_KEY,
      collectionName = 'pdf-base',
      maxHistoryLength = 20,
    } = config;

    // Initialize Qdrant client
    this.qdrantManager = new QdrantManager();
    this.jina = new JinaClient();
    // this.jinaApiKey = jinaApiKey;
    this.groqApiKey = groqApiKey;
    this.collectionName = collectionName;
    this.maxHistoryLength = maxHistoryLength;

    // MongoDB configuration
    this.groqClient = new GroqClient();
  
  }

async uploadPdf(userId, files) {
  try {
    const uploadStatus = new Map();
    const updateStatus = (uid, status, progress = 0, message = "", data = null) => {
      const statusObj = {
        status,
        progress,
        message,
        data,
        timestamp: new Date()
      };
      uploadStatus.set(uid, statusObj);
      console.log(`Status Update [${uid}]: ${status} - ${progress}% - ${message}`);
    };

    // Convert single file to array
    const fileList = Array.isArray(files) ? files : [files];
    const results = [];

    for (const file of fileList) {
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

      // 3️⃣ Extract text using pdfjs-dist
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

      // 4️⃣ Get embeddings
      const embeddingData = await this.jina.embedText(fullText, "jina-embeddings-v2-base-en");

      const points = [{
        vector: embeddingData,
        payload: {
          userId,
          filename: file.name,
          text: fullText
        }
      }];

      await this.qdrantManager.addDocuments('pdf-base', points);

      results.push({
        success: true,
        message: `${file.name} uploaded successfully`,
        filename: file.name,
        userId
      });
    }

    return results.length === 1 ? results[0] : results;

  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

  async chatMessage(userId, query) {
    console.log(`🔍 Search request for userId: ${userId}`);

    // Generate embeddings
    let embeddingData = await this.jina.embedText(query, "jina-embeddings-v2-base-en");
   // Search
    const searchResults = await this.qdrantManager.searchByUserID('pdf-base', embeddingData,userId );

    return {
      success: true,
      userId,
      searchResultsReturned: searchResults.length,
      results: searchResults
    };
  }
 async getPdfList(userId) {
  try {
    
    const response = await this.qdrantManager.getDocumentsByUserId('pdf-base',userId);

    return {
      success: true,
      response
    };
  } catch (error) {
    console.error("Error fetching PDF list:", error);
    throw new Error("Failed to fetch PDF list");
  }
}

}


export default PDFRAGAgent;


