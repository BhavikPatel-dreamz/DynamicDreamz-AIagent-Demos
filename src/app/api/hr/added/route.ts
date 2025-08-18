import { NextResponse } from "next/server";
import HRRAGAgent from "../../../../agent/HRRAGAgent";
import type { NextRequest } from "next/server";

const hrAgent = new HRRAGAgent({
  mongoDbName: 'hr_assistant',
  maxHistoryLength: 20
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { candidates} = body;

  if (!candidates) {
    return NextResponse.json(
      { error: "candidates are required" },
      { status: 400 }
    );
  }
  try {
    // Only use userId for chat history and context
    const result = await hrAgent.addCandidates(
     candidates
    );
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Finance chat error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}