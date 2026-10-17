import type { LocalSyncIdentity } from './neonSync';

export type SundusMood = { id: number; moodKey: string; moodScore: number; content: string; createdAt: string };
export type SundusGratitude = { id: number; content: string; createdAt: string };
export type SundusWellbeing = { moods: SundusMood[]; gratitudes: SundusGratitude[] };

async function request<T>(apiBaseUrl: string, identity: LocalSyncIdentity, path: string, method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { method, mode: 'cors', credentials: 'omit', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify({ ...body, deviceId: identity.deviceId, deviceSecret: identity.deviceSecret }) : undefined });
  if (!response.ok) throw new Error(`sundus_wellbeing_http_${response.status}`);
  return await response.json() as T;
}

export function loadSundusWellbeing(apiBaseUrl: string, identity: LocalSyncIdentity): Promise<SundusWellbeing> {
  return request<SundusWellbeing>(apiBaseUrl, identity, '/v1/sundus/wellbeing', 'GET');
}

export function saveSundusMood(apiBaseUrl: string, identity: LocalSyncIdentity, moodKey: string, moodScore: number, content: string): Promise<SundusMood> {
  return request<SundusMood>(apiBaseUrl, identity, '/v1/sundus/moods', 'POST', { moodKey, moodScore, content });
}

export function saveSundusGratitude(apiBaseUrl: string, identity: LocalSyncIdentity, content: string): Promise<SundusGratitude> {
  return request<SundusGratitude>(apiBaseUrl, identity, '/v1/sundus/gratitude', 'POST', { content });
}
