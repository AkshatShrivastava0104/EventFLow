import axios from 'axios';
import type { HealthStatus, ReadyStatus } from '@/types/admin';

const apiBase =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL || '/api/v1';

// /health and /ready are served at the server root, not under /api/v1.
const rootBase = apiBase.replace(/\/api\/v1\/?$/, '');

export interface ReadyResult extends ReadyStatus {
  ok: boolean;
}

export const systemApi = {
  health: async (): Promise<HealthStatus> => {
    const r = await axios.get<HealthStatus>(`${rootBase}/health`, {
      timeout: 8000,
    });
    return r.data;
  },

  // /ready returns HTTP 503 with a body when a dependency is down — capture
  // the body regardless of status so the console can render it.
  ready: async (): Promise<ReadyResult> => {
    const r = await axios.get<ReadyStatus>(`${rootBase}/ready`, {
      timeout: 8000,
      validateStatus: () => true,
    });
    return { ...r.data, ok: r.status === 200 };
  },
};
