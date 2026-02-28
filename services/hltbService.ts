
import { HLTBData } from '../types';
import { GoogleGenAI } from "@google/genai";

const PROXY_URL = 'https://corsproxy.io/?'; 
const HLTB_API = 'https://howlongtobeat.com/api/search';

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
 * MÉTODO A: API Oficial HLTB (Vía Proxy)
 */
const fetchFromHLTBApi = async (title: string): Promise<HLTBData | null> => {
    try {
        const payload = {
            searchType: "games",
            searchTerms: title.split(' '),
            searchPage: 1,
            size: 5,
            useCache: true
        };

        const response = await fetch(`${PROXY_URL}${encodeURIComponent(HLTB_API)}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://howlongtobeat.com/',
                'Origin': 'https://howlongtobeat.com'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) return null;
        const json = await response.json();
        
        if (json && json.data && json.data.length > 0) {
            // Find the best match (exact title preferred)
            const lowerTitle = title.toLowerCase();
            const best = json.data.find((g: any) => g.game_name.toLowerCase() === lowerTitle) || json.data[0];
            
            const toH = (s: number) => s > 0 ? Math.round(s / 3600) : 0;
            return {
                main: toH(best.comp_main),
                extra: toH(best.comp_plus),
                completionist: toH(best.comp_100)
            };
        }
    } catch (e) {
        // Silent fail for API
        return null;
    }
    return null;
};

/**
 * MÉTODO B: Búsqueda con IA (Gemini + Google Search)
 */
const fetchFromAIGrounding = async (title: string): Promise<HLTBData | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Find the HowLongToBeat (HLTB) completion times for the video game "${title}". 
        I need 3 integers representing hours: "Main Story", "Main + Extra", and "Completionist".
        Return ONLY a JSON object like: {"main": 10, "extra": 15, "completionist": 30}.`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
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
         if (e.status === 429 || (e.message && e.message.includes('429'))) {
            console.warn(`[HLTB AI] Quota exceeded for: ${title}`);
         } else {
            console.error("AI Grounding failed:", e);
         }
    }
    return null;
};

/**
 * Orquestador de búsqueda: API -> IA -> Fallback
 */
export const searchHLTB = async (gameTitle: string): Promise<HLTBData | null> => {
    const title = cleanTitle(gameTitle);
    
    // 1. Intentar API oficial (Rápido)
    const apiResult = await fetchFromHLTBApi(title);
    if (apiResult && (apiResult.main > 0 || apiResult.extra > 0)) {
        console.log(`[Nexus] HLTB Data from API for: ${title}`, apiResult);
        return apiResult;
    }

    // 2. Si falla la API, usar IA con búsqueda real en Google
    console.log(`[Nexus] API Failed or Empty. Launching AI Grounding for: ${title}`);
    const aiResult = await fetchFromAIGrounding(gameTitle);
    if (aiResult) {
        console.log(`[Nexus] HLTB Data from AI for: ${title}`, aiResult);
        return aiResult;
    }

    return null;
};
