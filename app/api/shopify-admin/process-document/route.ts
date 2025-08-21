import { NextRequest, NextResponse } from 'next/server';
import MongoManager from '../../../../src/Clients/MongoManager';
import GroqClient from '../../../../src/Clients/GroqClient';
import QdrantManager from '../../../../src/Clients/QdrantManager';
import JinaClient from '../../../../src/Clients/JinaClient';
import { v4 as uuidv4 } from 'uuid';

const PARSING_PROMPT = `
You are an AI assistant that extracts structured data from unstructured project and quote documents. 
Your task is to parse the provided text and extract relevant information about projects and quotes.

Return your response as a JSON object with the following structure:
{
  "projects": [
    {
      "title": "string",
      "description": "string", 
      "industry": "string",
      "projectType": "string",
      "timeline": "string",
      "budget": "string",
      "technologies": ["string"],
      "features": ["string"],
      "results": "string",
      "clientName": "string",
      "status": "completed" | "in-progress" | "cancelled"
    }
  ],
  "quotes": [
    {
      "title": "string",
      "description": "string",
      "clientName": "string", 
      "amount": "string",
      "timeline": "string",
      "scope": ["string"],
      "terms": "string",
      "status": "pending" | "approved" | "rejected",
      "createdDate": "YYYY-MM-DD"
    }
  ]
}

Guidelines:
- Extract as much relevant information as possible from the text
- If information is missing, use reasonable defaults or omit the field
- For budgets/amounts, include currency symbols and formatting
- For timelines, standardize to formats like "8 weeks", "3 months", etc.
- For technologies, extract specific tools, frameworks, and platforms mentioned
- For features, list key functionalities and capabilities
- For results, include metrics, improvements, and outcomes when mentioned
- If the document type is unclear, classify based on content (completed work = project, proposal = quote)
- Return empty arrays for projects or quotes if none are found in the text
`;

export async function POST(request: NextRequest) {
  try {
    const { content, type, filename } = await request.json();
    
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    // Initialize AI clients
    const groqClient = new GroqClient();
    const jinaClient = new JinaClient();
    const qdrantManager = new QdrantManager();
    const mongoManager = new MongoManager();

    // Connect to databases
    await mongoManager.connect();

    // Use AI to parse and extract structured data
    const parsePrompt = `${PARSING_PROMPT}\n\nDocument to parse:\n${content}`;
    
    const aiResponse = await groqClient.chat([{
      role: 'user',
      content: parsePrompt
    }]);

    let parsedData;
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({ 
        error: 'Failed to parse document content',
        details: 'AI response was not in expected JSON format'
      }, { status: 500 });
    }

    const results = {
      projectsAdded: 0,
      quotesAdded: 0,
      errors: [] as string[]
    };

    const db = mongoManager.getDB();

    // Process extracted projects
    if (parsedData.projects && Array.isArray(parsedData.projects)) {
      for (const project of parsedData.projects) {
        try {
          // Validate required fields
          if (!project.title || !project.description) {
            results.errors.push(`Project missing required fields: ${JSON.stringify(project)}`);
            continue;
          }

          // Add metadata
          const projectData = {
            ...project,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: `document_upload_${filename}`,
            extractedFromDocument: true
          };

          // Store in MongoDB
          const insertResult = await db.collection('projects').insertOne(projectData);
          
          // Create embedding for vector search
          const embedding = await jinaClient.embedText(
            `${project.title} ${project.description} ${project.industry} ${project.projectType}`
          );

          console.log('Embedding created:', {
            type: typeof embedding,
            isArray: Array.isArray(embedding),
            length: embedding?.length,
            sample: embedding?.slice(0, 5), // First 5 values for debugging
            isValidNumbers: embedding?.every(num => typeof num === 'number' && !isNaN(num))
          });

          // Validate embedding format
          if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error(`Invalid embedding format: expected array, got ${typeof embedding}`);
          }

          if (!embedding.every(num => typeof num === 'number' && !isNaN(num))) {
            throw new Error('Invalid embedding: contains non-numeric values');
          }

          // Store in Qdrant - first ensure collection exists
          try {
            await qdrantManager.createCollection('shopify_projects', {
              vectorSize: 768, // Jina embeddings are typically 768 dimensions
              distance: 'Cosine'
            });
          } catch (error: any) {
            // Collection might already exist
            console.log('Collection creation result:', error.message);
          }

          await qdrantManager.addDocuments('shopify_projects', [{
            id: uuidv4(), // Use UUID instead of MongoDB ObjectId
            vector: embedding,
            payload: {
              title: project.title,
              description: project.description,
              industry: project.industry,
              projectType: project.projectType,
              budget: project.budget,
              timeline: project.timeline,
              mongoId: insertResult.insertedId.toString()
            }
          }]);

          results.projectsAdded++;
        } catch (error: any) {
          console.error('Error processing project:', error);
          results.errors.push(`Failed to process project "${project.title}": ${error.message}`);
        }
      }
    }

    // Process extracted quotes  
    if (parsedData.quotes && Array.isArray(parsedData.quotes)) {
      for (const quote of parsedData.quotes) {
        try {
          // Validate required fields
          if (!quote.title || !quote.description) {
            results.errors.push(`Quote missing required fields: ${JSON.stringify(quote)}`);
            continue;
          }

          // Add metadata
          const quoteData = {
            ...quote,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: `document_upload_${filename}`,
            extractedFromDocument: true
          };

          // Store in MongoDB
          const insertResult = await db.collection('quotes').insertOne(quoteData);
          
          // Create embedding for vector search
          const embedding = await jinaClient.embedText(
            `${quote.title} ${quote.description} ${quote.clientName} ${quote.amount}`
          );

          console.log('Quote embedding created:', {
            type: typeof embedding,
            isArray: Array.isArray(embedding),
            length: embedding?.length,
            sample: embedding?.slice(0, 5),
            isValidNumbers: embedding?.every(num => typeof num === 'number' && !isNaN(num))
          });

          // Validate embedding format
          if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error(`Invalid quote embedding format: expected array, got ${typeof embedding}`);
          }

          if (!embedding.every(num => typeof num === 'number' && !isNaN(num))) {
            throw new Error('Invalid quote embedding: contains non-numeric values');
          }

          // Store in Qdrant - first ensure collection exists
          try {
            await qdrantManager.createCollection('shopify_quotes', {
              vectorSize: 768,
              distance: 'Cosine'
            });
          } catch (error: any) {
            // Collection might already exist
            console.log('Quote collection creation result:', error.message);
          }

          await qdrantManager.addDocuments('shopify_quotes', [{
            id: uuidv4(), // Use UUID instead of MongoDB ObjectId
            vector: embedding,
            payload: {
              title: quote.title,
              description: quote.description,
              clientName: quote.clientName,
              amount: quote.amount,
              timeline: quote.timeline,
              status: quote.status,
              mongoId: insertResult.insertedId.toString()
            }
          }]);

          results.quotesAdded++;
        } catch (error: any) {
          console.error('Error processing quote:', error);
          results.errors.push(`Failed to process quote "${quote.title}": ${error.message}`);
        }
      }
    }

    // Close database connections
    await mongoManager.disconnect();

    return NextResponse.json({
      success: true,
      message: `Successfully processed document: ${results.projectsAdded} projects and ${results.quotesAdded} quotes added`,
      details: results,
      originalDocument: {
        filename,
        type,
        contentLength: content.length
      }
    });

  } catch (error: any) {
    console.error('Document processing error:', error);
    return NextResponse.json({ 
      error: 'Failed to process document',
      details: error.message 
    }, { status: 500 });
  }
}
