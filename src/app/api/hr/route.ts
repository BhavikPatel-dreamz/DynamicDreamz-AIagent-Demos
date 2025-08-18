import { NextResponse } from "next/server";
import HRRAGAgent from "../../../agent/HRRAGAgent";
import type { NextRequest } from "next/server";

const hrAgent = new HRRAGAgent({
  mongoDbName: "hr_assistant",
  maxHistoryLength: 20,
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, query } = body;

  if (!userId || !query) {
    return NextResponse.json(
      { error: "userId and query are required" },
      { status: 400 }
    );
  }
  try {
    // Only use userId for chat history and context
    const result = await hrAgent.chatWithHistory(userId, query);
    return NextResponse.json({
      success: true,
      message: result
    });
  } catch (error: any) {
    console.error("Finance chat error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
