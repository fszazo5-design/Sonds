import { neon } from '@neondatabase/serverless';
import {
  getAllowedOrigins,
  serializeSyncState,
  validateDeviceId,
  validateDeviceSecret,
} from './sync-core.mjs';

const MAX_REQUEST_BYTES = 800 * 1024;
let cachedConnectionString;
let cachedSql;

function jsonResponse(body, status = 200, headers = {}) {
  const responseHeaders = new Headers({
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  });
  for (const [name, value] of new Headers(headers)) responseHeaders.set(name, value);
  return Response.json(body, {
    status,
    headers: responseHeaders,
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const headers = new Headers({ Vary: 'Origin' });
  const allowedOrigins = getAllowedOrigins(env.ALLOWED_ORIGINS);
  if (origin === null) return { allowed: true, headers };
  if (!allowedOrigins.has(origin)) return { allowed: false, headers };
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '600');
  return { allowed: true, headers };
}

function makeError(message, status) {
  const error = new Error(message);
  error.statusCode = status;
  return error;
}

async function readJson(request) {
  const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) throw makeError('request_too_large', 413);
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_REQUEST_BYTES) throw makeError('request_too_large', 413);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw makeError('invalid_json', 400);
  }
}

async function parseIdentity(body) {
  const deviceId = validateDeviceId(body?.deviceId);
  const deviceSecret = validateDeviceSecret(body?.deviceSecret);
  if (!deviceId || !deviceSecret) throw makeError('invalid_device_credentials', 400);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(deviceSecret));
  const secretHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { deviceId, secretHash };
}

function getSql(env) {
  if (!env.NEON_DATABASE_URL) throw makeError('database_not_configured', 503);
  if (cachedSql === undefined || cachedConnectionString !== env.NEON_DATABASE_URL) {
    cachedConnectionString = env.NEON_DATABASE_URL;
    cachedSql = neon(cachedConnectionString);
  }
  return cachedSql;
}

async function handleSync(request, env, cors) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') {
    cors.set('Allow', 'POST, OPTIONS');
    return jsonResponse({ error: 'method_not_allowed' }, 405, cors);
  }
  if (!String(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
    return jsonResponse({ error: 'content_type_must_be_json' }, 415, cors);
  }

  const body = await readJson(request);
  const { deviceId, secretHash } = await parseIdentity(body);
  const sql = getSql(env);

  if (body.action === 'pull') {
    const rows = await sql`
      SELECT state, updated_at::text AS "updatedAt"
      FROM public.sonds_device_sync
      WHERE device_id = ${deviceId}::uuid AND secret_hash = ${secretHash}
      LIMIT 1
    `;
    const row = rows[0];
    return jsonResponse({ version: 1, state: row?.state ?? null, updatedAt: row?.updatedAt ?? null }, 200, cors);
  }

  if (body.action === 'push') {
    let serializedState;
    try {
      serializedState = serializeSyncState(body.state);
    } catch (error) {
      return jsonResponse({ error: error.code ?? 'invalid_state' }, error.code === 'state_too_large' ? 413 : 400, cors);
    }

    const rows = await sql`
      INSERT INTO public.sonds_device_sync (device_id, secret_hash, state, updated_at)
      VALUES (${deviceId}::uuid, ${secretHash}, ${serializedState}::jsonb, NOW())
      ON CONFLICT (device_id) DO UPDATE
        SET state = EXCLUDED.state, updated_at = NOW()
        WHERE public.sonds_device_sync.secret_hash = EXCLUDED.secret_hash
      RETURNING updated_at::text AS "updatedAt"
    `;
    if (!rows[0]) return jsonResponse({ error: 'device_key_conflict' }, 409, cors);
    return jsonResponse({ version: 1, ok: true, updatedAt: rows[0].updatedAt }, 200, cors);
  }

  return jsonResponse({ error: 'action_must_be_pull_or_push' }, 400, cors);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (!cors.allowed) return jsonResponse({ error: 'origin_not_allowed' }, 403, cors.headers);
    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({ ok: true, databaseConfigured: Boolean(env.NEON_DATABASE_URL) }, 200, cors.headers);
    }
    if (url.pathname !== '/v1/sync') return jsonResponse({ error: 'not_found' }, 404, cors.headers);

    try {
      return await handleSync(request, env, cors.headers);
    } catch (error) {
      const status = Number.isInteger(error?.statusCode) ? error.statusCode : 503;
      if (status >= 500) console.error('Neon sync request failed; verify Worker secret and Neon migration.');
      return jsonResponse({ error: status === 503 ? 'sync_service_unavailable' : (error?.message ?? 'request_failed') }, status, cors.headers);
    }
  },
};
