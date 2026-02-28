
import React, { useEffect, useRef, useState } from 'react';
import { Play, Info, Trash2, Pencil, Square, ChevronRight, Check, Pin, PinOff } from 'lucide-react';
import { Game, GameStatus, Platform } from '../types';
import { useGameContext } from '../store/GameContext';
import { STATUS_ICONS, STATUS_COLORS, PLATFORM_ICONS } from '../constants';

interface GameContextMenuProps {
  x: number;
  y: number;
  game: Game;
  isPlaying: boolean;
  onClose: () => void;
  onPlay: () => void;
  onDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const GameContextMenu: React.FC<GameContextMenuProps> = ({ 
  x, y, game, isPlaying, onClose, onPlay, onDetails, onEdit, onDelete 
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { updateEntry } = useGameContext();
  const [activeSubmenu, setActiveSubmenu] = useState<'STATUS' | 'PLATFORM' | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // CRITICAL FIX: The previous scroll listener used 'true' (capture), which detected scroll
    // inside the menu itself and closed it. We now check the target.
    const handleScroll = (event: Event) => {
        if (menuRef.current && menuRef.current.contains(event.target as Node)) {
            // Scroll happened inside the menu, do nothing
            return;
        }
        // Scroll happened outside (page scroll), close menu
        onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true); 
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  // Adjust position to not overflow screen
  const style: React.CSSProperties = {
    top: y,
    left: x,
  };
  
  // Intelligent Positioning
  if (x + 260 > window.innerWidth) style.left = x - 260;
  // If near bottom, move up slightly
  if (y + 500 > window.innerHeight) style.top = Math.max(10, window.innerHeight - 500);

  const translateStatus = (status: GameStatus) => {
      const map: Record<GameStatus, string> = {
          [GameStatus.Backlog]: 'Pendiente',
          [GameStatus.Playing]: 'Jugando',
          [GameStatus.Completed]: 'Completado',
          [GameStatus.Platinums]: 'Platinado',
          [GameStatus.Dropped]: 'Abandonado',
          [GameStatus.Wishlist]: 'Deseado',
          [GameStatus.Extra]: 'Extra / Casual',
      };
      return map[status] || status;
  };

  const handleUpdate = (data: any) => {
      updateEntry(game.id, data);
      onClose();
  };

  return (
    <div 
      ref={menuRef}
      style={style}
      className="fixed z-[9999] w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in ring-1 ring-white/5 flex flex-col"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
        <div className="p-3 border-b border-white/5 bg-white/5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-1">{game.title}</p>
        </div>
        
        <div className="p-1.5 flex flex-col gap-0.5 overflow-y-auto max-h-[80vh] custom-scrollbar">
            <button 
                onClick={() => { onPlay(); onClose(); }}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-primary rounded-lg transition-colors w-full text-left"
            >
                {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                {isPlaying ? 'Detener Sesión' : 'Jugar'}
            </button>
            
            <button 
                onClick={() => { onDetails(); onClose(); }}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 rounded-lg transition-colors w-full text-left"
            >
                <Info size={16} /> Ver Detalles
            </button>

            {/* NESTED MENUS VIA ACCORDION LOGIC FOR STABILITY */}
            
            {/* 1. STATUS MENU */}
            <div className="relative">
                <button 
                    onClick={() => setActiveSubmenu(activeSubmenu === 'STATUS' ? null : 'STATUS')}
                    className={`flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeSubmenu === 'STATUS' ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/5'}`}
                >
                    <span className="flex items-center gap-3">
                         {STATUS_ICONS[game.status]} {translateStatus(game.status)}
                    </span>
                    <ChevronRight size={14} className={`transition-transform ${activeSubmenu === 'STATUS' ? 'rotate-90' : ''}`} />
                </button>
                
                {activeSubmenu === 'STATUS' && (
                    <div className="bg-slate-950/50 rounded-lg my-1 p-1 border border-white/5">
                        {Object.values(GameStatus).map((status) => (
                            <button
                                key={status}
                                onClick={() => handleUpdate({ status })}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            >
                                <span className={`w-2 h-2 rounded-full ${status === game.status ? 'bg-brand-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-700'}`} />
                                {translateStatus(status)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. PLATFORM MENU */}
            <div className="relative">
                <button 
                    onClick={() => setActiveSubmenu(activeSubmenu === 'PLATFORM' ? null : 'PLATFORM')}
                    className={`flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeSubmenu === 'PLATFORM' ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/5'}`}
                >
                    <span className="flex items-center gap-3">
                         {PLATFORM_ICONS[game.platform] || PLATFORM_ICONS[Platform.Other]} {game.platform}
                    </span>
                    <ChevronRight size={14} className={`transition-transform ${activeSubmenu === 'PLATFORM' ? 'rotate-90' : ''}`} />
                </button>
                
                {activeSubmenu === 'PLATFORM' && (
                    <div className="bg-slate-950/50 rounded-lg my-1 p-1 border border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                        {Object.values(Platform).map((platform) => (
                            <button
                                key={platform}
                                onClick={() => handleUpdate({ platform })}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors truncate"
                            >
                                <span className="shrink-0">{PLATFORM_ICONS[platform]}</span>
                                <span className="truncate">{platform}</span>
                                {game.platform === platform && <Check size={12} className="ml-auto text-brand-primary" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="h-px bg-white/5 my-1 mx-2" />

             {/* 3. PIN / UNPIN */}
             <button 
                onClick={() => handleUpdate({ isPinned: !game.isPinned })}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 rounded-lg transition-colors w-full text-left"
            >
                {game.isPinned ? <PinOff size={16} className="text-brand-primary" /> : <Pin size={16} />}
                {game.isPinned ? 'Desfijar de Inicio' : 'Fijar en Inicio'}
            </button>

            <button 
                onClick={() => { onEdit(); onClose(); }}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 rounded-lg transition-colors w-full text-left"
            >
                <Pencil size={16} /> Editar Metadata
            </button>

            <button 
                onClick={() => { 
                    if(confirm(`¿Estás seguro de que quieres eliminar "${game.title}"?`)) {
                        onDelete(); 
                        onClose(); 
                    }
                }}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors w-full text-left"
            >
                <Trash2 size={16} /> Eliminar
            </button>
        </div>
    </div>
  );
};
