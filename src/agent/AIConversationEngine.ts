
import { ConversationContext, ConversationTurn } from '../../src/types';

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY!,
// });

export class AIConversationEngine {
  private context: ConversationContext;

  constructor(context: ConversationContext) {
    this.context = context;
  }

  async generateResponse(customerMessage: string): Promise<string> {
    // Add customer message to history
    this.context.conversationHistory.push({
      speaker: 'customer',
      message: customerMessage,
      timestamp: new Date()
    });

    const systemPrompt = this.buildSystemPrompt();
    const conversationHistory = this.buildConversationHistory();

    try {
      // const completion = await openai.chat.completions.create({
      //   model: 'gpt-4',
      //   messages: [
      //     { role: 'system', content: systemPrompt },
      //     ...conversationHistory,
      //     { role: 'user', content: customerMessage }
      //   ],
      //   max_tokens: 150,
      //   temperature: 0.7,
      // });


      //     const completion = GroqClient.chat.completions.create([
      //     { role: 'system', content: systemPrompt },
      //     ...conversationHistory,
      //     { role: 'user', content: customerMessage }
      //   ] {
      //   model: 'gpt-4',
      //   messages: [
      //     { role: 'system', content: systemPrompt },
      //     ...conversationHistory,
      //     { role: 'user', content: customerMessage }
      //   ],
      //   max_tokens: 150,
      //   temperature: 0.7,
      //   top_p: 1.0,
      //   frequency_penalty: 0.0,
      //   presence_penalty: 0.0,
      //   stop: ['\n', 'User:', 'AI:']  // Define stop sequences
      // });


      // const aiResponse = completion.choices[0]?.message?.content || 
      //   "I apologize, but I didn't understand that. Could you please repeat?";

      // // Add AI response to history
      // this.context.conversationHistory.push({
      //   speaker: 'ai',
      //   message: aiResponse,
      //   timestamp: new Date()
      // });

      return "This is a placeholder response. Replace with actual AI response generation logic.";
    } catch (error) {
      console.error('AI response generation failed:', error);
      return "I'm experiencing technical difficulties. Let me transfer you to a human agent.";
    }
  }

  private buildSystemPrompt(): string {
    const daysUntilExpiration = Math.ceil(
      (this.context.planExpirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return `You are a friendly and professional AI assistant calling ${this.context.customerName} about their insurance plan renewal.

CONTEXT:
- Customer: ${this.context.customerName}
- Plan expires in ${daysUntilExpiration} days (${this.context.planExpirationDate.toDateString()})
- Current plan details: ${JSON.stringify(this.context.planDetails)}

OBJECTIVES:
1. Inform about upcoming plan expiration
2. Review current plan benefits
3. Answer any policy questions
4. Guide through renewal process
5. Offer plan upgrades if beneficial

GUIDELINES:
- Keep responses under 30 seconds when spoken
- Be conversational and empathetic
- Ask clarifying questions when needed
- If customer wants to renew, collect necessary information
- If customer has complex questions, offer human agent transfer
- Always confirm important details
- End call gracefully when objectives are met

CONVERSATION RULES:
- Start with a greeting and introduction
- Confirm you're speaking with ${this.context.customerName}
- Be patient with customer concerns
- Provide specific plan details when requested
- Use clear, simple language
- Maintain professional but friendly tone`;
  }

  private buildConversationHistory() {
    return this.context.conversationHistory.map(turn => ({
      role: turn.speaker === 'customer' ? 'user' as const : 'assistant' as const,
      content: turn.message
    }));
  }

  shouldEndCall(): boolean {
    const history = this.context.conversationHistory;
    const recentMessages = history.slice(-4);
    
    // Check for explicit end-of-call indicators
    const endIndicators = [
      'goodbye', 'bye', 'thanks', 'that\'s all', 'no more questions',
      'I\'m good', 'completed', 'finished', 'done'
    ];

    return recentMessages.some(msg => 
      msg.speaker === 'customer' && 
      endIndicators.some(indicator => 
        msg.message.toLowerCase().includes(indicator)
      )
    );
  }
}