
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, ArrowRight, Save, Upload, Sparkles, Image as ImageIcon, Rocket, Link } from 'lucide-react';
import { useGameContext } from '../store/GameContext';
import { searchGlobalGames, fetchMetadata } from '../services/metadataService';
import { generateGameMetadata } from '../services/aiService';
import { searchHLTB } from '../services/hltbService';
import { Game, GameMetadata } from '../types';

interface EditMetadataModalProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'EDIT' | 'REASSIGN';
type InputMode = 'FILE' | 'URL';

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({ game, isOpen, onClose }) => {
  const { reassignGame, saveMetadata, updateEntry } = useGameContext();
  const [activeTab, setActiveTab] = useState<Tab>('EDIT');

  // --- EDIT STATE ---
  const [formData, setFormData] = useState<Partial<GameMetadata>>({});
  const [launchData, setLaunchData] = useState<{ steamAppId: string, customLaunchUrl: string, launchDelay: string }>({ 
      steamAppId: '', 
      customLaunchUrl: '',
      launchDelay: '20' 
  });
  const [inputModes, setInputModes] = useState<{ cover: InputMode, banner: InputMode }>({ cover: 'FILE', banner: 'FILE' });
  
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // --- REASSIGN STATE ---
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Partial<GameMetadata>[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
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
            customLaunchUrl: game.customLaunchUrl || '',
            launchDelay: game.launchDelay !== undefined ? game.launchDelay.toString() : '20'
        });
        
        setQuery(game.title);
        setResults([]);
        setSelectedNewGame(null);
        setActiveTab('EDIT');
        setIsReassigning(false);
        setInputModes({ cover: 'FILE', banner: 'FILE' }); // Reset input modes
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
          // CHECK SIZE LIMIT (3MB)
          if (file.size > 3 * 1024 * 1024) {
              alert("⚠️ ARCHIVO DEMASIADO PESADO (>3MB)\n\nEl almacenamiento local del navegador no soporta archivos tan grandes.\n\nSOLUCIÓN: Sube tu GIF/PNG animado a Imgur/Giphy y usa la opción de 'Link' para pegar la URL.");
              return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, [target]: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const toggleInputMode = (target: 'cover' | 'banner') => {
      setInputModes(prev => ({
          ...prev,
          [target]: prev[target] === 'FILE' ? 'URL' : 'FILE'
      }));
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
      const delay = parseInt(launchData.launchDelay);
      updateEntry(game.id, {
          steamAppId: launchData.steamAppId ? parseInt(launchData.steamAppId) : undefined,
          customLaunchUrl: launchData.customLaunchUrl || undefined,
          launchDelay: !isNaN(delay) && delay >= 0 ? delay : 20
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
      setIsReassigning(true);
      try {
          // Fetch FULL metadata to ensure we have images, description etc.
          const fullMeta = await fetchMetadata(selectedNewGame.id, selectedNewGame.title);
          
          await reassignGame(game.id, fullMeta.id, fullMeta);

          // NEW: Auto Trigger HLTB Sync for the new game ID
          if (fullMeta.title) {
              searchHLTB(fullMeta.title).then(result => {
                  if (result && (result.main > 0 || result.extra > 0)) {
                      saveMetadata(fullMeta.id, { timeToBeat: result });
                  }
              }).catch(() => {});
          }

          onClose();
          window.location.hash = `/game/${fullMeta.id}`;
      } catch (e) {
          console.error(e);
          alert("Error al reasignar el juego.");
      } finally {
          setIsReassigning(false);
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
                            {/* COVER IMAGE */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-400">Portada (Vertical)</label>
                                    <button 
                                        onClick={() => toggleInputMode('cover')}
                                        className="text-[10px] flex items-center gap-1 bg-white/10 hover:bg-brand-primary hover:text-white px-2 py-1 rounded transition-colors text-slate-400"
                                    >
                                        <Link size={10} /> {inputModes.cover === 'FILE' ? 'Usar URL' : 'Usar Archivo'}
                                    </button>
                                </div>
                                
                                <div className="relative aspect-[2/3] rounded-xl overflow-hidden border-2 border-dashed border-white/10 hover:border-brand-primary/50 group bg-slate-900">
                                    {inputModes.cover === 'FILE' ? (
                                        // FILE MODE
                                        <div onClick={() => fileInputRef.current?.click()} className="w-full h-full cursor-pointer relative">
                                             <img src={formData.coverUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                             <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="bg-black/50 p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Upload size={24} className="text-white" />
                                                </div>
                                            </div>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverUrl')} />
                                        </div>
                                    ) : (
                                        // URL MODE
                                        <div className="w-full h-full p-4 flex flex-col justify-center items-center gap-2">
                                            <img src={formData.coverUrl} className="w-20 h-28 object-cover rounded opacity-40 mb-2" />
                                            <input 
                                                type="text" 
                                                placeholder="Pegar URL de imagen..." 
                                                value={formData.coverUrl}
                                                onChange={(e) => setFormData(prev => ({...prev, coverUrl: e.target.value}))}
                                                className="w-full bg-black/50 border border-white/20 rounded p-2 text-xs text-white"
                                            />
                                            <p className="text-[9px] text-slate-500 text-center">Recomendado para GIFs pesados (&gt;3MB)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BANNER IMAGE */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-400">Banner (Horizontal)</label>
                                    <button 
                                        onClick={() => toggleInputMode('banner')}
                                        className="text-[10px] flex items-center gap-1 bg-white/10 hover:bg-brand-primary hover:text-white px-2 py-1 rounded transition-colors text-slate-400"
                                    >
                                        <Link size={10} /> {inputModes.banner === 'FILE' ? 'Usar URL' : 'Usar Archivo'}
                                    </button>
                                </div>
                                <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-white/10 hover:border-brand-primary/50 group bg-slate-900">
                                    {inputModes.banner === 'FILE' ? (
                                         <div onClick={() => bannerInputRef.current?.click()} className="w-full h-full cursor-pointer relative">
                                            <img src={formData.bannerUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="bg-black/50 p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Upload size={24} className="text-white" />
                                                </div>
                                            </div>
                                            <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'bannerUrl')} />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full p-4 flex flex-col justify-center items-center gap-2">
                                            <img src={formData.bannerUrl} className="w-32 h-20 object-cover rounded opacity-40 mb-2" />
                                            <input 
                                                type="text" 
                                                placeholder="Pegar URL de banner..." 
                                                value={formData.bannerUrl}
                                                onChange={(e) => setFormData(prev => ({...prev, bannerUrl: e.target.value}))}
                                                className="w-full bg-black/50 border border-white/20 rounded p-2 text-xs text-white"
                                            />
                                        </div>
                                    )}
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

                            {/* Release Date - RESTORED */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha de Lanzamiento</label>
                                <input 
                                    type="date" 
                                    value={formData.releaseDate}
                                    onChange={(e) => handleInputChange('releaseDate', e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white font-mono text-sm focus:border-brand-primary outline-none"
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
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Retraso de inicio (Segundos)</label>
                                        <input 
                                            type="number" 
                                            placeholder="20"
                                            min="0"
                                            value={launchData.launchDelay}
                                            onChange={(e) => setLaunchData(prev => ({ ...prev, launchDelay: e.target.value }))}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:border-brand-primary outline-none"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">Tiempo de espera antes de que comience el cronómetro (para tiempos de carga).</p>
                                    </div>
                                </div>
                            </div>

                            {/* Time To Beat - RESTORED */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Duración (HowLongToBeat)</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Historia (H)</label>
                                        <input 
                                            type="number" 
                                            value={formData.timeToBeat?.main}
                                            onChange={(e) => handleTimeChange('main', e.target.value)}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:border-brand-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Extra (H)</label>
                                        <input 
                                            type="number" 
                                            value={formData.timeToBeat?.extra}
                                            onChange={(e) => handleTimeChange('extra', e.target.value)}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:border-brand-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">100% (H)</label>
                                        <input 
                                            type="number" 
                                            value={formData.timeToBeat?.completionist}
                                            onChange={(e) => handleTimeChange('completionist', e.target.value)}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:border-brand-primary outline-none"
                                        />
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
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Publishers (sep. coma)</label>
                                    <input 
                                        type="text" 
                                        value={formData.publishers?.join(', ')}
                                        onChange={(e) => handleArrayChange('publishers', e.target.value)}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-brand-primary outline-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Géneros (sep. coma)</label>
                                    <input 
                                        type="text" 
                                        value={formData.genres?.join(', ')}
                                        onChange={(e) => handleArrayChange('genres', e.target.value)}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-brand-primary outline-none"
                                    />
                                </div>
                            </div>

                        </div>
                        
                        {/* Sticky Save Button */}
                        <div className="sticky bottom-0 bg-[#0b101b] pt-6 pb-2 mt-8 border-t border-white/5">
                            <button 
                                onClick={handleSaveEdit}
                                className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-all active:scale-95"
                            >
                                <Save size={20} /> GUARDAR CAMBIOS
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB REASSIGN --- */}
            {activeTab === 'REASSIGN' && (
                <div className="flex h-full">
                    {/* Left: Search */}
                    <div className="w-1/3 p-6 border-r border-white/5 bg-[#0f1522]">
                         <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                placeholder="Buscar juego correcto..." 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-primary outline-none"
                            />
                            {isLoadingSearch && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-brand-primary" size={20} />}
                         </div>

                         <div className="space-y-3 overflow-y-auto max-h-[60vh] custom-scrollbar">
                             {results.map(r => (
                                 <button
                                     key={r.id}
                                     onClick={() => setSelectedNewGame(r)}
                                     className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedNewGame?.id === r.id ? 'bg-brand-primary/10 border-brand-primary' : 'bg-slate-900 border-white/5 hover:bg-white/5'}`}
                                 >
                                     <img src={r.coverUrl} className="w-10 h-14 object-cover rounded bg-black" />
                                     <div>
                                         <div className="font-bold text-white text-sm line-clamp-1">{r.title}</div>
                                         <div className="text-xs text-slate-500">{r.releaseDate?.substring(0,4)}</div>
                                     </div>
                                 </button>
                             ))}
                         </div>
                    </div>

                    {/* Right: Confirmation */}
                    <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                        {selectedNewGame ? (
                            <div className="max-w-md animate-fade-in">
                                <h3 className="text-xl font-bold text-white mb-6">Confirmar Reasignación</h3>
                                
                                <div className="flex items-center justify-center gap-8 mb-8">
                                    <div className="opacity-50 grayscale">
                                        <img src={game.coverUrl} className="w-24 h-36 object-cover rounded-lg shadow-lg" />
                                        <p className="mt-2 text-xs font-bold text-slate-500">Actual</p>
                                    </div>
                                    <ArrowRight className="text-slate-600" size={32} />
                                    <div>
                                        <img src={selectedNewGame.coverUrl} className="w-24 h-36 object-cover rounded-lg shadow-lg ring-2 ring-brand-primary" />
                                        <p className="mt-2 text-xs font-bold text-brand-primary">Nuevo</p>
                                    </div>
                                </div>

                                <p className="text-slate-400 text-sm mb-8">
                                    Se actualizará la metadata (portada, descripción, IDs) pero se mantendrán tus horas de juego y estado.
                                </p>

                                <button 
                                    onClick={handleReassign}
                                    disabled={isReassigning}
                                    className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all"
                                >
                                    {isReassigning ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    Confirmar Cambio
                                </button>
                            </div>
                        ) : (
                            <div className="text-slate-500">
                                <Search size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Busca y selecciona un juego de la lista para reasignar.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
