import React, { useState, useEffect } from 'react';
import { 
  X, Minus, Square, Mail, Send, ChevronLeft, 
  Trash2, Search, Inbox, SendHorizontal, Paperclip, 
  ExternalLink, User, Clock, Loader2, RefreshCw, FileText, Reply
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
  attachmentId?: string;
  attachmentType?: 'report' | 'mandate';
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
  
  // Compose state
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<{id: string, title: string, type: 'report' | 'mandate'} | null>(null);
  const [sending, setSending] = useState(false);
  const [availableReports, setAvailableReports] = useState<{id: string, title: string}[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [allUsers, setAllUsers] = useState<string[]>([]);

  useEffect(() => {
    if (view === 'compose' && allUsers.length === 0) {
      getDocs(collection(db, 'users')).then(snap => {
        setAllUsers(snap.docs.map(d => d.data().email as string));
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
      // Find recipient UID by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', toEmail));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Destinatário não encontrado.');
      }

      const recipientId = querySnapshot.docs[0].id;

      const emailData = {
        fromId: user.uid,
        fromEmail: user.email,
        toId: recipientId,
        toEmail: toEmail,
        subject,
        body,
        attachmentId: attachment?.id || null,
        attachmentType: attachment?.type || null,
        read: false,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'emails'), emailData);

      // If there's an attachment, add the recipient to sharedWith
      if (attachment) {
        const collectionName = attachment.type === 'mandate' ? 'mandates' : 'reports';
        const docRef = doc(db, collectionName, attachment.id);
        await updateDoc(docRef, {
          sharedWith: arrayUnion(recipientId)
        });
      }

      setView('inbox');
      setSubject('');
      setToEmail('');
      setBody('');
      setAttachment(null);
      alert('E-mail enviado com sucesso!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const fetchReports = async () => {
    if (!user) return;
    const q1 = query(collection(db, 'reports'), where('ownerId', '==', user.uid));
    const snap1 = await getDocs(q1);
    const reports = snap1.docs.map(d => ({ id: d.id, title: d.data().title, type: 'report' as const }));

    const q2 = query(collection(db, 'mandates'), where('ownerId', '==', user.uid));
    const snap2 = await getDocs(q2);
    const mandates = snap2.docs.map(d => ({ id: d.id, title: d.data().title, type: 'mandate' as const }));

    setAvailableReports([...reports, ...mandates]);
  };

  const markAsRead = async (email: Email) => {
    if (email.read || view === 'sent') return;
    try {
      await updateDoc(doc(db, 'emails', email.id), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (emailId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Deseja realmente excluir este e-mail?')) return;
    
    try {
      await deleteDoc(doc(db, 'emails', emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    } catch (err) {
      console.error('Erro ao excluir e-mail:', err);
      alert('Erro ao excluir e-mail.');
    }
  };

  return (
    <Rnd
      default={{
        x: 80,
        y: 80,
        width: 900,
        height: 600,
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
            <Mail className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Caixa de E-mail Corporativo</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onMinimize} className="p-1.5 hover:bg-white/5 rounded text-slate-400"><Minus className="w-3.5 h-3.5" /></button>
            <button onClick={onMaximize} className="p-1.5 hover:bg-white/5 rounded text-slate-400"><Square className="w-3.5 h-3.5" /></button>
            <button onClick={onClose} className="p-1.5 hover:bg-red-500/80 hover:text-white rounded text-slate-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-slate-950/50 border-r border-white/5 p-4 flex flex-col gap-2">
          <button 
            onClick={() => { setView('compose'); setSelectedEmail(null); }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 mb-4 shadow-lg shadow-blue-600/20"
          >
            <Send className="w-4 h-4" />
            Novo E-mail
          </button>

          <NavButton active={view === 'inbox'} onClick={() => { setView('inbox'); setSelectedEmail(null); }} icon={<Inbox className="w-4 h-4" />} label="Entrada" count={emails.filter(e => !e.read && e.toId === user?.uid).length} />
          <NavButton active={view === 'sent'} onClick={() => { setView('sent'); setSelectedEmail(null); }} icon={<SendHorizontal className="w-4 h-4" />} label="Enviados" />
          
          <div className="mt-auto pt-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-3 py-2 text-slate-400">
               <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                 {profile?.displayName?.slice(0, 2).toUpperCase()}
               </div>
               <div className="flex flex-col">
                 <span className="text-xs font-bold text-white truncate max-w-[100px]">{profile?.displayName}</span>
                 <span className="text-[10px] uppercase opacity-50">{profile?.role}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-slate-900/30 overflow-hidden">
          {view === 'compose' ? (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setView('inbox')} className="p-2 hover:bg-white/5 rounded-full"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
                <h2 className="text-xl font-bold text-white">Novo Documento</h2>
              </div>

              <form onSubmit={handleSend} className="space-y-4">
                <div className="grid grid-cols-[100px_1fr] items-center border-b border-white/5 pb-2 relative">
                  <span className="text-xs font-bold text-slate-500 uppercase">Para:</span>
                  <input 
                    type="email" 
                    required 
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    className="bg-transparent text-sm text-white focus:outline-none w-full" 
                    placeholder="nome@email.gov"
                    list="registered-emails"
                  />
                  <datalist id="registered-emails">
                    {allUsers.map(email => (
                      <option key={email} value={email} />
                    ))}
                  </datalist>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Assunto:</span>
                  <input 
                    type="text" 
                    required 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-transparent text-sm text-white focus:outline-none w-full" 
                    placeholder="e.g. Relatório de Investigação #451"
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <button 
                    type="button"
                    onClick={() => { setShowAttachments(!showAttachments); fetchReports(); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors border border-white/5"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {attachment ? attachment.title : 'Anexar Documento'}
                  </button>
                  {attachment && (
                    <button type="button" onClick={() => setAttachment(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4"/></button>
                  )}
                </div>

                {showAttachments && (
                  <div className="bg-slate-950/80 border border-white/10 rounded-lg p-2 grid grid-cols-2 gap-2">
                    {availableReports.length === 0 ? (
                      <p className="text-[10px] text-slate-600 p-2 col-span-2">Nenhum documento encontrado para anexar.</p>
                    ) : (
                      availableReports.map(r => (
                        <button 
                          key={`${r.type}-${r.id}`}
                          type="button"
                          onClick={() => { setAttachment({ id: r.id, title: r.title, type: r.type }); setShowAttachments(false); }}
                          className="flex items-center gap-2 p-2 hover:bg-white/5 rounded text-left transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-slate-300 truncate">{r.title}</span>
                            <span className="text-[8px] uppercase text-slate-600">{r.type}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                <textarea 
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full flex-1 min-h-[250px] bg-transparent text-sm text-slate-300 resize-none focus:outline-none py-2" 
                  placeholder="Escreva sua mensagem aqui..."
                />

                <div className="flex justify-end pt-4 border-t border-white/5">
                  <button 
                    disabled={sending}
                    className="px-8 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-xl shadow-blue-600/20"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar Documento
                  </button>
                </div>
              </form>
            </div>
          ) : selectedEmail ? (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => setSelectedEmail(null)} className="p-2 hover:bg-white/5 rounded-full"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setView('compose');
                      setToEmail(selectedEmail.fromEmail === user?.email ? selectedEmail.toEmail : selectedEmail.fromEmail);
                      setSubject(selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`);
                      setBody(`\n\n--- Mensagem Original ---\nDe: ${selectedEmail.fromEmail}\nData: ${new Date(selectedEmail.timestamp?.seconds * 1000).toLocaleString()}\n\n${selectedEmail.body}`);
                      setAttachment(null);
                      setSelectedEmail(null);
                    }}
                    className="p-2 hover:bg-white/5 rounded text-slate-500 hover:text-white transition-colors"
                    title="Responder"
                  >
                    <Reply className="w-5 h-5"/>
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedEmail.id)}
                    className="p-2 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-500 transition-colors"
                    title="Excluir E-mail"
                  >
                    <Trash2 className="w-5 h-5"/>
                  </button>
                </div>
              </div>

              <div className="mb-6">
                 <h2 className="text-2xl font-bold text-white mb-4">{selectedEmail.subject}</h2>
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">
                     {selectedEmail.fromEmail[0].toUpperCase()}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-bold text-white mb-0.5">{selectedEmail.fromEmail}</p>
                     <p className="text-xs text-slate-500 truncate">Para: {selectedEmail.toEmail}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-xs text-slate-500">{new Date(selectedEmail.timestamp?.seconds * 1000).toLocaleString()}</p>
                   </div>
                 </div>
              </div>

              <div className="bg-slate-950/30 rounded-xl p-6 mb-8 border border-white/5 min-h-[200px]">
                <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedEmail.body}
                </p>
              </div>

              {selectedEmail.attachmentId && (
                <div className="mt-auto">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Anexos</p>
                  <div className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-white/5 rounded-xl flex items-center justify-between transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {selectedEmail.attachmentType === 'mandate' ? 'Visualizar Mandado Judicial' : 'Visualizar Relatório de Investigação'}
                        </p>
                        <p className="text-xs text-slate-500">ID: {selectedEmail.attachmentId.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const eventName = selectedEmail.attachmentType === 'mandate' ? 'open-mandate' : 'open-report';
                        const windowId = selectedEmail.attachmentType === 'mandate' ? 'mandato' : 'relatorio';
                        
                        window.dispatchEvent(new CustomEvent('open-window', { detail: windowId }));
                        
                        // Set global pending state as fallback for mounting delay
                        if (windowId === 'mandato') (window as any).pendingMandate = { id: selectedEmail.attachmentId, mode: 'view' };
                        if (windowId === 'relatorio') (window as any).pendingReport = { id: selectedEmail.attachmentId, mode: 'view' };

                        // Small delay to ensure the window component is mounted before sending the ID event
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent(eventName, { 
                            detail: { id: selectedEmail.attachmentId, mode: 'view' }
                          }));
                        }, 150);
                      }}
                      className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      ABRIR
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
               <div className="p-4 bg-slate-950/30 border-b border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-white/5 w-64">
                   <Search className="w-4 h-4 text-slate-500" />
                   <input type="text" placeholder="Pesquisar..." className="bg-transparent border-none text-xs text-white focus:outline-none w-full" />
                 </div>
                 <button className="p-2 text-slate-500 hover:text-blue-400 border-none bg-transparent cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
               </div>
               
               <div className="flex-1 overflow-y-auto">
                 {loading ? (
                   <div className="h-full flex items-center justify-center">
                     <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                   </div>
                 ) : emails.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-600 grayscale">
                     <Inbox className="w-16 h-16 mb-4 opacity-10" />
                     <p className="text-sm">Nenhuma mensagem encontrada</p>
                   </div>
                 ) : (
                   <div className="divide-y divide-white/5">
                     {emails.map(email => (
                       <div 
                         key={email.id}
                         onClick={() => { setSelectedEmail(email); markAsRead(email); }}
                         className={cn(
                           "w-full px-6 py-4 flex items-center gap-4 transition-colors text-left group cursor-pointer",
                           !email.read && view === 'inbox' ? 'bg-blue-500/5' : 'hover:bg-white/5',
                           selectedEmail?.id === email.id && 'bg-white/5 border-l-2 border-blue-500'
                         )}
                       >
                         <div className={cn(
                           "flex-none w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                           email.read || view === 'sent' ? 'bg-slate-800 text-slate-400' : 'bg-blue-600 text-white shadow-lg'
                         )}>
                           {view === 'inbox' ? email.fromEmail[0].toUpperCase() : email.toEmail[0].toUpperCase()}
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between mb-1">
                             <p className={cn("text-sm truncate", !email.read && view === 'inbox' ? "font-bold text-white" : "text-slate-300")}>
                               {view === 'inbox' ? email.fromEmail : `Para: ${email.toEmail}`}
                             </p>
                             <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                               {email.timestamp ? new Date(email.timestamp.seconds * 1000).toLocaleDateString() : ''}
                             </span>
                           </div>
                           <p className={cn("text-xs truncate", !email.read && view === 'inbox' ? "text-slate-100" : "text-slate-500")}>
                             {email.subject}
                           </p>
                         </div>
                         {email.attachmentId && (
                           <Paperclip className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-500 shrink-0" />
                         )}
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
            </div>
          )}
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
        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded-full min-w-[20px] text-center">
          {count}
        </span>
      )}
    </button>
  );
}
