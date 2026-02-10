
import React from 'react';
import { GameStatus } from '../../types';
import { STATUS_COLORS, STATUS_ICONS } from '../../constants';

interface BadgeProps {
  status: GameStatus;
  size?: 'sm' | 'md';
}

const STATUS_TRANSLATIONS: Record<GameStatus, string> = {
  [GameStatus.Backlog]: 'Pendiente',
  [GameStatus.Playing]: 'Jugando',
  [GameStatus.Completed]: 'Completado',
  [GameStatus.Platinums]: 'Platinado',
  [GameStatus.Dropped]: 'Abandonado',
  [GameStatus.Wishlist]: 'Deseado',
  [GameStatus.Extra]: 'Extra / Casual',
};

export const Badge: React.FC<BadgeProps> = ({ status, size = 'sm' }) => {
  const colorClass = STATUS_COLORS[status];
  const icon = STATUS_ICONS[status];
  const label = STATUS_TRANSLATIONS[status] || status;
  
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wide ${colorClass} ${sizeClasses} shadow-sm backdrop-blur-md`}>
      {icon}
      {label}
    </span>
  );
};
