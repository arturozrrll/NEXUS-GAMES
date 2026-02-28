
import React, { useMemo, useState, useEffect } from 'react';
import { useGameContext } from '../store/GameContext';
import { GameStatus, Game } from '../types';
import { GameCard } from '../components/GameCard';
import { GameContextMenu } from '../components/GameContextMenu';
import { EditMetadataModal } from '../components/EditMetadataModal';
import { ArrowRight, Flame, Clock, Trophy, Plus, Gamepad, Activity, Play, Loader2, Search, X, Layers, Zap, Pin, Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { library, isLoading, openAddModal, startSession, stopSession, cancelLaunch, activeSession, launchingGameId, removeFromLibrary, searchQuery, setSearchQuery, heroGameId, getGame } = useGameContext();
  const navigate = useNavigate();

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, game: Game} | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  // Reset search on mount to ensure dashboard looks full by default
  useEffect(() => {
      setSearchQuery('');
  }, [setSearchQuery]);

  // EXCLUDE WISHLIST FROM OWNED LIBRARY CALCULATIONS
  const ownedGames = library.filter(g => g.status !== GameStatus.Wishlist);
  const pinnedGames = library.filter(g => g.isPinned);

  const playingNow = library.filter(g => g.status === GameStatus.Playing);
  const backlogCount = library.filter(g => g.status === GameStatus.Backlog).length;
  const completed = library.filter(g => g.status === GameStatus.Completed || g.status === GameStatus.Platinums).length;
  
  // Calculate total playtime ONLY for owned games
  const totalPlaytime = ownedGames.reduce((acc, curr) => acc + (curr.hoursPlayed || 0), 0).toFixed(1);
  
  // LOGIC CHANGE: Sort by lastInteractedAt (Activity) instead of addedAt
  // FILTER CHANGE: Exclude pinned games from recents to avoid duplicates
  // INCREASED LIMIT TO 12 (6 cols x 2 rows)
  const recentGames = [...ownedGames]
    .filter(g => !g.isPinned) // Exclude shortcuts
    .sort((a, b) => (b.lastInteractedAt || b.addedAt || 0) - (a.lastInteractedAt || a.addedAt || 0))
    .slice(0, 12);

  const isSearchActive = searchQuery.length > 0;

  // HERO GAME LOGIC (Now retrieved from Context to remain static during session)
  const heroGame = useMemo(() => {
     if (!heroGameId) return null;
     return getGame(heroGameId) || null;
  }, [heroGameId, getGame]);

  if (isLoading) return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full"></div>
      </div>
  );

  const handleHeroPlay = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (launchingGameId === heroGame?.id) {
          cancelLaunch();
      } else if (heroGame) {
          startSession(heroGame.id);
      }
  }

  const handleContextMenu = (e: React.MouseEvent, game: Game) => {
      // Prevent browser menu is handled in GameCard logic with e.preventDefault()
      // We just set coordinates here
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

  // EMPTY STATES (Only show if NOT searching)
  if (!isSearchActive && ownedGames.length === 0 && library.length > 0) {
      // User only has wishlist items
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in text-center p-8">
            <h1 className="text-4xl font-bold text-white mb-4">Tu biblioteca está vacía</h1>
            <p className="text-slate-400 mb-8">Tienes {library.length} juegos en Deseados, pero ninguno en propiedad.</p>
            <button onClick={openAddModal} className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold">
                Añadir Juego Comprado
            </button>
        </div>
      );
  }

  if (!isSearchActive && library.length === 0) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in text-center p-8 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/20 blur-[100px] rounded-full -z-10" />
            
            <div className="mb-8 p-6 bg-slate-900 rounded-[32px] border border-white/10 shadow-2xl animate-bounce-slow">
                 <Gamepad size={64} className="text-white" />
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">Nexus Launcher</h1>
            <p className="text-xl text-slate-400 max-w-lg mb-10 leading-relaxed">
                El tracker definitivo para tu vida gamer. 
                <br />Conecta tu mundo.
            </p>
            
            <button 
                onClick={openAddModal}
                className="group relative px-8 py-4 bg-white text-slate-950 rounded-2xl font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
            >
                <span className="relative z-10 flex items-center gap-2">
                    <Plus size={20} /> Inicializar Biblioteca
                </span>
            </button>
        </div>
      );
  }

  return (
    <div className="flex flex-col gap-10 animate-fade-in pb-20">
      
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

      {/* Edit Modal from Dashboard */}
      {editingGame && (
          <EditMetadataModal 
              game={editingGame}
              isOpen={true}
              onClose={() => setEditingGame(null)}
          />
      )}

      {/* Cinematic Hero Section (Only show if NOT searching or if search yields a playable game) */}
      {heroGame && (
        <div className="relative w-full h-[50vh] min-h-[400px] rounded-[40px] overflow-hidden group border border-white/5 shadow-2xl">
          <img 
            src={heroGame.bannerUrl} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[20s] ease-linear transform-gpu will-change-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
          
          <div className="absolute bottom-0 left-0 p-8 lg:p-16 w-full lg:w-2/3 flex flex-col justify-end h-full">
            <div className="flex items-center gap-2 mb-4 animate-slide-up" style={{animationDelay: '0.1s'}}>
                 <span className="px-3 py-1 rounded-full bg-brand-primary text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                    <Flame size={12} fill="currentColor" /> Continuar Jugando
                 </span>
            </div>
            
            <h1 className="text-5xl lg:text-8xl font-black text-white mb-6 leading-[0.9] drop-shadow-2xl line-clamp-2 animate-slide-up" style={{animationDelay: '0.2s'}}>
              {heroGame.title}
            </h1>
            
            <div className="flex items-center gap-6 animate-slide-up" style={{animationDelay: '0.3s'}}>
              <button 
                onClick={handleHeroPlay}
                className={`px-8 py-4 rounded-2xl font-black transition-colors flex items-center gap-2 shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95 transform ${
                    launchingGameId === heroGame.id 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' 
                    : 'bg-brand-primary text-white hover:bg-brand-primary/90'
                }`}
              >
                 {launchingGameId === heroGame.id ? (
                     <>
                        <X size={20} strokeWidth={3} /> CANCELAR
                     </>
                 ) : (
                     <>
                        <Play fill="currentColor" size={20} /> JUGAR
                     </>
                 )}
              </button>

              <button 
                onClick={() => navigate(`/game/${heroGame.id}`)}
                className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-black hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)] group/btn"
              >
                DETALLES <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
              
              <div className="flex items-center gap-4 text-white/80 font-mono text-sm ml-4">
                 <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
                     <Clock size={16} className="text-brand-primary" />
                     <span className="font-bold text-white">{heroGame.hoursPlayed.toFixed(1)}h</span> JUGADO
                 </div>
                 {heroGame.timeToBeat.main > 0 && (
                     <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
                        <Trophy size={16} className="text-yellow-400" />
                        <span className="font-bold text-white">{heroGame.timeToBeat.main}h</span> HISTORIA
                     </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats (Always visible unless search filters everything out) */}
      {!isSearchActive && (
          <div className="space-y-4">
              {/* Header con Tiempo Total (Nuevo Ubicación Mejorada) */}
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    Resumen de Biblioteca
                 </h3>
                 <div className="flex items-center gap-3 bg-brand-primary/10 border border-brand-primary/20 px-4 py-2 rounded-full cursor-pointer hover:bg-brand-primary/20 transition-colors" onClick={() => navigate('/stats')}>
                     <Clock size={16} className="text-brand-primary" />
                     <span className="text-brand-primary font-black text-lg leading-none">{totalPlaytime}<span className="text-xs ml-0.5">h</span></span>
                     <span className="text-[10px] text-brand-primary/70 font-bold uppercase tracking-wide border-l border-brand-primary/20 pl-3">Tiempo Total</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* 1. JUEGOS TOTALES -> LIBRARY ALL */}
                  <div 
                      onClick={() => navigate('/library?view=All')}
                      className="bg-slate-900/50 backdrop-blur-sm border border-white/5 p-6 rounded-3xl flex flex-col justify-between hover:border-blue-400/50 hover:bg-slate-800 transition-all group cursor-pointer"
                  >
                      <Layers className="text-slate-500 mb-4 group-hover:text-blue-400 transition-colors" size={24} />
                      <div>
                          <h4 className="text-3xl font-black text-white">{ownedGames.length}</h4>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-white transition-colors">En Propiedad</p>
                      </div>
                  </div>

                  {/* 2. PENDIENTES -> BACKLOG (NUEVO) */}
                  <div 
                      onClick={() => navigate(`/library?view=${GameStatus.Backlog}`)}
                      className="bg-slate-900/50 backdrop-blur-sm border border-white/5 p-6 rounded-3xl flex flex-col justify-between hover:border-cyan-400/50 hover:bg-slate-800 transition-all group cursor-pointer"
                  >
                      <Hourglass className="text-slate-500 mb-4 group-hover:text-cyan-400 transition-colors" size={24} />
                      <div>
                          <h4 className="text-3xl font-black text-white">{backlogCount}</h4>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-white transition-colors">Pendientes</p>
                      </div>
                  </div>

                  {/* 3. COMPLETADOS -> LIBRARY COMPLETED */}
                  <div 
                      onClick={() => navigate(`/library?view=${GameStatus.Completed}`)}
                      className="bg-slate-900/50 backdrop-blur-sm border border-white/5 p-6 rounded-3xl flex flex-col justify-between hover:border-yellow-400/50 hover:bg-slate-800 transition-all group cursor-pointer"
                  >
                      <Trophy className="text-slate-500 mb-4 group-hover:text-yellow-400 transition-colors" size={24} />
                      <div>
                          <h4 className="text-3xl font-black text-white">{completed}</h4>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-white transition-colors">Completados</p>
                      </div>
                  </div>

                  {/* 4. JUGANDO -> LIBRARY PLAYING */}
                  <div 
                      onClick={() => navigate(`/library?view=${GameStatus.Playing}`)}
                      className="bg-slate-900/50 backdrop-blur-sm border border-white/5 p-6 rounded-3xl flex flex-col justify-between hover:border-green-400/50 hover:bg-slate-800 transition-all group cursor-pointer"
                  >
                      <Zap className="text-slate-500 mb-4 group-hover:text-green-400 transition-colors" size={24} />
                      <div>
                          <h4 className="text-3xl font-black text-white">{playingNow.length}</h4>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-white transition-colors">Jugando</p>
                      </div>
                  </div>

              </div>
          </div>
      )}
      
      {/* SECTION: SHORTCUTS (ACCESOS DIRECTOS) - VISIBLE ONLY IF GAMES PINNED */}
      {!isSearchActive && pinnedGames.length > 0 && (
          <div>
             <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                 <Pin className="text-brand-accent" size={20} /> Accesos Directos
             </h2>
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                 {pinnedGames.map(game => (
                    <GameCard 
                        key={game.id} 
                        game={game} 
                        onClick={(id) => navigate(`/game/${id}`)}
                        onContextMenu={handleContextMenu}
                    />
                 ))}
             </div>
          </div>
      )}

      {/* Recent Activity with Search */}
      <div>
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="text-brand-secondary" /> Recientes
          </h2>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative w-full md:w-72 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-primary transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar en tu colección..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-all shadow-inner"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            <button onClick={() => navigate('/library')} className="text-sm font-bold text-slate-500 hover:text-white transition-colors whitespace-nowrap hidden md:block">VER TODO</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {recentGames.length > 0 ? (
              recentGames.map(game => (
                <GameCard 
                    key={game.id} 
                    game={game} 
                    onClick={(id) => navigate(`/game/${id}`)}
                    onContextMenu={handleContextMenu}
                />
              ))
          ) : isSearchActive ? (
              <div className="col-span-full h-40 flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/5 rounded-2xl">
                  <Search size={32} className="opacity-30 mb-2" />
                  <p>No se encontraron juegos para "{searchQuery}"</p>
              </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
