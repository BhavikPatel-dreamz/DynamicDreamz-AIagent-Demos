// Complete Astrology Birth Chart AI Agent
import MongoManager from "../Clients/MongoManager.js";
import GroqClient from "../Clients/GroqClient.js";

class AstrologyRAGAgent {
  constructor(config) {
    const {
      mongoDbName = "astrology_assistant",
      maxHistoryLength = 30,
    } = config;

    this.groqClient = new GroqClient();
    this.maxHistoryLength = maxHistoryLength;
    this.dbPromise = new MongoManager({ dbName: mongoDbName }).connect();
    this.db = null;
    
    // Astrology data
    this.zodiacSigns = [
      { name: "Aries", element: "Fire", quality: "Cardinal", ruler: "Mars", dates: "Mar 21 - Apr 19" },
      { name: "Taurus", element: "Earth", quality: "Fixed", ruler: "Venus", dates: "Apr 20 - May 20" },
      { name: "Gemini", element: "Air", quality: "Mutable", ruler: "Mercury", dates: "May 21 - Jun 20" },
      { name: "Cancer", element: "Water", quality: "Cardinal", ruler: "Moon", dates: "Jun 21 - Jul 22" },
      { name: "Leo", element: "Fire", quality: "Fixed", ruler: "Sun", dates: "Jul 23 - Aug 22" },
      { name: "Virgo", element: "Earth", quality: "Mutable", ruler: "Mercury", dates: "Aug 23 - Sep 22" },
      { name: "Libra", element: "Air", quality: "Cardinal", ruler: "Venus", dates: "Sep 23 - Oct 22" },
      { name: "Scorpio", element: "Water", quality: "Fixed", ruler: "Mars/Pluto", dates: "Oct 23 - Nov 21" },
      { name: "Sagittarius", element: "Fire", quality: "Mutable", ruler: "Jupiter", dates: "Nov 22 - Dec 21" },
      { name: "Capricorn", element: "Earth", quality: "Cardinal", ruler: "Saturn", dates: "Dec 22 - Jan 19" },
      { name: "Aquarius", element: "Air", quality: "Fixed", ruler: "Saturn/Uranus", dates: "Jan 20 - Feb 18" },
      { name: "Pisces", element: "Water", quality: "Mutable", ruler: "Jupiter/Neptune", dates: "Feb 19 - Mar 20" }
    ];

    this.houses = [
      { number: 1, name: "House of Self", meaning: "Identity, appearance, first impressions, new beginnings" },
      { number: 2, name: "House of Values", meaning: "Money, possessions, self-worth, material security" },
      { number: 3, name: "House of Communication", meaning: "Siblings, short trips, communication, learning" },
      { number: 4, name: "House of Home", meaning: "Family, home, roots, emotional foundation" },
      { number: 5, name: "House of Pleasure", meaning: "Romance, creativity, children, self-expression" },
      { number: 6, name: "House of Service", meaning: "Health, work, daily routine, service to others" },
      { number: 7, name: "House of Partnership", meaning: "Marriage, partnerships, open enemies, cooperation" },
      { number: 8, name: "House of Transformation", meaning: "Death, rebirth, shared resources, occult" },
      { number: 9, name: "House of Philosophy", meaning: "Higher learning, religion, long journeys, wisdom" },
      { number: 10, name: "House of Career", meaning: "Career, reputation, public image, authority" },
      { number: 11, name: "House of Friendship", meaning: "Friends, hopes, dreams, social groups" },
      { number: 12, name: "House of Subconscious", meaning: "Subconscious, spirituality, hidden enemies, karma" }
    ];

    this.planets = [
      { name: "Sun", meaning: "Core self, ego, vitality, life purpose" },
      { name: "Moon", meaning: "Emotions, instincts, subconscious, nurturing" },
      { name: "Mercury", meaning: "Communication, thinking, learning, travel" },
      { name: "Venus", meaning: "Love, beauty, harmony, relationships, values" },
      { name: "Mars", meaning: "Action, energy, desire, aggression, drive" },
      { name: "Jupiter", meaning: "Expansion, wisdom, luck, higher learning" },
      { name: "Saturn", meaning: "Discipline, responsibility, limitations, lessons" },
      { name: "Uranus", meaning: "Innovation, rebellion, sudden changes, freedom" },
      { name: "Neptune", meaning: "Dreams, illusions, spirituality, compassion" },
      { name: "Pluto", meaning: "Transformation, power, rebirth, deep change" }
    ];
  }

  async initializeDB() {
    if (!this.db) {
      try {
        this.db = await this.dbPromise;
        console.log("Astrology database connection established");
        
        const collections = await this.db.listCollections().toArray();
        console.log("Available collections:", collections.map(c => c.name));
      } catch (error) {
        console.error("Error initializing astrology database:", error);
        throw error;
      }
    }
  }

  async createChatSession(userId) {
    await this.initializeDB();
    const session = await this.db.collection("astro_chat_sessions").findOne({ userId });
    if (!session) {
      const sessionId = `astro_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.db.collection("astro_chat_sessions").insertOne({
        sessionId,
        userId,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        type: "astrology",
        status: "active",
      });
    } else {
      await this.db.collection("astro_chat_sessions").updateOne(
        { userId },
        { $set: { lastActivity: new Date() } }
      );
    }
  }

  async addToHistory(userId, role, content, metadata = {}) {
    await this.initializeDB();
    await this.db.collection("astro_chat_messages").insertOne({
      userId,
      role,
      content,
      timestamp: new Date(),
      metadata,
    });
    await this.db.collection("astro_chat_sessions").updateOne(
      { userId },
      { $inc: { messageCount: 1 }, $set: { lastActivity: new Date() } }
    );
    await this.cleanupOldMessages(userId);
  }

  async getChatHistory(userId, limit = this.maxHistoryLength) {
    await this.initializeDB();
    return this.db
      .collection("astro_chat_messages")
      .find({ userId })
      .sort({ timestamp: 1 })
      .limit(limit)
      .toArray();
  }

  async cleanupOldMessages(userId) {
    const count = await this.db.collection("astro_chat_messages").countDocuments({ userId });
    if (count > this.maxHistoryLength) {
      const old = await this.db.collection("astro_chat_messages")
        .find({ userId })
        .sort({ timestamp: 1 })
        .limit(count - this.maxHistoryLength)
        .toArray();
      const ids = old.map((m) => m._id);
      await this.db.collection("astro_chat_messages").deleteMany({ _id: { $in: ids } });
    }
  }

  calculateZodiacSign(month, day) {
    const dates = [
      { sign: "Capricorn", start: [12, 22], end: [1, 19] },
      { sign: "Aquarius", start: [1, 20], end: [2, 18] },
      { sign: "Pisces", start: [2, 19], end: [3, 20] },
      { sign: "Aries", start: [3, 21], end: [4, 19] },
      { sign: "Taurus", start: [4, 20], end: [5, 20] },
      { sign: "Gemini", start: [5, 21], end: [6, 20] },
      { sign: "Cancer", start: [6, 21], end: [7, 22] },
      { sign: "Leo", start: [7, 23], end: [8, 22] },
      { sign: "Virgo", start: [8, 23], end: [9, 22] },
      { sign: "Libra", start: [9, 23], end: [10, 22] },
      { sign: "Scorpio", start: [10, 23], end: [11, 21] },
      { sign: "Sagittarius", start: [11, 22], end: [12, 21] }
    ];

    for (const date of dates) {
      if (date.sign === "Capricorn") {
        if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
          return date.sign;
        }
      } else {
        const [startMonth, startDay] = date.start;
        const [endMonth, endDay] = date.end;
        if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
          return date.sign;
        }
      }
    }
    return "Unknown";
  }

  async chatWithAstrologyHistory(userId, query) {
    await this.createChatSession(userId);
    await this.addToHistory(userId, "user", query);

    const astrologyContext = await this.getAstrologyContext(userId);
    const chatHistory = await this.getChatHistory(userId);

    const historyContext = chatHistory.length > 0
      ? chatHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")
      : "No previous conversation history.";

    const systemPrompt = `You are Sage Astara, a wise and knowledgeable astrology expert. You help users understand their birth charts, planetary influences, and astrological guidance for life decisions.

You have access to:
1. User's stored birth chart information and astrological profiles
2. Comprehensive astrology knowledge base
3. Previous conversation history for personalized guidance

${astrologyContext}

Available tools (respond with EXACTLY this format when needed, and only one tool per user action):
- If user provides birth date, time, and location, use TOOL:createBirthChart with the provided information. Examples:
  * TOOL:createBirthChart:{"birthDate":"1990-05-15","birthTime":"14:30","birthLocation":"New York, NY"}
  * TOOL:createBirthChart:{"birthDate":"1985-12-03","birthTime":"08:45","birthLocation":"Mumbai, India"}
- If user asks about their sun sign or basic zodiac info, use TOOL:getZodiacInfo. Examples:
  * TOOL:getZodiacInfo:{"month":5,"day":15}
- TOOL:getDailyHoroscope:{"sign":"Leo"} - to get daily horoscope for a specific sign
- TOOL:getCompatibility:{"sign1":"Leo","sign2":"Aquarius"} - to check compatibility between two signs
- TOOL:getPlanetaryTransits:{} - to get current planetary transits and their meanings
- TOOL:getHouseInterpretation:{"house":7,"sign":"Libra"} - to interpret a specific house placement
- TOOL:getMoonPhase:{} - to get current moon phase and its astrological significance
- TOOL:getPersonalityProfile:{"sunSign":"Leo","moonSign":"Cancer","rising":"Virgo"} - for detailed personality analysis
- TOOL:getLifePath:{"birthDate":"1990-05-15"} - to calculate and interpret life path based on numerology and astrology
- TOOL:getYearlyForecast:{"sunSign":"Scorpio","year":2024} - for yearly astrological predictions

Astrology Knowledge Base:
Zodiac Signs: ${JSON.stringify(this.zodiacSigns, null, 2)}
Houses: ${JSON.stringify(this.houses, null, 2)}
Planets: ${JSON.stringify(this.planets, null, 2)}

Guidelines:
- Provide personalized astrological insights based on user's birth chart information
- Explain astrological concepts in an accessible way
- Connect celestial influences to practical life guidance
- Reference previous conversations to build deeper understanding
- Be mystical yet grounded, spiritual yet practical
- Always ask for birth date, time, and location for accurate birth chart readings
- Explain the significance of planetary positions, aspects, and transits
- Offer guidance for relationships, career, and personal growth
- Keep responses insightful, compassionate, and empowering
- Reference astrological houses, planetary rulers, and elemental influences`;

    const userPrompt = `Previous conversation:\n${historyContext}\n\nCurrent question: ${query}\n\nProvide personalized astrological guidance, interpret celestial influences, and suggest tools if needed for deeper insights.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const result = await this.groqClient.chat(messages);

    console.log("Astrology AI response:", result);
    const toolMatches = [...result.matchAll(/TOOL:(\w+):(\{[^}]*\})/g)];
    console.log("Tool matches:", toolMatches);
    let toolOutput = null;

    for (const match of toolMatches) {
      const tool = match[1];
      const json = match[2];
      console.log(`Matched tool: ${tool} with args: ${json}`);
      let args = {};
      try {
        args = JSON.parse(json);
      } catch (e) {
        console.error("Error parsing tool arguments:", e);
      }
      
      console.log(`Executing astrology tool: ${tool} with args:`, args);
      
      let currentToolOutput = null;
      if (tool === "createBirthChart") {
        currentToolOutput = await this.createBirthChart(userId, args);
      } else if (tool === "getZodiacInfo") {
        currentToolOutput = await this.getZodiacInfo(args);
      } else if (tool === "getDailyHoroscope") {
        currentToolOutput = await this.getDailyHoroscope(args);
      } else if (tool === "getCompatibility") {
        currentToolOutput = await this.getCompatibility(args);
      } else if (tool === "getPlanetaryTransits") {
        currentToolOutput = await this.getPlanetaryTransits();
      } else if (tool === "getHouseInterpretation") {
        currentToolOutput = await this.getHouseInterpretation(args);
      } else if (tool === "getMoonPhase") {
        currentToolOutput = await this.getMoonPhase();
      } else if (tool === "getPersonalityProfile") {
        currentToolOutput = await this.getPersonalityProfile(args);
      } else if (tool === "getLifePath") {
        currentToolOutput = await this.getLifePath(args);
      } else if (tool === "getYearlyForecast") {
        currentToolOutput = await this.getYearlyForecast(args);
      }
      
      console.log(`Tool ${tool} output:`, currentToolOutput);
      
      if (!toolOutput) {
        toolOutput = currentToolOutput;
      }
    }

    const userVisibleResponse = result.replace(/TOOL:.*/g, "").trim();
    await this.addToHistory(userId, "assistant", userVisibleResponse);
    if (toolOutput) await this.addToHistory(userId, "assistant", toolOutput, { type: "tool_execution" });

    console.log("Returning astrology response:", { response: userVisibleResponse, toolResult: toolOutput });
    return { answer: userVisibleResponse, toolResult: toolOutput };
  }

  async getAstrologyContext(userId) {
    const profile = await this.getUserAstrologyProfile(userId);
    if (profile) {
      return `User's Astrological Profile:
Birth Date: ${profile.birthDate}
Birth Time: ${profile.birthTime || 'Not specified'}
Birth Location: ${profile.birthLocation || 'Not specified'}
Sun Sign: ${profile.sunSign}
Moon Sign: ${profile.moonSign || 'Not calculated'}
Rising Sign: ${profile.risingSign || 'Not calculated'}
Chart Created: ${profile.createdAt}`;
    }
    return "No birth chart information stored for this user.";
  }

  async getUserAstrologyProfile(userId) {
    await this.initializeDB();
    try {
      const collections = await this.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      if (!collectionNames.includes("astrology_profiles")) {
        return null;
      }
      
      return await this.db
        .collection("astrology_profiles")
        .findOne({ userId });
    } catch (error) {
      console.error("Error retrieving astrology profile:", error);
      return null;
    }
  }

  async createBirthChart(userId, { birthDate, birthTime, birthLocation }) {
    await this.initializeDB();
    try {
      const collections = await this.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      if (!collectionNames.includes("astrology_profiles")) {
        await this.db.createCollection("astrology_profiles");
      }
      
      const date = new Date(birthDate);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const sunSign = this.calculateZodiacSign(month, day);
      
      // Simple birth chart creation (in real implementation, you'd use ephemeris data)
      const profile = {
        userId,
        birthDate,
        birthTime: birthTime || null,
        birthLocation: birthLocation || null,
        sunSign,
        moonSign: this.getRandomSign(), // Simplified - would calculate based on ephemeris
        risingSign: this.getRandomSign(), // Simplified - would calculate based on time/location
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.db.collection("astrology_profiles").replaceOne(
        { userId },
        profile,
        { upsert: true }
      );
      
      const signInfo = this.zodiacSigns.find(sign => sign.name === sunSign);
      
      return `✨ Birth Chart Created! ✨
Sun Sign: ${sunSign} (${signInfo.element} ${signInfo.quality})
Moon Sign: ${profile.moonSign} (Emotional nature)
Rising Sign: ${profile.risingSign} (How others see you)
Birth Date: ${birthDate}
${birthTime ? `Birth Time: ${birthTime}` : ''}
${birthLocation ? `Birth Location: ${birthLocation}` : ''}

Your ${sunSign} sun gives you ${signInfo.element.toLowerCase()} energy with a ${signInfo.quality.toLowerCase()} approach to life, ruled by ${signInfo.ruler}.`;
    } catch (error) {
      console.error("Error creating birth chart:", error);
      return "Error creating birth chart. Please check your birth information.";
    }
  }

  getRandomSign() {
    const signs = this.zodiacSigns.map(s => s.name);
    return signs[Math.floor(Math.random() * signs.length)];
  }

  async getZodiacInfo({ month, day }) {
    const sign = this.calculateZodiacSign(month, day);
    const signInfo = this.zodiacSigns.find(s => s.name === sign);
    
    if (!signInfo) return "Invalid date provided.";
    
    return `🌟 Your Sun Sign: ${sign} 🌟
Element: ${signInfo.element}
Quality: ${signInfo.quality}
Ruling Planet: ${signInfo.ruler}
Dates: ${signInfo.dates}

${sign} energy brings ${signInfo.element.toLowerCase()} characteristics to your personality with a ${signInfo.quality.toLowerCase()} approach to life.`;
  }

  async getDailyHoroscope({ sign }) {
    const horoscopes = {
      "Aries": "Today's energy favors bold actions and new beginnings. Trust your instincts and take the lead.",
      "Taurus": "Focus on stability and practical matters. Your patience will be rewarded today.",
      "Gemini": "Communication is highlighted. Share your ideas and connect with others.",
      "Cancer": "Trust your intuition and nurture your emotional well-being today.",
      "Leo": "Your creativity and confidence shine bright. Express yourself boldly.",
      "Virgo": "Attention to detail serves you well. Organize and plan for future success.",
      "Libra": "Seek balance and harmony in all your relationships today.",
      "Scorpio": "Deep transformation is possible. Embrace change and trust the process.",
      "Sagittarius": "Adventure and learning opportunities await. Expand your horizons.",
      "Capricorn": "Focus on your goals and responsibilities. Hard work pays off.",
      "Aquarius": "Innovation and friendship are highlighted. Think outside the box.",
      "Pisces": "Trust your dreams and intuition. Creative inspiration flows freely."
    };
    
    const message = horoscopes[sign] || "Please provide a valid zodiac sign.";
    return `🌙 Daily Horoscope for ${sign} 🌙\n${message}`;
  }

  async getCompatibility({ sign1, sign2 }) {
    const elements = {
      "Aries": "Fire", "Leo": "Fire", "Sagittarius": "Fire",
      "Taurus": "Earth", "Virgo": "Earth", "Capricorn": "Earth",
      "Gemini": "Air", "Libra": "Air", "Aquarius": "Air",
      "Cancer": "Water", "Scorpio": "Water", "Pisces": "Water"
    };
    
    const element1 = elements[sign1];
    const element2 = elements[sign2];
    
    let compatibility = "";
    if (element1 === element2) {
      compatibility = "High - Same element creates natural understanding";
    } else if (
      (element1 === "Fire" && element2 === "Air") ||
      (element1 === "Air" && element2 === "Fire") ||
      (element1 === "Earth" && element2 === "Water") ||
      (element1 === "Water" && element2 === "Earth")
    ) {
      compatibility = "Good - Complementary elements support each other";
    } else {
      compatibility = "Challenging - Different elements require understanding and compromise";
    }
    
    return `💫 Compatibility: ${sign1} & ${sign2} 💫
Compatibility Level: ${compatibility}
${sign1}: ${element1} element
${sign2}: ${element2} element`;
  }

  async getPlanetaryTransits() {
    // Simplified current transits (in real implementation, would use astronomical data)
    return `🌌 Current Planetary Transits 🌌
Mercury: Enhancing communication and quick thinking
Venus: Bringing harmony to relationships and creativity
Mars: Energizing action and motivation
Jupiter: Expanding opportunities and wisdom
Saturn: Teaching responsibility and discipline
Uranus: Triggering sudden insights and changes
Neptune: Heightening intuition and dreams
Pluto: Facilitating deep transformation`;
  }

  async getHouseInterpretation({ house, sign }) {
    const houseInfo = this.houses.find(h => h.number === house);
    if (!houseInfo) return "Invalid house number.";
    
    return `🏠 ${houseInfo.name} (House ${house}) in ${sign} 🏠
Meaning: ${houseInfo.meaning}
With ${sign} influence: This placement brings ${sign} energy to matters of ${houseInfo.meaning.toLowerCase()}.`;
  }

  async getMoonPhase() {
    // Simplified moon phase calculation
    const phases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
    const currentPhase = phases[Math.floor(Math.random() * phases.length)];
    
    const meanings = {
      "New Moon": "Time for new beginnings and setting intentions",
      "Waxing Crescent": "Time to take action on your goals",
      "First Quarter": "Time to make decisions and overcome challenges",
      "Waxing Gibbous": "Time to refine and adjust your plans",
      "Full Moon": "Time of culmination and emotional intensity",
      "Waning Gibbous": "Time for gratitude and sharing wisdom",
      "Last Quarter": "Time to release and let go",
      "Waning Crescent": "Time for rest and reflection"
    };
    
    return `🌙 Current Moon Phase: ${currentPhase} 🌙
Meaning: ${meanings[currentPhase]}`;
  }

  async getPersonalityProfile({ sunSign, moonSign, risingSign }) {
    const sunInfo = this.zodiacSigns.find(s => s.name === sunSign);
    const moonInfo = this.zodiacSigns.find(s => s.name === moonSign);
    const risingInfo = this.zodiacSigns.find(s => s.name === risingSign);
    
    return `🌟 Complete Personality Profile 🌟
Sun in ${sunSign}: Core identity - ${sunInfo.element} ${sunInfo.quality}
Moon in ${moonSign}: Emotional nature - ${moonInfo.element} energy
Rising in ${risingSign}: Public persona - ${risingInfo.element} approach

This combination creates a unique blend of ${sunInfo.element.toLowerCase()} core energy, ${moonInfo.element.toLowerCase()} emotional responses, and ${risingInfo.element.toLowerCase()} outward expression.`;
  }

  async getLifePath({ birthDate }) {
    const date = new Date(birthDate);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    // Simple numerology calculation
    const lifePathNumber = ((day + month + year).toString().split('').reduce((a, b) => parseInt(a) + parseInt(b), 0) % 9) + 1;
    
    const lifePaths = {
      1: "Leadership and independence",
      2: "Cooperation and diplomacy",
      3: "Creativity and communication",
      4: "Stability and hard work",
      5: "Freedom and adventure",
      6: "Nurturing and responsibility",
      7: "Spirituality and analysis",
      8: "Material success and power",
      9: "Humanitarian service and wisdom"
    };
    
    return `🎯 Your Life Path 🎯
Life Path Number: ${lifePathNumber}
Meaning: ${lifePaths[lifePathNumber]}
Your journey involves developing ${lifePaths[lifePathNumber].toLowerCase()} throughout your lifetime.`;
  }

  async getYearlyForecast({ sunSign, year }) {
    return `🔮 ${year} Yearly Forecast for ${sunSign} 🔮
Career: Focus on professional growth and new opportunities
Love: Relationships deepen with honest communication
Health: Maintain balance between work and self-care
Finance: Careful planning leads to stability
Spiritual: Inner wisdom guides important decisions
Lucky Months: Based on your ${sunSign} energy, spring and autumn bring favorable influences.`;
  }
}

export default AstrologyRAGAgent;
