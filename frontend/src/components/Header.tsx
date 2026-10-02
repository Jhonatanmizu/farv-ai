import React from 'react';
import {
  Layers,
  Activity,
  BarChart3,
  Wifi,
  WifiOff,
  Download,
  LogOut,
  LogIn,
} from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  activeTab: 'studio' | 'monitor' | 'metrics';
  setActiveTab: (tab: 'studio' | 'monitor' | 'metrics') => void;
  isWsConnected: boolean;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenExportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isWsConnected,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenExportModal,
}) => {
  return (
    <header className="bg-stone-900 text-stone-100 border-b border-stone-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-rose-900 border border-rose-700 flex items-center justify-center font-bold text-lg text-rose-100 shadow-inner">
              F
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight">FARV-IA</span>
                <span className="bg-rose-950 text-rose-300 text-xs px-2 py-0.5 rounded border border-rose-800">
                  PGCC / UEFS
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Auditoria de Vieses Raciais e Regionais em IA Generativa
              </p>
            </div>
          </div>

          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'studio'
                  ? 'bg-rose-900 text-white shadow-sm'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Estúdio Fatorial</span>
            </button>

            <button
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'monitor'
                  ? 'bg-rose-900 text-white shadow-sm'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Monitor & Galeria</span>
            </button>

            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'bg-rose-900 text-white shadow-sm'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Métricas & Vieses</span>
            </button>
          </nav>

          <div className="flex items-center space-x-3">
            {/* Global Export Trigger */}
            <button
              onClick={onOpenExportModal}
              title="Exportar CSV, SQLite e Imagens"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" />
              <span>Exportar</span>
            </button>

            {/* Auth / User Section */}
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800">
                <div className="w-6 h-6 rounded-full bg-rose-900 flex items-center justify-center text-xs text-rose-200 font-bold">
                  {currentUser.username[0]?.toUpperCase()}
                </div>
                <span className="text-xs text-stone-200 font-medium max-w-[100px] truncate" title={currentUser.username}>
                  {currentUser.username}
                </span>
                <button
                  onClick={onLogout}
                  title="Sair da conta"
                  className="text-stone-400 hover:text-rose-400 p-1 rounded transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition-colors shadow"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}

            {/* WS Live status indicator */}
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                isWsConnected
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}
            >
              {isWsConnected ? (
                <>
                  <Wifi className="w-3 h-3 mr-1 animate-pulse" /> Live
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" /> Off
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
