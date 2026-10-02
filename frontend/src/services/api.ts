import { AuditJob, AuthResponse, MetricSummary, QualitativeAudit, User } from '../types';

const API_BASE = '/api/v1';
const TOKEN_KEY = 'farv_ia_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Authentication API
export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Falha ao autenticar.');
  }
  const data: AuthResponse = await res.json();
  setStoredToken(data.access_token);
  return data;
}

export async function registerUser(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Falha ao registrar pesquisador.');
  }
  const data: AuthResponse = await res.json();
  setStoredToken(data.access_token);
  return data;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      removeStoredToken();
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}

// Export URLs & Download Helpers
export function getExportSqliteUrl(): string {
  return `${API_BASE}/exports/sqlite`;
}

export function getExportCsvUrl(jobId?: string): string {
  return jobId ? `${API_BASE}/exports/csv?job_id=${encodeURIComponent(jobId)}` : `${API_BASE}/exports/csv`;
}

export function getExportImagesZipUrl(jobId?: string): string {
  return jobId
    ? `${API_BASE}/exports/images.zip?job_id=${encodeURIComponent(jobId)}`
    : `${API_BASE}/exports/images.zip`;
}

// Audit Job & Factor APIs
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
    headers: getAuthHeaders(),
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
  const res = await fetch(`${API_BASE}/audits/${jobId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch audit job detail');
  return res.json();
}

export async function fetchMetricsSummary(jobId: string): Promise<MetricSummary> {
  const res = await fetch(`${API_BASE}/metrics/${jobId}/summary`);
  if (!res.ok) throw new Error('Failed to fetch metrics summary');
  return res.json();
}

export async function fetchImageReviews(imageId: string): Promise<QualitativeAudit[]> {
  const res = await fetch(`${API_BASE}/audits/images/${imageId}/reviews`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch reviews for image');
  return res.json();
}

export async function updateQualitativeAudit(
  imageId: string,
  update: Partial<QualitativeAudit>
): Promise<QualitativeAudit> {
  const res = await fetch(`${API_BASE}/audits/images/${imageId}/qualitative`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
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
