
import { GameMetadata } from '../types';

const getClientId = () => localStorage.getItem('nexus_igdb_client_id') || '';
const getToken = () => localStorage.getItem('nexus_igdb_token') || '';

const PROXY_URL = 'https://corsproxy.io/?';
const IGDB_BASE_URL = 'https://api.igdb.com/v4';

const formatIgdbImage = (url: string | undefined, size: 't_cover_big' | 't_720p' | 't_screenshot_huge' = 't_cover_big') => {
  if (!url) return 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=900&auto=format&fit=crop';
  const fullUrl = url.startsWith('http') ? url : `https:${url}`;
  return fullUrl.replace('t_thumb', size);
};

export const searchGlobalGames = async (query: string): Promise<Partial<GameMetadata>[]> => {
  if (!query || query.length < 2) return [];

  try {
    const targetUrl = `${IGDB_BASE_URL}/games`;
    const body = `search "${query}"; fields name, cover.url, first_release_date, platforms.name; limit 10;`;

    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`, {
      method: 'POST',
      headers: {
        'Client-ID': getClientId(),
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'text/plain'
      },
      body
    });

    if (!response.ok) throw new Error(`IGDB Search Error: ${response.status}`);

    const data = await response.json();
    
    return data.map((g: any) => ({
      id: g.id,
      title: g.name,
      releaseDate: g.first_release_date ? new Date(g.first_release_date * 1000).toISOString() : undefined,
      platforms: g.platforms?.map((p: any) => p.name) || [],
      coverUrl: formatIgdbImage(g.cover?.url, 't_cover_big'),
      bannerUrl: formatIgdbImage(g.cover?.url, 't_720p')
    }));
  } catch (e) {
    console.error("Error en búsqueda IGDB:", e);
    return [];
  }
};

export const fetchMetadata = async (id: number, title?: string): Promise<GameMetadata> => {
  try {
    const targetUrl = `${IGDB_BASE_URL}/games`;
    const body = `fields name, summary, cover.url, first_release_date, genres.name, involved_companies.developer, involved_companies.company.name, platforms.name, screenshots.url, aggregated_rating, rating, websites.url, websites.category; where id = ${id};`;

    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`, {
      method: 'POST',
      headers: {
        'Client-ID': getClientId(),
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'text/plain'
      },
      body
    });

    if (!response.ok) throw new Error(`IGDB Fetch Error: ${response.status}`);

    const results = await response.json();
    if (!results || results.length === 0) throw new Error("Juego no encontrado en IGDB");
    
    const g = results[0];
    
    const developers = g.involved_companies?.filter((c: any) => c.developer)?.map((c: any) => c.company.name) || [];
    const publishers = g.involved_companies?.filter((c: any) => !c.developer)?.map((c: any) => c.company.name) || [];
    const steamWebsite = g.websites?.find((w: any) => w.category === 13);
    const steamAppId = steamWebsite ? steamWebsite.url.split('/').filter(Boolean).pop() : undefined;

    return {
      id: g.id,
      title: g.name,
      slug: g.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      coverUrl: formatIgdbImage(g.cover?.url, 't_cover_big'),
      bannerUrl: g.screenshots?.[0] ? formatIgdbImage(g.screenshots[0].url, 't_720p') : formatIgdbImage(g.cover?.url, 't_720p'),
      description: g.summary || 'Sin descripción disponible.',
      releaseDate: g.first_release_date ? new Date(g.first_release_date * 1000).toISOString() : new Date().toISOString(),
      genres: g.genres?.map((gen: any) => gen.name) || [],
      platforms: g.platforms?.map((p: any) => p.name) || [],
      developers: developers.length > 0 ? developers : ['Desconocido'],
      publishers: publishers.length > 0 ? publishers : ['Desconocido'],
      rating: g.rating || 0,
      aggregatedRating: g.aggregated_rating || g.rating || 0,
      screenshots: g.screenshots?.slice(0, 4).map((s: any) => formatIgdbImage(s.url, 't_720p')) || [],
      externalIds: { igdb: g.id.toString(), steam: steamAppId },
      steamAppId: steamAppId ? parseInt(steamAppId) : undefined,
      // Tiempos vacíos inicialmente para no bloquear la carga
      timeToBeat: { main: 0, extra: 0, completionist: 0 },
      lastSyncedAt: Date.now()
    };
  } catch (e) {
    console.error("Fetch Metadata Error:", e);
    throw new Error("No se pudieron obtener los datos de IGDB.");
  }
};
