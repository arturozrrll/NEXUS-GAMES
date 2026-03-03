
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AIRecommendation {
    upcoming: string[];
    recent: string[];
    popular: string[];
}

export const getDiscoveryRecommendations = async (): Promise<AIRecommendation> => {
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    try {
        const prompt = `
            Today is ${dateString}. Act as a senior video game market analyst.
            
            TASK: Generate 3 DISTINCT lists of video games.
            TOOLS: Use Google Search to verify data on "releases.com/calendar", "steamdb.info", and "metacritic.com".

            1. "popular": Exactly 18 games.
               - SOURCE: Real-time "SteamDB Top Sellers" or "Most Played" (Premium games only).
               - FILTERS: 
                 * MUST BE PAID (Premium). NO Free-to-Play (Exclude CS2, Dota, Apex, PUBG).
                 * FOCUS: 80% Single Player / Narrative (e.g., Black Myth Wukong, Elden Ring, Space Marine 2).
                 * INCLUDE: 2-3 trending Paid Co-op/Multiplayer hits (e.g. Helldivers 2).
                 * EXCLUDE: Unreleased games (GTA VI).

            2. "upcoming": EXACTLY 10 games. (CRITICAL: Do not return less than 8).
               - SOURCE: Check releases.com/calendar/games or Steam Upcoming.
               - TIMEFRAME: Release date must be within the NEXT 30 DAYS from ${dateString}.
               - IF 30 DAYS IS TOO QUIET: Extend range to 45 days or include high-profile Indie games and Early Access launches to fill the list.
               - SORT: By release date (soonest first).

            3. "recent": Exactly 12 games.
               - SOURCE: Games released in the LAST 45 DAYS.
               - MUST BE PAID GAMES.

            Return ONLY a raw JSON object:
            {
                "upcoming": ["Title 1", "Title 2"],
                "recent": ["Title 1", "Title 2"],
                "popular": ["Title 1", "Title 2"]
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }], // ENABLE REAL-TIME SEARCH
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        upcoming: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                        },
                        recent: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                        },
                        popular: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                        }
                    },
                    required: ["upcoming", "recent", "popular"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from AI");

        return JSON.parse(text) as AIRecommendation;

    } catch (error: any) {
        // Handle Rate Limiting / Quota issues gracefully
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
            console.warn("Nexus AI: Quota exceeded. Switching to offline fallback recommendations.");
        } else {
            console.error("AI Discovery Error:", error);
        }

        // Fallback Data (Safe defaults if AI/Search fails)
        return {
            upcoming: [
                "Dragon Age: The Veilguard",
                "STALKER 2",
                "Indiana Jones and the Great Circle",
                "Avowed",
                "Civilization VII",
                "Monster Hunter Wilds",
                "Kingdom Come: Deliverance II",
                "Assassin's Creed Shadows",
                "Little Nightmares III",
                "Borderlands 4"
            ],
            recent: [
                "Silent Hill 2",
                "Metaphor: ReFantazio",
                "Dragon Ball: Sparking! ZERO",
                "Call of Duty: Black Ops 6",
                "Astro Bot"
            ],
            popular: [
                "Black Myth: Wukong",
                "Elden Ring",
                "Baldur's Gate 3",
                "Cyberpunk 2077",
                "Red Dead Redemption 2",
                "The Witcher 3: Wild Hunt",
                "Hogwarts Legacy",
                "Helldivers 2",
                "Space Marine 2",
                "Persona 5 Royal",
                "Sekiro: Shadows Die Twice",
                "Resident Evil 4",
                "Lies of P",
                "Ghost of Tsushima",
                "Armored Core VI",
                "Hades II",
                "Final Fantasy XVI",
                "God of War Ragnarök"
            ]
        };
    }
};

/**
 * Fetch Release Date via AI Grounding (Fallback for IGDB errors)
 */
export const getReleaseDateWithAI = async (gameTitle: string): Promise<string | null> => {
    try {
        const prompt = `Find the exact release date for "${gameTitle}". 
        Use Google Search. Return strictly ISO 8601 format (YYYY-MM-DD). 
        If unreleased, return the expected date.
        JSON format: { "date": "YYYY-MM-DD" }`;

        const response = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json"
            }
        });

        const text = response.text?.trim();
        if (text) {
            const cleanJson = text.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);
            if (data.date && !isNaN(Date.parse(data.date))) {
                return data.date;
            }
        }
    } catch (e) {
        console.warn(`[AI Date Fetch] Failed for ${gameTitle}:`, e);
    }
    return null;
};

/**
 * Legacy stub
 */
export const generateGameMetadata = async (gameTitle: string): Promise<any> => {
     return {}; 
};
