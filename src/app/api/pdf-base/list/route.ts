import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import PDFRAGAgent from "../../../../agent/PDFRAGAgent.js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  try {
    const PDFAgent = new PDFRAGAgent({
      mongoDbName: "PDF_assistant",
      maxHistoryLength: 20
    });

    const result = await PDFAgent.getPdfList(userId);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Query upload error:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
