import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, Download, Image as ImageIcon, Type, Save, Square,
  Trash2, Check, Copy, FileText, Maximize2, Minimize2, X, PlusCircle, Trash,
  Circle, Minus, ArrowDownToLine, MoveUpRight, PenTool, Highlighter
} from 'lucide-react';
import { toBlob } from 'html-to-image';
import { Rnd } from 'react-rnd';
import { v4 as uuidv4 } from 'uuid';

export type ElementType = 'text' | 'image' | 'stamp' | 'circle' | 'arrow' | 'cross' | 'drawing' | 'redact';

export interface ReportElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; 
  fontSize?: number;
  textColor?: string;
  fontWeight?: string;
  imageStyle?: 'normal' | 'polaroid';
  angle?: number;
  points?: {x: number, y: number}[];
}

export interface EditorPage {
  id: string;
  elements: ReportElement[];
}

export interface RelatorioMetadata {
  directiveNo: string;
  operationName: string;
  issueDate: string;
  agentName: string;
  classification: string;
  agenteAssinatura?: string;
  diretorAssinatura?: string;
}

const DEFAULT_METADATA: RelatorioMetadata = {
  directiveNo: '',
  operationName: '',
  issueDate: new Date().toISOString().split('T')[0],
  agentName: '',
  classification: 'RELATÓRIO DE INVESTIGAÇÃO',
};

function migrateLegacyData(legacy: any): EditorPage[] {
  const pages: EditorPage[] = [];

  // Page 1
  pages.push({
    id: uuidv4(),
    elements: [
      { id: uuidv4(), type: 'text', x: 64, y: 120, width: 660, height: 150, content: '1. OBJETIVO DA INVESTIGAÇÃO\n\n' + (legacy.objetivo || ''), fontWeight: 'normal', fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 300, width: 660, height: 150, content: '2. ORGANIZAÇÃO INVESTIGADA\n\n' + (legacy.organizacao || ''), fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 500, width: 660, height: 250, content: '3. HISTÓRICO DE OCORRÊNCIAS\n\n' + (legacy.historico || ''), fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 800, width: 660, height: 150, content: '4. ANÁLISE DE PADRÃO CRIMINAL\n\n' + (legacy.analise || ''), fontSize: 12 }
    ]
  });

  // Page 2
  pages.push({
    id: uuidv4(),
    elements: [
      { id: uuidv4(), type: 'text', x: 64, y: 120, width: 660, height: 200, content: '5. INTELIGÊNCIA COLETADA\n\n' + (legacy.inteligencia || ''), fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 350, width: 660, height: 150, content: '6. FUNDAMENTAÇÃO LEGAL\n\n' + (legacy.fundamentacao || ''), fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 550, width: 660, height: 150, content: '7. MEDIDAS OPERACIONAIS ATIVAS\n\n' + (legacy.medidas || ''), fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 750, width: 660, height: 150, content: '8. CONCLUSÃO\n\n' + (legacy.conclusao || ''), fontSize: 12 }
    ]
  });

  return pages;
}

function DraggableElement({ 
  el, selected, onSelect, onChange, onDelete, onMoveToNextPage, readOnly 
}: { 
  el: ReportElement;
  selected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<ReportElement>) => void;
  onDelete: () => void;
  onMoveToNextPage?: () => void;
  readOnly: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState(el.content);

  const handleDoubleClick = () => {
    if (readOnly || el.type !== 'text') return;
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onChange({ content: tempText });
  };

  return (
    <Rnd
      position={{ x: el.x, y: el.y }}
      size={{ width: el.width, height: el.height }}
      onDragStart={onSelect}
      onDragStop={(e, d) => !readOnly && onChange({ x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        if (readOnly) return;
        onChange({ 
          width: parseInt(ref.style.width), 
          height: parseInt(ref.style.height),
          ...position 
        });
      }}
      disableDragging={isEditing || readOnly}
      enableResizing={!isEditing && !readOnly}
      bounds="parent"
      className={`group ${selected && !readOnly ? 'ring-2 ring-blue-500/50' : ''}`}
      style={{ zIndex: selected ? 10 : 1 }}
    >
      {selected && !isEditing && !readOnly && (
        <div className="absolute -top-12 left-0 bg-slate-800 text-white p-1 rounded shadow flex gap-1 items-center z-50 whitespace-nowrap">
           {el.type === 'image' && (
             <>
               <button onClick={() => onChange({ imageStyle: 'normal' })} className={`px-2 py-1 text-xs rounded ${(!el.imageStyle || el.imageStyle === 'normal') ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>Padrão</button>
               <button onClick={() => onChange({ imageStyle: 'polaroid' })} className={`px-2 py-1 text-xs rounded ${el.imageStyle === 'polaroid' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>Polaroid</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
             </>
           )}

           {el.type === 'text' && (
             <>
               <button onClick={() => onChange({ fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`px-2 py-1 text-xs rounded ${el.fontWeight === 'bold' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>B</button>
               <button onClick={() => onChange({ fontSize: (el.fontSize || 14) - 2 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700">A-</button>
               <button onClick={() => onChange({ fontSize: (el.fontSize || 14) + 2 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700">A+</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
               <button onClick={() => onChange({ textColor: '#dc2626' })} className="w-4 h-4 rounded-full bg-red-600 hover:scale-110"></button>
               <button onClick={() => onChange({ textColor: '#000000' })} className="w-4 h-4 rounded-full bg-black border hover:scale-110"></button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
             </>
           )}

           {['circle', 'arrow', 'cross', 'drawing'].includes(el.type) && (
             <>
               <button onClick={() => onChange({ textColor: '#ef4444' })} className="w-4 h-4 rounded-full bg-red-500 hover:scale-110 border border-slate-600"></button>
               <button onClick={() => onChange({ textColor: '#000000' })} className="w-4 h-4 rounded-full bg-black border hover:scale-110 border border-slate-600"></button>
               <button onClick={() => onChange({ textColor: '#3b82f6' })} className="w-4 h-4 rounded-full bg-blue-500 hover:scale-110 border border-slate-600"></button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
               <button onClick={() => onChange({ angle: (el.angle ?? 0) - 15 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Esquerda">↺</button>
               <button onClick={() => onChange({ angle: (el.angle ?? 0) + 15 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Direita">↻</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
             </>
           )}

           {el.type === 'redact' && (
             <>
               <button onClick={() => onChange({ textColor: '#000000' })} className="w-4 h-4 rounded-full bg-black hover:scale-110 border border-slate-600" title="Censura Preta"></button>
               <button onClick={() => onChange({ textColor: '#fef08a' })} className="w-4 h-4 rounded-full bg-yellow-300 hover:scale-110 border border-slate-600" title="Marca Texto Amarelo"></button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
               <button onClick={() => onChange({ angle: (el.angle ?? 0) - 15 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Esquerda">↺</button>
               <button onClick={() => onChange({ angle: (el.angle ?? 0) + 15 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Direita">↻</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
             </>
           )}

           {el.type === 'stamp' && (
             <>
               <button onClick={() => onChange({ content: 'SECRET', textColor: '#dc2626', width: 220, height: 60 })} className={`px-2 py-1 text-xs rounded ${el.content === 'SECRET' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>SECRET</button>
               <button onClick={() => onChange({ content: 'TOP SECRET', textColor: '#dc2626', width: 300, height: 60 })} className={`px-2 py-1 text-xs rounded ${el.content === 'TOP SECRET' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>TOP SECRET</button>
               <button onClick={() => onChange({ content: 'CONFIDENTIAL', textColor: '#dc2626', width: 300, height: 60 })} className={`px-2 py-1 text-xs rounded ${el.content === 'CONFIDENTIAL' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>CONFIDENTIAL</button>
               <button onClick={() => onChange({ content: 'INTERNAL USE', textColor: '#000000', width: 300, height: 60 })} className={`px-2 py-1 text-xs rounded ${el.content === 'INTERNAL USE' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>INTERNAL USE</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
               <button onClick={() => onChange({ fontSize: (el.fontSize || 32) - 4 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Diminuir">A-</button>
               <button onClick={() => onChange({ fontSize: (el.fontSize || 32) + 4 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Aumentar">A+</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
               <button onClick={() => onChange({ angle: (el.angle ?? -15) - 15 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Esquerda">↺</button>
               <button onClick={() => onChange({ angle: (el.angle ?? -15) + 15 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Direita">↻</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
             </>
           )}

           <button 
             onClick={(e) => { e.stopPropagation(); onDelete(); }}
             className="px-2 py-1 rounded hover:bg-red-600 text-red-400 hover:text-white transition-colors"
             title="Excluir Elemento"
           >
             <Trash2 className="w-3.5 h-3.5" />
           </button>
           {onMoveToNextPage && (
             <button 
               onClick={(e) => { e.stopPropagation(); onMoveToNextPage(); }}
               className="px-2 py-1 rounded hover:bg-blue-600 text-blue-400 hover:text-white transition-colors"
               title="Mover para a Próxima Página"
             >
               <ArrowDownToLine className="w-3.5 h-3.5" />
             </button>
           )}
        </div>
      )}

      <div 
        className="w-full h-full relative" 
        onDoubleClick={handleDoubleClick}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        {el.type === 'text' ? (
          isEditing ? (
            <textarea
              autoFocus
              className="w-full h-full bg-blue-50/50 border-none outline-none resize-none font-sans"
              style={{
                fontSize: el.fontSize || 14,
                fontWeight: el.fontWeight || 'normal',
                color: el.textColor || '#000000',
              }}
              value={tempText}
              onChange={(e) => {
                 setTempText(e.target.value);
                 if (e.target.scrollHeight > el.height) {
                    onChange({ height: e.target.scrollHeight });
                 }
              }}
              onBlur={handleBlur}
            />
          ) : (
            <div 
              className="w-full h-full whitespace-pre-wrap font-sans cursor-text overflow-hidden leading-relaxed"
              style={{
                fontSize: el.fontSize || 14,
                fontWeight: el.fontWeight || 'normal',
                color: el.textColor || '#000000',
              }}
            >
              {el.content}
            </div>
          )
        ) : el.type === 'image' ? (
          el.imageStyle === 'polaroid' ? (
            <div className="w-full h-full bg-[#f8f8f8] p-3 pb-12 shadow-md border border-slate-200 pointer-events-none relative shadow-[2px_4px_12px_rgba(0,0,0,0.15)] flex flex-col">
              {/* Fita adesiva */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-yellow-100/60 shadow-[0_1px_2px_rgba(0,0,0,0.1)] transform -rotate-3 z-10"></div>
              
              <div className="flex-1 w-full relative overflow-hidden bg-black">
                 <img src={el.content} className="absolute inset-0 w-full h-full object-cover grayscale-[20%] contrast-125" alt="" />
              </div>
              <div className="absolute bottom-3 left-0 w-full text-center font-mono text-sm text-black/60 font-bold uppercase tracking-widest">EVIDENCE</div>
            </div>
          ) : (
            <img src={el.content} className="w-full h-full object-cover pointer-events-none shadow" alt="" />
          )
        ) : el.type === 'circle' ? (
          <div className="w-full h-full pointer-events-none" style={{ transform: `rotate(${el.angle ?? 0}deg)` }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible drop-shadow-sm opacity-90">
              <path 
                vectorEffect="non-scaling-stroke" 
                d="M 80 25 C 60 5, 20 10, 15 45 C 10 80, 40 95, 75 85 C 100 75, 95 30, 75 15 C 60 5, 45 15, 40 25" 
                fill="none" 
                stroke={el.textColor || '#ef4444'} 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </div>
        ) : el.type === 'arrow' ? (
          <div className="w-full h-full pointer-events-none" style={{ transform: `rotate(${el.angle ?? 0}deg)` }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
              <path d="M10,50 Q40,40 90,50 M70,30 Q85,45 90,50 Q80,65 70,70" fill="none" stroke={el.textColor || '#ef4444'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : el.type === 'cross' ? (
          <div className="w-full h-full pointer-events-none" style={{ transform: `rotate(${el.angle ?? 0}deg)` }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible drop-shadow-sm opacity-90">
              <path 
                vectorEffect="non-scaling-stroke" 
                d="M 15 15 Q 50 45, 85 85 M 20 85 Q 55 45, 80 15" 
                fill="none" 
                stroke={el.textColor || '#ef4444'} 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </div>
        ) : el.type === 'redact' ? (
          <div 
            className="w-full h-full pointer-events-none" 
            style={{ 
              transform: `rotate(${el.angle ?? 0}deg)`,
              mixBlendMode: (el.textColor === '#fef08a' || el.textColor === '#ffff00') ? 'multiply' : 'normal',
              opacity: (el.textColor === '#fef08a' || el.textColor === '#ffff00') ? 0.45 : 0.95
            }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible drop-shadow-sm">
              <path 
                d="M 1 15 Q 15 5 50 12 T 99 8 L 97 88 Q 80 95 50 85 T 2 92 Z" 
                fill={el.textColor || '#000000'} 
              />
            </svg>
          </div>
        ) : el.type === 'drawing' && el.points ? (
          <div className="w-full h-full pointer-events-none" style={{ transform: `rotate(${el.angle ?? 0}deg)` }}>
            <svg viewBox={`0 0 ${el.width} ${el.height}`} className="w-full h-full overflow-visible drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
               <polyline 
                 points={el.points.map(p => `${p.x},${p.y}`).join(' ')} 
                 fill="none" 
                 stroke={el.textColor || '#000000'} 
                 strokeWidth="3" 
                 strokeLinecap="round" 
                 strokeLinejoin="round" 
               />
            </svg>
          </div>
        ) : el.type === 'stamp' ? (
          <div className="w-full h-full flex items-center justify-center pointer-events-none" style={{ transform: `rotate(${el.angle ?? -15}deg)` }}>
            <div 
              className="inline-flex items-center justify-center font-bold font-serif opacity-80 uppercase"
              style={{ 
                color: el.textColor || '#dc2626',
                borderColor: el.textColor || '#dc2626',
                borderWidth: '4px',
                fontSize: el.fontSize || 32,
                padding: '4px 16px',
                lineHeight: '1.2',
                whiteSpace: 'nowrap'
              }}
            >
              {el.content || 'CONFIDENTIAL'}
            </div>
          </div>
        ) : null}
      </div>
    </Rnd>
  );
}

export function RelatorioWindow({ isMaximized, onClose, onMinimize, onMaximize }: { isMaximized: boolean, onClose: () => void, onMinimize: () => void, onMaximize: () => void }) {
  const [metadata, setMetadata] = useState<RelatorioMetadata>(DEFAULT_METADATA);
  const [pages, setPages] = useState<EditorPage[]>([]);
  const [coverElements, setCoverElements] = useState<ReportElement[]>([]);
  const [isSignedMode, setIsSignedMode] = useState(false);
  const [isDiretorMode, setIsDiretorMode] = useState(false);
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [sealBase64, setSealBase64] = useState<string>('');
  const docRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const [linkGerado, setLinkGerado] = useState(false);
  
  const [drawMode, setDrawMode] = useState(false);
  const [activeDrawPage, setActiveDrawPage] = useState<string | null>(null);
  const [currentPathPoints, setCurrentPathPoints] = useState<{x:number, y:number}[]>([]);

  useEffect(() => {
    const fetchLocalImage = async () => {
      try {
        const logoUrl = '/logo.png';
        setSealBase64(logoUrl);
        const res = await fetch(logoUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) setSealBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (e) { console.error(e); }
    };
    fetchLocalImage();

    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');
    if (dataParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(dataParam)));
        
        if (decoded.pages) {
          setPages(decoded.pages);
          setMetadata({
            directiveNo: decoded.directiveNo,
            operationName: decoded.operationName,
            issueDate: decoded.issueDate,
            agentName: decoded.agentName,
            classification: decoded.classification,
            agenteAssinatura: decoded.agenteAssinatura,
            diretorAssinatura: decoded.diretorAssinatura
          });
        } else if (Object.keys(decoded).length > 0) {
          // Legacy payload
          setMetadata({
            directiveNo: decoded.directiveNo || '',
            operationName: decoded.nomeOperacao || '',
            issueDate: decoded.dataSolicitacao || new Date().toISOString().split('T')[0],
            agentName: decoded.requerenteBadge || '',
            classification: decoded.classification || 'RELATÓRIO DE INVESTIGAÇÃO',
            agenteAssinatura: decoded.agenteAssinatura,
            diretorAssinatura: decoded.diretorAssinatura
          });
          setPages(migrateLegacyData(decoded));
        } else {
          setPages(migrateLegacyData({}));
        }

        if (decoded.diretorAssinatura) setIsSignedMode(true);
        if (params.get('mode') === 'diretor' && !decoded.diretorAssinatura) setIsDiretorMode(true);
      } catch (e) {
        console.error("Erro ao carregar dados", e);
        setPages(migrateLegacyData({}));
      }
    } else {
      setPages(migrateLegacyData({}));
    }
  }, []);

  const handleMetadataChange = (key: keyof RelatorioMetadata, value: string) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const addElement = (pageId: string, type: ElementType, customContent?: string) => {
    let content = 'Novo Texto';
    let width = 300;
    let height = 100;

    if (type === 'stamp') {
      content = 'CONFIDENCIAL';
      width = 250;
      height = 60;
    } else if (type === 'image' && customContent) {
      content = customContent;
      width = 200;
      height = 200;
    } else if (type === 'circle' || type === 'arrow') {
      content = '';
      width = 150;
      height = 150;
    } else if (type === 'cross') {
      content = '';
      width = 100;
      height = 100;
    } else if (type === 'redact') {
      content = '';
      width = 240;
      height = 24;
    }

    const newEl: ReportElement = {
      id: uuidv4(),
      type,
      x: 100,
      y: 100,
      width,
      height,
      content,
      fontSize: 14,
      textColor: type === 'stamp' ? '#dc2626' : '#000000'
    };

    setPages(prev => prev.map(p => {
      if (p.id === pageId) {
        return { ...p, elements: [...p.elements, newEl] };
      }
      return p;
    }));
    setSelectedElement(newEl.id);
  };

  const handleImageUpload = (pageId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) addElement(pageId, 'image', reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const updateElement = (pageId: string, elId: string, updates: Partial<ReportElement>) => {
    if (pageId === 'cover') {
      setCoverElements(prev => prev.map(el => el.id === elId ? { ...el, ...updates } : el));
      return;
    }
    setPages(prev => prev.map(p => {
      if (p.id === pageId) {
        const oldEl = p.elements.find(e => e.id === elId);
        let newElements = p.elements.map(el => el.id === elId ? { ...el, ...updates } : el);
        
        // Auto-push layout logic: If height grows, push elements below it downwards
        if (updates.height !== undefined && oldEl && updates.height > oldEl.height) {
           const dy = updates.height - oldEl.height;
           newElements = newElements.map(e => {
              if (e.id !== elId && e.y >= oldEl.y + oldEl.height - 20) {
                 return { ...e, y: e.y + dy };
              }
              return e;
           });
        }
        
        return { ...p, elements: newElements };
      }
      return p;
    }));
  };

  const moveElementToNextPage = (pageIndex: number, elId: string) => {
    setPages(prev => {
      const newPages = [...prev];
      const sourcePage = newPages[pageIndex];
      const elIndex = sourcePage.elements.findIndex(e => e.id === elId);
      if (elIndex === -1) return prev;
      
      const elToMove = { ...sourcePage.elements[elIndex], y: 150 };
      sourcePage.elements.splice(elIndex, 1);
      
      if (pageIndex + 1 < newPages.length) {
        newPages[pageIndex + 1].elements.push(elToMove);
      } else {
        newPages.push({ id: uuidv4(), elements: [elToMove] });
      }
      return newPages;
    });
  };

  const deleteElement = (pageId: string, elId: string) => {
    if (pageId === 'cover') {
      setCoverElements(prev => prev.filter(el => el.id !== elId));
      setSelectedElement(null);
      return;
    }
    setPages(prev => prev.map(p => {
      if (p.id === pageId) {
        return { ...p, elements: p.elements.filter(el => el.id !== elId) };
      }
      return p;
    }));
    setSelectedElement(null);
  };

  const addCoverElement = (type: ElementType) => {
    const el: ReportElement = {
      id: uuidv4(),
      type,
      x: 290,
      y: 800,
      width: type === 'stamp' ? 300 : 200,
      height: type === 'stamp' ? 60 : 40,
      content: type === 'stamp' ? 'CONFIDENTIAL' : '',
      angle: type === 'stamp' ? -15 : 0,
      textColor: '#dc2626'
    };
    setCoverElements([...coverElements, el]);
  };

  const addPage = () => {
    setPages([...pages, { id: uuidv4(), elements: [] }]);
  };

  const deletePage = (id: string) => {
    if (pages.length > 1) {
      setPages(pages.filter(p => p.id !== id));
    }
  };

  const gerarLink = () => {
    const dataString = btoa(encodeURIComponent(JSON.stringify({ ...metadata, pages })));
    const url = `${window.location.origin}${window.location.pathname}?data=${dataString}&mode=agente`;
    navigator.clipboard.writeText(url);
    setLinkGerado(true);
    setTimeout(() => setLinkGerado(false), 3000);
  };

  const exportSingleImage = async (element: HTMLElement, filename: string, bgColor: string = 'rgba(0,0,0,0)') => {
    const blob = await toBlob(element, { pixelRatio: 2, backgroundColor: bgColor });
    if (!blob) throw new Error('Falha ao gerar');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportDocument = async () => {
    if (!docRef.current || !coverRef.current) return;
    setIsExporting(true);
    setSelectedElement(null); // Clear selection rings
    
    // Give react time to remove selection rendering
    await new Promise(r => setTimeout(r, 100));

    try {
      await exportSingleImage(coverRef.current, `1_Capa_${metadata.directiveNo || 'Relatorio'}.png`, '#c29b6c');
      await new Promise(r => setTimeout(r, 500));
      
      const pageElements = docRef.current.querySelectorAll('.document-page');
      for (let i = 0; i < pageElements.length; i++) {
        await exportSingleImage(pageElements[i] as HTMLElement, `${i + 2}_Pagina_${i + 1}_${metadata.directiveNo || 'Relatorio'}.png`);
        await new Promise(res => setTimeout(res, 500));
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar documento.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      className={`absolute bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col z-50 pointer-events-auto transition-all duration-200 ${
        isMaximized 
          ? 'inset-0 rounded-none' 
          : 'inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[1200px] md:h-[800px] rounded-lg'
      }`}
      onClick={() => setSelectedElement(null)}
    >
      {/* App Titlebar */}
      <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-3 select-none" onDoubleClick={onMaximize}>
        <div className="flex items-center gap-2 text-slate-300">
          <img src="https://kappa.lol/TkFgCM" alt="Icon" className="w-5 h-5 rounded-sm" referrerPolicy="no-referrer" />
          <span className="text-sm font-medium">F.I.B - Sistema de Relatórios</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMinimize} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={onMaximize} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors hidden md:block">
            <Square className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-14 bg-slate-800 flex items-center justify-between px-4 shrink-0 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-slate-300 mr-4">DADOS DE CAPA:</div>
          <input type="text" placeholder="Op. Name" value={metadata.operationName} onChange={e => handleMetadataChange('operationName', e.target.value)} className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
          <input type="text" placeholder="Directive" value={metadata.directiveNo} onChange={e => handleMetadataChange('directiveNo', e.target.value)} className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
          <input type="text" placeholder="Agent" value={metadata.agentName} onChange={e => handleMetadataChange('agentName', e.target.value)} className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setDrawMode(!drawMode); setSelectedElement(null); }} 
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors font-medium border ${drawMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
          >
            <PenTool className="w-4 h-4" />
            {drawMode ? 'Desativar Caneta' : 'Caneta Livre'}
          </button>
          
          <button onClick={gerarLink} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm transition-colors">
             {linkGerado ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4" />}
             {linkGerado ? 'Link Copiado!' : 'Copiar Link / Salvar'}
          </button>
          <button onClick={exportDocument} disabled={isExporting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" />
            {isExporting ? 'Exportando...' : 'Exportar Tudo'}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div 
        className="flex-1 overflow-y-auto bg-slate-950 p-8 custom-scrollbar"
        onClick={() => setSelectedElement(null)}
      >
        <div className="flex flex-col items-center gap-16 pb-32">
          
          {/* COVER PAGE */}
          <div className="relative w-[880px] h-[1200px] flex items-center justify-center shrink-0">
             {/* TOOLBAR FOR COVER */}
             {!isSignedMode && (
               <div className="absolute -left-16 top-10 flex flex-col gap-2">
                 <button onClick={() => addCoverElement('stamp')} className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-white shadow" title="Adicionar Carimbo">
                   <span className="text-xs font-bold font-serif px-1 border-2 border-slate-300 rounded-sm italic">C</span>
                 </button>
               </div>
             )}

             <div ref={coverRef} className="relative w-[880px] h-[1200px] flex items-center justify-center overflow-hidden shadow-2xl" style={{ backgroundColor: '#c29b6c' }}>
                <div className="relative z-10 flex flex-col items-center w-full px-24">
                   {sealBase64 ? (
                     <img src={sealBase64} alt="FIB Seal" className="w-64 h-64 object-contain mb-16 opacity-90" />
                   ) : (
                     <div className="w-64 h-64 bg-black/10 rounded-full mb-16" />
                   )}
                
                <h1 className="text-5xl font-serif font-bold text-black/80 tracking-[0.2em] mb-4 text-center leading-tight">
                  FEDERAL<br />INVESTIGATION<br />BUREAU
                </h1>
                
                <div className="w-full h-1 bg-black/60 mb-2"></div>
                <div className="w-full h-0.5 bg-black/40 mb-16"></div>

                <input 
                  type="text" 
                  value={metadata.classification} 
                  onChange={e => handleMetadataChange('classification', e.target.value)}
                  className="w-full text-3xl font-bold text-black/80 tracking-widest text-center mb-8 uppercase bg-transparent outline-none focus:bg-white/10 p-2 rounded" 
                />
                
                <div className="w-full max-w-2xl space-y-6">
                  <div className="flex items-end gap-4">
                    <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">Directive No.:</span>
                    <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2">{metadata.directiveNo || '---'}</div>
                  </div>
                  <div className="flex items-end gap-4">
                    <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">Operation:</span>
                    <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2 truncate">{metadata.operationName || '---'}</div>
                  </div>
                  <div className="flex items-end gap-4">
                    <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">Issue Date:</span>
                    <input type="date" value={metadata.issueDate} onChange={e => handleMetadataChange('issueDate', e.target.value)} className="bg-transparent border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 outline-none w-48" />
                  </div>
                  <div className="flex items-end gap-4">
                    <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">Agent:</span>
                    <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2">{metadata.agentName || '---'}</div>
                  </div>
                </div>

                {/* COVER ELEMENTS */}
                {coverElements.map(el => (
                  <DraggableElement
                    key={el.id}
                    el={el}
                    selected={selectedElement === el.id}
                    onSelect={() => setSelectedElement(el.id)}
                    onChange={(changes) => updateElement('cover', el.id, changes)}
                    onDelete={() => deleteElement('cover', el.id)}
                    readOnly={isSignedMode}
                  />
                ))}
             </div>
          </div>
          </div>

          <div ref={docRef} className="flex flex-col gap-16 items-center w-full">
            {pages.map((page, index) => (
              <div key={page.id} className="relative w-[880px] h-[1200px] flex items-center justify-center shrink-0">
                {/* TOOLBAR FOR THIS PAGE */}
                {!isSignedMode && (
                  <div className="absolute -left-16 top-10 flex flex-col gap-2">
                     <button onClick={() => addElement(page.id, 'text')} className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-white shadow relative group" title="Adicionar Bloco de Texto">
                       <Type className="w-5 h-5"/>
                     </button>
                     <button onClick={() => handleImageUpload(page.id)} className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-white shadow" title="Adicionar Imagem">
                       <ImageIcon className="w-5 h-5"/>
                     </button>
                     <div className="w-full h-px bg-slate-700 my-1"></div>
                     <button onClick={() => addElement(page.id, 'circle')} className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-red-500 shadow" title="Adicionar Círculo a Mão (Rabisco)">
                       <Circle className="w-5 h-5"/>
                     </button>
                     <button onClick={() => addElement(page.id, 'arrow')} className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-red-500 shadow" title="Adicionar Seta a Mão">
                       <MoveUpRight className="w-5 h-5"/>
                     </button>
                     <button onClick={() => addElement(page.id, 'cross')} className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-red-500 shadow" title="Adicionar Cruz/X a Mão">
                       <X className="w-5 h-5"/>
                     </button>
                     <button onClick={() => addElement(page.id, 'redact')} className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-black shadow pointer-events-auto" title="Adicionar Tarja/Rabiscos">
                       <Highlighter className="w-5 h-5"/>
                     </button>
                     <div className="w-full h-px bg-slate-700 my-1"></div>
                     <button onClick={() => addElement(page.id, 'stamp')} className="p-2 w-full flex justify-center bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-white shadow" title="Adicionar Carimbo">
                       <span className="text-xs font-bold font-serif px-1 border-2 border-slate-300 rounded-sm italic">C</span>
                     </button>
                     <button onClick={() => deletePage(page.id)} className="p-2 bg-red-900/50 text-red-300 rounded hover:bg-red-800 hover:text-white shadow mt-4" title="Excluir Página">
                       <Trash className="w-5 h-5"/>
                     </button>
                  </div>
                )}

                <div className="absolute inset-0 shadow-2xl" style={{ backgroundColor: '#d4b082' }}>
                  <div className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>
                </div>

                {/* PAPER */}
                <div 
                  className={`document-page relative w-[794px] h-[1123px] bg-white shadow-xl flex flex-col z-10 overflow-hidden ${drawMode ? 'cursor-crosshair' : ''}`}
                  onPointerDown={(e) => {
                    if (!drawMode) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    setActiveDrawPage(page.id);
                    setCurrentPathPoints([{x, y}]);
                  }}
                  onPointerMove={(e) => {
                    if (activeDrawPage !== page.id || currentPathPoints.length === 0) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    setCurrentPathPoints(prev => [...prev, {x, y}]);
                  }}
                  onPointerUp={(e) => {
                    if (activeDrawPage === page.id && currentPathPoints.length > 1) {
                       e.currentTarget.releasePointerCapture(e.pointerId);
                       const minX = Math.min(...currentPathPoints.map(p => p.x));
                       const minY = Math.min(...currentPathPoints.map(p => p.y));
                       const maxX = Math.max(...currentPathPoints.map(p => p.x));
                       const maxY = Math.max(...currentPathPoints.map(p => p.y));
                       
                       const normPoints = currentPathPoints.map(p => ({ x: p.x - minX, y: p.y - minY }));
                       
                       const newEl: ReportElement = {
                          id: uuidv4(),
                          type: 'drawing',
                          x: minX,
                          y: minY,
                          width: Math.max(maxX - minX, 10),
                          height: Math.max(maxY - minY, 10),
                          points: normPoints,
                          content: '',
                          textColor: '#000000',
                          angle: 0
                       };
                       
                       setPages(prev => prev.map(p => p.id === page.id ? { ...p, elements: [...p.elements, newEl] } : p));
                    }
                    setCurrentPathPoints([]);
                    setActiveDrawPage(null);
                  }}
                >
                  {/* Drawing Indicator layer */}
                  {activeDrawPage === page.id && currentPathPoints.length > 0 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-50">
                       <polyline 
                         points={currentPathPoints.map(p => `${p.x},${p.y}`).join(' ')} 
                         fill="none" 
                         stroke="#000000" 
                         strokeWidth="3" 
                         strokeLinecap="round" 
                         strokeLinejoin="round" 
                       />
                    </svg>
                  )}

                  {sealBase64 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden z-0">
                      <img src={sealBase64} alt="" className="w-[600px] h-[600px] object-contain grayscale" />
                    </div>
                  )}

                  {/* Header */}
                  <div className="h-32 mx-16 pt-12 shrink-0 flex items-start justify-between border-b-2 border-black/80 z-0">
                    {sealBase64 && <img src={sealBase64} alt="FIB" className="w-16 h-16 object-contain" />}
                    <h2 className="text-xl font-bold font-serif tracking-wider text-black/90">FEDERAL INVESTIGATION BUREAU</h2>
                  </div>

                  {/* Content Canvas */}
                  <div className="flex-1 relative mx-2 z-20">
                    {page.elements.map(el => (
                      <DraggableElement 
                        key={el.id} 
                        el={el} 
                        selected={selectedElement === el.id}
                        onSelect={() => setSelectedElement(el.id)}
                        onChange={(updates) => updateElement(page.id, el.id, updates)}
                        onDelete={() => deleteElement(page.id, el.id)}
                        onMoveToNextPage={() => moveElementToNextPage(index, el.id)}
                        readOnly={isSignedMode}
                      />
                    ))}

                    {/* Footer Signature Area on Last Page ONLY */}
                    {index === pages.length - 1 && (
                       <div className="absolute bottom-10 w-full flex justify-between px-16 z-0">
                         <div className="text-center w-56 relative z-0">
                           {metadata.agenteAssinatura && <div className="absolute bottom-6 w-full text-center pointer-events-none"><span className="font-signature text-4xl text-[#0000a0] -rotate-2 opacity-90">{metadata.agenteAssinatura}</span></div>}
                           <div className="border-b border-black mb-2"></div>
                           <p className="text-sm font-bold text-black border-none bg-transparent m-0 p-0">Assinatura do Agente</p>
                           {!isSignedMode && !metadata.agenteAssinatura && !isDiretorMode && (
                              <input type="text" placeholder="Assinar (Nome)" className="w-full mt-2 text-xs border rounded px-1 py-1 bg-white/50" onBlur={(e) => handleMetadataChange('agenteAssinatura', e.target.value)} />
                           )}
                         </div>
                         <div className="text-center w-56 relative z-0">
                           {metadata.diretorAssinatura && <div className="absolute bottom-6 w-full text-center pointer-events-none"><span className="font-signature text-5xl text-black -rotate-2 opacity-90">{metadata.diretorAssinatura}</span></div>}
                           <div className="border-b border-black mb-2"></div>
                           <p className="text-sm font-bold text-black border-none bg-transparent m-0 p-0">Assinatura Diretoria</p>
                           {!isSignedMode && isDiretorMode && !metadata.diretorAssinatura && (
                              <input type="text" placeholder="Assinar Diretoria" className="w-full mt-2 text-xs border rounded px-1 py-1 bg-white/50" onBlur={(e) => handleMetadataChange('diretorAssinatura', e.target.value)} />
                           )}
                         </div>
                       </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="h-16 shrink-0 border-t border-black/20 mx-16 flex items-center justify-between text-xs text-black/50 font-mono z-0">
                    <span>F.I.B - CONFIDENTIAL</span>
                    <span>Page {index + 1} of {pages.length}</span>
                    <span>{metadata.directiveNo || 'UNREGISTERED'}</span>
                  </div>
                </div>
              </div>
            ))}

            {!isSignedMode && (
              <button onClick={addPage} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-full shadow-lg transition-all hover:scale-105">
                 <PlusCircle className="w-5 h-5" />
                 Adicionar Nova Página
              </button>
            )}

          </div>
        </div>
      </div>
    </motion.div>
  );
}
