import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "../../lib/utils";
import { Star, Moon } from "lucide-react";

import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  text: string;
  isUser: boolean;
  timestamp?: string;
}

export const ChatMessage = ({ text, isUser, timestamp }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg transition-mystical",
        isUser ? "flex-row-reverse bg-gradient-mystical" : "bg-gradient-card"
      )}
    >
      <Avatar className="w-8 h-8 border border-primary/20">
        <AvatarFallback className={cn(
          "text-xs font-semibold",
          isUser ? "bg-primary text-primary-foreground" : "bg-mystical text-mystical-foreground"
        )}>
          {isUser ? "You" : <Star className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1">
        <div className={cn(
          "text-sm leading-relaxed",
          isUser ? "text-primary-foreground" : "text-card-foreground"
        )}>
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
        {/* {timestamp && (
          <div className="text-xs text-muted-foreground opacity-70">
            {timestamp}
          </div>
        )} */}
      </div>
    </div>
  );
};