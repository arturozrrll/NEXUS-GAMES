# Nexus Architecture & Engineering Spec

## 1. Database Schema (Prisma)

This schema implements the strict separation between "Global Metadata" (Source of Truth) and "User Data".

```prisma
// --- GLOBAL METADATA LAYER (Source of Truth) ---
model GameMetadata {
  id            Int      @id @default(autoincrement()) // Internal Nexus ID
  igdbId        Int      @unique                       // IGDB ID (Primary external key)
  slug          String   @unique
  title         String
  coverUrl      String?
  bannerUrl     String?
  description   String?  @db.Text
  releaseDate   DateTime?
  
  // Aggregated Data
  criticScore   Int?     // Normalized 0-100
  
  // JSONB for flexible external estimates
  playtimeEstimates Json? // { main: 20, extra: 30, completionist: 80 }
  
  // External Links
  sourceUrls    Json?    // { metacritic: "...", hltb: "..." }

  // System
  lastUpdated   DateTime @default(now())
  
  // Relations
  userEntries   UserGame[]
  genres        Genre[]
  platforms     Platform[]

  @@index([title])
}

// --- USER LAYER ---
model User {
  id        String     @id @default(uuid())
  email     String     @unique
  name      String
  avatar    String?
  library   UserGame[]
  
  createdAt DateTime   @default(now())
}

model UserGame {
  id            Int      @id @default(autoincrement())
  userId        String
  gameId        Int      // References GameMetadata
  
  // User Personal Data
  status        GameStatus
  ownPlatform   String?
  userRating    Int?     // 0-100 (stored as int, displayed as stars)
  userPlaytime  Int      @default(0) // Minutes
  
  addedAt       DateTime @default(now())
  completedAt   DateTime?
  
  user          User         @relation(fields: [userId], references: [id])
  game          GameMetadata @relation(fields: [gameId], references: [id])

  @@unique([userId, gameId]) // Prevent duplicates
}

enum GameStatus {
  BACKLOG
  PLAYING
  COMPLETED
  PLATINUM
  DROPPED
  WISHLIST
}

// ... Additional models for Genre, Platform
```

## 2. Metadata Enrichment Service (Backend)

The service is designed to be asynchronous and fault-tolerant.

### Flow
1. **Search**: User inputs "God of War".
2. **Resolve**: Query IGDB API.
3. **Queue**: If game exists in DB and is fresh (< 7 days), return DB. If stale or new, dispatch `enrich_game_job`.
4. **Enrichment Job**:
   - Fetch IGDB details.
   - **Fuzzy Match**: Check HLTB using title. Calculate Levenshtein distance. If confidence > 0.9, merge.
   - **Metacritic**: Search via specific slug or scraper API.
   - **Save**: Update `GameMetadata` table.

## 3. Background Jobs (BullMQ / Redis)

We handle external API rate limits and slow scraping via queues.

**Queue: `metadata-refresh`**
- **Concurrency**: 5 (Respect IGDB 4 requests/sec limit safely)
- **Rate Limit**: 1 request / 250ms per worker.

**Job Types:**
1. `EnrichNewGame`: High priority. Triggered when a user adds a game not in DB.
2. `RefreshStale`: Low priority. Runs weekly for existing games.

## 4. Caching Strategy (Redis)

1. **Hot Cache (API Responses)**: Cache IGDB/HLTB raw responses for 24h.
   - Key: `source:igdb:game:{id}`
2. **Search Results**: Cache search queries for 1 hour.
   - Key: `search:{query}`
3. **User Library**: Cache the user's full library JSON for the session.
   - Invalidate on any add/update/delete.

## 5. Rate Limiting & Error Handling

**Strategy:**
- **Circuit Breaker**: If HLTB scraping fails 5 times in 1 minute, open circuit for 15 minutes (return stale data).
- **Exponential Backoff**: Retry failed jobs (1s, 2s, 4s, 8s).
- **Dead Letter Queue**: Failed jobs after 5 retries go here for manual inspection.

## 6. Frontend "Live Refresh" Logic

(Implemented in current `GameContext.tsx`)

1. User clicks "Refresh Library".
2. Client iterates all `gameIds`.
3. Sends batch request `POST /api/refresh-batch` with IDs.
4. Server checks `lastUpdated`. If old, re-queues enrichment.
5. Server returns immediately "Refresh Queued".
6. Client polls or uses WebSocket for `game_updated` events.
   - *Current Prototype Implementation*: Does this client-side directly against APIs.