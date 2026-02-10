
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, ArrowRight, Save, Upload, Sparkles, AlertCircle, Image as ImageIcon, Rocket, Link } from 'lucide-react';
import { useGameContext } from '../store/GameContext';
import { searchGlobalGames } from '../services/metadataService';
import { generateGameMetadata } from '../services/aiService';
import { Game, GameMetadata } from '../types';

interface EditMetadataModalProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'EDIT' | 'REASSIGN';

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({ game, isOpen, onClose }) => {
  const { reassignGame, saveMetadata, updateEntry } = useGameContext();
  const [activeTab, setActiveTab] = useState<Tab>('EDIT');

  // --- EDIT STATE ---
  const [formData, setFormData] = useState<Partial<GameMetadata>>({});
  const [launchData, setLaunchData] = useState<{ steamAppId: string, customLaunchUrl: string }>({ steamAppId: '', customLaunchUrl: '' });
  
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // --- REASSIGN STATE ---
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Partial<GameMetadata>[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [selectedNewGame, setSelectedNewGame] = useState<Partial<GameMetadata> | null>(null);

  // Init Form Data on Open
  useEffect(() => {
    if (isOpen) {
        setFormData({
            title: game.title,
            description: game.description,
            releaseDate: game.releaseDate.split('T')[0], // format for date input
            developers: game.developers,
            publishers: game.publishers,
            genres: game.genres,
            aggregatedRating: game.aggregatedRating,
            timeToBeat: { ...game.timeToBeat },
            coverUrl: game.coverUrl,
            bannerUrl: game.bannerUrl
        });
        // Init launch data from user entry
        setLaunchData({
            steamAppId: game.steamAppId ? game.steamAppId.toString() : '',
            customLaunchUrl: game.customLaunchUrl || ''
        });
        
        setQuery(game.title);
        setResults([]);
        setSelectedNewGame(null);
        setActiveTab('EDIT');
    }
  }, [isOpen, game]);

  // --- TAB 1: EDIT LOGIC ---

  const handleInputChange = (field: keyof GameMetadata, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTimeChange = (field: 'main' | 'extra' | 'completionist', value: string) => {
      setFormData(prev => ({
          ...prev,
          timeToBeat: { ...prev.timeToBeat!, [field]: parseFloat(value) || 0 }
      }));
  };

  const handleArrayChange = (field: 'genres' | 'developers' | 'publishers', value: string) => {
      // Split by comma
      const arr = value.split(',').map(s => s.trim()).filter(s => s);
      setFormData(prev => ({ ...prev, [field]: arr }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'coverUrl' | 'bannerUrl') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, [target]: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAIGenerate = async () => {
      if (!confirm("Esto sobrescribirá la descripción, tiempos y géneros con datos generados por IA. ¿Continuar?")) return;
      
      setIsGeneratingAI(true);
      try {
          const aiData = await generateGameMetadata(formData.title || game.title);
          
          setFormData(prev => ({
              ...prev,
              description: aiData.description,
              timeToBeat: {
                  main: aiData.mainStoryHours,
                  extra: aiData.extraHours,
                  completionist: aiData.completionistHours
              },
              genres: aiData.genres,
              developers: aiData.developers,
              publishers: aiData.publishers,
              releaseDate: aiData.releaseDate,
              aggregatedRating: aiData.rating
          }));
      } catch (e: any) {
          alert(e.message || "Error al generar datos.");
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleSaveEdit = () => {
      // Save Metadata
      saveMetadata(game.id, formData);
      
      // Save Launch Config (User Entry)
      updateEntry(game.id, {
          steamAppId: launchData.steamAppId ? parseInt(launchData.steamAppId) : undefined,
          customLaunchUrl: launchData.customLaunchUrl || undefined
      });
      
      onClose();
  };


  // --- TAB 2: REASSIGN LOGIC ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (activeTab === 'REASSIGN' && query.length > 1) {
        setIsLoadingSearch(true);
        try {
          const data = await searchGlobalGames(query);
          setResults(data);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingSearch(false);
        }
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query, activeTab]);

  const handleReassign = async () => {
      if (!selectedNewGame?.id) return;
      try {
          // Force Safe Cast for partial data since we want to overwrite
          const safeMeta: GameMetadata = {
            id: selectedNewGame.id,
            title: selectedNewGame.title || 'Unknown Title',
            slug: selectedNewGame.slug || `game-${selectedNewGame.id}`,
            coverUrl: selectedNewGame.coverUrl || '',
            bannerUrl: selectedNewGame.bannerUrl || selectedNewGame.coverUrl || '',
            description: selectedNewGame.description || 'Reasignado manualmente.',
            releaseDate: selectedNewGame.releaseDate || new Date().toISOString(),
            genres: selectedNewGame.genres || [],
            platforms: selectedNewGame.platforms || [],
            developers: selectedNewGame.developers || [],
            publishers: selectedNewGame.publishers || [],
            rating: selectedNewGame.rating || 0,
            aggregatedRating: selectedNewGame.aggregatedRating || 0,
            screenshots: selectedNewGame.screenshots || [],
            externalIds: selectedNewGame.externalIds || { igdb: selectedNewGame.id.toString() },
            timeToBeat: selectedNewGame.timeToBeat || { main: 0, extra: 0, completionist: 0 },
            lastSyncedAt: Date.now()
          };
          
          await reassignGame(game.id, safeMeta.id, safeMeta);
          onClose();
          window.location.hash = `/game/${safeMeta.id}`;
      } catch (e) {
          console.error(e);
      }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl bg-[#0b101b] rounded-[32px] shadow-2xl border border-white/10 overflow-hidden flex flex-col h-[90vh] animate-slide-up">
        
        {/* Header Tabs */}
        <div className="flex border-b border-white/5 bg-white/5">
            <button 
                onClick={() => setActiveTab('EDIT')}
                className={`flex-1 py-6 text-center font-bold text-sm tracking-widest uppercase transition-colors ${activeTab === 'EDIT' ? 'bg-[#0b101b] text-white border-t-2 border-brand-primary' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
                Editar Detalles (Manual)
            </button>
            <button 
                onClick={() => setActiveTab('REASSIGN')}
                className={`flex-1 py-6 text-center font-bold text-sm tracking-widest uppercase transition-colors ${activeTab === 'REASSIGN' ? 'bg-[#0b101b] text-white border-t-2 border-brand-primary' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
                Cambiar Identificación (Re-Match)
            </button>
            <button onClick={onClose} className="px-6 text-slate-400 hover:text-white border-l border-white/5">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* --- TAB EDIT --- */}
            {activeTab === 'EDIT' && (
                <div className="h-full flex flex-col md:flex-row overflow-hidden">
                    {/* Left: Images */}
                    <div className="w-full md:w-1/3 p-8 border-r border-white/5 overflow-y-auto bg-[#0f1522]">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><ImageIcon size={14} /> Multimedia</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">Portada (Vertical)</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-dashed border-white/10 hover:border-brand-primary/50 cursor-pointer group"
                                >
                                    <img src={formData.coverUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-black/50 p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload size={24} className="text-white" />
                                        </div>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverUrl')} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">Banner (Horizontal)</label>
                                <div 
                                    onClick={() => bannerInputRef.current?.click()}
                                    className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-white/10 hover:border-brand-primary/50 cursor-pointer group"
                                >
                                    <img src={formData.bannerUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-black/50 p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload size={24} className="text-white" />
                                        </div>
                                    </div>
                                    <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'bannerUrl')} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-white">Información del Juego</h2>
                            <button 
                                onClick={handleAIGenerate}
                                disabled={isGeneratingAI}
                                className="px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
                            >
                                {isGeneratingAI ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                Auto-completar con IA
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Título</label>
                                <input 
                                    type="text" 
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white font-bold text-lg focus:border-brand-primary outline-none"
                                />
                            </div>

                            {/* LAUNCHER CONFIGURATION */}
                            <div className="bg-brand-primary/5 border border-brand-primary/20 p-6 rounded-2xl">
                                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                    <Rocket size={16} className="text-brand-primary" /> Configuración de Lanzamiento
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Steam App ID</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej: 730"
                                            value={launchData.steamAppId}
                                            onChange={(e) => setLaunchData(prev => ({ ...prev, steamAppId: e.target.value }))}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:border-brand-primary outline-none"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">Usado para steam://rungameid/ID</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Custom Launch URL</label>
                                        <input 
                                            type="text" 
                                            placeholder="battlenet://WoW, https://..."
                                            value={launchData.customLaunchUrl}
                                            onChange={(e) => setLaunchData(prev => ({ ...prev, customLaunchUrl: e.target.value }))}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:border-brand-primary outline-none"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">Sobrescribe Steam ID si está presente.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sinopsis</label>
                                <textarea 
                                    rows={5}
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-slate-300 text-sm focus:border-brand-primary outline-none resize-none"
                                />
                            </div>

                            {/* Arrays */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Desarrolladores (sep. coma)</label>
                                    <input 
                                        type="text" 
                                        value={formData.developers?.join(', ')}
                                        onChange={(e) => handleArrayChange('developers', e.target.value)}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-brand-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Géneros (sep. coma)</label>
                                    <input 
                                        type="text" 
                                        value={formData.genres?.join(', ')}
                                        onChange={(e) => handleArrayChange('genres', e.target.value)}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-brand-primary outline-none"
                                    />
                                </div>
                            </div>

                            {/* Meta */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lanzamiento</label>
                                    <input 
                                        type="date" 
                                        value={formData.releaseDate}
                                        onChange={(e) => handleInputChange('releaseDate', e.target.value)}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-brand-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nota Crítica (0-100)</label>
                                    <input 
                                        type="number" 
                                        value={Math.round(formData.aggregatedRating || 0)}
                                        onChange={(e) => handleInputChange('aggregatedRating', parseInt(e.target.value))}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-brand-primary outline-none"
                                    />
                                </div>
                            </div>

                            {/* HLTB */}
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                <label className="block text-xs font-bold text-brand-secondary uppercase mb-4">Estimaciones de Tiempo (Horas)</label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <span className="text-xs text-slate-500 block mb-1">Historia</span>
                                        <input 
                                            type="number" 
                                            value={formData.timeToBeat?.main}
                                            onChange={(e) => handleTimeChange('main', e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-center font-mono"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block mb-1">Extra</span>
                                        <input 
                                            type="number" 
                                            value={formData.timeToBeat?.extra}
                                            onChange={(e) => handleTimeChange('extra', e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-center font-mono"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block mb-1">100%</span>
                                        <input 
                                            type="number" 
                                            value={formData.timeToBeat?.completionist}
                                            onChange={(e) => handleTimeChange('completionist', e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-center font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-4">
                                <button 
                                    onClick={handleSaveEdit}
                                    className="w-full py-4 bg-white text-black font-black text-lg rounded-2xl hover:bg-slate-200 transition-colors shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Save size={20} /> Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB REASSIGN --- */}
            {activeTab === 'REASSIGN' && (
                <div className="h-full flex overflow-hidden">
                    {/* Left: Search */}
                    <div className="flex-1 flex flex-col border-r border-white/5">
                        <div className="p-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    autoFocus
                                    type="text" 
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-primary/50"
                                    placeholder="Buscar título correcto..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                                {isLoadingSearch && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-brand-primary" size={18} />}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2 custom-scrollbar">
                            {results.map((res) => (
                                <button 
                                    key={res.id}
                                    onClick={() => setSelectedNewGame(res)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left border transition-all ${
                                        selectedNewGame?.id === res.id 
                                        ? 'bg-brand-primary/20 border-brand-primary/50' 
                                        : 'hover:bg-white/5 border-transparent'
                                    }`}
                                >
                                    <img src={res.coverUrl} className="w-10 h-14 object-cover rounded bg-slate-800" />
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{res.title}</h4>
                                        <span className="text-xs text-slate-500">{res.releaseDate?.substring(0,4)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Compare */}
                    <div className="w-1/2 bg-[#0f1522] flex flex-col p-6 overflow-y-auto">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Vista Previa</h3>
                        
                        <div className="flex items-center justify-between gap-4 mb-8">
                            <div className="flex-1 text-center opacity-50 grayscale">
                                <img src={game.coverUrl} className="w-24 h-36 object-cover rounded-lg shadow-lg mx-auto mb-3" />
                                <p className="text-xs font-bold text-slate-400">ACTUAL</p>
                                <p className="text-sm font-bold text-white leading-tight">{game.title}</p>
                            </div>

                            <ArrowRight className="text-slate-600" />

                            <div className="flex-1 text-center">
                                {selectedNewGame ? (
                                    <>
                                        <img src={selectedNewGame.coverUrl} className="w-24 h-36 object-cover rounded-lg shadow-lg mx-auto mb-3 ring-2 ring-brand-primary" />
                                        <p className="text-xs font-bold text-brand-primary">NUEVO</p>
                                        <p className="text-sm font-bold text-white leading-tight">{selectedNewGame.title}</p>
                                    </>
                                ) : (
                                    <div className="h-36 flex items-center justify-center border-2 border-dashed border-white/10 rounded-lg">
                                        <span className="text-xs text-slate-600">Selecciona un juego</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={handleReassign}
                            disabled={!selectedNewGame}
                            className="mt-6 w-full py-3 bg-white text-black font-black rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Save size={18} /> Confirmar Reasignación
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};