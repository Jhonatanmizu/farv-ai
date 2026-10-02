import React from 'react';
import { Download, Database, FileSpreadsheet, Archive, X } from 'lucide-react';
import { getExportCsvUrl, getExportImagesZipUrl, getExportSqliteUrl } from '../services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: string;
  jobName?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, jobId, jobName }) => {
  if (!isOpen) return null;

  const sqliteUrl = getExportSqliteUrl();
  const csvUrl = getExportCsvUrl(jobId);
  const zipUrl = getExportImagesZipUrl(jobId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-stone-900 border border-stone-800 rounded-xl max-w-lg w-full p-6 text-stone-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-300">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Exportação de Dados & Imagens</h2>
            <p className="text-xs text-stone-400">
              {jobId && jobName
                ? `Exportando dados da sessão: ${jobName}`
                : 'Exportação global de todas as sessões e banco de dados'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* CSV Export Option */}
          <div className="p-4 bg-stone-950 rounded-lg border border-stone-800 hover:border-rose-900 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">
                    Planilha Tabular CSV {jobId ? '(Sessão Selecionada)' : '(Todas as Sessões)'}
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Inclui parâmetros fatoriais, métricas quantitativas (ITA, Monk, L*a*b*), links
                    públicos das imagens servidas pelo Fly.io e correlação com cada revisor.
                  </p>
                </div>
              </div>
              <a
                href={csvUrl}
                download
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-xs font-medium transition-colors shrink-0 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar CSV</span>
              </a>
            </div>
          </div>

          {/* SQLite Export Option */}
          <div className="p-4 bg-stone-950 rounded-lg border border-stone-800 hover:border-rose-900 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Database className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">
                    Banco de Dados SQLite Completo (.sqlite)
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Snapshot consistente do banco de dados relacional completo contendo tabelas de
                    usuários, sessões, imagens e revisões multiusuário.
                  </p>
                </div>
              </div>
              <a
                href={sqliteUrl}
                download
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-md text-xs font-medium transition-colors shrink-0 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar SQLite</span>
              </a>
            </div>
          </div>

          {/* Images ZIP Export Option */}
          <div className="p-4 bg-stone-950 rounded-lg border border-stone-800 hover:border-rose-900 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Archive className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">
                    Pacote ZIP de Imagens PNG {jobId ? '(Sessão Selecionada)' : '(Todas as Sessões)'}
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Arquivo compactado contendo as imagens geradas em alta resolução e manifesto de
                    correlação em CSV.
                  </p>
                </div>
              </div>
              <a
                href={zipUrl}
                download
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded-md text-xs font-medium transition-colors shrink-0 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar ZIP</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-800 flex items-center justify-between text-xs text-stone-500">
          <span>Hospedagem Fly.io (Volume /data persistente)</span>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-300 font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
