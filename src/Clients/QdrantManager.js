import 'dotenv/config';
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";

/**
 * Qdrant Vector Database Client with Enhanced Filtering
 */
class QdrantManager {
  constructor(config = {}) {
    const {
      url = process.env.QDRANT_URL || "http://localhost:6333",
      apiKey = process.env.QDRANT_API_KEY || null,
      timeout = 30000,
    } = config;

    this.client = new QdrantClient({
      url: url,
      apiKey: apiKey,
      timeout: timeout,
    });

    this.url = url;
    this.apiKey = apiKey;
  }

  /**
   * Create a new collection
   * @param {string} collectionName - Name of the collection
   * @param {Object} config - Collection configuration
   */
  async createCollection(collectionName, config = {}) {
    const {
      vectorSize = 768,
      distance = "Cosine",
      onDiskPayload = true,
      hnswConfig = null,
      quantizationConfig = null,
    } = config;

    try {
      const collectionConfig = {
        vectors: {
          size: vectorSize,
          distance: distance,
          on_disk: onDiskPayload,
        },
      };

      // Add optional HNSW configuration
      if (hnswConfig) {
        collectionConfig.hnsw_config = hnswConfig;
      }

      // Add optional quantization configuration
      if (quantizationConfig) {
        collectionConfig.quantization_config = quantizationConfig;
      }

      await this.client.createCollection(collectionName, collectionConfig);

      console.log(`✅ Created collection: ${collectionName}`);
      return true;
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log(`⚠️ Collection ${collectionName} already exists`);
        return true;
      }
      console.error("Error creating collection:", error);
      throw error;
    }
  }

  /**
   * Check if collection exists
   * @param {string} collectionName - Name of the collection
   * @returns {Promise<boolean>} Whether collection exists
   */
  async collectionExists(collectionName) {
    try {
      await this.client.getCollection(collectionName);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add documents to collection with enhanced payload structure
   * @param {string} collectionName - Name of the collection
   * @param {Array} documents - Array of document objects
   * @returns {Promise<Array>} Operation results
   */
  async addDocuments(collectionName, documents) {
    try {
      const points = documents.map(doc => ({
        id: doc.id || uuidv4(), // Generate a new UUID if no ID is provided
        vector: doc.vector,
        payload: doc.payload || {}
      }));


      const result = await this.client.upsert(collectionName, {
        wait: true,
        points: points
      });

      console.log(`✅ Added ${points.length} documents to ${collectionName}`);
      return result;
    } catch (error) {
      console.error('Error adding documents:', error);
      throw error;
    }
  }

  /**
   * Search for similar vectors with enhanced filtering options
   * @param {string} collectionName - Name of the collection
   * @param {Array} queryVector - Query vector
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async search(collectionName, queryVector, options = {}) {
    const {
      limit = 5,
      scoreThreshold = 0.6,
      withPayload = true,
      withVector = true,
      filter = null,
      offset = 0,
    } = options;

    try {
      const searchParams = {
        vector: queryVector,
        limit: limit,
        offset: offset,
        with_payload: withPayload,
        with_vector: withVector,
      };

      // Add score threshold if specified
      if (scoreThreshold > 0) {
        searchParams.score_threshold = scoreThreshold;
      }

      // Add filter if specified
      if (filter) {
        searchParams.filter = filter;
      }



      const searchResult = await this.client.search(
        collectionName,
        searchParams
      );

      console.log(`✅ Found ${searchResult.length} results in ${searchResult}`);

      return searchResult.map((result) => ({
        id: result.id,
        score: result.score,
        payload: result.payload || {},
        vector: result.vector || null,
      }));
    } catch (error) {
      console.error("Error searching collection:", error);
      throw error;
    }
  }

  /**
   * Search by userID - convenience method for filtering by user
   * @param {string} collectionName - Name of the collection
   * @param {Array} queryVector - Query vector
   * @param {string} userID - User ID to filter by
   * @param {Object} options - Additional search options
   * @returns {Promise<Array>} Search results filtered by userID
   */
  async searchByUserID(collectionName, queryVector, userID, options = {}) {
    const filter = {
      must: [
        {
          key: "userId",
          match: {
            value: userID,
          },
        },
      ],
    };

    // Merge with existing filter if provided
    if (options.filter) {
      if (options.filter.must) {
        filter.must = [...filter.must, ...options.filter.must];
      }
      if (options.filter.should) {
        filter.should = options.filter.should;
      }
      if (options.filter.must_not) {
        filter.must_not = options.filter.must_not;
      }
    }

    console.log(`🔍 Searching collection ${collectionName} for userID: ${userID}`)
    console.log(`Filter: ${JSON.stringify(filter)}`);

    return this.search(collectionName, queryVector, {
      ...options,
      filter: filter,
    });
  }

  /**
   * Search with multiple userIDs
   * @param {string} collectionName - Name of the collection
   * @param {Array} queryVector - Query vector
   * @param {Array} userIDs - Array of user IDs to filter by
   * @param {Object} options - Additional search options
   * @returns {Promise<Array>} Search results filtered by userIDs
   */
  async searchByMultipleUserIDs(
    collectionName,
    queryVector,
    userIDs,
    options = {}
  ) {
    const filter = {
      must: [
        {
          key: "userId",
          match: {
            any: userIDs,
          },
        },
      ],
    };

    return this.search(collectionName, queryVector, {
      ...options,
      filter: filter,
    });
  }

  /**
   * Get all documents for a specific user
   * @param {string} collectionName - Name of the collection
   * @param {string} userID - User ID to filter by
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} All documents for the user
   */
  async getDocumentsByUserID(collectionName, userID, options = {}) {
    const {
      limit = 100,
      offset = 0,
      withPayload = true,
      withVector = false,
    } = options;

    try {
      const filter = {
        must: [
          {
            key: "userId",
            match: {
              value: userID,
            },
          },
        ],
      };

      const result = await this.client.scroll(collectionName, {
        filter: filter,
        limit: limit,
        offset: offset,
        with_payload: withPayload,
        with_vector: withVector,
      });

      return result.points.map((point) => ({
        id: point.id,
        payload: point.payload || {},
        vector: point.vector || null,
      }));
    } catch (error) {
      console.error("Error getting documents by userID:", error);
      throw error;
    }
  }

  /**
   * Delete documents by userID
   * @param {string} collectionName - Name of the collection
   * @param {string} userID - User ID to delete documents for
   */
  async deleteDocumentsByUserID(collectionName, userID) {
    try {
      const filter = {
        must: [
          {
            key: "userId",
            match: {
              value: userID,
            },
          },
        ],
      };

      const result = await this.client.delete(collectionName, {
        filter: filter,
        wait: true,
      });

      console.log(
        `✅ Deleted documents for userID ${userID} from ${collectionName}`
      );
      return result;
    } catch (error) {
      console.error("Error deleting documents by userID:", error);
      throw error;
    }
  }

  /**
 * Get all documents for a specific user
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Additional options
 */
  async deleteByFilter(collectionName, filter) {
    try {
      console.log("Delete filter:", JSON.stringify(filter, null, 2));
      const result = await this.client.delete(collectionName, {
        filter: filter,
        wait: true,
      });

      console.log(
        `✅ Deleted documents for userID `
      );
      return result;
    } catch (error) {
      console.log(error.message)
      console.error("Error deleting documents by userID:", error);
      throw error;
    }
  }
  /**
   * Delete documents from collection by IDs
   * @param {string} collectionName - Name of the collection
   * @param {Array} ids - Array of document IDs to delete
   */
  async deleteDocuments(collectionName, ids) {
    try {
     
      await this.client.delete(collectionName, {
        points:ids,
        wait: true,
      });
       console.log(`✅ Deleted ${ids} documents from ${collectionName}`);

    } catch (error) {
      console.error("Error deleting documents:", error);
      throw error;
    }
  }

  /**
   * Update document payload
   * @param {string} collectionName - Name of the collection
   * @param {string} documentId - Document ID to update
   * @param {Object} newPayload - New payload data
   */
  async updateDocumentPayload(collectionName, documentId, newPayload) {
    try {
      await this.client.setPayload(collectionName, {
        payload: newPayload,
        points: [documentId],
        wait: true,
      });

      console.log(`✅ Updated payload for document ${documentId}`);
    } catch (error) {
      console.error("Error updating document payload:", error);
      throw error;
    }
  }

  /**
   * Get collection info
   * @param {string} collectionName - Name of the collection
   */
  async getCollectionInfo(collectionName) {
    try {
      return await this.client.getCollection(collectionName);
    } catch (error) {
      console.error("Error getting collection info:", error);
      throw error;
    }
  }

  /**
   * List all collections
   */
  async listCollections() {
    try {
      const result = await this.client.getCollections();
      return result.collections;
    } catch (error) {
      console.error("Error listing collections:", error);
      throw error;
    }
  }

  /**
   * Count documents in collection
   * @param {string} collectionName - Name of the collection
   * @param {Object} filter - Optional filter
   */
  async countDocuments(collectionName, filter = null) {
    try {
      const result = await this.client.count(collectionName, {
        filter: filter,
        exact: true,
      });
      return result.count;
    } catch (error) {
      console.error("Error counting documents:", error);
      throw error;
    }
  }

  /**
   * Create index for better filtering performance
   * @param {string} collectionName - Name of the collection
   * @param {string} fieldName - Field name to index
   * @param {string} fieldType - Field type (keyword, integer, float, geo, text)
   */
  async createPayloadIndex(collectionName, fieldName, fieldType = "keyword") {
    try {
      await this.client.createPayloadIndex(collectionName, {
        field_name: fieldName,
        field_type: fieldType,
      });

      console.log(
        `✅ Created index for field ${fieldName} in ${collectionName}`
      );
    } catch (error) {
      console.error("Error creating payload index:", error);
      throw error;
    }
  }
}

export default QdrantManager;
