
export enum GameStatus {
  Backlog = 'BACKLOG',
  Playing = 'PLAYING',
  Completed = 'COMPLETED',
  Platinums = 'PLATINUM',
  Dropped = 'DROPPED',
  Wishlist = 'WISHLIST',
  Extra = 'EXTRA'
}

export enum Platform {
  PC = 'PC (Pirata/Generico)',
  Steam = 'Steam',
  Epic = 'Epic Games',
  Amazon = 'Amazon Games',
  GOG = 'GOG Galaxy',
  Riot = 'Riot Games',
  GamePass = 'Xbox Game Pass',
  PS5 = 'PlayStation 5',
  Xbox = 'Xbox Series X/S',
  Switch = 'Nintendo Switch',
  Retro = 'Retro / Emulation',
  Cloud = 'Cloud Gaming',
  Other = 'Other'
}

// --- GLOBAL METADATA LAYER (Source of Truth - IGDB Mirror) ---
// This data is treated as immutable cache. It mimics the IGDB schema.
export interface GameMetadata {
  id: number; // External ID (IGDB/Provider ID)
  title: string;
  slug: string;
  coverUrl: string;
  bannerUrl: string;
  
  // Core Data
  description: string;
  releaseDate: string; // ISO String
  genres: string[];
  platforms: string[]; // Available platforms
  developers: string[];
  publishers: string[];
  
  // Optional External IDs at root level for quick access
  steamAppId?: number;

  // Scores & Metrics (Source of Truth)
  rating: number; // IGDB Rating (0-100)
  aggregatedRating: number; // Critic Rating (0-100)
  
  // Media
  screenshots: string[];
  
  // External
  externalIds: {
    igdb?: string;
    hltb?: string;
    rawg?: string;
    steam?: string;
  };
  
  // Time To Beat (Crowdsourced Source of Truth)
  timeToBeat: {
    main: number;
    extra: number;
    completionist: number;
  };

  lastSyncedAt: number; // For cache invalidation strategies
}

// --- USER LAYER (Personal Data) ---
// This references the Metadata but contains ONLY user-specific state.
export interface UserEntry {
  gameId: number; // Foreign Key to GameMetadata
  userId: string;
  
  status: GameStatus;
  platform: string; // The specific platform the user owns it on
  
  // User Metrics
  userRating: number; // 0-100
  hoursPlayed: number; // Manual tracking
  notes?: string;
  isPinned?: boolean; // NEW: Pinned to dashboard shortcuts
  
  // Launch Configuration
  steamAppId?: number;     // Official Steam ID
  customLaunchUrl?: string; // NEW: Custom protocol or URL (e.g. battlenet://)
  launchDelay?: number;    // NEW: Custom launch delay in seconds (Default 20)
  
  // Steam Integration Stats
  steamPlaytime?: number; // Minutes from Steam
  lastPlayedSteam?: number; // Timestamp
  autoSynced?: boolean;
  
  // Timestamps
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  lastInteractedAt?: number; // NEW: For sorting "Recently Modified/Played"
}

// --- HYDRATED VIEW MODEL ---
// The "JOIN" result used by the Frontend UI
export interface Game extends GameMetadata, Omit<UserEntry, 'gameId' | 'userId'> {
  // This is the combined object for easier UI consumption
}

export type SortOption = 'recent' | 'rating' | 'release' | 'playtime' | 'name' | 'status';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  steamId?: string;
}

export interface HLTBData {
  main: number;
  extra: number;
  completionist: number;
}

export interface SteamImportSummary {
    totalGames: number;
    matchedGames: number;
    totalPlaytimeHours: number;
    newImports: number;
}
