import { NextResponse } from "next/server";
import  FinanceRAGAgent  from "../../../../src/agent/FinanceRAGAgent"; // Adjust the import path as necessary
import type { NextRequest } from "next/server";
import { cookies } from 'next/headers';
import { PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER } from "next/dist/lib/constants";
import { get } from "https";

// You may want to initialize your agent once (singleton)


export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, sessionId } = body;

 function generateUUID() {
      return crypto.randomUUID();
    }

 async function setTrackingSessionId() {
      const sessionId = generateUUID();
      (await cookies()).set('trackingSessionId', sessionId, { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }); // Example: expires in 1 year
    }
    
    async function getTrackingSessionId() {
      const cookieStore = cookies();
      return (await cookieStore).get('trackingSessionId')?.value;
    }

    // get from current ip
  const userId = request.headers.get('x-user-id') || null; // Replace with your method of getting user ID
  if (!userId) {
    await setTrackingSessionId();
  } else {
    const existingSessionId = await getTrackingSessionId();
    if (!existingSessionId) {
      await setTrackingSessionId();
    }
  }

  if (!message || !userId) {
    return NextResponse.json(
      { error: "Message and userId are required" },
      { status: 400 }
    );
  }

  const financeAgent = new FinanceRAGAgent({
            collectionName: 'financial_documents',
            mongoDbName: 'finance_assistant',
            maxHistoryLength: 20
        });

  try {
    const result = await financeAgent.chatWithFinanceHistory(
      sessionId || `session_${Date.now()}`,
      userId,
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

