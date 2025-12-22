import React from 'react';
import { Edit, Trash2, User as UserIcon } from 'lucide-react';
import type { RepairOrder } from '../../../types';

interface RepairListProps {
  repairs: RepairOrder[];
  onEdit: (r: RepairOrder) => void;
  onDelete: (id: string) => void;
  onSelect: (r: RepairOrder) => void;
  isDark: boolean;
}

export default function RepairList({ repairs, onEdit, onDelete, onSelect, isDark }: RepairListProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>En Taller</h3>
        <span className="text-xs px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full font-mono">{repairs.length} ACTIVOS</span>
      </div>
      
      <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 scrollbar-hide">
        {repairs.map(r => (
            <div key={r._id} className={`p-5 rounded-2xl border relative overflow-hidden group cursor-pointer transition-all ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white shadow-sm border-slate-200'}`} onClick={() => onSelect(r)}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${r.status === 'Pendiente' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                   <button onClick={(e) => { e.stopPropagation(); onEdit(r); }} className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Edit size={16} /></button>
                   <button onClick={(e) => { e.stopPropagation(); onDelete(r._id); }} className="p-2 bg-red-500/20 text-red-400 rounded-lg"><Trash2 size={16} /></button>
                </div>

                <div className="flex justify-between items-start mb-2 pl-2 pr-16">
                    <div>
                        <h4 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>{r.folio || r._id.slice(-6).toUpperCase()}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{r.clientName}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded uppercase border border-slate-600 text-slate-400">{r.status}</span>
                </div>
                
                <div className="pl-2 space-y-2">
                     <div className="text-sm text-slate-400">{r.service}</div>
                     <div className="flex justify-between text-xs border-t border-slate-700/50 pt-2">
                         <span className="text-white font-bold">Total: ${r.cost}</span>
                         <span className="text-green-500 font-bold">Resta: ${r.cost - r.downPayment}</span>
                     </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}