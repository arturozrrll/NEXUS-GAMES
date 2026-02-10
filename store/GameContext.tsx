import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Game, GameMetadata, UserEntry, GameStatus, SortOption, Platform, SteamImportSummary } from '../types';
import { useAuth } from './AuthContext';
import { fetchMetadata } from '../services/metadataService';
import { fetchSteamLibrary, matchSteamGamesToIGDB, calculateStatusFromPlaytime } from '../services/steamService';

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

interface GameContextType {
  // The "View" (Joined Data)
  library: Game[];
  
  // Actions
  addToLibrary: (gameId: number, status: GameStatus, platform: string, preloadedMeta?: GameMetadata) => Promise<void>;
  removeFromLibrary: (gameId: number) => void;
  updateEntry: (gameId: number, data: Partial<UserEntry>) => void;
  reassignGame: (oldGameId: number, newGameId: number, preloadedMeta?: GameMetadata) => Promise<void>;
  saveMetadata: (gameId: number, data: Partial<GameMetadata>) => void; // NEW: Manual Edit
  syncMetadata: () => Promise<void>;
  
  // Timer Actions
  activeSession: ActiveSession | null;
  launchingGameId: number | null; // NEW: To show loading state during the 5s cooldown
  startSession: (gameId: number) => void;
  stopSession: () => void;
  
  // Data Management
  exportData: () => void;
  importData: (jsonData: string) => Promise<boolean>;

  // Steam Actions
  importSteamLibrary: (steamInput: string) => Promise<void>;
  steamImportState: SteamImportState;
  closeImportModal: () => void;
  
  // State
  isLoading: boolean;
  isSyncing: boolean;
  
  // Filters & Sort
  filterStatus: GameStatus | 'All';
  setFilterStatus: (s: GameStatus | 'All') => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  
  // Accessors
  getGame: (id: number) => Game | undefined;
  
  // UI Controls
  isAddModalOpen: boolean;
  openAddModal: () => void;
  closeAddModal: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// KEYS
const STORAGE_METADATA_KEY = 'nexus_db_metadata_v1';
const STORAGE_USER_KEY = 'nexus_db_user_v1';
const STORAGE_SESSION_KEY = 'nexus_active_session_v1';

export const GameProvider = ({ children }: { children?: ReactNode }) => {
  const { user } = useAuth();
  
  // --- DATABASE TABLES ---
  const [metadataCache, setMetadataCache] = useState<Map<number, GameMetadata>>(new Map());
  const [userEntries, setUserEntries] = useState<UserEntry[]>([]);
  
  // --- UI STATE ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [launchingGameId, setLaunchingGameId] = useState<number | null>(null);
  
  // --- STEAM IMPORT STATE ---
  const [steamImportState, setSteamImportState] = useState<SteamImportState>({
      isImporting: false,
      progress: 0,
      total: 0,
      stage: 'idle',
      summary: null
  });
  
  // --- VIEW STATE ---
  const [filterStatus, setFilterStatus] = useState<GameStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // 1. Load DB on Mount
  useEffect(() => {
    const loadDb = async () => {
      setIsLoading(true);
      try {
        // Load Cache
        const cachedMeta = localStorage.getItem(STORAGE_METADATA_KEY);
        if (cachedMeta) {
          const parsed = JSON.parse(cachedMeta);
          if (Array.isArray(parsed)) {
             setMetadataCache(new Map(parsed)); // Rehydrate Map
          }
        }

        // Load User Library
        const userKey = user ? `${STORAGE_USER_KEY}_${user.id}` : STORAGE_USER_KEY;
        const savedEntries = localStorage.getItem(userKey);
        if (savedEntries) {
          const parsed = JSON.parse(savedEntries);
          if (Array.isArray(parsed)) {
            setUserEntries(parsed);
          } else {
            setUserEntries([]);
          }
        }

        // Load Active Session
        const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
        if (savedSession) {
            setActiveSession(JSON.parse(savedSession));
        }

      } catch (e) {
        console.error("DB Load Error", e);
        setUserEntries([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadDb();
  }, [user]);

  // 2. Persist DB on Change
  useEffect(() => {
    if (isLoading) return;
    
    // Save Cache (Map to Array for JSON)
    localStorage.setItem(STORAGE_METADATA_KEY, JSON.stringify(Array.from(metadataCache.entries())));
    
    // Save User Data
    const userKey = user ? `${STORAGE_USER_KEY}_${user.id}` : STORAGE_USER_KEY;
    localStorage.setItem(userKey, JSON.stringify(userEntries));
  }, [metadataCache, userEntries, user, isLoading]);

  // 3. Persist Session
  useEffect(() => {
      if (activeSession) {
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(activeSession));
      } else {
          localStorage.removeItem(STORAGE_SESSION_KEY);
      }
  }, [activeSession]);

  // --- ACTIONS ---

  const addToLibrary = async (gameId: number, status: GameStatus, platform: string, preloadedMeta?: GameMetadata) => {
    // 1. Check if metadata exists in cache
    if (!metadataCache.has(gameId)) {
        if (preloadedMeta) {
            // OPTIMISTIC SAVE: Use the data passed from the modal (Instant, no fetch)
            setMetadataCache(prev => new Map(prev).set(gameId, preloadedMeta));

            // SELF-HEALING LOGIC:
            // If the description is missing or is the placeholder, trigger a silent background repair
            if (!preloadedMeta.description || preloadedMeta.description.includes('añadido manualmente') || preloadedMeta.description.includes('Procesando metadatos')) {
                console.log("Detectados metadatos incompletos. Iniciando reparación en segundo plano...");
                fetchMetadata(gameId).then((freshMeta) => {
                    setMetadataCache(prev => new Map(prev).set(gameId, freshMeta));
                }).catch(err => console.warn("Background repair failed:", err));
            }
        } else {
            try {
                const freshMeta = await fetchMetadata(gameId);
                setMetadataCache(prev => new Map(prev).set(gameId, freshMeta));
            } catch (e) {
                // If preloadedMeta is missing AND fetch fails, we can't add it.
                // But AddGameModal should have handled this by passing partial preloadedMeta
                alert("No se pudieron obtener datos del juego. Inténtalo de nuevo más tarde.");
                return;
            }
        }
    }

    // 2. Add to User Table
    if (userEntries.some(e => e.gameId === gameId)) {
        return;
    }

    const newEntry: UserEntry = {
        gameId,
        userId: user?.id || 'guest',
        status,
        platform,
        userRating: 0,
        hoursPlayed: 0,
        addedAt: Date.now(),
        lastInteractedAt: Date.now(), // Initial interaction
        startedAt: status === GameStatus.Playing ? Date.now() : undefined,
        completedAt: status === GameStatus.Completed ? Date.now() : undefined
    };

    setUserEntries(prev => [newEntry, ...prev]);
  };

  const removeFromLibrary = (gameId: number) => {
    setUserEntries(prev => prev.filter(e => e.gameId !== gameId));
    if (activeSession?.gameId === gameId) {
        stopSession();
    }
  };

  const updateEntry = (gameId: number, data: Partial<UserEntry>) => {
    // Fix: Explicitly cast interface instances to any before spreading to resolve 
    // "Spread types may only be created from object types" error in some TypeScript environments.
    setUserEntries(prev => prev.map(e => e.gameId === gameId ? { 
        ...(e as any),
        ...(data || {}),
        lastInteractedAt: Date.now() // Always update interaction time on edit
    } : e));
  };

  const saveMetadata = (gameId: number, data: Partial<GameMetadata>) => {
      setMetadataCache(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(gameId);
          if (current) {
              // Fix: Explicitly cast interface instances to any before spreading to resolve 
              // "Spread types may only be created from object types" error.
              newMap.set(gameId, { ...(current as any), ...(data || {}) });
          }
          return newMap;
      });
      // Also mark as interacted
      updateEntry(gameId, {});
  };

  const reassignGame = async (oldGameId: number, newGameId: number, preloadedMeta?: GameMetadata) => {
      // 1. Check duplicate
      if (userEntries.some(e => e.gameId === newGameId)) {
          alert("El juego seleccionado ya existe en tu biblioteca. No se puede duplicar.");
          throw new Error("Duplicate");
      }

      // 2. Fetch New Metadata if missing
      if (!metadataCache.has(newGameId)) {
          if (preloadedMeta) {
              setMetadataCache(prev => new Map(prev).set(newGameId, preloadedMeta));
          } else {
              try {
                  const freshMeta = await fetchMetadata(newGameId);
                  setMetadataCache(prev => new Map(prev).set(newGameId, freshMeta));
              } catch (e) {
                  alert("Error al descargar metadatos del nuevo juego. Intenta seleccionar otro.");
                  throw e;
              }
          }
      }

      // 3. Update User Entry
      setUserEntries(prev => prev.map(e => {
          if (e.gameId === oldGameId) {
              // Fix: Explicitly cast interface instances to any before spreading to resolve 
              // "Spread types may only be created from object types" error.
              return {
                  ...(e as any),
                  gameId: newGameId,
                  lastInteractedAt: Date.now()
              };
          }
          return e;
      }));
  };

  // --- TIMER LOGIC ---
  const startSession = (gameId: number) => {
      // 1. Check if already launching to prevent double clicks
      if (launchingGameId === gameId) return;

      const game = library.find(g => g.id === gameId);
      if (!game) return;

      // 2. Stop previous session immediately
      if (activeSession) {
          stopSession();
      }

      // 3. Set visual launching state
      setLaunchingGameId(gameId);

      // 4. LAUNCH LOGIC (Custom -> Steam -> None)
      if (game.customLaunchUrl) {
           console.log(`Launching Custom URL: ${game.customLaunchUrl}`);
           window.open(game.customLaunchUrl, '_self');
      } else if (game.steamAppId) {
          console.log(`Launching Steam App ID: ${game.steamAppId}`);
          window.location.href = `steam://rungameid/${game.steamAppId}`;
      }

      // 5. DELAYED TIMER START (15 Seconds Cooldown)
      // "Empieza a contar a partir del segundo 15"
      setTimeout(() => {
          setLaunchingGameId(null);
          
          setActiveSession({
              gameId,
              startTime: Date.now()
          });
          
          // Update status to Playing if currently Backlog
          const entry = userEntries.find(e => e.gameId === gameId);
          if (entry && entry.status === GameStatus.Backlog) {
              updateEntry(gameId, { status: GameStatus.Playing });
          }
      }, 15000);
  };

  const stopSession = () => {
      if (!activeSession) return;
      
      const elapsedMs = Date.now() - activeSession.startTime;
      const elapsedHours = elapsedMs / (1000 * 60 * 60); // Convert to hours
      
      const entry = userEntries.find(e => e.gameId === activeSession.gameId);
      if (entry) {
          updateEntry(activeSession.gameId, {
              hoursPlayed: (entry.hoursPlayed || 0) + elapsedHours,
              lastInteractedAt: Date.now()
          });
      }
      
      setActiveSession(null);
  };

  // --- DATA MANAGEMENT ---
  const exportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      userEntries: userEntries,
      metadata: Array.from(metadataCache.entries()) // Convert Map to Array for JSON
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = async (jsonString: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.userEntries || !data.metadata) {
        throw new Error("Invalid Backup Format");
      }

      // Restore Metadata
      const newMeta = new Map(data.metadata as [number, GameMetadata][]);
      setMetadataCache(newMeta);

      // Restore User Entries
      setUserEntries(data.userEntries);

      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  };

  const syncMetadata = async () => {
    setIsSyncing(true);
    // Refresh all metadata in cache that is referenced by user library
    const promises = userEntries.map(async (entry) => {
        try {
            const fresh = await fetchMetadata(entry.gameId);
            return fresh;
        } catch (e) {
            return null;
        }
    });

    const results = await Promise.all(promises);
    setMetadataCache(prev => {
        const next = new Map(prev);
        results.forEach(meta => {
            if (meta) next.set(meta.id, meta);
        });
        return next;
    });
    setIsSyncing(false);
  };
  
  // --- STEAM IMPORT LOGIC ---
  const importSteamLibrary = async (steamInput: string) => {
      setSteamImportState({ isImporting: true, progress: 0, total: 0, stage: 'fetching', summary: null });
      
      try {
          const steamGames = await fetchSteamLibrary(steamInput);
          
          setSteamImportState(prev => ({ ...prev, stage: 'matching', total: steamGames.length }));
          
          const matchedGames = await matchSteamGamesToIGDB(steamGames, (current, total) => {
              setSteamImportState(prev => ({ ...prev, progress: current }));
          });
          
          let newImports = 0;
          let totalPlaytimeAdded = 0;
          
          const updatedEntries = [...userEntries];
          const updatedMetadata = new Map(metadataCache);
          
          for (const match of matchedGames) {
              if (!updatedMetadata.has(match.igdbId)) {
                  try {
                      if (match.isFallback && match.fallbackData) {
                          const fallbackMeta: GameMetadata = {
                              id: match.igdbId, 
                              title: match.steamGame.name,
                              slug: `steam-${match.steamGame.appid}`,
                              coverUrl: match.fallbackData.coverUrl,
                              bannerUrl: match.fallbackData.bannerUrl,
                              description: 'Importado directamente desde Steam. Metadata global no encontrada.',
                              releaseDate: new Date().toISOString(),
                              genres: ['Steam Import'],
                              platforms: ['PC'],
                              developers: [],
                              publishers: [],
                              rating: 0,
                              aggregatedRating: 0,
                              screenshots: [],
                              externalIds: { steam: match.steamGame.appid.toString() },
                              timeToBeat: { main: 0, extra: 0, completionist: 0 },
                              lastSyncedAt: Date.now()
                          };
                          updatedMetadata.set(match.igdbId, fallbackMeta);
                      } else {
                        const fullMeta = await fetchMetadata(match.igdbId);
                        updatedMetadata.set(match.igdbId, fullMeta);
                      }
                  } catch (e) {
                      continue;
                  }
              }
              
              const existingIndex = updatedEntries.findIndex(e => e.gameId === match.igdbId);
              const playtimeHours = parseFloat((match.steamGame.playtime_forever / 60).toFixed(1));
              totalPlaytimeAdded += playtimeHours;

              if (existingIndex > -1) {
                  const existingEntry = updatedEntries[existingIndex];
                  if (existingEntry) {
                      // Fix: Explicitly cast interface instances to any before spreading to resolve 
                      // "Spread types may only be created from object types" error.
                      updatedEntries[existingIndex] = {
                          ...(existingEntry as any),
                          steamAppId: match.steamGame.appid,
                          steamPlaytime: match.steamGame.playtime_forever,
                          lastPlayedSteam: match.steamGame.rtime_last_played,
                          hoursPlayed: Math.max(existingEntry.hoursPlayed, playtimeHours),
                          autoSynced: true,
                          lastInteractedAt: Date.now() // Marked as updated
                      };
                  }
              } else {
                  newImports++;
                  updatedEntries.push({
                      gameId: match.igdbId,
                      userId: user?.id || 'guest',
                      status: calculateStatusFromPlaytime(match.steamGame.playtime_forever, match.steamGame.rtime_last_played),
                      platform: Platform.PC,
                      userRating: 0,
                      hoursPlayed: playtimeHours,
                      steamAppId: match.steamGame.appid,
                      steamPlaytime: match.steamGame.playtime_forever,
                      lastPlayedSteam: match.steamGame.rtime_last_played,
                      autoSynced: true,
                      addedAt: Date.now(),
                      lastInteractedAt: Date.now(),
                      startedAt: match.steamGame.playtime_forever > 0 ? Date.now() : undefined
                  });
              }
          }
          
          setMetadataCache(updatedMetadata);
          setUserEntries(updatedEntries);
          
          setSteamImportState({
              isImporting: true,
              progress: steamGames.length,
              total: steamGames.length,
              stage: 'complete',
              summary: {
                  totalGames: steamGames.length,
                  matchedGames: matchedGames.length,
                  totalPlaytimeHours: Math.round(totalPlaytimeAdded),
                  newImports
              }
          });
          
      } catch (error: any) {
          alert(`Error al importar de Steam: ${error.message}`);
          setSteamImportState(prev => ({ ...prev, isImporting: false, stage: 'idle' }));
      }
  };
  
  const closeImportModal = () => {
      setSteamImportState(prev => ({ ...prev, isImporting: false, stage: 'idle', summary: null }));
  };

  // --- QUERY ENGINE (The "View") ---
  const library = useMemo(() => {
    if (isLoading) return [];
    
    // JOIN operation
    const joined: Game[] = userEntries.map(entry => {
        const meta = metadataCache.get(entry.gameId);
        if (!meta) return null;
        
        // Fix: Use Object.assign to merge interface instances into a single object to resolve 
        // "Spread types may only be created from object types" error which can occur with interface spreading.
        return Object.assign({}, meta, entry, { id: meta.id }) as unknown as Game;
    }).filter((g): g is Game => g !== null); 

    let result = joined;
    if (filterStatus !== 'All') {
        result = result.filter(g => g.status === filterStatus);
    }
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(g => g.title.toLowerCase().includes(q));
    }

    return result.sort((a, b) => {
        switch (sortBy) {
            case 'rating': return (b.aggregatedRating || 0) - (a.aggregatedRating || 0);
            case 'playtime': return b.hoursPlayed - a.hoursPlayed;
            case 'release': return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
            case 'name': return a.title.localeCompare(b.title);
            case 'status': return a.status.localeCompare(b.status);
            // Default sort: uses lastInteractedAt if available, otherwise addedAt
            default: return (b.lastInteractedAt || b.addedAt || 0) - (a.lastInteractedAt || a.addedAt || 0);
        }
    });
  }, [userEntries, metadataCache, filterStatus, searchQuery, sortBy, isLoading]);

  const getGame = (id: number) => library.find(g => g.id === id);

  return (
    <GameContext.Provider value={{
      library,
      addToLibrary,
      removeFromLibrary,
      updateEntry,
      reassignGame,
      saveMetadata,
      syncMetadata,
      exportData,
      importData,
      isLoading,
      isSyncing,
      filterStatus,
      setFilterStatus,
      searchQuery,
      setSearchQuery,
      sortBy,
      setSortBy,
      getGame,
      activeSession,
      launchingGameId,
      startSession,
      stopSession,
      isAddModalOpen,
      openAddModal: () => setIsAddModalOpen(true),
      closeAddModal: () => setIsAddModalOpen(false),
      
      importSteamLibrary,
      steamImportState,
      closeImportModal,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGameContext must be used within a GameProvider');
  return context;
};
