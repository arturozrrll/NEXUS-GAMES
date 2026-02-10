
import { Game, GameStatus, Platform } from '../types';
import { fetchMetadata, searchGlobalGames } from './metadataService';

// Re-export search for legacy components if needed, or redirect to new service
export const searchGamesReal = async (query: string): Promise<Partial<Game>[]> => {
    return await searchGlobalGames(query) as unknown as Partial<Game>[];
};

// Adapted to return the full Game object merging Metadata + Defaults
export const fetchGameDetailsReal = async (id: number): Promise<Game> => {
    // Get the pure metadata
    const metadata = await fetchMetadata(id);
    
    // Return combined object (User data defaults to empty/fresh)
    return {
        ...metadata,
        status: GameStatus.Backlog,
        platform: Platform.PC,
        addedAt: Date.now(),
        hoursPlayed: 0,
        userRating: 0
    };
};
