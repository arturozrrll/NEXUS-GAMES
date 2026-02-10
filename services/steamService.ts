
import Fuse from 'fuse.js';
import { GameStatus } from '../types';
import { searchGlobalGames, fetchMetadata } from './metadataService';

// --- CONFIG ---
const STEAM_API_KEY = '474C67B4C92180B9E5A7689BB55D98AF'; // User Provided Key

// Usamos el mismo proxy principal que en metadataService por consistencia
const PROXY_URL = 'https://corsproxy.io/?'; 

const fetchWithProxy = async (targetUrl: string) => {
    try {
        const res = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error(`Proxy failed with status: ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn('Proxy failed, attempting direct fetch (CORS Extension required)...', e);
        // Fallback directo por si el usuario tiene extensión CORS
        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error('Direct fetch failed');
        return await res.json();
    }
};

// --- TYPES ---
interface SteamGame {
    appid: number;
    name: string;
    playtime_forever: number; // minutes
    rtime_last_played: number; // unix
    img_icon_url?: string;
}

export interface MappedGame {
    steamGame: SteamGame;
    igdbId: number;
    confidence: number;
    isFallback: boolean; // NEW: Flag to indicate if we are using Steam data only
    fallbackData?: {
        coverUrl: string;
        bannerUrl: string;
    }
}

/**
 * RESOLVE STEAM ID
 * Strictly requires SteamID64 or Custom URL part.
 */
export const resolveSteamId = async (input: string): Promise<string> => {
    let cleanInput = input.trim();

    // 1. Handle Full URL Paste
    if (cleanInput.includes('steamcommunity.com')) {
        // Remove trailing slash
        if (cleanInput.endsWith('/')) cleanInput = cleanInput.slice(0, -1);
        const parts = cleanInput.split('/');
        cleanInput = parts[parts.length - 1]; // Get the last part
    }

    // 2. If it is a SteamID64 (17 digits), return immediately
    if (/^\d{17}$/.test(cleanInput)) {
        return cleanInput;
    }

    // 3. Resolve Vanity URL via API
    try {
        const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${cleanInput}`;
        const data = await fetchWithProxy(url);

        if (data.response && data.response.success === 1) {
            return data.response.steamid;
        } else {
            throw new Error('No se encontró el usuario. Asegúrate de usar tu ID personalizado o SteamID64.');
        }
    } catch (e: any) {
        console.error("Steam ID Resolution Error", e);
        throw new Error(e.message || 'Error al conectar con Steam.');
    }
};

/**
 * FETCH OWNED GAMES (OFFICIAL API)
 */
export const fetchSteamLibrary = async (steamInput: string): Promise<SteamGame[]> => {
    try {
        // 1. Get the numeric ID
        const steamId = await resolveSteamId(steamInput);

        // 2. Call GetOwnedGames
        const apiUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`;
        
        const data = await fetchWithProxy(apiUrl);

        if (!data.response) {
            throw new Error("Respuesta inválida de Steam.");
        }

        // CRITICAL FIX: If 'games' is missing, it usually means Private Profile
        if (!data.response.games) {
            if (JSON.stringify(data).includes("{}")) {
                 throw new Error("Tu perfil de Steam es PRIVADO. Debes hacerlo público en Ajustes de Privacidad para importar juegos.");
            }
            return []; // Should not happen if public, but safe fallback
        }

        return data.response.games.map((g: any) => ({
            appid: g.appid,
            name: g.name,
            playtime_forever: g.playtime_forever || 0,
            rtime_last_played: g.rtime_last_played || 0,
            img_icon_url: g.img_icon_url ? `http://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg` : undefined
        }));

    } catch (error: any) {
        console.error("Steam Sync Error:", error);
        throw new Error(error.message || 'Steam Sync Failed');
    }
};

// --- INTELLIGENT MATCHING (The Core Logic) ---

export const matchSteamGamesToIGDB = async (
    steamGames: SteamGame[], 
    onProgress: (current: number, total: number) => void
): Promise<MappedGame[]> => {
    
    const matched: MappedGame[] = [];
    const total = steamGames.length;
    let processed = 0;
    const BATCH_SIZE = 4; // Slightly increased batch size
    
    for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = steamGames.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (steamGame) => {
            let foundMatch = false;

            // 0. Filter Garbage
            if (steamGame.name.includes('SDK') || steamGame.name.includes('Driver') || steamGame.name.includes('Server')) {
                 // Skip strict tools, but keep games
            }

            try {
                // 1. Clean Name for Better Matching
                const cleanName = steamGame.name
                    .replace(/Game of the Year Edition/gi, '')
                    .replace(/GOTY/gi, '')
                    .replace(/Directors Cut/gi, '')
                    .replace(/[^a-zA-Z0-9 ]/g, " ")
                    .trim();

                const results = await searchGlobalGames(cleanName);
                
                if (results.length > 0) {
                    const fuse = new Fuse(results, {
                        keys: ['title'],
                        includeScore: true,
                        threshold: 0.4
                    });
                    
                    const bestMatch = fuse.search(steamGame.name)[0];
                    
                    // High Confidence Match
                    if (bestMatch && bestMatch.score !== undefined && bestMatch.score < 0.4) { 
                        matched.push({
                            steamGame,
                            igdbId: bestMatch.item.id!,
                            confidence: 1 - bestMatch.score,
                            isFallback: false
                        });
                        foundMatch = true;
                    } 
                    // Exact First Result Match
                    else if (results[0].title.toLowerCase() === steamGame.name.toLowerCase()) {
                         matched.push({
                            steamGame,
                            igdbId: results[0].id!,
                            confidence: 1.0,
                            isFallback: false
                        });
                        foundMatch = true;
                    }
                }
            } catch (e) {
                // Network error on search, will proceed to fallback
            }

            // 2. FALLBACK MECHANISM (The Ghost Entry)
            // If API failed, returned no results, or low confidence, WE ADD IT ANYWAY.
            // We use Steam's CDN to generate high-quality covers.
            if (!foundMatch) {
                matched.push({
                    steamGame,
                    igdbId: steamGame.appid, // Use Steam AppID as ID for fallback entries
                    confidence: 0,
                    isFallback: true,
                    fallbackData: {
                        // High Res Steam Library Vertical Cover
                        coverUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamGame.appid}/library_600x900.jpg`,
                        // Steam Header Image for Banner
                        bannerUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamGame.appid}/header.jpg`
                    }
                });
            }
        }));

        processed += batch.length;
        onProgress(Math.min(processed, total), total);
        await new Promise(resolve => setTimeout(resolve, 300)); // Reduced delay slightly
    }

    return matched;
};

export const calculateStatusFromPlaytime = (minutes: number, lastPlayed: number): GameStatus => {
    const hours = minutes / 60;
    const daysSincePlayed = (Date.now() / 1000 - lastPlayed) / 86400;

    // Steam Import Logic: If I own it on Steam, it is NOT wishlist. It is at least Backlog.
    if (hours < 0.2) return GameStatus.Backlog; 
    if (hours < 2) return GameStatus.Playing; 
    if (daysSincePlayed > 180 && hours > 5) return GameStatus.Dropped; 
    if (hours > 20 && daysSincePlayed > 30) return GameStatus.Completed; 
    return GameStatus.Playing; 
};
