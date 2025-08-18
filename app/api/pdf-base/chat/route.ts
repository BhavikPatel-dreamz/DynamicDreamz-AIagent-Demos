import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import PDFRAGAgent from "../../../../src/agent/PDFRAGAgent.js";




export async function POST(request: NextRequest) {
  const body = await request.json();
  const { query, userId } = body;  

  if (!query || !userId) {
    return NextResponse.json(
      { error: "query and userId are required" },
      { status: 400 }
    );
  }

  try {
    const PDFAgent = new PDFRAGAgent({
        mongoDbName: 'Pdf_based_chat_history',
        maxHistoryLength: 20
    });
  
    const result = await PDFAgent.chatMessage(userId, query);
    console.log("Query result:", result);
    
    return NextResponse.json(result, {
      status: 200});
  } catch (error: any) {
    console.error("Query upload error:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}