
import React, { useMemo } from 'react';
import { useGameContext } from '../store/GameContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { GameStatus } from '../types';
import { Trophy, Clock, Target, TrendingUp } from 'lucide-react';

export const Statistics: React.FC = () => {
  const { library } = useGameContext(); // Corrected from 'games'

  // 1. Datos para Gráfico Circular (Composición)
  const statusData = useMemo(() => [
    { name: 'Completado', value: library.filter(g => g.status === GameStatus.Completed || g.status === GameStatus.Platinums).length, color: '#a855f7' }, // Purple
    { name: 'Pendiente', value: library.filter(g => g.status === GameStatus.Backlog).length, color: '#3b82f6' }, // Blue
    { name: 'Jugando', value: library.filter(g => g.status === GameStatus.Playing).length, color: '#22c55e' }, // Green
    { name: 'Abandonado', value: library.filter(g => g.status === GameStatus.Dropped).length, color: '#ef4444' }, // Red
  ].filter(d => d.value > 0), [library]);

  // 2. Datos para Gráfico de Barras (Top Juegos por Horas Reales)
  const playtimeData = useMemo(() => {
      return library
        .filter(g => (g.hoursPlayed || 0) > 0)
        .sort((a, b) => (b.hoursPlayed || 0) - (a.hoursPlayed || 0))
        .slice(0, 5)
        .map(g => ({
          name: g.title.length > 15 ? g.title.substring(0, 15) + '...' : g.title,
          fullTitle: g.title,
          hours: g.hoursPlayed || 0
        }));
  }, [library]);

  // 3. KPI: Estimación de horas para terminar el Backlog (Basado en HLTB Main Story)
  const backlogHoursEstimate = useMemo(() => {
      return library
        .filter(g => g.status === GameStatus.Backlog)
        .reduce((acc, curr) => acc + (curr.timeToBeat?.main || 0), 0);
  }, [library]);

  // 4. KPI: Tasa de Finalización
  const completionRate = useMemo(() => {
      if (library.length === 0) return 0;
      const completed = library.filter(g => g.status === GameStatus.Completed || g.status === GameStatus.Platinums).length;
      return Math.round((completed / library.length) * 100);
  }, [library]);

  // Custom Tooltip para gráfico de barras
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 p-3 rounded-lg shadow-xl">
          <p className="text-white font-bold text-sm mb-1">{payload[0].payload.fullTitle}</p>
          <p className="text-brand-primary text-xs font-mono">{payload[0].value} horas jugadas</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-slide-up pb-20">
       <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
            <TrendingUp className="text-brand-accent" /> ADN Gamer
          </h1>
          <p className="text-slate-400">Un análisis profundo de tus hábitos de juego.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         
         {/* Gráfico 1: Composición de Biblioteca */}
         <div className="bg-slate-800/30 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-xl">
           <h3 className="text-xl font-bold text-white mb-6">Composición de la Biblioteca</h3>
           <div className="h-[300px] w-full relative">
             {statusData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={statusData}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
                       dataKey="value"
                       stroke="none"
                     >
                       {statusData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                     />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" />
                   </PieChart>
                 </ResponsiveContainer>
             ) : (
                 <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    <p>Añade juegos para ver estadísticas</p>
                 </div>
             )}
           </div>
         </div>

         {/* Gráfico 2: Top Juegos */}
         <div className="bg-slate-800/30 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-xl">
           <h3 className="text-xl font-bold text-white mb-6">Más Jugados (Horas Reales)</h3>
           <div className="h-[300px] w-full relative">
             {playtimeData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={playtimeData} layout="vertical" margin={{ left: 10, right: 10 }}>
                     <XAxis type="number" stroke="#475569" hide />
                     <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                     <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                     <Bar dataKey="hours" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={24}>
                        {playtimeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#ec4899' : '#6366f1'} />
                        ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
             ) : (
                 <div className="absolute inset-0 flex items-center justify-center text-slate-500 flex-col gap-2">
                    <Clock size={32} className="opacity-50" />
                    <p>No has registrado horas de juego aún</p>
                 </div>
             )}
           </div>
         </div>

         {/* Tarjetas de KPI */}
         <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 p-6 rounded-2xl relative overflow-hidden group hover:border-pink-500/40 transition-colors">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock size={64} className="text-pink-400" />
              </div>
              <p className="text-pink-200 text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                 Estimación Backlog
              </p>
              <h4 className="text-4xl font-black text-white">{backlogHoursEstimate} <span className="text-lg font-medium text-pink-200/50">h</span></h4>
              <p className="text-xs text-pink-300/60 mt-2 font-medium">Tiempo necesario para terminar pendientes</p>
            </div>
            
            {/* KPI 2 */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/40 transition-colors">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target size={64} className="text-blue-400" />
              </div>
              <p className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-1">
                 Tasa de Completado
              </p>
              <h4 className="text-4xl font-black text-white">{completionRate}%</h4>
              <p className="text-xs text-blue-300/60 mt-2 font-medium">Juegos completados vs total en biblioteca</p>
            </div>

            {/* KPI 3 */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
               <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy size={64} className="text-emerald-400" />
              </div>
              <p className="text-emerald-200 text-sm font-bold uppercase tracking-wider mb-1">
                 Total Títulos
              </p>
              <h4 className="text-4xl font-black text-white">{library.length}</h4>
              <p className="text-xs text-emerald-300/60 mt-2 font-medium">Juegos gestionados en Nexus</p>
            </div>
         </div>

       </div>
    </div>
  );
};
