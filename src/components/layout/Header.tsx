import { Brain } from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-soft">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Resume AI</h1>
              <p className="text-xs text-muted-foreground">Search Boost</p>
            </div>
          </div>
        </div>
        
        
      </div>
    </header>
  );
}