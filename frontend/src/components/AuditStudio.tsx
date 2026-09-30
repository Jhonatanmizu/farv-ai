import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Sliders, CheckSquare, Square, Eye } from 'lucide-react';
import { createAuditJob, fetchFactors, previewPrompt } from '../services/api';
import { AuditJob } from '../types';

interface AuditStudioProps {
  onJobCreated: (job: AuditJob) => void;
}

export const AuditStudio: React.FC<AuditStudioProps> = ({ onJobCreated }) => {
  const [factors, setFactors] = useState<{
    systems: string[];
    identities: string[];
    occupations: string[];
    regions: string[];
  }>({
    systems: ['ChatGPT (DALL-E 3)', 'Stable Diffusion'],
    identities: ['Sem raça explícita', 'Mulher preta', 'Mulher branca'],
    occupations: ['Juíza', 'Médica', 'Ambiente genérico', 'Empregada doméstica', 'Faxineira'],
    regions: ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Sem referência'],
  });

  const [selectedSystems, setSelectedSystems] = useState<string[]>(factors.systems);
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>(factors.identities);
  const [selectedOccupations, setSelectedOccupations] = useState<string[]>(factors.occupations);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(factors.regions);

  const [providersStatus, setProvidersStatus] = useState<{
    mock: boolean;
    stability: boolean;
    dalle: boolean;
  }>({ mock: true, stability: false, dalle: false });

  const [jobName, setJobName] = useState('Auditoria Piloto - Representações Visuais 2026');
  const [provider, setProvider] = useState('stability');
  const [repetitions, setRepetitions] = useState(1);
  const [translateToEn, setTranslateToEn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live prompt preview state
  const [previewPt, setPreviewPt] = useState('');
  const [previewEn, setPreviewEn] = useState<string | undefined>('');

  useEffect(() => {
    fetchFactors()
      .then((data) => {
        setFactors(data.factors);
        setSelectedSystems(data.factors.systems);
        setSelectedIdentities(data.factors.identities);
        setSelectedOccupations(data.factors.occupations);
        setSelectedRegions(data.factors.regions);
        if (data.default_provider) {
          setProvider(data.default_provider);
        }
        if (data.providers_status) {
          setProvidersStatus(data.providers_status);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (
      selectedSystems.length > 0 &&
      selectedIdentities.length > 0 &&
      selectedOccupations.length > 0 &&
      selectedRegions.length > 0
    ) {
      previewPrompt({
        system: selectedSystems[0],
        identity_formulation: selectedIdentities[0],
        occupation: selectedOccupations[0],
        region: selectedRegions[0],
        include_english_translation: true,
      })
        .then((res) => {
          setPreviewPt(res.prompt_pt);
          setPreviewEn(res.prompt_en);
        })
        .catch((err) => console.error(err));
    }
  }, [selectedSystems, selectedIdentities, selectedOccupations, selectedRegions]);

  const toggleItem = (list: string[], setList: (val: string[]) => void, item: string) => {
    if (list.includes(item)) {
      if (list.length > 1) {
        setList(list.filter((i) => i !== item));
      }
    } else {
      setList([...list, item]);
    }
  };

  const totalConditions =
    selectedSystems.length *
    selectedIdentities.length *
    selectedOccupations.length *
    selectedRegions.length;

  const totalImages = totalConditions * repetitions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const job = await createAuditJob({
        name: jobName,
        provider,
        systems: selectedSystems,
        identities: selectedIdentities,
        occupations: selectedOccupations,
        regions: selectedRegions,
        repetitions,
        translate_to_en: translateToEn,
      });
      onJobCreated(job);
    } catch (err: any) {
      alert(`Erro ao iniciar auditoria: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
        <div className="border-b border-stone-100 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                <Sliders className="w-5 h-5 text-rose-800" />
                Configurador do Desenho Experimental Fatorial
              </h2>
              <p className="text-sm text-stone-600 mt-1">
                Protocolo com 4 fatores experimentais: {selectedSystems.length} sistemas ×{' '}
                {selectedIdentities.length} formulações × {selectedOccupations.length} ocupações ×{' '}
                {selectedRegions.length} regiões ={' '}
                <span className="font-semibold text-rose-800">{totalConditions} condições</span>.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-wider text-stone-600 font-semibold block">
                Total de Imagens
              </span>
              <span className="text-2xl font-black text-stone-900">{totalImages}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Fator 1: Sistemas */}
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
              <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-3">
                1. Sistemas de IA ({selectedSystems.length}/{factors.systems.length})
              </h3>
              <div className="space-y-2">
                {factors.systems.map((sys) => (
                  <button
                    type="button"
                    key={sys}
                    onClick={() => toggleItem(selectedSystems, setSelectedSystems, sys)}
                    className="flex items-center space-x-2 text-sm w-full text-left p-1.5 rounded hover:bg-stone-100 transition-colors"
                  >
                    {selectedSystems.includes(sys) ? (
                      <CheckSquare className="w-4 h-4 text-rose-800 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-600 shrink-0" />
                    )}
                    <span className="text-stone-800 font-medium truncate">{sys}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fator 2: Formulações Identitárias */}
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
              <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-3">
                2. Formulação Identitária ({selectedIdentities.length}/{factors.identities.length})
              </h3>
              <div className="space-y-2">
                {factors.identities.map((id) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => toggleItem(selectedIdentities, setSelectedIdentities, id)}
                    className="flex items-center space-x-2 text-sm w-full text-left p-1.5 rounded hover:bg-stone-100 transition-colors"
                  >
                    {selectedIdentities.includes(id) ? (
                      <CheckSquare className="w-4 h-4 text-rose-800 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-600 shrink-0" />
                    )}
                    <span className="text-stone-800 font-medium truncate">{id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fator 3: Ocupações */}
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
              <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-3">
                3. Ocupação ({selectedOccupations.length}/{factors.occupations.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {factors.occupations.map((occ) => (
                  <button
                    type="button"
                    key={occ}
                    onClick={() => toggleItem(selectedOccupations, setSelectedOccupations, occ)}
                    className="flex items-center space-x-2 text-sm w-full text-left p-1.5 rounded hover:bg-stone-100 transition-colors"
                  >
                    {selectedOccupations.includes(occ) ? (
                      <CheckSquare className="w-4 h-4 text-rose-800 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-600 shrink-0" />
                    )}
                    <span className="text-stone-800 font-medium truncate">{occ}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fator 4: Regiões */}
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
              <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-3">
                4. Região Geográfica ({selectedRegions.length}/{factors.regions.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {factors.regions.map((reg) => (
                  <button
                    type="button"
                    key={reg}
                    onClick={() => toggleItem(selectedRegions, setSelectedRegions, reg)}
                    className="flex items-center space-x-2 text-sm w-full text-left p-1.5 rounded hover:bg-stone-100 transition-colors"
                  >
                    {selectedRegions.includes(reg) ? (
                      <CheckSquare className="w-4 h-4 text-rose-800 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-600 shrink-0" />
                    )}
                    <span className="text-stone-800 font-medium truncate">{reg}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Prompt Preview */}
          <div className="bg-stone-900 text-stone-100 p-4 rounded-lg border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-rose-400">
                <Eye className="w-3.5 h-3.5" />
                Template LangChain Pré-renderizado
              </span>
              <span>{selectedIdentities[0]} • {selectedOccupations[0]} • {selectedRegions[0]}</span>
            </div>
            <p className="text-sm text-stone-200 font-mono bg-stone-950 p-3 rounded border border-stone-800">
              {previewPt || 'Carregando preview...'}
            </p>
            {previewEn && (
              <p className="text-xs text-stone-400 font-mono bg-stone-950/60 p-2 rounded">
                EN: {previewEn}
              </p>
            )}
          </div>

          {/* Parâmetros do Lote */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                Título do Experimento
              </label>
              <input
                type="text"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                required
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-rose-800 focus:border-rose-800"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Provedor de Execução
                </label>
                <div className="flex gap-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      providersStatus.stability
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    Stability {providersStatus.stability ? '✓' : '✗'}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      providersStatus.dalle
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    OpenAI {providersStatus.dalle ? '✓' : '✗'}
                  </span>
                </div>
              </div>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-rose-800 focus:border-rose-800 bg-white"
              >
                <option value="auto">
                  Multi-Modelo Real (DALL-E 3 para ChatGPT + SD para Stable Diffusion)
                </option>
                <option value="stability">
                  Stability AI / Stable Diffusion (API Real {providersStatus.stability ? '• Ativa' : ''})
                </option>
                <option value="dall-e">
                  OpenAI DALL-E 3 / GPT-Image (API Real {providersStatus.dalle ? '• Ativa' : ''})
                </option>
                <option value="mock">Simulador Mock (Gratuito / Offline / Testes)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                Repetições por Condição (Sementes)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={repetitions}
                onChange={(e) => setRepetitions(parseInt(e.target.value) || 1)}
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-rose-800 focus:border-rose-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <label className="flex items-center space-x-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={translateToEn}
                onChange={(e) => setTranslateToEn(e.target.checked)}
                className="rounded text-rose-800 focus:ring-rose-800 h-4 w-4"
              />
              <span>Enviar prompt traduzido para inglês (LangChain English Adapter)</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || totalConditions === 0}
              className="inline-flex items-center space-x-2 bg-rose-900 hover:bg-rose-800 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Iniciando Fila...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Disparar Auditoria ({totalImages} Imagens)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
