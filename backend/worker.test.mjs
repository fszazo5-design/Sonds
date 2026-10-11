import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

const deviceId = '680d7d3f-2abf-4fb5-9e64-ec8ef114176a';
const deviceSecret = 'a'.repeat(64);
const allowedOrigin = 'https://fszazo5-design.github.io';

function request(path, { method = 'GET', origin = allowedOrigin, body } = {}) {
  return new Request(`https://sonds.fszazo5.workers.dev${path}`, {
    method,
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('health endpoint reports database configuration without reading Neon', async () => {
  const response = await worker.fetch(request('/health'), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, databaseConfigured: false });
});

test('health endpoint indicates when the Worker has a server-only Neon binding', async () => {
  const response = await worker.fetch(request('/health'), { NEON_DATABASE_URL: 'secret-is-not-returned' });
  assert.deepEqual(await response.json(), { ok: true, databaseConfigured: true });
});

test('allows the configured Pages origin and blocks an unrelated origin', async () => {
  const allowed = await worker.fetch(request('/health'), {});
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
  const blocked = await worker.fetch(request('/health', { origin: 'https://not-allowed.example' }), {});
  assert.equal(blocked.status, 403);
});

test('supports allowed preflight requests and the sync HTTP methods', async () => {
  const response = await worker.fetch(request('/v1/sync', { method: 'OPTIONS' }), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
});

test('rejects unsupported methods and paths without a database call', async () => {
  const method = await worker.fetch(request('/v1/sync'), {});
  assert.equal(method.status, 405);
  const path = await worker.fetch(request('/not-found'), {});
  assert.equal(path.status, 404);
});

test('rejects bad identity and returns service unavailable when Neon is not configured', async () => {
  const invalid = await worker.fetch(request('/v1/sync', { method: 'POST', body: { action: 'pull', deviceId: 'bad', deviceSecret: 'bad' } }), {});
  assert.equal(invalid.status, 400);
  const missingSecret = await worker.fetch(request('/v1/sync', { method: 'POST', body: { action: 'pull', deviceId, deviceSecret } }), {});
  assert.equal(missingSecret.status, 503);
  assert.deepEqual(await missingSecret.json(), { error: 'sync_service_unavailable' });
});
