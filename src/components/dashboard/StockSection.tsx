import React, { useState, useRef, useEffect } from 'react';
import { PackagePlus, Save, Layers, Tag, Palette, Hash, DollarSign, Camera, Upload, X, Image as ImageIcon, Edit, QrCode, CloudUpload, Loader2 } from 'lucide-react';
import api from '../../api';
import type { Product } from '../../types';

interface StockSectionProps {
  isDark: boolean;
  onNotify: (type: 'success' | 'error', msg: string) => void;
  editingProduct?: Product | null; 
  onCancelEdit?: () => void;       
}

// --- CONFIGURACIÓN CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = "dxdaoojfq"; // Tu Cloud Name real
const CLOUDINARY_UPLOAD_PRESET = "novatech_preset"; // ⚠️ CREA ESTE PRESET EN TU DASHBOARD COMO 'UNSIGNED'

// --- PROCESAMIENTO DE IMAGEN (OPTIMIZADO PARA CARDS) ---
// Redimensiona a 1080px (Calidad Media-Alta Nítida)
const processImageForUpload = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1080; // Balance perfecto entre nitidez y peso
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              // JPEG al 90% de calidad para subida inicial
              const newFile = new File([blob], file.name, { type: 'image/jpeg' });
              resolve(newFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.90);
        } else {
          resolve(file);
        }
      };
    };
  });
};

// Subida directa usando fetch (Sin librería pesada de node)
const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData
  });

  if (!response.ok) throw new Error("Error al conectar con Cloudinary. Revisa tu Preset.");
  const data = await response.json();
  
  // Inyectamos optimización automática (f_auto, q_auto) en la URL
  // Esto hace que Cloudinary sirva la mejor versión posible para el dispositivo
  const optimizedUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
  return optimizedUrl;
};

export default function StockSection({ isDark, onNotify, editingProduct, onCancelEdit }: StockSectionProps) {
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>(''); // Estado para mostrar progreso
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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
        (form.elements.namedItem('qrCode') as HTMLInputElement).value = editingProduct.qrCode || ''; 
        
        if (editingProduct.image) setPreviewUrl(editingProduct.image);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!editingProduct && formRef.current) {
        formRef.current.reset();
        clearImage();
    }
  }, [editingProduct]);

  // --- LÓGICA DE CÁMARA ---
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      let stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).catch(() => null);
      if (!stream) stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).catch(() => null);
      if (!stream) stream = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null);

      if (stream) {
        streamRef.current = stream;
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error(e));
          }
        }, 100);
      } else {
        throw new Error("No se encontró cámara");
      }
    } catch (err) {
      onNotify('error', 'No se pudo acceder a la cámara.');
      setIsCameraOpen(false);
      setTimeout(() => cameraInputRef.current?.click(), 500);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
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
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // --- ENVÍO CON SUBIDA A CLOUDINARY ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const form = e.target as HTMLFormElement;
    const getVal = (name: string) => (form.elements.namedItem(name) as HTMLInputElement)?.value;
    const getSelectVal = (name: string) => (form.elements.namedItem(name) as HTMLSelectElement)?.value;

    if (!getVal('brand') || !getVal('model') || !getVal('price')) {
        onNotify('error', 'Por favor completa los campos obligatorios.');
        return;
    }

    setIsSubmitting(true);
    setUploadStatus('Procesando...');

    try {
        let imageUrl = editingProduct?.image || '';

        // 1. Si hay nueva imagen, la subimos a Cloudinary
        if (selectedImage) {
            setUploadStatus('Optimizando...');
            const processedFile = await processImageForUpload(selectedImage);
            
            setUploadStatus('Subiendo a la Nube...');
            // Obtenemos la URL pública optimizada (f_auto, q_auto)
            imageUrl = await uploadToCloudinary(processedFile);
        }

        // 2. Preparamos datos para Mongo (Guardamos solo la URL de texto)
        const payload = {
            brand: getVal('brand'),
            model: getVal('model'),
            type: getVal('type'),
            color: getVal('color'),
            category: getSelectVal('category'),
            stock: Number(getVal('stock')),
            price: Number(getVal('price')),
            qrCode: getVal('qrCode') || '',
            year: new Date().getFullYear().toString(),
            image: imageUrl // URL de Cloudinary
        };

        setUploadStatus('Guardando datos...');
        const config = { headers: { 'Content-Type': 'application/json' } };

        if (editingProduct) {
            await api.put(`/products/${editingProduct._id}`, payload, config);
            onNotify('success', 'Producto actualizado correctamente.');
            if (onCancelEdit) onCancelEdit();
        } else {
            await api.post('/products', payload, config);
            onNotify('success', `Artículo agregado.`);
            form.reset();
            clearImage();
        }
    } catch (error: any) {
        console.error(error);
        let msg = 'Error al guardar.';
        if (error.message.includes('Preset')) msg = 'Error: Configura el Upload Preset en Cloudinary.';
        onNotify('error', msg);
    } finally {
        setIsSubmitting(false);
        setUploadStatus('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-32 relative">
      
      {/* Modal Cámara */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg aspect-[3/4] bg-black md:rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 items-center z-20">
                    <button type="button" onClick={stopCamera} className="p-4 bg-red-600/80 text-white rounded-full"><X size={24} /></button>
                    <button type="button" onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 shadow-xl active:scale-95 transition-transform"></button>
                </div>
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
                    <X size={16} /> Cancelar
                </button>
            )}
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative"><label className={labelClass}>Marca</label><Layers size={16} className={iconClass} /><input name="brand" placeholder="Ej. Apple" required className={inputClass} /></div>
            <div className="relative"><label className={labelClass}>Modelo</label><Tag size={16} className={iconClass} /><input name="model" placeholder="Ej. iPhone 15" required className={inputClass} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative"><label className={labelClass}>Artículo / Tipo</label><Tag size={16} className={iconClass} /><input name="type" placeholder="Ej. Funda" required className={inputClass} /></div>
            <div className="relative"><label className={labelClass}>Color</label><Palette size={16} className={iconClass} /><input name="color" placeholder="Ej. Negro" required className={inputClass} /></div>
             <div className="relative"><label className={labelClass}>Categoría</label><select name="category" className={`${inputClass} appearance-none`}><option value="Fundas">Fundas</option><option value="Cargadores">Cargadores</option><option value="Cables">Cables</option><option value="Accesorios">Accesorios</option><option value="Telefonia">Telefonía</option><option value="Computo">Cómputo</option></select></div>
          </div>
          
          <div className="relative">
             <label className={labelClass}>Código QR (Opcional)</label>
             <QrCode size={16} className={iconClass} />
             <input name="qrCode" placeholder="Ej: ART-0001" className={inputClass} />
          </div>

          <div className="p-6 rounded-2xl border border-dashed border-slate-600/30 bg-slate-500/5 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="relative"><label className={labelClass}>Cantidad (Stock)</label><Hash size={16} className={iconClass} /><input name="stock" type="number" placeholder="0" required min="0" className={inputClass} /></div>
             <div className="relative"><label className={labelClass}>Precio de Venta</label><DollarSign size={16} className={iconClass} /><input name="price" type="number" placeholder="0.00" required step="0.50" className={inputClass} /></div>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'}`}>
             <label className={`${labelClass} mb-3 block flex items-center gap-2`}><ImageIcon size={16}/> Imagen del Producto</label>
             <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
             <input type="file" ref={cameraInputRef} onChange={handleImageSelect} accept="image/*" capture="environment" className="hidden" />

             {!previewUrl ? (
                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={startCamera} className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-all ${isDark ? 'border-slate-600 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10' : 'border-slate-300 hover:border-cyan-500 text-slate-600 hover:text-cyan-600'}`}><Camera size={28} /><span className="text-sm font-bold">Cámara</span></button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-all ${isDark ? 'border-slate-600 hover:border-purple-500 text-slate-300 hover:text-purple-400 hover:bg-purple-500/10' : 'border-slate-300 hover:border-purple-500 text-slate-600 hover:text-purple-600'}`}><Upload size={28} /><span className="text-sm font-bold">Galería</span></button>
                </div>
             ) : (
                <div className="relative rounded-xl overflow-hidden border-2 border-cyan-500/50 shadow-lg w-full max-w-xs mx-auto group">
                    <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button type="button" onClick={clearImage} className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transform hover:scale-110 transition-all shadow-lg"><X size={24} /></button>
                    </div>
                </div>
             )}
          </div>

          <button type="submit" disabled={isSubmitting} className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg cursor-pointer ${editingProduct ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-500/20'} text-white ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}>
              {isSubmitting ? (
                 <><Loader2 className="animate-spin" size={20} /> {uploadStatus}</>
              ) : (
                 <><Save size={20} /> {editingProduct ? 'GUARDAR CAMBIOS' : 'GUARDAR EN STOCK'}</>
              )}
          </button>

        </form>
      </div>
    </div>
  );
}