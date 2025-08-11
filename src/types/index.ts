export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  planExpirationDate: Date;
  planDetails?: any;
  timezone: string;
  preferredLanguage: string;
}

export interface Call {
  id: string;
  customerId: string;
  campaignId?: string;
  twilioSid?: string;
  status: CallStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordingUrl?: string;
  cost?: number;
  failureReason?: string;
}

export enum CallStatus {
  INITIATED = 'INITIATED',
  RINGING = 'RINGING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  NO_ANSWER = 'NO_ANSWER',
  BUSY = 'BUSY',
  CANCELLED = 'CANCELLED'
}

export interface ConversationContext {
  customerId: string;
  customerName: string;
  planExpirationDate: Date;
  planDetails: any;
  conversationHistory: ConversationTurn[];
}

export interface ConversationTurn {
  speaker: 'customer' | 'ai';
  message: string;
  timestamp: Date;
  sentiment?: string;
}