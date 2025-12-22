import React, { useState, useRef, useEffect } from 'react';
import { Plus, Send, Calendar, DollarSign, Smartphone, User as UserIcon, Wrench, X, Image as ImageIcon, PenTool, Camera, Lock, Grid3X3, Type, Ban, Trash2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import type { RepairOrder } from '../../../types';

// --- COMPONENTE DE PATRÓN DE DESBLOQUEO ---
const PatternLock = ({ onChange, initialValue = '' }: { onChange: (code: string) => void, initialValue?: string }) => {
  const [path, setPath] = useState<number[]>(initialValue ? initialValue.split('').map(Number) : []);
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Puntos del grid 3x3
  const points = Array.from({ length: 9 }).map((_, i) => ({
    id: i,
    x: (i % 3) * 60 + 30, // Coordenadas X: 30, 90, 150
    y: Math.floor(i / 3) * 60 + 30 // Coordenadas Y: 30, 90, 150
  }));

  const handleStart = (id: number) => {
    setIsDrawing(true);
    setPath([id]);
    onChange(String(id));
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    
    // Detectar posición relativa al SVG
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;

    // Detectar si el puntero toca algún punto no visitado
    const hit = points.find(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        return (dx*dx + dy*dy) < 400; // Radio de detección 20px
    });

    if (hit && !path.includes(hit.id)) {
        const newPath = [...path, hit.id];
        setPath(newPath);
        onChange(newPath.join(''));
    }
  };

  const handleEnd = () => setIsDrawing(false);

  return (
    <div className="flex flex-col items-center select-none" onPointerUp={handleEnd} onPointerLeave={handleEnd}>
        <div className="relative w-[180px] h-[180px] bg-slate-900 rounded-xl touch-none shadow-inner border border-slate-700">
            <svg 
                ref={svgRef}
                width="180" height="180" 
                className="absolute top-0 left-0 w-full h-full"
                onPointerMove={handleMove}
            >
                {/* Líneas de conexión */}
                {path.length > 1 && (
                   <polyline 
                      points={path.map(id => `${points[id].x},${points[id].y}`).join(' ')} 
                      fill="none" 
                      stroke="#06b6d4" 
                      strokeWidth="4" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="drop-shadow-md"
                   />
                )}
                
                {/* Puntos */}
                {points.map(p => {
                    const isActive = path.includes(p.id);
                    return (
                        <circle 
                            key={p.id} 
                            cx={p.x} cy={p.y} r="8" 
                            fill={isActive ? "#06b6d4" : "#475569"} 
                            onPointerDown={(e) => {
                                e.currentTarget.releasePointerCapture(e.pointerId);
                                handleStart(p.id);
                            }}
                            className="cursor-pointer transition-colors duration-200 hover:fill-cyan-400"
                        />
                    );
                })}
            </svg>
        </div>
        <button 
            type="button" 
            onClick={() => { setPath([]); onChange(''); }}
            className="mt-2 text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
        >
            <Trash2 size={12}/> Limpiar Patrón
        </button>
    </div>
  );
};

interface RepairFormProps {
  editingRepair: RepairOrder | null;
  onCancelEdit: () => void;
  onSubmit: (formData: FormData, evidenceFiles: File[], signatureBlob: Blob | null) => void;
  isDark: boolean;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

export default function RepairForm({ editingRepair, onCancelEdit, onSubmit, isDark, onNotify }: RepairFormProps) {
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  // ESTADOS DE SEGURIDAD (Patrón/Contraseña)
  const [unlockType, setUnlockType] = useState<'pattern' | 'password' | 'none'>('none');
  const [unlockCode, setUnlockCode] = useState('');

  const sigCanvas = useRef<SignatureCanvas>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- ESTILOS SEPARADOS ---
  const baseClass = `w-full py-3 rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-sm ${isDark ? 'bg-slate-900/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`;
  const iconInputClass = `${baseClass} px-4 pl-11`; 
  const standardInputClass = `${baseClass} px-3 text-center font-bold`;
  const iconClass = "absolute left-3 top-3.5 text-slate-500 pointer-events-none";

  // Cargar datos al editar
  useEffect(() => {
    if (editingRepair && formRef.current) {
      const form = formRef.current;
      const getVal = (field: string) => {
          if (field.includes('device.')) {
              const key = field.split('.')[1];
              // @ts-ignore
              return editingRepair.device ? editingRepair.device[key] : editingRepair[key] || '';
          }
          // @ts-ignore
          return editingRepair[field] || '';
      };

      (form.elements.namedItem('client') as HTMLInputElement).value = getVal('clientName');
      (form.elements.namedItem('phone') as HTMLInputElement).value = getVal('phone');
      
      (form.elements.namedItem('brand') as HTMLInputElement).value = getVal('device.brand');
      (form.elements.namedItem('model') as HTMLInputElement).value = getVal('device.model');
      (form.elements.namedItem('color') as HTMLInputElement).value = getVal('device.color');
      
      (form.elements.namedItem('service') as HTMLInputElement).value = getVal('service');
      (form.elements.namedItem('cost') as HTMLInputElement).value = getVal('cost');
      (form.elements.namedItem('downPayment') as HTMLInputElement).value = getVal('downPayment');
      
      if (editingRepair.deliveryDate) {
        (form.elements.namedItem('deliveryDate') as HTMLInputElement).value = new Date(editingRepair.deliveryDate).toISOString().split('T')[0];
      }
      (form.elements.namedItem('comments') as HTMLTextAreaElement).value = getVal('comments');
      
      // Cargar desbloqueo
      setUnlockType(editingRepair.unlockType || 'none');
      setUnlockCode(editingRepair.unlockCode || '');
      
      setEvidenceFiles([]);
      setEvidencePreviews([]);
      if (sigCanvas.current) sigCanvas.current.clear();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!editingRepair && formRef.current) {
        formRef.current.reset();
        setUnlockType('none');
        setUnlockCode('');
        setEvidenceFiles([]);
        setEvidencePreviews([]);
        if (sigCanvas.current) sigCanvas.current.clear();
    }
  }, [editingRepair]);

  // ... Lógica de cámara y archivos ...
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) { onNotify('error', 'Error al acceder a la cámara.'); setIsCameraOpen(false); }
  };
  const stopCamera = () => {
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setIsCameraOpen(false);
  };
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `evidencia_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setEvidenceFiles(p => [...p, file]);
            setEvidencePreviews(p => [...p, URL.createObjectURL(file)]);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setEvidenceFiles(p => [...p, ...files]);
      setEvidencePreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
    }
  };
  const clearEvidence = () => {
    setEvidenceFiles([]);
    setEvidencePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const clearSignature = () => sigCanvas.current?.clear();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    
    // Agregar datos de desbloqueo al FormData
    formData.append('unlockType', unlockType);
    formData.append('unlockCode', unlockCode);
    
    let signatureBlob = null;
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
       const dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
       const res = await fetch(dataUrl);
       signatureBlob = await res.blob();
    }

    onSubmit(formData, evidenceFiles, signatureBlob);
  };

  return (
    <>
      {/* Modal Cámara */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
            <div className="relative w-full max-w-lg aspect-[3/4] bg-black md:rounded-2xl overflow-hidden border border-slate-700">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="absolute bottom-0 w-full p-6 flex justify-between bg-gradient-to-t from-black/80 to-transparent">
                    <button onClick={stopCamera} className="p-4 text-white"><X size={32} /></button>
                    <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white flex items-center justify-center"><div className="w-14 h-14 rounded-full border-2 border-black"></div></button>
                    <div className="w-12"></div>
                </div>
            </div>
        </div>
      )}

      <div className={`p-6 md:p-8 rounded-3xl border shadow-lg ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/30">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400"><Plus size={20} /></div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {editingRepair ? 'Editar Orden' : 'Nueva Orden de Servicio'}
                </h3>
            </div>
            {editingRepair && <button onClick={onCancelEdit} className="text-red-400 text-xs flex items-center gap-1"><X size={14}/> Cancelar</button>}
        </div>
        
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative"><UserIcon size={16} className={iconClass} /><input name="client" placeholder="Nombre del Cliente" required className={iconInputClass} /></div>
            <div className="relative"><Smartphone size={16} className={iconClass} /><input name="phone" placeholder="Teléfono" required className={iconInputClass} /></div>
          </div>

          <div className="p-4 rounded-xl border border-dashed border-slate-600/30 bg-slate-500/5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Datos del Equipo</p>
            <div className="grid grid-cols-3 gap-3">
                <input name="brand" placeholder="Marca" className={standardInputClass} required />
                <input name="model" placeholder="Modelo" className={standardInputClass} required />
                <input name="color" placeholder="Color" className={standardInputClass} required />
            </div>
          </div>

          {/* SECCIÓN SEGURIDAD (NUEVO) */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-600/30' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-2"><Lock size={14} /> Seguridad / Desbloqueo</p>
              
              <div className="flex gap-2 mb-4">
                  <button type="button" onClick={() => setUnlockType('none')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${unlockType === 'none' ? 'bg-green-500/20 border-green-500 text-green-500' : 'border-transparent text-slate-500 hover:bg-slate-700/20'}`}><Ban size={16} className="mx-auto mb-1"/> Sin Bloqueo</button>
                  <button type="button" onClick={() => setUnlockType('pattern')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${unlockType === 'pattern' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500' : 'border-transparent text-slate-500 hover:bg-slate-700/20'}`}><Grid3X3 size={16} className="mx-auto mb-1"/> Patrón</button>
                  <button type="button" onClick={() => setUnlockType('password')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${unlockType === 'password' ? 'bg-purple-500/20 border-purple-500 text-purple-500' : 'border-transparent text-slate-500 hover:bg-slate-700/20'}`}><Type size={16} className="mx-auto mb-1"/> Contraseña</button>
              </div>

              {unlockType === 'pattern' && (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
                      <p className="text-xs text-slate-400 mb-2">Dibuja el patrón:</p>
                      <PatternLock onChange={setUnlockCode} initialValue={unlockCode} />
                  </div>
              )}

              {unlockType === 'password' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs text-slate-400 block mb-1">Contraseña o PIN:</label>
                      <input type="text" value={unlockCode} onChange={(e) => setUnlockCode(e.target.value)} placeholder="Ej: 1234 o miClave" className={iconInputClass}/>
                  </div>
              )}
          </div>

          <div className="relative"><Wrench size={16} className={iconClass} /><input name="service" placeholder="Servicio" required className={iconInputClass} /></div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="relative"><DollarSign size={16} className={iconClass} /><input name="cost" type="number" step="0.01" placeholder="Costo" required className={iconInputClass} /></div>
            <div className="relative"><DollarSign size={16} className={iconClass} /><input name="downPayment" type="number" step="0.01" placeholder="Anticipo" className={iconInputClass} /></div>
          </div>
          
          <div className="relative"><Calendar size={16} className={iconClass} /><input name="deliveryDate" type="date" className={iconInputClass} /></div>
          <textarea name="comments" placeholder="Observaciones..." className={`${iconInputClass} h-24 resize-none pt-3`}></textarea>
          
          {!editingRepair && (
            <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} border border-slate-600/30 space-y-4`}>
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-2"><ImageIcon size={14} /> Evidencia</label>
                  <div className="flex items-center gap-3 flex-wrap">
                     <button type="button" onClick={startCamera} className="px-4 py-2 rounded-lg border border-dashed border-cyan-500 text-cyan-500 text-sm flex items-center gap-2 hover:bg-cyan-500/10"><Camera size={16} /> Cámara</button>
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-lg border border-dashed border-slate-500 text-slate-500 text-sm flex items-center gap-2 hover:bg-slate-500/10"><Plus size={16} /> Galería</button>
                     <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*" className="hidden" />
                     {evidenceFiles.length > 0 && <button type="button" onClick={clearEvidence} className="text-xs text-red-400">Limpiar ({evidenceFiles.length})</button>}
                  </div>
                  <div className="flex gap-2 mt-2 overflow-x-auto">{evidencePreviews.map((url, idx) => <img key={idx} src={url} className="w-16 h-16 object-cover rounded-md border border-slate-600" />)}</div>
               </div>
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-2"><PenTool size={14} /> Firma Cliente</label>
                  <div className="border rounded-lg overflow-hidden bg-white"><SignatureCanvas ref={sigCanvas} penColor="black" canvasProps={{ width: 400, height: 150, className: 'cursor-crosshair w-full h-32' }} /></div>
                  <button type="button" onClick={clearSignature} className="text-xs text-slate-500 mt-1">Borrar firma</button>
               </div>
            </div>
          )}

          <button type="submit" className="w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg cursor-pointer bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <Send size={18} /> {editingRepair ? 'GUARDAR CAMBIOS' : 'REGISTRAR ORDEN'}
          </button>
        </form>
      </div>
    </>
  );
}