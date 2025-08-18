import { NextResponse } from "next/server";
import FinanceRAGAgent from "../../../agent/FinanceRAGAgent";
import type { NextRequest } from "next/server";

const financeAgent = new FinanceRAGAgent({
  mongoDbName: 'finance_assistant',
  maxHistoryLength: 20
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, sessionId } = body;

  if (!message || !sessionId) {
    return NextResponse.json(
      { error: "Message and sessionId are required" },
      { status: 400 }
    );
  }


  

  try {
    // Only use userId for chat history and context
    const result = await financeAgent.chatWithFinanceHistory(
      sessionId, // sessionId removed, userId used as identifier
      message
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