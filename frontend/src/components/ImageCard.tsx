import React from 'react';
import { GeneratedImage } from '../types';
import { AlertTriangle, CheckCircle, FileText } from 'lucide-react';

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

interface ImageCardProps {
  image: GeneratedImage;
  onInspect: (image: GeneratedImage) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onInspect }) => {
  const quant = image.quantitative_metric;
  const qual = image.qualitative_audit;
  const monkTone = quant?.monk_tone ?? 1;
  const monkHex = MONK_HEX_CODES[monkTone] || '#a07e56';

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Image container */}
      <div className="relative aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
        {image.file_path ? (
          <img
            src={image.file_path}
            alt={image.prompt_pt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-stone-400 text-xs italic">Aguardando geração...</div>
        )}

        {/* Floating status tag */}
        <div className="absolute top-2 right-2 flex gap-1">
          {qual?.stereotypical_bias_detected && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Estereótipo
            </span>
          )}
          {qual?.researcher_verified && (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Validado
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Metadata badges */}
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="text-[10px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
              {image.system}
            </span>
            <span className="text-[10px] font-semibold bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-100">
              {image.identity_formulation}
            </span>
            <span className="text-[10px] font-semibold bg-stone-100 text-stone-800 px-2 py-0.5 rounded">
              {image.occupation}
            </span>
            <span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
              {image.region}
            </span>
          </div>

          <p className="text-xs text-stone-600 line-clamp-2 italic" title={image.prompt_pt}>
            "{image.prompt_pt}"
          </p>
        </div>

        {/* Quantitative Metrics Bar */}
        {quant ? (
          <div className="bg-stone-50 p-2 rounded-lg border border-stone-100 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Escala Monk (MST):</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-inner inline-block"
                  style={{ backgroundColor: monkHex }}
                />
                <span className="font-bold text-stone-800">Tom {quant.monk_tone}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Ângulo ITA:</span>
              <span className="font-semibold text-stone-800">
                {quant.ita_angle}° ({quant.ita_category})
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-stone-400 py-1">Processando métricas CIELab...</div>
        )}

        <button
          onClick={() => onInspect(image)}
          className="w-full text-xs font-semibold py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Inspecionar Codebook</span>
        </button>
      </div>
    </div>
  );
};
