import React, { useState, useEffect } from 'react';
import { X, Minus, Square, Shield, Users, CheckCircle2, AlertTriangle, Trash2, Filter, Search, UserCheck, ShieldAlert, RotateCcw, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Rnd } from 'react-rnd';
import { useAuth, OperationType, handleFirestoreError, UserProfile } from '../contexts/AuthContext';
import { 
  collection, query, onSnapshot, 
  doc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WindowProps {
  isMaximized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export function AdminWindow({ isMaximized, onClose, onMinimize, onMaximize, onFocus, zIndex }: WindowProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log("AdminPanel: Buscando coleção 'users'...");
      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log("AdminPanel: Snapshot recebido. Total documentos:", snapshot.size);
        const userList = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log("AdminPanel: Usuário na lista ->", data.email);
          return {
            ...data as UserProfile,
            uid: doc.id
          };
        });
        setUsers(userList);
        setLoading(false);
      }, (error: any) => {
        console.error("AdminPanel: Erro na escuta do Firestore:", error);
        setLoading(false);
        if (error.code === 'permission-denied') {
          console.error("AdminPanel: PERMISSÃO NEGADA.");
          alert('ERRO DE PERMISSÃO: Sua conta (' + (useAuth().user?.email) + ') NÃO tem acesso de Administrador no banco de dados. Contate o suporte.');
        } else {
          alert('Erro ao listar usuários: ' + error.message);
        }
      });
      return unsubscribe;
    } catch (err: any) {
      console.error("AdminPanel: Erro fatal ao iniciar listagem:", err);
      setLoading(false);
      alert('Erro crítico de conexão: ' + err.message);
    }
  };

  useEffect(() => {
    let unsubscribe: any;
    fetchUsers().then(unsub => {
      unsubscribe = unsub;
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const updateUserStatus = async (userId: string, status: 'active' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'users', userId), { status });
    } catch (err) {
       alert('Erro ao atualizar status: ' + err);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role });
    } catch (err) {
       alert('Erro ao atualizar cargo: ' + err);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Rnd
      default={{
        x: 160,
        y: 80,
        width: 1000,
        height: 700,
      }}
      size={isMaximized ? { width: '100vw', height: '100vh' } : undefined}
      position={isMaximized ? { x: 0, y: 0 } : undefined}
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
      dragHandleClassName="handle-drag"
      bounds="window"
      className="pointer-events-auto"
      onMouseDown={onFocus}
      style={{ zIndex }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "bg-slate-900 border border-white/10 shadow-2xl flex flex-col overflow-hidden w-full h-full",
          isMaximized ? "rounded-none" : "rounded-xl"
        )}
      >
        {/* Title Bar */}
        <div className="bg-slate-800/80 backdrop-blur-md px-4 py-2 flex items-center justify-between border-b border-white/5 cursor-default group handle-drag" onDoubleClick={onMaximize}>
          <div className="flex items-center gap-2 pointer-events-none">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Painel de Administração</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onMinimize} className="p-1.5 hover:bg-white/5 rounded text-slate-400"><Minus className="w-3.5 h-3.5" /></button>
            <button onClick={onMaximize} className="p-1.5 hover:bg-white/5 rounded text-slate-400"><Square className="w-3.5 h-3.5" /></button>
            <button onClick={onClose} className="p-1.5 hover:bg-red-500/80 hover:text-white rounded text-slate-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-2 bg-slate-800/50 flex items-center justify-between border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-widest uppercase">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Autenticado: {useAuth().user?.email} ({useAuth().profile?.role || 'Visitante'})</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Status: {useAuth().profile?.status || 'N/A'}</span>
              </div>
            </div>
            <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-400" />
              Gestão de Usuários
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/20">
                {users.length} Total
              </span>
              {users.filter(u => u.status === 'pending').length > 0 && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/20 animate-pulse">
                  {users.filter(u => u.status === 'pending').length} Pendentes
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-400 mt-1">Gerencie permissões e acessos das instituições</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchUsers()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors border border-white/5"
              title="Atualizar Lista"
            >
              <RotateCcw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome ou e-mail..."
                className="w-80 bg-slate-800 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/30 transition-all"
              />
            </div>
            <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors border border-white/5">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-left">
             <thead className="text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-white/5">
               <tr>
                 <th className="px-4 py-3">Usuário</th>
                 <th className="px-4 py-3">Cargo/Instituição</th>
                 <th className="px-4 py-3">Status</th>
                 <th className="px-4 py-3">Data de Cadastro</th>
                 <th className="px-4 py-3 text-right">Ações</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/5 text-sm">
               {filteredUsers.map(u => (
                 <tr key={u.uid} className="hover:bg-white/5 transition-colors group">
                   <td className="px-4 py-4">
                     <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                         {u.displayName?.charAt(0).toUpperCase() || '?'}
                       </div>
                       <div>
                         <p className="font-bold text-white">{u.displayName}</p>
                         <p className="text-xs text-slate-500">{u.email}</p>
                       </div>
                     </div>
                   </td>
                   <td className="px-4 py-4">
                     <select 
                        value={u.role}
                        onChange={(e) => updateUserRole(u.uid, e.target.value)}
                        className="bg-slate-800/50 border border-white/10 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                     >
                       <option value="fib">F.I.B</option>
                       <option value="doj">D.O.J</option>
                       <option value="judge">Juiz</option>
                       <option value="admin">Administrador</option>
                     </select>
                   </td>
                   <td className="px-4 py-4">
                     <span className={cn(
                       "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest",
                       u.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : 
                       u.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                     )}>
                       {u.status === 'active' ? 'Ativo' : u.status === 'pending' ? 'Pendente' : 'Inativo'}
                     </span>
                   </td>
                   <td className="px-4 py-4 text-xs text-slate-500">
                     {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '---'}
                   </td>
                   <td className="px-4 py-4 text-right">
                     <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       {u.status === 'pending' && (
                         <button 
                            onClick={() => updateUserStatus(u.uid, 'active')}
                            title="Aprovar Usuário"
                            className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded transition-all"
                         >
                           <UserCheck className="w-4 h-4" />
                         </button>
                       )}
                       {u.status === 'active' ? (
                         <button 
                            onClick={() => updateUserStatus(u.uid, 'inactive')}
                            title="Desativar"
                            className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-all"
                         >
                           <ShieldAlert className="w-4 h-4" />
                         </button>
                       ) : u.status === 'inactive' && (
                         <button 
                            onClick={() => updateUserStatus(u.uid, 'active')}
                            title="Reativar"
                            className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded transition-all"
                         >
                           <CheckCircle2 className="w-4 h-4" />
                         </button>
                       )}
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
          {filteredUsers.length === 0 && !loading && (
            <div className="py-20 text-center flex flex-col items-center">
              <AlertTriangle className="w-12 h-12 text-slate-700 mb-4" />
              <p className="text-slate-500">Nenhum usuário encontrado com os filtros atuais.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  </Rnd>
);
}
