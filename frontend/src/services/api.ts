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
  default_provider: string;
  providers_status: {
    mock: boolean;
    stability: boolean;
    dalle: boolean;
  };
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

export function createWebSocket(
  onMessage: (data: any) => void,
  onStatusChange?: (connected: boolean) => void
): { close: () => void } {
  let ws: WebSocket | null = null;
  let heartbeatTimer: any = null;
  let reconnectTimer: any = null;
  let isClosedManually = false;

  const getWsUrls = (): string[] => {
    const isHttps = window.location.protocol === 'https:';
    const wsProto = isHttps ? 'wss:' : 'ws:';
    const host = window.location.host;
    const hostname = window.location.hostname;

    // Try proxied URL first, then direct backend port 8000
    const urls = [`${wsProto}//${host}${API_BASE}/ws/stream`];
    if (window.location.port !== '8000') {
      urls.push(`${wsProto}//${hostname}:8000${API_BASE}/ws/stream`);
    }
    return urls;
  };

  const wsUrls = getWsUrls();
  let urlIndex = 0;

  const connect = () => {
    if (isClosedManually) return;

    const currentUrl = wsUrls[urlIndex % wsUrls.length];
    try {
      ws = new WebSocket(currentUrl);

      ws.onopen = () => {
        onStatusChange?.(true);
        // Start ping heartbeat every 5 seconds
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 5000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'pong') return;
          if (data.event === 'connected') {
            onStatusChange?.(true);
          }
          onMessage(data);
        } catch {
          // non-JSON message
        }
      };

      ws.onerror = () => {
        onStatusChange?.(false);
      };

      ws.onclose = () => {
        onStatusChange?.(false);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (!isClosedManually) {
          urlIndex++;
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    } catch {
      onStatusChange?.(false);
      if (!isClosedManually) {
        urlIndex++;
        reconnectTimer = setTimeout(connect, 2000);
      }
    }
  };

  connect();

  return {
    close: () => {
      isClosedManually = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
  };
}
