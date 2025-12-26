import React, { useState } from 'react';
import { Moon, Sun, Database } from 'lucide-react';
import IntroPage from './pages/IntroPage';
import Dashboard from './pages/Dashboard';
import type { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDark, setIsDark] = useState(true);
  
  // Estados de Transición
  const [isExitingIntro, setIsExitingIntro] = useState(false);
  const [isEnteringDash, setIsEnteringDash] = useState(false);

  const handleLoginSuccess = (userData: User) => {
    // 1. Inicia animación de salida de IntroPage (Zoom/Fade Out)
    setIsExitingIntro(true);

    // 2. Espera a que termine la animación de salida (700ms)
    setTimeout(() => {
      setUser(userData); // Monta el Dashboard
      setIsExitingIntro(false);
      
      // 3. Prepara animación de entrada del Dashboard
      // Pequeño delay para asegurar que el DOM se montó
      setTimeout(() => {
        setIsEnteringDash(true);
      }, 50);
    }, 700);
  };

  const handleLogout = () => {
    setIsEnteringDash(false);
    setTimeout(() => {
      setUser(null);
    }, 500);
  };

  // Header Estático Global (Fixed para que no se mueva con el scroll)
  const Header = () => (
    <div className="fixed top-0 w-full p-6 md:p-8 flex justify-between items-center z-50 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 backdrop-blur-md">
           <Database className="text-white" size={20} />
        </div>
        <h1 className="text-2xl font-black tracking-widest drop-shadow-sm bg-gradient-to-br from-red-500 via-red-700 to-red-900 bg-clip-text text-transparent">
          NOVA TECH<span className="">.</span>
        </h1>
      </div>
      <button 
        onClick={() => setIsDark(!isDark)} 
        className={`pointer-events-auto w-16 h-9 rounded-full p-1 transition-all duration-300 flex items-center border backdrop-blur-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200 shadow-sm'}`}
      >
        <div className={`w-7 h-7 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${isDark ? 'translate-x-7 bg-slate-950 text-cyan-400' : 'translate-x-0 bg-yellow-400 text-white'}`}>
          {isDark ? <Moon size={14} /> : <Sun size={14} />}
        </div>
      </button>
    </div>
  );

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-700 ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
      
      {/* Fondo Global Animado */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] animate-pulse-slow pointer-events-none"></div>
      <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none transition-colors duration-700 ${isDark ? 'bg-cyan-600' : 'bg-cyan-400'}`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none transition-colors duration-700 ${isDark ? 'bg-blue-600' : 'bg-purple-400'}`}></div>
      
      {/* Header siempre visible y fijo */}
      <Header />

      {/* Si no hay usuario, mostramos IntroPage */}
      {!user && (
        <IntroPage 
          onLoginSuccess={handleLoginSuccess} 
          isDark={isDark} 
          isExiting={isExitingIntro} 
        />
      )}

      {/* Si hay usuario, mostramos Dashboard con animación de entrada */}
      {user && (
        <div className={`w-full h-full transition-all duration-700 ease-out transform ${isEnteringDash ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <Dashboard user={user} onLogout={handleLogout} isDark={isDark} />
        </div>
      )}
    </div>
  );
}
