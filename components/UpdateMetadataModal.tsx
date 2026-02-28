
import React, { useEffect, useState } from 'react';
import { Game, GameMetadata } from '../types';
import { fetchMetadata } from '../services/metadataService';
import { X, ArrowRight, Loader2, Check, AlertCircle, Image as ImageIcon, RefreshCcw } from 'lucide-react';

interface UpdateMetadataModalProps {
  currentGame: Game;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newData: GameMetadata) => void;
}

export const UpdateMetadataModal: React.FC<UpdateMetadataModalProps> = ({ currentGame, isOpen, onClose, onConfirm }) => {
  const [newData, setNewData] = useState<GameMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      // Fetch fresh data using the stored external ID (or just the game ID if it matches IGDB)
      // Assuming game.id is the IGDB ID based on current architecture
      fetchMetadata(currentGame.id)
        .then(data => {
            setNewData(data);
        })
        .catch(err => {
            setError("No se pudo conectar con el servidor de metadatos.");
        })
        .finally(() => {
            setIsLoading(false);
        });
    } else {
        setNewData(null);
    }
  }, [isOpen, currentGame.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl bg-[#0b101b] rounded-[32px] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
               Actualización Oficial <RefreshCcw size={20} className="text-brand-primary" />
            </h2>
            <p className="text-sm text-slate-400 font-medium">Compara los cambios antes de aplicar.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={48} className="animate-spin text-brand-primary" />
                    <p className="text-white font-bold animate-pulse">Consultando IGDB...</p>
                </div>
            ) : error ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4 text-center">
                    <AlertCircle size={48} className="text-red-500" />
                    <p className="text-white font-bold">Error de sincronización</p>
                    <p className="text-slate-400 text-sm">{error}</p>
                </div>
            ) : newData ? (
                <div className="space-y-8">
                    
                    {/* Comparison Grid */}
                    <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                        {/* Headers */}
                        <div className="text-center pb-2 border-b border-white/10">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Versión Actual</span>
                        </div>
                        <div />
                        <div className="text-center pb-2 border-b border-brand-primary/30">
                            <span className="text-xs font-bold text-brand-primary uppercase tracking-widest">Nueva Versión</span>
                        </div>

                        {/* COVER COMPARISON */}
                        <div className="flex flex-col items-center gap-2">
                             <div className="relative w-32 aspect-[2/3] rounded-lg overflow-hidden border border-white/10 opacity-70 grayscale hover:grayscale-0 transition-all">
                                <img src={currentGame.coverUrl} className="w-full h-full object-cover" />
                             </div>
                             <span className="text-[10px] text-slate-500">Portada Actual</span>
                        </div>

                        <div className="flex justify-center text-slate-600">
                            <ArrowRight size={24} />
                        </div>

                        <div className="flex flex-col items-center gap-2">
                             <div className="relative w-32 aspect-[2/3] rounded-lg overflow-hidden border-2 border-brand-primary shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                <img src={newData.coverUrl} className="w-full h-full object-cover" />
                                {currentGame.coverUrl !== newData.coverUrl && (
                                    <div className="absolute top-2 right-2 bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</div>
                                )}
                             </div>
                             <span className="text-[10px] text-brand-primary font-bold">Portada Oficial</span>
                        </div>

                        {/* BANNER COMPARISON */}
                        <div className="flex flex-col items-center gap-2 mt-4">
                             <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 opacity-70 grayscale hover:grayscale-0 transition-all">
                                <img src={currentGame.bannerUrl} className="w-full h-full object-cover" />
                             </div>
                             <span className="text-[10px] text-slate-500">Banner Actual</span>
                        </div>

                        <div className="flex justify-center text-slate-600 mt-4">
                            <ArrowRight size={24} />
                        </div>

                        <div className="flex flex-col items-center gap-2 mt-4">
                             <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-brand-primary shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                <img src={newData.bannerUrl} className="w-full h-full object-cover" />
                                {currentGame.bannerUrl !== newData.bannerUrl && (
                                    <div className="absolute top-2 right-2 bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</div>
                                )}
                             </div>
                             <span className="text-[10px] text-brand-primary font-bold">Banner Oficial</span>
                        </div>
                    </div>

                    {/* Info Diff */}
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Título</span>
                            <div className="flex items-center gap-2">
                                <span className={currentGame.title !== newData.title ? "text-red-400 line-through text-xs" : "text-slate-500"}>
                                    {currentGame.title !== newData.title ? currentGame.title : ""}
                                </span>
                                <span className="text-white font-bold">{newData.title}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Rating</span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">{Math.round(currentGame.aggregatedRating || 0)}</span>
                                <ArrowRight size={12} className="text-slate-600" />
                                <span className="text-brand-primary font-bold">{Math.round(newData.aggregatedRating || 0)}</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-center text-slate-500">
                        Esta acción actualizará las imágenes y la información básica con los datos más recientes de IGDB. Tu estado, horas y notas se mantendrán.
                    </p>

                </div>
            ) : null}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-[#0b101b] flex gap-4">
            <button 
                onClick={onClose}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={() => newData && onConfirm(newData)}
                disabled={!newData || isLoading}
                className="flex-[2] py-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-black rounded-2xl transition-colors shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                Confirmar Actualización
            </button>
        </div>

      </div>
    </div>
  );
};
