import React, { useState, useEffect } from 'react';
import { Power, FileText } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { MandatoWindow } from './Mandato';
import { RelatorioWindow } from './Relatorio';

// --- Types ---
type WindowState = {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
};

// --- Main App Component ---
export default function App() {
  const [time, setTime] = useState(new Date());
  const [windows, setWindows] = useState<WindowState[]>([
    { id: 'mandato', title: 'Sistema de Mandados - F.I.B', isOpen: false, isMinimized: false, isMaximized: false },
    { id: 'relatorio', title: 'Relatórios de Investigação - F.I.B', isOpen: false, isMinimized: false, isMaximized: false }
  ]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openWindow = (id: string) => {
    setWindows(windows.map(w => w.id === id ? { ...w, isOpen: true, isMinimized: false } : w));
  };

  const closeWindow = (id: string) => {
    setWindows(windows.map(w => w.id === id ? { ...w, isOpen: false } : w));
  };

  const toggleMinimize = (id: string) => {
    setWindows(windows.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  };

  const toggleMaximize = (id: string) => {
    setWindows(windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white font-sans flex flex-col relative selection:bg-blue-500/30">
      {/* Desktop Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('https://kappa.lol/RNXiln')` }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Desktop Icons Area */}
      <div className="flex-1 relative z-10 p-4 flex flex-col gap-4 items-start content-start flex-wrap">
        <DesktopIcon 
          iconUrl="https://kappa.lol/TkFgCM" 
          label="Mandados F.I.B" 
          onClick={() => openWindow('mandato')} 
        />
        <DesktopIcon 
          iconUrl="https://kappa.lol/TkFgCM" 
          label="Relatórios F.I.B" 
          onClick={() => openWindow('relatorio')} 
        />
      </div>

      {/* Windows */}
      <AnimatePresence>
        {windows.find(w => w.id === 'mandato')?.isOpen && !windows.find(w => w.id === 'mandato')?.isMinimized && (
          <MandatoWindow 
            key="mandato"
            isMaximized={windows.find(w => w.id === 'mandato')?.isMaximized || false}
            onClose={() => closeWindow('mandato')} 
            onMinimize={() => toggleMinimize('mandato')} 
            onMaximize={() => toggleMaximize('mandato')}
          />
        )}
        {windows.find(w => w.id === 'relatorio')?.isOpen && !windows.find(w => w.id === 'relatorio')?.isMinimized && (
          <RelatorioWindow 
            key="relatorio"
            isMaximized={windows.find(w => w.id === 'relatorio')?.isMaximized || false}
            onClose={() => closeWindow('relatorio')} 
            onMinimize={() => toggleMinimize('relatorio')} 
            onMaximize={() => toggleMaximize('relatorio')}
          />
        )}
      </AnimatePresence>

      {/* Taskbar */}
      <div className="h-12 bg-slate-900/90 backdrop-blur-md border-t border-slate-700/50 relative z-50 flex items-center justify-between px-2 shadow-2xl">
        <div className="flex items-center gap-2 h-full">
          <button className="h-10 w-10 flex items-center justify-center rounded hover:bg-slate-800 transition-colors group">
            <Power className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
          </button>
          
          <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-2 h-8">
            {windows.filter(w => w.isOpen).map(w => (
              <button 
                key={w.id}
                onClick={() => toggleMinimize(w.id)}
                className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm max-w-[160px] truncate transition-colors ${
                  w.isMinimized ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-800' : 'bg-blue-900/40 text-blue-100 border-b-2 border-blue-500'
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
function DesktopIcon({ iconUrl, label, onClick }: { iconUrl: string, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-24 flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 transition-colors group focus:outline-none focus:bg-white/20"
    >
      <div className="w-14 h-14 rounded-lg shadow-lg overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors bg-slate-800 flex items-center justify-center">
        <img src={iconUrl} alt={label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <span className="text-xs text-center text-white drop-shadow-md font-medium leading-tight group-hover:text-blue-100">
        {label}
      </span>
    </button>
  );
}
