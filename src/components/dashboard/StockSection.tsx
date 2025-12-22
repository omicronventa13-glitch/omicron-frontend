import React, { useState, useRef, useEffect } from 'react';
import { PackagePlus, Save, Layers, Tag, Palette, Hash, DollarSign, Camera, Upload, X, Image as ImageIcon, Edit, QrCode } from 'lucide-react';
import api from '../../api';
import type { Product } from '../../types';

interface StockSectionProps {
  isDark: boolean;
  onNotify: (type: 'success' | 'error', msg: string) => void;
  editingProduct?: Product | null; 
  onCancelEdit?: () => void;       
}

export default function StockSection({ isDark, onNotify, editingProduct, onCancelEdit }: StockSectionProps) {
  
  // Estados para imagen
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Estados para cámara
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  // Referencias
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null); // Input nativo de respaldo
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const inputClass = `w-full px-4 py-3 pl-10 rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-sm ${isDark ? 'bg-slate-900/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`;
  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
  const iconClass = "absolute left-3 top-9 text-slate-500";

  // --- EFECTO: CARGAR DATOS AL EDITAR ---
  useEffect(() => {
    if (editingProduct && formRef.current) {
        const form = formRef.current;
        (form.elements.namedItem('brand') as HTMLInputElement).value = editingProduct.brand;
        (form.elements.namedItem('model') as HTMLInputElement).value = editingProduct.model;
        (form.elements.namedItem('type') as HTMLInputElement).value = editingProduct.type;
        (form.elements.namedItem('color') as HTMLInputElement).value = editingProduct.color;
        (form.elements.namedItem('category') as HTMLSelectElement).value = editingProduct.category;
        (form.elements.namedItem('stock') as HTMLInputElement).value = String(editingProduct.stock);
        (form.elements.namedItem('price') as HTMLInputElement).value = String(editingProduct.price);
        (form.elements.namedItem('qrCode') as HTMLInputElement).value = editingProduct.qrCode || ''; // Cargar QR
        
        if (editingProduct.image) setPreviewUrl(editingProduct.image);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!editingProduct && formRef.current) {
        formRef.current.reset();
        clearImage();
    }
  }, [editingProduct]);

  // --- LÓGICA DE CÁMARA ROBUSTA ---
  const startCamera = async () => {
    // Si no hay soporte, usar input nativo inmediatamente
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         onNotify('error', 'Tu navegador no soporta acceso directo a cámara. Usando selector nativo.');
         cameraInputRef.current?.click();
         return;
    }

    setIsCameraOpen(true);

    try {
      let stream: MediaStream | null = null;

      // Intento 1: Cámara Trasera (Environment)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (err) {
        console.log("Intento 1 fallido (Trasera):", err);
      }

      // Intento 2: Cámara Frontal (User) - Si falló la trasera
      if (!stream) {
        try {
             stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        } catch (err) {
             console.log("Intento 2 fallido (Frontal):", err);
        }
      }

      // Intento 3: Cualquier cámara disponible
      if (!stream) {
         stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      // Si llegamos aquí y tenemos stream, configuramos el video
      streamRef.current = stream;
      
      // Pequeño delay para asegurar que el modal renderizó el elemento <video>
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Error play:", e));
        }
      }, 100);

    } catch (err: any) {
      console.error("Error fatal cámara:", err);
      setIsCameraOpen(false); // Cerramos el modal porque falló
      
      let msg = 'No se pudo activar la cámara.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Permiso denegado. Habilita el acceso a la cámara en tu navegador.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'No se detectó ninguna cámara en este dispositivo.';
      }
      
      onNotify('error', msg);
      
      // PLAN B: Activar input nativo automáticamente
      setTimeout(() => {
          cameraInputRef.current?.click();
      }, 500);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
        if (isCameraOpen) stopCamera();
    };
  }, [isCameraOpen]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Configurar canvas al tamaño real del video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `foto_stock_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            stopCamera(); 
          }
        }, 'image/jpeg', 0.85);
      }
    }
  };

  // --- MANEJO DE ARCHIVOS ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        onNotify('error', 'Por favor selecciona un archivo de imagen válido.');
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // --- ENVÍO DEL FORMULARIO ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    
    const formData = new FormData();
    const getVal = (name: string) => (form.elements.namedItem(name) as HTMLInputElement)?.value;
    const getSelectVal = (name: string) => (form.elements.namedItem(name) as HTMLSelectElement)?.value;

    if (!getVal('brand') || !getVal('model') || !getVal('price') || !getVal('stock')) {
        onNotify('error', 'Por favor completa los campos obligatorios.');
        return;
    }

    formData.append('brand', getVal('brand'));
    formData.append('model', getVal('model'));
    formData.append('type', getVal('type'));
    formData.append('color', getVal('color'));
    formData.append('category', getSelectVal('category'));
    formData.append('stock', getVal('stock'));
    formData.append('price', getVal('price'));
    formData.append('qrCode', getVal('qrCode') || ''); // Enviar QR opcional
    formData.append('year', new Date().getFullYear().toString());

    if (selectedImage) {
        formData.append('image', selectedImage);
    }

    try {
      if (editingProduct) {
          await api.put(`/products/${editingProduct._id}`, formData);
          onNotify('success', 'Producto actualizado correctamente.');
          if (onCancelEdit) onCancelEdit();
      } else {
          await api.post('/products', formData);
          const modeloStr = `${getVal('type')} ${getVal('model')}`;
          onNotify('success', `Artículo "${modeloStr}" agregado al stock.`);
          form.reset();
          clearImage();
      }
    } catch (error: any) {
      console.error(error);
      let errorMsg = 'Error al guardar el artículo.';
      if (error.response?.data) {
        errorMsg = typeof error.response.data === 'string' 
            ? error.response.data 
            : (error.response.data.message || JSON.stringify(error.response.data));
      }
      onNotify('error', errorMsg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-32 relative">
      
      {/* --- MODAL DE CÁMARA --- */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg aspect-[3/4] bg-black md:rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                
                <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    <button type="button" onClick={stopCamera} className="p-4 text-white hover:text-red-400 transition-colors rounded-full hover:bg-white/10" title="Cancelar"><X size={32} /></button>
                    <button type="button" onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 hover:border-white bg-white/10 backdrop-blur-sm" title="Capturar foto"><div className="w-16 h-16 rounded-full bg-white shadow-lg"></div></button>
                    <div className="w-16"></div>
                </div>
                <div className="absolute top-4 left-0 right-0 text-center pointer-events-none"><span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md border border-white/10">Cámara Activa</span></div>
            </div>
        </div>
      )}

      <div className={`p-8 rounded-3xl border shadow-xl ${isDark ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-sm' : 'bg-white/80 border-slate-200 shadow-slate-200/50'}`}>
        
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-700/30">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                    {editingProduct ? <Edit size={24}/> : <PackagePlus size={24} />}
                </div>
                <div>
                    <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {editingProduct ? 'Editar Artículo' : 'Alta de Inventario'}
                    </h3>
                    <p className="text-sm text-slate-500">
                        {editingProduct ? `Modificando: ${editingProduct.model}` : 'Ingresa los nuevos artículos al sistema.'}
                    </p>
                </div>
            </div>
            {editingProduct && (
                <button onClick={onCancelEdit} className="text-red-400 flex items-center gap-1 text-sm font-bold hover:underline hover:text-red-300 transition-colors">
                    <X size={16} /> Cancelar Edición
                </button>
            )}
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative"><label className={labelClass}>Marca</label><Layers size={16} className={iconClass} /><input name="brand" placeholder="Ej. Apple" required className={inputClass} /></div>
            <div className="relative"><label className={labelClass}>Modelo</label><Tag size={16} className={iconClass} /><input name="model" placeholder="Ej. iPhone 15" required className={inputClass} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative"><label className={labelClass}>Artículo / Tipo</label><Tag size={16} className={iconClass} /><input name="type" placeholder="Ej. Funda" required className={inputClass} /></div>
            <div className="relative"><label className={labelClass}>Color</label><Palette size={16} className={iconClass} /><input name="color" placeholder="Ej. Negro" required className={inputClass} /></div>
             <div className="relative"><label className={labelClass}>Categoría</label><select name="category" className={`${inputClass} appearance-none`}><option value="Fundas">Fundas</option><option value="Cargadores">Cargadores</option><option value="Cables">Cables</option><option value="Accesorios">Accesorios</option><option value="Telefonia">Telefonía</option><option value="Computo">Cómputo</option></select></div>
          </div>
          
          {/* CAMPO QR */}
          <div className="relative">
             <label className={labelClass}>Código QR (Opcional)</label>
             <QrCode size={16} className={iconClass} />
             <input name="qrCode" placeholder="Ej: ART-0001 (Escanear o Escribir)" className={inputClass} />
          </div>

          <div className="p-6 rounded-2xl border border-dashed border-slate-600/30 bg-slate-500/5 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="relative"><label className={labelClass}>Cantidad (Stock)</label><Hash size={16} className={iconClass} /><input name="stock" type="number" placeholder="0" required min="0" className={inputClass} /></div>
             <div className="relative"><label className={labelClass}>Precio de Venta</label><DollarSign size={16} className={iconClass} /><input name="price" type="number" placeholder="0.00" required step="0.50" className={inputClass} /></div>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'}`}>
             <label className={`${labelClass} mb-3 block flex items-center gap-2`}><ImageIcon size={16}/> Imagen del Producto</label>
             
             {/* INPUT OCULTO 1: Archivo */}
             <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
             
             {/* INPUT OCULTO 2: Cámara Nativa (Plan B) */}
             <input type="file" ref={cameraInputRef} onChange={handleImageSelect} accept="image/*" capture="environment" className="hidden" />

             {!previewUrl ? (
                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={startCamera} className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-all ${isDark ? 'border-slate-600 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10' : 'border-slate-300 hover:border-cyan-500 text-slate-600 hover:text-cyan-600'}`}><Camera size={28} /><span className="text-sm font-bold">Tomar Foto</span></button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-all ${isDark ? 'border-slate-600 hover:border-purple-500 text-slate-300 hover:text-purple-400 hover:bg-purple-500/10' : 'border-slate-300 hover:border-purple-500 text-slate-600 hover:text-purple-600'}`}><Upload size={28} /><span className="text-sm font-bold">Subir Imagen</span></button>
                </div>
             ) : (
                <div className="relative rounded-xl overflow-hidden border-2 border-cyan-500/50 shadow-lg w-full max-w-xs mx-auto group">
                    <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button type="button" onClick={clearImage} className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transform hover:scale-110 transition-all shadow-lg" title="Eliminar imagen"><X size={24} /></button>
                    </div>
                </div>
             )}
          </div>

          <button type="submit" className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg cursor-pointer ${editingProduct ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-500/20'} text-white`}>
              <Save size={20} /> {editingProduct ? 'GUARDAR CAMBIOS' : 'GUARDAR EN STOCK'}
          </button>

        </form>
      </div>
    </div>
  );
}