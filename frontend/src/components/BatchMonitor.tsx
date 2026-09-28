import React, { useState } from 'react';
import { AuditJob, GeneratedImage } from '../types';
import { ImageCard } from './ImageCard';
import { CheckCircle2, RefreshCw, Filter } from 'lucide-react';

interface BatchMonitorProps {
  currentJob: AuditJob | null;
  jobs: AuditJob[];
  onSelectJob: (jobId: string) => void;
  onRefresh: () => void;
  onInspectImage: (image: GeneratedImage) => void;
}

export const BatchMonitor: React.FC<BatchMonitorProps> = ({
  currentJob,
  jobs,
  onSelectJob,
  onRefresh,
  onInspectImage,
}) => {
  const [filterIdentity, setFilterIdentity] = useState<string>('all');
  const [filterOccupation, setFilterOccupation] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');

  const images = currentJob?.images || [];

  const filteredImages = images.filter((img) => {
    if (filterIdentity !== 'all' && img.identity_formulation !== filterIdentity) return false;
    if (filterOccupation !== 'all' && img.occupation !== filterOccupation) return false;
    if (filterRegion !== 'all' && img.region !== filterRegion) return false;
    return true;
  });

  const progressPercent = currentJob
    ? Math.round(((currentJob.completed_images + currentJob.failed_images) / (currentJob.total_images || 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Job Selector */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              {currentJob ? currentJob.name : 'Nenhuma Auditoria Selecionada'}
            </h2>
            {currentJob?.status === 'running' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 animate-pulse">
                Gerando Imagens...
              </span>
            )}
            {currentJob?.status === 'completed' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Concluído
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">
            Provedor: <span className="font-semibold text-stone-700">{currentJob?.provider}</span> •{' '}
            {currentJob?.completed_images} de {currentJob?.total_images} imagens processadas
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={currentJob?.id || ''}
            onChange={(e) => onSelectJob(e.target.value)}
            className="text-sm px-3 py-2 border border-stone-300 rounded-md bg-white text-stone-800 focus:ring-2 focus:ring-rose-800"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name} ({j.status})
              </option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            className="p-2 border border-stone-300 rounded-md hover:bg-stone-50 text-stone-600 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {currentJob && (
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex justify-between text-xs font-bold text-stone-700">
            <span>Progresso da Auditoria Fatorial</span>
            <span>
              {progressPercent}% ({currentJob.completed_images}/{currentJob.total_images})
            </span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden border border-stone-200">
            <div
              className="bg-rose-900 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <span className="font-bold text-stone-700 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filtrar Corpus:
        </span>

        <select
          value={filterIdentity}
          onChange={(e) => setFilterIdentity(e.target.value)}
          className="px-2.5 py-1.5 border border-stone-300 rounded-md bg-white text-stone-700"
        >
          <option value="all">Todas as Formulações Identitárias</option>
          <option value="Sem raça explícita">Sem raça explícita</option>
          <option value="Mulher preta">Mulher preta</option>
          <option value="Mulher branca">Mulher branca</option>
        </select>

        <select
          value={filterOccupation}
          onChange={(e) => setFilterOccupation(e.target.value)}
          className="px-2.5 py-1.5 border border-stone-300 rounded-md bg-white text-stone-700"
        >
          <option value="all">Todas as Ocupações</option>
          <option value="Juíza">Juíza</option>
          <option value="Médica">Médica</option>
          <option value="Ambiente genérico">Ambiente genérico</option>
          <option value="Empregada doméstica">Empregada doméstica</option>
          <option value="Faxineira">Faxineira</option>
        </select>

        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="px-2.5 py-1.5 border border-stone-300 rounded-md bg-white text-stone-700"
        >
          <option value="all">Todas as Regiões</option>
          <option value="Norte">Norte</option>
          <option value="Nordeste">Nordeste</option>
          <option value="Centro-Oeste">Centro-Oeste</option>
          <option value="Sudeste">Sudeste</option>
          <option value="Sul">Sul</option>
          <option value="Sem referência">Sem referência</option>
        </select>

        <span className="ml-auto text-stone-500 font-medium">
          Exibindo {filteredImages.length} de {images.length} retratos gerados
        </span>
      </div>

      {/* Gallery Grid */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((img) => (
            <ImageCard key={img.id} image={img} onInspect={onInspectImage} />
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-stone-200">
          <p className="text-stone-500 text-sm">
            Nenhuma imagem corresponde aos filtros ou o lote ainda está na fila de geração.
          </p>
        </div>
      )}
    </div>
  );
};
