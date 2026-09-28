import React, { useEffect, useState } from 'react';
import { MetricSummary } from '../types';
import { fetchMetricsSummary } from '../services/api';
import { BarChart3, AlertOctagon, Scale, Globe2, Palette } from 'lucide-react';

const MONK_HEX_CODES: Record<number, string> = {
  1: '#f6ede4',
  2: '#f3e7db',
  3: '#f7dad0',
  4: '#eadaba',
  5: '#d7bd96',
  6: '#a07e56',
  7: '#825c43',
  8: '#604134',
  9: '#3a312a',
  10: '#292420',
};

interface MetricsDashboardProps {
  jobId: string | null;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ jobId }) => {
  const [metrics, setMetrics] = useState<MetricSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (jobId) {
      setLoading(true);
      fetchMetricsSummary(jobId)
        .then((res) => setMetrics(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [jobId]);

  if (!jobId) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-stone-200">
        <p className="text-stone-500">Selecione ou execute uma auditoria para visualizar as métricas estatísticas.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-stone-200">
        <p className="text-stone-500">Computando distribuições fenotípicas e de codebook...</p>
      </div>
    );
  }

  if (!metrics || metrics.total_audited === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-stone-200">
        <p className="text-stone-500">Nenhum dado dermatológico ou qualitativo coletado ainda para este lote.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Statistical KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-stone-100 rounded-lg text-stone-800">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold block">
              Total Amostrado
            </span>
            <span className="text-2xl font-black text-stone-900">{metrics.total_audited} Retratos</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-50 rounded-lg text-rose-800">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold block">
              Taxa de Viés Estereotípico
            </span>
            <span className="text-2xl font-black text-rose-900">
              {(metrics.stereotypical_bias_rate * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-800">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold block">
              Espectro Monk Presente
            </span>
            <span className="text-2xl font-black text-stone-900">
              {Object.keys(metrics.monk_distribution).length} / 10 Tons
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 2 questions, 2 measures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medida 1: Distribuição de Tonalidade (ITA) */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-rose-800" />
              Pergunta 1: Distribuição do Ângulo Tipológico Individual (ITA)
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Classificação fenotípica (Chardon / Fitzpatrick) a partir dos canais L* e b* no espaço CIELab.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {metrics.ita_distribution.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-stone-700">{item.category}</span>
                  <span className="text-stone-900 font-mono">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-900 h-2.5 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medida 2: Espectro da Escala Monk (MST 1 a 10) */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-700" />
              Pergunta 1 (Cont.): Frequência na Escala Monk Skin Tone (1-10)
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Mapeamento de distância euclidiana ΔE nos centróides universais da escala Monk.
            </p>
          </div>

          <div className="grid grid-cols-10 gap-1.5 pt-4">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((tone) => {
              const count = metrics.monk_distribution[tone] || 0;
              const percent = metrics.total_audited > 0 ? (count / metrics.total_audited) * 100 : 0;
              return (
                <div key={tone} className="flex flex-col items-center space-y-2">
                  <div className="text-[10px] font-bold text-stone-600">T{tone}</div>
                  <div
                    className="w-full h-16 rounded border border-stone-300 shadow-inner flex items-end justify-center pb-1"
                    style={{ backgroundColor: MONK_HEX_CODES[tone] }}
                  >
                    <span className="text-[9px] font-bold bg-white/80 px-1 rounded text-stone-900">
                      {count}
                    </span>
                  </div>
                  <div className="text-[9px] text-stone-500 font-mono">{percent.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Disparidade Regional */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-rose-800" />
            Disparidades Regionais Brasileiras (Médias do Ângulo ITA)
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Investigação de assimetrias fenotípicas representadas por macrorregião (Norte, Nordeste, Centro-Oeste, Sudeste, Sul).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {metrics.regional_disparities.map((reg) => (
            <div key={reg.region} className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-stone-900">{reg.region}</span>
                <span className="text-xs text-stone-500">{reg.total_images} imagens</span>
              </div>
              <div className="text-xs text-stone-600">
                Média ITA:{' '}
                <span className="font-mono font-bold text-rose-900 text-sm">{reg.mean_ita}°</span>
              </div>
              <div className="text-[11px] text-stone-500 flex items-center gap-1">
                <span>Tons Monk amostrados:</span>
                <span className="font-mono font-semibold text-stone-700">
                  {Array.from(new Set(reg.monk_tones)).sort((a, b) => a - b).join(', ') || 'Nenhum'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
