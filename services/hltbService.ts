
import { HLTBData } from '../types';
import { GoogleGenAI } from "@google/genai";

/**
 * Normalización extrema para evitar errores de matching
 */
const cleanTitle = (t: string) => {
    return t
        .replace(/[:®™]/g, '')
        .replace(/edition|complete|deluxe|ultimate|directors cut/gi, '')
        .trim();
};

/**
 * Búsqueda con IA (Gemini + Google Search)
 */
const fetchFromAIGrounding = async (title: string): Promise<HLTBData | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Find the HowLongToBeat (HLTB) completion times for the video game "${title}". 
        I need 3 integers representing hours: "Main Story", "Main + Extra", and "Completionist".
        Return ONLY a JSON object like: {"main": 10, "extra": 15, "completionist": 30}.`;

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
            try {
                // Try parsing JSON directly
                const cleanJson = text.replace(/```json|```/g, '').trim();
                const data = JSON.parse(cleanJson);
                return {
                    main: Number(data.main) || 0,
                    extra: Number(data.extra) || 0,
                    completionist: Number(data.completionist) || 0
                };
            } catch (parseError) {
                // Fallback regex
                const numbers = text.match(/\d+/g)?.map(Number);
                if (numbers && numbers.length >= 3) {
                    return {
                        main: numbers[0],
                        extra: numbers[1],
                        completionist: numbers[2]
                    };
                }
            }
        }
    } catch (e: any) {
         // Silently handle quota exceeded and other errors to keep console clean
    }
    return null;
};

/**
 * Orquestador de búsqueda: API -> IA -> Fallback
 */
export const searchHLTB = async (gameTitle: string): Promise<HLTBData | null> => {
    const title = cleanTitle(gameTitle);
    
    // HLTB API is protected by Cloudflare and dynamic tokens (returns 404 via proxy).
    // We rely exclusively on AI Grounding.
    const aiResult = await fetchFromAIGrounding(gameTitle);
    if (aiResult) {
        return aiResult;
    }

    return null;
};
