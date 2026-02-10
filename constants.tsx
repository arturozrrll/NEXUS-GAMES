
import React from 'react';
import { GameStatus, Platform } from './types';
import { 
  Gamepad2, 
  Trophy, 
  Ghost, 
  Clock, 
  Heart,
  Monitor,
  Box,
  Disc,
  Smartphone,
  Laptop,
  Joystick,
  Zap
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

export const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  [Platform.PC]: <Monitor className="w-4 h-4" />,
  [Platform.PS5]: <Disc className="w-4 h-4" />,
  [Platform.PS4]: <Disc className="w-4 h-4" />,
  [Platform.XboxSeries]: <Box className="w-4 h-4" />,
  [Platform.Switch]: <Smartphone className="w-4 h-4" />,
  [Platform.SteamDeck]: <Laptop className="w-4 h-4" />,
  [Platform.Retro]: <Joystick className="w-4 h-4" />,
  [Platform.Other]: <Gamepad2 className="w-4 h-4" />,
};
