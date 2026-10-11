import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllowedOrigins,
  MAX_STATE_BYTES,
  serializeSyncState,
  validateDeviceId,
  validateDeviceSecret,
} from './sync-core.mjs';

const validDeviceId = '680d7d3f-2abf-4fb5-9e64-ec8ef114176a';
const validSecret = 'a'.repeat(64);

test('accepts a versioned UUID and 256-bit hexadecimal device secret', () => {
  assert.equal(validateDeviceId(validDeviceId), validDeviceId);
  assert.equal(validateDeviceSecret(validSecret), validSecret);
});

test('rejects malformed or unsupported device credentials', () => {
  assert.equal(validateDeviceId('not-a-uuid'), null);
  assert.equal(validateDeviceId('680d7d3f-2abf-4fb5-1e64-ec8ef114176a'), null);
  assert.equal(validateDeviceSecret('short'), null);
  assert.equal(validateDeviceSecret('g'.repeat(64)), null);
});

test('accepts an ordinary persisted plan and serializes it as JSON', () => {
  const plan = { meals: [{ id: 'breakfast', time: '08:00' }], water: { dailyGoal: 8 } };
  assert.deepEqual(JSON.parse(serializeSyncState(plan)), plan);
});

test('rejects non-object state and local-only sync credentials', () => {
  assert.throws(() => serializeSyncState([]), /invalid_state/);
  assert.throws(() => serializeSyncState({ cloudSync: { deviceSecret: validSecret } }), /private_sync_material_not_allowed/);
  assert.throws(() => serializeSyncState({ syncToken: validSecret }), /private_sync_material_not_allowed/);
});

test('rejects state payloads above the documented size limit', () => {
  const oversized = { data: 'x'.repeat(MAX_STATE_BYTES) };
  assert.throws(() => serializeSyncState(oversized), /state_too_large/);
});

test('uses only the explicitly configured CORS origins when provided', () => {
  const origins = getAllowedOrigins('https://app.example, http://localhost:5173');
  assert.equal(origins.has('https://app.example'), true);
  assert.equal(origins.has('https://example.invalid'), false);
});
