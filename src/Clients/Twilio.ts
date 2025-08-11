import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;

export const twilioClient = twilio(accountSid, authToken);

export async function initiateCall(
  customerPhone: string,
  customerId: string,
  campaignId?: string
) {
  try {
    const call = await twilioClient.calls.create({
      to: customerPhone,
      from: twilioPhoneNumber,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/calls/webhook?customerId=${customerId}&campaignId=${campaignId}`,
      record: true,
      recordingStatusCallback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/calls/recording-complete`,
      statusCallback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/calls/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      method: 'POST'
    });

    return call;
  } catch (error) {
    console.error('Failed to initiate call:', error);
    throw error;
  }
}

export function generateTwiMLResponse(message: string, nextAction?: string) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  
  response.say({
    voice: 'Polly.Joanna-Neural'
  }, message);

  if (nextAction === 'gather') {
    const gather = response.gather({
      input: ['speech'],
      speechTimeout: '5',
      speechModel: 'experimental_conversations',
      action: '/api/calls/webhook',
      method: 'POST'
    });
  } else if (nextAction === 'hangup') {
    response.hangup();
  } else {
    response.redirect('/api/calls/webhook');
  }

  return response.toString();
}