import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Search, Upload, Users } from "lucide-react";


interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {


  const navItems = [
    {
      icon: Search,
      label: "Search",
      path: "/",
      description: "Search candidates"
    },
    {
      icon: Upload,
      label: "Upload",
      path: "/upload",
      description: "Upload CV"
    },
    {
      icon: Users,
      label: "Candidates",
      path: "/candidates",
      description: "View all candidates"
    }
  ];

  return (
    <nav className={cn("flex items-center gap-2", className)}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Button
            key={item.path}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate(item.path)}
            className={cn(
              "flex items-center gap-2 transition-all duration-200",
              isActive && "bg-primary text-primary-foreground shadow-soft"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}