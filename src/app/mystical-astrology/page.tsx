import { HeroSection } from "../../components/astrology/hero-section";
import { ChatAssistant } from "../../components/astrology/chat-assistant";
import { ZodiacWheel } from "../../components/astrology/zodiac-wheel";
import { Card } from "../../components/ui/card";
import { Star, Moon, Sun, Sparkles } from "lucide-react";

export const metadata = {
  title: "astro-chat-zen",
  description: "Dynamic Dream Generated Project",
  authors: [{ name: "Dynamic Dream" }],
  openGraph: {
    title: "astro-chat-zen",
    description: "Dynamic Dream Generated Project",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@Dynamic Dream_dev",
  },
};

const Index = () => {
  return (
    <div className='min-h-screen bg-gradient-hero'>
      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <section className='py-20 px-6'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl font-bold text-primary mb-4'>
              Explore Your Cosmic Journey
            </h2>
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
              Dive deep into the mystical world of astrology with our
              comprehensive tools and guidance
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20'>
            <Card className='p-6 bg-gradient-card border-primary/20 shadow-mystical hover:shadow-celestial transition-glow'>
              <div className='text-center space-y-4'>
                <div className='w-12 h-12 mx-auto bg-gradient-cosmic rounded-full flex items-center justify-center'>
                  <Star className='w-6 h-6 text-primary-foreground' />
                </div>
                <h3 className='text-xl font-semibold text-card-foreground'>
                  Birth Chart Reading
                </h3>
                <p className='text-muted-foreground'>
                  Discover your complete astrological profile with detailed
                  planetary positions and aspects
                </p>
              </div>
            </Card>

            <Card className='p-6 bg-gradient-card border-primary/20 shadow-mystical hover:shadow-celestial transition-glow'>
              <div className='text-center space-y-4'>
                <div className='w-12 h-12 mx-auto bg-gradient-mystical rounded-full flex items-center justify-center'>
                  <Moon className='w-6 h-6 text-mystical-foreground' />
                </div>
                <h3 className='text-xl font-semibold text-card-foreground'>
                  Daily Horoscopes
                </h3>
                <p className='text-muted-foreground'>
                  Get personalized daily insights based on current planetary
                  movements and your sign
                </p>
              </div>
            </Card>

            <Card className='p-6 bg-gradient-card border-primary/20 shadow-mystical hover:shadow-celestial transition-glow'>
              <div className='text-center space-y-4'>
                <div className='w-12 h-12 mx-auto bg-celestial rounded-full flex items-center justify-center'>
                  <Sparkles className='w-6 h-6 text-celestial-foreground' />
                </div>
                <h3 className='text-xl font-semibold text-card-foreground'>
                  Compatibility Analysis
                </h3>
                <p className='text-muted-foreground'>
                  Explore relationship dynamics and cosmic connections with
                  detailed compatibility reports
                </p>
              </div>
            </Card>
          </div>

          {/* Zodiac Wheel Section */}
          <ZodiacWheel />
        </div>
      </section>

      {/* Chat Assistant Section */}
      <section className='py-20 px-6 bg-background/5'>
        <div className='max-w-6xl mx-auto'>
          <div className='text-center mb-12'>
            <h2 className='text-4xl font-bold text-primary mb-4'>
              Ask Your Celestial Guide
            </h2>
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
              Connect with cosmic wisdom through our AI-powered astrology
              assistant
            </p>
          </div>

          <ChatAssistant />
        </div>
      </section>

      {/* Footer */}
      <footer className='py-12 px-6 border-t border-border/20'>
        <div className='max-w-6xl mx-auto text-center'>
          <div className='flex justify-center items-center gap-2 mb-4'>
            <Sun className='w-6 h-6 text-primary' />
            <span className='text-2xl font-bold text-primary'>
              Mystical Astrology
            </span>
            <Moon className='w-6 h-6 text-celestial' />
          </div>
          <p className='text-muted-foreground'>
            © 2024 Mystical Astrology. Connecting souls with cosmic wisdom.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
