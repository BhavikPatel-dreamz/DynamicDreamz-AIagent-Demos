import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;

    // Update call in database
    await db.call.updateMany({
      where: { twilioSid: callSid },
      data: {
        status: callStatus.toUpperCase() as any,
        duration: callDuration ? parseInt(callDuration) : undefined,
        endTime: ['completed', 'busy', 'no-answer', 'failed'].includes(callStatus) 
          ? new Date() 
          : undefined
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}