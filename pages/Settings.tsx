
import React, { useRef } from 'react';
import { useGameContext } from '../store/GameContext';
import { Database, DownloadCloud, UploadCloud, ShieldCheck, Zap, Globe } from 'lucide-react';

export const Settings: React.FC = () => {
  const { exportData, importData } = useGameContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="animate-fade-in pb-20 max-w-4xl mx-auto px-4">
      <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Ajustes del Sistema</h1>
      <p className="text-slate-400 mb-10">Configuración técnica y gestión de datos de Nexus.</p>

      <div className="space-y-8">
        {/* INFO STATUS */}
        <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-[32px] p-8 flex items-start gap-6">
            <div className="bg-brand-primary p-4 rounded-2xl shadow-lg shadow-brand-primary/40">
                <Globe size={32} className="text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white mb-2">Motor de Datos: IGDB Official</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Nexus utiliza la API profesional de <b>IGDB (Internet Game Database)</b> para garantizar que 
                    la información de tu biblioteca sea 100% oficial y precisa. Los metadatos incluyen 
                    sinopsis, fechas de lanzamiento y desarrolladores verificados.
                </p>
                <div className="mt-4 flex items-center gap-4">
                    <span className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-widest">
                        <ShieldCheck size={14} /> Datos Verificados
                    </span>
                    <span className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">
                        <Zap size={14} /> Sincronización Global
                    </span>
                </div>
            </div>
        </div>

        {/* BACKUPS */}
        <div className="bg-[#0f172a] border border-white/5 rounded-[32px] p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Database className="text-slate-400" /> Gestión de Datos Locales
            </h2>
            <p className="text-sm text-slate-400 mb-6">Toda tu biblioteca y estadísticas personales se guardan de forma segura en este navegador.</p>
            <div className="flex flex-col md:flex-row gap-4">
                <button onClick={exportData} className="flex-1 px-6 py-4 bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
                    <DownloadCloud size={18} /> Exportar Biblioteca (JSON)
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 px-6 py-4 bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
                    <UploadCloud size={18} /> Importar Biblioteca (JSON)
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => importData(ev.target?.result as string).then(s => s && window.location.reload());
                        reader.readAsText(file);
                    }
                }} />
            </div>
        </div>
      </div>
    </div>
  );
};
