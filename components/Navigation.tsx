
import React from 'react';
import { 
  LayoutDashboard, 
  Library, 
  BarChart3, 
  PlusCircle,
  Gamepad2,
  Settings,
  Heart
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useGameContext } from '../store/GameContext';
import { useAuth } from '../store/AuthContext';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { openAddModal } = useGameContext();
  const { user } = useAuth();

  const navItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Inicio' },
    { path: '/library', icon: <Library size={20} />, label: 'Biblioteca' },
    { path: '/wishlist', icon: <Heart size={20} className="text-pink-500" />, label: 'Lista de Deseos' },
    { path: '/stats', icon: <BarChart3 size={20} />, label: 'Estadísticas' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Ajustes' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 lg:w-64 flex flex-col bg-slate-950/90 backdrop-blur-xl border-r border-white/5 z-50">
      {/* Logo Area */}
      <div className="h-24 flex items-center justify-center lg:justify-start lg:px-8 border-b border-white/5">
        <div className="w-10 h-10 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20 shrink-0">
          <Gamepad2 className="text-white w-6 h-6" />
        </div>
        <span className="hidden lg:block ml-4 font-bold text-2xl tracking-tight text-white font-sans">
          NEXUS
        </span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-8 flex flex-col gap-2 px-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex items-center justify-center lg:justify-start gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group
              ${isActive(item.path) 
                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/25 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'}
            `}
          >
            {item.icon}
            <span className="hidden lg:block">{item.label}</span>
          </Link>
        ))}

        <div className="my-6 border-t border-white/5 mx-4"></div>

        {/* Add Game Button */}
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center lg:justify-start gap-4 px-4 py-3.5 rounded-2xl text-brand-accent hover:bg-brand-accent/10 transition-colors w-full group"
        >
          <div className="bg-brand-accent/20 p-1 rounded-lg group-hover:bg-brand-accent/30 transition-colors">
            <PlusCircle size={20} />
          </div>
          <span className="hidden lg:block font-bold">Añadir Juego</span>
        </button>
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/5 bg-slate-900/50">
          <div className="flex items-center justify-center lg:justify-start gap-3 w-full p-2 rounded-xl transition-colors">
             <img 
              src={user?.avatar} 
              alt="User" 
              className="w-10 h-10 rounded-full ring-2 ring-brand-primary shadow-md bg-white"
             />
             <div className="hidden lg:flex flex-col items-start overflow-hidden">
               <span className="text-sm font-bold text-white truncate w-32">{user?.name}</span>
               <span className="text-[10px] text-green-400 font-medium uppercase tracking-wider">Propietario</span>
             </div>
          </div>
      </div>
    </aside>
  );
};
