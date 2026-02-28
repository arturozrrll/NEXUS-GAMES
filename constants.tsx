
import React from 'react';
import { GameStatus, Platform } from './types';
import { 
  Gamepad2, 
  Trophy, 
  Ghost, 
  Clock, 
  Heart,
  Zap,
  Cloud,
  Monitor
} from 'lucide-react';

export const STATUS_COLORS: Record<GameStatus, string> = {
  [GameStatus.Playing]: 'text-green-400 bg-green-500/20 border-green-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]',
  [GameStatus.Backlog]: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  [GameStatus.Completed]: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  [GameStatus.Platinums]: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30 shadow-[0_0_10px_rgba(250,204,21,0.2)]',
  [GameStatus.Dropped]: 'text-red-400 bg-red-500/20 border-red-500/30',
  [GameStatus.Wishlist]: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
  [GameStatus.Extra]: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
};

export const STATUS_ICONS: Record<GameStatus, React.ReactNode> = {
  [GameStatus.Playing]: <Gamepad2 className="w-4 h-4" />,
  [GameStatus.Backlog]: <Clock className="w-4 h-4" />,
  [GameStatus.Completed]: <Trophy className="w-4 h-4" />,
  [GameStatus.Platinums]: <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400" />,
  [GameStatus.Dropped]: <Ghost className="w-4 h-4" />,
  [GameStatus.Wishlist]: <Heart className="w-4 h-4" />,
  [GameStatus.Extra]: <Zap className="w-4 h-4" />,
};

// RELIABLE IMAGE LOGOS (CDN) - Optimized Sizes & Colors
export const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  // PC (Windows) - Logo Oficial Angulado
  [Platform.PC]: (
      <img src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Windows_logo_-_2012.svg" alt="Windows" className="w-5 h-5 object-contain brightness-0 invert opacity-90" />
  ),
  // Steam - Original (Azul/Negro) para mantener detalle
  [Platform.Steam]: (
      <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="Steam" className="w-5 h-5 object-contain" />
  ),
  // Epic Games - Invertido (Blanco) pero sin brillo forzado
  [Platform.Epic]: (
      <img src="https://upload.wikimedia.org/wikipedia/commons/3/31/Epic_Games_logo.svg" alt="Epic" className="w-5 h-5 object-contain invert opacity-90" />
  ),
  // Amazon Games
  [Platform.Amazon]: (
       <div className="w-6 h-6 flex items-center justify-center -ml-1">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="Amazon" className="w-full object-contain brightness-0 invert" />
       </div>
  ),
  // GOG
  [Platform.GOG]: (
      <div className="w-5 h-5 flex items-center justify-center">
        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/GOG.com_logo.svg" alt="GOG" className="w-full h-full object-contain brightness-0 invert scale-125" />
      </div>
  ),
  // Riot Games - Logo Rojo Original
  [Platform.Riot]: (
       <div className="w-6 h-6 flex items-center justify-center">
         <img src="https://static.wikia.nocookie.net/leagueoflegends/images/5/53/Riot_Games_logo_icon.png/revision/latest/scale-to-width-down/200?cb=20220302144707" alt="Riot" className="w-full h-full object-contain" />
       </div>
  ),
  // Xbox Game Pass
  [Platform.GamePass]: (
      <img src="https://upload.wikimedia.org/wikipedia/commons/f/f9/Xbox_one_logo.svg" alt="Game Pass" className="w-5 h-5 object-contain brightness-0 invert" />
  ),
  // PlayStation 5 - Tamaño Aumentado
  [Platform.PS5]: (
      <img src="https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg" alt="PS5" className="w-7 h-7 object-contain brightness-0 invert" />
  ),
  // Xbox Series X/S - Tamaño Aumentado
  [Platform.Xbox]: (
      <img src="https://upload.wikimedia.org/wikipedia/commons/f/f9/Xbox_one_logo.svg" alt="Xbox" className="w-5 h-5 object-contain brightness-0 invert" />
  ),
  // Nintendo Switch - Tamaño Aumentado
  [Platform.Switch]: (
      <img src="https://upload.wikimedia.org/wikipedia/commons/5/5d/Nintendo_Switch_Logo.svg" alt="Switch" className="w-6 h-6 object-contain brightness-0 invert" />
  ),
  // Retro
  [Platform.Retro]: <Gamepad2 className="w-5 h-5 text-yellow-500" />,
  // Cloud
  [Platform.Cloud]: <Cloud className="w-5 h-5 text-sky-400" />,
  // Other
  [Platform.Other]: <Monitor className="w-5 h-5" />,
};
