export type LocalSyncIdentity = {
  deviceId: string;
  deviceSecret: string;
};

export type CloudSnapshot = {
  state: Record<string, unknown> | null;
  updatedAt: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECRET_PATTERN = /^[0-9a-f]{64}$/i;

export function getNeonSyncApiUrl(): string | null {
  const configured = import.meta.env.VITE_NEON_API_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    const isLocalDevelopment = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !isLocalDevelopment) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function randomHex(byteLength: number): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function newDeviceId(): string {
  const bytes = new Uint8Array(globalThis.crypto.getRandomValues(new Uint8Array(16)));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ensureLocalSyncIdentity(value: unknown): LocalSyncIdentity | null {
  if (value && typeof value === 'object') {
    const candidate = value as Partial<LocalSyncIdentity>;
    if (typeof candidate.deviceId === 'string' && UUID_PATTERN.test(candidate.deviceId) &&
        typeof candidate.deviceSecret === 'string' && SECRET_PATTERN.test(candidate.deviceSecret)) {
      return { deviceId: candidate.deviceId.toLowerCase(), deviceSecret: candidate.deviceSecret.toLowerCase() };
    }
  }
  try {
    return { deviceId: newDeviceId(), deviceSecret: randomHex(32) };
  } catch {
    return null;
  }
}

function stripLocalOnlyFields(plan: Record<string, unknown>): Record<string, unknown> {
  const state = { ...plan };
  delete state.cloudSync;
  delete state.modifiedAt;
  delete state.deviceSecret;
  delete state.syncToken;
  return state;
}

async function sendAction<T>(
  apiUrl: string,
  identity: LocalSyncIdentity,
  action: 'pull' | 'push' | 'event',
  plan?: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${apiUrl}/v1/sync`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        deviceId: identity.deviceId,
        deviceSecret: identity.deviceSecret,
        ...(action === 'push' ? { state: stripLocalOnlyFields(plan ?? {}) } : {}),
        ...extra,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`neon_sync_http_${response.status}`);
    return await response.json() as T;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function pullNeonSnapshot(apiUrl: string, identity: LocalSyncIdentity): Promise<CloudSnapshot> {
  return sendAction<CloudSnapshot & { version: number }>(apiUrl, identity, 'pull');
}

export function pushNeonSnapshot(
  apiUrl: string,
  identity: LocalSyncIdentity,
  plan: Record<string, unknown>,
): Promise<{ version: number; ok: boolean; updatedAt: string }> {
  return sendAction(apiUrl, identity, 'push', plan);
}

export function pushNeonEvent(
  apiUrl: string,
  identity: LocalSyncIdentity,
  eventName: string,
  payload: Record<string, unknown> = {},
): Promise<{ version: number; ok: boolean }> {
  return sendAction(apiUrl, identity, 'event', undefined, {
    eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    eventName,
    payload,
    occurredAt: new Date().toISOString(),
  });
}

export async function uploadGameImage(
  apiUrl: string,
  identity: LocalSyncIdentity,
  gameId: string,
  imageData: string,
): Promise<{ imageUrl: string }> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${apiUrl}/v1/game-images`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: identity.deviceId, deviceSecret: identity.deviceSecret, gameId, imageData }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`neon_game_image_http_${response.status}`);
    return await response.json() as { imageUrl: string };
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
