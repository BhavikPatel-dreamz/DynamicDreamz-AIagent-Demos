import { MongoClient, Db, Collection } from 'mongodb';

class MongoDB {
  private client: MongoClient;
  private db: Db | null = null;

  constructor() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-agent-demo';
    this.client = new MongoClient(uri);
  }

  async connect(): Promise<void> {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db();
      console.log('✅ MongoDB connected');
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.db = null;
      console.log('❌ MongoDB disconnected');
    }
  }

  getDatabase(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  getCollection(name: string): Collection {
    return this.getDatabase().collection(name);
  }

  async insertData(collection: string, data: any): Promise<any> {
    await this.connect();
    const result = await this.getCollection(collection).insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return result;
  }

  async findData(collection: string, query: any = {}, options: any = {}): Promise<any[]> {
    await this.connect();
    const cursor = this.getCollection(collection).find(query, options);
    return await cursor.toArray();
  }

  async updateData(collection: string, filter: any, update: any): Promise<any> {
    await this.connect();
    const result = await this.getCollection(collection).updateMany(filter, {
      $set: { ...update, updatedAt: new Date() }
    });
    return result;
  }

  async aggregateData(collection: string, pipeline: any[]): Promise<any[]> {
    await this.connect();
    const cursor = this.getCollection(collection).aggregate(pipeline);
    return await cursor.toArray();
  }

  async deleteData(collection: string, filter: any): Promise<any> {
    await this.connect();
    const result = await this.getCollection(collection).deleteMany(filter);
    return result;
  }
}

export const mongodb = new MongoDB(); 