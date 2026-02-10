
import React, { useEffect, useRef } from 'react';
import { Play, Info, Trash2, Pencil, Square } from 'lucide-react';
import { Game } from '../types';

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Close on scroll too
    const handleScroll = () => onClose();

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
  
  // Simple bounds checking (rough)
  if (x + 200 > window.innerWidth) style.left = x - 200;
  if (y + 250 > window.innerHeight) style.top = y - 250;

  return (
    <div 
      ref={menuRef}
      style={style}
      className="fixed z-[9999] w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in ring-1 ring-white/5"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
        <div className="p-3 border-b border-white/5 bg-white/5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-1">{game.title}</p>
        </div>
        <div className="p-1.5 flex flex-col gap-0.5">
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

            <button 
                onClick={() => { onEdit(); onClose(); }}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 rounded-lg transition-colors w-full text-left"
            >
                <Pencil size={16} /> Editar / Renombrar
            </button>

            <div className="h-px bg-white/5 my-1 mx-2" />

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
