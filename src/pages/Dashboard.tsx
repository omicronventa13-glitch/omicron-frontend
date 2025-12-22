import React, { useState, useEffect } from 'react';
import { BarChart3, Menu, RefreshCw } from 'lucide-react';
import api from '../api';
import type { Product, RepairOrder, User } from '../types';

// Importamos los componentes modulares
import Sidebar from '../components/dashboard/Sidebar';
import POSSection from '../components/dashboard/POSSection';
import RepairsSection from '../components/dashboard/RepairsSection';
import StockSection from '../components/dashboard/StockSection';
import UsersSection from '../components/dashboard/UsersSection';
import ReportsSection from '../components/dashboard/ReportsSection';
import StatsSection from '../components/dashboard/StatsSection';
import CashCutSection from '../components/dashboard/CashCutSection';
import QRGeneratorSection from '../components/dashboard/QRGeneratorSection';
import Notification from '../components/ui/Notification';

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
  isDark: boolean;
}

export default function Dashboard({ user, onLogout, isDark }: DashboardProps) {
  // --- ESTADOS DE DATOS ---
  const [products, setProducts] = useState<Product[]>([]);
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  
  // --- ESTADOS DE UI ---
  const [currentModule, setCurrentModule] = useState('pos');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isLoading, setIsLoading] = useState(false);

  // --- ESTADOS DE LÓGICA ENTRE MÓDULOS ---
  // Para editar un producto desde Reportes -> Stock
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Versión de datos (para forzar re-renderizado de componentes hijos cuando cambia la BD)
  const [dataVersion, setDataVersion] = useState(0);

  // --- EFECTOS ---
  // Carga inicial
  useEffect(() => {
    loadData();
  }, []);

  // Recarga automática al cambiar a pestañas que dependen de datos frescos
  useEffect(() => {
    const modulesNeedingRefresh = ['pos', 'stock', 'repairs', 'stats', 'reports', 'cashcut'];
    if (modulesNeedingRefresh.includes(currentModule)) {
        loadData();
    }
  }, [currentModule]);

  // --- FUNCIONES ---

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Sincronizando datos con el servidor...");
      const timestamp = new Date().getTime();
      
      // Headers anti-caché para asegurar datos frescos
      const config = {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      };
      
      const [pRes, rRes] = await Promise.all([
        api.get(`/products?_t=${timestamp}`, config), 
        api.get(`/repairs?_t=${timestamp}`, config)
      ]);
      
      // Actualizamos estados con nuevas referencias (Spread operator para forzar re-render)
      setProducts([...pRes.data]);
      setRepairs([...rRes.data]);
      
      // Incrementamos versión para notificar a los hijos (Stats, Reports, CashCut)
      setDataVersion(prev => prev + 1);
      
      console.log(`✅ Datos actualizados: ${pRes.data.length} productos.`);
    } catch (e) { 
      console.error("Error cargando datos:", e);
      showNotification('error', 'Error de conexión al cargar datos.');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const handleEditProductRequest = (product: Product) => {
    setProductToEdit(product); 
    setCurrentModule('stock'); // Redirige a Stock
  };

  const getTitle = () => {
    switch(currentModule) {
        case 'pos': return 'Terminal de Venta';
        case 'stock': return 'Gestión de Stock';
        case 'repairs': return 'Centro de Reparación';
        case 'reports': return 'Reportes y Tickets';
        case 'users': return 'Gestión de Usuarios';
        case 'stats': return 'Estadísticas';
        case 'cashcut': return 'Corte de Caja';
        case 'qrgen': return 'Generador de QR';
        default: return 'Panel';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden pt-24 pb-0 md:pb-4 px-0 md:px-8 gap-6">
      
      {/* Sistema de Notificaciones Global */}
      <Notification 
        type={notification.type} 
        message={notification.message} 
        onClose={() => setNotification({ type: null, message: '' })} 
      />

      {/* Sidebar Modular */}
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        currentModule={currentModule} 
        setCurrentModule={setCurrentModule} 
        isDark={isDark}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Contenido Principal */}
      <main className={`flex-1 md:rounded-3xl border-t md:border shadow-xl overflow-hidden relative flex flex-col ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/60 border-slate-200'}`}>
        
        {/* Header Interno (Título y Menú Móvil) */}
        <div className={`p-6 md:p-8 border-b flex items-center gap-4 ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'}`}>
          
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className={`md:hidden p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-800 shadow-sm hover:bg-slate-50'}`}
          >
            <Menu size={24} />
          </button>

          <div className="flex-1 flex justify-between items-center">
            <div>
                <div className="flex items-center gap-3">
                    <h2 className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {getTitle()}
                    </h2>
                    {/* BOTÓN DE SINCRONIZACIÓN MANUAL */}
                    <button 
                        onClick={loadData}
                        className={`p-2 rounded-full transition-all ${isLoading ? 'animate-spin text-cyan-500' : 'text-slate-400 hover:text-cyan-500 hover:bg-slate-500/10'}`}
                        title="Sincronizar datos manualmente"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
                <p className="text-slate-500 text-xs md:text-sm mt-1 hidden md:block">Bienvenido al panel de control de Ómicron.</p>
            </div>
          </div>
        </div>

        {/* Área de Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
            
            {/* 1. VENTAS (POS) */}
            <div className={currentModule === 'pos' ? 'block' : 'hidden'}>
                <POSSection 
                    // IMPORTANTE: Se eliminó 'key' para evitar desmontaje al recargar datos
                    products={products} 
                    isDark={isDark} 
                    onNotify={showNotification} 
                    onReload={loadData}
                    sellerName={user?.username || 'Vendedor'} 
                />
            </div>

            {/* 2. STOCK */}
            <div className={currentModule === 'stock' ? 'block' : 'hidden'}>
                <StockSection 
                    isDark={isDark} 
                    onNotify={(type, msg) => {
                        showNotification(type, msg);
                        if(type === 'success') {
                            loadData(); // Recarga inmediata tras guardar/editar
                            setProductToEdit(null); 
                        }
                    }}
                    editingProduct={productToEdit} 
                    onCancelEdit={() => setProductToEdit(null)} 
                />
            </div>

            {/* 3. REPARACIONES */}
            <div className={currentModule === 'repairs' ? 'block' : 'hidden'}>
                <RepairsSection 
                  repairs={repairs} 
                  onReload={loadData} 
                  isDark={isDark} 
                  onNotify={showNotification} 
                />
            </div>

            {/* 4. REPORTES Y TICKETS */}
            <div className={currentModule === 'reports' ? 'block' : 'hidden'}>
               <ReportsSection 
                  isDark={isDark} 
                  onEditProduct={handleEditProductRequest} 
                  onNotify={showNotification}
                  refreshTrigger={dataVersion} // Se actualiza cuando hay nuevas ventas
               />
            </div>

            {/* 5. CORTE DE CAJA */}
            <div className={currentModule === 'cashcut' ? 'block' : 'hidden'}>
               <CashCutSection 
                  isDark={isDark} 
                  onNotify={showNotification}
                  refreshTrigger={dataVersion} 
               />
            </div>

            {/* 6. ESTADÍSTICAS */}
            <div className={currentModule === 'stats' ? 'block' : 'hidden'}>
              <StatsSection 
                  isDark={isDark} 
                  refreshTrigger={dataVersion}
              />
            </div>

            {/* MÓDULOS DE ADMINISTRADOR (Usuarios y Generador QR) */}
            {(user?.role === 'super' || user?.role === 'admin') && (
              <>
                  <div className={currentModule === 'users' ? 'block' : 'hidden'}>
                     <UsersSection currentUser={user} isDark={isDark} onNotify={showNotification} />
                  </div>
                  
                  <div className={currentModule === 'qrgen' ? 'block' : 'hidden'}>
                     <QRGeneratorSection isDark={isDark} onNotify={showNotification} />
                  </div>
              </>
            )}

        </div>
      </main>
    </div>
  );
}