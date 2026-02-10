
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Game, GameMetadata, UserEntry, GameStatus, SortOption, Platform, SteamImportSummary } from '../types';
import { useAuth } from './AuthContext';
import { fetchMetadata } from '../services/metadataService';
import { fetchSteamLibrary, matchSteamGamesToIGDB, calculateStatusFromPlaytime } from '../services/steamService';
import { searchHLTB } from '../services/hltbService';

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
  library: Game[];
  addToLibrary: (gameId: number, status: GameStatus, platform: string, preloadedMeta?: GameMetadata) => Promise<void>;
  removeFromLibrary: (gameId: number) => void;
  updateEntry: (gameId: number, data: Partial<UserEntry>) => void;
  reassignGame: (oldGameId: number, newGameId: number, preloadedMeta?: GameMetadata) => Promise<void>;
  saveMetadata: (gameId: number, data: Partial<GameMetadata>) => void; 
  syncMetadata: () => Promise<void>;
  syncHLTB: (gameId: number) => Promise<void>;
  activeSession: ActiveSession | null;
  launchingGameId: number | null; 
  startSession: (gameId: number) => void;
  stopSession: () => void;
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
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_METADATA_KEY = 'nexus_db_metadata_v1';
const STORAGE_USER_KEY = 'nexus_db_user_v1';
const STORAGE_SESSION_KEY = 'nexus_active_session_v1';

export const GameProvider = ({ children }: { children?: ReactNode }) => {
  const { user } = useAuth();
  const [metadataCache, setMetadataCache] = useState<Map<number, GameMetadata>>(new Map());
  const [userEntries, setUserEntries] = useState<UserEntry[]>([]);
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
    localStorage.setItem(STORAGE_METADATA_KEY, JSON.stringify(Array.from(metadataCache.entries())));
    const userKey = user ? `${STORAGE_USER_KEY}_${user.id}` : STORAGE_USER_KEY;
    localStorage.setItem(userKey, JSON.stringify(userEntries));
  }, [metadataCache, userEntries, user, isLoading]);

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

    const newEntry: UserEntry = {
        gameId,
        userId: user?.id || 'guest',
        status,
        platform,
        userRating: 0,
        hoursPlayed: 0,
        addedAt: Date.now(),
        lastInteractedAt: Date.now(),
        startedAt: status === GameStatus.Playing ? Date.now() : undefined,
        completedAt: status === GameStatus.Completed ? Date.now() : undefined
    };

    setUserEntries(prev => [newEntry, ...prev]);

    // BACKGROUND SYNC: Disparamos la búsqueda de HLTB en segundo plano
    const gameTitle = finalMeta?.title || metadataCache.get(gameId)?.title;
    if (gameTitle) {
        console.log(`[Nexus] Iniciando sincronización HLTB en segundo plano para: ${gameTitle}`);
        searchHLTB(gameTitle).then(result => {
            if (result) {
                console.log(`[Nexus] HLTB Sincronizado para: ${gameTitle}`, result);
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
        lastInteractedAt: Date.now()
    } : e));
  };

  const saveMetadata = (gameId: number, data: Partial<GameMetadata>) => {
      setMetadataCache(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(gameId);
          if (current) {
              newMap.set(gameId, { ...current, ...data });
          }
          return newMap;
      });
  };

  const reassignGame = async (oldGameId: number, newGameId: number, preloadedMeta?: GameMetadata) => {
      if (userEntries.some(e => e.gameId === newGameId)) {
          alert("El juego seleccionado ya existe en tu biblioteca.");
          throw new Error("Duplicate");
      }
      if (!metadataCache.has(newGameId)) {
          const meta = preloadedMeta || await fetchMetadata(newGameId);
          setMetadataCache(prev => new Map(prev).set(newGameId, meta));
      }
      setUserEntries(prev => prev.map(e => e.gameId === oldGameId ? { ...e, gameId: newGameId, lastInteractedAt: Date.now() } : e));
  };

  const startSession = (gameId: number) => {
      if (launchingGameId === gameId) return;
      const game = library.find(g => g.id === gameId);
      if (!game) return;
      if (activeSession) stopSession();
      setLaunchingGameId(gameId);
      if (game.customLaunchUrl) window.open(game.customLaunchUrl, '_self');
      else if (game.steamAppId) window.location.href = `steam://rungameid/${game.steamAppId}`;
      setTimeout(() => {
          setLaunchingGameId(null);
          setActiveSession({ gameId, startTime: Date.now() });
          if (game.status === GameStatus.Backlog) updateEntry(gameId, { status: GameStatus.Playing });
      }, 5000);
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

  const syncHLTB = async (gameId: number) => {
      const game = library.find(g => g.id === gameId);
      if (!game) return;
      setIsSyncingHLTB(true);
      try {
          const result = await searchHLTB(game.title);
          if (result) saveMetadata(gameId, { timeToBeat: result });
      } finally {
          setIsSyncingHLTB(false);
      }
  };
  
  const importSteamLibrary = async (steamInput: string) => {
      setSteamImportState({ isImporting: true, progress: 0, total: 0, stage: 'fetching', summary: null });
      try {
          const steamGames = await fetchSteamLibrary(steamInput);
          setSteamImportState(prev => ({ ...prev, stage: 'matching', total: steamGames.length }));
          const matchedGames = await matchSteamGamesToIGDB(steamGames, (current, total) => setSteamImportState(prev => ({ ...prev, progress: current })));
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
                  updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], hoursPlayed: Math.max(updatedEntries[existingIndex].hoursPlayed, playtimeHours), lastInteractedAt: Date.now() };
              } else {
                  updatedEntries.push({
                      gameId: match.igdbId, userId: user?.id || 'guest',
                      status: calculateStatusFromPlaytime(match.steamGame.playtime_forever, match.steamGame.rtime_last_played),
                      platform: Platform.PC, userRating: 0, hoursPlayed: playtimeHours, addedAt: Date.now(), lastInteractedAt: Date.now()
                  });
              }
          }
          setUserEntries(updatedEntries);
          setSteamImportState(prev => ({ ...prev, stage: 'complete' }));
      } catch (error) {
          setSteamImportState(prev => ({ ...prev, isImporting: false }));
      }
  };

  const library = useMemo(() => {
    if (isLoading) return [];
    const joined = userEntries.map(entry => {
        const meta = metadataCache.get(entry.gameId);
        return meta ? { ...meta, ...entry, id: meta.id } : null;
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
      library, addToLibrary, removeFromLibrary, updateEntry, reassignGame, saveMetadata, syncMetadata, syncHLTB, exportData, importData,
      isLoading, isSyncing, isSyncingHLTB, filterStatus, setFilterStatus, searchQuery, setSearchQuery, sortBy, setSortBy, getGame: (id) => library.find(g => g.id === id),
      activeSession, launchingGameId, startSession, stopSession, isAddModalOpen, openAddModal: () => setIsAddModalOpen(true), closeAddModal: () => setIsAddModalOpen(false),
      importSteamLibrary, steamImportState, closeImportModal: () => setSteamImportState(prev => ({ ...prev, isImporting: false }))
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
