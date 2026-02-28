
import React, { useState, useEffect } from 'react';
import { Game } from '../types';

interface CountdownCardProps {
    game: Game;
    onClick: (id: number) => void;
}

export const CountdownCard: React.FC<CountdownCardProps> = ({ game, onClick }) => {
    const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number}>({ days: 0, hours: 0, minutes: 0 });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(game.releaseDate) - +new Date();
            let timeLeft = { days: 0, hours: 0, minutes: 0 };

            if (difference > 0) {
                timeLeft = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60)
                };
            }
            return timeLeft;
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, [game.releaseDate]);

    const formatNumber = (num: number) => {
        return num.toString().padStart(2, '0').split('');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div 
            onClick={() => onClick(game.id)}
            className="group relative flex flex-col w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-brand-primary/50 transition-all hover:-translate-y-1 hover:shadow-2xl"
        >
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img src={game.bannerUrl || game.coverUrl} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/10" />
            </div>

            {/* Content */}
            <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                <div>
                    <h3 className="text-2xl font-black text-white drop-shadow-md truncate">{game.title}</h3>
                    <p className="text-slate-300 font-medium underline decoration-brand-primary/50 underline-offset-4">{formatDate(game.releaseDate)}</p>
                </div>

                <div className="flex items-center gap-4 mt-auto">
                    {/* Days */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-1">
                            {formatNumber(timeLeft.days).map((digit, i) => (
                                <div key={i} className="bg-slate-800/80 backdrop-blur-sm border border-white/10 w-8 h-12 flex items-center justify-center rounded text-xl font-mono text-white font-bold shadow-lg">
                                    {digit}
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Days</span>
                    </div>

                    <div className="h-8 w-px bg-white/20 self-center mb-4 mx-1"></div>

                    {/* Hours */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-1">
                            {formatNumber(timeLeft.hours).map((digit, i) => (
                                <div key={i} className="bg-slate-800/80 backdrop-blur-sm border border-white/10 w-8 h-12 flex items-center justify-center rounded text-xl font-mono text-white font-bold shadow-lg">
                                    {digit}
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hours</span>
                    </div>

                    <div className="h-8 w-px bg-white/20 self-center mb-4 mx-1"></div>

                    {/* Minutes */}
                    <div className="flex flex-col items-center gap-1">
                         <div className="flex gap-1">
                            {formatNumber(timeLeft.minutes).map((digit, i) => (
                                <div key={i} className="bg-slate-800/80 backdrop-blur-sm border border-white/10 w-8 h-12 flex items-center justify-center rounded text-xl font-mono text-white font-bold shadow-lg">
                                    {digit}
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Minutes</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
