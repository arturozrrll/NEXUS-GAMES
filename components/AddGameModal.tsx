
import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Plus, CheckCircle, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { useGameContext } from '../store/GameContext';
import { fetchMetadata, searchGlobalGames } from '../services/metadataService';
import { GameMetadata, GameStatus, Platform } from '../types';

export const AddGameModal: React.FC = () => {
  const { isAddModalOpen, closeAddModal, addToLibrary } = useGameContext();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Partial<GameMetadata>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isAdding, setIsAdding] = useState(false); 
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [selectedGame, setSelectedGame] = useState<Partial<GameMetadata> | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>(Platform.PC);
  const [selectedStatus, setSelectedStatus] = useState<GameStatus>(GameStatus.Backlog);

  useEffect(() => {
      if(isAddModalOpen) {
          setErrorMsg(null);
          setQuery('');
          setResults([]);
          setSelectedGame(null);
          setIsAdding(false);
      }
  }, [isAddModalOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 1) {
        setIsLoading(true);
        setErrorMsg(null);
        try {
          const data = await searchGlobalGames(query);
          setResults(data);
        } catch (e: any) {
          setErrorMsg("Error al conectar con el motor AI.");
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = async (gameId: number) => {
    const partial = results.find(r => r.id === gameId);
    setSelectedGame(partial || { id: gameId }); 
    setIsFetchingDetails(true);
    
    try {
        const fullMeta = await fetchMetadata(gameId, partial?.title);
        setSelectedGame(fullMeta);
    } catch (e: any) {
        setErrorMsg("Error cargando detalles del juego.");
    } finally {
        setIsFetchingDetails(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedGame && selectedGame.id) {
        setIsAdding(true);
        const meta = selectedGame as GameMetadata;
        await addToLibrary(meta.id, selectedStatus, selectedPlatform, meta);
        setIsAdding(false);
        closeAddModal();
    }
  };

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

  if (!isAddModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-fade-in" onClick={closeAddModal} />

      <div className="relative w-full max-w-4xl bg-[#0b101b] rounded-[32px] shadow-2xl border border-white/10 overflow-hidden flex flex-col h-[85vh] animate-slide-up">
        
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
               Añadir Juego <Sparkles className="text-brand-primary" />
            </h2>
            <p className="text-sm text-slate-400 font-medium">Motor: Nexus Discovery AI (Sin Proxies)</p>
          </div>
          <button onClick={closeAddModal} className="p-3 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className={`flex-1 flex flex-col border-r border-white/5 transition-all ${selectedGame ? 'w-1/2 hidden md:flex' : 'w-full'}`}>
                <div className="p-6">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            autoFocus
                            type="text" 
                            className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white text-lg placeholder:text-slate-600 focus:outline-none focus:border-brand-primary/50 transition-all"
                            placeholder="Nombre del juego..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {isLoading && (
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                <Loader2 className="animate-spin text-brand-primary" size={20} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-3 custom-scrollbar">
                    {errorMsg ? (
                         <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Fallo en la conexión</h3>
                            <p className="text-slate-400">{errorMsg}</p>
                        </div>
                    ) : (
                        <>
                            {results.map((game) => (
                                <button 
                                    key={game.id}
                                    onClick={() => handleSelect(game.id!)}
                                    className={`w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all text-left border ${selectedGame?.id === game.id ? 'bg-white/5 border-brand-primary/30' : 'border-transparent'}`}
                                >
                                    <div className="h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-900 shadow-md">
                                        <img src={game.coverUrl} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold truncate ${selectedGame?.id === game.id ? 'text-brand-primary' : 'text-white'}`}>{game.title}</h4>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                            <span className="flex items-center gap-1"><Calendar size={10} /> {game.releaseDate?.substring(0,4)}</span>
                                            <span className="truncate">{game.platforms?.slice(0,2).join(', ')}</span>
                                        </div>
                                    </div>
                                    {isFetchingDetails && selectedGame?.id === game.id && <Loader2 size={20} className="animate-spin text-brand-primary" />}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {selectedGame && (
                <div className="flex-1 flex flex-col bg-[#0f1522] animate-fade-in w-full md:w-auto">
                    <div className="h-48 relative shrink-0">
                        <img src={selectedGame.bannerUrl} className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1522] to-transparent" />
                        <div className="absolute bottom-6 left-6 right-6 flex items-end gap-6">
                             <img src={selectedGame.coverUrl} className="w-24 h-32 object-cover rounded-lg shadow-2xl" />
                             <div className="mb-2">
                                 <h3 className="text-2xl font-black text-white">{selectedGame.title}</h3>
                                 <div className="flex gap-2 mt-2">
                                     {selectedGame.genres?.slice(0,2).map(g => (
                                         <span key={g} className="text-[10px] uppercase font-bold px-2 py-0.5 bg-white/10 rounded text-slate-300">{g}</span>
                                     ))}
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div className="flex-1 p-8 space-y-6 overflow-y-auto">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-brand-primary uppercase tracking-wider">Estado en Colección</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.values(GameStatus).slice(0,6).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setSelectedStatus(status)}
                                            className={`px-3 py-3 rounded-xl text-sm font-bold border transition-all ${selectedStatus === status ? 'bg-brand-primary text-white border-brand-primary' : 'bg-slate-900 text-slate-400 border-white/5'}`}
                                        >
                                            {translateStatus(status)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-brand-secondary uppercase tracking-wider">Plataforma</label>
                                <select 
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white"
                                    value={selectedPlatform}
                                    onChange={(e) => setSelectedPlatform(e.target.value)}
                                >
                                    {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-[#0b101b]">
                        <button 
                            onClick={handleConfirm}
                            disabled={isAdding || isFetchingDetails}
                            className="w-full py-4 bg-white text-black font-black text-lg rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isAdding ? <Loader2 className="animate-spin" size={24} /> : <Plus size={20} />}
                            {isAdding ? 'Añadiendo...' : 'Añadir a mi Biblioteca'}
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
