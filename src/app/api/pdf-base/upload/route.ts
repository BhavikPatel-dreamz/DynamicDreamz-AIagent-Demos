import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import PDFRAGAgent from "../../../../agent/PDFRAGAgent.js";




export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const pdf = formData.get('pdf') as File;
  const userId = formData.get('userId') as string;

  if (!pdf || !userId) {
    return NextResponse.json(
      { error: "pdf and userId are required" },
      { status: 400 }
    );
  }

  try {
    const PDFAgent = new PDFRAGAgent({
        mongoDbName: 'PDF_assistant',
        maxHistoryLength: 20
    });
  
    const result = await PDFAgent.uploadPdf(userId, pdf);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("PDF upload error:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}