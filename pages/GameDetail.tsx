
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameContext } from '../store/GameContext';
import { GameStatus, Platform } from '../types';
import { Badge } from '../components/ui/Badge';
import { EditMetadataModal } from '../components/EditMetadataModal';
import { ArrowLeft, Trash2, Calendar, Clock, Star, Gamepad2, Globe, Database, Monitor, CheckCircle, Pencil, Play, Square, Loader2 } from 'lucide-react';

export const GameDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getGame, updateEntry, removeFromLibrary, syncMetadata, isSyncing, startSession, stopSession, activeSession, launchingGameId } = useGameContext();

  const game = getGame(Number(id));
  const isPlaying = activeSession?.gameId === game?.id;
  const isLaunching = launchingGameId === game?.id;
  
  // Local state for edits (Allow floats)
  const [playtime, setPlaytime] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (game) setPlaytime(game.hoursPlayed);
  }, [game]);

  if (!game) return <div className="p-10 text-white">Juego no encontrado</div>;

  const handleBlurPlaytime = () => {
    updateEntry(game.id, { hoursPlayed: playtime });
  };

  const handleDelete = () => {
    if(confirm('¿Eliminar de la biblioteca? La metadata seguirá en caché.')) {
        removeFromLibrary(game.id);
        navigate('/library');
    }
  };

  const handleSessionToggle = () => {
      if (isPlaying) {
          stopSession();
      } else {
          startSession(game.id);
      }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

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
  }

  return (
    <div className="animate-fade-in -mt-8 -mx-8 pb-20 overflow-x-hidden">
      <EditMetadataModal 
        game={game} 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />
      
      {/* Immersive Header */}
      <div className="relative w-full h-[60vh] min-h-[500px]">
         <div className="absolute inset-0">
             <img src={game.bannerUrl} className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
             <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent" />
         </div>

         <div className="absolute top-8 left-8 z-20">
             <button onClick={() => navigate(-1)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md text-white transition-colors border border-white/5">
                <ArrowLeft size={20} />
             </button>
         </div>

         <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 max-w-7xl mx-auto flex flex-col md:flex-row items-end gap-10">
             <img 
                src={game.coverUrl} 
                className="w-48 md:w-64 rounded-xl shadow-2xl border border-white/10 hidden md:block"
                style={{boxShadow: '0 0 40px rgba(0,0,0,0.5)'}}
             />
             <div className="flex-1 mb-4">
                 <div className="flex flex-wrap gap-2 mb-4">
                     {game.genres.map(g => (
                         <span key={g} className="px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-bold text-white border border-white/5">
                             {g}
                         </span>
                     ))}
                 </div>
                 <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-none tracking-tight drop-shadow-2xl">
                     {game.title}
                 </h1>
                 <div className="flex items-center gap-6">
                     <Badge status={game.status} size="md" />
                     {game.aggregatedRating > 0 && (
                         <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                             <span className="text-green-400 font-black text-lg">{Math.round(game.aggregatedRating)}</span>
                             <span className="text-green-400/70 text-xs font-bold uppercase">Nota Media</span>
                         </div>
                     )}
                     
                     {/* STEAM BADGE */}
                     {game.steamAppId && (
                         <div className="flex items-center gap-2 bg-[#171a21] px-3 py-1.5 rounded-lg border border-[#1b2838] shadow-lg">
                             <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/2048px-Steam_icon_logo.svg.png" className="w-4 h-4" />
                             <span className="text-blue-200 font-bold text-xs uppercase tracking-wide">Steam</span>
                             {game.autoSynced && <CheckCircle size={12} className="text-green-500" />}
                         </div>
                     )}
                 </div>
             </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Content (Metadata - Immutable View) */}
          <div className="lg:col-span-2 space-y-12">
               
               {/* Screenshots */}
               {game.screenshots.length > 0 && (
                   <div className="space-y-4">
                       <h3 className="text-xl font-bold text-white flex items-center gap-2">
                           <Monitor className="text-brand-primary" /> Multimedia
                       </h3>
                       <div className="grid grid-cols-2 gap-4">
                           {game.screenshots.map((s, i) => (
                               <div key={i} className="aspect-video rounded-xl overflow-hidden border border-white/5 group cursor-pointer">
                                   <img src={s} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                               </div>
                           ))}
                       </div>
                   </div>
               )}

               <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5">
                   <h3 className="text-xl font-bold text-white mb-4">Sinopsis</h3>
                   <p className="text-slate-300 leading-relaxed text-lg font-light">
                       {game.description}
                   </p>
               </div>

               {/* HLTB Data (Source of Truth) */}
               <div className="space-y-4">
                   <h3 className="text-xl font-bold text-white flex items-center gap-2">
                       <Clock className="text-brand-secondary" /> Tiempo para Completar
                   </h3>
                   <div className="grid grid-cols-3 gap-4">
                       <div className="bg-[#1e293b] p-6 rounded-2xl border-t-4 border-blue-500 text-center">
                           <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Historia Principal</div>
                           <div className="text-3xl font-black text-white">{game.timeToBeat.main || '--'}h</div>
                       </div>
                       <div className="bg-[#1e293b] p-6 rounded-2xl border-t-4 border-purple-500 text-center">
                           <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Historia + Extra</div>
                           <div className="text-3xl font-black text-white">{game.timeToBeat.extra || '--'}h</div>
                       </div>
                       <div className="bg-[#1e293b] p-6 rounded-2xl border-t-4 border-red-500 text-center">
                           <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Completista</div>
                           <div className="text-3xl font-black text-white">{game.timeToBeat.completionist || '--'}h</div>
                       </div>
                   </div>
                   <p className="text-xs text-slate-500 text-center mt-2">Datos de HowLongToBeat & Global Database</p>
               </div>
          </div>

          {/* Sidebar (User Data - Mutable) */}
          <div className="space-y-6">
               <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-3xl border border-white/10 shadow-2xl sticky top-24">
                   <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                       <Database size={20} className="text-brand-accent" /> Mi Progreso
                   </h3>
                   
                   <div className="space-y-6">
                       
                       {/* Play Button */}
                       <button 
                            onClick={handleSessionToggle}
                            disabled={isLaunching}
                            className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                                isPlaying 
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' 
                                : isLaunching 
                                ? 'bg-brand-primary/50 text-white cursor-wait'
                                : 'bg-brand-primary hover:bg-brand-primary/90 text-white shadow-brand-primary/30'
                            }`}
                       >
                            {isLaunching ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} /> Lanzando...
                                </>
                            ) : isPlaying ? (
                                <>
                                    <Square fill="currentColor" size={18} /> Detener Sesión
                                </>
                            ) : (
                                <>
                                    <Play fill="currentColor" size={18} /> Jugar Ahora
                                </>
                            )}
                       </button>

                       {/* Status */}
                       <div>
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Estado</label>
                           <select 
                               value={game.status}
                               onChange={(e) => updateEntry(game.id, { status: e.target.value as GameStatus })}
                               className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-brand-primary/50"
                           >
                               {Object.values(GameStatus).map(s => <option key={s} value={s}>{translateStatus(s)}</option>)}
                           </select>
                       </div>

                       {/* Platform */}
                       <div>
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Plataforma</label>
                           <select 
                               value={game.platform}
                               onChange={(e) => updateEntry(game.id, { platform: e.target.value })}
                               className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-brand-primary/50"
                           >
                               {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
                           </select>
                       </div>

                       {/* Hours Played */}
                       <div>
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                               Horas Jugadas
                               {game.steamAppId && <span className="text-[#66c0f4] flex items-center gap-1"><Monitor size={10} /> Syncing</span>}
                           </label>
                           <div className="relative">
                               <input 
                                   type="number" 
                                   step="0.1"
                                   value={playtime}
                                   onChange={(e) => setPlaytime(parseFloat(e.target.value))}
                                   onBlur={handleBlurPlaytime}
                                   className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-2xl font-mono font-bold text-white focus:ring-2 focus:ring-brand-primary/50"
                               />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">HORAS</span>
                           </div>
                       </div>

                       {/* Rating */}
                       <div>
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Mi Nota</label>
                           <div className="flex justify-between bg-black/20 border border-white/10 rounded-xl p-3">
                                {[1,2,3,4,5].map(star => (
                                    <button 
                                        key={star}
                                        onClick={() => updateEntry(game.id, { userRating: star * 20 })} // Store as 0-100
                                        className="hover:scale-110 transition-transform"
                                    >
                                        <Star 
                                            size={24} 
                                            className={game.userRating >= star * 20 ? "fill-yellow-400 text-yellow-400" : "text-slate-700"}
                                        />
                                    </button>
                                ))}
                           </div>
                       </div>
                   </div>

                   <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                       <button 
                            onClick={() => setIsEditModalOpen(true)}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors border border-white/5"
                       >
                            <Pencil size={16} /> Editar Metadatos / Corregir
                       </button>

                       <button 
                            onClick={() => syncMetadata()}
                            disabled={isSyncing}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                       >
                            <Globe size={16} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? "Sincronizando..." : "Actualizar Metadata"}
                       </button>

                       <button 
                            onClick={handleDelete}
                            className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                       >
                            <Trash2 size={16} /> Eliminar de la Biblioteca
                       </button>
                   </div>
               </div>

               {/* Meta Info */}
               <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
                   <div className="flex justify-between text-sm">
                       <span className="text-slate-500">Lanzamiento</span>
                       <span className="text-white font-medium">{formatDate(game.releaseDate)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                       <span className="text-slate-500">Desarrollador</span>
                       <span className="text-white font-medium truncate max-w-[150px]">{game.developers?.[0] || 'Desconocido'}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                       <span className="text-slate-500">Publisher</span>
                       <span className="text-white font-medium truncate max-w-[150px]">{game.publishers?.[0] || 'Desconocido'}</span>
                   </div>
               </div>
          </div>
      </div>
    </div>
  );
};
