'use client';
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { ChatMessage } from "../ui/chat-message";
import { ScrollArea } from "../ui/scroll-area";
import { Send, Sparkles } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

export const ChatAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Welcome to your cosmic journey! I'm here to guide you through the mysteries of astrology. Ask me about your zodiac sign, daily horoscope, or any celestial wisdom you seek. ✨",
      isUser: false,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateAstrologyResponse = (question: string): string => {
    const responses = [
      "The stars align to bring you clarity in this moment. Your cosmic energy is shifting towards transformation and growth.",
      "Mercury's influence suggests communication and learning are key themes for you right now. Trust your intuition.",
      "The lunar cycles are supporting your emotional healing. Take time for self-reflection and inner wisdom.",
      "Jupiter's expansive energy is opening new opportunities. Stay open to unexpected blessings coming your way.",
      "Venus is highlighting relationships and creativity in your life. Express your authentic self with confidence.",
      "The cosmic energies suggest a period of manifestation. Focus your intentions on what truly matters to you.",
      "Saturn's lessons are helping you build stronger foundations. Embrace the challenges as opportunities for growth.",
      "Your celestial blueprint indicates a time of spiritual awakening. Pay attention to signs and synchronicities.",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateAstrologyResponse(inputValue),
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
      
      toast({
        title: "Cosmic Wisdom Received",
        description: "The stars have shared their guidance with you.",
      });
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-card border-primary/20 shadow-cosmic">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold text-card-foreground">
            Celestial Guide
          </h3>
        </div>
        
        <ScrollArea className="h-96 w-full rounded-md border border-border/50 p-4 bg-background/50">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                text={message.text}
                isUser={message.isUser}
                timestamp={message.timestamp}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 p-4 rounded-lg bg-gradient-card">
                <div className="w-8 h-8 rounded-full bg-mystical/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-mystical animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground animate-pulse">
                    Consulting the cosmic energies...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 mt-4">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your cosmic destiny..."
            className="flex-1 bg-background/50 border-primary/20 text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="bg-gradient-cosmic hover:shadow-mystical transition-glow"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};