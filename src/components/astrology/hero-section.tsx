'use client';
import { Button } from "../ui/button";
import { Star, Moon, Sun } from "lucide-react";
import heroImage from "../../assets/astrology-hero.jpg";


export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage.src})` }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-hero opacity-80" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Star className="absolute top-20 left-20 w-6 h-6 text-primary/60 animate-pulse" />
        <Moon className="absolute top-40 right-32 w-8 h-8 text-celestial/50 animate-bounce" style={{ animationDelay: '0.5s' }} />
        <Sun className="absolute bottom-40 left-40 w-10 h-10 text-primary/40 animate-pulse" style={{ animationDelay: '1s' }} />
        <Star className="absolute bottom-20 right-20 w-4 h-4 text-mystical/60 animate-bounce" style={{ animationDelay: '1.5s' }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-gradient-cosmic bg-clip-text leading-tight">
            Mystical Astrology
          </h1>
          
          <p className="text-xl md:text-2xl text-foreground/90 max-w-2xl mx-auto leading-relaxed">
            Unlock the secrets of the cosmos and discover your celestial destiny through ancient wisdom and stellar guidance
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button 
              size="lg" 
              className="bg-gradient-cosmic hover:shadow-mystical transition-glow text-lg px-8 py-3"
            >
              <Star className="w-5 h-5 mr-2" />
              Discover Your Sign
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-primary/30 bg-background/10 hover:bg-primary/10 text-foreground backdrop-blur-sm text-lg px-8 py-3"
            >
              <Moon className="w-5 h-5 mr-2" />
              Daily Horoscope
            </Button>
          </div>
        </div>
        
        {/* Cosmic Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-primary">12</div>
            <div className="text-sm text-muted-foreground">Zodiac Signs</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-celestial">∞</div>
            <div className="text-sm text-muted-foreground">Cosmic Wisdom</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-mystical">★</div>
            <div className="text-sm text-muted-foreground">Divine Guidance</div>
          </div>
        </div>
      </div>
    </section>
  );
};