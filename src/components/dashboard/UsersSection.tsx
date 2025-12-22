import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, User as UserIcon, Edit, Eye, EyeOff, CheckCircle, Lock } from 'lucide-react';
import api from '../../api';
import type { User } from '../../types';

interface UsersSectionProps {
  currentUser: User | null;
  isDark: boolean;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

export default function UsersSection({ currentUser, isDark, onNotify }: UsersSectionProps) {
  const [users, setUsers] = useState<(User & { _id: string, isOnline?: boolean })[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<(User & { _id: string }) | null>(null);
  
  const [formData, setFormData] = useState({ username: '', password: '', role: 'vendedor' });
  const [showPassword, setShowPassword] = useState(false);

  // Verificar si es el Super Admin (Omicron)
  const isSuperAdmin = currentUser?.role === 'super';

  useEffect(() => {
    loadUsers();
    // El polling solo tiene sentido si eres Super Admin para ver el estado online
    let interval: NodeJS.Timeout;
    if (isSuperAdmin) {
        interval = setInterval(loadUsers, 15000);
    }
    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (e) { onNotify('error', 'Error al cargar usuarios'); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar usuario permanentemente?')) {
      try {
        await api.delete(`/users/${id}`);
        onNotify('success', 'Usuario eliminado');
        loadUsers();
      } catch (e) { onNotify('error', 'Error al eliminar'); }
    }
  };

  const handleEdit = (user: User & { _id: string }) => {
    setEditingUser(user);
    setFormData({
        username: user.username,
        password: '',
        // @ts-ignore
        role: user.role
    });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
      setEditingUser(null);
      setFormData({ username: '', password: '', role: 'vendedor' });
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
          const payload: any = { username: formData.username, role: formData.role };
          if (formData.password.trim() !== '') {
              payload.password = formData.password;
          }
          await api.put(`/users/${editingUser._id}`, payload);
          onNotify('success', 'Usuario actualizado correctamente');
      } else {
          if (!formData.password) {
              onNotify('error', 'La contraseña es obligatoria');
              return;
          }
          await api.post('/users', formData);
          onNotify('success', 'Usuario creado con éxito');
      }
      
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', role: 'vendedor' });
      loadUsers();
    } catch (e) { onNotify('error', 'Error al guardar usuario'); }
  };

  const filteredUsers = users.filter(u => {
    if (currentUser?.role === 'super') return true;
    if (currentUser?.role === 'admin') return u.role === 'vendedor';
    return false;
  });

  const cardClass = `p-4 rounded-xl border flex items-center justify-between transition-all hover:shadow-md ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`;
  const inputClass = `w-full px-4 py-3 rounded-xl border outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'}`;

  return (
    <div className="pb-20 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Gestión de Usuarios</h3>
            {isSuperAdmin ? (
                <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mt-1">Control Total (Super Admin)</p>
            ) : (
                <p className="text-xs text-slate-500 mt-1">Gestión de Vendedores</p>
            )}
        </div>
        <button 
            onClick={handleOpenCreate}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg"
        >
            <UserPlus size={20} /> Nuevo Usuario
        </button>
      </div>

      <div className="space-y-4">
        {filteredUsers.map(u => (
            <div key={u._id} className={cardClass}>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className={`p-3 rounded-full ${u.role === 'super' ? 'bg-purple-500/20 text-purple-400' : u.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                            {u.role === 'super' || u.role === 'admin' ? <Shield size={24}/> : <UserIcon size={24}/>}
                        </div>
                        
                        {/* Indicador Online: SOLO VISIBLE PARA SUPER ADMIN */}
                        {isSuperAdmin && (
                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 ${isDark ? 'border-slate-800' : 'border-white'} ${u.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{u.username}</p>
                            {/* Etiqueta Online: SOLO VISIBLE PARA SUPER ADMIN */}
                            {isSuperAdmin && u.isOnline && <span className="text-[10px] bg-green-500/10 text-green-500 px-2 rounded-full font-bold">ONLINE</span>}
                        </div>
                        <p className="text-sm text-slate-500 capitalize">{u.role}</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    {/* Botón Editar: SOLO VISIBLE PARA SUPER ADMIN */}
                    {isSuperAdmin && (
                        <button onClick={() => handleEdit(u)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar / Cambiar Contraseña">
                            <Edit size={20} />
                        </button>
                    )}

                    {/* Botón Eliminar: VISIBLE PARA SUPER ADMIN Y ADMIN (si no es él mismo) */}
                    {u.username !== currentUser?.username && (
                        <button onClick={() => handleDelete(u._id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar Usuario">
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </div>
        ))}
      </div>

      {/* MODAL CREAR / EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                    </h4>
                    {editingUser && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">Editando</span>}
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Usuario</label>
                        <input 
                            value={formData.username} 
                            onChange={e => setFormData({...formData, username: e.target.value})}
                            className={inputClass} required 
                        />
                    </div>
                    
                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                                {showPassword ? <EyeOff size={12}/> : <Eye size={12}/>} {showPassword ? 'Ocultar' : 'Ver'}
                            </button>
                        </div>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={formData.password} 
                                onChange={e => setFormData({...formData, password: e.target.value})}
                                className={inputClass} 
                                placeholder={editingUser ? "Dejar en blanco para mantener actual" : "••••••"}
                                required={!editingUser} 
                            />
                            {formData.password && <Lock size={14} className="absolute right-3 top-3.5 text-green-500"/>}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rol</label>
                        <select 
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value})}
                            className={inputClass}
                            // Si no es super admin, el select está deshabilitado y forzado a "vendedor"
                            disabled={!isSuperAdmin} 
                        >
                            <option value="vendedor">Vendedor</option>
                            {isSuperAdmin && <option value="admin">Administrador</option>}
                            {isSuperAdmin && <option value="super">Super Admin</option>}
                        </select>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-600/20 text-slate-500 hover:bg-slate-600/30 transition-colors">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg transition-colors flex justify-center items-center gap-2">
                            <CheckCircle size={18} /> Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}