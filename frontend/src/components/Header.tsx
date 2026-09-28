import React from 'react';
import { Layers, Activity, BarChart3, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  activeTab: 'studio' | 'monitor' | 'metrics';
  setActiveTab: (tab: 'studio' | 'monitor' | 'metrics') => void;
  isWsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isWsConnected }) => {
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

          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                isWsConnected
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}
            >
              {isWsConnected ? (
                <>
                  <Wifi className="w-3 h-3 mr-1 animate-pulse" /> Live WS
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" /> Desconectado
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
