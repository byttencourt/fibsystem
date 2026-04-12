import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Square, FileText, Copy, Check, ChevronLeft, Printer, Image as ImageIcon, Save, FolderOpen, Trash2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toBlob } from 'html-to-image';

export type RelatorioData = {
  directiveNo: string;
  issueDate: string;
  agentName: string;
  operationName: string;
  investigationDate: string;
  classification: string;
  objetivo: string;
  organizacao: string;
  historico: string;
  analise: string;
  inteligencia: string;
  fundamentacao: string;
  medidas: string;
  conclusao: string;
  agenteAssinatura: string;
  diretorAssinatura: string;
};

export type Draft = {
  id: string;
  title: string;
  date: string;
  data: RelatorioData;
};

export function RelatorioWindow({ isMaximized, onClose, onMinimize, onMaximize }: { isMaximized: boolean, onClose: () => void, onMinimize: () => void, onMaximize: () => void }) {
  const [view, setView] = useState<'form' | 'preview'>('form');
  const [isDiretorMode, setIsDiretorMode] = useState(false);
  const [isSignedMode, setIsSignedMode] = useState(false);
  const [linkGerado, setLinkGerado] = useState(false);
  const [linkAssinadoGerado, setLinkAssinadoGerado] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [formData, setFormData] = useState<RelatorioData>({
    directiveNo: '',
    issueDate: new Date().toISOString().split('T')[0],
    agentName: '',
    operationName: '',
    investigationDate: '',
    classification: 'CONFIDENTIAL',
    objetivo: '',
    organizacao: '',
    historico: '',
    analise: '',
    inteligencia: '',
    fundamentacao: '',
    medidas: '',
    conclusao: '',
    agenteAssinatura: '',
    diretorAssinatura: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data_relatorio');
    if (dataParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(dataParam)));
        setFormData(prev => ({ ...prev, ...decoded }));
        setIsDiretorMode(true);
        if (decoded.diretorAssinatura && decoded.diretorAssinatura.trim() !== '') {
          setIsSignedMode(true);
        }
      } catch (e) {
        console.error("Erro ao carregar dados do link", e);
      }
    }

    // Load drafts
    const savedDrafts = localStorage.getItem('fib_relatorios_drafts');
    if (savedDrafts) {
      try {
        setDrafts(JSON.parse(savedDrafts));
      } catch (e) {
        console.error("Erro ao carregar rascunhos", e);
      }
    }
  }, []);

  const saveDraft = () => {
    const newDraft: Draft = {
      id: Date.now().toString(),
      title: formData.operationName || formData.directiveNo || 'Rascunho sem título',
      date: new Date().toLocaleString(),
      data: formData
    };
    const updatedDrafts = [newDraft, ...drafts];
    setDrafts(updatedDrafts);
    localStorage.setItem('fib_relatorios_drafts', JSON.stringify(updatedDrafts));
    alert('Rascunho salvo com sucesso!');
  };

  const loadDraft = (draft: Draft) => {
    setFormData(draft.data);
    setShowDraftsModal(false);
  };

  const deleteDraft = (id: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== id);
    setDrafts(updatedDrafts);
    localStorage.setItem('fib_relatorios_drafts', JSON.stringify(updatedDrafts));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const gerarLinkDiretor = () => {
    const dataString = btoa(encodeURIComponent(JSON.stringify(formData)));
    const url = `${window.location.origin}${window.location.pathname}?data_relatorio=${dataString}`;
    navigator.clipboard.writeText(url);
    setLinkGerado(true);
    setTimeout(() => setLinkGerado(false), 3000);
  };

  const gerarLinkAssinado = () => {
    const dataString = btoa(encodeURIComponent(JSON.stringify(formData)));
    const url = `${window.location.origin}${window.location.pathname}?data_relatorio=${dataString}`;
    navigator.clipboard.writeText(url);
    setLinkAssinadoGerado(true);
    setTimeout(() => setLinkAssinadoGerado(false), 3000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      className={`absolute bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col z-40 transition-all duration-200 ${
        isMaximized 
          ? 'inset-0 rounded-none' 
          : 'inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[1000px] md:h-[750px] rounded-lg'
      }`}
    >
      {/* Window Header */}
      <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-3 select-none">
        <div className="flex items-center gap-2 text-slate-300">
          <img src="https://kappa.lol/TkFgCM" alt="Icon" className="w-5 h-5 rounded-sm" referrerPolicy="no-referrer" />
          <span className="text-sm font-medium">F.I.B - Relatórios de Investigação</span>
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

      {/* Window Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-900">
        {view === 'form' ? (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-400" />
                  {isSignedMode ? 'Documento Assinado' : isDiretorMode ? 'Revisão e Assinatura do Diretor' : 'Formulário de Relatório'}
                </h2>
                <div className="flex items-center gap-3">
                  {!isDiretorMode && (
                    <>
                      <button 
                        onClick={() => setShowDraftsModal(true)}
                        className="px-3 py-2 rounded font-medium transition-colors flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        title="Abrir Rascunhos"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={saveDraft}
                        className="px-3 py-2 rounded font-medium transition-colors flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        title="Salvar Rascunho"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={gerarLinkDiretor}
                        className={`px-4 py-2 rounded font-medium transition-colors flex items-center gap-2 shadow-lg ${
                          linkGerado ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-900/20'
                        }`}
                      >
                        {linkGerado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {linkGerado ? 'Link Copiado!' : 'Copiar Link p/ Diretor'}
                      </button>
                    </>
                  )}
                  {isDiretorMode && !isSignedMode && (
                    <button 
                      onClick={gerarLinkAssinado}
                      className={`px-4 py-2 rounded font-medium transition-colors flex items-center gap-2 shadow-lg ${
                        linkAssinadoGerado ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-900/20'
                      }`}
                    >
                      {linkAssinadoGerado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {linkAssinadoGerado ? 'Link Copiado!' : 'Copiar Link Assinado'}
                    </button>
                  )}
                  <button 
                    onClick={() => setView('preview')}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    <Printer className="w-4 h-4" />
                    {isDiretorMode ? 'Visualizar e Salvar' : 'Gerar Documento'}
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {isDiretorMode && (
                  <div className="bg-amber-900/30 p-5 rounded-lg border border-amber-700/50 shadow-lg shadow-amber-900/20">
                    <h3 className="text-sm font-bold text-amber-400 mb-4 uppercase tracking-wider border-b border-amber-700/50 pb-2">Área Exclusiva do Diretor</h3>
                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">Assinatura do Diretor (Digite seu nome)</label>
                      <input 
                        type="text" 
                        name="diretorAssinatura" 
                        value={formData.diretorAssinatura} 
                        onChange={handleChange} 
                        placeholder="Ex: Diretor FIB" 
                        readOnly={isSignedMode}
                        className={`w-full bg-slate-950 border border-amber-700/50 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-signature text-2xl ${isSignedMode ? 'opacity-70 cursor-not-allowed' : ''}`} 
                      />
                    </div>
                  </div>
                )}

                {/* Section 1 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">Informações Gerais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Directive No.</label>
                      <input type="text" name="directiveNo" value={formData.directiveNo} onChange={handleChange} placeholder="Ex: DIR-2026-001" className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Issue Date</label>
                      <input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Agent</label>
                      <input type="text" name="agentName" value={formData.agentName} onChange={handleChange} placeholder="Ex: Agente Responsável" className="form-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Operação / Organização</label>
                      <input type="text" name="operationName" value={formData.operationName} onChange={handleChange} placeholder="Ex: Operação Valquíria" className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Investigation Date (Período)</label>
                      <input type="text" name="investigationDate" value={formData.investigationDate} onChange={handleChange} placeholder="Ex: 01/01/2026 a 01/04/2026" className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Classification</label>
                      <select name="classification" value={formData.classification} onChange={handleChange} className="form-input">
                        <option>PUBLIC</option>
                        <option>INTERNAL USE ONLY</option>
                        <option>CONFIDENTIAL</option>
                        <option>SECRET</option>
                        <option>TOP SECRET</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">1. Objetivo da Investigação</h3>
                  <textarea name="objetivo" value={formData.objetivo} onChange={handleChange} rows={3} placeholder="Definir de forma clara o propósito da investigação..." className="form-input resize-y" />
                </div>

                {/* Section 3 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">2. Organização Investigada</h3>
                  <textarea name="organizacao" value={formData.organizacao} onChange={handleChange} rows={3} placeholder="Detalhamento do grupo investigado..." className="form-input resize-y" />
                </div>

                {/* Section 4 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">3. Histórico de Ocorrências</h3>
                  <textarea name="historico" value={formData.historico} onChange={handleChange} rows={4} placeholder="Registro cronológico de todas as ocorrências..." className="form-input resize-y" />
                </div>

                {/* Section 5 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">4. Análise de Padrão Criminal</h3>
                  <textarea name="analise" value={formData.analise} onChange={handleChange} rows={4} placeholder="Seção analítica onde irá interpretar os dados..." className="form-input resize-y" />
                </div>

                {/* Section 6 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">5. Inteligência Coletada</h3>
                  <textarea name="inteligencia" value={formData.inteligencia} onChange={handleChange} rows={4} placeholder="Resumo dos métodos e informações obtidas..." className="form-input resize-y" />
                </div>

                {/* Section 7 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">6. Fundamentação Legal</h3>
                  <textarea name="fundamentacao" value={formData.fundamentacao} onChange={handleChange} rows={3} placeholder="Base legal que sustenta a investigação..." className="form-input resize-y" />
                </div>

                {/* Section 8 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">7. Medidas Operacionais Ativas</h3>
                  <textarea name="medidas" value={formData.medidas} onChange={handleChange} rows={3} placeholder="Lista das ações já autorizadas..." className="form-input resize-y" />
                </div>

                {/* Section 9 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">8. Conclusão</h3>
                  <textarea name="conclusao" value={formData.conclusao} onChange={handleChange} rows={3} placeholder="Síntese final da investigação..." className="form-input resize-y" />
                </div>

                {/* Section 10 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">Assinatura do Agente</h3>
                  <input type="text" name="agenteAssinatura" value={formData.agenteAssinatura} onChange={handleChange} placeholder="Ex: Agente John Doe" className="w-full bg-slate-950 border border-slate-700/50 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-signature text-2xl" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DocumentPreview formData={formData} onBack={() => setView('form')} />
        )}
      </div>
      {/* Drafts Modal */}
      <AnimatePresence>
        {showDraftsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-400" />
                  Rascunhos Salvos
                </h3>
                <button 
                  onClick={() => setShowDraftsModal(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {drafts.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    Nenhum rascunho salvo.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {drafts.map(draft => (
                      <div key={draft.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:border-slate-600 transition-colors">
                        <div>
                          <h4 className="font-medium text-slate-200">{draft.title}</h4>
                          <p className="text-sm text-slate-500 mt-1">Salvo em: {draft.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => loadDraft(draft)}
                            className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded text-sm font-medium transition-colors"
                          >
                            Carregar
                          </button>
                          <button 
                            onClick={() => deleteDraft(draft.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Document Preview Component ---
function DocumentPreview({ formData, onBack }: { formData: RelatorioData, onBack: () => void }) {
  const coverRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [sealBase64, setSealBase64] = useState<string>('');
  const [coverSealBase64, setCoverSealBase64] = useState<string>('');
  const [watermarkBase64, setWatermarkBase64] = useState<string>('');

  useEffect(() => {
    const fetchImage = async (url: string, setter: (val: string) => void) => {
      // Set the URL immediately so it's visible on screen right away!
      setter(url);

      // Fetch base64 in background for html-to-image export compatibility
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://wsrv.nl/?url=${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
      ];

      for (const proxy of proxies) {
        try {
          const res = await fetch(proxy);
          if (!res.ok) continue;
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) setter(reader.result as string);
          };
          reader.readAsDataURL(blob);
          return; // Success, replaced direct URL with base64 for safe exporting
        } catch (e) {
          // Ignore and try next proxy
        }
      }
      console.warn('All proxies failed to load image as base64. Export might fail, but image will remain visible:', url);
    };

    const logoUrl = 'https://i.postimg.cc/L6BrHtB9/de7hpuu-0ddf58ce-f5db-4de7-9cb7-a83ff0c4fa48.png';
    fetchImage(logoUrl, setSealBase64);
    fetchImage(logoUrl, setCoverSealBase64);
    fetchImage(logoUrl, setWatermarkBase64);
  }, []);

  const exportSingleImage = async (element: HTMLElement, filename: string, bgColor: string = 'rgba(0,0,0,0)') => {
    const blob = await toBlob(element, {
      pixelRatio: 2,
      backgroundColor: bgColor,
    });
    if (!blob) throw new Error('Falha ao gerar a imagem.');
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportCover = async () => {
    if (!coverRef.current) return;
    setIsExporting(true);
    try {
      await exportSingleImage(coverRef.current, `1_Capa_${formData.directiveNo || 'Relatorio'}.png`, '#c29b6c');
    } catch (err) {
      console.error('Failed to export cover', err);
      alert(`Erro ao salvar a capa: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportDocumentPages = async () => {
    if (!docRef.current) return;
    setIsExporting(true);
    try {
      const pages = docRef.current.querySelectorAll('.document-page');
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        await exportSingleImage(pageEl, `${i + 2}_Pagina_${i + 1}_${formData.directiveNo || 'Relatorio'}.png`);
        // Small delay to prevent browser from blocking multiple downloads
        await new Promise(res => setTimeout(res, 500));
      }
    } catch (err) {
      console.error('Failed to export document pages', err);
      alert(`Erro ao salvar as páginas: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // --- Pagination Logic ---
  const A4_CONTENT_HEIGHT = 995; // 1123 - 128 (padding)
  
  type Block = {
    id: string;
    height: number;
    render: () => React.ReactNode;
  };

  const blocks: Block[] = [];

  blocks.push({
    id: 'header',
    height: 280,
    render: () => (
      <div key="header" className="flex flex-col mb-8">
        <div className="flex justify-between items-start border-b-2 border-black/80 pb-6 mb-6">
          {sealBase64 ? (
            <img src={sealBase64} alt="FIB Logo" className="w-24 h-24 object-contain" />
          ) : (
            <div className="w-24 h-24 bg-black/10 rounded-full" />
          )}
          <div className="text-right">
            <h2 className="text-xl font-bold font-serif tracking-wider text-black/90">FEDERAL INVESTIGATION BUREAU</h2>
            <h3 className="text-lg font-bold font-serif tracking-wide text-black/80">INVESTIGATION REPORT</h3>
            <div className="mt-4 text-sm">
              <p><span className="font-bold">Directive No.:</span> {formData.directiveNo}</p>
              <p><span className="font-bold">Issue Date:</span> {formData.issueDate}</p>
              <p><span className="font-bold">Agent:</span> {formData.agentName}</p>
            </div>
          </div>
        </div>
        <div className="border-b-2 border-black/80 pb-4">
          <h1 className="text-xl font-bold tracking-widest text-black/90 uppercase">{formData.operationName || '[NOME DA OPERAÇÃO / ORGANIZAÇÃO]'}</h1>
          <p className="font-bold mt-2 text-black/80 text-sm">Directive No.: <span className="font-normal">{formData.directiveNo}</span> / Issue Date: <span className="font-normal">{formData.issueDate}</span> / Investigation Date: <span className="font-normal">{formData.investigationDate}</span></p>
          <p className="font-bold mt-1 text-black/80 text-sm">Classification/Classificação: <span className="font-normal">{formData.classification}</span></p>
        </div>
      </div>
    )
  });

  blocks.push({
    id: 'objetivo',
    height: 80 + Math.ceil((formData.objetivo?.length || 0) / 80) * 20,
    render: () => (
      <section key="objetivo" className="mb-6">
        <h3 className="font-bold text-lg mb-2">1. OBJETIVO DA INVESTIGAÇÃO</h3>
        <p className="whitespace-pre-wrap text-sm text-justify leading-relaxed">{formData.objetivo}</p>
      </section>
    )
  });

  blocks.push({
    id: 'organizacao',
    height: 80 + Math.ceil((formData.organizacao?.length || 0) / 80) * 20,
    render: () => (
      <section key="organizacao" className="mb-6">
        <h3 className="font-bold text-lg mb-2">2. ORGANIZAÇÃO INVESTIGADA</h3>
        <p className="whitespace-pre-wrap text-sm text-justify leading-relaxed">{formData.organizacao}</p>
      </section>
    )
  });

  blocks.push({
    id: 'historico',
    height: 80 + Math.ceil((formData.historico?.length || 0) / 80) * 20,
    render: () => (
      <section key="historico" className="mb-6">
        <h3 className="font-bold text-lg mb-2">3. HISTÓRICO DE OCORRÊNCIAS</h3>
        <p className="whitespace-pre-wrap text-sm text-justify leading-relaxed">{formData.historico}</p>
      </section>
    )
  });

  blocks.push({
    id: 'analise',
    height: 80 + Math.ceil((formData.analise?.length || 0) / 80) * 20,
    render: () => (
      <section key="analise" className="mb-6">
        <h3 className="font-bold text-lg mb-2">4. ANÁLISE DE PADRÃO CRIMINAL</h3>
        <p className="whitespace-pre-wrap text-sm text-justify leading-relaxed">{formData.analise}</p>
      </section>
    )
  });

  blocks.push({
    id: 'inteligencia',
    height: 80 + Math.ceil((formData.inteligencia?.length || 0) / 80) * 20,
    render: () => (
      <section key="inteligencia" className="mb-6">
        <h3 className="font-bold text-lg mb-2">5. INTELIGÊNCIA COLETADA</h3>
        <p className="whitespace-pre-wrap text-sm text-justify leading-relaxed">{formData.inteligencia}</p>
      </section>
    )
  });

  blocks.push({
    id: 'fundamentacao',
    height: 80 + Math.ceil((formData.fundamentacao?.length || 0) / 80) * 20,
    render: () => (
      <section key="fundamentacao" className="mb-6">
        <h3 className="font-bold text-lg mb-2">6. FUNDAMENTAÇÃO LEGAL</h3>
        <p className="whitespace-pre-wrap text-sm text-justify leading-relaxed">{formData.fundamentacao}</p>
      </section>
    )
  });

  blocks.push({
    id: 'medidas',
    height: 80 + Math.ceil((formData.medidas?.length || 0) / 80) * 20,
    render: () => (
      <section key="medidas" className="mb-6">
        <h3 className="font-bold text-lg mb-2">7. MEDIDAS OPERACIONAIS ATIVAS</h3>
        <p className="whitespace-pre-wrap text-sm text-justify leading-relaxed">{formData.medidas}</p>
      </section>
    )
  });

  blocks.push({
    id: 'conclusao',
    height: 80 + Math.ceil((formData.conclusao?.length || 0) / 80) * 20,
    render: () => (
      <section key="conclusao" className="mb-6">
        <h3 className="font-bold text-lg mb-2">8. CONCLUSÃO</h3>
        <p className="whitespace-pre-wrap text-sm text-justify leading-relaxed">{formData.conclusao}</p>
      </section>
    )
  });

  blocks.push({
    id: 'declaracao',
    height: 140,
    render: () => (
      <section key="declaracao" className="mb-6">
        <h3 className="font-bold text-lg mb-2">9. DECLARAÇÃO FINAL</h3>
        <p className="text-justify text-sm leading-relaxed italic">
          "Declaro, sob responsabilidade funcional e na observância dos princípios constitucionais de legalidade, devido
          processo legal e proteção de direitos individuais, que as informações constantes neste relatório correspondem
          fielmente aos fatos apurados durante o período indicado, estando em conformidade com as diretrizes
          operacionais da Divisão de Inteligência e Fiscalização de Investigações da Federal Investigation Bureau, bem
          como com os procedimentos previstos no Standard Operating Procedures da Agência e nas normas legais
          aplicáveis aos procedimentos investigativos federais."
        </p>
        <p className="mt-4 text-sm">Data: {new Date().toLocaleDateString('pt-BR')}</p>
      </section>
    )
  });

  blocks.push({
    id: 'assinaturas',
    height: 200,
    render: () => (
      <div key="assinaturas" className="mt-auto pt-8">
        <div className="flex justify-between px-8">
          <div className="text-center w-64 relative">
            {formData.agenteAssinatura && (
              <div className="absolute bottom-6 w-full text-center pointer-events-none">
                <span className="font-signature text-4xl text-[#0000a0] -rotate-2 inline-block opacity-90">
                  {formData.agenteAssinatura}
                </span>
              </div>
            )}
            <div className="border-b border-black mb-2"></div>
            <p className="text-sm font-bold">Assinatura do Agente</p>
          </div>
          <div className="text-center w-64 relative">
            {formData.diretorAssinatura && (
              <div className="absolute bottom-6 w-full text-center pointer-events-none">
                <span className="font-signature text-5xl text-black -rotate-2 inline-block opacity-90">
                  {formData.diretorAssinatura}
                </span>
              </div>
            )}
            <div className="border-b border-black mb-2"></div>
            <p className="text-sm font-bold">Assinatura Diretoria</p>
          </div>
        </div>
      </div>
    )
  });

  const pages: Block[][] = [];
  let currentPage: Block[] = [];
  let currentHeight = 0;

  blocks.forEach(block => {
    if (currentHeight + block.height > A4_CONTENT_HEIGHT && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [block];
      currentHeight = block.height;
    } else {
      currentPage.push(block);
      currentHeight += block.height;
    }
  });
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      {/* Toolbar */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar ao Formulário
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportCover}
            disabled={isExporting || !sealBase64}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <ImageIcon className="w-4 h-4" />
            Salvar Capa
          </button>
          <button 
            onClick={exportDocumentPages}
            disabled={isExporting || !sealBase64}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Salvar Documento
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-950">
        
        {/* Cover Container */}
        <div className="flex flex-col items-center mb-16">
          <div 
            ref={coverRef}
            className="relative w-[880px] h-[1200px] shrink-0 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: '#c29b6c' }}
          >
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center w-full px-24">
              {coverSealBase64 ? (
                <img src={coverSealBase64} alt="FIB Seal" className="w-64 h-64 object-contain mb-16 opacity-90" />
              ) : (
                <div className="w-64 h-64 bg-black/10 rounded-full mb-16" />
              )}
              
              <h1 className="text-5xl font-serif font-bold text-black/80 tracking-[0.2em] mb-4 text-center">
                FEDERAL INVESTIGATION BUREAU
              </h1>
              <div className="w-full h-1 bg-black/60 mb-2"></div>
              <div className="w-full h-0.5 bg-black/40 mb-16"></div>

              <h2 className="text-3xl font-bold text-black/80 tracking-widest text-center mb-8 uppercase">
                {formData.classification || 'RELATÓRIO DE INVESTIGAÇÃO'}
              </h2>
              
              <div className="w-full max-w-2xl space-y-6">
                <div className="flex items-end gap-4">
                  <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">Directive No.:</span>
                  <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2">
                    {formData.directiveNo}
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">Operation:</span>
                  <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2 truncate">
                    {formData.operationName || '[NOME DA OPERAÇÃO]'}
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">Issue Date:</span>
                  <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2">
                    {formData.issueDate}
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">Agent:</span>
                  <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2">
                    {formData.agentName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Document Container */}
        <div 
          ref={docRef} 
          className="flex flex-col gap-12 items-center pb-16 pt-8"
          style={{ backgroundColor: 'transparent' }}
        >
          {pages.map((pageBlocks, pageIndex) => (
            <div 
              key={pageIndex}
              className="document-page relative w-[880px] h-[1200px] shrink-0 flex items-center justify-center"
            >
              {/* Folder Background (Open Folder Look) */}
              <div 
                className="absolute inset-0 shadow-2xl"
                style={{ backgroundColor: '#d4b082' }}
              >
                <div className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}></div>
              </div>

              {/* Paper */}
              <div className="relative w-[794px] h-[1123px] bg-white shadow-xl flex flex-col">
                {/* Watermark */}
                {watermarkBase64 && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
                    <img src={watermarkBase64} alt="" className="w-[600px] h-[600px] object-contain grayscale" />
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 px-16 py-16 flex flex-col relative z-10 text-black">
                  {pageBlocks.map(block => block.render())}
                </div>

                {/* Footer */}
                <div className="h-16 border-t border-black/20 mx-16 flex items-center justify-between text-xs text-black/50 font-mono relative z-10">
                  <span>F.I.B - CONFIDENTIAL</span>
                  <span>Page {pageIndex + 1} of {pages.length}</span>
                  <span>{formData.directiveNo || 'UNREGISTERED'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
