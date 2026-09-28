import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import { updateQualitativeAudit } from '../services/api';
import { X, Save } from 'lucide-react';

interface QualitativeModalProps {
  image: GeneratedImage | null;
  onClose: () => void;
  onSaved: (updatedImage: GeneratedImage) => void;
}

export const QualitativeModal: React.FC<QualitativeModalProps> = ({ image, onClose, onSaved }) => {
  if (!image) return null;

  const qual = image.qualitative_audit;
  const quant = image.quantitative_metric;

  const [score, setScore] = useState(qual?.prompt_adherence_score ?? 1.0);
  const [environment, setEnvironment] = useState(qual?.detected_environment ?? '');
  const [markers, setMarkers] = useState(qual?.visual_markers ?? '');
  const [biasDetected, setBiasDetected] = useState(qual?.stereotypical_bias_detected ?? false);
  const [notes, setNotes] = useState(qual?.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedQual = await updateQualitativeAudit(image.id, {
        prompt_adherence_score: score,
        detected_environment: environment,
        visual_markers: markers,
        stereotypical_bias_detected: biasDetected,
        notes,
        researcher_verified: true,
      });

      const updatedImage: GeneratedImage = {
        ...image,
        qualitative_audit: updatedQual,
      };
      onSaved(updatedImage);
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full overflow-hidden border border-stone-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <h3 className="font-bold text-lg text-stone-900">
              Auditoria Qualitativa de Representação Visual
            </h3>
            <p className="text-xs text-stone-500">
              ID: {image.id} • {image.identity_formulation} • {image.occupation} ({image.region})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual reference */}
            <div className="space-y-3">
              <div className="aspect-square bg-stone-100 rounded-lg overflow-hidden border border-stone-200">
                {image.file_path && (
                  <img
                    src={image.file_path}
                    alt={image.prompt_pt}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {quant && (
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs space-y-1">
                  <div className="font-semibold text-stone-700">Métricas Dermatológicas:</div>
                  <div className="text-stone-600">
                    CIELab: L*={quant.l_star}, a*={quant.a_star}, b*={quant.b_star}
                  </div>
                  <div className="text-stone-600">
                    Ângulo ITA: {quant.ita_angle}° ({quant.ita_category}) • Monk Tone {quant.monk_tone}
                  </div>
                </div>
              )}
            </div>

            {/* Codebook form */}
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Aderência ao Prompt (Fidelidade): {score.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={score}
                  onChange={(e) => setScore(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Ambiente Cenográfico Detectado
                </label>
                <input
                  type="text"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-rose-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Marcadores Visuais & Vestimentas
                </label>
                <input
                  type="text"
                  value={markers}
                  onChange={(e) => setMarkers(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-rose-800"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={biasDetected}
                    onChange={(e) => setBiasDetected(e.target.checked)}
                    className="rounded text-rose-800 focus:ring-rose-800 h-4 w-4"
                  />
                  <span className="font-medium text-stone-800">
                    Detectado viés estereotípico ou assimetria de representação
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Anotações da Pesquisadora (Codebook)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-rose-800"
                  placeholder="Observações sobre estereótipos, iluminação, composição social..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-5 py-2 text-sm font-semibold text-white bg-rose-900 hover:bg-rose-800 rounded-md shadow-sm"
            >
              {isSaving ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Validar & Salvar no Codebook</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
