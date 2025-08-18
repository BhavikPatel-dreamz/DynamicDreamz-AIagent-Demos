import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import PDFRAGAgent from "../../../../src/agent/PDFRAGAgent.js";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "ids array is required and cannot be empty" },
      { status: 400 }
    );
  }

  try {
    const PDFAgent = new PDFRAGAgent({
      mongoDbName: "Pdf_based_chat_history",
      maxHistoryLength: 20,
    });

    const result = await PDFAgent.deletePdf(ids);

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error: any) {
    console.error("PDF deletion error:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
