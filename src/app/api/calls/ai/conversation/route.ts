import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
    console.error('Error processing request:', request);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}