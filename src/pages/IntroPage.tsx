import React, { useState, useEffect } from 'react';
import { Lock, ChevronUp, ChevronLeft, ArrowRight } from 'lucide-react';
import Carousel from '../components/Carousel';
import api from '../api';

interface IntroPageProps {
  onLoginSuccess: (user: any) => void;
  isDark: boolean;
  isExiting: boolean;
}

export default function IntroPage({ onLoginSuccess, isDark, isExiting }: IntroPageProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showLogin) setTimeout(() => setError(''), 500);
  }, [showLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 800);
    } catch (err) {
      setError('Credenciales inválidas o error de conexión');
      setLoading(false);
    }
  };

  // Clases de inputs ajustadas para mejor contraste en modo Light
  const inputClass = `w-full px-6 py-4 rounded-2xl border outline-none text-lg transition-all duration-300 
    ${isDark 
      ? 'bg-slate-900/60 border-slate-700 text-white focus:border-cyan-500 focus:bg-slate-900 focus:shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500 focus:bg-white focus:shadow-xl shadow-sm'
    }`;

  const exitClass = isExiting 
    ? 'opacity-0 scale-110 blur-sm pointer-events-none duration-700 ease-in' 
    : 'opacity-100 scale-100 blur-0 duration-500';

  return (
    <div className={`relative w-full h-full flex flex-col md:flex-row overflow-hidden transition-all ${exitClass}`}>
      
      {/* --- SECCIÓN 1: CARRUSEL --- */}
      <div 
        className={`absolute md:relative inset-0 h-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] z-10
          ${showLogin 
            ? 'translate-y-full opacity-0 md:opacity-100 md:translate-y-0 md:w-1/2 md:translate-x-0' 
            : 'translate-y-0 opacity-100 md:w-full md:translate-x-0'
          }
        `}
      >
        <Carousel onEnter={() => setShowLogin(true)} isDark={isDark} isCompact={showLogin} />
        
        <div className={`absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-1000 pointer-events-none hidden md:block ${showLogin ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* --- SECCIÓN 2: LOGIN FORM --- */}
      <div 
        className={`absolute inset-0 md:inset-auto md:right-0 h-full bg-clip-padding backdrop-filter backdrop-blur-xl transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center p-8 md:p-16 z-20
          ${showLogin 
            ? 'translate-y-0 opacity-100 md:w-1/2 md:translate-x-0 md:translate-y-0' 
            : '-translate-y-full opacity-0 md:w-1/2 md:translate-x-full md:translate-y-0 md:opacity-0 pointer-events-none'
          }
          ${isDark ? 'bg-slate-950/95 md:bg-slate-950/80 md:border-l md:border-white/5' : 'bg-white/95 md:bg-white/80 md:border-l md:border-slate-200'}
        `}
      >
        {/* BOTÓN REGRESAR MOVIDO AQUÍ PARA EVITAR ENCIMAMIENTO */}
        {/* Se posiciona absoluto a la sección completa, no al formulario */}
        <button 
            onClick={() => setShowLogin(false)} 
            className={`absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-sm font-bold tracking-wide transition-all duration-500 group z-50
                ${showLogin ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
                ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'}
            `}
            style={{ transitionDelay: '100ms' }}
        >
            <div className={`p-2 rounded-full transition-colors group-hover:bg-cyan-500 group-hover:text-white ${isDark ? 'bg-slate-800/50' : 'bg-slate-200'}`}>
                <ChevronUp size={16} className="md:hidden" />
                <ChevronLeft size={16} className="hidden md:block" />
            </div>
            REGRESAR
        </button>

        <div className="w-full max-w-md relative mt-4 md:mt-0">
          
          <div 
            className={`mb-8 md:mb-12 transition-all duration-700 delay-100 ${showLogin ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl mb-6 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
              <Lock className="text-white" size={32} />
            </div>
            <h2 className={`text-3xl md:text-4xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Bienvenido</h2>
            <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-base md:text-lg`}>Ingresa tus credenciales de acceso.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 md:space-y-6">
            <div className={`transition-all duration-700 delay-200 ${showLogin ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
               <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Usuario</label>
               <input type="text" value={username} onChange={e => setUsername(e.target.value)} className={inputClass} placeholder="Ej: Omicron" />
            </div>
            
            <div className={`transition-all duration-700 delay-300 ${showLogin ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
               <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Contraseña</label>
               <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </div>
            
            {error && (
               <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 animate-pulse">
                  <p className="text-sm font-medium">{error}</p>
               </div>
            )}

            <div className={`transition-all duration-700 delay-500 ${showLogin ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <button 
                type="submit" 
                disabled={!username || !password || loading} 
                className={`w-full py-4 md:py-5 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 flex items-center justify-center gap-3 group
                  ${(!username || !password) 
                    ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95'
                  }
                `}
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    INICIAR SESIÓN <ArrowRight size={20} className={`${(!username || !password) ? '' : 'group-hover:translate-x-1 transition-transform'}`} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}