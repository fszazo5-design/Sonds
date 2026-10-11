import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { neon } from '@neondatabase/serverless';
import {
  getAllowedOrigins,
  serializeSyncState,
  validateDeviceId,
  validateDeviceSecret,
} from './sync-core.mjs';

const MAX_REQUEST_BYTES = 800 * 1024;
const allowedOrigins = getAllowedOrigins();
let sqlClient;

function getSql() {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    const error = new Error('database_not_configured');
    error.statusCode = 503;
    throw error;
  }
  sqlClient ??= neon(connectionString);
  return sqlClient;
}

function sendJson(response, statusCode, body) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(payload);
}

function addCors(request, response) {
  const origin = request.headers.origin;
  response.setHeader('Vary', 'Origin');
  if (origin === undefined) return true;
  if (typeof origin !== 'string' || !allowedOrigins.has(origin)) return false;
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Max-Age', '600');
  return true;
}

async function readJson(request) {
  const declaredLength = Number(request.headers['content-length'] ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    const error = new Error('request_too_large');
    error.statusCode = 413;
    throw error;
  }

  const chunks = [];
  let byteLength = 0;
  for await (const chunk of request) {
    byteLength += chunk.length;
    if (byteLength > MAX_REQUEST_BYTES) {
      const error = new Error('request_too_large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('invalid_json');
    error.statusCode = 400;
    throw error;
  }
}

function parseIdentity(body) {
  const deviceId = validateDeviceId(body?.deviceId);
  const deviceSecret = validateDeviceSecret(body?.deviceSecret);
  if (!deviceId || !deviceSecret) {
    const error = new Error('invalid_device_credentials');
    error.statusCode = 400;
    throw error;
  }
  const secretHash = createHash('sha256').update(deviceSecret, 'utf8').digest('hex');
  return { deviceId, secretHash };
}

async function handleSync(request, response) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Cache-Control': 'no-store' });
    response.end();
    return;
  }
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST, OPTIONS');
    sendJson(response, 405, { error: 'method_not_allowed' });
    return;
  }
  if (!String(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    sendJson(response, 415, { error: 'content_type_must_be_json' });
    return;
  }

  const body = await readJson(request);
  const { deviceId, secretHash } = parseIdentity(body);
  const sql = getSql();

  if (body.action === 'pull') {
    const rows = await sql`
      SELECT state, updated_at::text AS "updatedAt"
      FROM public.sonds_device_sync
      WHERE device_id = ${deviceId}::uuid AND secret_hash = ${secretHash}
      LIMIT 1
    `;
    const row = rows[0];
    sendJson(response, 200, {
      version: 1,
      state: row?.state ?? null,
      updatedAt: row?.updatedAt ?? null,
    });
    return;
  }

  if (body.action === 'push') {
    let serializedState;
    try {
      serializedState = serializeSyncState(body.state);
    } catch (error) {
      const statusCode = error.code === 'state_too_large' ? 413 : 400;
      sendJson(response, statusCode, { error: error.code ?? 'invalid_state' });
      return;
    }

    const rows = await sql`
      INSERT INTO public.sonds_device_sync (device_id, secret_hash, state, updated_at)
      VALUES (${deviceId}::uuid, ${secretHash}, ${serializedState}::jsonb, NOW())
      ON CONFLICT (device_id) DO UPDATE
        SET state = EXCLUDED.state, updated_at = NOW()
        WHERE public.sonds_device_sync.secret_hash = EXCLUDED.secret_hash
      RETURNING updated_at::text AS "updatedAt"
    `;
    if (!rows[0]) {
      sendJson(response, 409, { error: 'device_key_conflict' });
      return;
    }
    sendJson(response, 200, { version: 1, ok: true, updatedAt: rows[0].updatedAt });
    return;
  }

  sendJson(response, 400, { error: 'action_must_be_pull_or_push' });
}

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname;
  } catch {
    sendJson(response, 400, { error: 'invalid_url' });
    return;
  }

  if (!addCors(request, response)) {
    sendJson(response, 403, { error: 'origin_not_allowed' });
    return;
  }

  if (pathname === '/health' && request.method === 'GET') {
    sendJson(response, 200, { ok: true, databaseConfigured: Boolean(process.env.NEON_DATABASE_URL) });
    return;
  }
  if (pathname !== '/v1/sync') {
    sendJson(response, 404, { error: 'not_found' });
    return;
  }

  try {
    await handleSync(request, response);
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 503;
    if (statusCode >= 500) console.error('Neon sync request failed; check server configuration and migration status.');
    sendJson(response, statusCode, {
      error: statusCode === 503 ? 'sync_service_unavailable' : (error?.message ?? 'request_failed'),
    });
  }
});

const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
server.listen(port, '0.0.0.0', () => {
  console.log(`Sonds Neon sync API listening on port ${port}`);
});
