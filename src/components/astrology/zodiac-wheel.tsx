'use client';
import { useState } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

const zodiacSigns = [
  { name: "Aries", symbol: "♈", element: "Fire", dates: "Mar 21 - Apr 19" },
  { name: "Taurus", symbol: "♉", element: "Earth", dates: "Apr 20 - May 20" },
  { name: "Gemini", symbol: "♊", element: "Air", dates: "May 21 - Jun 20" },
  { name: "Cancer", symbol: "♋", element: "Water", dates: "Jun 21 - Jul 22" },
  { name: "Leo", symbol: "♌", element: "Fire", dates: "Jul 23 - Aug 22" },
  { name: "Virgo", symbol: "♍", element: "Earth", dates: "Aug 23 - Sep 22" },
  { name: "Libra", symbol: "♎", element: "Air", dates: "Sep 23 - Oct 22" },
  { name: "Scorpio", symbol: "♏", element: "Water", dates: "Oct 23 - Nov 21" },
  { name: "Sagittarius", symbol: "♐", element: "Fire", dates: "Nov 22 - Dec 21" },
  { name: "Capricorn", symbol: "♑", element: "Earth", dates: "Dec 22 - Jan 19" },
  { name: "Aquarius", symbol: "♒", element: "Air", dates: "Jan 20 - Feb 18" },
  { name: "Pisces", symbol: "♓", element: "Water", dates: "Feb 19 - Mar 20" },
];

const elementColors = {
  Fire: "bg-gradient-to-r from-red-500/20 to-orange-500/20 border-orange-500/30",
  Earth: "bg-gradient-to-r from-green-500/20 to-yellow-500/20 border-yellow-500/30",
  Air: "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30",
  Water: "bg-gradient-to-r from-blue-600/20 to-teal-500/20 border-teal-500/30",
};

export const ZodiacWheel = () => {
  const [selectedSign, setSelectedSign] = useState<string | null>(null);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">Zodiac Wheel</h2>
        <p className="text-muted-foreground">
          Discover the cosmic influence of each zodiac sign
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {zodiacSigns.map((sign) => (
          <Card
            key={sign.name}
            className={`p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-mystical border-2 ${
              elementColors[sign.element as keyof typeof elementColors]
            } ${
              selectedSign === sign.name
                ? "ring-2 ring-primary shadow-celestial"
                : ""
            }`}
            onClick={() => setSelectedSign(selectedSign === sign.name ? null : sign.name)}
          >
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">{sign.symbol}</div>
              <h3 className="font-semibold text-card-foreground">{sign.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {sign.element}
              </Badge>
              <p className="text-xs text-muted-foreground">{sign.dates}</p>
            </div>
          </Card>
        ))}
      </div>

      {selectedSign && (
        <Card className="mt-8 p-6 bg-gradient-card border-primary/20 shadow-cosmic">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-primary mb-4">
              {selectedSign} Insights
            </h3>
            <p className="text-card-foreground">
              The cosmic energies of {selectedSign} bring unique gifts and challenges to your spiritual journey. 
              This sign's influence shapes your personality, relationships, and life path in profound ways.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};