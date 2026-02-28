
import React, { useState, useMemo, useEffect } from 'react';
import { useGameContext } from '../store/GameContext';
import { GameCard } from '../components/GameCard';
import { CountdownCard } from '../components/CountdownCard';
import { GameContextMenu } from '../components/GameContextMenu';
import { EditMetadataModal } from '../components/EditMetadataModal';
import { SortDropdown } from '../components/ui/SortDropdown';
import { GameStatus, Game, Platform } from '../types';
import { PLATFORM_ICONS } from '../constants';
import { Search, Filter, Heart, Trophy, Gamepad2, Clock, Layers, ArrowLeft, Zap, Calendar, Rocket, Grid, Box, Ghost, ChevronLeft, ChevronRight, RefreshCcw, Loader2, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

interface LibraryProps {
    initialMode?: 'WISHLIST' | null;
}

type ViewMode = 'STATUS' | 'PLATFORM';

const ITEMS_PER_PAGE = 18;

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
    removeFromLibrary,
    refreshUpcomingWishlist,
    isSyncing
  } = useGameContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Params
  const activeCollection = searchParams.get('view');
  const activeYear = searchParams.get('year');

  const [viewMode, setViewMode] = useState<ViewMode>('STATUS');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // UI State
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, game: Game} | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  // Auto-switch to Wishlist if path is /wishlist
  useEffect(() => {
      if (location.pathname === '/wishlist') {
          // Only set if not already set to avoid loops
          if (activeCollection !== GameStatus.Wishlist) {
              setSearchParams({ view: GameStatus.Wishlist });
          }
      } else if (initialMode === 'WISHLIST') {
           if (activeCollection !== GameStatus.Wishlist) {
              setSearchParams({ view: GameStatus.Wishlist });
           }
      }
  }, [location.pathname, initialMode, setSearchParams, activeCollection]);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [activeCollection, activeYear, searchQuery, sortBy]);

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
        dropped: library.filter(g => g.status === GameStatus.Dropped).length,
    }
  }, [library]);

  // Generate Platform Stats dynamically based on user library
  const platformStats = useMemo(() => {
      const counts: Record<string, number> = {};
      library.forEach(game => {
          if (game.status !== GameStatus.Wishlist) {
              const p = game.platform || Platform.PC;
              counts[p] = (counts[p] || 0) + 1;
          }
      });
      return counts;
  }, [library]);

  const handleCollectionClick = (collection: string) => {
    setSearchParams({ view: collection });
  };

  const handleBackToCollections = () => {
    setSearchParams({}); // Clear params to go back to grid
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

  const getCollectionTitle = (col: string | null, year: string | null) => {
      if (year) return `Lanzamientos de ${year}`;
      
      if (!col) return 'Biblioteca';

      // Check Status
      const statusMap: Record<string, string> = {
          'All': 'Mi Biblioteca (Propiedad)',
          'Favorites': 'Favoritos',
          [GameStatus.Backlog]: 'Pendientes',
          [GameStatus.Playing]: 'Jugando',
          [GameStatus.Completed]: 'Completados',
          [GameStatus.Platinums]: 'Platinados',
          [GameStatus.Dropped]: 'Abandonados',
          [GameStatus.Wishlist]: 'Lista de Deseos',
          [GameStatus.Extra]: 'Extra / Casual',
      };
      if (statusMap[col]) return statusMap[col];

      // Check Platform (If matches key, nice, else return key)
      return col;
  };

  const isUnreleased = (game: Game) => {
      return new Date(game.releaseDate) > new Date();
  };

  const filteredGames = useMemo(() => {
     if (!activeCollection && !activeYear) return [];
     let result = library;
     
     // FILTER LOGIC
     if (activeYear) {
         const targetYear = parseInt(activeYear);
         result = library.filter(g => {
             const d = new Date(g.releaseDate);
             return d.getFullYear() === targetYear && g.status !== GameStatus.Wishlist;
         });
     } else if (activeCollection === 'All') {
        result = library.filter(g => g.status !== GameStatus.Wishlist);
     } else if (activeCollection === 'Favorites') {
        result = library.filter(g => (g.userRating || 0) >= 80 && g.status !== GameStatus.Wishlist);
     } else if (Object.values(GameStatus).includes(activeCollection as GameStatus)) {
        // It's a Status
        result = library.filter(g => g.status === activeCollection);
     } else {
         // It's a Platform (or anything else)
         result = library.filter(g => g.platform === activeCollection && g.status !== GameStatus.Wishlist);
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
  }, [library, activeCollection, activeYear, searchQuery, sortBy]);

  // PAGINATION LOGIC
  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);
  const paginatedGames = filteredGames.slice(
      (currentPage - 1) * ITEMS_PER_PAGE, 
      currentPage * ITEMS_PER_PAGE
  );

  const handlePrevPage = () => {
      if (currentPage > 1) {
          setCurrentPage(prev => prev - 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleNextPage = () => {
      if (currentPage < totalPages) {
          setCurrentPage(prev => prev + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  // --- VISTA PRINCIPAL (SELECCIÓN DE COLECCIONES) ---
  // Show this if no collection AND no year filter selected
  if (!activeCollection && !activeYear) {
      return (
          <div className="animate-fade-in pb-20">
              <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-black text-white flex items-center gap-3">
                      <Layers className="text-brand-primary" /> 
                      {viewMode === 'STATUS' ? 'Colecciones por Estado' : 'Plataformas'}
                  </h1>

                  {/* TOGGLE VIEW MODE */}
                  <div className="bg-slate-900 p-1 rounded-xl border border-white/10 flex">
                      <button 
                        onClick={() => setViewMode('STATUS')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'STATUS' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                      >
                          <Grid size={16} /> Estado
                      </button>
                      <button 
                        onClick={() => setViewMode('PLATFORM')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'PLATFORM' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                      >
                          <Box size={16} /> Plataformas
                      </button>
                  </div>
              </div>

              {viewMode === 'STATUS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* ALL GAMES */}
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

                    {/* STATUS CARDS */}
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

                    <div 
                        onClick={() => handleCollectionClick(GameStatus.Dropped)}
                        className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-red-500/50 transition-all hover:shadow-2xl hover:shadow-red-500/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-slate-900 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="absolute bottom-0 left-0 p-6 w-full">
                            <Ghost className="w-8 h-8 text-white mb-2" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-wide">Abandonados</h3>
                            <p className="text-white/70 font-bold">{stats.dropped} Juegos</p>
                        </div>
                    </div>

                    <div 
                        onClick={() => handleCollectionClick(GameStatus.Extra)}
                        className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-cyan-500/50 transition-all hover:shadow-2xl hover:shadow-cyan-500/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-blue-900 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="absolute bottom-0 left-0 p-6 w-full">
                            <Zap className="w-8 h-8 text-white mb-2" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-wide">Extra</h3>
                            <p className="text-white/70 font-bold">{stats.extra} Juegos</p>
                        </div>
                    </div>

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
                </div>
              )}

              {viewMode === 'PLATFORM' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {Object.keys(platformStats).length > 0 ? Object.entries(platformStats).map(([platformName, count]) => (
                          <div 
                              key={platformName}
                              onClick={() => handleCollectionClick(platformName)}
                              className="group bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-brand-primary/50 p-6 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
                          >
                              <div className="flex justify-between items-start mb-4">
                                  <div className="p-3 bg-slate-950 rounded-xl group-hover:bg-brand-primary group-hover:text-white transition-colors text-slate-400">
                                      {PLATFORM_ICONS[platformName] || PLATFORM_ICONS[Platform.Other]}
                                  </div>
                                  <span className="text-2xl font-black text-white">{count}</span>
                              </div>
                              <h3 className="font-bold text-white text-lg truncate">{platformName}</h3>
                              <p className="text-slate-500 text-xs uppercase font-bold mt-1">Juegos en Propiedad</p>
                          </div>
                      )) : (
                          <div className="col-span-full h-40 flex items-center justify-center text-slate-500">
                              No tienes juegos en propiedad para clasificar.
                          </div>
                      )}
                  </div>
              )}
          </div>
      )
  }

  // --- LOGICA PARA WISHLIST (Separada con diseño especial) ---
  let content;
  
  if (activeCollection === GameStatus.Wishlist) {
      // Force sort Upcoming by Release Date (ASC), ignoring global sort preference
      const upcoming = filteredGames
        .filter(isUnreleased)
        .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
        
      const released = filteredGames.filter(g => !isUnreleased(g));
      
      content = (
          <div className="space-y-12 pb-20">
              {/* Upcoming Section - Collapsible */}
              {upcoming.length > 0 && (
                  <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                         {/* Toggle Header */}
                         <button 
                            onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
                            className="flex items-center gap-2 group focus:outline-none"
                         >
                             <div className={`p-1 rounded-lg transition-colors ${isUpcomingOpen ? 'bg-brand-secondary/20 text-brand-secondary' : 'bg-slate-800 text-slate-500'}`}>
                                <ChevronDown size={20} className={`transition-transform duration-300 ${isUpcomingOpen ? 'rotate-0' : '-rotate-90'}`} />
                             </div>
                             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Rocket className="text-brand-secondary" /> Próximos Lanzamientos
                                <span className="text-xs font-bold text-slate-500 ml-2 bg-slate-900 border border-white/10 px-2 py-0.5 rounded-full">
                                    {upcoming.length}
                                </span>
                            </h2>
                         </button>
                        
                        <button 
                            onClick={refreshUpcomingWishlist}
                            disabled={isSyncing}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-white/10 transition-colors disabled:opacity-50"
                        >
                            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                            VERIFICAR FECHAS
                        </button>
                      </div>

                      {/* Collapsible Grid */}
                      {isUpcomingOpen && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                              {upcoming.map(game => (
                                  <CountdownCard 
                                      key={game.id} 
                                      game={game} 
                                      onClick={(id) => navigate(`/game/${id}`)}
                                  />
                              ))}
                          </div>
                      )}
                  </div>
              )}

              {/* Released Section */}
              <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
                      <Calendar className="text-slate-400" /> Ya Disponibles
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {released.length > 0 ? (
                          released.map(game => (
                              <GameCard 
                                  key={game.id} 
                                  game={game} 
                                  onClick={(id) => navigate(`/game/${id}`)} 
                                  onContextMenu={handleContextMenu}
                              />
                          ))
                      ) : (
                          <div className="col-span-full h-32 flex items-center text-slate-500">
                              No hay juegos disponibles en la lista de deseos.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  } else {
      // --- VISTA NORMAL (GRID PAGINADO) ---
      content = (
        <div className="flex flex-col gap-8 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 min-h-[500px] content-start">
                {paginatedGames.length > 0 ? (
                paginatedGames.map(game => (
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

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-8 mt-4 sticky bottom-6 z-30 pointer-events-none">
                    <button 
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="pointer-events-auto w-16 h-16 rounded-full bg-slate-900/90 backdrop-blur border border-white/10 flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 hover:bg-brand-primary group"
                    >
                        <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    
                    <div className="px-6 py-2 bg-slate-900/90 backdrop-blur rounded-full border border-white/10 shadow-xl pointer-events-auto">
                        <span className="text-lg font-black text-white">{currentPage}</span>
                        <span className="text-sm font-bold text-slate-500 mx-2">/</span>
                        <span className="text-sm font-bold text-slate-500">{totalPages}</span>
                    </div>

                    <button 
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="pointer-events-auto w-16 h-16 rounded-full bg-slate-900/90 backdrop-blur border border-white/10 flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 hover:bg-brand-primary group"
                    >
                        <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}
        </div>
      );
  }


  // --- MAIN RENDER ---
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

      {/* Edit Modal */}
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
            onClick={handleBackToCollections}
            className="p-2 bg-slate-800 rounded-full hover:bg-white hover:text-slate-950 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex flex-col">
              <h1 className="text-3xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                 {/* Icon Logic for Title */}
                 {activeCollection === GameStatus.Wishlist ? <Heart className="text-pink-500" /> : 
                  activeYear ? <Calendar className="text-brand-primary" /> :
                  activeCollection && PLATFORM_ICONS[activeCollection] ? <span className="text-brand-primary">{PLATFORM_ICONS[activeCollection]}</span> : 
                  <Layers className="text-brand-primary" />
                 }
                 {getCollectionTitle(activeCollection as string, activeYear)}
              </h1>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 ml-1">{filteredGames.length} Títulos</p>
          </div>
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
             {/* NEW CUSTOM DROPDOWN */}
             <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>
      </div>

      {content}

    </div>
  );
};
