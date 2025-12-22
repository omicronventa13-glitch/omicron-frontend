import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, Calendar, User, X, ChevronRight, Receipt, Printer, 
  Download, Package, AlertTriangle, Edit, Trash2, CheckCircle, 
  Wrench, Smartphone, Clock, ImageIcon, PenTool, Search, 
  Filter, FileSpreadsheet, CheckSquare, Square, QrCode, Ban, ChevronLeft 
} from 'lucide-react';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { TicketPDF } from './pos/TicketPDF';
import { RepairOrderPDF } from './repairs/RepairOrderPDF'; 
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api';
import type { Ticket, TicketItem, Product, RepairOrder } from '../../types';

// --- ESTILOS PDF (LISTA DE RESURTIDO) ---
const restockStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: { fontSize: 18, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', borderBottom: '1px solid #000', paddingBottom: 5, marginBottom: 5, fontWeight: 'bold' },
  row: { flexDirection: 'row', borderBottom: '1px dashed #eee', paddingVertical: 4 },
  col1: { width: '40%' }, 
  col2: { width: '25%' }, 
  col3: { width: '20%' }, 
  col4: { width: '15%', textAlign: 'center' } 
});

const RestockPDF = ({ products }: { products: Product[] }) => (
  <Document>
    <Page size="A4" style={restockStyles.page}>
      <Text style={restockStyles.header}>LISTA DE RESURTIDO - ÓMICRON</Text>
      <Text style={{ fontSize: 10, marginBottom: 20, textAlign: 'center', color: '#666' }}>
        Generado el: {new Date().toLocaleDateString()}
      </Text>
      <View style={restockStyles.tableHeader}>
        <Text style={restockStyles.col1}>ARTÍCULO / MODELO</Text>
        <Text style={restockStyles.col2}>TIPO</Text>
        <Text style={restockStyles.col3}>COLOR</Text>
        <Text style={restockStyles.col4}>STOCK</Text>
      </View>
      {products.map((p, i) => (
        <View key={i} style={restockStyles.row}>
          <Text style={restockStyles.col1}>{p.model} ({p.brand})</Text>
          <Text style={restockStyles.col2}>{p.type}</Text>
          <Text style={restockStyles.col3}>{p.color}</Text>
          <Text style={{ ...restockStyles.col4, color: p.stock === 0 ? 'red' : 'black' }}>
            {p.stock}
          </Text>
        </View>
      ))}
    </Page>
  </Document>
);

interface ReportsSectionProps {
  isDark: boolean;
  onNotify: (type: 'success' | 'error', msg: string) => void;
  onEditProduct: (product: Product) => void;
  refreshTrigger: number; 
}

const getDeviceDetails = (order: any) => {
  const device = order.device || {};
  return {
    brand: device.brand || order.brand || 'Genérico',
    model: device.model || order.model || 'S/M',
    color: device.color || order.color || 'Sin color'
  };
};

export default function ReportsSection({ isDark, onNotify, onEditProduct, refreshTrigger }: ReportsSectionProps) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'orders' | 'stock'>('tickets');
  
  // Datos
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [closedOrders, setClosedOrders] = useState<RepairOrder[]>([]);
  
  // Selección
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [selectedStockIds, setSelectedStockIds] = useState<Set<string>>(new Set());

  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'zero'>('all');

  // --- FILTROS DE TIEMPO PARA TICKETS ---
  const [ticketTimeRange, setTicketTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [ticketSelectedDate, setTicketSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (activeTab === 'tickets') loadTickets();
    if (activeTab === 'stock') loadStock();
    if (activeTab === 'orders') loadClosedOrders();
  }, [activeTab, refreshTrigger]);

  const loadTickets = async () => {
    try { const { data } = await api.get('/tickets'); setTickets(data); } catch (e) { console.error(e); }
  };
  const loadStock = async () => {
    try { const { data } = await api.get('/products'); setProducts(data); } catch (e) { console.error(e); }
  };
  const loadClosedOrders = async () => {
    try {
        const { data } = await api.get('/repairs');
        const delivered = data.filter((r: RepairOrder) => r.status === 'Entregado');
        setClosedOrders(delivered.reverse());
    } catch (e) { console.error(e); }
  };

  // Manejador de cambio de fecha (botones flecha)
  const handleDateChange = (days: number) => {
    const current = new Date(ticketSelectedDate);
    current.setDate(current.getDate() + days);
    setTicketSelectedDate(current.toISOString().split('T')[0]);
  };

  // --- FILTROS ---
  const filteredTickets = useMemo(() => {
      const lower = searchTerm.toLowerCase();

      // Lógica de filtrado por fecha
      const anchorDate = new Date(`${ticketSelectedDate}T00:00:00`);
      let startDate = new Date(anchorDate);
      let endDate = new Date(anchorDate);

      if (ticketTimeRange === 'day') {
          startDate.setHours(0,0,0,0);
          endDate.setHours(23,59,59,999);
      } else if (ticketTimeRange === 'week') {
          const day = anchorDate.getDay(); 
          const diff = anchorDate.getDate() - day; // Ajustar al domingo
          startDate = new Date(anchorDate.setDate(diff));
          startDate.setHours(0,0,0,0);
          
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23,59,59,999);
      } else if (ticketTimeRange === 'month') {
          startDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
          endDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59);
      }

      return tickets.filter(t => {
        const tDate = new Date(t.createdAt);
        // 1. Filtro Fecha
        if (tDate < startDate || tDate > endDate) return false;
        
        // 2. Filtro Buscador
        return (
            t.folio.toLowerCase().includes(lower) ||
            t.seller.toLowerCase().includes(lower) ||
            t.items.some(i => i.product.toLowerCase().includes(lower))
        );
      });
  }, [tickets, searchTerm, ticketTimeRange, ticketSelectedDate]);

  const filteredOrders = useMemo(() => {
      const lower = searchTerm.toLowerCase();
      return closedOrders.filter(o => {
        const dev = getDeviceDetails(o);
        return (
            o.clientName.toLowerCase().includes(lower) ||
            o.folio?.toLowerCase().includes(lower) ||
            dev.model.toLowerCase().includes(lower) ||
            o.service.toLowerCase().includes(lower) ||
            new Date(o.createdAt || '').toLocaleDateString().includes(searchTerm)
        );
      });
  }, [closedOrders, searchTerm]);

  const filteredStock = useMemo(() => {
      let filtered = products;
      if (stockFilter === 'low') {
          filtered = filtered.filter(p => p.stock > 0 && p.stock < 5);
      } else if (stockFilter === 'zero') {
          filtered = filtered.filter(p => p.stock === 0);
      }
      const lower = searchTerm.toLowerCase();
      if (lower) {
          filtered = filtered.filter(p => 
            p.model.toLowerCase().includes(lower) ||
            p.brand.toLowerCase().includes(lower) ||
            p.type.toLowerCase().includes(lower) ||
            p.qrCode?.toLowerCase() === lower
          );
      }
      return filtered;
  }, [products, searchTerm, stockFilter]);

  // --- ACCIONES ---

  // Cancelar Ticket
  const handleCancelTicket = async (ticketId: string) => {
    if (window.confirm('¿Desea CANCELAR esta venta? Se devolverán los artículos al stock.')) {
        try {
            await api.put(`/tickets/${ticketId}/cancel`);
            onNotify('success', 'Ticket cancelado y stock devuelto.');
            loadTickets(); // Recargar para ver cambio de estado
            loadStock(); // Actualizar stock localmente
        } catch (e) {
            onNotify('error', 'Error al cancelar ticket.');
        }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este artículo del inventario?')) {
        try {
            await api.delete(`/products/${id}`);
            onNotify('success', 'Artículo eliminado correctamente');
            loadStock();
        } catch (e) {
            onNotify('error', 'Error al eliminar artículo');
        }
    }
  };

  const toggleSelectProduct = (id: string) => {
      const newSet = new Set(selectedStockIds);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setSelectedStockIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedStockIds.size === filteredStock.length) setSelectedStockIds(new Set());
      else setSelectedStockIds(new Set(filteredStock.map(p => p._id)));
  };

  const handleExportPDF = async () => {
      const selected = products.filter(p => selectedStockIds.has(p._id));
      if (selected.length === 0) return onNotify('error', 'Selecciona al menos un artículo.');
      try {
        onNotify('success', 'Generando PDF de Resurtido...');
        const blob = await pdf(<RestockPDF products={selected} />).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `Resurtido_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`; link.click();
      } catch (e) { onNotify('error', 'Error PDF'); }
  };

  const handleExportExcel = () => {
      const selected = products.filter(p => selectedStockIds.has(p._id));
      if (selected.length === 0) return onNotify('error', 'Selecciona artículos.');
      const headers = ['Marca', 'Modelo', 'Tipo', 'Color', 'Precio', 'Stock Actual'];
      const rows = selected.map(p => [p.brand, p.model, p.type, p.color, p.price, p.stock]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "lista_resurtido.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link);
      onNotify('success', 'Archivo CSV descargado.');
  };

  const handleDownloadTicket = async (ticket: Ticket) => {
    try {
        const pdfData = { ...ticket, date: new Date(ticket.createdAt).toLocaleString(), items: ticket.items, paid: ticket.total, change: 0 };
        const blob = await pdf(<TicketPDF data={pdfData} />).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `Ticket_${ticket.folio}.pdf`; link.click();
    } catch (e) { onNotify('error', 'Error al generar PDF'); }
  };

  const handleDownloadOrderPDF = async (order: RepairOrder) => {
      try {
        onNotify('success', 'Generando PDF...');
        const blob = await pdf(<RepairOrderPDF order={order} />).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `Orden_${order.folio || order._id}.pdf`; link.click();
      } catch (e) { onNotify('error', 'Error al generar PDF'); }
  };

  // Scanner
  const stopScanner = async () => {
      if (scannerRef.current) { try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch(e){} scannerRef.current = null; }
      setIsScannerOpen(false);
  };
  useEffect(() => {
      if (isScannerOpen && !scannerRef.current) {
          setTimeout(() => {
              const scanner = new Html5Qrcode("report-qr-reader");
              scannerRef.current = scanner;
              scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
                  (decodedText) => { setSearchTerm(decodedText); onNotify('success', 'Código escaneado'); stopScanner(); }, () => {}
              ).catch(err => { onNotify('error', 'Error al abrir cámara'); setIsScannerOpen(false); });
          }, 100);
      }
      return () => { if(scannerRef.current && isScannerOpen) scannerRef.current.stop().catch(console.error); };
  }, [isScannerOpen]);

  // Estilos
  const tabClass = (tab: string) => `px-6 py-2 rounded-full font-bold transition-all ${activeTab === tab ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-700/10'}`;
  const cardClass = `p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${isDark ? 'bg-slate-800 border-slate-700 hover:border-cyan-500/50' : 'bg-white border-slate-200 hover:border-cyan-500/50 shadow-sm'}`;
  const inputClass = `w-full pl-10 pr-4 py-2 rounded-xl border outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-100 border-slate-300'}`;

  return (
    <div className="pb-20 h-full flex flex-col">
      {/* Modal Scanner */}
      {isScannerOpen && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 animate-in fade-in">
              <div className="relative w-full max-w-sm bg-black border-2 border-cyan-500 rounded-2xl overflow-hidden shadow-2xl">
                  <div id="report-qr-reader" className="w-full h-64 bg-black"></div>
                  <button onClick={stopScanner} className="w-full py-3 bg-red-600 text-white font-bold">Cancelar</button>
              </div>
          </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('tickets')} className={tabClass('tickets')}>Ventas (Tickets)</button>
        <button onClick={() => setActiveTab('orders')} className={tabClass('orders')}>Servicios Cerrados</button>
        <button onClick={() => setActiveTab('stock')} className={tabClass('stock')}>Stock</button>
      </div>

      {/* Barra Herramientas */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={20} />
              <input 
                  type="text" 
                  placeholder={activeTab === 'stock' ? "Buscar por nombre, modelo o QR..." : activeTab === 'tickets' ? "Buscar por folio, vendedor o producto..." : "Buscar por cliente, equipo o fecha..."} 
                  className={inputClass}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>

          {/* CALENDARIO PARA TICKETS */}
          {activeTab === 'tickets' && (
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                   <div className="flex items-center gap-1">
                       <button onClick={() => handleDateChange(-1)} className={`p-2 rounded-lg hover:bg-slate-500/10 ${isDark ? 'text-white' : 'text-slate-700'}`}><ChevronLeft size={18}/></button>
                       <input type="date" value={ticketSelectedDate} onChange={(e) => setTicketSelectedDate(e.target.value)} className={`px-3 py-1.5 rounded-lg font-bold text-sm outline-none cursor-pointer ${isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-100 border-slate-300'} border`} />
                       <button onClick={() => handleDateChange(1)} className={`p-2 rounded-lg hover:bg-slate-500/10 ${isDark ? 'text-white' : 'text-slate-700'}`}><ChevronRight size={18}/></button>
                   </div>
                   <div className={`flex p-1 rounded-lg ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'} border`}>
                       {(['day', 'week', 'month'] as const).map(range => (
                           <button key={range} onClick={() => setTicketTimeRange(range)} className={`px-3 py-1 rounded text-xs font-bold capitalize transition-all ${ticketTimeRange === range ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:text-slate-400'}`}>{range === 'day' ? 'Día' : range === 'week' ? 'Semana' : 'Mes'}</button>
                       ))}
                   </div>
              </div>
          )}
          
          {/* Botones Stock */}
          {activeTab === 'stock' && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                  <button onClick={() => setIsScannerOpen(true)} className={`p-2 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'}`}><QrCode size={20} className={isDark ? 'text-white' : 'text-slate-700'} /></button>
                  <div className={`flex items-center p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                      <button onClick={() => setStockFilter('all')} className={`px-3 py-1 rounded-lg text-xs font-bold ${stockFilter === 'all' ? 'bg-slate-600 text-white' : 'text-slate-500'}`}>Todos</button>
                      <button onClick={() => setStockFilter('low')} className={`px-3 py-1 rounded-lg text-xs font-bold ${stockFilter === 'low' ? 'bg-yellow-500 text-white' : 'text-slate-500'}`}>Bajos</button>
                      <button onClick={() => setStockFilter('zero')} className={`px-3 py-1 rounded-lg text-xs font-bold ${stockFilter === 'zero' ? 'bg-red-500 text-white' : 'text-slate-500'}`}>Agotados</button>
                  </div>
              </div>
          )}
      </div>

      {/* --- LISTA DE TICKETS (Modificada con Cancelación) --- */}
      {activeTab === 'tickets' && (
        <div className="grid gap-4">
            {filteredTickets.length === 0 && <p className="text-center text-slate-500 py-10">No hay ventas registradas en esta fecha.</p>}
            
            {filteredTickets.map(ticket => {
                // @ts-ignore
                const isCancelled = ticket.status === 'cancelled';
                return (
                    <div key={ticket._id} onClick={() => setSelectedTicket(ticket)} className={`${cardClass} ${isCancelled ? 'opacity-70 grayscale' : ''}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isCancelled ? 'bg-red-500/10 text-red-500' : 'bg-cyan-500/10 text-cyan-500'}`}>
                                    {isCancelled ? <Ban size={20}/> : <Receipt size={20}/>}
                                </div>
                                <div>
                                    <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} ${isCancelled ? 'line-through text-red-400' : ''}`}>Ticket #{ticket.folio}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-2">
                                        <Calendar size={12}/> {new Date(ticket.createdAt).toLocaleString()}
                                    </p>
                                    {isCancelled && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 rounded-sm mt-1 inline-block">CANCELADO</span>}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'} ${isCancelled ? 'text-red-400' : ''}`}>${ticket.total.toFixed(2)}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">{ticket.paymentMethod}</span>
                            </div>
                        </div>
                        {/* Botón CANCELAR en lugar de Imprimir/PDF */}
                        {!isCancelled && (
                             <div className="mt-3 pt-3 border-t border-dashed border-slate-600/30 flex justify-end">
                                 <button 
                                     onClick={(e) => { e.stopPropagation(); handleCancelTicket(ticket._id); }}
                                     className="px-4 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-red-500/20"
                                 >
                                     <Ban size={12} /> Cancelar Venta
                                 </button>
                             </div>
                        )}
                    </div>
                );
            })}
        </div>
      )}

      {/* --- LISTA DE SERVICIOS CERRADOS --- */}
      {activeTab === 'orders' && (
          <div className="grid gap-4">
              {closedOrders.map(order => {
                  const dev = getDeviceDetails(order);
                  return (
                    <div key={order._id} onClick={() => setSelectedOrder(order)} className={cardClass}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/10 text-green-500"><Wrench size={20}/></div>
                                <div>
                                    <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{dev.brand} {dev.model}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-2"><User size={12}/> {order.clientName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>${order.cost}</p>
                                <span className="text-[10px] text-green-500 font-bold">ENTREGADO</span>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-dashed border-slate-600/30 flex justify-between items-center text-xs text-slate-400">
                            <span className="truncate max-w-[200px]">{order.service}</span>
                            <span className="flex items-center gap-1 text-cyan-500 hover:underline">Ver histórico <ChevronRight size={12}/></span>
                        </div>
                    </div>
                  );
              })}
          </div>
      )}

      {/* --- STOCK --- */}
      {activeTab === 'stock' && (
          <div className="space-y-4">
             {selectedStockIds.size > 0 && (
                 <div className={`p-3 rounded-xl flex justify-between items-center ${isDark ? 'bg-cyan-900/30 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'} border`}>
                     <span className={`text-sm font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>{selectedStockIds.size} seleccionados</span>
                     <div className="flex gap-2">
                         <button onClick={handleExportPDF} className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"><FileText size={14}/> PDF</button>
                         <button onClick={handleExportExcel} className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"><FileSpreadsheet size={14}/> Excel</button>
                     </div>
                 </div>
             )}
             <div className="flex items-center px-4 pb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                 <div className="w-8"><button onClick={toggleSelectAll} className="hover:text-cyan-500">{selectedStockIds.size === filteredStock.length && filteredStock.length > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}</button></div>
                 <div className="flex-1">Producto</div>
                 <div className="w-24 text-center">Estado</div>
                 <div className="w-24 text-right">Acciones</div>
             </div>
             {filteredStock.map(p => {
                 const isSelected = selectedStockIds.has(p._id);
                 return (
                    <div key={p._id} className={`p-3 rounded-xl border flex items-center gap-4 transition-colors ${isSelected ? (isDark ? 'bg-cyan-900/10 border-cyan-500/50' : 'bg-cyan-50 border-cyan-300') : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}`}>
                        <div className="w-8 flex-shrink-0"><button onClick={() => toggleSelectProduct(p._id)} className={isSelected ? 'text-cyan-500' : 'text-slate-400 hover:text-slate-300'}>{isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}</button></div>
                        <div className="flex-1 min-w-0"><h4 className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.model}</h4><p className="text-xs text-slate-500">{p.brand} • {p.type}</p></div>
                        <div className="w-24 text-center flex-shrink-0">{p.stock === 0 ? <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-1 rounded font-bold">AGOTADO</span> : p.stock < 5 ? <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded font-bold">{p.stock} BAJO</span> : <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded font-bold">{p.stock}</span>}</div>
                        <div className="w-24 flex justify-end gap-1 flex-shrink-0">
                            <button onClick={() => onEditProduct(p)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded"><Edit size={16}/></button>
                            <button onClick={() => handleDeleteProduct(p._id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>
                 );
             })}
          </div>
      )}

      {/* --- MODAL DETALLE TICKET (INTACTO) --- */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
            <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="p-6 border-b border-slate-700/30 flex justify-between items-center bg-inherit z-10">
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Detalle de Venta</h3>
                    <button onClick={() => setSelectedTicket(null)}><X size={20} className="text-slate-400 hover:text-red-400"/></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="text-center mb-6">
                        <p className="text-cyan-500 font-mono text-lg font-bold">{selectedTicket.folio}</p>
                        <p className="text-slate-500 text-xs">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                        {/* @ts-ignore */}
                        {selectedTicket.status === 'cancelled' && <p className="text-red-500 font-black mt-2 text-lg border-2 border-red-500 inline-block px-3 py-1 rounded -rotate-6">CANCELADO</p>}
                    </div>

                    <div className="space-y-4 mb-6">
                        {selectedTicket.items.map((item: TicketItem, i: number) => (
                            <div key={i} className="flex justify-between text-sm border-b border-dashed border-slate-700/30 pb-2 last:border-0">
                                <div><p className={isDark ? 'text-white' : 'text-slate-900'}>{item.product}</p><p className="text-xs text-slate-500">{item.qty} x ${item.price}</p></div>
                                <p className="font-mono font-bold text-slate-400">${item.total.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                    
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'} space-y-2`}>
                        <div className="flex justify-between text-sm text-slate-500"><span>Método Pago</span><span className={isDark ? 'text-white' : 'text-slate-900'}>{selectedTicket.paymentMethod}</span></div>
                        <div className="flex justify-between text-sm text-slate-500"><span>Vendedor</span><span className={isDark ? 'text-white' : 'text-slate-900'}>{selectedTicket.seller}</span></div>
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-600/30"><span className="font-bold text-slate-400">Total Pagado</span><span className="text-2xl font-black text-cyan-500">${selectedTicket.total.toFixed(2)}</span></div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mt-6">
                        <button onClick={() => console.log("Imprimiendo...")} className={`py-3 rounded-xl font-bold border flex flex-col items-center justify-center gap-1 text-xs ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Printer size={18} /> Imprimir</button>
                        <button onClick={() => handleDownloadTicket(selectedTicket)} className="py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg flex flex-col items-center justify-center gap-1 text-xs transition-colors"><Download size={18} /> PDF</button>
                        <button onClick={() => setSelectedTicket(null)} className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-xs ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}><X size={18} /> Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL ORDEN CERRADA --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
            <div className={`w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="p-6 border-b border-slate-700/30 flex justify-between items-center bg-inherit z-10">
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Histórico de Servicio</h3>
                    <button onClick={() => setSelectedOrder(null)}><X size={20} className="text-slate-400 hover:text-red-400"/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Datos del Cliente</h4>
                            <p className={`text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedOrder.clientName}</p>
                            <p className="text-sm text-slate-400">{selectedOrder.phone}</p>
                            <p className="text-xs text-slate-500 mt-2">{selectedOrder.folio}</p>
                        </div>
                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Equipo y Servicio</h4>
                            <p className={`text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{getDeviceDetails(selectedOrder).brand} {getDeviceDetails(selectedOrder).model}</p>
                            <p className="text-sm text-slate-400">{getDeviceDetails(selectedOrder).color}</p>
                            <p className="text-sm mt-2 font-medium text-cyan-500">{selectedOrder.service}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Clock size={12}/> Notas de Entrega</p>
                        <div className={`p-3 rounded-lg text-sm italic ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {selectedOrder.comments ? (selectedOrder.comments.includes('[CIERRE]:') ? selectedOrder.comments.split('[CIERRE]:')[1] : selectedOrder.comments) : "Sin comentarios."}
                        </div>
                    </div>
                    {/* ... (Resto de evidencias y firma igual) ... */}
                    <div className="p-4 border-t border-slate-700/30 flex justify-end items-center gap-4">
                        <div><span className="text-slate-500 text-xs block text-right">Total Cobrado</span><span className="text-2xl font-black text-green-500">${selectedOrder.cost}</span></div>
                        <button onClick={() => handleDownloadOrderPDF(selectedOrder)} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg"><FileText size={18} /> Re-imprimir PDF</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}