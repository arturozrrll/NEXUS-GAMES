
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameContext } from '../store/GameContext';
import { GameStatus, Platform, Game } from '../types';
import { Badge } from '../components/ui/Badge';
import { EditMetadataModal } from '../components/EditMetadataModal';
import { UpdateMetadataModal } from '../components/UpdateMetadataModal'; 
import { fetchMetadata } from '../services/metadataService';
import { ArrowLeft, Trash2, Clock, Star, Monitor, CheckCircle, Pencil, Play, Square, Loader2, RefreshCcw, Database, Plus, X } from 'lucide-react';
import { PLATFORM_ICONS } from '../constants';

export const GameDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getGame, updateEntry, removeFromLibrary, addToLibrary, saveMetadata, syncHLTB, isSyncingHLTB, startSession, stopSession, cancelLaunch, activeSession, launchingGameId } = useGameContext();

  const libraryGame = getGame(Number(id));
  
  // Local state for previewing games not in library
  const [localGame, setLocalGame] = useState<Game | null>(null);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Combine Library Game or Local Preview
  const game = libraryGame || localGame;
  const isOwned = !!libraryGame;

  const isPlaying = activeSession?.gameId === game?.id;
  const isLaunching = launchingGameId === game?.id;
  
  const [playtime, setPlaytime] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false); 

  // Fetch Metadata if not in Library (Preview Mode)
  useEffect(() => {
    if (!libraryGame && id) {
        setIsLoadingLocal(true);
        fetchMetadata(Number(id))
            .then(meta => {
                const virtualGame: Game = {
                    ...meta,
                    status: GameStatus.Backlog,
                    platform: Platform.PC,
                    userRating: 0,
                    hoursPlayed: 0,
                    addedAt: Date.now(),
                };
                setLocalGame(virtualGame);
            })
            .catch(err => {
                console.error("Failed to fetch preview", err);
            })
            .finally(() => setIsLoadingLocal(false));
    }
  }, [libraryGame, id]);

  useEffect(() => {
    if (game) setPlaytime(game.hoursPlayed);
  }, [game]);

  const handleAddToLibrary = async () => {
      if (!game) return;
      setIsAdding(true);
      try {
          // If future release, auto-set to wishlist
          const status = new Date(game.releaseDate) > new Date() ? GameStatus.Wishlist : GameStatus.Backlog;
          await addToLibrary(game.id, status, Platform.PC, game);
      } finally {
          setIsAdding(false);
      }
  };

  const handleBlurPlaytime = () => {
    if (isOwned && game) updateEntry(game.id, { hoursPlayed: playtime });
  };

  const handleDelete = () => {
    if (game && confirm('¿Eliminar de la biblioteca? La metadata seguirá en caché.')) {
        removeFromLibrary(game.id);
        navigate('/library');
    }
  };

  const handleSessionToggle = () => {
      if (!game) return;
      if (isLaunching) {
          cancelLaunch();
          return;
      }
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

  if (isLoadingLocal) {
      return (
          <div className="h-[50vh] flex flex-col items-center justify-center gap-4 text-white">
              <Loader2 size={40} className="animate-spin text-brand-primary" />
              <p>Cargando información del juego...</p>
          </div>
      );
  }

  if (!game) return <div className="p-10 text-white">Juego no encontrado</div>;

  return (
    <div className="animate-fade-in -mt-8 -mx-8 pb-20 overflow-x-hidden w-full">
      {isOwned && (
        <>
            <EditMetadataModal 
                game={game} 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
            />
            <UpdateMetadataModal
                currentGame={game}
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                onConfirm={(newData) => {
                    saveMetadata(game.id, newData);
                    setIsUpdateModalOpen(false);
                }}
            />
        </>
      )}
      
      {/* Immersive Banner - Full Width */}
      <div className="relative w-full h-[65vh] min-h-[500px] border-b border-white/5">
         <div className="absolute inset-0">
             <img src={game.bannerUrl} className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
             {/* Improved gradient for better text readability */}
             <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/60 to-transparent" />
             <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/80 via-transparent to-transparent" />
         </div>

         <div className="absolute top-8 left-8 z-20">
             <button onClick={() => navigate(-1)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md text-white transition-colors border border-white/5 group">
                <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
             </button>
         </div>

         {/* Banner Content - Full Width Container */}
         <div className="absolute bottom-0 left-0 w-full px-8 md:px-16 pb-12 pt-32 flex flex-col md:flex-row items-end gap-10">
             <div className="relative shrink-0 hidden md:block group perspective">
                <img 
                    src={game.coverUrl} 
                    className="w-56 lg:w-72 rounded-xl shadow-2xl border border-white/10 transition-transform duration-500 group-hover:rotate-y-6 group-hover:scale-105"
                    style={{boxShadow: '0 20px 50px -10px rgba(0,0,0,0.8)'}}
                />
             </div>
             
             <div className="flex-1 mb-2">
                 <div className="flex flex-wrap gap-2 mb-4">
                     {game.genres.map(g => (
                         <span key={g} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs font-bold text-white border border-white/5 hover:bg-white/20 transition-colors cursor-default">
                             {g}
                         </span>
                     ))}
                 </div>
                 
                 <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[0.9] tracking-tighter drop-shadow-2xl">
                     {game.title}
                 </h1>
                 
                 <div className="flex flex-wrap items-center gap-6">
                     {isOwned && <Badge status={game.status} size="md" />}
                     
                     {!isOwned && (
                        <div className="px-3 py-1.5 bg-brand-primary/20 text-brand-primary rounded-lg border border-brand-primary/30 font-bold uppercase text-xs animate-pulse">
                            Vista Previa
                        </div>
                     )}
                     
                     {game.aggregatedRating > 0 && (
                         <div className="flex items-center gap-3 bg-slate-950/40 backdrop-blur px-4 py-2 rounded-xl border border-white/10">
                             <div className={`text-2xl font-black ${game.aggregatedRating >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {Math.round(game.aggregatedRating)}
                             </div>
                             <div className="flex flex-col leading-none">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase">Nota</span>
                                 <span className="text-[10px] text-white font-bold uppercase">Media</span>
                             </div>
                         </div>
                     )}
                     
                     {game.steamAppId && (
                         <div className="flex items-center gap-3 bg-[#171a21]/80 backdrop-blur px-4 py-2 rounded-xl border border-[#1b2838] shadow-lg cursor-pointer hover:bg-[#171a21] transition-colors" onClick={() => window.open(`https://store.steampowered.com/app/${game.steamAppId}`, '_blank')}>
                             {PLATFORM_ICONS[Platform.Steam]}
                             <div className="flex flex-col leading-none">
                                <span className="text-[10px] text-[#66c0f4] font-bold uppercase tracking-wide">Steam</span>
                                {game.autoSynced && <span className="text-[9px] text-green-400 flex items-center gap-1"><CheckCircle size={8} /> Sync</span>}
                             </div>
                         </div>
                     )}
                 </div>
             </div>
         </div>
      </div>

      {/* Main Content - Full Width Grid */}
      <div className="w-full px-8 md:px-16 py-12">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          
            {/* Left Column (Main Info) */}
            <div className="xl:col-span-8 space-y-12">
                {/* Screenshots */}
                {game.screenshots.length > 0 && (
                   <div className="space-y-6">
                       <h3 className="text-2xl font-black text-white flex items-center gap-3">
                           <Monitor className="text-brand-primary" /> Galería
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {game.screenshots.map((s, i) => (
                               <div key={i} className="aspect-video rounded-2xl overflow-hidden border border-white/5 group cursor-pointer relative">
                                   <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                                   <img src={s} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                               </div>
                           ))}
                       </div>
                   </div>
               )}

               {/* Description */}
               <div className="bg-slate-900/30 p-8 md:p-10 rounded-[32px] border border-white/5">
                   <h3 className="text-2xl font-black text-white mb-6">Sinopsis</h3>
                   <p className="text-slate-300 leading-loose text-lg font-light text-justify">
                       {game.description}
                   </p>
               </div>

               {/* HLTB Data Section */}
               <div className="space-y-6">
                   <div className="flex items-center justify-between">
                       <h3 className="text-2xl font-black text-white flex items-center gap-3">
                           <Clock className="text-brand-secondary" /> Duración Estimada
                       </h3>
                       {isOwned && (
                           <button 
                             onClick={() => syncHLTB(game.id)}
                             disabled={isSyncingHLTB}
                             className="flex items-center gap-2 text-xs font-bold text-brand-secondary hover:text-white transition-colors bg-brand-secondary/10 px-4 py-2 rounded-xl border border-brand-secondary/20 disabled:opacity-50"
                           >
                             {isSyncingHLTB ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                             ACTUALIZAR DATOS
                           </button>
                       )}
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-[#1e293b]/50 backdrop-blur p-8 rounded-3xl border-t-4 border-blue-500 text-center relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                           <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3">Historia Principal</div>
                           <div className="text-5xl font-black text-white tracking-tighter">{game.timeToBeat.main || '--'}<span className="text-2xl text-slate-500 ml-1">h</span></div>
                       </div>
                       <div className="bg-[#1e293b]/50 backdrop-blur p-8 rounded-3xl border-t-4 border-purple-500 text-center relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                           <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3">Historia + Extra</div>
                           <div className="text-5xl font-black text-white tracking-tighter">{game.timeToBeat.extra || '--'}<span className="text-2xl text-slate-500 ml-1">h</span></div>
                       </div>
                       <div className="bg-[#1e293b]/50 backdrop-blur p-8 rounded-3xl border-t-4 border-red-500 text-center relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                           <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3">Completista</div>
                           <div className="text-5xl font-black text-white tracking-tighter">{game.timeToBeat.completionist || '--'}<span className="text-2xl text-slate-500 ml-1">h</span></div>
                       </div>
                   </div>
                   <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold opacity-60">Datos sincronizados con HowLongToBeat</p>
               </div>
            </div>

            {/* Right Column (Sidebar Actions) */}
            <div className="xl:col-span-4 space-y-8">
               
               {/* Action Card */}
               <div className="bg-slate-900 border border-white/10 p-8 rounded-[32px] shadow-2xl sticky top-24">
                   <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                       <Database size={24} className="text-brand-accent" /> {isOwned ? "Gestión de Estado" : "Acciones"}
                   </h3>
                   
                   {isOwned ? (
                       // --- OWNED MODE ---
                       <div className="space-y-8">
                           <button 
                                onClick={handleSessionToggle}
                                className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-lg transform active:scale-95 ${
                                    isLaunching
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                                    : isPlaying 
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' 
                                    : 'bg-brand-primary hover:bg-brand-primary/90 text-white shadow-brand-primary/30'
                                }`}
                           >
                                {isLaunching ? (
                                    <>
                                        <X size={24} strokeWidth={3} /> CANCELAR
                                    </>
                                ) : isPlaying ? (
                                    <>
                                        <Square fill="currentColor" size={24} /> Detener Sesión
                                    </>
                                ) : (
                                    <>
                                        <Play fill="currentColor" size={24} /> Jugar Ahora
                                    </>
                                )}
                           </button>
                           {isLaunching && <p className="text-center text-xs text-red-400 font-bold animate-pulse">Lanzando juego en 20 segundos...</p>}

                           <div className="space-y-4">
                               <div>
                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Estado</label>
                                   <div className="relative">
                                       <select 
                                           value={game.status}
                                           onChange={(e) => updateEntry(game.id, { status: e.target.value as GameStatus })}
                                           className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white appearance-none focus:ring-2 focus:ring-brand-primary/50 font-bold"
                                       >
                                           {Object.values(GameStatus).map(s => <option key={s} value={s}>{translateStatus(s)}</option>)}
                                       </select>
                                       <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                                   </div>
                               </div>

                               <div>
                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Plataforma</label>
                                   <div className="relative">
                                       <select 
                                           value={game.platform}
                                           onChange={(e) => updateEntry(game.id, { platform: e.target.value })}
                                           className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white appearance-none focus:ring-2 focus:ring-brand-primary/50 font-bold"
                                       >
                                           {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
                                       </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                                   </div>
                               </div>

                               <div>
                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex justify-between ml-1">
                                       Tiempo de Juego
                                       {game.steamAppId && <span className="text-[#66c0f4] flex items-center gap-1"><Monitor size={10} /> Syncing</span>}
                                   </label>
                                   <div className="relative group">
                                       <input 
                                           type="number" 
                                           step="0.1"
                                           value={playtime}
                                           onChange={(e) => setPlaytime(parseFloat(e.target.value))}
                                           onBlur={handleBlurPlaytime}
                                           className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-3xl font-mono font-bold text-white focus:ring-2 focus:ring-brand-primary/50 group-hover:border-white/20 transition-colors"
                                       />
                                       <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs pointer-events-none">HORAS</span>
                                   </div>
                               </div>

                               <div>
                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Valoración Personal</label>
                                   <div className="flex justify-between bg-slate-950 border border-white/10 rounded-xl p-4">
                                        {[1,2,3,4,5].map(star => (
                                            <button 
                                                key={star}
                                                onClick={() => updateEntry(game.id, { userRating: star * 20 })} 
                                                className="hover:scale-125 transition-transform p-1"
                                            >
                                                <Star 
                                                    size={28} 
                                                    className={game.userRating >= star * 20 ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "text-slate-800"}
                                                />
                                            </button>
                                        ))}
                                   </div>
                               </div>
                           </div>

                           <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-3">
                                <button 
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="col-span-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-colors border border-white/5"
                                >
                                        <Pencil size={14} /> METADATOS MANUALES
                                </button>

                                <button 
                                        onClick={() => setIsUpdateModalOpen(true)}
                                        className="py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-blue-500/20"
                                >
                                        <RefreshCcw size={14} /> REFRESCAR
                                </button>

                                <button 
                                        onClick={handleDelete}
                                        className="py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-red-500/20"
                                >
                                        <Trash2 size={14} /> ELIMINAR
                                </button>
                           </div>
                       </div>
                   ) : (
                       // --- PREVIEW MODE (NOT OWNED) ---
                       <div className="space-y-6">
                           <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                               <h4 className="font-bold text-blue-200 mb-2 flex items-center gap-2"><Monitor size={16} /> Modo Vista Previa</h4>
                               <p className="text-sm text-blue-200/70 leading-relaxed">
                                   Añade este juego a tu biblioteca para habilitar el seguimiento de tiempo, notas y estado.
                               </p>
                           </div>

                           <button 
                                onClick={handleAddToLibrary}
                                disabled={isAdding}
                                className="w-full py-6 bg-white text-slate-950 font-black text-xl rounded-2xl hover:scale-105 transition-transform shadow-[0_0_40px_-10px_rgba(255,255,255,0.4)] flex items-center justify-center gap-3"
                           >
                                {isAdding ? <Loader2 className="animate-spin" /> : <Plus size={24} />}
                                {isAdding ? "Procesando..." : "Añadir a Biblioteca"}
                           </button>
                       </div>
                   )}
               </div>

               {/* Meta Details Card */}
               <div className="bg-slate-900/50 p-8 rounded-[32px] border border-white/5 space-y-6">
                   <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">Detalles Técnicos</h4>
                   
                   <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 font-bold">Lanzamiento</span>
                       <span className="text-white font-mono bg-white/5 px-2 py-1 rounded">{formatDate(game.releaseDate)}</span>
                   </div>
                   
                   <div className="space-y-2">
                       <span className="text-slate-500 text-sm font-bold block">Desarrollador</span>
                       <div className="flex flex-wrap gap-2">
                            {game.developers?.map(d => (
                                <span key={d} className="text-xs text-white bg-slate-800 px-2 py-1 rounded border border-white/5">{d}</span>
                            )) || <span className="text-slate-600 italic">Desconocido</span>}
                       </div>
                   </div>

                   <div className="space-y-2">
                       <span className="text-slate-500 text-sm font-bold block">Publisher</span>
                       <div className="flex flex-wrap gap-2">
                            {game.publishers?.map(p => (
                                <span key={p} className="text-xs text-white bg-slate-800 px-2 py-1 rounded border border-white/5">{p}</span>
                            )) || <span className="text-slate-600 italic">Desconocido</span>}
                       </div>
                   </div>
               </div>
            </div>

          </div>
      </div>
    </div>
  );
};
