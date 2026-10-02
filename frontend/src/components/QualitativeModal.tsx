import React, { useEffect, useState } from 'react';
import { GeneratedImage, QualitativeAudit, User } from '../types';
import { fetchImageReviews, updateQualitativeAudit } from '../services/api';
import { X, Save, Users, AlertTriangle, CheckCircle2, User as UserIcon, Lock } from 'lucide-react';

interface QualitativeModalProps {
  image: GeneratedImage | null;
  currentUser: User | null;
  onOpenAuthModal?: () => void;
  onClose: () => void;
  onSaved: (updatedImage: GeneratedImage) => void;
}

export const QualitativeModal: React.FC<QualitativeModalProps> = ({
  image,
  currentUser,
  onOpenAuthModal,
  onClose,
  onSaved,
}) => {
  if (!image) return null;

  const quant = image.quantitative_metric;

  // Find review belonging to the current user if present
  const myReview = currentUser
    ? image.reviews?.find((r) => r.user_id === currentUser.id)
    : image.qualitative_audit?.researcher_verified
    ? image.qualitative_audit
    : undefined;

  const isAlreadySubmitted = Boolean(myReview?.researcher_verified);

  const [score, setScore] = useState(myReview?.prompt_adherence_score ?? 1.0);
  const [environment, setEnvironment] = useState(myReview?.detected_environment ?? '');
  const [markers, setMarkers] = useState(myReview?.visual_markers ?? '');
  const [biasDetected, setBiasDetected] = useState(myReview?.stereotypical_bias_detected ?? false);
  const [notes, setNotes] = useState(myReview?.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Other reviews for inter-annotator comparison
  const [allReviews, setAllReviews] = useState<QualitativeAudit[]>(image.reviews ?? []);
  const [hasSubmittedNow, setHasSubmittedNow] = useState(isAlreadySubmitted);

  useEffect(() => {
    // When review is submitted, fetch latest reviews across all researchers
    if (isAlreadySubmitted || hasSubmittedNow) {
      fetchImageReviews(image.id)
        .then((reviews) => setAllReviews(reviews))
        .catch(() => {});
    }
  }, [image.id, isAlreadySubmitted, hasSubmittedNow]);

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

      setHasSubmittedNow(true);

      // Re-fetch all reviews for this image
      const refreshedReviews = await fetchImageReviews(image.id).catch(() => [updatedQual]);
      setAllReviews(refreshedReviews);

      const updatedImage: GeneratedImage = {
        ...image,
        qualitative_audit: updatedQual,
        reviews: refreshedReviews,
      };
      onSaved(updatedImage);
    } catch (err: any) {
      alert(`Erro ao salvar auditoria: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const otherReviews = allReviews.filter(
    (r) => !currentUser || (r.user_id !== currentUser.id && r.reviewer_username !== currentUser.username)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-stone-900 rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden border border-stone-800 text-stone-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-lg text-stone-100">
                Auditoria Qualitativa de Representação Visual
              </h3>
              {currentUser && (
                <span className="text-xs bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-medium">
                  Revisor: {currentUser.username}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              ID: {image.id} • {image.identity_formulation} • {image.occupation} ({image.region})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth prompt banner if unauthenticated */}
        {!currentUser && (
          <div className="bg-amber-950/60 border-b border-amber-900/60 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Você está avaliando como pesquisador anônimo. Faça login para correlacionar sua
                identidade nas exportações.
              </span>
            </div>
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="underline hover:text-white font-medium ml-2"
              >
                Fazer Login
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual reference */}
            <div className="space-y-4">
              <div className="aspect-square bg-stone-950 rounded-lg overflow-hidden border border-stone-800 relative group shadow-inner">
                {image.file_path ? (
                  <img
                    src={image.file_path}
                    alt={image.prompt_pt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-stone-600 text-xs">
                    Sem imagem disponível
                  </div>
                )}
              </div>

              {/* Prompt box */}
              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 text-xs space-y-1">
                <span className="font-semibold text-stone-400 block uppercase tracking-wider text-[10px]">
                  Prompt em Português:
                </span>
                <p className="text-stone-300 italic">{image.prompt_pt}</p>
                {image.prompt_en && (
                  <>
                    <span className="font-semibold text-stone-500 block uppercase tracking-wider text-[10px] mt-2">
                      Prompt em Inglês:
                    </span>
                    <p className="text-stone-400 italic">{image.prompt_en}</p>
                  </>
                )}
              </div>

              {/* Dermatological Metrics */}
              {quant && (
                <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 text-xs space-y-1.5">
                  <div className="font-semibold text-rose-400 uppercase tracking-wider text-[10px]">
                    Métricas Dermatológicas (Skin Sampler):
                  </div>
                  <div className="text-stone-300 flex justify-between">
                    <span>Espaço CIELab:</span>
                    <span className="font-mono text-stone-400">
                      L*={quant.l_star}, a*={quant.a_star}, b*={quant.b_star}
                    </span>
                  </div>
                  <div className="text-stone-300 flex justify-between">
                    <span>Ângulo ITA / Categoria:</span>
                    <span className="font-semibold text-rose-300">
                      {quant.ita_angle}° ({quant.ita_category})
                    </span>
                  </div>
                  <div className="text-stone-300 flex justify-between">
                    <span>Monk Skin Tone:</span>
                    <span className="font-semibold text-amber-300">
                      Escala {quant.monk_tone} (ΔE = {quant.monk_delta_e})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Evaluation Form */}
            <div className="space-y-4 text-sm">
              <div className="bg-stone-950 p-4 rounded-lg border border-stone-800 space-y-4">
                <div className="border-b border-stone-800 pb-2">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                    Sua Avaliação Independente (Blind Protocol)
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-stone-300 uppercase">
                      Aderência ao Prompt (Fidelidade):
                    </label>
                    <span className="text-xs font-bold text-rose-400 font-mono">
                      {(score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={score}
                    onChange={(e) => setScore(parseFloat(e.target.value))}
                    className="w-full accent-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase mb-1">
                    Ambiente Cenográfico Detectado
                  </label>
                  <input
                    type="text"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    required
                    placeholder="Ex: Tribunal, hospital, ambiente doméstico precário..."
                    className="w-full text-sm px-3 py-2 bg-stone-900 border border-stone-700 rounded-md text-stone-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase mb-1">
                    Marcadores Visuais & Vestimentas
                  </label>
                  <input
                    type="text"
                    value={markers}
                    onChange={(e) => setMarkers(e.target.value)}
                    placeholder="Ex: Toga, jaleco, uniforme de limpeza, avental..."
                    className="w-full text-sm px-3 py-2 bg-stone-900 border border-stone-700 rounded-md text-stone-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={biasDetected}
                      onChange={(e) => setBiasDetected(e.target.checked)}
                      className="rounded bg-stone-950 border-stone-700 text-rose-600 focus:ring-rose-500 h-4 w-4 mt-0.5"
                    />
                    <span className="text-xs font-medium text-stone-200">
                      Detectado viés estereotípico, sub-representação ou assimetria de dignidade
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase mb-1">
                    Anotações Críticas (Codebook)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-stone-900 border border-stone-700 rounded-md text-stone-100 focus:outline-none focus:border-rose-500"
                    placeholder="Observações sociotécnicas sobre raça, gênero e contexto regional..."
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-md transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-md shadow-lg shadow-rose-950 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? (
                      <span>Salvando...</span>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Validar & Salvar Avaliação</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Inter-annotator comparisons (shown once user has submitted their review) */}
          {(isAlreadySubmitted || hasSubmittedNow) && (
            <div className="pt-6 border-t border-stone-800 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-stone-300">
                <Users className="w-4 h-4 text-rose-400" />
                <span>
                  Concordância Inter-Avaliadores ({otherReviews.length}{' '}
                  {otherReviews.length === 1 ? 'outro pesquisador' : 'outros pesquisadores'})
                </span>
              </div>

              {otherReviews.length === 0 ? (
                <div className="p-4 bg-stone-950 rounded-lg border border-stone-800 text-xs text-stone-500 italic">
                  Nenhum outro pesquisador auditou esta imagem ainda.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {otherReviews.map((rev, idx) => (
                    <div
                      key={rev.id || idx}
                      className="p-3.5 bg-stone-950 rounded-lg border border-stone-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-stone-800/80 pb-1.5">
                        <div className="flex items-center space-x-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-rose-400" />
                          <span className="font-semibold text-stone-200">
                            {rev.reviewer_username || 'Revisor Anônimo'}
                          </span>
                        </div>
                        {rev.stereotypical_bias_detected ? (
                          <span className="inline-flex items-center text-[10px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-900">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Viés Detectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Sem Viés
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-400">
                        <div>
                          <span className="block text-stone-500">Aderência:</span>
                          <span className="font-mono text-stone-300 font-medium">
                            {(rev.prompt_adherence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          <span className="block text-stone-500">Ambiente:</span>
                          <span className="text-stone-300 font-medium truncate block">
                            {rev.detected_environment || '-'}
                          </span>
                        </div>
                      </div>

                      {rev.visual_markers && (
                        <div className="text-[11px] text-stone-400">
                          <span className="text-stone-500">Marcadores: </span>
                          <span className="text-stone-300">{rev.visual_markers}</span>
                        </div>
                      )}

                      {rev.notes && (
                        <div className="text-[11px] bg-stone-900/80 p-2 rounded border border-stone-800 text-stone-300 italic">
                          "{rev.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
