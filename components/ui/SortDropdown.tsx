
import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownUp, Check } from 'lucide-react';
import { SortOption } from '../../types';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Recientes', value: 'recent' },
  { label: 'Mi Nota', value: 'userRating' },
  { label: 'Mejor Valorados (IGDB)', value: 'rating' },
  { label: 'Más Jugados', value: 'playtime' },
  { label: 'Nombre (A-Z)', value: 'name' },
  { label: 'Fecha Lanzamiento', value: 'release' },
];

export const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLabel = OPTIONS.find(o => o.value === value)?.label || 'Ordenar';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-800/80 border border-white/10 rounded-2xl px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors min-w-[200px]"
      >
        <ArrowDownUp size={16} className="text-brand-primary" />
        <span className="flex-1 text-left text-sm font-medium">{currentLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          <div className="p-1">
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${
                  value === option.value
                    ? 'bg-brand-primary/10 text-brand-primary font-bold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {option.label}
                {value === option.value && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
