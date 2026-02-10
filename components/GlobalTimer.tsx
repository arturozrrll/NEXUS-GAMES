import React, { useState, useEffect } from 'react';
import { useGameContext } from '../store/GameContext';
import { Pause, Play, StopCircle, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const GlobalTimer: React.FC = () => {
    const { activeSession, stopSession, getGame } = useGameContext();
    const navigate = useNavigate();
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!activeSession) {
            setElapsed(0);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            setElapsed(now - activeSession.startTime);
        }, 1000);

        return () => clearInterval(interval);
    }, [activeSession]);

    if (!activeSession) return null;

    const game = getGame(activeSession.gameId);
    if (!game) return null;

    // Format time hh:mm:ss
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-full max-w-lg px-4 animate-slide-up">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl flex items-center gap-4 ring-1 ring-brand-primary/50">
                {/* Cover */}
                <img 
                    src={game.coverUrl} 
                    className="w-12 h-16 object-cover rounded-lg shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/game/${game.id}`)}
                />
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-brand-primary uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse"></span>
                        Jugando ahora
                    </div>
                    <h4 className="text-white font-bold truncate cursor-pointer hover:underline" onClick={() => navigate(`/game/${game.id}`)}>
                        {game.title}
                    </h4>
                    <div className="text-2xl font-mono font-black text-white tabular-nums leading-none mt-1">
                        {formatTime(elapsed)}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => stopSession()}
                        className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full flex items-center justify-center transition-all border border-red-500/20"
                        title="Terminar Sesión y Guardar"
                    >
                        <StopCircle size={20} fill="currentColor" className="opacity-50" />
                    </button>
                    <button
                        onClick={() => navigate(`/game/${game.id}`)}
                        className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all border border-white/5"
                    >
                        <Maximize2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};