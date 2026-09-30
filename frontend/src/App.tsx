import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AuditStudio } from './components/AuditStudio';
import { BatchMonitor } from './components/BatchMonitor';
import { MetricsDashboard } from './components/MetricsDashboard';
import { QualitativeModal } from './components/QualitativeModal';
import { AuditJob, GeneratedImage } from './types';
import { createWebSocket, fetchAuditJobs, fetchAuditJobDetail } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'monitor' | 'metrics'>('studio');
  const [jobs, setJobs] = useState<AuditJob[]>([]);
  const [currentJob, setCurrentJob] = useState<AuditJob | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  const loadJobs = async () => {
    try {
      const data = await fetchAuditJobs();
      setJobs(data);
      if (data.length > 0 && !currentJob) {
        loadJobDetail(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  const loadJobDetail = async (jobId: string) => {
    try {
      const detail = await fetchAuditJobDetail(jobId);
      setCurrentJob(detail);
    } catch (err) {
      console.error('Error fetching job detail:', err);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Initialize WebSocket for real-time background task updates
  useEffect(() => {
    const wsClient = createWebSocket(
      (data) => {
        if (data.event === 'image_completed' || data.event === 'image_failed') {
          if (currentJob && currentJob.id === data.job_id) {
            loadJobDetail(data.job_id);
          }
        } else if (data.event === 'job_completed') {
          loadJobs();
          if (currentJob && currentJob.id === data.job_id) {
            loadJobDetail(data.job_id);
          }
        }
      },
      (connected) => {
        setIsWsConnected(connected);
      }
    );

    return () => {
      wsClient.close();
    };
  }, [currentJob?.id]);

  const handleJobCreated = (newJob: AuditJob) => {
    setJobs((prev) => [newJob, ...prev]);
    loadJobDetail(newJob.id);
    setActiveTab('monitor');
  };

  const handleImageUpdated = (updatedImg: GeneratedImage) => {
    if (currentJob && currentJob.images) {
      setCurrentJob({
        ...currentJob,
        images: currentJob.images.map((img) => (img.id === updatedImg.id ? updatedImg : img)),
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isWsConnected={isWsConnected}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'studio' && <AuditStudio onJobCreated={handleJobCreated} />}
        {activeTab === 'monitor' && (
          <BatchMonitor
            currentJob={currentJob}
            jobs={jobs}
            onSelectJob={(id) => loadJobDetail(id)}
            onRefresh={() => currentJob && loadJobDetail(currentJob.id)}
            onInspectImage={(img) => setSelectedImage(img)}
          />
        )}
        {activeTab === 'metrics' && <MetricsDashboard jobId={currentJob?.id || null} />}
      </main>

      {/* Codebook inspection & qualitative audit modal */}
      <QualitativeModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
        onSaved={handleImageUpdated}
      />

      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <p>
          FARV-IA • Framework de Auditoria de Representações Visuais em IA Generativa
        </p>
        <p className="mt-1 text-stone-400">
          Baseado na pesquisa experimental de Daniele Souza das Virgens (PGCC/UEFS, 2026)
        </p>
      </footer>
    </div>
  );
};
