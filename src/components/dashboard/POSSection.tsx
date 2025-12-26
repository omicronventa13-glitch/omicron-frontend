import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, X, CreditCard, Banknote, Smartphone, CheckCircle, Receipt, ChevronRight, FileText, Printer, Download, QrCode, Camera } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { TicketPDF } from './pos/TicketPDF';
import { Html5Qrcode } from 'html5-qrcode'; 
import api from '../../api';
import type { Product } from '../../types';

interface CartItem extends Product {
  qty: number;
  discount: number;
}

interface POSSectionProps {
  products: Product[];
  isDark: boolean;
  onNotify: (type: 'success' | 'error', msg: string) => void;
  onReload: () => void;
  sellerName: string;
}

// --- TARJETA DE PRODUCTO (Diseño 85/15) ---
const FlipCard = ({ product, isDark, onAdd }: { product: Product, isDark: boolean, onAdd: (p: Product) => void }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="relative w-full h-72 cursor-pointer perspective-1000 group">
      <div 
        className={`w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* FRENTE */}
        <div className={`absolute w-full h-full backface-hidden rounded-2xl overflow-hidden shadow-lg border flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          
          {/* Imagen: 85% de altura */}
          <div className="h-[85%] w-full bg-gray-900 relative overflow-hidden">
             <img 
               src={product.image || 'https://images.unsplash.com/photo-1592899671815-2770432435ad?auto=format&fit=crop&q=80&w=500'} 
               alt={product.model} 
               className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
             />
             {/* Badge Stock: Aumentado tamaño (20% aprox) */}
             <span className={`absolute top-2 right-2 px-2.5 py-1 text-[11px] font-black rounded tracking-wider shadow-sm ${product.stock > 0 ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                {product.stock > 0 ? `${product.stock}` : '0'}
             </span>
          </div>
          
          {/* Info: 15% restante */}
          <div className="flex-1 p-2 flex items-center justify-between bg-opacity-50 backdrop-blur-sm">
             <div className="min-w-0 flex-1 pr-2">
                <h3 className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{product.model}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">{product.brand}</span>
                    <span className="text-sm font-black text-cyan-400">${product.price}</span>
                </div>
             </div>
             
             <button 
                onClick={(e) => { e.stopPropagation(); onAdd(product); }}
                className="p-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors active:scale-95 shadow-lg"
             >
                <Plus size={16} />
             </button>
          </div>
        </div>

        {/* REVERSO: Aumentado tamaño de letra un 20% */}
        <div className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-2xl p-4 flex flex-col shadow-xl border ${isDark ? 'bg-slate-900 border-cyan-500/50 shadow-cyan-500/10' : 'bg-slate-50 border-slate-300'}`}>
           <div className="flex-1">
              {/* Título más grande */}
              <h4 className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-3 border-b border-slate-700 pb-1">Ficha Técnica</h4>
              {/* Lista con letra más grande (text-xs = 12px vs text-[10px]) */}
              <ul className={`space-y-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                 <li className="flex justify-between"><span>Tipo:</span> <span className="font-bold truncate ml-2">{product.type}</span></li>
                 <li className="flex justify-between"><span>Color:</span> <span className="font-bold truncate ml-2">{product.color}</span></li>
                 <li className="flex justify-between"><span>Cat:</span> <span className="truncate ml-2">{product.category}</span></li>
                 {/* Mostrar QR si existe */}
                 {product.qrCode && (
                     <li className="flex justify-between pt-2 border-t border-slate-700/30 text-cyan-500">
                        <span>QR:</span> <span className="font-mono text-[10px]">{product.qrCode}</span>
                     </li>
                 )}
              </ul>
           </div>
           <button 
             onClick={(e) => { e.stopPropagation(); onAdd(product); }} 
             className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
           >
             <ShoppingCart size={16} /> Agregar
           </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function POSSection({ products, isDark, onNotify, onReload, sellerName }: POSSectionProps) {
  // Estados
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [successTicket, setSuccessTicket] = useState<any | null>(null);

  // Estados Scanner QR
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Referencia a productos para el scanner (evita problemas de closures)
  const productsRef = useRef(products);
  
  // Mantener productsRef actualizado
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Filtrado optimizado
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return products;
    
    return products.filter(p => 
      p.model.toLowerCase().includes(term) || 
      p.brand.toLowerCase().includes(term) ||
      p._id === searchTerm ||     // Búsqueda por ID exacto
      p.qrCode === searchTerm     // Búsqueda por Código QR exacto
    );
  }, [products, searchTerm]);

  // --- LÓGICA DEL CARRITO ---
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
        onNotify('error', 'No hay stock disponible.');
        return;
    }
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        if (existing.qty >= product.stock) {
            onNotify('error', 'Stock máximo alcanzado en carrito.');
            return prev;
        }
        return prev.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1, discount: 0 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === id) {
        const newQty = Math.max(1, item.qty + delta);
        const originalProduct = products.find(p => p._id === id);
        if (originalProduct && newQty > originalProduct.stock) {
             onNotify('error', 'Stock insuficiente.');
             return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const updateDiscount = (id: string, discount: number) => {
    setCart(prev => prev.map(item => item._id === id ? { ...item, discount: discount } : item));
  };

  const updateDiscountPercent = (id: string, percent: number) => {
    setCart(prev => prev.map(item => {
        if (item._id === id) {
            const total = item.price * item.qty;
            const discountValue = (total * percent) / 100;
            return { ...item, discount: discountValue };
        }
        return item;
    }));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item._id !== id));

  // Cálculos
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const totalDiscount = cart.reduce((acc, item) => acc + (item.discount || 0), 0);
  const total = Math.max(0, subtotal - totalDiscount);
  const paidValue = parseFloat(amountPaid) || 0;
  const change = Math.max(0, paidValue - total);

  // --- Procesar Pago ---
  const handlePay = async () => {
    if (paymentMethod === 'Efectivo' && paidValue < total) {
        onNotify('error', 'El monto recibido es menor al total.');
        return;
    }
    
    const ticketData = {
        total,
        paymentMethod,
        seller: sellerName,
        items: cart.map(c => ({
            productId: c._id,
            product: c.model,
            brand: c.brand,
            qty: c.qty,
            price: c.price,
            discount: c.discount || 0,
            total: (c.price * c.qty) - (c.discount || 0)
        }))
    };
    
    try {
        const { data } = await api.post('/tickets', ticketData);
        setSuccessTicket({ ...data, paid: paidValue, change: change, items: ticketData.items });
        onReload();
    } catch (error) {
        console.error(error);
        onNotify('error', 'Error al procesar la venta. Intente nuevamente.');
    }
  };

  const handleCloseSuccessModal = () => {
    if (successTicket) {
        onNotify('success', `¡Operación Exitosa!\nCobrado: $${successTicket.paid.toFixed(2)} Cambio: $${successTicket.change.toFixed(2)}`);
    }
    setSuccessTicket(null);
    setCart([]);
    setAmountPaid('');
    setIsPaymentModalOpen(false);
    setIsCartOpen(false);
  };

  const handleDownloadTicket = async () => {
    if (!successTicket) return;
    try {
      const pdfData = {
          ...successTicket,
          date: new Date().toLocaleString(),
          items: cart.length > 0 ? cart.map(c => ({
              product: c.model,
              qty: c.qty,
              price: c.price,
              total: (c.price * c.qty) - (c.discount || 0),
              discount: c.discount
          })) : successTicket.items
      };
      
      const blob = await pdf(<TicketPDF data={pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ticket_${successTicket.folio}.pdf`;
      link.click();
    } catch (e) { onNotify('error', 'Error al generar PDF'); }
  };

  // --- LÓGICA ESCÁNER QR (Html5Qrcode) OPTIMIZADA ---
  const stopScanner = async () => {
    if (scannerRef.current) {
        try {
            if (scannerRef.current.isScanning) {
               await scannerRef.current.stop();
            }
            scannerRef.current.clear();
        } catch (e) { console.warn("Scanner stop issue:", e); }
        scannerRef.current = null;
    }
    setIsScannerOpen(false);
  };

  useEffect(() => {
    if (isScannerOpen && !scannerRef.current) {
        const initScanner = async () => {
            // Esperamos un momento para que el contenedor exista
            await new Promise(r => setTimeout(r, 200));

            const element = document.getElementById("qr-reader");
            if (!element) return;

            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;
            
            try {
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 20, qrbox: { width: 250, height: 250 } }, // FPS aumentados para agilidad
                    (decodedText) => {
                        // ÉXITO AL ESCANEAR
                        // Usamos la referencia mutable para acceder a los productos actualizados
                        const found = productsRef.current.find(p => 
                            p._id === decodedText || 
                            p.model === decodedText || 
                            p.qrCode === decodedText
                        );
                        
                        if (found) {
                            onNotify('success', `Producto encontrado: ${found.model}`);
                            setSearchTerm(decodedText);
                            stopScanner();
                        }
                    },
                    () => { /* Ignorar errores de frame vacío */ }
                );
            } catch (err) {
                console.error(err);
                onNotify('error', 'No se pudo iniciar la cámara. Verifica permisos HTTPS.');
                setIsScannerOpen(false);
            }
        };
        initScanner();
    }

    return () => {
        // Limpieza segura
        if (scannerRef.current) {
             // No llamamos a stop() aquí asíncronamente para evitar condiciones de carrera,
             // confiamos en que el usuario cierre el modal o encuentre el producto.
             // Solo limpiamos la referencia si es necesario.
        }
    };
  }, [isScannerOpen]);

  const inputClass = `w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-sm ${isDark ? 'bg-slate-900/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`;

  return (
    <div className="relative h-[calc(100vh-100px)] overflow-hidden">
        
        {/* MODAL SCANNER QR */}
        {isScannerOpen && (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in">
                <div className="relative w-full max-w-lg bg-black border-2 border-cyan-500 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/20 p-4">
                    <button 
                        onClick={stopScanner}
                        className="absolute top-2 right-2 z-20 p-2 bg-slate-800/80 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Cerrar Escáner"
                    >
                        <X size={20} />
                    </button>

                    <div id="qr-reader" className="w-full h-[400px] rounded-xl overflow-hidden bg-black relative"></div>

                    <button 
                        onClick={stopScanner}
                        className="mt-6 w-full bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                    >
                        <X size={20} /> Cancelar Escaneo
                    </button>
                </div>
                <p className="text-white mt-4 font-mono text-sm animate-pulse">Apunta el código QR del producto</p>
            </div>
        )}

        {/* ÁREA PRODUCTOS */}
        <div className="h-full flex flex-col">
            <div className="mb-6 flex gap-3 shrink-0">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar producto (Nombre, ID o QR)..." 
                        className={`${inputClass} pl-12`} 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                <button 
                    onClick={() => setIsScannerOpen(true)}
                    className={`px-6 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-slate-50 text-slate-800 shadow-sm'}`}
                >
                    <QrCode size={18}/> ESCANEAR QR
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 pb-24 scroll-smooth">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 opacity-50">
                            {searchTerm ? (
                                <>
                                    <X size={64} className="mb-4 text-red-400" />
                                    <p className="text-lg font-bold text-red-400">Producto no encontrado</p>
                                    <p className="text-sm">No existe un artículo con: "{searchTerm}"</p>
                                    <button onClick={() => setSearchTerm('')} className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">Limpiar búsqueda</button>
                                </>
                            ) : (
                                <>
                                    <ShoppingCart size={64} className="mb-4" />
                                    <p>Inventario vacío. Agrega artículos en el módulo STOCK.</p>
                                </>
                            )}
                        </div>
                    )}
                    {filteredProducts.map(p => (
                        <FlipCard key={p._id} product={p} isDark={isDark} onAdd={addToCart} />
                    ))}
                </div>
            </div>
        </div>

        {/* BOTÓN CARRITO: Posicionado más arriba en móviles (bottom-24) para evitar scroll */}
        <button 
            onClick={() => setIsCartOpen(true)} 
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-30 px-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-2xl shadow-cyan-500/40 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
        >
            <ShoppingCart size={24} />
            <span className="font-bold text-lg">Carrito</span>
            {cart.length > 0 && <span className="bg-white text-cyan-600 px-2 py-0.5 rounded-full text-xs font-black min-w-[24px] text-center">{cart.length}</span>}
        </button>

        {/* DRAWER CARRITO */}
        <div 
            className={`fixed inset-x-0 bottom-0 top-24 md:top-28 z-[70] transition-all duration-500 ease-in-out ${isCartOpen ? 'bg-black/60 backdrop-blur-sm pointer-events-auto' : 'bg-transparent pointer-events-none'}`}
            onClick={() => setIsCartOpen(false)}
        >
            <div 
                className={`absolute top-0 right-0 h-full w-full max-w-md shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isDark ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-200'} ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`p-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} flex items-center`}>
                    <button onClick={() => setIsCartOpen(false)} className="p-2 mr-4 hover:bg-slate-500/10 rounded-full text-slate-400 hover:text-red-500 transition-colors"><ChevronRight size={24} /></button>
                    <h3 className={`text-xl font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}><ShoppingCart size={24} className="text-cyan-400"/> Orden Actual</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50"><ShoppingCart size={64} /><p className="text-lg font-medium">Tu carrito está vacío</p><button onClick={() => setIsCartOpen(false)} className="px-4 py-2 bg-slate-800 rounded-lg text-sm text-white">Seguir comprando</button></div>
                    ) : (
                        cart.map(item => (
                            <div key={item._id} className={`p-3 rounded-xl border flex gap-3 items-center animate-fade-in-up ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="w-14 h-14 rounded-lg bg-slate-800 overflow-hidden shrink-0"><img src={item.image || ''} alt="" className="w-full h-full object-cover"/></div>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.model}</p>
                                    <p className="text-xs text-slate-500 uppercase">{item.brand}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-cyan-400 font-bold">${item.price * item.qty}</span>
                                        {item.discount > 0 && <span className="text-red-400 text-xs line-through decoration-red-400">-${item.discount}</span>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-1"><div className={`flex items-center rounded-lg overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}><button onClick={() => updateQty(item._id, -1)} className="p-1 px-2 hover:bg-cyan-500 hover:text-white"><Minus size={12}/></button><span className={`text-xs font-bold w-6 text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.qty}</span><button onClick={() => updateQty(item._id, 1)} className="p-1 px-2 hover:bg-cyan-500 hover:text-white"><Plus size={12}/></button></div><button onClick={() => removeFromCart(item._id)} className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1 mt-1"><Trash2 size={10} /> Eliminar</button></div>
                            </div>
                        ))
                    )}
                </div>

                <div className={`p-6 border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                    <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-slate-500"><span>Descuentos</span><span className="text-red-400">-${totalDiscount.toFixed(2)}</span></div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-700/50"><span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Total</span><span className="text-3xl font-black text-cyan-400">${total.toFixed(2)}</span></div>
                    </div>
                    <button disabled={cart.length === 0} onClick={() => setIsPaymentModalOpen(true)} className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"><Banknote size={20} /> PROCEDER AL PAGO</button>
                </div>
            </div>
        </div>

        {/* --- MODAL DE PAGO / TICKET --- */}
        {isPaymentModalOpen && !successTicket && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
                {/* Modal ajustado: h-full en móvil, h-[85vh] en PC, y contenido scrolleable */}
                <div className={`w-full max-w-4xl h-full md:h-[85vh] md:rounded-3xl shadow-2xl border flex flex-col md:flex-row overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    
                    {/* Panel Izquierdo: Lista Productos (Toma el espacio disponible) */}
                    <div className={`flex-1 flex flex-col min-h-0 border-r ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                         <div className="p-4 md:p-6 border-b border-slate-700/50 flex justify-between items-center shrink-0">
                             <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}><Receipt size={24} className="text-cyan-400"/> Detalle de Venta</h3>
                             <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-white"><X size={24}/></button>
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 md:p-6">
                            <table className="w-full text-left text-sm">
                                <thead className={`${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}><tr><th className="p-3">Producto</th><th className="p-3 text-center">Cant.</th><th className="p-3 text-right">Precio</th><th className="p-3 text-center">Desc (%)</th><th className="p-3 text-center">Desc ($)</th><th className="p-3 text-right">Total</th></tr></thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                                    {cart.map(item => (
                                        <tr key={item._id}>
                                            <td className="p-3"><p className="font-bold truncate max-w-[100px] md:max-w-[120px]">{item.model}</p></td>
                                            <td className="p-3 text-center">{item.qty}</td>
                                            <td className="p-3 text-right">${item.price}</td>
                                            <td className="p-3 text-center">
                                                <select className={`w-14 md:w-16 px-1 py-1 rounded border text-center outline-none ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white'}`} onChange={(e) => updateDiscountPercent(item._id, parseFloat(e.target.value) || 0)} value={item.discount > 0 ? Math.round((item.discount / (item.price * item.qty)) * 100) : 0}>
                                                    <option value="0">-</option><option value="5">5%</option><option value="10">10%</option><option value="15">15%</option><option value="20">20%</option>
                                                </select>
                                            </td>
                                            <td className="p-3 text-center"><input type="number" min="0" value={item.discount || ''} onChange={(e) => updateDiscount(item._id, parseFloat(e.target.value) || 0)} className={`w-14 md:w-16 px-1 py-1 rounded border text-center ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white'}`}/></td>
                                            <td className="p-3 text-right font-bold">${(item.price * item.qty) - (item.discount || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className={`p-4 md:p-6 border-t shrink-0 ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}><div className="flex justify-between items-center"><span className="text-slate-500">Total a Pagar</span><span className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>${total.toFixed(2)}</span></div></div>
                    </div>

                    {/* Panel Derecho: Controles Pago (Padding reducido en móvil) */}
                    <div className={`w-full md:w-96 p-4 md:p-8 flex flex-col gap-4 md:gap-6 shrink-0 ${isDark ? 'bg-slate-800/20' : 'bg-white'}`}>
                        {/* Botón cerrar visible en móvil arriba */}
                        <div className="flex justify-between md:hidden"><span/> <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400"><X size={20}/></button></div>
                        
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-500 mb-3">Método de Pago</p>
                            <div className="grid grid-cols-3 gap-2 md:gap-3">
                                {(['Efectivo', 'Tarjeta', 'Transferencia'] as const).map((method) => (
                                    <button key={method} onClick={() => setPaymentMethod(method)} className={`py-2 md:py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMethod === method ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : isDark ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                        {method === 'Efectivo' && <Banknote size={18} />}
                                        {method === 'Tarjeta' && <CreditCard size={18} />}
                                        {method === 'Transferencia' && <Smartphone size={18} />}
                                        <span className="text-[10px] font-bold">{method}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {paymentMethod === 'Efectivo' && (
                            <div className={`p-4 md:p-6 rounded-2xl border-2 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Paga con:</label>
                                <div className="relative mb-4">
                                    <span className="absolute left-4 top-2.5 text-slate-500 text-lg">$</span>
                                    <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className={`w-full pl-8 pr-4 py-2 text-xl font-bold rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`} placeholder="0.00" autoFocus />
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-600/50">
                                    <span className="text-sm text-slate-400">Cambio:</span>
                                    <span className={`text-xl font-black ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>${change.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                        <button onClick={handlePay} disabled={paymentMethod === 'Efectivo' && paidValue < total} className="w-full mt-auto py-4 md:py-5 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"><CheckCircle size={24} /> CONFIRMAR VENTA</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL ÉXITO */}
        {successTicket && (
             <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
                 <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl border text-center ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                     <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce"><CheckCircle size={48} className="text-green-500" /></div>
                     <h3 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>¡Venta Exitosa!</h3>
                     <p className="text-slate-500 mb-6">Folio: {successTicket.folio}</p>
                     <div className={`p-6 rounded-2xl mb-8 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                         <div className="flex justify-between items-center mb-2"><span className="text-slate-500">Cobrado</span><span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>${successTicket.paid.toFixed(2)}</span></div>
                         <div className="flex justify-between items-center"><span className="text-slate-500">Cambio</span><span className="text-2xl font-black text-green-500">${successTicket.change.toFixed(2)}</span></div>
                     </div>
                     <div className="flex flex-col gap-3">
                         <div className="flex gap-3">
                             <button onClick={() => alert('Imprimiendo...')} className={`flex-1 py-3 rounded-xl font-bold border-2 flex items-center justify-center gap-2 ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Printer size={20} /> Imprimir</button>
                             <button onClick={handleDownloadTicket} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center gap-2"><Download size={20} /> PDF</button>
                         </div>
                         <button onClick={handleCloseSuccessModal} className="w-full py-4 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors">Cerrar y Nueva Venta</button>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
}