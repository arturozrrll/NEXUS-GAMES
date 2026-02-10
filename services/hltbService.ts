
import { HLTBData } from '../types';

// Fallback database for popular games to ensure UI never breaks even if API is blocked
const FALLBACK_DB: Record<string, HLTBData> = {
    "elden ring": { main: 55, extra: 100, completionist: 132 },
    "god of war": { main: 21, extra: 32, completionist: 51 },
    "cyberpunk 2077": { main: 24, extra: 60, completionist: 103 },
    "the witcher 3: wild hunt": { main: 52, extra: 103, completionist: 173 },
    "hollow knight": { main: 27, extra: 41, completionist: 60 },
    "baldur's gate 3": { main: 60, extra: 110, completionist: 160 },
    "hades": { main: 22, extra: 45, completionist: 96 },
    "stardew valley": { main: 53, extra: 115, completionist: 155 },
    "red dead redemption 2": { main: 50, extra: 80, completionist: 170 },
    "minecraft": { main: 70, extra: 150, completionist: 400 },
};

// Usamos corsproxy.io que es el más estable para este tipo de payload
const PROXY_URL = 'https://corsproxy.io/?'; 
const HLTB_API = 'https://howlongtobeat.com/api/search';

export const searchHLTB = async (gameTitle: string): Promise<HLTBData | null> => {
  // 1. Check Fallback/Cache First (Instant)
  const normalizedTitle = gameTitle.toLowerCase().trim();
  if (FALLBACK_DB[normalizedTitle]) {
      return FALLBACK_DB[normalizedTitle];
  }

  // 2. Try API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); 

  try {
    const body = {
      searchType: "games",
      searchTerms: [gameTitle],
      searchPage: 1,
      size: 5,
      searchOptions: {
        games: {
          userId: 0,
          platform: "",
          sortCategory: "popular",
          rangeCategory: "main",
          rangeTime: { min: 0, max: 0 },
          gameplay: { perspective: "", flow: "", genre: "" },
          modifier: ""
        },
        users: { sortCategory: "postcount" },
        filter: "",
        sort: 0,
        randomizer: 0
      }
    };

    const targetUrl = `${PROXY_URL}${encodeURIComponent(HLTB_API)}`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HLTB Network error: ${response.status}`);

    const data = await response.json();
    
    if (data && data.data && data.data.length > 0) {
      // Fuzzy match selection
      const bestMatch = data.data.find((g: any) => 
          g.game_name.toLowerCase() === normalizedTitle
      ) || data.data[0];
      
      const convert = (val: number) => {
          if (!val) return 0;
          return val > 1000 ? Math.round(val / 3600) : Math.round(val);
      };

      return {
        main: convert(bestMatch.comp_main),
        extra: convert(bestMatch.comp_plus),
        completionist: convert(bestMatch.comp_100)
      };
    }
  } catch (error) {
     // Silent fail
  }

  // Si falla, devolvemos null para que el sistema use los datos de IGDB (time_to_beat)
  return null;
};
