import { NextResponse } from "next/server";
import  AstrologyRAGAgent  from "../../../src/agent/AstrologyRAGAgent";
import type { NextRequest } from "next/server";

const astrologyAgent = new AstrologyRAGAgent({
  mongoDbName: 'astrology_assistant',
  maxHistoryLength: 20
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, question } = body;
  const response = await astrologyAgent.chatWithAstrologyHistory( userId, question );
  return NextResponse.json(response);
}