import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingDown, TrendingUp, Save, Plus, Trash2, Wallet, Calendar as CalendarIcon, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api';
import type { Ticket } from '../../types';

interface Expense {
  id: string;
  description: string;
  amount: number;
}

interface CashCutSectionProps {
  isDark: boolean;
  onNotify: (type: 'success' | 'error', msg: string) => void;
  refreshTrigger: number;
}

export default function CashCutSection({ isDark, onNotify, refreshTrigger }: CashCutSectionProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  
  // Estado para el calendario
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Estados financieros
  const [openingCash, setOpeningCash] = useState<string>('');
  const [closingCash, setClosingCash] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Formulario de gasto
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  // Cargar ventas
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const { data } = await api.get('/tickets');
        setTickets(data);
      } catch (e) { console.error(e); }
    };
    fetchSales();
  }, [refreshTrigger]);

  // --- LÓGICA DE FECHAS ---
  const dateInfo = useMemo(() => {
    // Crear fecha local basada en el input string YYYY-MM-DD
    // Agregamos la hora T00:00 para evitar desfases de zona horaria al instanciar
    const [year, month, day] = selectedDate.split('-').map(Number);
    const anchorDate = new Date(year, month - 1, day); 
    
    let startDate = new Date(anchorDate);
    let endDate = new Date(anchorDate);
    let label = '';

    if (timeRange === 'day') {
        startDate.setHours(0,0,0,0);
        endDate.setHours(23,59,59,999);
        label = anchorDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else if (timeRange === 'week') {
        const dayOfWeek = anchorDate.getDay(); 
        const diff = anchorDate.getDate() - dayOfWeek;
        startDate = new Date(anchorDate);
        startDate.setDate(diff);
        startDate.setHours(0,0,0,0);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23,59,59,999);

        label = `Semana del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}`;
    } else if (timeRange === 'month') {
        startDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
        endDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59);
        label = anchorDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }

    return { startDate, endDate, label };
  }, [selectedDate, timeRange]);

  // --- CÁLCULOS MATEMÁTICOS ---
  const financials = useMemo(() => {
    const filteredTickets = tickets.filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate >= dateInfo.startDate && tDate <= dateInfo.endDate;
    });

    const totalSales = filteredTickets.reduce((sum, t) => sum + t.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const opening = parseFloat(openingCash) || 0;
    const closing = parseFloat(closingCash) || 0;
    
    const expectedCash = opening + totalSales - totalExpenses;
    const difference = closing - expectedCash;
    const netProfit = totalSales - totalExpenses;

    return { totalSales, totalExpenses, expectedCash, difference, netProfit, salesCount: filteredTickets.length };
  }, [tickets, dateInfo, expenses, openingCash, closingCash]);

  // --- MANEJADORES ---
  const handleDateChange = (days: number) => {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const current = new Date(year, month - 1, day);
      current.setDate(current.getDate() + days);
      
      // Formato YYYY-MM-DD manual para evitar problemas de zona horaria
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${d}`);
  };

  const addExpense = () => {
      const amount = parseFloat(newExpenseAmount);
      
      if (!newExpenseDesc.trim()) {
          onNotify('error', 'Ingresa una descripción para el gasto.');
          return;
      }
      if (isNaN(amount) || amount <= 0) {
          onNotify('error', 'Ingresa un monto válido mayor a 0.');
          return;
      }

      const expense: Expense = {
          id: Date.now().toString(),
          description: newExpenseDesc,
          amount: amount
      };

      setExpenses([...expenses, expense]);
      setNewExpenseDesc('');
      setNewExpenseAmount('');
  };

  const removeExpense = (id: string) => {
      setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleSaveCut = () => {
      console.log("Guardando corte...", { 
          date: selectedDate,
          range: timeRange, 
          financials,
          expenses 
      });
      onNotify('success', 'Corte de caja guardado correctamente (Simulación).');
  };

  // Estilos Base
  const cardClass = `p-6 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`;
  const inputBaseClass = `rounded-xl border outline-none transition-colors focus:ring-2 focus:ring-cyan-500`;
  
  // Clase para inputs del arqueo
  const mainInputClass = `${inputBaseClass} w-full px-4 py-2 ${isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`;

  // Clase ESPECÍFICA para inputs de gastos (Contraste mejorado)
  const expenseDescClass = `${inputBaseClass} px-4 py-2 ${isDark ? 'bg-slate-950 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`;
  
  return (
    // FIX: Usar w-full y max-w-full para ocupar todo el ancho disponible en pantallas grandes
    <div className="w-full h-full pb-20 space-y-6 animate-fade-in-up overflow-y-auto">
        
        {/* Header y Filtros (Responsive: Column en móvil, Row en escritorio) */}
        <div className={`p-4 md:p-6 rounded-2xl border flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="w-full xl:w-auto">
                <h2 className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>Corte y Finanzas</h2>
                <div className="flex items-center gap-2 mt-1 text-cyan-500">
                    <CalendarIcon size={16} />
                    <span className="text-xs md:text-sm font-bold uppercase tracking-wide truncate max-w-full">{dateInfo.label}</span>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto">
               {/* SELECTOR DE FECHA CON NAVEGACIÓN */}
               <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start bg-slate-500/5 p-1 rounded-xl">
                   <button onClick={() => handleDateChange(-1)} className={`p-2 rounded-lg hover:bg-slate-500/20 transition-colors ${isDark ? 'text-white' : 'text-slate-700'}`}>
                       <ChevronLeft size={20} />
                   </button>
                   
                   <div className="relative flex-1 sm:flex-none">
                       <input 
                           type="date" 
                           value={selectedDate}
                           onChange={(e) => setSelectedDate(e.target.value)}
                           className={`w-full sm:w-40 px-3 py-1.5 rounded-lg font-bold outline-none cursor-pointer text-center text-sm ${isDark ? 'bg-transparent text-white' : 'bg-transparent text-slate-800'}`}
                       />
                   </div>

                   <button onClick={() => handleDateChange(1)} className={`p-2 rounded-lg hover:bg-slate-500/20 transition-colors ${isDark ? 'text-white' : 'text-slate-700'}`}>
                       <ChevronRight size={20} />
                   </button>
               </div>

               {/* BOTONES DE RANGO (Scrollable en móvil) */}
               <div className={`flex p-1 rounded-xl w-full sm:w-auto overflow-x-auto ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                   {(['day', 'week', 'month'] as const).map(range => (
                       <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all whitespace-nowrap ${timeRange === range ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-400'}`}
                       >
                           {range === 'day' ? 'Día' : range === 'week' ? 'Semana' : 'Mes'}
                       </button>
                   ))}
               </div>
           </div>
        </div>

        {/* --- SECCIÓN 1: FLUJO DE EFECTIVO --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Entradas / Ventas */}
            <div className={cardClass}>
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-green-500"/> Ingresos por Ventas</h3>
                <div className="flex justify-between items-end mb-2">
                    <span className={`text-3xl md:text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>${financials.totalSales.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 mb-1">{financials.salesCount} tickets</span>
                </div>
                <div className="w-full bg-slate-700/20 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: '100%' }}></div>
                </div>
            </div>

            {/* Configuración de Caja */}
            <div className={cardClass}>
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><Wallet size={18} className="text-blue-500"/> Arqueo de Caja</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block font-bold">FONDO INICIAL</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-500">$</span>
                            <input type="number" value={openingCash} onChange={e => setOpeningCash(e.target.value)} className={`${mainInputClass} pl-6`} placeholder="0.00" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block font-bold">DINERO EN CAJA (Final)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-500">$</span>
                            <input type="number" value={closingCash} onChange={e => setClosingCash(e.target.value)} className={`${mainInputClass} pl-6`} placeholder="0.00" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Resultado del Corte */}
            <div className={`p-6 rounded-2xl border flex flex-col justify-between md:col-span-2 xl:col-span-1 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-1">Efectivo Esperado</h3>
                    <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>${financials.expectedCash.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-1">(Inicial + Ventas - Gastos)</p>
                </div>
                
                {closingCash && (
                    <div className={`mt-4 p-3 rounded-xl border flex items-center gap-3 ${financials.difference >= 0 ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                        {financials.difference < 0 && <AlertCircle size={20} />}
                        <div className="flex-1 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase">{financials.difference >= 0 ? 'Sobrante' : 'Faltante'}</span>
                            <span className="text-lg font-black">${Math.abs(financials.difference).toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* --- SECCIÓN 2: GASTOS Y UTILIDAD --- */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Gestión de Gastos */}
            <div className={cardClass}>
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><TrendingDown size={18} className="text-red-500"/> Registro de Gastos</h3>
                
                {/* Formulario Agregar Gasto (Responsive: Column en móvil) */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input 
                        type="text" 
                        placeholder="Descripción (ej. Comida, Luz)" 
                        className={`${expenseDescClass} flex-1 w-full`}
                        value={newExpenseDesc}
                        onChange={e => setNewExpenseDesc(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                    />
                    <div className="flex gap-2 w-full sm:w-auto">
                        <input 
                            type="number" 
                            placeholder="$" 
                            className={`${expenseDescClass} w-full sm:w-24 text-center`}
                            value={newExpenseAmount}
                            onChange={e => setNewExpenseAmount(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                        />
                        <button onClick={addExpense} className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg active:scale-95 flex-shrink-0"><Plus size={24}/></button>
                    </div>
                </div>

                {/* Lista de Gastos */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                    {expenses.length === 0 && (
                        <div className="text-center py-8 opacity-50">
                            <Wallet size={32} className="mx-auto mb-2 text-slate-500"/>
                            <p className="text-slate-500 text-xs italic">No hay gastos registrados en este corte.</p>
                        </div>
                    )}
                    {expenses.map(expense => (
                        <div key={expense.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${isDark ? 'border-slate-700 bg-slate-900/50 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{expense.description}</span>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-red-400 font-bold">-${expense.amount.toLocaleString()}</span>
                                <button onClick={() => removeExpense(expense.id)} className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Resumen de Ganancias Netas */}
            <div className={`relative overflow-hidden rounded-2xl p-6 md:p-8 flex flex-col justify-center items-center text-center shadow-2xl ${financials.netProfit >= 0 ? 'bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/30' : 'bg-gradient-to-br from-red-900 to-slate-900 border border-red-500/30'}`}>
                {/* Fondo decorativo */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-grid-pattern pointer-events-none"></div>
                
                <h3 className="text-slate-300 font-bold uppercase tracking-widest mb-2 relative z-10 text-xs">Utilidad Neta del Periodo</h3>
                <h2 className={`text-4xl md:text-6xl font-black mb-6 relative z-10 drop-shadow-lg ${financials.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${financials.netProfit.toLocaleString()}
                </h2>
                
                <div className="flex flex-col sm:flex-row w-full justify-center gap-4 sm:gap-12 text-sm relative z-10 mb-8">
                    <div className="text-center">
                        <p className="text-slate-400 text-xs uppercase font-bold mb-1">Total Ingresos</p>
                        <p className="text-green-400 font-black text-xl">+${financials.totalSales.toLocaleString()}</p>
                    </div>
                    <div className="w-full h-px sm:w-px sm:h-auto bg-slate-700"></div>
                    <div className="text-center">
                        <p className="text-slate-400 text-xs uppercase font-bold mb-1">Total Gastos</p>
                        <p className="text-red-400 font-black text-xl">-${financials.totalExpenses.toLocaleString()}</p>
                    </div>
                </div>

                <button 
                    onClick={handleSaveCut}
                    className="px-10 py-4 bg-white text-slate-900 font-bold rounded-full shadow-xl hover:scale-105 transition-transform flex items-center gap-3 relative z-10 active:scale-95"
                >
                    <Save size={20} /> GUARDAR CORTE
                </button>
            </div>
        </div>
    </div>
  );
}