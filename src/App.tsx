import React, { useState, useEffect } from 'react';
import { Power, FileText, Mail, ShieldAlert, LogOut, Loader2, Settings } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { MandatoWindow } from './Mandato';
import { RelatorioWindow } from './Relatorio';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen, PendingScreen } from './components/LoginScreen';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { EmailWindow } from './components/EmailClient';
import { AdminWindow } from './components/AdminPanel';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';

// --- Types ---
type WindowState = {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
};

// --- Main App Component ---
export default function App() {
  const { user, profile, loading, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [maxZIndex, setMaxZIndex] = useState(100);
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(localStorage.getItem('desktop_wallpaper'));
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [wallpaperInput, setWallpaperInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const [windows, setWindows] = useState<WindowState[]>([
    { id: 'mandato', title: 'Sistema de Mandados', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 100 },
    { id: 'relatorio', title: 'Relatórios de Investigação', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 100 },
    { id: 'email', title: 'Caixa de E-mail Corporativo', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 100 },
    { id: 'admin', title: 'Painel de Administração', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 100 },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);

    const handleOpenWindow = (e: any) => {
      const windowId = e.detail;
      openWindow(windowId);
    };
    window.addEventListener('open-window', handleOpenWindow);

    return () => {
      clearInterval(timer);
      window.removeEventListener('open-window', handleOpenWindow);
    };
  }, [windows]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'emails'), 
      where('toId', '==', user.uid), 
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.error("Error listening for unread emails:", error);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const userEmail = (user?.email || '').toLowerCase();
  const isAdminEmail = userEmail === 'nino.byttencourt@gmail.com' || userEmail === 'byttencourt@hotmail.com';

  if (profile?.status === 'pending' && !isAdminEmail) {
    return <PendingScreen />;
  }

  if (profile?.status === 'inactive') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Conta Desativada</h2>
        <p className="text-slate-400 mb-6">Sua conta foi suspensa por um administrador.</p>
        <button onClick={() => logout()} className="px-6 py-2 bg-slate-800 text-white rounded-lg cursor-pointer">Sair</button>
      </div>
    );
  }

  // Get Wallpaper based on role or customization
  const getWallpaper = () => {
    if (customWallpaper) return customWallpaper;
    if (profile?.wallpaperUrl) return profile.wallpaperUrl;
    switch (profile?.role) {
      case 'doj': return 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=2070';
      case 'judge': return 'https://images.unsplash.com/photo-1479142506502-19b3a3b7ff33?q=80&w=2070';
      case 'fib': return 'https://kappa.lol/RNXiln';
      case 'admin': return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072';
      default: return 'https://kappa.lol/RNXiln';
    }
  };

  const focusWindow = (id: string) => {
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZ } : w));
  };

  const openWindow = (id: string) => {
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isOpen: true, isMinimized: false, zIndex: nextZ } : w));
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isOpen: false } : w));
  };

  const toggleMinimize = (id: string) => {
    const window = windows.find(w => w.id === id);
    if (!window) return;
    
    if (window.isMinimized) {
      // Restore and focus
      const nextZ = maxZIndex + 1;
      setMaxZIndex(nextZ);
      setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: false, zIndex: nextZ } : w));
    } else {
      // Minimize
      setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
    }
  };

  const toggleMaximize = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  };

  const saveWallpaper = () => {
    if (wallpaperInput.trim()) {
      setCustomWallpaper(wallpaperInput.trim());
      localStorage.setItem('desktop_wallpaper', wallpaperInput.trim());
      setIsWallpaperModalOpen(false);
      setWallpaperInput('');
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white font-sans flex flex-col relative selection:bg-blue-500/30">
      {/* Desktop Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{ backgroundImage: `url('${getWallpaper()}')` }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Desktop Icons Area - Clicking desktop clears focus or brings attention here if needed */}
      <div className="flex-1 relative z-10 p-6 flex flex-col gap-6 items-start content-start flex-wrap">
        <DesktopIcon 
          iconUrl="https://kappa.lol/TkFgCM" 
          label={`Mandados ${profile?.role?.toUpperCase()}`} 
          onClick={() => openWindow('mandato')} 
        />
        <DesktopIcon 
          iconUrl="https://kappa.lol/TkFgCM" 
          label={`Relatórios ${profile?.role?.toUpperCase()}`} 
          onClick={() => openWindow('relatorio')} 
        />
        <DesktopIcon 
          iconUrl="https://img.icons8.com/color/512/gmail-new.png" 
          label="Caixa de E-mail" 
          onClick={() => openWindow('email')} 
          badge={unreadCount}
        />
        {(profile?.role === 'admin' || (user?.email && ['nino.byttencourt@gmail.com', 'byttencourt@hotmail.com'].includes(user.email.toLowerCase()))) && (
          <DesktopIcon 
            iconUrl="https://img.icons8.com/color/512/settings--v1.png" 
            label="Administração" 
            onClick={() => openWindow('admin')} 
          />
        )}
      </div>

      {/* Windows Renderer */}
      <AnimatePresence>
        {windows.filter(w => w.isOpen && !w.isMinimized).map(win => {
          const WindowComponent = {
            'mandato': MandatoWindow,
            'relatorio': RelatorioWindow,
            'email': EmailWindow,
            'admin': AdminWindow
          }[win.id as keyof typeof WindowComponent];

          if (!WindowComponent) return null;

          return (
            <WindowComponent 
              key={win.id}
              zIndex={win.zIndex}
              isMaximized={win.isMaximized}
              onClose={() => closeWindow(win.id)} 
              onMinimize={() => toggleMinimize(win.id)} 
              onMaximize={() => toggleMaximize(win.id)}
              onFocus={() => focusWindow(win.id)}
            />
          );
        })}
      </AnimatePresence>

      {/* Wallpaper Selection Modal */}
      <AnimatePresence>
        {isWallpaperModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mudar Plano de Fundo</h3>
                <button onClick={() => setIsWallpaperModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <Power className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-400">Insira a URL da imagem que deseja usar como plano de fundo da sua área de trabalho.</p>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">URL da Imagem</label>
                  <input 
                    type="text" 
                    value={wallpaperInput}
                    onChange={(e) => setWallpaperInput(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                   <button 
                    onClick={() => {
                      setCustomWallpaper(null);
                      localStorage.removeItem('desktop_wallpaper');
                      setIsWallpaperModalOpen(false);
                    }}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Restaurar Padrão
                  </button>
                  <button 
                    onClick={saveWallpaper}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg"
                  >
                    Aplicar Wallpaper
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Taskbar */}
      <div className="h-12 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 relative z-50 flex items-center justify-between px-2 shadow-2xl">
        <div className="flex items-center gap-2 h-full">
          <div className="relative group">
            <button className="h-10 w-10 flex items-center justify-center rounded hover:bg-white/10 transition-colors">
              <Power className="w-5 h-5 text-blue-400" />
            </button>
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-900 border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 flex flex-col gap-1">
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <p className="text-xs font-bold text-white truncate">{profile?.displayName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{profile?.role}</p>
              </div>
              
              <button 
                onClick={() => setIsWallpaperModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 rounded transition-colors w-full text-left"
              >
                <Settings className="w-3.5 h-3.5" />
                Mudar Wallpaper
              </button>

              <button 
                onClick={() => logout()}
                className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors w-full text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                Encerrar Sessão
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-2 h-8">
            {windows.filter(w => w.isOpen).map(w => (
              <button 
                key={w.id}
                onClick={() => toggleMinimize(w.id)}
                className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm max-w-[160px] truncate transition-all ${
                  w.isMinimized ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-800' : 'bg-blue-900/40 text-blue-100 border-b-2 border-blue-500 ring-1 ring-white/5 shadow-lg'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">{w.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 px-3 h-full hover:bg-slate-800 rounded transition-colors cursor-default">
          <div className="flex flex-col items-end justify-center text-xs text-slate-300">
            <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>{time.toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Desktop Icon Component ---
function DesktopIcon({ iconUrl, label, onClick, badge }: { iconUrl: string, label: string, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className="w-24 flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 transition-colors group focus:outline-none focus:bg-white/20 relative"
    >
      <div className="w-14 h-14 rounded-lg shadow-lg overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors bg-slate-800 flex items-center justify-center relative">
        <img src={iconUrl} alt={label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        
        {badge !== undefined && badge > 0 && (
          <div className="absolute top-0 left-0 -mt-1 -ml-1 min-w-[20px] h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg ring-2 ring-slate-900 animate-in zoom-in duration-300">
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </div>
      <span className="text-xs text-center text-white drop-shadow-md font-medium leading-tight group-hover:text-blue-100">
        {label}
      </span>
    </button>
  );
}
