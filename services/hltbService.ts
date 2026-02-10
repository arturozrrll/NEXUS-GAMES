
import { HLTBData } from '../types';
// Corrected import: Type must be imported from @google/genai, not from types.ts
import { GoogleGenAI, Type } from "@google/genai";

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
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) return null;
        const json = await response.json();
        
        if (json && json.data && json.data.length > 0) {
            const best = json.data[0];
            const toH = (s: number) => s > 0 ? Math.round(s / 3600) : 0;
            return {
                main: toH(best.comp_main),
                extra: toH(best.comp_plus),
                completionist: toH(best.comp_100)
            };
        }
    } catch (e) {
        return null;
    }
    return null;
};

/**
 * MÉTODO B: Búsqueda con IA (Gemini + Google Search)
 * Este es el "donde sea" que garantiza resultados reales si la API falla.
 */
const fetchFromAIGrounding = async (title: string): Promise<HLTBData | null> => {
    try {
        // Correct initialization of GoogleGenAI using process.env.API_KEY
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Find the HowLongToBeat (HLTB) times for the video game "${title}". 
        I need the "Main Story", "Main + Extra" and "Completionist" times in hours. 
        Return ONLY a JSON object with this structure: {"main": number, "extra": number, "completionist": number}. 
        If you are unsure, provide your best estimate based on your knowledge base.`;

        // Using googleSearch for grounding as it relates to external up-to-date info (HLTB times).
        // Using responseSchema for structured output as recommended by the guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        main: { type: Type.NUMBER },
                        extra: { type: Type.NUMBER },
                        completionist: { type: Type.NUMBER }
                    },
                    required: ["main", "extra", "completionist"]
                }
            }
        });

        // Use the .text property to access the response content (not a method).
        const text = response.text?.trim();
        if (text) {
            try {
                // Grounding with search can sometimes return non-JSON even with MIME type set.
                const data = JSON.parse(text);
                return {
                    main: Number(data.main) || 0,
                    extra: Number(data.extra) || 0,
                    completionist: Number(data.completionist) || 0
                };
            } catch (parseError) {
                console.warn("Failed to parse JSON from AI response with grounding:", text);
                // Fallback regex to extract numbers if JSON parsing fails
                const hours = text.match(/\d+/g);
                if (hours && hours.length >= 3) {
                    return {
                        main: parseInt(hours[0]),
                        extra: parseInt(hours[1]),
                        completionist: parseInt(hours[2])
                    };
                }
            }
        }
    } catch (e) {
        console.error("AI Grounding failed:", e);
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
    if (apiResult && apiResult.main > 0) {
        console.log(`[Nexus] HLTB Data from API for: ${title}`);
        return apiResult;
    }

    // 2. Si falla la API (99% de los casos actuales), usar IA con búsqueda real en Google
    // Esto buscará en la web real y extraerá los datos de HLTB.
    console.log(`[Nexus] API Failed. Launching AI Grounding for: ${title}`);
    const aiResult = await fetchFromAIGrounding(gameTitle);
    if (aiResult) {
        return aiResult;
    }

    // 3. Fallback final si todo lo anterior falla
    return { main: 0, extra: 0, completionist: 0 };
};
