import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, Download, Image as ImageIcon, Type, Save, Square,
  Trash2, Check, Copy, FileText, Maximize2, Minimize2, X, PlusCircle, Trash,
  Circle, Minus, ArrowDownToLine, MoveUpRight, PenTool, Highlighter, Loader2, Move, Send, Undo2
} from 'lucide-react';
import { toBlob } from 'html-to-image';
import { Rnd } from 'react-rnd';
import { v4 as uuidv4 } from 'uuid';
import { useAuth, OperationType, handleFirestoreError } from './contexts/AuthContext';
import { db } from './lib/firebase';
import { 
  collection, addDoc, updateDoc, doc, getDoc, getDocs, query, arrayUnion,
  serverTimestamp, onSnapshot 
} from 'firebase/firestore';

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
  fontStyle?: string;
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
  diretorName?: string;
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
  const pages: EditorPage[] = []  // Page 1
  pages.push({
    id: uuidv4(),
    elements: [
      { id: uuidv4(), type: 'text', x: 64, y: 120, width: 660, height: 150, content: '1. OBJETIVO DA INVESTIGAÇÃO\n\n Definir de forma clara o propósito da investigação. Deve indicar quais crimes ou atividades estão sendo apuradas e qual o resultado esperado, ex: coleta de provas, identificação de membros, desarticulação da organização.\n' + (legacy.objetivo || ''), fontWeight: 'normal', fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 300, width: 660, height: 150, content: '2. ORGANIZAÇÃO INVESTIGADA\n\n Detalhamento do grupo investigado. Inclui nome, natureza da organização, área de atuação e características estruturais que indiquem organização criminosa (hierarquia, divisão de funções, atuação coordenada).' + (legacy.organizacao || ''), fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 500, width: 660, height: 250, content: '3. HISTÓRICO DE OCORRÊNCIAS\n\n Registro cronológico de todas as ocorrências relacionadas aos alvos ou à organização. Serve para demonstrar padrão de comportamento, reincidência e evolução da atividade criminosa.' + (legacy.historico || ''), fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 800, width: 660, height: 150, content: '4. ANÁLISE DE PADRÃO CRIMINAL\n\n Seção analítica onde irá interpretar os dados coletados. Aqui se identificam padrões, conexões entre indivíduos, frequência de crimes e possível escalada de violência ou organização.' + (legacy.analise || ''), fontSize: 12 }
    ]
  });

  // Page 2
  pages.push({
    id: uuidv4(),
    elements: [
      { id: uuidv4(), type: 'text', x: 64, y: 120, width: 660, height: 200, content: '5. INTELIGÊNCIA COLETADA\n\n Resumo dos métodos e informações obtidas durante a investigação, como vigilância, registros, relatórios e outras formas de coleta. Não precisa expor tudo, mas deve justificar a base informacional do caso.' + (legacy.inteligencia || ''), fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 350, width: 660, height: 150, content: '6. FUNDAMENTAÇÃO LEGAL\n\n Base legal que sustenta a investigação e possíveis medidas futuras. Deve indicar quais crimes ou enquadramentos jurídicos se aplicam, especialmente em casos de organização criminosa estruturada.' + (legacy.fundamentacao || ''), fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 550, width: 660, height: 150, content: '7. MEDIDAS OPERACIONAIS ATIVAS\n\n Lista das ações já autorizadas no âmbito do protocolo ativo, como abordagens, monitoramento e preparação para operações maiores, se houverem. Define o que os agentes podem ou não fazer naquele momento.' + (legacy.medidas || ''), fontSize: 12 },
      { id: uuidv4(), type: 'text', x: 64, y: 750, width: 660, height: 150, content: '8. CONCLUSÃO\n\n Síntese final da investigação até o momento. Deve indicar se há elementos suficientes para avançar (ex: raid, mandado) ou se a investigação precisa continuar.' + (legacy.conclusao || ''), fontSize: 12 }
    ]
  });

  // Page 3 (Signature Page)
  pages.push({
    id: uuidv4(),
    elements: [
       { id: uuidv4(), type: 'text', x: 64, y: 120, width: 660, height: 400, content: '9. DECLARAÇÃO FINAL\n\n “Declaro, sob responsabilidade funcional e na observância dos princípios constitucionais de legalidade, devido processo legal e proteção de direitos individuais, que as informações constantes neste relatório correspondem fielmente aos fatos apurados durante o período indicado, estando em conformidade com as diretrizes operacionais da Divisão de Inteligência e Fiscalização de Investigações da Federal Investigation Bureau, bem como com os procedimentos previstos no Standard Operating Procedures da Agência e nas normas legais aplicáveis aos procedimentos investigativos federais.”\n\n\n\n Data:', fontSize: 12 }
    ]
  });

  return pages;
}

function DraggableElement({ 
  el, selected, onSelect, onChange, onDelete, onMoveToNextPage, readOnly, boundsSelector
}: { 
  el: ReportElement;
  selected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<ReportElement>) => void;
  onDelete: () => void;
  onMoveToNextPage?: () => void;
  readOnly: boolean;
  boundsSelector: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Sync content when not editing
  useEffect(() => {
    if (textRef.current && textRef.current.innerHTML !== el.content && !isEditing && el.type === 'text') {
      textRef.current.innerHTML = el.content;
    }
  }, [el.content, isEditing, el.type]);

  // Focus when entering edit mode
  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (readOnly || el.type !== 'text') return;
    setIsEditing(true);
    e.stopPropagation();
  };

  const handleBlur = () => {
    if (el.type === 'text' && textRef.current) {
      setIsEditing(false);
      onChange({ content: textRef.current.innerHTML });
    }
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
      bounds={boundsSelector}
      dragHandleClassName="drag-handle"
      className={`group ${selected && !readOnly ? 'ring-2 ring-blue-500/50' : ''}`}
      style={{ zIndex: selected ? 10 : 1 }}
    >
      {selected && !readOnly && (
        <div 
          className="absolute -top-12 left-0 bg-slate-800 text-white p-1 rounded shadow flex gap-1 items-center z-50 whitespace-nowrap"
          onMouseDown={(e) => {
            // Prevent blur of contentEditable when clicking toolbar buttons
            if (!(e.target as Element).closest('input')) {
              e.preventDefault();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="drag-handle flex items-center justify-center w-6 h-6 hover:bg-slate-700 bg-blue-600 rounded cursor-move mr-1" title="Mover Elemento">
            <Move className="w-3.5 h-3.5" />
          </div>
          <div className="h-4 w-px bg-slate-600 mr-1"></div>
           {el.type === 'image' && (
             <>
               <button onClick={() => onChange({ imageStyle: 'normal' })} className={`px-2 py-1 text-xs rounded ${(!el.imageStyle || el.imageStyle === 'normal') ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>Padrão</button>
               <button onClick={() => onChange({ imageStyle: 'polaroid' })} className={`px-2 py-1 text-xs rounded ${el.imageStyle === 'polaroid' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}>Polaroid</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
             </>
           )}

           {el.type === 'text' && (
             <>
               <button 
                 onClick={(e) => {
                   if (isEditing) {
                     document.execCommand('bold', false, null);
                   } else {
                     onChange({ fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' });
                   }
                 }} 
                 className={`px-2 py-1 text-xs rounded ${el.fontWeight === 'bold' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}
               >B</button>
               <button 
                 onClick={(e) => {
                   if (isEditing) {
                     document.execCommand('italic', false, null);
                   } else {
                     onChange({ fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' });
                   }
                 }} 
                 className={`px-2 py-1 text-xs rounded ${el.fontStyle === 'italic' ? 'bg-slate-600' : 'hover:bg-slate-700'}`}
               >I</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
               <button 
                 onClick={(e) => {
                   if (isEditing) {
                     const currSize = parseInt(document.queryCommandValue('fontSize') || "3");
                     document.execCommand('fontSize', false, Math.max(1, currSize - 1).toString());
                   } else {
                     onChange({ fontSize: (el.fontSize || 14) - 1 });
                   }
                 }} 
                 className="px-2 py-1 text-xs rounded hover:bg-slate-700">A-</button>
               <button 
                 onClick={(e) => {
                   if (isEditing) {
                     const currSize = parseInt(document.queryCommandValue('fontSize') || "3");
                     document.execCommand('fontSize', false, Math.min(7, currSize + 1).toString());
                   } else {
                     onChange({ fontSize: (el.fontSize || 14) + 1 });
                   }
                 }} 
                 className="px-2 py-1 text-xs rounded hover:bg-slate-700">A+</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
               <button 
                 onClick={(e) => {
                   if (isEditing) {
                     document.execCommand('insertUnorderedList', false, null);
                   }
                 }} 
                 className="px-2 py-1 text-xs rounded hover:bg-slate-700"
                 title="Marcador"
               >•</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
               <button 
                 onClick={(e) => {
                   if (isEditing) {
                     document.execCommand('foreColor', false, '#dc2626');
                   } else {
                     onChange({ textColor: '#dc2626' });
                   }
                 }} 
                 className="w-4 h-4 rounded-full bg-red-600 hover:scale-110"
               ></button>
               <button 
                 onClick={(e) => {
                   if (isEditing) {
                     document.execCommand('foreColor', false, '#000000');
                   } else {
                     onChange({ textColor: '#000000' });
                   }
                 }} 
                 className="w-4 h-4 rounded-full bg-black border hover:scale-110"
               ></button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
             </>
           )}

           {['circle', 'arrow', 'cross', 'drawing'].includes(el.type) && (
             <>
               <button onClick={() => onChange({ textColor: '#ef4444' })} className="w-4 h-4 rounded-full bg-red-500 hover:scale-110 border border-slate-600"></button>
               <button onClick={() => onChange({ textColor: '#000000' })} className="w-4 h-4 rounded-full bg-black border hover:scale-110 border border-slate-600"></button>
               <button onClick={() => onChange({ textColor: '#3b82f6' })} className="w-4 h-4 rounded-full bg-blue-500 hover:scale-110 border border-slate-600"></button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
               <button onClick={() => onChange({ angle: (el.angle ?? 0) - 45 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Esquerda">↺</button>
               <button onClick={() => onChange({ angle: (el.angle ?? 0) + 45 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Direita">↻</button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
             </>
           )}

           {el.type === 'redact' && (
             <>
               <button onClick={() => onChange({ textColor: '#000000' })} className="w-4 h-4 rounded-full bg-black hover:scale-110 border border-slate-600" title="Censura Preta"></button>
               <button onClick={() => onChange({ textColor: '#fef08a' })} className="w-4 h-4 rounded-full bg-yellow-300 hover:scale-110 border border-slate-600" title="Marca Texto Amarelo"></button>
               <div className="h-4 w-px bg-slate-600 mx-1"></div>
               <button onClick={() => onChange({ angle: (el.angle ?? 0) - 45 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Esquerda">↺</button>
               <button onClick={() => onChange({ angle: (el.angle ?? 0) + 45 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Direita">↻</button>
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
               <button onClick={() => onChange({ angle: (el.angle ?? -15) - 45 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Esquerda">↺</button>
               <button onClick={() => onChange({ angle: (el.angle ?? -15) + 45 })} className="px-2 py-1 text-xs rounded hover:bg-slate-700" title="Girar Direita">↻</button>
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
        onClick={(e) => { 
          e.stopPropagation(); 
          if (selected && !isEditing && !readOnly && el.type === 'text') {
            setIsEditing(true);
          }
          onSelect(); 
        }}
      >
        {el.type === 'text' ? (
          <div
            ref={textRef}
            contentEditable={!readOnly && isEditing}
            suppressContentEditableWarning
            className="w-full h-full whitespace-pre-wrap font-sans overflow-hidden leading-relaxed outline-none [&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:pl-5"
            style={{
              fontSize: el.fontSize || 14,
              fontWeight: el.fontWeight || 'normal',
              fontStyle: el.fontStyle || 'normal',
              color: el.textColor || '#000000',
              cursor: isEditing ? 'text' : 'pointer',
              backgroundColor: isEditing ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
              }
            }}
            onInput={(e) => {
              if (e.currentTarget.scrollHeight > el.height) {
                 // Update height only
                 onChange({ 
                   height: e.currentTarget.scrollHeight
                 });
              }
            }}
          />
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

export function RelatorioWindow({ isMaximized, onClose, onMinimize, onMaximize, onFocus, zIndex }: { isMaximized: boolean, onClose: () => void, onMinimize: () => void, onMaximize: () => void, onFocus?: () => void, zIndex?: number }) {
  const { profile, user } = useAuth();
  const [metadata, setMetadata] = useState<RelatorioMetadata>(DEFAULT_METADATA);
  const [pages, setPages] = useState<EditorPage[]>([]);
  const [coverElements, setCoverElements] = useState<ReportElement[]>([]);
  const [isSignedMode, setIsSignedMode] = useState(false);
  
  // Custom Undo Implementation
  const stateRef = useRef({ pages, coverElements });
  useEffect(() => {
    stateRef.current = { pages, coverElements };
  }, [pages, coverElements]);
  
  const historyRef = useRef<string[]>([]);
  
  const saveHistory = useCallback(() => {
    const current = JSON.stringify(stateRef.current);
    if (historyRef.current.length === 0 || historyRef.current[historyRef.current.length - 1] !== current) {
      historyRef.current.push(current);
      if (historyRef.current.length > 50) historyRef.current.shift();
    }
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length > 0) {
      const prev = historyRef.current.pop();
      if (prev) {
        try {
          const parsed = JSON.parse(prev);
          setPages(parsed.pages);
          setCoverElements(parsed.coverElements);
          trackLocalUpdate();
        } catch (e) {
          console.error('Falha ao restaurar histórico:', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow native undo for text inputs and contenteditables
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  
  const [sealBase64, setSealBase64] = useState<string>('');
  const docRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvoFeedback, setSalvoFeedback] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadIdInput, setLoadIdInput] = useState('');
  const [recentReports, setRecentReports] = useState<{id: string, title: string, updatedAt: any}[]>([]);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isRemoteUpdate = useRef(false);
  const lastLocalUpdate = useRef<number>(Date.now());
  const hasUnsavedLocalChanges = useRef(false);
  const trackLocalUpdate = () => { 
    if (!isRemoteUpdate.current) {
      lastLocalUpdate.current = Date.now(); 
      hasUnsavedLocalChanges.current = true;
    }
  };
  
  const isMagistrateRole = (role?: string) => {
    if (!role) return false;
    const r = role.toLowerCase();
    const magistrateRoles = [
      'judge', 'juiz', 'doj', 'magistrado', 'magistrada', 'promotor', 'promotora', 
      'diretoria', 'diretor', 'diretora', 'procurador', 'procuradora', 'juiza', 'juíza',
      'tribunal', 'desembargador', 'desembargadora', 'procuradoria', 'justiça', 'justica'
    ];
    return magistrateRoles.includes(r);
  };

  const loadReport = useCallback(async (id: string, skipSync?: boolean) => {
    setLoading(true);
    setReportId(id);
    try {
      console.log(`Relatorio: Carregando documento ID: ${id}`);
      const docSnap = await getDoc(doc(db, 'reports', id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Relatorio: Dados recuperados:", data);
        
        isRemoteUpdate.current = true;
        setMetadata(data.metadata || DEFAULT_METADATA);
        
        if (!data.pages || data.pages.length === 0) {
           if (data.objetivo || data.historico || data.conclusao) {
             setPages(migrateLegacyData(data));
           } else {
             setPages([]);
           }
        } else {
           setPages(data.pages);
        }
        
        setCoverElements(data.coverElements || []);
        
        if (!skipSync) setIsCollaborative(true);
      } else {
        alert('Relatório não encontrado.');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `reports/${id}`);
    } finally {
      setLoading(false);
      isRemoteUpdate.current = false;
    }
  }, [profile]);

  const fetchRecentReports = async () => {
    if (!user) return;
    try {
      const { query, collection, where, orderBy, limit, getDocs } = await import('firebase/firestore');
      const q = query(
        collection(db, 'reports'),
        where('ownerId', '==', user.uid),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || 'Sem Título',
        updatedAt: doc.data().updatedAt
      }));
      setRecentReports(reports);
    } catch (error) {
      console.error("Erro ao buscar relatórios recentes:", error);
    }
  };

  const saveReport = async (isAutoSave = false, additionalSharedUser?: string): Promise<string | null> => {
    if (!user) return null;
    if (!isAutoSave) setSalvando(true);
    hasUnsavedLocalChanges.current = false;
    let finalId = reportId;
    try {
      // Remove any undefined properties using JSON stringify/parse
      const cleanData = JSON.parse(JSON.stringify({
        metadata,
        pages,
        coverElements,
        title: metadata.operationName || 'Relatório sem Título',
      }));
      
      const reportData: any = {
        ...cleanData,
        updatedAt: serverTimestamp()
      };

      if (finalId) {
        if (additionalSharedUser) {
           reportData.sharedWith = arrayUnion(additionalSharedUser);
        }
        await updateDoc(doc(db, 'reports', finalId), reportData);
      } else {
        const docRef = await addDoc(collection(db, 'reports'), {
          ...reportData,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          sharedWith: additionalSharedUser ? [additionalSharedUser] : []
        });
        finalId = docRef.id;
        setReportId(finalId);
      }
      if (!isAutoSave) {
        setSalvoFeedback(true);
        setTimeout(() => setSalvoFeedback(false), 3000);
      }
      return finalId;
    } catch (error) {
      if (!isAutoSave) {
        console.error("Erro ao salvar:", error);
        alert('Falha ao salvar no servidor. Baixando um backup local automaticamente para não perder seu progresso.');
        exportToJSON();
      } else {
        // If autosave fails, maybe we also want to silently alert or just backup?
        // Since autosave could spam, we optionally just export if it's not autosave.
      }
      return null;
    } finally {
      if (!isAutoSave) setSalvando(false);
    }
  };

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    try {
      console.log("Relatorio: Buscando destinatários...");
      let firestoreUsers: any[] = [];
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      firestoreUsers = querySnapshot.docs
        .map(doc => ({ uid: doc.id, ...(doc.data() as any) }))
        .filter(u => u.uid !== user?.uid);
        
      console.log(`Relatorio: Sucesso ao carregar ${firestoreUsers.length} destinatários.`);
      setRecipients(firestoreUsers);
    } catch (error) {
      console.error("Erro ao buscar destinatários:", error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleSendOrForward = async (recipient: any) => {
    if (!user || !profile) return;
    
    setIsSending(true);
    try {
      // We force a save and pass the recipient UID so they are in 'sharedWith' instantly
      const finalId = await saveReport(false, recipient.uid);
      
      if (!finalId) {
        setIsSending(false);
        return;
      }

      const reportUrl = `${window.location.origin}${window.location.pathname}?reportId=${finalId}`;
      
      await addDoc(collection(db, 'emails'), {
        fromId: user.uid,
        fromEmail: user.email,
        toId: recipient.uid,
        toEmail: recipient.email,
        subject: `Relatório Compartilhado: ${metadata.operationName || 'Relatório de Investigação'}`,
        body: `Olá, ${recipient.displayName || 'Colega'}.\n\nUm relatório foi compartilhado com você por ${profile.displayName}.\n\nPara visualizar e colaborar, clique no anexo abaixo para abri-lo diretamente no sistema e ligue a chave COLABORATIVO, ou acesse o link direto:\n${reportUrl}`,
        attachmentId: finalId,
        attachmentType: 'report',
        read: false,
        timestamp: serverTimestamp()
      });

      alert('Relatório compartilhado com sucesso!');
      setShowRecipientList(false);
    } catch (error: any) {
      console.error("Erro ao compartilhar relatório", error);
      alert('Erro ao enviar relatório: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  // Real-time listener
  useEffect(() => {
    if (!reportId || !isCollaborative) return;

    console.log("Relatorio: Iniciando listener real-time para:", reportId);
    const unsubscribe = onSnapshot(doc(db, 'reports', reportId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        if (!snapshot.metadata.hasPendingWrites) {
          // Prevent race conditions: Ignore remote updates if user typed locally in the last 3000ms
          const timeSinceLocalUpdate = Date.now() - lastLocalUpdate.current;
          if (timeSinceLocalUpdate > 3000) {
            console.log("Relatorio: Recebendo atualização remota");
            isRemoteUpdate.current = true;
            setMetadata(data.metadata || DEFAULT_METADATA);
            setPages(data.pages || []);
            setCoverElements(data.coverElements || []);
            setTimeout(() => { isRemoteUpdate.current = false; }, 100);
          } else {
            console.log("Relatorio: Ignorando atualização remota (usuário está digitando ativamente)", timeSinceLocalUpdate);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [reportId, isCollaborative]);

  useEffect(() => {
    // Listen for custom open event
    const handleOpenReport = (e: any) => {
      const detail = e.detail;
      const id = typeof detail === 'string' ? detail : detail?.id;
      console.log("Relatorio: Evento open-report recebido", { id, detail });
      if (id) {
        hasInitialized.current = true;
        loadReport(id);
      }
    };
    window.addEventListener('open-report', handleOpenReport);
    return () => window.removeEventListener('open-report', handleOpenReport);
  }, [profile, loadReport]); 

  useEffect(() => {
    const initialize = async () => {
      if (hasInitialized.current) return;

      // Check for pending report from global state (attachments)
      const pending = (window as any).pendingReport;
      if (pending) {
        hasInitialized.current = true;
        console.log("Relatorio: Carregando pendente do estado global:", pending);
        delete (window as any).pendingReport;
        await loadReport(pending.id);
        return;
      }

      // Default to a blank report if not loading one
      if (!reportId && pages.length === 0) {
        hasInitialized.current = true;
        setPages(migrateLegacyData({}));
        setMetadata(prev => ({ 
          ...prev, 
          agentName: profile?.displayName || '',
          classification: profile?.role === 'judge' ? 'SENTENÇA JUDICIAL' : 
                           profile?.role === 'lspd' ? 'RELATÓRIO DE OCORRÊNCIA' : 
                           'RELATÓRIO DE INVESTIGAÇÃO'
        }));
      }
    };

    initialize();

    const fetchLocalImage = async () => {
      try {
        const isDOJ = isMagistrateRole(profile?.role);
        const logoUrl = isDOJ ? '/logojustice.png' : '/logo.png';
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
  }, [profile, loadReport]);

  const handleMetadataChange = (key: keyof RelatorioMetadata, value: string) => {
    trackLocalUpdate();
    setMetadata(prev => {
      const updated = { ...prev, [key]: value };
      // Sync signature with names automatically
      if (key === 'agentName') {
        updated.agenteAssinatura = value;
      }
      if (key === 'diretorName') {
        updated.diretorAssinatura = value;
      }
      return updated;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Código ID (Endereço) do Relatório copiado para a área de transferência! Envie este código para quem precisa ler ou editar.');
  };

  const addElement = (pageId: string, type: ElementType, customContent?: string) => {
    saveHistory();
    trackLocalUpdate();
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
    saveHistory();
    trackLocalUpdate();
    if (pageId === 'cover') {
      setCoverElements(prev => prev.map(el => el.id === elId ? { ...el, ...updates } : el));
      return;
    }
    setPages(prev => prev.map(p => {
      if (p.id === pageId) {
        const oldEl = p.elements.find(e => e.id === elId);
        if (!oldEl) return p;
        
        let newElements = p.elements.map(el => el.id === elId ? { ...el, ...updates } : el);
        
        // Auto-push layout logic: If height grows or Y moves, check for overlaps and push elements down
        const isPushAction = (updates.height !== undefined && updates.height > oldEl.height) || 
                            (updates.y !== undefined && updates.y !== oldEl.y);

        if (isPushAction && oldEl.type === 'text') {
           // Basic constraint logic to avoid overwriting
           let changed = true;
           let iter = 0;
           while (changed && iter < 10) {
             changed = false;
             iter++;
             for (let i = 0; i < newElements.length; i++) {
               for (let j = 0; j < newElements.length; j++) {
                 if (i === j) continue;
                 const top = newElements[i];
                 const bottom = newElements[j];

                 // Only text elements push other text elements. 
                 // Overlays (images, stamps, etc) should allow overlap.
                 if (top.type !== 'text' || bottom.type !== 'text') continue;
                 
                 // If 'top' overlaps 'bottom' vertically, push 'bottom' further down
                 // We only push if top is actually above or at the same level as bottom
                 if (top.y <= bottom.y && (top.y + top.height + 15) > bottom.y) {
                    bottom.y = top.y + top.height + 15;
                    changed = true;
                 }
               }
             }
           }
        }
        
        return { ...p, elements: newElements };
      }
      return p;
    }));
  };

  const moveElementToNextPage = (pageIndex: number, elId: string) => {
    saveHistory();
    trackLocalUpdate();
    setPages(prev => {
      const newPages = [...prev];
      const sourcePage = newPages[pageIndex];
      const elIndex = sourcePage.elements.findIndex(e => e.id === elId);
      if (elIndex === -1) return prev;
      
      const elToMove = { ...sourcePage.elements[elIndex], y: 120 };
      sourcePage.elements.splice(elIndex, 1);
      
      if (pageIndex + 1 < newPages.length) {
        const targetPage = newPages[pageIndex + 1];
        // Find highest occupied spot to avoid overlap (only for text)
        let startY = 120;
        if (elToMove.type === 'text') {
          targetPage.elements.forEach(e => {
             if (e.type === 'text' && e.y + e.height > startY) {
                startY = e.y + e.height + 25;
             }
          });
        }
        targetPage.elements.push({ ...elToMove, y: startY });
      } else {
        newPages.push({ id: uuidv4(), elements: [elToMove] });
      }
      return newPages;
    });
  };

  const deleteElement = (pageId: string, elId: string) => {
    saveHistory();
    trackLocalUpdate();
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
    saveHistory();
    trackLocalUpdate();
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
    saveHistory();
    trackLocalUpdate();
    setPages([...pages, { id: uuidv4(), elements: [] }]);
  };

  const deletePage = (id: string) => {
    saveHistory();
    trackLocalUpdate();
    if (pages.length > 1) {
      setPages(pages.filter(p => p.id !== id));
    }
  };

  const exportToJSON = () => {
    const dataObj = { metadata, pages, coverElements };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `bkp_relatorio_${metadata.directiveNo || 'novo'}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const obj = JSON.parse(event.target?.result as string);
        if (obj.metadata) setMetadata(obj.metadata);
        if (obj.pages) setPages(obj.pages);
        if (obj.coverElements) setCoverElements(obj.coverElements);
        trackLocalUpdate();
        alert('Backup importado com sucesso!');
      } catch(err) {
        alert('Erro ao carregar arquivo de backup válido.');
      }
      e.target.value = ''; // Reset
    };
    reader.readAsText(file);
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
      
      const pageContainers = docRef.current.querySelectorAll('.page-export-container');
      for (let i = 0; i < pageContainers.length; i++) {
        await exportSingleImage(pageContainers[i] as HTMLElement, `${i + 2}_Pagina_${i + 1}_${metadata.directiveNo || 'Relatorio'}.png`, '#d4b082');
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
    <Rnd
      default={{
        x: window.innerWidth / 2 - 600,
        y: 40,
        width: 1200,
        height: 800,
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
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className={`bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col transition-all duration-200 w-full h-full ${
          isMaximized ? 'rounded-none' : 'rounded-lg'
        }`}
        onClick={() => setSelectedElement(null)}
      >
        {/* App Titlebar */}
        <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-3 select-none handle-drag" onDoubleClick={onMaximize}>
          <div className="flex items-center gap-2 text-slate-300 pointer-events-none">
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
          {reportId && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 mr-2 group">
              <span className="text-[10px] font-mono text-slate-500 uppercase">DOC ID:</span>
              <span className="text-[10px] font-mono text-blue-400 select-all">{reportId.substring(0, 12)}...</span>
              <button 
                onClick={(e) => { e.stopPropagation(); copyToClipboard(reportId); }}
                className="p-1 text-slate-500 hover:text-white transition-colors"
                title="Copiar ID Completo para Compartilhar"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="text-sm font-bold text-slate-300 mr-4 tracking-tight">CAPA:</div>
          <input type="text" placeholder="Nome da Operação" value={metadata.operationName} onChange={e => handleMetadataChange('operationName', e.target.value)} className="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white placeholder:text-slate-600" />
          <input type="text" placeholder="Nº Diretiva" value={metadata.directiveNo} onChange={e => handleMetadataChange('directiveNo', e.target.value)} className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white placeholder:text-slate-600" />
          <input type="text" placeholder="Nome do Agente" value={metadata.agentName} onChange={e => handleMetadataChange('agentName', e.target.value)} className="w-40 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white placeholder:text-slate-600" title="Assinatura do Agente" />
          <input type="text" placeholder="Nome do Diretor" value={metadata.diretorName || ''} onChange={e => handleMetadataChange('diretorName', e.target.value)} className="w-40 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white placeholder:text-slate-600" title="Assinatura da Diretoria (Opcional)" />
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={undo}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all sm:flex hidden bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
            Desfazer
          </button>
          
          <button onClick={exportToJSON} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm transition-colors border border-slate-600/50">
            <ArrowDownToLine className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar BKP</span>
          </button>

          <label className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm transition-colors border border-slate-600/50 cursor-pointer">
            <MoveUpRight className="w-4 h-4" />
            <span className="hidden sm:inline">Importar BKP</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button onClick={exportDocument} disabled={isExporting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm transition-colors border border-blue-400/20 min-w-[140px] justify-center">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
            {isExporting ? 'Exportando...' : 'Baixar Imagens'}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div 
        className="flex-1 overflow-y-auto bg-slate-950 p-8 custom-scrollbar min-h-64 flex flex-col items-center"
        onClick={() => setSelectedElement(null)}
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 mt-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm font-medium animate-pulse uppercase tracking-widest">Carregando Relatório de Investigação...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-16 pb-32 w-full">
          
          {/* COVER PAGE */}
          <div className="relative w-[880px] h-[1200px] flex items-center justify-center shrink-0">
             {/* TOOLBAR FOR COVER */}
             {!isSignedMode && (
               <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                 <button onClick={() => addCoverElement('stamp')} className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-white shadow" title="Adicionar Carimbo">
                   <span className="text-xs font-bold font-serif px-1 border-2 border-slate-300 rounded-sm italic">C</span>
                 </button>
               </div>
             )}

             <div ref={coverRef} id="page-cover" className="document-page relative w-[880px] h-[1200px] flex items-center justify-center overflow-hidden shadow-2xl" style={{ backgroundColor: '#c29b6c' }}>
                {/* Texture/Noise overlay for cardboard effect */}
                <div className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>
                
                <div className="relative z-10 flex flex-col items-center w-full px-24">
                   {sealBase64 ? (
                     <img src={sealBase64} alt="Seal" className="w-64 h-64 object-contain mb-16 opacity-90" />
                   ) : (
                     <div className="w-64 h-64 bg-black/10 rounded-full mb-16" />
                   )}
                
                 <h1 className="text-5xl font-serif font-bold text-black/80 tracking-[0.2em] mb-4 text-center leading-tight uppercase">
                   {isMagistrateRole(profile?.role) ? (profile?.role?.toLowerCase() === 'lspd' ? 'LOS SANTOS POLICE DEPARTMENT' : 'DEPARTMENT OF JUSTICE') : 
                    (profile?.role === 'lspd' ? 'LOS SANTOS POLICE DEPARTMENT' : 'FEDERAL INVESTIGATION BUREAU')}
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
                    <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">Relator:</span>
                    <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2">{metadata.agentName || '---'}</div>
                  </div>
                </div>

                {coverElements.map((el) => (
                  <React.Fragment key={el.id}>
                    <DraggableElement
                      el={el}
                      selected={selectedElement === el.id}
                      onSelect={() => setSelectedElement(el.id)}
                      onChange={(changes) => updateElement('cover', el.id, changes)}
                      onDelete={() => deleteElement('cover', el.id)}
                      readOnly={isSignedMode}
                      boundsSelector="#page-cover"
                    />
                  </React.Fragment>
                ))}
             </div>
          </div>
          </div>

          <div ref={docRef} className="flex flex-col gap-16 items-center w-full">
            {pages.map((page, index) => (
              <div key={page.id} className="page-export-container relative w-[880px] h-[1200px] flex items-center justify-center shrink-0">
                {/* TOOLBAR FOR THIS PAGE */}
                {!isSignedMode && (
                  <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
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
                  id={`page-${page.id}`}
                  className="document-page relative w-[794px] h-[1123px] bg-white shadow-xl flex flex-col z-10 overflow-hidden"
                >
                  {/* Guia de Margem Esquerda */}
                  {!isExporting && !isSignedMode && (
                    <div className="absolute left-[70px] top-0 bottom-0 w-px border-l-2 border-dashed border-blue-500/30 pointer-events-none z-0" title="Guia de Margem Esquerda"></div>
                  )}

                  {sealBase64 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden z-0">
                      <img src={sealBase64} alt="" className="w-[600px] h-[600px] object-contain grayscale" />
                    </div>
                  )}

                  {/* Header */}
                  <div className="h-32 mx-16 pt-12 shrink-0 flex items-start justify-between border-b-2 border-black/80 z-0">
                    {sealBase64 && <img src={sealBase64} alt="Seal" className="w-16 h-16 object-contain" />}
                    <div className="flex flex-col items-end">
                      <h2 className="text-xl font-bold font-serif tracking-wider text-black/90 uppercase">{metadata.classification || 'RELATÓRIO DE INVESTIGAÇÃO'}</h2>
                      <h3 className="text-sm font-bold font-serif tracking-wide text-black/70 italic opacity-80 uppercase">
                        {isMagistrateRole(profile?.role) ? (profile?.role?.toLowerCase() === 'lspd' ? 'LOS SANTOS POLICE DEPARTMENT' : 'DEPARTMENT OF JUSTICE') : 
                         profile?.role === 'lspd' ? 'LOS SANTOS POLICE DEPARTMENT' :
                         'FEDERAL INVESTIGATION BUREAU'}
                      </h3>
                    </div>
                  </div>

                  {/* Content Canvas */}
                  <div className="flex-1 relative mx-2 z-20">
                    {page.elements.map((el) => (
                      <React.Fragment key={el.id}>
                        <DraggableElement 
                          el={el} 
                          selected={selectedElement === el.id}
                          onSelect={() => setSelectedElement(el.id)}
                          onChange={(updates) => updateElement(page.id, el.id, updates)}
                          onDelete={() => deleteElement(page.id, el.id)}
                          onMoveToNextPage={() => moveElementToNextPage(index, el.id)}
                          readOnly={isSignedMode}
                          boundsSelector={`#page-${page.id}`}
                        />
                      </React.Fragment>
                    ))}

                    {/* Footer Signature Area on Last Page ONLY */}
                    {index === pages.length - 1 && (
                       <div className="absolute bottom-10 w-full flex justify-between px-16 z-0">
                         {/* Agente Signature */}
                         <div className="text-center w-72 relative z-0 flex flex-col items-center">
                           <div className="h-10 w-full relative flex items-center justify-center overflow-hidden">
                             {metadata.agenteAssinatura && (
                               <span className="font-signature text-3xl text-[#0000a0] -rotate-1 opacity-90 block truncate w-full text-center px-4">
                                 {metadata.agenteAssinatura}
                               </span>
                             )}
                           </div>
                           <div className="border-b border-black w-full mb-1"></div>
                           <p className="text-[10px] font-bold text-black border-none bg-transparent m-0 p-0 uppercase tracking-widest leading-none">Agente de Investigação</p>
                         </div>

                         {/* Diretoria Signature - Only shows if name is present */}
                         {metadata.diretorName && (
                           <div className="text-center w-72 relative z-0 flex flex-col items-center">
                             <div className="h-10 w-full relative flex items-center justify-center overflow-hidden">
                               {metadata.diretorAssinatura && (
                                 <span className="font-signature text-4xl text-black -rotate-1 opacity-90 block truncate w-full text-center px-4">
                                   {metadata.diretorAssinatura}
                                 </span>
                               )}
                             </div>
                             <div className="border-b border-black w-full mb-1"></div>
                             <p className="text-[10px] font-bold text-black border-none bg-transparent m-0 p-0 uppercase tracking-widest leading-none">Diretoria de Operações</p>
                           </div>
                         )}
                       </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="h-16 shrink-0 border-t border-black/20 mx-16 flex items-center justify-between text-xs text-black/50 font-mono z-0 uppercase">
                    <span>{isMagistrateRole(profile?.role) ? 'DEPARTMENT OF JUSTICE' : (profile?.role === 'lspd' ? 'LSPD' : 'F.I.B')} - CONFIDENTIAL</span>
                    <span>Page {index + 1} of {pages.length}</span>
                    <span>{metadata.directiveNo || 'UNREGISTERED'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isSignedMode && (
            <button onClick={addPage} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-full shadow-lg transition-all hover:scale-105">
               <PlusCircle className="w-5 h-5" />
               Adicionar Nova Página
            </button>
          )}

          </div>
        )}
      </div>

    </motion.div>
  </Rnd>
);
}
