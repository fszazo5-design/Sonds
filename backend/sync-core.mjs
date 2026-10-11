export const MAX_STATE_BYTES = 768 * 1024;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECRET_PATTERN = /^[0-9a-f]{64}$/i;
const DEFAULT_ORIGINS = [
  'https://appassets.androidplatform.net',
  'https://fszazo5-design.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const PRIVATE_FIELDS = new Set(['cloudSync', 'deviceSecret', 'deviceToken', 'syncToken']);

export function validateDeviceId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

export function validateDeviceSecret(value) {
  return typeof value === 'string' && SECRET_PATTERN.test(value) ? value.toLowerCase() : null;
}

export function serializeSyncState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    const error = new Error('invalid_state');
    error.code = 'invalid_state';
    throw error;
  }
  if (Object.keys(value).some((key) => PRIVATE_FIELDS.has(key))) {
    const error = new Error('private_sync_material_not_allowed');
    error.code = 'private_sync_material_not_allowed';
    throw error;
  }
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) {
    const error = new Error('state_too_large');
    error.code = 'state_too_large';
    throw error;
  }
  return serialized;
}

export function getAllowedOrigins(raw = process.env.ALLOWED_ORIGINS) {
  const entries = raw === undefined || raw.trim() === '' ? DEFAULT_ORIGINS : raw.split(',');
  return new Set(entries.map((entry) => entry.trim()).filter(Boolean));
}
