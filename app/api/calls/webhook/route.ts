import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../Clients/Prisma';
import { AIConversationEngine } from '../../../../agent/AIConversationEngine';
import { generateTwiMLResponse } from '../../../../Clients/Twilio';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const customerId = request.nextUrl.searchParams.get('customerId');
    const campaignId = request.nextUrl.searchParams.get('campaignId');
    
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const speechResult = formData.get('SpeechResult') as string;

    if (!customerId) {
      return new NextResponse(
        generateTwiMLResponse("Sorry, there was an error. Goodbye."),
        { 
          headers: { 'Content-Type': 'text/xml' },
          status: 400 
        }
      );
    }

    // Update call status
    let call = await db.call.findFirst({
      where: { 
        customerId,
        twilioSid: callSid 
      }
    });

    if (call) {
      await db.call.update({
        where: { id: call.id },
        data: { 
          status: callStatus.toUpperCase() as any,
          endTime: ['completed', 'busy', 'no-answer', 'failed'].includes(callStatus) 
            ? new Date() 
            : undefined
        }
      });
    }

    // Get customer details
    const customer = await db.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return new NextResponse(
        generateTwiMLResponse("Sorry, customer not found. Goodbye.", 'hangup'),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Initialize or retrieve conversation context
    const existingTranscripts = await db.transcript.findMany({
      where: { callId: call?.id },
      orderBy: { timestamp: 'asc' }
    });

    const conversationHistory = existingTranscripts.map(t => ({
      speaker: t.speaker as 'customer' | 'ai',
      message: t.message,
      timestamp: t.timestamp,
      sentiment: t.sentiment || undefined
    }));

    const aiEngine = new AIConversationEngine({
      customerId: customer.id,
      customerName: customer.name,
      planExpirationDate: customer.planExpirationDate,
      planDetails: customer.planDetails,
      conversationHistory
    });

    let aiResponse: string;

    if (speechResult && speechResult.trim()) {
      // Customer spoke - generate AI response
      aiResponse = await aiEngine.generateResponse(speechResult);
      
      // Save customer message
      if (call) {
        await db.transcript.create({
          data: {
            callId: call.id,
            speaker: 'customer',
            message: speechResult,
            timestamp: new Date()
          }
        });

        // Save AI response
        await db.transcript.create({
          data: {
            callId: call.id,
            speaker: 'ai',
            message: aiResponse,
            timestamp: new Date()
          }
        });
      }
    } else {
      // First interaction or no speech detected
      aiResponse = `Hello ${customer.name}! This is an automated call from your insurance company. I'm calling to discuss your plan that expires on ${customer.planExpirationDate.toDateString()}. Is this a good time to talk?`;
      
      if (call) {
        await db.transcript.create({
          data: {
            callId: call.id,
            speaker: 'ai',
            message: aiResponse,
            timestamp: new Date()
          }
        });
      }
    }

    // Determine next action
    const shouldEnd = aiEngine.shouldEndCall();
    const nextAction = shouldEnd ? 'hangup' : 'gather';

    const twimlResponse = generateTwiMLResponse(aiResponse, nextAction);

    return new NextResponse(twimlResponse, {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse(
      generateTwiMLResponse("I'm sorry, there was a technical issue. Goodbye.", 'hangup'),
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
}