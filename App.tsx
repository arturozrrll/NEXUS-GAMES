
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './store/GameContext';
import { AuthProvider } from './store/AuthContext';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Library } from './pages/Library';
import { Statistics } from './pages/Statistics';
import { GameDetail } from './pages/GameDetail';
import { Settings } from './pages/Settings';
import { AddGameModal } from './components/AddGameModal';
import { GlobalTimer } from './components/GlobalTimer';

const Layout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-primary selection:text-white">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-secondary/10 blur-[120px]" />
      </div>

      <Navigation />
      <AddGameModal />
      <GlobalTimer />

      <main className="lg:pl-64 min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

const App = () => {
  // AUTO-INYECCIÓN DE SEGURIDAD: 
  // Nos aseguramos de que las claves estén en LocalStorage antes de cualquier otra cosa.
  useEffect(() => {
    const cid = 'gp762nuuoqcoxypju8c569th9wz7q5';
    const tok = '1rgwxmk9l5px28ou28tvo02juzumwx';
    
    if (!localStorage.getItem('nexus_igdb_client_id')) {
        localStorage.setItem('nexus_igdb_client_id', cid);
    }
    if (!localStorage.getItem('nexus_igdb_token')) {
        localStorage.setItem('nexus_igdb_token', tok);
    }
    console.log("[Nexus] Credenciales inyectadas y activas.");
  }, []);

  return (
    <AuthProvider>
        <GameProvider>
        <HashRouter>
            <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/library" element={<Library />} />
                <Route path="/wishlist" element={<Library initialMode="WISHLIST" />} />
                <Route path="/stats" element={<Statistics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/game/:id" element={<GameDetail />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Layout>
        </HashRouter>
        </GameProvider>
    </AuthProvider>
  );
};

export default App;
