import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Square, FileText, Copy, Check, ChevronLeft, Printer, Image as ImageIcon, Save, FolderOpen, Trash2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toBlob } from 'html-to-image';

export type MandadoData = {
  directiveNo: string;
  nomeOperacao: string;
  requerenteNome: string;
  requerenteBadge: string;
  requerenteRank: string;
  incidentes: string;
  relatorios: string;
  dataSolicitacao: string;
  tipoMandado: string;
  finalidade: string;
  resumoFatos: string;
  locaisBusca: string;
  itensApreensao: string;
  outrasMedidas: string;
  juizAssinatura: string;
  parecerJuiz?: string;
  statusMandado?: string;
};

export type Draft = {
  id: string;
  title: string;
  date: string;
  data: MandadoData;
};

export function MandatoWindow({ isMaximized, onClose, onMinimize, onMaximize }: { isMaximized: boolean, onClose: () => void, onMinimize: () => void, onMaximize: () => void }) {
  const [view, setView] = useState<'form' | 'preview'>('form');
  const [isJuizMode, setIsJuizMode] = useState(false);
  const [isSignedMode, setIsSignedMode] = useState(false);
  const [linkGerado, setLinkGerado] = useState(false);
  const [linkAssinadoGerado, setLinkAssinadoGerado] = useState(false);
  const [linkDevolvidoGerado, setLinkDevolvidoGerado] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [formData, setFormData] = useState<MandadoData>({
    directiveNo: '',
    nomeOperacao: '',
    requerenteNome: '',
    requerenteBadge: '',
    requerenteRank: '',
    incidentes: '',
    relatorios: '',
    dataSolicitacao: new Date().toISOString().split('T')[0],
    tipoMandado: 'Busca e Apreensão',
    finalidade: '',
    resumoFatos: '',
    locaisBusca: '',
    itensApreensao: '',
    outrasMedidas: '',
    juizAssinatura: '',
    parecerJuiz: '',
    statusMandado: 'Pendente'
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');
    const modeParam = params.get('mode');
    if (dataParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(dataParam)));
        setFormData(prev => ({ ...prev, ...decoded }));
        
        if (modeParam === 'agent') {
          setIsJuizMode(false);
        } else {
          setIsJuizMode(true);
        }
        
        if (decoded.juizAssinatura && decoded.juizAssinatura.trim() !== '') {
          setIsSignedMode(true);
        }
      } catch (e) {
        console.error("Erro ao carregar dados do link", e);
      }
    }

    // Load drafts
    const savedDrafts = localStorage.getItem('fib_mandados_drafts');
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
      title: formData.nomeOperacao || formData.directiveNo || 'Rascunho sem título',
      date: new Date().toLocaleString(),
      data: formData
    };
    const updatedDrafts = [newDraft, ...drafts];
    setDrafts(updatedDrafts);
    localStorage.setItem('fib_mandados_drafts', JSON.stringify(updatedDrafts));
    alert('Rascunho salvo com sucesso!');
  };

  const loadDraft = (draft: Draft) => {
    setFormData(draft.data);
    setShowDraftsModal(false);
  };

  const deleteDraft = (id: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== id);
    setDrafts(updatedDrafts);
    localStorage.setItem('fib_mandados_drafts', JSON.stringify(updatedDrafts));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const gerarLinkJuiz = () => {
    const dataString = btoa(encodeURIComponent(JSON.stringify(formData)));
    const url = `${window.location.origin}${window.location.pathname}?data=${dataString}&mode=juiz`;
    navigator.clipboard.writeText(url);
    setLinkGerado(true);
    setTimeout(() => setLinkGerado(false), 3000);
  };

  const gerarLinkAssinado = () => {
    const dataString = btoa(encodeURIComponent(JSON.stringify(formData)));
    const url = `${window.location.origin}${window.location.pathname}?data=${dataString}&mode=juiz`;
    navigator.clipboard.writeText(url);
    setLinkAssinadoGerado(true);
    setTimeout(() => setLinkAssinadoGerado(false), 3000);
  };

  const gerarLinkDevolucao = () => {
    const dataString = btoa(encodeURIComponent(JSON.stringify(formData)));
    const url = `${window.location.origin}${window.location.pathname}?data=${dataString}&mode=agent`;
    navigator.clipboard.writeText(url);
    setLinkDevolvidoGerado(true);
    setTimeout(() => setLinkDevolvidoGerado(false), 3000);
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
          <span className="text-sm font-medium">F.I.B - Sistema de Mandados</span>
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
                  {isSignedMode ? 'Documento Assinado' : isJuizMode ? 'Revisão e Assinatura do Juiz' : 'Formulário de Solicitação'}
                </h2>
                <div className="flex items-center gap-3">
                  {!isJuizMode && (
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
                        onClick={gerarLinkJuiz}
                        className={`px-4 py-2 rounded font-medium transition-colors flex items-center gap-2 shadow-lg ${
                          linkGerado ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-900/20'
                        }`}
                      >
                        {linkGerado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {linkGerado ? 'Link Copiado!' : 'Copiar Link p/ Juiz'}
                      </button>
                    </>
                  )}
                  {isJuizMode && !isSignedMode && (
                    <>
                      <button 
                        onClick={gerarLinkDevolucao}
                        className={`px-4 py-2 rounded font-medium transition-colors flex items-center gap-2 shadow-lg ${
                          linkDevolvidoGerado ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20' : 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-900/20'
                        }`}
                      >
                        {linkDevolvidoGerado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {linkDevolvidoGerado ? 'Link Copiado!' : 'Devolver p/ Agente'}
                      </button>
                      <button 
                        onClick={gerarLinkAssinado}
                        className={`px-4 py-2 rounded font-medium transition-colors flex items-center gap-2 shadow-lg ${
                          linkAssinadoGerado ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-900/20'
                        }`}
                      >
                        {linkAssinadoGerado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {linkAssinadoGerado ? 'Link Copiado!' : 'Copiar Link Assinado'}
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => setView('preview')}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    <Printer className="w-4 h-4" />
                    {isJuizMode ? 'Visualizar e Salvar' : 'Gerar Documento'}
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {isJuizMode && (
                  <div className="bg-amber-900/30 p-5 rounded-lg border border-amber-700/50 shadow-lg shadow-amber-900/20 space-y-4">
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider border-b border-amber-700/50 pb-2">Área Exclusiva do Juiz</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-amber-200 mb-1">Status da Solicitação</label>
                        <select 
                          name="statusMandado" 
                          value={formData.statusMandado || 'Pendente'} 
                          onChange={handleChange} 
                          disabled={isSignedMode}
                          className={`w-full bg-slate-950 border border-amber-700/50 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all ${isSignedMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Aprovado">Aprovado</option>
                          <option value="Aprovado com Restrições">Aprovado com Restrições</option>
                          <option value="Negado">Negado</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-amber-200 mb-1">Assinatura do Juiz (Digite seu nome)</label>
                        <input 
                          type="text" 
                          name="juizAssinatura" 
                          value={formData.juizAssinatura} 
                          onChange={handleChange} 
                          placeholder="Ex: Juiz Federal Harvey Specter" 
                          readOnly={isSignedMode}
                          className={`w-full bg-slate-950 border border-amber-700/50 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-signature text-2xl ${isSignedMode ? 'opacity-70 cursor-not-allowed' : ''}`} 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">Parecer / Observações do Juiz</label>
                      <textarea 
                        name="parecerJuiz" 
                        value={formData.parecerJuiz || ''} 
                        onChange={handleChange} 
                        rows={4} 
                        placeholder="Adicione informações, restrições ou justificativas para a decisão..." 
                        readOnly={isSignedMode}
                        className={`w-full bg-slate-950 border border-amber-700/50 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-y ${isSignedMode ? 'opacity-70 cursor-not-allowed' : ''}`} 
                      />
                    </div>
                  </div>
                )}

                {/* Section 1 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">1. Requerente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Agente</label>
                      <input type="text" name="requerenteNome" value={formData.requerenteNome} onChange={handleChange} placeholder="Ex: John Smith" className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Badge</label>
                      <input type="text" name="requerenteBadge" value={formData.requerenteBadge} onChange={handleChange} placeholder="Ex: 123" className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Rank</label>
                      <input type="text" name="requerenteRank" value={formData.requerenteRank} onChange={handleChange} placeholder="Ex: Special Agent" className="form-input" />
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">2. Informações do Mandado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Directive No. (Nome do Documento)</label>
                      <input type="text" name="directiveNo" value={formData.directiveNo} onChange={handleChange} placeholder="Ex: MD-2023-001" className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Operação</label>
                      <input type="text" name="nomeOperacao" value={formData.nomeOperacao} onChange={handleChange} placeholder="Ex: Operação Valquíria" className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de Mandado</label>
                      <select name="tipoMandado" value={formData.tipoMandado} onChange={handleChange} className="form-input">
                        <option>Busca e Apreensão</option>
                        <option>Prisão</option>
                        <option>Confisco de Bens</option>
                        <option>Quebra de Sigilo</option>
                        <option>Vigilância</option>
                        <option>Outros</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Nº dos Incidentes</label>
                      <input type="text" name="incidentes" value={formData.incidentes} onChange={handleChange} placeholder="Ex: INC-992" className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Nº dos Relatórios</label>
                      <input type="text" name="relatorios" value={formData.relatorios} onChange={handleChange} placeholder="Ex: REL-401" className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Data da Solicitação</label>
                      <input type="date" name="dataSolicitacao" value={formData.dataSolicitacao} onChange={handleChange} className="form-input" />
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">3. Base Legal e Causa Provável</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Finalidade do Mandado</label>
                      <input type="text" name="finalidade" value={formData.finalidade} onChange={handleChange} placeholder="Ex: Apreensão de narcóticos e armas ilegais" className="form-input" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Resumo dos Fatos</label>
                      <textarea name="resumoFatos" value={formData.resumoFatos} onChange={handleChange} rows={5} placeholder="Descrição objetiva dos eventos, provas materiais, testemunhais..." className="form-input resize-y" />
                    </div>
                  </div>
                </div>

                {/* Section 4 */}
                <div className={`bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 ${isSignedMode ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider border-b border-slate-700 pb-2">4. Solicitação Específica</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Locais de Busca (Veículos e Propriedades)</label>
                      <textarea name="locaisBusca" value={formData.locaisBusca} onChange={handleChange} rows={3} placeholder="Ex: Residência na Vinewood Hills, Placa ABC-1234" className="form-input resize-y" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Itens a Apreender</label>
                      <textarea name="itensApreensao" value={formData.itensApreensao} onChange={handleChange} rows={3} placeholder="Ex: Armas de fogo não registradas, dinheiro em espécie" className="form-input resize-y" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Outras Medidas Necessárias</label>
                      <textarea name="outrasMedidas" value={formData.outrasMedidas} onChange={handleChange} rows={2} placeholder="Ex: Bloqueio de contas bancárias" className="form-input resize-y" />
                    </div>
                  </div>
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
function DocumentPreview({ formData, onBack }: { formData: MandadoData, onBack: () => void }) {
  const coverRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [sealBase64, setSealBase64] = useState<string>('');
  const [coverSealBase64, setCoverSealBase64] = useState<string>('');
  const [watermarkBase64, setWatermarkBase64] = useState<string>('');

  useEffect(() => {
    const fetchLocalImage = async () => {
      const logoUrl = '/logo.png';
      // Set immediately for fast display
      setSealBase64(logoUrl);
      setCoverSealBase64(logoUrl);
      setWatermarkBase64(logoUrl);

      try {
        const res = await fetch(logoUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            const base64 = reader.result as string;
            setSealBase64(base64);
            setCoverSealBase64(base64);
            setWatermarkBase64(base64);
          }
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error('Failed to convert local logo to base64', e);
      }
    };

    fetchLocalImage();
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
      await exportSingleImage(coverRef.current, `1_Capa_${formData.directiveNo || 'Mandado'}.png`, '#c29b6c');
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
        await exportSingleImage(pageEl, `${i + 2}_Pagina_${i + 1}_${formData.directiveNo || 'Mandado'}.png`);
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
    height: 220,
    render: () => (
      <div key="header" className="flex flex-col mb-8">
        <div className="flex justify-between items-start border-b-2 border-black/80 pb-6 mb-6">
          {sealBase64 ? (
            <img src={sealBase64} alt="FIB Logo" className="w-24 h-24 object-contain" />
          ) : (
            <div className="w-24 h-24 bg-black/10 rounded-full" />
          )}
          <div className="text-right">
            <h2 className="text-xl font-bold font-serif tracking-wider text-black/90">DEPARTMENT OF JUSTICE</h2>
            <h3 className="text-lg font-bold font-serif tracking-wide text-black/80">FEDERAL INVESTIGATION BUREAU</h3>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-black/90">SOLICITAÇÃO DE MANDADO JUDICIAL</h1>
          <p className="font-bold mt-2 text-black/80">Directive No.: <span className="font-normal">{formData.directiveNo || '[NÃO INFORMADO]'}</span></p>
        </div>
      </div>
    )
  });

  blocks.push({
    id: 'requerente',
    height: 100,
    render: () => (
      <section key="requerente" className="mb-6">
        <h3 className="font-bold text-lg mb-2 border-b border-black/20 pb-1">1. REQUERENTE</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><span className="font-bold">Nome:</span> {formData.requerenteNome} {formData.requerenteBadge ? `- ${formData.requerenteBadge}` : ''}</p>
          <p><span className="font-bold">Rank:</span> {formData.requerenteRank}</p>
        </div>
      </section>
    )
  });

  blocks.push({
    id: 'informacoes',
    height: 140,
    render: () => (
      <section key="informacoes" className="mb-6">
        <h3 className="font-bold text-lg mb-2 border-b border-black/20 pb-1">2. INFORMAÇÕES DO MANDADO</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><span className="font-bold">Incidentes:</span> {formData.incidentes}</p>
          <p><span className="font-bold">Relatórios:</span> {formData.relatorios}</p>
          <p><span className="font-bold">Data:</span> {formData.dataSolicitacao}</p>
          <p><span className="font-bold">Tipo:</span> {formData.tipoMandado}</p>
        </div>
      </section>
    )
  });

  blocks.push({
    id: 'base_legal',
    height: 120 + Math.ceil((formData.resumoFatos?.length || 0) / 80) * 20,
    render: () => (
      <section key="base_legal" className="mb-6">
        <h3 className="font-bold text-lg mb-2 border-b border-black/20 pb-1">3. BASE LEGAL E CAUSA PROVÁVEL</h3>
        <p className="mb-3 text-sm">Com base nos fatos e nas evidências listadas abaixo, solicita-se a expedição de mandado para <strong>{formData.finalidade || '[finalidade do mandado]'}</strong>.</p>
        <p className="font-bold text-sm">Resumo dos Fatos:</p>
        <p className="whitespace-pre-wrap mt-1 text-sm text-justify leading-relaxed">{formData.resumoFatos || '[Descrição objetiva dos eventos...]'}</p>
      </section>
    )
  });

  blocks.push({
    id: 'solicitacao',
    height: 180 + Math.ceil((formData.locaisBusca?.length || 0) / 80) * 20 + Math.ceil((formData.itensApreensao?.length || 0) / 80) * 20 + Math.ceil((formData.outrasMedidas?.length || 0) / 80) * 20,
    render: () => (
      <section key="solicitacao" className="mb-6">
        <h3 className="font-bold text-lg mb-2 border-b border-black/20 pb-1">4. SOLICITAÇÃO ESPECÍFICA</h3>
        <p className="mb-2 text-sm">O requerente solicita autorização para:</p>
        
        <p className="font-bold mt-3 text-sm">Realizar busca e apreensão no(s) seguinte(s) local(is):</p>
        <p className="whitespace-pre-wrap ml-4 text-sm">{formData.locaisBusca || '[Listar Veículos e Propriedades]'}</p>

        <p className="font-bold mt-3 text-sm">Apreender os seguintes itens, caso encontrados:</p>
        <p className="whitespace-pre-wrap ml-4 text-sm">{formData.itensApreensao || '[Listagem de itens]'}</p>

        <p className="font-bold mt-3 text-sm">Outras medidas necessárias:</p>
        <p className="whitespace-pre-wrap ml-4 text-sm">{formData.outrasMedidas || '[Especificar, se aplicável]'}</p>
      </section>
    )
  });

  blocks.push({
    id: 'declaracao',
    height: 120,
    render: () => (
      <section key="declaracao" className="mb-6">
        <h3 className="font-bold text-lg mb-2 border-b border-black/20 pb-1">5. DECLARAÇÃO DO REQUERENTE</h3>
        <p className="text-justify text-sm leading-relaxed">
          Declaro, sob as penas da lei, que as informações contidas nesta solicitação são verídicas e fundamentadas em
          evidências substanciais e concretas obtidas durante a investigação. Estas evidências justificam plenamente a
          necessidade da expedição do presente mandado, com a finalidade de assegurar a continuidade das apurações e
          a devida aplicação da lei.
        </p>
      </section>
    )
  });

  if (false) {
    // legacy disabled
  }

  blocks.push({
    id: 'assinaturas',
    height: 200,
    render: () => (
      <div key="assinaturas" className="mt-auto pt-8">
        <h3 className="font-bold text-lg mb-12">6. ASSINATURA</h3>
        <div className="flex justify-between px-8">
          <div className="text-center w-64 relative">
            {formData.requerenteNome && (
              <div className="absolute bottom-6 w-full text-center pointer-events-none">
                <span className="font-signature text-4xl text-[#0000a0] -rotate-2 inline-block opacity-90">
                  {formData.requerenteNome}
                </span>
              </div>
            )}
            <div className="border-b border-black mb-2"></div>
            <p className="text-sm font-bold">Requerente</p>
          </div>
          <div className="text-center w-64 relative">
            {formData.juizAssinatura && (
              <div className="absolute bottom-6 w-full text-center pointer-events-none">
                <span className="font-signature text-5xl text-black -rotate-2 inline-block opacity-90">
                  {formData.juizAssinatura}
                </span>
              </div>
            )}
            <div className="border-b border-black mb-2"></div>
            <p className="text-sm font-bold">Juiz</p>
          </div>
        </div>
      </div>
    )
  });

  const pages: Block[][] = [
    blocks.filter(b => ['header', 'requerente', 'informacoes', 'base_legal'].includes(b.id)),
    blocks.filter(b => ['solicitacao', 'declaracao'].includes(b.id))
  ];

  if (formData.parecerJuiz || formData.statusMandado) {
    const textAvailable = formData.parecerJuiz || '';
    const paragraphs = textAvailable.split('\n');
    const MAX_CHARS_PER_PAGE = 2500;
    
    let chunkText = '';
    let currentChunkCharCount = 0;
    let pageIndex = 0;

    const renderParecerJuizBlock = (text: string, isFirst: boolean, status: string | undefined, index: number) => (
      <section key={`parecer_juiz_${index}`} className="mb-6 bg-gray-100/50 p-4 border border-gray-300 min-h-[400px]">
        {isFirst ? (
          <>
            <h3 className="font-bold text-lg mb-2 border-b border-black/20 pb-1">DECISÃO JUDICIAL</h3>
            <p className="mb-2 text-sm"><span className="font-bold">Status:</span> {status || 'Pendente'}</p>
            {text && <p className="font-bold mt-2 text-sm">Parecer / Observações:</p>}
          </>
        ) : (
          <h3 className="font-bold text-lg mb-2 border-b border-black/20 pb-1 text-black/50">DECISÃO JUDICIAL (Continuação)</h3>
        )}
        {text && <p className="whitespace-pre-wrap ml-4 mt-2 text-sm text-justify leading-relaxed">{text}</p>}
      </section>
    );

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        if (currentChunkCharCount + p.length > MAX_CHARS_PER_PAGE && chunkText !== '') {
            const textToRender = chunkText.trim();
            const isFirst = pageIndex === 0;
            const idx = pageIndex;
            pages.push([{
                id: `parecer_juiz_${idx}`,
                height: 800,
                render: () => renderParecerJuizBlock(textToRender, isFirst, formData.statusMandado, idx)
            }]);
            chunkText = p + '\n';
            currentChunkCharCount = p.length + 1;
            pageIndex++;
        } else {
            chunkText += p + '\n';
            currentChunkCharCount += p.length + 1;
        }
    }
    
    // flush remainder
    const isFirst = pageIndex === 0;
    const idx = pageIndex;
    pages.push([{
        id: `parecer_juiz_${idx}`,
        height: 800,
        render: () => renderParecerJuizBlock(chunkText.trim(), isFirst, formData.statusMandado, idx)
    }]);
  }

  pages.push(blocks.filter(b => ['assinaturas'].includes(b.id)));

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
                {formData.tipoMandado || 'MANDADO JUDICIAL'}
              </h2>
              
              <div className="w-full max-w-2xl space-y-6">
                <div className="flex items-end gap-4">
                  <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">File Number:</span>
                  <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2">
                    {formData.directiveNo}
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">File Title:</span>
                  <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2 truncate">
                    {formData.nomeOperacao || '[NOME DA OPERAÇÃO]'}
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">Start Date:</span>
                  <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2">
                    {formData.dataSolicitacao}
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <span className="text-sm font-bold text-black/70 uppercase tracking-widest shrink-0">{formData.requerenteRank || 'Special Agent'}:</span>
                  <div className="flex-1 border-b-2 border-black/40 pb-1 text-lg font-mono text-black/80 px-2">
                    {formData.requerenteNome}
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
