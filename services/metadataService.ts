
import { GoogleGenAI, Type } from "@google/genai";
import { GameMetadata } from '../types';

// Inicialización del motor de IA
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Utility to safely parse JSON from AI response, handling potential markdown code blocks
 */
const parseAIResponse = (text: string) => {
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const cleanJson = jsonMatch ? jsonMatch[0] : text;
  return JSON.parse(cleanJson);
};

/**
 * MOTOR DE DESCUBRIMIENTO NEXUS (AI-POWERED)
 * Sustituye a IGDB para evitar bloqueos de CORS y fallos de proxy.
 */
export const searchGlobalGames = async (query: string): Promise<Partial<GameMetadata>[]> => {
  if (!query || query.length < 2) return [];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Actúa como una base de datos maestra de videojuegos. 
    Busca juegos que coincidan con: "${query}". 
    Devuelve un array JSON de los 10 resultados más relevantes. 
    Es CRÍTICO que el steamAppId sea correcto para obtener la carátula de Steam CDN.
    Formato: [{ "id": number, "title": string, "releaseDate": "ISO", "platforms": [], "steamAppId": string }]`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER, description: "Un ID numérico único aleatorio" },
            title: { type: Type.STRING },
            releaseDate: { type: Type.STRING, description: "Formato ISO 8601" },
            platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
            steamAppId: { type: Type.STRING, description: "ID de Steam para la carátula" }
          },
          required: ["id", "title", "steamAppId"]
        }
      }
    }
  });

  try {
    const data = parseAIResponse(response.text);
    return data.map((g: any) => ({
      ...g,
      coverUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.steamAppId}/library_600x900.jpg`,
      bannerUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.steamAppId}/header.jpg`
    }));
  } catch (e) {
    console.error("Error parseando resultados de búsqueda AI", e);
    return [];
  }
};

export const fetchMetadata = async (id: number, title?: string): Promise<GameMetadata> => {
  const queryTitle = title || "Juego desconocido";
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Genera metadatos detallados para el videojuego: "${queryTitle}".
    Incluye sinopsis profesional, géneros, desarrolladores y tiempos de juego aproximados (HowLongToBeat style).
    Asegúrate de encontrar el steamAppId real para la carátula.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          releaseDate: { type: Type.STRING },
          genres: { type: Type.ARRAY, items: { type: Type.STRING } },
          platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
          developers: { type: Type.ARRAY, items: { type: Type.STRING } },
          publishers: { type: Type.ARRAY, items: { type: Type.STRING } },
          rating: { type: Type.NUMBER },
          aggregatedRating: { type: Type.NUMBER },
          steamAppId: { type: Type.STRING },
          timeToBeat: {
            type: Type.OBJECT,
            properties: {
              main: { type: Type.NUMBER },
              extra: { type: Type.NUMBER },
              completionist: { type: Type.NUMBER }
            }
          }
        },
        required: ["title", "description", "steamAppId", "timeToBeat"]
      }
    }
  });

  try {
    const data = parseAIResponse(response.text);
    const steamId = data.steamAppId;
    
    return {
      id: id || Math.floor(Math.random() * 1000000),
      title: data.title,
      slug: data.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      coverUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamId}/library_600x900.jpg`,
      bannerUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamId}/library_hero.jpg`,
      description: data.description,
      releaseDate: data.releaseDate || new Date().toISOString(),
      genres: data.genres || [],
      platforms: data.platforms || [],
      developers: data.developers || [],
      publishers: data.publishers || [],
      rating: data.rating || 0,
      aggregatedRating: data.aggregatedRating || data.rating || 0,
      screenshots: [
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamId}/ss_1.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamId}/ss_2.jpg`,
        `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamId}/ss_3.jpg`
      ],
      externalIds: { steam: steamId },
      timeToBeat: data.timeToBeat,
      lastSyncedAt: Date.now()
    };
  } catch (e) {
    console.error("Fetch Metadata Error:", e);
    throw new Error("No se pudieron generar los metadatos del juego.");
  }
};

export const validateIgdbCredentials = async (): Promise<{ success: boolean }> => {
  return { success: true }; 
};
