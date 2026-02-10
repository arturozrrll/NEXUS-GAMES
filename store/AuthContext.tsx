import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// USUARIO PERMANENTE
const ARSUR_USER: User = {
  id: 'user_arsur_admin',
  name: 'Arsur',
  email: 'arsur@nexus.gg',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arsur&backgroundColor=b6e3f4'
};

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  // Siempre logueado como Arsur
  const [user] = useState<User>(ARSUR_USER);
  const [isLoading] = useState(false);

  const loginWithGoogle = async () => {
    // No-op
    console.log("Login system disabled. Always Arsur.");
  };

  const logout = () => {
    // No-op
    console.log("Logout disabled. You are the owner.");
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};