
import React, { memo } from 'react';
import { Game } from '../types';
import { Badge } from './ui/Badge';
import { Star, Clock, Play, BarChart2, Loader2, X } from 'lucide-react';
import { PLATFORM_ICONS } from '../constants';
import { useGameContext } from '../store/GameContext';

interface GameCardProps {
  game: Game;
  onClick: (id: number) => void;
  onContextMenu?: (e: React.MouseEvent, game: Game) => void;
}

// Optimization: Use React.memo to prevent unnecessary re-renders when parent state changes
export const GameCard: React.FC<GameCardProps> = memo(({ game, onClick, onContextMenu }) => {
  const { startSession, activeSession, launchingGameId, cancelLaunch } = useGameContext();
  const isPlaying = activeSession?.gameId === game.id;
  const isLaunching = launchingGameId === game.id;

  const getPlatformIcon = (name: string) => {
    for (const [key, icon] of Object.entries(PLATFORM_ICONS)) {
        if (name.includes(key)) return icon;
    }
    return PLATFORM_ICONS['Other'];
  };

  const handlePlayClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      startSession(game.id);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      cancelLaunch();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, game);
      }
  }

  // Safety fallback for broken metadata
  const safeTitle = game.title || 'Juego sin título';
  const safeCover = game.coverUrl || 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=900&auto=format&fit=crop';

  return (
    <div 
      onClick={() => onClick(game.id)}
      onContextMenu={handleContextMenu}
      // Performance: Added transform-gpu for hardware acceleration and removed heavy backdrop blur on main container
      className={`group relative flex flex-col w-full bg-slate-900 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 transform-gpu hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border animate-fade-in ${isPlaying || isLaunching ? 'border-brand-primary ring-2 ring-brand-primary/50' : 'border-white/5 hover:border-brand-primary/50'}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-950">
        <img 
          src={safeCover} 
          alt={safeTitle} 
          // Performance: Lazy loading and async decoding for heavy GIFs
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 will-change-transform"
        />
        
        {/* Gradient Overlay - Optimized opacity transition */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Active Session Indicator */}
        {isPlaying && !isLaunching && (
            <div className="absolute inset-0 bg-brand-primary/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                 <div className="bg-brand-primary text-white p-3 rounded-full shadow-lg animate-pulse">
                    <BarChart2 size={24} />
                 </div>
            </div>
        )}

        {/* Launching Indicator & Cancel */}
        {isLaunching && (
            <div className="absolute inset-0 bg-brand-primary/40 backdrop-blur-sm flex items-center justify-center z-20">
                 <div className="flex flex-col items-center gap-2">
                     <div className="bg-brand-primary text-white p-3 rounded-full shadow-lg">
                        <Loader2 size={24} className="animate-spin" />
                     </div>
                     <span className="font-bold text-white uppercase tracking-wider text-xs bg-slate-900/50 px-2 py-1 rounded">Lanzando...</span>
                     
                     {/* CANCEL BUTTON */}
                     <button 
                        onClick={handleCancelClick}
                        className="mt-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors shadow-lg flex items-center gap-1 px-3"
                     >
                        <X size={14} /> <span className="text-[10px] font-bold">CANCELAR</span>
                     </button>
                 </div>
            </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             {game.aggregatedRating > 85 && (
                 <div className="bg-green-500/90 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg backdrop-blur-md">
                    MUST PLAY
                 </div>
             )}
        </div>

        {/* Rating Badges */}
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2 items-end">
             {/* User Rating (1-10) */}
             {game.rating10 > 0 && (
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-primary border border-brand-primary/50 text-white text-sm font-black shadow-lg backdrop-blur-md animate-pulse-subtle">
                    {game.rating10}
                </div>
             )}

             {/* Metacritic Rating */}
             {game.aggregatedRating > 0 && (
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-[10px] font-bold backdrop-blur-md shadow-lg ${
                    game.aggregatedRating >= 80 ? 'bg-emerald-900/80 border-emerald-500 text-emerald-400' : 
                    game.aggregatedRating >= 60 ? 'bg-yellow-900/80 border-yellow-500 text-yellow-400' : 'bg-slate-800/80 border-slate-600 text-slate-300'
                }`}>
                    {Math.round(game.aggregatedRating)}
                </div>
             )}
        </div>

        {/* Play Button Hover */}
        {!isPlaying && !isLaunching && (
            <button 
                onClick={handlePlayClick}
                className="absolute bottom-20 right-4 w-12 h-12 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-lg translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-30"
                title="Iniciar Cronómetro"
            >
                <Play fill="currentColor" size={20} className="ml-1" />
            </button>
        )}

        {/* Bottom Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
             <div className="flex justify-between items-end mb-2">
                <Badge status={game.status} />
             </div>
             
             <h3 className="font-bold text-white text-lg leading-tight line-clamp-2 drop-shadow-md mb-2">
                {safeTitle}
             </h3>

             <div className="flex items-center justify-between text-xs font-medium text-slate-400 border-t border-white/10 pt-2">
                 <div className="flex items-center gap-1.5 text-slate-300">
                    {getPlatformIcon(game.platform)}
                    <span className="truncate max-w-[80px]">{game.platform}</span>
                 </div>
                 {game.hoursPlayed > 0 && (
                    <div className="flex items-center gap-1 text-brand-primary">
                        <Clock size={12} /> {game.hoursPlayed.toFixed(1)}h
                    </div>
                 )}
             </div>
        </div>
      </div>
    </div>
  );
});
