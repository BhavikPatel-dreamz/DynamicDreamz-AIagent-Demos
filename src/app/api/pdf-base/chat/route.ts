import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";


export async function POST(request: NextRequest) {
  try {
        const result='hello chat-ai'
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Finance chat error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}