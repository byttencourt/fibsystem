import React, { useState, useEffect } from 'react';
import { 
  X, Minus, Square, Mail, Send, ChevronLeft, 
  Trash2, Search, Inbox, SendHorizontal, Paperclip, 
  ExternalLink, User, Clock, Loader2, RefreshCw, FileText, Reply, Forward
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Rnd } from 'react-rnd';
import { useAuth, OperationType, handleFirestoreError } from '../contexts/AuthContext';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, updateDoc, doc, getDocs,
  arrayUnion, deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Email {
  id: string;
  fromId: string;
  fromEmail: string;
  toId: string;
  toEmail: string;
  subject: string;
  body: string;
  attachmentId?: string | null;
  attachmentType?: 'report' | 'mandate' | 'external' | null;
  attachmentUrl?: string | null;
  attachmentTitle?: string | null;
  read: boolean;
  timestamp: any;
}

interface WindowProps {
  isMaximized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export function EmailWindow({ isMaximized, onClose, onMinimize, onMaximize, onFocus, zIndex }: WindowProps) {
  const { profile, user } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [view, setView] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<{id?: string, title: string, type: 'report' | 'mandate' | 'external', url?: string} | null>(null);
  const [sending, setSending] = useState(false);
  const [availableReports, setAvailableReports] = useState<{id: string, title: string, type: 'report' | 'mandate'}[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<{email: string, displayName: string}[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<{email: string, displayName: string}[]>([]);

  useEffect(() => {
    if (view === 'compose' && allUsers.length === 0) {
      getDocs(collection(db, 'users')).then(snapshot => {
        const users = snapshot.docs.map(doc => ({
          email: doc.data().email as string,
          displayName: (doc.data().displayName || doc.data().name || 'Usuário') as string
        }));
        setAllUsers(users);
      });
    }
  }, [view]);

  useEffect(() => {
    if (!user) return;

    const q = view === 'inbox' 
      ? query(collection(db, 'emails'), where('toId', '==', user.uid), orderBy('timestamp', 'desc'))
      : query(collection(db, 'emails'), where('fromId', '==', user.uid), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emailList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Email));
      setEmails(emailList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching emails:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'emails');
    });

    return () => unsubscribe();
  }, [user, view]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSending(true);
    try {
      const recipientEmails = toEmail.split(',').map(e => e.trim()).filter(e => e !== '');
      
      if (recipientEmails.length === 0) {
        throw new Error('Por favor, insira pelo menos um destinatário.');
      }

      for (const email of recipientEmails) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.warn(`Destinatário ${email} não encontrado.`);
          continue; // Pula destinatários não encontrados
        }

        const recipientId = querySnapshot.docs[0].id;

        const emailData = {
          fromId: user.uid,
          fromEmail: user.email,
          toId: recipientId,
          toEmail: email,
          subject,
          body,
          attachmentId: attachment?.id || null,
          attachmentType: attachment?.type || null,
          attachmentUrl: attachment?.url || null,
          attachmentTitle: attachment?.title || null,
          read: false,
          timestamp: serverTimestamp()
        };

        await addDoc(collection(db, 'emails'), emailData);

        if (attachment && attachment.type !== 'external' && attachment.id) {
          const collectionName = attachment.type === 'mandate' ? 'mandates' : 'reports';
          const docRef = doc(db, collectionName, attachment.id);
          await updateDoc(docRef, {
            sharedWith: arrayUnion(recipientId)
          });
        }
      }

      setView('inbox');
      setSubject('');
      setToEmail('');
      setBody('');
      setAttachment(null);
      alert('E-mail(s) enviado(s) com sucesso!');
    } catch (err: any) {
      console.error("Error sending email:", err);
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleToEmailChange = (value: string) => {
    setToEmail(value);
    
    // Get the part being typed after the last comma
    const parts = value.split(',');
    const currentPart = parts[parts.length - 1].trim().toLowerCase();
    
    if (currentPart.length > 0) {
      const filtered = allUsers.filter(u => 
        u.displayName.toLowerCase().includes(currentPart) || 
        u.email.toLowerCase().includes(currentPart)
      );
      setFilteredUsers(filtered);
      setShowUserDropdown(filtered.length > 0);
    } else {
      setShowUserDropdown(false);
    }
  };

  const selectUser = (selectedUser: {email: string, displayName: string}) => {
    const parts = toEmail.split(',');
    // If it's not the first element, keep the spaces
    parts[parts.length - 1] = parts.length > 1 ? ` ${selectedUser.email}` : selectedUser.email;
    const newValue = parts.join(',').trim() + ', ';
    setToEmail(newValue);
    setShowUserDropdown(false);
  };

  const fetchReports = async () => {
    if (!user) return;
    try {
      const reportsQuery = query(collection(db, 'reports'), where('ownerId', '==', user.uid));
      const reportsSnap = await getDocs(reportsQuery);
      const reports = reportsSnap.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        type: 'report' as const
      }));

      const mandatesQuery = query(collection(db, 'mandates'), where('ownerId', '==', user.uid));
      const mandatesSnap = await getDocs(mandatesQuery);
      const mandates = mandatesSnap.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        type: 'mandate' as const
      }));

      setAvailableReports([...reports, ...mandates]);
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("Por favor, selecione um arquivo menor que 20MB");
      return;
    }

    setSending(true);
    setShowAttachments(false);
    try {
      const { supabase } = await import('../lib/supabase');
      if (!supabase) {
        const missing = [];
        if (!import.meta.env.VITE_SUPABASE_URL) missing.push("VITE_SUPABASE_URL");
        if (!import.meta.env.VITE_SUPABASE_ANON_KEY) missing.push("VITE_SUPABASE_ANON_KEY");
        
        throw new Error(`Configuração do Supabase incompleta. Faltando: ${missing.join(', ')}. Por favor, verifique seu arquivo .env ou as configurações de segredo (Secrets) no painel de controle.`);
      }

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user?.uid || 'anon'}/${Date.now()}_${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });
      
      if (uploadError) {
        console.error("Supabase Upload Error:", uploadError);
        if (uploadError.message.includes('400')) {
          throw new Error("O Supabase recusou o arquivo (Erro 400). Verifique no painel do Supabase se o bucket 'attachments' permite esta extensão de arquivo (MIME type). " + uploadError.message);
        }
        throw new Error("Erro no Supabase: " + uploadError.message);
      }
      
      const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
      
      if (!data?.publicUrl) throw new Error("Erro ao obter URL pública do Supabase");

      const rawUrl = data.publicUrl;
      const proxiedUrl = `/api/proxy-storage?url=${encodeURIComponent(rawUrl.trim())}`;
      
      setAttachment({ title: file.name, type: 'external', url: proxiedUrl });
    } catch (err: any) {
      alert("Erro ao fazer upload do arquivo: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (email: Email) => {
    if (email.read || view === 'sent') return;
    try {
      const emailRef = doc(db, 'emails', email.id);
      await updateDoc(emailRef, { read: true });
    } catch (err) {
      console.error("Error marking email as read:", err);
    }
  };

  const handleDelete = async (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir este e-mail?')) return;
    try {
      await deleteDoc(doc(db, 'emails', emailId));
      if (selectedEmail?.id === emailId) setSelectedEmail(null);
    } catch (err) {
      alert('Erro ao excluir e-mail.');
    }
  };

  const filteredEmails = emails.filter(email => 
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.fromEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.toEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Rnd
      default={{ x: 80, y: 80, width: 900, height: 600 }}
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
            <Mail className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">E-mail Corporativo</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onMinimize} className="p-1.5 hover:bg-white/5 rounded text-slate-400 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
            <button onClick={onMaximize} className="p-1.5 hover:bg-white/5 rounded text-slate-400 transition-colors"><Square className="w-3.5 h-3.5" /></button>
            <button onClick={onClose} className="p-1.5 hover:bg-red-500/80 hover:text-white rounded text-slate-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-slate-950/50 border-r border-white/5 p-4 flex flex-col gap-2">
            <button 
              onClick={() => { setView('compose'); setSelectedEmail(null); }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 mb-4 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <Send className="w-4 h-4" />
              Novo E-mail
            </button>

            <NavButton active={view === 'inbox'} onClick={() => { setView('inbox'); setSelectedEmail(null); }} icon={<Inbox className="w-4 h-4" />} label="Entrada" count={emails.filter(e => !e.read && e.toId === user?.uid).length} />
            <NavButton active={view === 'sent'} onClick={() => { setView('sent'); setSelectedEmail(null); }} icon={<SendHorizontal className="w-4 h-4" />} label="Enviados" />
          </div>

          <div className="flex-1 flex flex-col bg-slate-900/30 overflow-hidden">
            <AnimatePresence mode="wait">
              {view === 'compose' ? (
                <motion.div key="compose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                  <form onSubmit={handleSend} className="space-y-4">
                    <div className="space-y-1 relative">
                      <input 
                        type="text" 
                        required 
                        value={toEmail} 
                        onChange={(e) => handleToEmailChange(e.target.value)} 
                        className="bg-transparent border-b border-white/5 pb-2 text-sm text-white w-full outline-none focus:border-blue-500 transition-colors" 
                        placeholder="Para (separe múltiplos por vírgula):" 
                        onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                      />
                      
                      <AnimatePresence>
                        {showUserDropdown && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 w-full mt-1 bg-slate-900 border border-white/10 rounded-lg shadow-2xl z-[100] max-h-48 overflow-y-auto custom-scrollbar"
                          >
                            {filteredUsers.map(u => (
                              <button
                                key={u.email}
                                type="button"
                                onClick={() => selectUser(u)}
                                className="w-full text-left px-4 py-2 hover:bg-blue-600/20 flex flex-col transition-colors border-b border-white/5 last:border-0"
                              >
                                <span className="text-sm font-bold text-white">{u.displayName}</span>
                                <span className="text-[10px] text-slate-500">{u.email}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-transparent border-b border-white/5 pb-2 text-sm text-white w-full outline-none focus:border-blue-500 transition-colors" placeholder="Assunto:" />
                    
                    <div className="relative">
                      <button type="button" onClick={() => { setShowAttachments(!showAttachments); fetchReports(); }} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-white/5 transition-colors">
                        <Paperclip className="w-3.5 h-3.5" /> {attachment ? attachment.title : 'Anexar Documento ou Arquivo'}
                      </button>

                      <AnimatePresence>
                        {showAttachments && (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute top-full left-0 mt-2 w-72 bg-slate-950 border border-white/10 rounded-lg shadow-2xl p-2 z-50">
                            <label className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer text-xs text-blue-400 mb-2 border-b border-white/5 pb-2">
                              <FileText className="w-4 h-4" /> Enviar Arquivo Local
                              <input type="file" className="hidden" onChange={handleFileUpload} />
                            </label>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                              {availableReports.map(report => (
                                <button key={report.id} type="button" onClick={() => { setAttachment({ id: report.id, title: report.title, type: report.type }); setShowAttachments(false); }} className="w-full text-left p-2 hover:bg-white/5 rounded text-xs text-slate-400 transition-colors flex items-center gap-2">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", report.type === 'mandate' ? "bg-purple-500" : "bg-blue-500")} />
                                  <span className="truncate italic">{report.title}</span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <textarea required value={body} onChange={(e) => setBody(e.target.value)} className="w-full flex-1 min-h-[300px] bg-transparent text-sm text-slate-300 resize-none outline-none custom-scrollbar" placeholder="Escreva sua mensagem aqui..." />
                    
                    <div className="pt-4 border-t border-white/5 flex justify-end">
                      <button type="submit" disabled={sending} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar Mensagem
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : selectedEmail ? (
                <motion.div key="read" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                  <button onClick={() => setSelectedEmail(null)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 mb-6 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Voltar para a lista
                  </button>
                  
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{selectedEmail.fromEmail}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {selectedEmail.timestamp ? new Date(selectedEmail.timestamp.seconds * 1000).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => {
                          setView('compose');
                          setToEmail(selectedEmail.fromEmail);
                          setSubject(`Re: ${selectedEmail.subject}`);
                          setSelectedEmail(null);
                        }}
                        className="p-2 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-colors"
                        title="Responder"
                      >
                        <Reply className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setView('compose');
                          setSubject(`Fwd: ${selectedEmail.subject}`);
                          setBody(`\n\n---------- Mensagem Encaminhada ----------\nDe: ${selectedEmail.fromEmail}\nData: ${selectedEmail.timestamp ? new Date(selectedEmail.timestamp.seconds * 1000).toLocaleString() : ''}\nAssunto: ${selectedEmail.subject}\n\n${selectedEmail.body}`);
                          if (selectedEmail.attachmentTitle) {
                            setAttachment({
                              id: selectedEmail.attachmentId || undefined,
                              title: selectedEmail.attachmentTitle,
                              type: selectedEmail.attachmentType || 'external',
                              url: selectedEmail.attachmentUrl || undefined
                            });
                          }
                          setSelectedEmail(null);
                        }}
                        className="p-2 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-colors"
                        title="Encaminhar"
                      >
                        <Forward className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(selectedEmail.id, e)}
                        className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950/40 p-6 rounded-xl border border-white/5 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap min-h-[200px]">
                    {selectedEmail.body}
                  </div>

                  {(selectedEmail.attachmentTitle || selectedEmail.attachmentType) && (
                    <div className="mt-8 p-4 bg-blue-600/5 rounded-xl border border-blue-500/10 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase tracking-tight">{selectedEmail.attachmentTitle || 'Documento Anexado'}</p>
                          <p className="text-[10px] text-blue-400/60 uppercase font-bold tracking-widest">{selectedEmail.attachmentType}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (selectedEmail.attachmentType === 'external') {
                            if (selectedEmail.attachmentTitle?.endsWith('.json')) {
                              window.dispatchEvent(new CustomEvent('open-window', { detail: 'relatorio' }));
                              (window as any).pendingReport = { url: selectedEmail.attachmentUrl, mode: 'view' };
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('open-report', { 
                                  detail: { url: selectedEmail.attachmentUrl, mode: 'view' }
                                }));
                              }, 150);
                            } else {
                              window.open(selectedEmail.attachmentUrl || '', '_blank');
                            }
                          } else {
                            const eventName = selectedEmail.attachmentType === 'mandate' ? 'open-mandate' : 'open-report';
                            const windowId = selectedEmail.attachmentType === 'mandate' ? 'mandato' : 'relatorio';
                            
                            window.dispatchEvent(new CustomEvent('open-window', { detail: windowId }));
                            
                            if (windowId === 'mandato') (window as any).pendingMandate = { id: selectedEmail.attachmentId, mode: 'view' };
                            if (windowId === 'relatorio') (window as any).pendingReport = { id: selectedEmail.attachmentId, mode: 'view' };

                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent(eventName, { 
                                detail: { id: selectedEmail.attachmentId, mode: 'view' }
                              }));
                            }, 150);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        ABRIR DOCUMENTO
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="text" placeholder="Pesquisar e-mails..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-300 outline-none focus:border-blue-500/50 transition-colors" />
                    </div>
                    <button onClick={() => setLoading(true)} className="p-2 hover:bg-white/5 rounded text-slate-500 transition-colors">
                      <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                      <div className="h-full flex items-center justify-center opacity-20">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    ) : filteredEmails.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-20">
                        <Inbox className="w-12 h-12 mb-2" />
                        <p className="text-sm font-bold uppercase tracking-widest">Caixa de entrada vazia</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {filteredEmails.map(email => (
                          <div 
                            key={email.id} 
                            onClick={() => {
                              setSelectedEmail(email);
                              markAsRead(email);
                            }}
                            className={cn(
                              "group px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-all relative overflow-hidden",
                              !email.read && view === 'inbox' && "bg-blue-600/5"
                            )}
                          >
                            {!email.read && view === 'inbox' && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                            )}
                            
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center border transition-colors",
                              !email.read && view === 'inbox' 
                                ? "bg-blue-600/20 border-blue-500/30" 
                                : "bg-slate-800/50 border-white/5"
                            )}>
                              <User className={cn(
                                "w-5 h-5",
                                !email.read && view === 'inbox' ? "text-blue-400" : "text-slate-500"
                              )} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className={cn(
                                  "text-sm truncate",
                                  !email.read && view === 'inbox' ? "text-white font-bold" : "text-slate-400"
                                )}>
                                  {view === 'inbox' ? email.fromEmail : `Para: ${email.toEmail}`}
                                </p>
                                <p className="text-[10px] text-slate-600">
                                  {email.timestamp ? new Date(email.timestamp.seconds * 1000).toLocaleDateString() : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className={cn(
                                  "text-xs truncate flex-1 font-medium",
                                  !email.read && view === 'inbox' ? "text-slate-200" : "text-slate-500"
                                )}>
                                  {email.subject}
                                </p>
                                {(email.attachmentTitle || email.attachmentType) && (
                                  <Paperclip className="w-3 h-3 text-slate-600" />
                                )}
                              </div>
                            </div>

                            <button 
                              onClick={(e) => handleDelete(email.id, e)}
                              className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-600 hover:text-red-500 rounded transition-all ml-2 border-none bg-transparent"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </Rnd>
  );
}

function NavButton({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border-none bg-transparent cursor-pointer",
        active ? "bg-white/10 text-white font-bold" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        {label}
      </div>
      {count !== undefined && count > 0 && (
        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded-full font-bold min-w-[20px] shadow-lg shadow-blue-600/20">
          {count}
        </span>
      )}
    </button>
  );
}