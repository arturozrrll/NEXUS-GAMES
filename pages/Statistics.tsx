
import React, { useMemo, useState } from 'react';
import { useGameContext } from '../store/GameContext';
import { 
  PieChart, 
  Pie, 
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { GameStatus, Platform } from '../types';
import { Trophy, Clock, Target, TrendingUp, Layers, Medal, Zap, Calendar, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Statistics: React.FC = () => {
  const { library } = useGameContext();
  const navigate = useNavigate();
  const ownedGames = library.filter(g => g.status !== GameStatus.Wishlist);
  
  // Increased limit to support up to 100 items (starts at 10)
  const [leaderboardLimit, setLeaderboardLimit] = useState<number>(10); 

  // --- DATA CALCULATIONS ---

  // 1. GENRE RADAR
  const genreData = useMemo(() => {
      const counts: Record<string, number> = {};
      ownedGames.forEach(g => {
          g.genres.forEach(genre => {
              counts[genre] = (counts[genre] || 0) + 1;
          });
      });
      return Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([genre, count]) => ({ subject: genre, A: count, fullMark: ownedGames.length }));
  }, [ownedGames]);

  // 2. PLATFORM DISTRIBUTION
  const platformData = useMemo(() => {
      const counts: Record<string, number> = {};
      ownedGames.forEach(g => {
          const p = g.platform || Platform.PC;
          counts[p] = (counts[p] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [ownedGames]);

  // 3. RELEASE YEAR TIMELINE
  const releaseData = useMemo(() => {
      const counts: Record<string, number> = {};
      ownedGames.forEach(g => {
          const d = new Date(g.releaseDate);
          const year = d.getFullYear();
          if (year && !isNaN(year) && year > 1980) { // Filter out bad dates
              counts[year] = (counts[year] || 0) + 1;
          }
      });
      return Object.keys(counts).sort().map(year => ({ year: parseInt(year), count: counts[year] }));
  }, [ownedGames]);

  // 4. TOP GAMES LEADERBOARD (Dynamic Slice)
  const topGames = useMemo(() => {
      return ownedGames
        .filter(g => (g.hoursPlayed || 0) > 0)
        .sort((a, b) => (b.hoursPlayed || 0) - (a.hoursPlayed || 0))
        .slice(0, leaderboardLimit); // Use state limit
  }, [ownedGames, leaderboardLimit]);

  // Max hours for progress bar calculation
  const maxHours = topGames.length > 0 ? topGames[0].hoursPlayed : 1;

  // 5. GAMIFICATION LEVEL
  const gamerStats = useMemo(() => {
      const totalHours = ownedGames.reduce((acc, curr) => acc + (curr.hoursPlayed || 0), 0);
      const completedCount = ownedGames.filter(g => g.status === GameStatus.Completed || g.status === GameStatus.Platinums).length;
      const platinumCount = ownedGames.filter(g => g.status === GameStatus.Platinums).length;
      
      const xp = (totalHours * 10) + (completedCount * 100) + (platinumCount * 300) + (ownedGames.length * 20);
      const level = Math.floor(Math.sqrt(xp / 50)) + 1;
      
      const currentLevelXp = 50 * Math.pow(level - 1, 2);
      const nextLevelXp = 50 * Math.pow(level, 2);
      const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

      return { level, xp, progress, totalHours, completedCount, platinumCount };
  }, [ownedGames]);

  const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 p-3 rounded-lg shadow-xl z-50">
          <p className="text-white font-bold text-sm mb-1">{label}</p>
          <p className="text-brand-primary text-xs font-mono">
              {payload[0].value} {payload[0].name === 'count' ? 'juegos' : 'horas'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Clic para explorar {label}</p>
        </div>
      );
    }
    return null;
  };

  // ROBUST CLICK HANDLER
  const handleYearClick = (data: any) => {
      let year: number | null = null;

      // Strategy 1: Active Label (XAxis Value)
      if (data?.activeLabel) {
          year = parseInt(data.activeLabel);
      } 
      // Strategy 2: Active Payload (Hover Data)
      else if (data?.activePayload?.[0]?.payload?.year) {
          year = parseInt(data.activePayload[0].payload.year);
      }
      // Strategy 3: Direct Payload (OnClick on Dot)
      else if (data?.payload?.year) {
          year = parseInt(data.payload.year);
      }

      if (year && !isNaN(year)) {
          navigate(`/library?year=${year}`);
      }
  };

  const handleShowMore = () => {
      setLeaderboardLimit(prev => Math.min(prev + 10, 100));
  };

  return (
    <div className="animate-slide-up pb-20 w-full overflow-hidden">
       {/* HEADER: GAMER PROFILE */}
       <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/20 rounded-[32px] p-8 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Trophy size={150} className="text-white" />
                </div>
                
                <div className="flex items-center gap-6 mb-6 z-10">
                    <div className="w-24 h-24 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/40 text-4xl font-black text-white border-2 border-white/10">
                        {gamerStats.level}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">Nivel de Jugador</h2>
                        <p className="text-indigo-200 font-medium">Rank: {gamerStats.level > 50 ? 'Leyenda Gaming' : gamerStats.level > 20 ? 'Veterano' : 'Iniciado'}</p>
                    </div>
                </div>

                <div className="relative w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-white/5 z-10">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-1000"
                        style={{ width: `${gamerStats.progress}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs font-bold text-slate-400 z-10">
                    <span>XP Actual: {Math.floor(gamerStats.xp)}</span>
                    <span>Siguiente Nivel</span>
                </div>
           </div>

           <div className="bg-slate-900/50 border border-white/10 rounded-[32px] p-8 flex flex-col justify-between">
               <div className="space-y-6">
                   <div className="flex items-center gap-4">
                       <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Clock size={24} /></div>
                       <div>
                           <div className="text-2xl font-black text-white">{gamerStats.totalHours.toFixed(1)}h</div>
                           <div className="text-xs text-slate-500 uppercase font-bold">Tiempo Total</div>
                       </div>
                   </div>
                   <div className="flex items-center gap-4">
                       <div className="p-3 bg-green-500/20 rounded-xl text-green-400"><Target size={24} /></div>
                       <div>
                           <div className="text-2xl font-black text-white">{gamerStats.completedCount}</div>
                           <div className="text-xs text-slate-500 uppercase font-bold">Juegos Terminados</div>
                       </div>
                   </div>
                   <div className="flex items-center gap-4">
                       <div className="p-3 bg-yellow-500/20 rounded-xl text-yellow-400"><Medal size={24} /></div>
                       <div>
                           <div className="text-2xl font-black text-white">{gamerStats.platinumCount}</div>
                           <div className="text-xs text-slate-500 uppercase font-bold">Platinos (100%)</div>
                       </div>
                   </div>
               </div>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-3xl p-8 min-h-[400px]">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Zap className="text-yellow-400" size={20} /> Personalidad Gamer
                </h3>
                <p className="text-sm text-slate-400 mb-6">Tus géneros más jugados definen tu estilo.</p>
                <div className="h-[300px] w-full">
                    {genreData.length > 2 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={genreData}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                <Radar
                                    name="Géneros"
                                    dataKey="A"
                                    stroke="#ec4899"
                                    strokeWidth={3}
                                    fill="#ec4899"
                                    fillOpacity={0.3}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#fff', strokeWidth: 1 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 text-center p-4">
                            Necesitas más variedad de juegos para generar tu radar de personalidad.
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-3xl p-8 min-h-[400px]">
                 <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Layers className="text-blue-400" size={20} /> Ecosistema
                </h3>
                <p className="text-sm text-slate-400 mb-6">Distribución de tu colección por plataforma.</p>
                <div className="h-[300px] w-full flex flex-col md:flex-row items-center justify-center gap-8">
                     <div className="flex-1 h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={platformData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {platformData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="flex-1 space-y-2">
                         {platformData.map((entry, index) => (
                             <div key={entry.name} className="flex items-center justify-between text-sm">
                                 <div className="flex items-center gap-2">
                                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                     <span className="text-slate-300">{entry.name}</span>
                                 </div>
                                 <span className="font-bold text-white">{entry.value}</span>
                             </div>
                         ))}
                     </div>
                </div>
            </div>
       </div>

       {/* 3. RELEASE TIMELINE - INTERACTIVE */}
       <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-3xl p-8 mb-8">
           <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
               <Calendar className="text-cyan-400" size={20} /> Cronología Interactiva
           </h3>
           <p className="text-sm text-slate-400 mb-6">Haz clic en cualquier punto del gráfico para ver los juegos lanzados ese año.</p>
           
           <div className="h-[300px] w-full mb-6 cursor-pointer">
               <ResponsiveContainer width="100%" height="100%">
                   <AreaChart 
                        data={releaseData} 
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        onClick={handleYearClick} // Wrapper Click
                   >
                       <defs>
                           <linearGradient id="colorYear" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                               <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                           </linearGradient>
                       </defs>
                       <XAxis dataKey="year" stroke="#475569" tick={{fill: '#94a3b8'}} />
                       <YAxis stroke="#475569" tick={{fill: '#94a3b8'}} />
                       <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                       <Tooltip content={<CustomTooltip />} />
                       <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#6366f1" 
                            fillOpacity={1} 
                            fill="url(#colorYear)" 
                            activeDot={{ r: 8, strokeWidth: 2, fill: '#ec4899', cursor: 'pointer', onClick: handleYearClick }} // Specific Dot Click
                       />
                   </AreaChart>
               </ResponsiveContainer>
           </div>
       </div>

       {/* 4. TOP GAMES LEADERBOARD - REDESIGNED */}
       <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-3xl p-8">
           <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="text-green-400" size={20} /> Hall of Fame: Top Adicciones
                </h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
               {topGames.map((game, index) => {
                   const progress = (game.hoursPlayed / maxHours) * 100;
                   let rankColor = "text-slate-400";
                   let rankBg = "bg-slate-800";
                   let rankIcon = null;

                   if (index === 0) { rankColor = "text-yellow-400"; rankBg = "bg-yellow-500/20 border-yellow-500/50"; rankIcon = <Trophy size={14} className="text-yellow-400" /> }
                   else if (index === 1) { rankColor = "text-slate-300"; rankBg = "bg-slate-400/20 border-slate-400/50"; rankIcon = <Medal size={14} className="text-slate-300" /> }
                   else if (index === 2) { rankColor = "text-amber-600"; rankBg = "bg-amber-700/20 border-amber-700/50"; rankIcon = <Medal size={14} className="text-amber-600" /> }

                   return (
                       <div 
                           key={game.id} 
                           onClick={() => navigate(`/game/${game.id}`)}
                           className={`relative flex items-center gap-4 p-3 rounded-2xl border cursor-pointer hover:bg-white/5 transition-all group overflow-hidden ${index < 3 ? rankBg.replace('bg-', 'border-') : 'border-white/5 bg-slate-950/50'}`}
                       >
                           {/* Background Bar */}
                           <div 
                                className="absolute left-0 top-0 bottom-0 bg-current opacity-5 pointer-events-none transition-all duration-1000" 
                                style={{ width: `${progress}%`, color: index === 0 ? '#ec4899' : '#6366f1' }} 
                           />

                           {/* Rank */}
                           <div className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm shrink-0 ${rankBg} ${rankColor}`}>
                               {rankIcon || index + 1}
                           </div>

                           {/* Cover */}
                           <img src={game.coverUrl} className="w-10 h-14 object-cover rounded shadow-sm bg-slate-900" />

                           {/* Info */}
                           <div className="flex-1 min-w-0 z-10">
                               <h4 className="font-bold text-white truncate group-hover:text-brand-primary transition-colors">{game.title}</h4>
                               <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                   <div 
                                        className="h-full rounded-full" 
                                        style={{ 
                                            width: `${progress}%`, 
                                            backgroundColor: index === 0 ? '#ec4899' : '#6366f1' 
                                        }} 
                                   />
                               </div>
                           </div>

                           {/* Stats */}
                           <div className="text-right z-10">
                               <span className="block text-lg font-black text-white">{game.hoursPlayed.toFixed(1)}</span>
                               <span className="text-[10px] text-slate-500 uppercase font-bold">Horas</span>
                           </div>
                       </div>
                   );
               })}
           </div>

           {/* EXPAND BUTTON */}
           {leaderboardLimit < 100 && leaderboardLimit < ownedGames.length && (
               <div className="mt-8 flex justify-center">
                   <button 
                        onClick={handleShowMore}
                        className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors group"
                   >
                       <span className="text-xs font-bold uppercase tracking-widest">
                           Ver Top {Math.min(leaderboardLimit + 10, 100)}
                       </span>
                       <ChevronDown size={20} className="group-hover:translate-y-1 transition-transform" />
                   </button>
               </div>
           )}
       </div>

    </div>
  );
};
