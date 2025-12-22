import React, { useState, useEffect } from 'react';
import { Database, Cpu, Zap, Building2 } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    title: "Bienvenido al Punto de Venta",
    desc: "El software administrativo y de control total.",
    icon: <Database size={80} className="text-cyan-400 mb-6" />,
    tag: "INTRODUCCIÓN"
  },
  {
    id: 2,
    title: "IA & Predicciones",
    desc: "Próximamente: Análisis inteligente de stock y ventas.",
    icon: <Cpu size={80} className="text-purple-400 mb-6" />,
    tag: "FUTURO"
  },
  {
    id: 3,
    title: "App Móvil Nativa",
    desc: "Controla tu negocio desde iOS y Android en tiempo real.",
    icon: <Zap size={80} className="text-yellow-400 mb-6" />,
    tag: "ROADMAP"
  },
  {
    id: 4,
    title: "Ómicron",
    desc: "Desarrollo de software de alto rendimiento.",
    subtitle: "Ing. José Manuel Rangel Cortés",
    contact: "7713013483",
    icon: <Building2 size={80} className="text-blue-400 mb-6" />,
    tag: "EMPRESA"
  }
];

interface CarouselProps {
  onEnter: () => void;
  isDark: boolean;
  isCompact?: boolean; // Nueva prop para detectar si está en pantalla dividida
}

export default function Carousel({ onEnter, isDark, isCompact = false }: CarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      onClick={onEnter}
      className={`w-full h-full flex items-center justify-center cursor-pointer group relative overflow-hidden transition-all duration-700 ${isCompact ? 'p-8' : 'p-8 md:p-16'}`}
    >
      {/* Área de clic visual */}
      <div className="absolute inset-0 bg-transparent group-hover:bg-cyan-500/5 transition-colors duration-500 z-0"></div>

      <div className="w-full max-w-6xl relative z-10 h-[500px] flex items-center">
        
        {SLIDES.map((slide: any, index) => {
          const isActive = index === currentSlide;
          
          return (
            <div 
              key={slide.id}
              className={`absolute inset-0 flex items-center transition-all duration-1000 ease-in-out 
                ${isActive ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-95 pointer-events-none'}
                ${isCompact ? 'justify-center text-center' : 'md:grid md:grid-cols-2 gap-12'} 
              `}
            >
              {/* --- TEXTO --- */}
              <div className={`space-y-6 ${isCompact ? 'max-w-xl mx-auto' : ''}`}>
                <div className="space-y-4">
                  <span className="inline-block px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold tracking-[0.2em]">
                    {slide.tag}
                  </span>
                  
                  {/* Título con color fuerte en Light Mode */}
                  <h2 className={`text-4xl lg:text-6xl font-black leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {slide.title}
                  </h2>
                  
                  <div>
                    {/* Descripción con más contraste */}
                    <p className={`text-lg lg:text-2xl font-light leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700 font-normal'}`}>
                      {slide.desc}
                    </p>
                    
                    {/* Subtítulos personalizados */}
                    {slide.subtitle && (
                      <p className={`text-lg font-bold mt-4 uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-cyan-400' : 'text-cyan-700'} ${isCompact ? 'justify-center' : ''}`}>
                        {slide.subtitle}
                      </p>
                    )}
                    
                    {slide.contact && (
                      <p className={`text-2xl font-black mt-1 tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {slide.contact}
                      </p>
                    )}
                  </div>
                </div>

                {/* Indicadores de progreso */}
                <div className={`flex gap-3 pt-8 ${isCompact ? 'justify-center' : ''}`}>
                  {SLIDES.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-700 ${idx === currentSlide ? 'w-12 bg-cyan-500 shadow-lg' : 'w-3 bg-slate-400/50'}`}
                    />
                  ))}
                </div>
                
                <p className="text-xs text-cyan-600 animate-pulse pt-4 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  [ Clic para ingresar ]
                </p>
              </div>

              {/* --- GRÁFICO 3D (Oculto en modo compacto/laptop split) --- */}
              {!isCompact && (
                <div className="relative hidden md:flex items-center justify-center">
                   <div className={`absolute inset-0 rounded-full blur-3xl transition-colors duration-1000 ${isActive ? 'bg-cyan-500/20 scale-100' : 'bg-transparent scale-50'}`}></div>
                   
                   <div className={`relative backdrop-blur-xl p-12 rounded-[3rem] shadow-2xl border transform transition-all duration-1000 ${isDark ? 'bg-slate-900/50 border-white/10' : 'bg-white/80 border-slate-200 shadow-slate-300'} ${isActive ? 'rotate-y-12 translate-y-0' : 'rotate-y-0 translate-y-10'}`}>
                      {slide.icon}
                      <div className={`w-48 h-3 rounded-full mb-4 opacity-50 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                      <div className={`w-32 h-3 rounded-full opacity-30 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}