
import React from 'react';
import { useGameContext } from '../store/GameContext';
import { CountdownCard } from '../components/CountdownCard';
import { GameCard } from '../components/GameCard';
import { Sparkles, RefreshCcw, Rocket, TrendingUp, Calendar, DollarSign, User } from 'lucide-react';
import { Game, GameStatus, Platform } from '../types';
import { useNavigate } from 'react-router-dom';

export const Discover: React.FC = () => {
  const { discovery, refreshDiscovery, isDiscovering, library } = useGameContext();
  const navigate = useNavigate();

  // Helper to convert Metadata to Game type for the cards (mostly compatible)
  const toGame = (meta: any): Game => ({
      ...meta,
      status: GameStatus.Extra, // Dummy status for display
      platform: Platform.PC,
      userRating: 0,
      hoursPlayed: 0,
      addedAt: Date.now()
  });

  const renderGameGrid = (games: any[], useCountdown: boolean) => (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {games.map(game => {
              const inLibrary = library.some(l => l.id === game.id);
              const GameComponent = useCountdown ? CountdownCard : GameCard;
              
              return (
                  <div key={game.id} className="relative group">
                      <div className={inLibrary ? "opacity-50 grayscale" : ""}>
                          <GameComponent 
                              game={toGame(game)} 
                              onClick={() => navigate(`/game/${game.id}`)}
                          />
                      </div>
                      {inLibrary && (
                          <div className="absolute top-2 right-2 bg-green-500/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none z-10">
                              EN BIBLIOTECA
                          </div>
                      )}
                  </div>
              );
          })}
      </div>
  );

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                <Sparkles className="text-brand-primary" /> Descubrimiento IA
            </h1>
            <p className="text-slate-400">Recomendaciones Premium: Sin F2P, Enfocado en Single Player y Novedades Reales.</p>
        </div>
        
        <button 
            onClick={refreshDiscovery}
            disabled={isDiscovering}
            className="px-6 py-3 bg-white text-slate-950 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
        >
            <RefreshCcw size={18} className={isDiscovering ? "animate-spin" : ""} />
            {isDiscovering ? "Analizando Mercado..." : "Actualizar Análisis"}
        </button>
      </div>

      {discovery.upcoming.length === 0 && discovery.recent.length === 0 && discovery.popular.length === 0 && !isDiscovering ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles size={40} className="text-brand-primary" />
              </div>
              <h2 className="text-2xl font-bold text-white">Descubre tu próxima aventura</h2>
              <p className="text-slate-400 max-w-md">
                  Pulsa "Actualizar Análisis" para generar recomendaciones personalizadas basadas en la fecha actual.
              </p>
          </div>
      ) : (
          <div className="space-y-16">
              
              {/* Upcoming Section */}
              {discovery.upcoming.length > 0 && (
                  <section className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                          <Rocket className="text-purple-400" size={24} />
                          <div>
                            <h2 className="text-2xl font-bold text-white">Próximos 30 Días</h2>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Lanzamientos confirmados inminentes</p>
                          </div>
                      </div>
                      {/* Using 5 column grid for larger countdown cards if needed, but keeping consistent for now */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                           {discovery.upcoming.map(game => (
                               <CountdownCard 
                                    key={game.id} 
                                    game={toGame(game)} 
                                    onClick={() => navigate(`/game/${game.id}`)}
                               />
                           ))}
                      </div>
                  </section>
              )}

               {/* Popular Section (Real Trends) */}
               {discovery.popular.length > 0 && (
                  <section className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                          <TrendingUp className="text-pink-400" size={24} />
                          <div>
                             <h2 className="text-2xl font-bold text-white">Top Ventas Globales (Premium)</h2>
                             <div className="flex gap-3 mt-1">
                                <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20 flex items-center gap-1 font-bold"><DollarSign size={10} /> JUEGOS DE PAGO</span>
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1 font-bold"><User size={10} /> SINGLE PLAYER FOCUS</span>
                             </div>
                          </div>
                      </div>
                      {renderGameGrid(discovery.popular, false)}
                  </section>
              )}

              {/* Recent Section (New Releases) */}
              {discovery.recent.length > 0 && (
                  <section className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                          <Calendar className="text-cyan-400" size={24} />
                          <h2 className="text-2xl font-bold text-white">Novedades Recientes</h2>
                      </div>
                      {renderGameGrid(discovery.recent, false)}
                  </section>
              )}
          </div>
      )}
    </div>
  );
};
