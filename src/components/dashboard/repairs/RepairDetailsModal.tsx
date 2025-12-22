import React, { useState, useEffect } from 'react';
import { X, Clock, FileText, CheckCircle, ImageIcon, PenTool, Smartphone, Maximize2, AlertCircle } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { RepairOrderPDF } from './RepairOrderPDF';
import type { RepairOrder } from '../../../types';

// Helper robusto para obtener datos del dispositivo
const getDeviceDetails = (order: any) => {
  const device = order.device || {};
  const brand = device.brand || order.brand || 'Genérico';
  const model = device.model || order.model || 'S/M';
  const color = device.color || order.color || 'Sin color';

  return { brand, model, color };
};

interface RepairDetailsModalProps {
  repair: RepairOrder;
  onClose: () => void;
  onCloseOrder: (r: RepairOrder) => void;
  isDark: boolean;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

export default function RepairDetailsModal({ repair, onClose, onCloseOrder, isDark, onNotify }: RepairDetailsModalProps) {
  const device = getDeviceDetails(repair);
  
  // Estado para el visor de imágenes a pantalla completa (Lightbox)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Debug para ver qué llega realmente desde el backend
  useEffect(() => {
    console.log("--- DATOS DE ORDEN EN MODAL ---");
    console.log("Orden ID:", repair._id);
    console.log("Evidence Photos:", repair.evidencePhotos);
    console.log("Client Signature:", repair.clientSignature);
  }, [repair]);

  const handleDownloadPDF = async () => {
    try {
      onNotify('success', 'Generando PDF...');
      const blob = await pdf(<RepairOrderPDF order={repair} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Orden_${repair.folio || repair._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) { onNotify('error', 'Error al generar PDF'); }
  };

  // Estilos dinámicos según el tema
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = 'text-slate-400';
  const labelClass = "text-xs text-slate-500 uppercase font-bold tracking-wider";
  const boxClass = `p-4 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`;

  // Filtrar fotos válidas y asegurar que sea un array
  const validPhotos = (Array.isArray(repair.evidencePhotos) ? repair.evidencePhotos : [])
    .filter(url => url && typeof url === 'string' && url.trim() !== '');

  // Verificar si hay firma válida
  const hasSignature = repair.clientSignature && typeof repair.clientSignature === 'string' && repair.clientSignature.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
       <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border flex flex-col relative ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          
          {/* Header */}
          <div className="p-6 border-b border-slate-700/30 flex justify-between items-center sticky top-0 bg-inherit z-10 backdrop-blur-md">
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                    <FileText size={24} />
                </div>
                <div>
                    <h3 className={`text-xl font-black ${textPrimary}`}>Detalles de Orden</h3>
                    <p className="text-cyan-500 text-sm font-mono font-bold">{repair.folio || repair._id.slice(-6).toUpperCase()}</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-red-400 transition-colors"><X size={24} /></button>
          </div>

          <div className="p-6 space-y-6 flex-1">
             {/* Info General Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna Cliente */}
                <div className={boxClass}>
                    <h4 className={`${labelClass} mb-4 flex items-center gap-2 border-b border-slate-700/30 pb-2`}>
                        Información del Cliente
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <p className={labelClass}>Nombre Completo</p>
                            <p className={`text-lg font-medium ${textPrimary}`}>{repair.clientName}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Contacto</p>
                            <p className={`text-base ${textPrimary}`}>{repair.phone}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Fecha Recepción</p>
                            <div className={`text-base ${textPrimary} flex items-center gap-2`}>
                                <Clock size={14} className="text-cyan-500"/> 
                                {repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Equipo */}
                <div className={boxClass}>
                    <h4 className={`${labelClass} mb-4 flex items-center gap-2 border-b border-slate-700/30 pb-2`}>
                        <Smartphone size={14}/> Datos del Equipo
                    </h4>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p className={labelClass}>Marca</p>
                                <p className={`text-lg font-medium ${textPrimary}`}>{device.brand}</p>
                            </div>
                            <div>
                                <p className={labelClass}>Modelo</p>
                                <p className={`text-lg font-medium ${textPrimary}`}>{device.model}</p>
                            </div>
                        </div>
                        <div>
                            <p className={labelClass}>Color / Detalles</p>
                            <p className={`text-base ${textSecondary} capitalize`}>{device.color}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Fecha Entrega Estimada</p>
                            <p className={`text-base font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                {repair.deliveryDate ? new Date(repair.deliveryDate).toLocaleDateString() : 'Por definir'}
                            </p>
                        </div>
                    </div>
                </div>
             </div>

             {/* Servicio y Observaciones */}
             <div className={boxClass}>
                <p className={labelClass}>Servicio Solicitado</p>
                <p className={`text-xl font-medium ${textPrimary} mb-3`}>{repair.service}</p>
                
                <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                    <p className="text-xs font-bold text-slate-500 mb-1">OBSERVACIONES TÉCNICAS:</p>
                    <p className={`text-sm italic ${textSecondary}`}>"{repair.comments || 'Sin observaciones adicionales'}"</p>
                </div>
             </div>

             {/* Desglose Financiero */}
             <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-2xl text-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <p className={labelClass}>Costo Total</p>
                    <p className={`text-xl font-black ${textPrimary}`}>${repair.cost}</p>
                </div>
                <div className={`p-4 rounded-2xl text-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <p className={labelClass}>Anticipo</p>
                    <p className={`text-xl font-black ${textPrimary}`}>${repair.downPayment}</p>
                </div>
                <div className={`p-4 rounded-2xl text-center border-2 ${isDark ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                    <p className={`text-xs font-bold uppercase ${isDark ? 'text-green-400' : 'text-green-600'}`}>Resta</p>
                    <p className={`text-2xl font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>${repair.cost - repair.downPayment}</p>
                </div>
             </div>

             {/* Evidencias y Firma */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 {/* Evidencias Fotográficas con Lightbox */}
                 <div className={boxClass}>
                    <p className={`${labelClass} mb-3 flex items-center gap-2`}><ImageIcon size={14}/> Evidencias Fotográficas</p>
                    
                    {validPhotos.length > 0 ? (
                        <>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent">
                            {validPhotos.map((url, idx) => (
                                <div key={idx} className="relative group cursor-pointer flex-shrink-0" onClick={() => setPreviewImage(url)}>
                                    <img 
                                        src={url} 
                                        alt={`Evidencia ${idx}`} 
                                        className="h-24 w-24 rounded-lg border border-slate-600 object-cover shadow-md group-hover:brightness-75 transition-all bg-slate-800" 
                                        onError={(e) => {
                                            // Fallback visual si la imagen no carga
                                            e.currentTarget.onerror = null; 
                                            e.currentTarget.src = 'https://via.placeholder.com/100x100/333/FFF?text=Error+Carga';
                                        }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                                        <Maximize2 className="text-white drop-shadow-lg" size={20} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Clic en la imagen para ampliar.</p>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
                            <AlertCircle size={20} className="mb-1 opacity-50"/>
                            <p className="text-xs">No se encontraron fotos registradas</p>
                        </div>
                    )}
                 </div>
                 
                 {/* Firma del Cliente */}
                 <div className={boxClass}>
                    <p className={`${labelClass} mb-3 flex items-center gap-2`}><PenTool size={14}/> Firma de Conformidad</p>
                    
                    {hasSignature ? (
                        // Aseguramos fondo blanco para que se note la tinta negra de la firma
                        <div 
                            className="bg-white p-3 rounded-xl border border-slate-300 flex justify-center items-center h-28 shadow-inner cursor-pointer hover:opacity-90 transition-opacity" 
                            onClick={() => setPreviewImage(repair.clientSignature!)}
                        >
                            <img 
                                src={repair.clientSignature} 
                                alt="Firma Cliente" 
                                className="max-h-full max-w-full object-contain" 
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x100/FFF/000?text=Error+Firma'; }}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
                            <PenTool size={20} className="mb-1 opacity-50"/>
                            <p className="text-xs">Sin firma digital registrada</p>
                        </div>
                    )}
                 </div>
             </div>
          </div>

          {/* Footer Actions */}
          <div className={`p-6 border-t ${isDark ? 'border-slate-700/30 bg-slate-800/40' : 'border-slate-200 bg-slate-50'} flex flex-col-reverse md:flex-row justify-end gap-4`}>
             <button 
                onClick={handleDownloadPDF} 
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 active:scale-95 transition-all"
             >
                <FileText size={18} /> Generar PDF
             </button>
             <button 
                onClick={() => onCloseOrder(repair)} 
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 active:scale-95 transition-all"
             >
                <CheckCircle size={18} /> Entregar / Cerrar Orden
             </button>
          </div>

          {/* --- LIGHTBOX (VISTA PREVIA PANTALLA COMPLETA) --- */}
          {previewImage && (
            <div 
                className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out" 
                onClick={() => setPreviewImage(null)} // Cerrar al hacer clic fuera
            >
                {/* Botón de cerrar explícito */}
                <button className="absolute top-4 right-4 p-3 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors z-50">
                    <X size={32} />
                </button>
                {/* Imagen en grande */}
                <img 
                    src={previewImage} 
                    alt="Vista previa pantalla completa" 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-zoom-in" 
                    onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer clic en la imagen misma
                />
             </div>
           )}

       </div>
    </div>
  );
}