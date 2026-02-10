
import React, { useState, useMemo, useEffect } from 'react';
import { useGameContext } from '../store/GameContext';
import { GameCard } from '../components/GameCard';
import { GameContextMenu } from '../components/GameContextMenu';
import { EditMetadataModal } from '../components/EditMetadataModal';
import { GameStatus, Game } from '../types';
import { Search, ArrowDownUp, Filter, Heart, Trophy, Gamepad2, Clock, Layers, ArrowLeft, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LibraryProps {
    initialMode?: 'WISHLIST' | null;
}

export const Library: React.FC<LibraryProps> = ({ initialMode }) => {
  const { 
    library, 
    searchQuery,
    setSearchQuery, 
    sortBy,
    setSortBy,
    startSession,
    stopSession,
    activeSession,
    removeFromLibrary
  } = useGameContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Fix: Added 'Favorites' to allowed collection types to support filtering by favorites
  const [activeCollection, setActiveCollection] = useState<GameStatus | 'All' | 'Favorites' | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, game: Game} | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  // Auto-switch to Wishlist if path is /wishlist
  useEffect(() => {
      if (location.pathname === '/wishlist') {
          setActiveCollection(GameStatus.Wishlist);
      } else if (initialMode === 'WISHLIST') {
          setActiveCollection(GameStatus.Wishlist);
      }
  }, [location.pathname, initialMode]);

  // Stats should reflect OWNED games, separate Wishlist
  const stats = useMemo(() => {
    const owned = library.filter(g => g.status !== GameStatus.Wishlist);
    return {
        all: owned.length,
        favorites: owned.filter(g => (g.userRating || 0) >= 80).length,
        playing: library.filter(g => g.status === GameStatus.Playing).length,
        completed: library.filter(g => g.status === GameStatus.Completed).length,
        backlog: library.filter(g => g.status === GameStatus.Backlog).length,
        platinum: library.filter(g => g.status === GameStatus.Platinums).length,
        wishlist: library.filter(g => g.status === GameStatus.Wishlist).length,
        extra: library.filter(g => g.status === GameStatus.Extra).length,
    }
  }, [library]);

  // Fix: Updated signature to accept 'Favorites' collection string
  const handleCollectionClick = (collection: GameStatus | 'All' | 'Favorites') => {
    setActiveCollection(collection);
  };

  const handleContextMenu = (e: React.MouseEvent, game: Game) => {
      setContextMenu({ x: e.clientX, y: e.clientY, game });
  };

  const handleContextPlay = () => {
      if (!contextMenu) return;
      if (activeSession?.gameId === contextMenu.game.id) {
          stopSession();
      } else {
          startSession(contextMenu.game.id);
      }
  };

  const getCollectionTitle = (col: string) => {
      switch(col) {
          case 'All': return 'Mi Biblioteca (Propiedad)';
          case 'Favorites': return 'Favoritos';
          case GameStatus.Backlog: return 'Pendientes';
          case GameStatus.Playing: return 'Jugando';
          case GameStatus.Completed: return 'Completados';
          case GameStatus.Platinums: return 'Platinados';
          case GameStatus.Dropped: return 'Abandonados';
          case GameStatus.Wishlist: return 'Lista de Deseos';
          case GameStatus.Extra: return 'Extra / Casual';
          default: return col;
      }
  };

  const filteredGames = useMemo(() => {
     if (!activeCollection) return [];
     let result = library;
     
     if (activeCollection !== 'All') {
        // Fix: Now comparing against 'Favorites' which is included in activeCollection type
        if (activeCollection === 'Favorites') {
            result = library.filter(g => (g.userRating || 0) >= 80 && g.status !== GameStatus.Wishlist);
        } else {
            result = library.filter(g => g.status === activeCollection);
        }
     } else {
        // "ALL" means everything I OWN. Exclude Wishlist.
        result = library.filter(g => g.status !== GameStatus.Wishlist);
     }

     if (searchQuery) {
        result = result.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
     }

     return result.sort((a, b) => {
        switch (sortBy) {
          case 'rating': return (b.aggregatedRating || 0) - (a.aggregatedRating || 0);
          case 'playtime': return (b.hoursPlayed || 0) - (a.hoursPlayed || 0);
          case 'release': return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
          case 'name': return a.title.localeCompare(b.title);
          default: return (b.addedAt || 0) - (a.addedAt || 0);
        }
    });
  }, [library, activeCollection, searchQuery, sortBy]);

  // --- VISTA COLECCIONES ---
  if (!activeCollection) {
      return (
          <div className="animate-fade-in pb-20">
              <h1 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
                  <Layers className="text-brand-primary" /> Tus Colecciones
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  
                  {/* ALL GAMES (OWNED) */}
                  <div 
                    onClick={() => handleCollectionClick('All')}
                    className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-brand-primary/50 transition-all hover:shadow-2xl hover:shadow-brand-primary/20 col-span-1 md:col-span-2"
                  >
                      <div className="absolute inset-0 bg-slate-800 group-hover:bg-slate-700 transition-colors"></div>
                      <div className="absolute flex items-center justify-center inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                         <Layers size={100} className="text-white" />
                      </div>
                      <div className="absolute bottom-0 left-0 p-6 w-full">
                          <h3 className="text-3xl font-black text-white uppercase tracking-wide">Mi Biblioteca</h3>
                          <p className="text-brand-primary font-bold">{stats.all} Juegos en Propiedad</p>
                      </div>
                  </div>

                   {/* PLAYING */}
                   <div 
                    onClick={() => handleCollectionClick(GameStatus.Playing)}
                    className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-green-500/50 transition-all hover:shadow-2xl hover:shadow-green-500/20"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-green-900 group-hover:scale-110 transition-transform duration-500"></div>
                      <div className="absolute bottom-0 left-0 p-6 w-full">
                          <Gamepad2 className="w-8 h-8 text-white mb-2" />
                          <h3 className="text-2xl font-black text-white uppercase tracking-wide">Jugando</h3>
                          <p className="text-white/70 font-bold">{stats.playing} Juegos</p>
                      </div>
                  </div>

                  {/* EXTRA / CASUAL */}
                  <div 
                    onClick={() => handleCollectionClick(GameStatus.Extra)}
                    className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-cyan-500/50 transition-all hover:shadow-2xl hover:shadow-cyan-500/20"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-blue-900 group-hover:scale-110 transition-transform duration-500"></div>
                      <div className="absolute bottom-0 left-0 p-6 w-full">
                          <Zap className="w-8 h-8 text-white mb-2" />
                          <h3 className="text-2xl font-black text-white uppercase tracking-wide">Extra / Casual</h3>
                          <p className="text-white/70 font-bold">{stats.extra} Juegos</p>
                      </div>
                  </div>

                  {/* WISHLIST (Separated) */}
                  <div 
                    onClick={() => handleCollectionClick(GameStatus.Wishlist)}
                    className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-pink-500/50 transition-all hover:shadow-2xl hover:shadow-pink-500/20"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-600 to-rose-900 group-hover:scale-110 transition-transform duration-500"></div>
                      <div className="absolute bottom-0 left-0 p-6 w-full">
                          <Heart className="w-8 h-8 text-white mb-2 fill-white/20" />
                          <h3 className="text-2xl font-black text-white uppercase tracking-wide">Deseados</h3>
                          <p className="text-white/70 font-bold">{stats.wishlist} Juegos</p>
                      </div>
                  </div>

                  {/* BACKLOG */}
                  <div 
                    onClick={() => handleCollectionClick(GameStatus.Backlog)}
                    className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-blue-500/50 transition-all hover:shadow-2xl hover:shadow-blue-500/20"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-slate-800 group-hover:scale-110 transition-transform duration-500"></div>
                      <div className="absolute bottom-0 left-0 p-6 w-full">
                          <Clock className="w-8 h-8 text-white mb-2" />
                          <h3 className="text-2xl font-black text-white uppercase tracking-wide">Pendientes</h3>
                          <p className="text-white/70 font-bold">{stats.backlog} Juegos</p>
                      </div>
                  </div>

                  {/* COMPLETED */}
                  <div 
                    onClick={() => handleCollectionClick(GameStatus.Completed)}
                    className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-purple-500/50 transition-all hover:shadow-2xl hover:shadow-purple-500/20"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-purple-900 group-hover:scale-110 transition-transform duration-500"></div>
                      <div className="absolute bottom-0 left-0 p-6 w-full">
                          <Trophy className="w-8 h-8 text-white mb-2" />
                          <h3 className="text-2xl font-black text-white uppercase tracking-wide">Completados</h3>
                          <p className="text-white/70 font-bold">{stats.completed} Juegos</p>
                      </div>
                  </div>

                   {/* PLATINUM */}
                   <div 
                    onClick={() => handleCollectionClick(GameStatus.Platinums)}
                    className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-yellow-500/50 transition-all hover:shadow-2xl hover:shadow-yellow-500/20"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-600 to-amber-900 group-hover:scale-110 transition-transform duration-500"></div>
                      <div className="absolute bottom-0 left-0 p-6 w-full">
                          <Trophy className="w-8 h-8 text-white mb-2 fill-white/20" />
                          <h3 className="text-2xl font-black text-white uppercase tracking-wide">Platinados</h3>
                          <p className="text-white/70 font-bold">{stats.platinum} Juegos</p>
                      </div>
                  </div>
              </div>
          </div>
      )
  }

  // --- VISTA LISTA JUEGOS ---
  return (
    <div className="flex flex-col h-full animate-fade-in">
      
      {/* Context Menu Overlay */}
      {contextMenu && (
          <GameContextMenu 
              x={contextMenu.x}
              y={contextMenu.y}
              game={contextMenu.game}
              isPlaying={activeSession?.gameId === contextMenu.game.id}
              onClose={() => setContextMenu(null)}
              onPlay={handleContextPlay}
              onDetails={() => navigate(`/game/${contextMenu.game.id}`)}
              onEdit={() => setEditingGame(contextMenu.game)}
              onDelete={() => removeFromLibrary(contextMenu.game.id)}
          />
      )}

      {/* Edit Modal from Library */}
      {editingGame && (
          <EditMetadataModal 
              game={editingGame}
              isOpen={true}
              onClose={() => setEditingGame(null)}
          />
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl py-6 border-b border-white/5 mb-8 -mx-8 px-8 shadow-2xl shadow-slate-950/50">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setActiveCollection(null)}
            className="p-2 bg-slate-800 rounded-full hover:bg-white hover:text-slate-950 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">
             {getCollectionTitle(activeCollection as string)} 
             <span className="text-slate-500 text-lg font-medium ml-2">({filteredGames.length})</span>
          </h1>
        </div>

        {/* Filtros */}
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-[2]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              value={searchQuery}
              placeholder="Buscar..."
              className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 placeholder:text-slate-500 transition-all"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-3 min-w-[200px]">
             <div className="flex flex-1 items-center gap-2 bg-slate-800/80 border border-white/10 rounded-2xl px-4 py-3 text-slate-300">
                 <ArrowDownUp size={16} />
                 <select 
                   className="bg-transparent border-none text-sm font-medium focus:outline-none cursor-pointer text-white w-full"
                   value={sortBy}
                   onChange={(e) => setSortBy(e.target.value as any)}
                 >
                   <option value="recent">Recientes</option>
                   <option value="rating">Mejor Valorados</option>
                   <option value="playtime">Más Jugados</option>
                   <option value="name">Alfabético</option>
                 </select>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20">
        {filteredGames.length > 0 ? (
          filteredGames.map(game => (
            <GameCard 
              key={game.id} 
              game={game} 
              onClick={(id) => navigate(`/game/${id}`)} 
              onContextMenu={handleContextMenu}
            />
          ))
        ) : (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-500 animate-fade-in">
             <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                <Filter size={32} className="opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-white">Colección vacía</h3>
            <p className="text-slate-400">No hay juegos que coincidan con estos criterios.</p>
          </div>
        )}
      </div>
    </div>
  );
};
