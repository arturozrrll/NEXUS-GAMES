
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { Game, GameMetadata, UserEntry, GameStatus, SortOption, Platform, SteamImportSummary } from '../types';
import { useAuth } from './AuthContext';
import { fetchMetadata, searchGlobalGames } from '../services/metadataService';
import { fetchSteamLibrary, matchSteamGamesToIGDB, calculateStatusFromPlaytime } from '../services/steamService';
import { searchHLTB } from '../services/hltbService';
import { getDiscoveryRecommendations, getReleaseDateWithAI } from '../services/aiService';

interface ActiveSession {
    gameId: number;
    startTime: number;
}

interface SteamImportState {
    isImporting: boolean;
    progress: number;
    total: number;
    stage: 'idle' | 'fetching' | 'matching' | 'complete';
    summary: SteamImportSummary | null;
}

interface DiscoveryState {
    upcoming: GameMetadata[];
    recent: GameMetadata[];
    popular: GameMetadata[];
    lastUpdated: number;
}

interface GameContextType {
  library: Game[];
  addToLibrary: (gameId: number, status: GameStatus, platform: string, preloadedMeta?: GameMetadata) => Promise<void>;
  removeFromLibrary: (gameId: number) => void;
  updateEntry: (gameId: number, data: Partial<UserEntry>) => void;
  reassignGame: (oldGameId: number, newGameId: number, preloadedMeta?: GameMetadata) => Promise<void>;
  saveMetadata: (gameId: number, data: Partial<GameMetadata>) => void; 
  syncMetadata: () => Promise<void>;
  syncGameMetadata: (gameId: number) => Promise<void>;
  syncHLTB: (gameId: number) => Promise<void>;
  activeSession: ActiveSession | null;
  launchingGameId: number | null; 
  startSession: (gameId: number) => void;
  stopSession: () => void;
  cancelLaunch: () => void; // NEW: Expose cancel function
  exportData: () => void;
  importData: (jsonData: string) => Promise<boolean>;
  importSteamLibrary: (steamInput: string) => Promise<void>;
  steamImportState: SteamImportState;
  closeImportModal: () => void;
  isLoading: boolean;
  isSyncing: boolean;
  isSyncingHLTB: boolean;
  filterStatus: GameStatus | 'All';
  setFilterStatus: (s: GameStatus | 'All') => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  getGame: (id: number) => Game | undefined;
  isAddModalOpen: boolean;
  openAddModal: () => void;
  closeAddModal: () => void;
  
  // Discovery
  discovery: DiscoveryState;
  refreshDiscovery: () => Promise<void>;
  isDiscovering: boolean;
  
  // Wishlist specific
  refreshUpcomingWishlist: () => Promise<void>;
  
  // Dashboard Hero Game (Static per session)
  heroGameId: number | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_METADATA_KEY = 'nexus_db_metadata_v1';
const STORAGE_USER_KEY = 'nexus_db_user_v1';
const STORAGE_SESSION_KEY = 'nexus_active_session_v1';
const STORAGE_DISCOVERY_KEY = 'nexus_discovery_v1';

export const GameProvider = ({ children }: { children?: ReactNode }) => {
  const { user } = useAuth();
  const [metadataCache, setMetadataCache] = useState<Map<number, GameMetadata>>(new Map());
  const [userEntries, setUserEntries] = useState<UserEntry[]>([]);
  
  // Discovery State
  const [discovery, setDiscovery] = useState<DiscoveryState>({ upcoming: [], recent: [], popular: [], lastUpdated: 0 });
  const [isDiscovering, setIsDiscovering] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingHLTB, setIsSyncingHLTB] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [launchingGameId, setLaunchingGameId] = useState<number | null>(null);
  const [steamImportState, setSteamImportState] = useState<SteamImportState>({
      isImporting: false,
      progress: 0,
      total: 0,
      stage: 'idle',
      summary: null
  });
  const [filterStatus, setFilterStatus] = useState<GameStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Hero Game State (Persisted in memory only, resets on reload)
  const [heroGameId, setHeroGameId] = useState<number | null>(null);

  // REF FOR LAUNCH TIMEOUT
  const launchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadDb = async () => {
      setIsLoading(true);
      try {
        const cachedMeta = localStorage.getItem(STORAGE_METADATA_KEY);
        if (cachedMeta) {
          const parsed = JSON.parse(cachedMeta);
          if (Array.isArray(parsed)) setMetadataCache(new Map(parsed)); 
        }
        const userKey = user ? `${STORAGE_USER_KEY}_${user.id}` : STORAGE_USER_KEY;
        const savedEntries = localStorage.getItem(userKey);
        if (savedEntries) {
          const parsed = JSON.parse(savedEntries);
          if (Array.isArray(parsed)) setUserEntries(parsed);
        }
        const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
        if (savedSession) setActiveSession(JSON.parse(savedSession));

        const savedDiscovery = localStorage.getItem(STORAGE_DISCOVERY_KEY);
        if (savedDiscovery) setDiscovery(JSON.parse(savedDiscovery));

      } catch (e) {
        console.error("DB Load Error", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadDb();
  }, [user]);

  useEffect(() => {
    if (isLoading) return;
    try {
        localStorage.setItem(STORAGE_METADATA_KEY, JSON.stringify(Array.from(metadataCache.entries())));
        const userKey = user ? `${STORAGE_USER_KEY}_${user.id}` : STORAGE_USER_KEY;
        localStorage.setItem(userKey, JSON.stringify(userEntries));
        localStorage.setItem(STORAGE_DISCOVERY_KEY, JSON.stringify(discovery));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
            alert("⚠️ ALERTA DE ALMACENAMIENTO\n\nEl almacenamiento local del navegador está lleno. Es probable que estés usando imágenes demasiado pesadas.\n\nIntenta usar URLs externas para las portadas animadas en lugar de subir archivos.");
        }
        console.error("Storage Quota Exceeded", e);
    }
  }, [metadataCache, userEntries, user, isLoading, discovery]);

  // --- HERO GAME LOGIC (Run once when library loads) ---
  useEffect(() => {
      if (!isLoading && userEntries.length > 0 && heroGameId === null) {
          const playingNow = userEntries.filter(e => e.status === GameStatus.Playing);
          if (playingNow.length > 0) {
              const randomIndex = Math.floor(Math.random() * playingNow.length);
              setHeroGameId(playingNow[randomIndex].gameId);
          }
      }
  }, [isLoading, userEntries, heroGameId]);

  const addToLibrary = async (gameId: number, status: GameStatus, platform: string, preloadedMeta?: GameMetadata) => {
    let finalMeta = preloadedMeta;

    if (!metadataCache.has(gameId)) {
        if (!preloadedMeta) {
            try {
                finalMeta = await fetchMetadata(gameId);
            } catch (e) {
                alert("No se pudieron obtener datos del juego.");
                return;
            }
        }
        setMetadataCache(prev => new Map(prev).set(gameId, finalMeta!));
    }

    if (userEntries.some(e => e.gameId === gameId)) return;

    // Use metadata from cache if not passed, or the one we just fetched
    const metaToUse = finalMeta || metadataCache.get(gameId);
    
    // AUTO-PLATFORM LOGIC: If Steam ID exists, force platform to Steam
    let finalPlatform = platform;
    if (metaToUse?.steamAppId) {
        finalPlatform = Platform.Steam;
    }

    const newEntry: UserEntry = {
        gameId,
        userId: user?.id || 'guest',
        status,
        platform: finalPlatform,
        userRating: 0,
        hoursPlayed: 0,
        addedAt: Date.now(),
        lastInteractedAt: Date.now(),
        startedAt: status === GameStatus.Playing ? Date.now() : undefined,
        completedAt: status === GameStatus.Completed ? Date.now() : undefined,
        isPinned: false, // Default to not pinned
        launchDelay: 20, // Default launch delay in seconds
        
        // --- COPIA AUTOMÁTICA DEL ID DE STEAM ---
        steamAppId: metaToUse?.steamAppId
    };

    setUserEntries(prev => [newEntry, ...prev]);

    // BACKGROUND HLTB SYNC
    const gameTitle = metaToUse?.title;
    if (gameTitle) {
        // We use a detached promise here to not block the UI
        searchHLTB(gameTitle).then(result => {
            if (result && (result.main > 0 || result.extra > 0)) {
                saveMetadata(gameId, { timeToBeat: result });
            }
        }).catch(err => console.warn("Background HLTB Sync failed", err));
    }
  };

  const removeFromLibrary = (gameId: number) => {
    setUserEntries(prev => prev.filter(e => e.gameId !== gameId));
    if (activeSession?.gameId === gameId) stopSession();
  };

  const updateEntry = (gameId: number, data: Partial<UserEntry>) => {
    setUserEntries(prev => prev.map(e => e.gameId === gameId ? { 
        ...e,
        ...data,
        // Only update timestamp if it's not a pinning action, to avoid reordering list unexpectedly when pinning
        lastInteractedAt: data.isPinned !== undefined ? e.lastInteractedAt : Date.now()
    } : e));
  };

  const saveMetadata = (gameId: number, data: Partial<GameMetadata>) => {
      setMetadataCache(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(gameId);
          if (current) {
              newMap.set(gameId, Object.assign({}, current, data));
          }
          return newMap;
      });
  };

  const reassignGame = async (oldGameId: number, newGameId: number, preloadedMeta?: GameMetadata) => {
      if (userEntries.some(e => e.gameId === newGameId && e.gameId !== oldGameId)) {
          alert("El juego seleccionado ya existe en tu biblioteca.");
          throw new Error("Duplicate");
      }
      
      if (preloadedMeta) {
          setMetadataCache(prev => new Map(prev).set(newGameId, preloadedMeta));
      } else if (!metadataCache.has(newGameId)) {
          const meta = await fetchMetadata(newGameId);
          setMetadataCache(prev => new Map(prev).set(newGameId, meta));
      }

      setUserEntries(prev => prev.map(e => {
        if (e.gameId === oldGameId) {
            // Preserve logic but change ID
            return Object.assign({}, e, { gameId: newGameId, lastInteractedAt: Date.now() });
        }
        return e;
      }));
  };

  // --- DISCOVERY LOGIC (THROTTLED) ---
  const refreshDiscovery = async () => {
      setIsDiscovering(true);
      try {
          const { upcoming: upcomingTitles, recent: recentTitles, popular: popularTitles } = await getDiscoveryRecommendations();
          
          // Throttled Fetcher to avoid IGDB 429
          const fetchThrottled = async (titles: string[]) => {
              const results: GameMetadata[] = [];
              for (const title of titles) {
                  try {
                      // Small delay between requests
                      await new Promise(r => setTimeout(r, 300));
                      const searchResults = await searchGlobalGames(title);
                      if (searchResults.length > 0) {
                          results.push(searchResults[0] as GameMetadata);
                      }
                  } catch (e) {
                      console.warn(`Discovery fetch failed for ${title}`, e);
                  }
              }
              return results;
          };

          const upcomingRaw = await fetchThrottled(upcomingTitles);
          const recentRaw = await fetchThrottled(recentTitles);
          const popularRaw = await fetchThrottled(popularTitles);
          
          const now = new Date();
          const ONE_DAY_MS = 24 * 60 * 60 * 1000;
          const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

          // STRICT FILTERING to prevent hallucination issues
          // Upcoming must be in the future
          const verifiedUpcoming = upcomingRaw.filter(g => new Date(g.releaseDate) > now);
          
          // Recent must be strictly within last 30 days
          const verifiedRecent = recentRaw.filter(g => {
             const release = new Date(g.releaseDate);
             const diff = now.getTime() - release.getTime();
             return diff >= 0 && diff <= 45 * ONE_DAY_MS; // slightly relaxed for recent
          });

          // Popular is timeless (based on active players) but filtered by AI

          setDiscovery({
              upcoming: verifiedUpcoming,
              recent: verifiedRecent,
              popular: popularRaw, 
              lastUpdated: Date.now()
          });

      } catch (e) {
          console.error("Discovery refresh failed", e);
      } finally {
          setIsDiscovering(false);
      }
  };

  // --- SESSION LOGIC ---
  const startSession = (gameId: number) => {
      if (launchingGameId === gameId) return;
      
      const game = library.find(g => g.id === gameId);
      if (!game) return;
      
      if (activeSession) stopSession();
      
      // Clear previous timeout if exists
      if (launchTimeoutRef.current) {
          clearTimeout(launchTimeoutRef.current);
      }

      setLaunchingGameId(gameId);
      
      // Launch external URL immediately
      if (game.customLaunchUrl) window.open(game.customLaunchUrl, '_self');
      else if (game.steamAppId) window.location.href = `steam://rungameid/${game.steamAppId}`;
      
      // GET LAUNCH DELAY (Default to 20s if not set)
      const delaySeconds = game.launchDelay !== undefined ? game.launchDelay : 20;
      const delayMs = delaySeconds * 1000;

      // Delay session tracking based on user setting
      launchTimeoutRef.current = setTimeout(() => {
          setLaunchingGameId(null);
          setActiveSession({ gameId, startTime: Date.now() });
          if (game.status === GameStatus.Backlog) updateEntry(gameId, { status: GameStatus.Playing });
          launchTimeoutRef.current = null;
      }, delayMs);
  };

  const stopSession = () => {
      if (!activeSession) return;
      const elapsedMs = Date.now() - activeSession.startTime;
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      const entry = userEntries.find(e => e.gameId === activeSession.gameId);
      if (entry) {
          updateEntry(activeSession.gameId, {
              hoursPlayed: (entry.hoursPlayed || 0) + elapsedHours,
              lastInteractedAt: Date.now()
          });
      }
      setActiveSession(null);
  };

  const cancelLaunch = () => {
      if (launchTimeoutRef.current) {
          clearTimeout(launchTimeoutRef.current);
          launchTimeoutRef.current = null;
      }
      setLaunchingGameId(null);
  };

  const exportData = () => {
    const data = { version: 1, userEntries, metadata: Array.from(metadataCache.entries()) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nexus_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importData = async (jsonString: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonString);
      setMetadataCache(new Map(data.metadata));
      setUserEntries(data.userEntries);
      return true;
    } catch (e) {
      return false;
    }
  };

  const syncMetadata = async () => {
    setIsSyncing(true);
    for (const entry of userEntries) {
        try {
            const fresh = await fetchMetadata(entry.gameId);
            saveMetadata(entry.gameId, fresh);
        } catch (e) {}
    }
    setIsSyncing(false);
  };

  const syncGameMetadata = async (gameId: number) => {
      setIsSyncing(true);
      try {
          const fresh = await fetchMetadata(gameId);
          saveMetadata(gameId, fresh);
      } catch (e) {
          console.error("Single sync failed", e);
      } finally {
          setIsSyncing(false);
      }
  };

  const syncHLTB = async (gameId: number) => {
      const game = library.find(g => g.id === gameId);
      if (!game) return;
      setIsSyncingHLTB(true);
      try {
          const result = await searchHLTB(game.title);
          // Only save if we got valid results to avoid overwriting with zeros
          if (result && (result.main > 0 || result.extra > 0 || result.completionist > 0)) {
              saveMetadata(gameId, { timeToBeat: result });
          } else if (result) {
              console.warn("HLTB Sync returned empty data, skipping update.");
          }
      } catch (e) {
          console.error("HLTB Manual Sync Failed", e);
      } finally {
          setIsSyncingHLTB(false);
      }
  };
  
  const importSteamLibrary = async (steamInput: string) => {
      setSteamImportState({ isImporting: true, progress: 0, total: 0, stage: 'fetching', summary: null });
      try {
          const steamGames = await fetchSteamLibrary(steamInput);
          setSteamImportState((prev: SteamImportState) => ({ ...prev, stage: 'matching', total: steamGames.length }));
          const matchedGames = await matchSteamGamesToIGDB(steamGames, (current, total) => setSteamImportState((prev: SteamImportState) => ({ ...prev, progress: current })));
          const updatedEntries = [...userEntries];
          for (const match of matchedGames) {
              if (!metadataCache.has(match.igdbId)) {
                  try {
                      const meta = await fetchMetadata(match.igdbId);
                      setMetadataCache(prev => new Map(prev).set(match.igdbId, meta));
                  } catch (e) { continue; }
              }
              const playtimeHours = parseFloat((match.steamGame.playtime_forever / 60).toFixed(1));
              const existingIndex = updatedEntries.findIndex(e => e.gameId === match.igdbId);
              if (existingIndex > -1) {
                  const currentEntry = updatedEntries[existingIndex];
                  updatedEntries[existingIndex] = Object.assign({}, currentEntry, { hoursPlayed: Math.max(currentEntry.hoursPlayed, playtimeHours), lastInteractedAt: Date.now(), steamAppId: match.steamGame.appid, platform: Platform.Steam });
              } else {
                  updatedEntries.push({
                      gameId: match.igdbId, userId: user?.id || 'guest',
                      status: calculateStatusFromPlaytime(match.steamGame.playtime_forever, match.steamGame.rtime_last_played),
                      platform: Platform.Steam, userRating: 0, hoursPlayed: playtimeHours, addedAt: Date.now(), lastInteractedAt: Date.now(),
                      steamAppId: match.steamGame.appid,
                      isPinned: false
                  });
              }
          }
          setUserEntries(updatedEntries);
          setSteamImportState((prev: SteamImportState) => ({ ...prev, stage: 'complete' }));
      } catch (error) {
          setSteamImportState((prev: SteamImportState) => ({ ...prev, isImporting: false }));
      }
  };

  // --- REFRESH RELEASE DATES (THROTTLED) ---
  const refreshUpcomingWishlist = async () => {
      setIsSyncing(true);
      try {
          // Filter: Wishlist AND (Upcoming OR Recently Released but we missed it)
          const targetGames = library.filter(g => g.status === GameStatus.Wishlist);

          if (targetGames.length === 0) {
              alert("No tienes juegos en tu lista de deseos.");
              return;
          }

          let updatedCount = 0;
          
          // Throttled Execution to prevent 429
          for (const game of targetGames) {
               await new Promise(r => setTimeout(r, 200)); // Delay between requests
               
               let freshDate: string | undefined = undefined;
               try {
                  // 1. Try IGDB
                  const freshMeta = await fetchMetadata(game.id);
                  freshDate = freshMeta.releaseDate;
              } catch (e) {
                  // 2. Fallback to AI if IGDB fails (e.g. ID mismatch or game not found)
                  console.warn(`[IGDB Fail] ${game.title} - Attempting AI Grounding...`);
                  const aiDate = await getReleaseDateWithAI(game.title);
                  if (aiDate) {
                      freshDate = aiDate;
                  }
              }

              if (freshDate) {
                  // Robust Comparison
                  const oldDate = new Date(game.releaseDate);
                  const newDate = new Date(freshDate);
                  
                  // Reset hours for pure date comparison
                  oldDate.setHours(0,0,0,0);
                  newDate.setHours(0,0,0,0);

                  if (oldDate.getTime() !== newDate.getTime()) {
                      console.log(`[Date Update] ${game.title}: ${game.releaseDate} -> ${freshDate}`);
                      saveMetadata(game.id, { releaseDate: freshDate });
                      updatedCount++;
                  }
              }
          }

          if (updatedCount > 0) {
              alert(`Se han actualizado las fechas de ${updatedCount} juegos. 📅`);
          } else {
              alert("Todas las fechas están al día.");
          }

      } catch (e) {
          console.error("Refresh Wishlist Failed", e);
          alert("Error al sincronizar fechas.");
      } finally {
          setIsSyncing(false);
      }
  };

  const library = useMemo(() => {
    if (isLoading) return [];
    const joined = userEntries.map(entry => {
        const meta = metadataCache.get(entry.gameId);
        return meta ? Object.assign({}, meta, entry, { id: meta.id }) : null;
    }).filter(g => g !== null) as Game[]; 

    let result = joined;
    if (filterStatus !== 'All') result = result.filter(g => g.status === filterStatus);
    if (searchQuery) result = result.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return result.sort((a, b) => {
        switch (sortBy) {
            case 'rating': return (b.aggregatedRating || 0) - (a.aggregatedRating || 0);
            case 'playtime': return b.hoursPlayed - a.hoursPlayed;
            case 'release': return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
            case 'name': return a.title.localeCompare(b.title);
            default: return (b.lastInteractedAt || 0) - (a.lastInteractedAt || 0);
        }
    });
  }, [userEntries, metadataCache, filterStatus, searchQuery, sortBy, isLoading]);

  return (
    <GameContext.Provider value={{
      library, addToLibrary, removeFromLibrary, updateEntry, reassignGame, saveMetadata, syncMetadata, syncGameMetadata, syncHLTB, exportData, importData,
      isLoading, isSyncing, isSyncingHLTB, filterStatus, setFilterStatus, searchQuery, setSearchQuery, sortBy, setSortBy, getGame: (id) => library.find(g => g.id === id),
      activeSession, launchingGameId, startSession, stopSession, cancelLaunch, isAddModalOpen, openAddModal: () => setIsAddModalOpen(true), closeAddModal: () => setIsAddModalOpen(false),
      importSteamLibrary, steamImportState, closeImportModal: () => setSteamImportState(prev => ({ ...prev, isImporting: false })),
      discovery, refreshDiscovery, isDiscovering, refreshUpcomingWishlist,
      heroGameId
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGameContext error');
  return context;
};
