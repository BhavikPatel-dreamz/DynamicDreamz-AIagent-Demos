import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../Clients/Prisma';
import { initiateCall } from '../../../Clients/Twilio';

export async function POST(request: NextRequest) {
  try {
    const { customerIds, campaignId } = await request.json();

    const results = [];

    for (const customerId of customerIds) {
      const customer = await db.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        results.push({ customerId, success: false, error: 'Customer not found' });
        continue;
      }

      try {
        // Create call record
        const call = await db.call.create({
          data: {
            customerId,
            campaignId,
            status: 'INITIATED'
          }
        });

        // Initiate Twilio call
        const twilioCall = await initiateCall(
          customer.phoneNumber, 
          customerId, 
          campaignId
        );

        // Update call with Twilio SID
        await db.call.update({
          where: { id: call.id },
          data: { twilioSid: twilioCall.sid }
        });

        results.push({ 
          customerId, 
          callId: call.id,
          success: true, 
          twilioSid: twilioCall.sid 
        });
      } catch (error) {
        console.error(`Failed to initiate call for customer ${customerId}:`, error);
        results.push({ 
          customerId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Call initiation API error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate calls' },
      { status: 500 }
    );
  }
}