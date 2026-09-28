import { AuditJob, MetricSummary, QualitativeAudit } from '../types';

const API_BASE = '/api/v1';

export async function fetchFactors(): Promise<{
  factors: {
    systems: string[];
    identities: string[];
    occupations: string[];
    regions: string[];
  };
  total_conditions: number;
}> {
  const res = await fetch(`${API_BASE}/conditions`);
  if (!res.ok) throw new Error('Failed to fetch experimental factors');
  return res.json();
}

export async function previewPrompt(condition: {
  system: string;
  identity_formulation: string;
  occupation: string;
  region: string;
  include_english_translation?: boolean;
}): Promise<{ prompt_pt: string; prompt_en?: string }> {
  const res = await fetch(`${API_BASE}/conditions/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      condition: {
        system: condition.system,
        identity_formulation: condition.identity_formulation,
        occupation: condition.occupation,
        region: condition.region,
      },
      include_english_translation: condition.include_english_translation ?? true,
    }),
  });
  if (!res.ok) throw new Error('Failed to preview prompt');
  return res.json();
}

export async function createAuditJob(data: {
  name: string;
  provider: string;
  systems: string[];
  identities: string[];
  occupations: string[];
  regions: string[];
  repetitions: number;
  translate_to_en: boolean;
}): Promise<AuditJob> {
  const res = await fetch(`${API_BASE}/audits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to start audit job');
  return res.json();
}

export async function fetchAuditJobs(): Promise<AuditJob[]> {
  const res = await fetch(`${API_BASE}/audits`);
  if (!res.ok) throw new Error('Failed to fetch audit jobs');
  return res.json();
}

export async function fetchAuditJobDetail(jobId: string): Promise<AuditJob> {
  const res = await fetch(`${API_BASE}/audits/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch audit job detail');
  return res.json();
}

export async function fetchMetricsSummary(jobId: string): Promise<MetricSummary> {
  const res = await fetch(`${API_BASE}/metrics/${jobId}/summary`);
  if (!res.ok) throw new Error('Failed to fetch metrics summary');
  return res.json();
}

export async function updateQualitativeAudit(
  imageId: string,
  update: Partial<QualitativeAudit>
): Promise<QualitativeAudit> {
  const res = await fetch(`${API_BASE}/audits/images/${imageId}/qualitative`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Failed to update qualitative audit');
  return res.json();
}

export function createWebSocket(onMessage: (data: any) => void): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}${API_BASE}/ws/stream`;
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Failed to parse WS payload', e);
    }
  };

  return socket;
}
