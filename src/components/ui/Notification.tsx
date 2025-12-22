import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface NotificationProps {
  type: 'success' | 'error' | null;
  message: string;
  onClose: () => void;
}

export default function Notification({ type, message, onClose }: NotificationProps) {
  useEffect(() => {
    if (type) {
      const timer = setTimeout(onClose, 4000); // Autocierre en 4 segundos
      return () => clearTimeout(timer);
    }
  }, [type, onClose]);

  if (!type) return null;

  const isSuccess = type === 'success';

  return (
    <div className={`fixed top-24 right-4 md:right-8 z-50 flex items-center gap-4 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-500 animate-fade-in-up max-w-sm w-full
      ${isSuccess 
        ? 'bg-slate-900/90 border-green-500/50 text-white' 
        : 'bg-slate-900/90 border-red-500/50 text-white'
      }`}
    >
      <div className={`p-2 rounded-full ${isSuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        {isSuccess ? <CheckCircle size={24} /> : <XCircle size={24} />}
      </div>
      
      <div className="flex-1">
        <h4 className="font-bold text-sm">{isSuccess ? '¡Operación Exitosa!' : 'Error'}</h4>
        <p className="text-xs text-slate-400 mt-1">{message}</p>
      </div>

      <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
        <X size={18} />
      </button>
    </div>
  );
}