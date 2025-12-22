import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Calendar, Users, DollarSign, Award, ArrowUpRight, RefreshCw } from 'lucide-react';
import api from '../../api';
import type { Ticket } from '../../types';

interface StatsSectionProps {
  isDark: boolean;
  refreshTrigger?: number; // Prop para recargar datos automáticamente
}

export default function StatsSection({ isDark, refreshTrigger }: StatsSectionProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  // Cargar datos al montar y al refrescar (cuando cambia refreshTrigger)
  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/tickets');
      setTickets(data);
    } catch (e) {
      console.error("Error cargando estadísticas", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- MOTOR DE ANÁLISIS DE DATOS ---
  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0,0,0,0));
    
    // Calcular inicio de semana (Domingo)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filtros
    const salesToday = tickets.filter(t => new Date(t.createdAt) >= startOfDay);
    const salesWeek = tickets.filter(t => new Date(t.createdAt) >= startOfWeek);
    const salesMonth = tickets.filter(t => new Date(t.createdAt) >= startOfMonth);

    // Totales
    const totalToday = salesToday.reduce((sum, t) => sum + t.total, 0);
    const totalWeek = salesWeek.reduce((sum, t) => sum + t.total, 0);
    const totalMonth = salesMonth.reduce((sum, t) => sum + t.total, 0);

    // Ranking de Vendedores
    const salesBySeller: Record<string, { total: number, count: number }> = {};
    // Usamos los tickets del rango seleccionado para el ranking
    const targetTickets = timeRange === 'day' ? salesToday : timeRange === 'week' ? salesWeek : salesMonth;

    targetTickets.forEach(t => {
        const seller = t.seller || 'Desconocido';
        if (!salesBySeller[seller]) salesBySeller[seller] = { total: 0, count: 0 };
        salesBySeller[seller].total += t.total;
        salesBySeller[seller].count += 1;
    });

    const ranking = Object.entries(salesBySeller)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total);

    // Datos para Gráfica (Últimos 7 días)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d;
    }).reverse();

    const chartData = last7Days.map(date => {
        const dateStr = date.toLocaleDateString();
        const dayTotal = tickets
            .filter(t => new Date(t.createdAt).toLocaleDateString() === dateStr)
            .reduce((sum, t) => sum + t.total, 0);
            
        return {
            label: date.toLocaleDateString('es-MX', { weekday: 'short' }), // Lun, Mar...
            date: dateStr,
            total: dayTotal
        };
    });

    const maxChartValue = Math.max(...chartData.map(d => d.total)) || 100; // Para calcular altura de barras

    return { 
        totalToday, 
        totalWeek, 
        totalMonth, 
        ranking, 
        chartData, 
        maxChartValue,
        countToday: salesToday.length 
    };
  }, [tickets, timeRange]);

  // Estilos
  const cardClass = `p-6 rounded-3xl border transition-all hover:shadow-lg ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`;
  const textClass = isDark ? 'text-white' : 'text-slate-900';
  const subTextClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="pb-20 space-y-8 animate-fade-in-up">
       
       {/* Header de Sección */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
               <h3 className={`text-3xl font-black ${textClass}`}>Reporte Financiero</h3>
               <p className={subTextClass}>Métricas de rendimiento en tiempo real.</p>
           </div>
           
           <div className="flex items-center gap-3">
               <button onClick={loadStats} className={`p-2 rounded-xl transition-all ${isLoading ? 'animate-spin text-cyan-400' : 'text-slate-400 hover:text-cyan-500 hover:bg-slate-500/10'}`}>
                   <RefreshCw size={20} />
               </button>
               <div className={`flex p-1 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                   {(['day', 'week', 'month'] as const).map(range => (
                       <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${timeRange === range ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-400'}`}
                       >
                           {range === 'day' ? 'Hoy' : range === 'week' ? 'Semana' : 'Mes'}
                       </button>
                   ))}
               </div>
           </div>
       </div>

       {/* KPIs Principales */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Card 1: Ventas */}
           <div className={cardClass}>
               <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-green-500/20 rounded-2xl text-green-500"><DollarSign size={28}/></div>
                   <span className="flex items-center text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                       <ArrowUpRight size={14} className="mr-1"/> Ingresos
                   </span>
               </div>
               <div>
                   <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Ventas {timeRange === 'day' ? 'del Día' : timeRange === 'week' ? 'Semanal' : 'Mensual'}</p>
                   <h4 className={`text-4xl font-black ${textClass}`}>
                       ${(timeRange === 'day' ? stats.totalToday : timeRange === 'week' ? stats.totalWeek : stats.totalMonth).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                   </h4>
               </div>
           </div>

           {/* Card 2: Mejor Vendedor */}
           <div className={cardClass}>
               <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-500"><Award size={28}/></div>
               </div>
               <div>
                   <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Top Vendedor ({timeRange === 'day' ? 'Hoy' : 'Periodo'})</p>
                   <h4 className={`text-2xl font-black ${textClass} truncate`}>
                       {stats.ranking[0]?.name || 'Sin datos'}
                   </h4>
                   <p className="text-sm text-blue-400 font-bold mt-1">
                       ${(stats.ranking[0]?.total || 0).toLocaleString()} <span className="text-slate-500 font-normal">generados</span>
                   </p>
               </div>
           </div>

           {/* Card 3: Volumen */}
           <div className={cardClass}>
               <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400"><TrendingUp size={28}/></div>
               </div>
               <div>
                   <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Transacciones Hoy</p>
                   <h4 className={`text-4xl font-black ${textClass}`}>{stats.countToday}</h4>
               </div>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* Gráfica de Barras (CSS Puro) */}
           <div className={`lg:col-span-2 ${cardClass}`}>
               <div className="flex items-center justify-between mb-8">
                    <h4 className={`text-lg font-bold flex items-center gap-2 ${textClass}`}>
                        <BarChart3 size={20} className="text-cyan-500"/> Tendencia de Ventas (7 Días)
                    </h4>
               </div>
               
               {/* Contenedor de barras */}
               <div className="h-64 flex items-end justify-between gap-3 px-2">
                   {stats.chartData.map((d, i) => {
                       const heightPercent = (d.total / stats.maxChartValue) * 100;
                       return (
                           <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                               {/* Tooltip */}
                               <div className={`absolute -top-12 bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-10 shadow-xl border border-slate-700`}>
                                   ${d.total.toLocaleString()}
                               </div>
                               
                               {/* Barra */}
                               <div 
                                    className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-lg relative transition-all duration-700 ease-out hover:opacity-80"
                                    style={{ height: `${Math.max(heightPercent, 2)}%` }} // Min 2% para que se vea algo
                                ></div>
                               
                               {/* Etiqueta Eje X */}
                               <span className="text-[10px] md:text-xs text-slate-500 mt-3 font-bold uppercase tracking-wide">{d.label}</span>
                           </div>
                       );
                   })}
               </div>
           </div>

           {/* Tabla de Rendimiento */}
           <div className={cardClass}>
               <h4 className={`text-lg font-bold mb-6 flex items-center gap-2 ${textClass}`}>
                   <Users className="text-orange-500" size={20}/> Rendimiento Equipo
               </h4>
               <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
                   {stats.ranking.length === 0 && <p className="text-slate-500 text-sm italic text-center py-4">Sin ventas en este periodo.</p>}
                   
                   {stats.ranking.map((seller, idx) => (
                       <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isDark ? 'border-slate-700 bg-slate-900/30 hover:bg-slate-800' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                           <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-xs shadow-sm 
                                    ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-slate-700 text-slate-400'}`}>
                                   {idx + 1}
                               </div>
                               <div>
                                   <p className={`text-sm font-bold ${textClass}`}>{seller.name}</p>
                                   <p className="text-[10px] text-slate-500 font-medium">{seller.count} tickets</p>
                               </div>
                           </div>
                           <span className="font-mono font-bold text-green-500 text-sm">
                               ${seller.total.toLocaleString()}
                           </span>
                       </div>
                   ))}
               </div>
           </div>
       </div>
    </div>
  );
}