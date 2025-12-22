import React from 'react';
import { ShoppingCart, Wrench, BarChart3, LogOut, X, Package, User as UserIcon, FileText, Scissors, QrCode } from 'lucide-react';
import type { User } from '../../types';

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
  currentModule: string;
  setCurrentModule: (module: string) => void;
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ user, onLogout, currentModule, setCurrentModule, isDark, isOpen, onClose }: SidebarProps) {
  
  const menuItemClass = (module: string) => `w-full flex gap-4 p-4 md:p-3 rounded-xl transition-all duration-200 items-center ${currentModule === module ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`;

  // ESTILOS RESPONSIVOS MEJORADOS
  // top-24: Empieza debajo del Header Global (que mide aprox 6rem/96px)
  // z-[60]: Por encima del contenido normal, pero gestionado junto con el overlay
  const containerClass = `
    fixed top-24 left-0 h-[calc(100vh-6rem)] w-[85%] max-w-sm z-[60] 
    flex flex-col border-r shadow-2xl transition-transform duration-300 ease-in-out transform
    md:translate-x-0 md:static md:w-64 md:shadow-none md:z-auto md:h-auto md:top-0
    ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}
    ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
  `;

  const isAdminOrSuper = user?.role === 'super' || user?.role === 'admin';

  return (
    <>
      {/* Overlay oscuro (Solo visible en móvil cuando está abierto) */}
      {/* top-24: Para no oscurecer el header global y dar efecto de profundidad */}
      <div 
        className={`fixed inset-0 top-24 bg-black/80 backdrop-blur-sm z-[55] transition-opacity duration-300 md:hidden
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      <aside className={containerClass}>
        {/* Cabecera Móvil (Logo y Cerrar) */}
        <div className="p-6 flex justify-between items-center md:hidden border-b border-slate-700/50 bg-gradient-to-r from-slate-900 to-slate-800">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center text-white font-bold">M</div>
             <span className="font-black text-white tracking-widest">MENÚ</span>
           </div>
           <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-white hover:bg-red-500/20 hover:text-red-400 transition-colors">
             <X size={20} />
           </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          <div className="mb-4 px-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Módulos del Sistema</div>
          
          {/* VISIBLE PARA TODOS */}
          <button onClick={() => { setCurrentModule('pos'); onClose(); }} className={menuItemClass('pos')}>
            <ShoppingCart size={22} /> <span className="text-lg md:text-base">Punto de Venta</span>
          </button>

          {/* SOLO ADMIN / SUPER */}
          {isAdminOrSuper && (
            <>
              <button onClick={() => { setCurrentModule('stock'); onClose(); }} className={menuItemClass('stock')}>
                <Package size={22} /> <span className="text-lg md:text-base">Stock / Inventario</span>
              </button>
              
              <button onClick={() => { setCurrentModule('repairs'); onClose(); }} className={menuItemClass('repairs')}>
                <Wrench size={22} /> <span className="text-lg md:text-base">Reparaciones</span>
              </button>

              <button onClick={() => { setCurrentModule('reports'); onClose(); }} className={menuItemClass('reports')}>
                <FileText size={22} /> <span className="text-lg md:text-base">Reportes</span>
              </button>

              <button onClick={() => { setCurrentModule('cashcut'); onClose(); }} className={menuItemClass('cashcut')}>
                <Scissors size={22} /> <span className="text-lg md:text-base">Corte de Caja</span>
              </button>

              <button onClick={() => { setCurrentModule('users'); onClose(); }} className={menuItemClass('users')}>
                  <UserIcon size={22} /> <span className="text-lg md:text-base">Usuarios</span>
              </button>
              
              <button onClick={() => { setCurrentModule('stats'); onClose(); }} className={menuItemClass('stats')}>
                <BarChart3 size={22} /> <span className="text-lg md:text-base">Estadísticas</span>
              </button>

              <button onClick={() => { setCurrentModule('qrgen'); onClose(); }} className={menuItemClass('qrgen')}>
                <QrCode size={22} /> <span className="text-lg md:text-base">Generador QR</span>
              </button>
            </>
          )}
        </nav>

        {/* Footer de Usuario */}
        <div className="p-6 mt-auto border-t border-slate-700/20 bg-slate-900/30 md:bg-transparent">
            <div className={`flex items-center gap-3 p-4 md:p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-offset-2 ring-offset-slate-900 ring-cyan-500/50">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{user?.username}</p>
                    <p className="text-[10px] text-slate-400 capitalize tracking-wide">{user?.role || 'Usuario'}</p>
                </div>
                <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Cerrar Sesión">
                  <LogOut size={20}/>
                </button>
            </div>
        </div>
      </aside>
    </>
  );
}