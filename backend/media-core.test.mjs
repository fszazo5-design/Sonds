import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseByteRange } from './media-core.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('parses a closed byte range for an HTML video request', () => {
  assert.deepEqual(parseByteRange('bytes=0-99', 1000), { start: 0, end: 99, partial: true });
});

test('parses open-ended and suffix byte ranges', () => {
  assert.deepEqual(parseByteRange('bytes=500-', 1000), { start: 500, end: 999, partial: true });
  assert.deepEqual(parseByteRange('bytes=-200', 1000), { start: 800, end: 999, partial: true });
});

test('clamps a valid range to the final byte', () => {
  assert.deepEqual(parseByteRange('bytes=900-5000', 1000), { start: 900, end: 999, partial: true });
});

test('returns the complete asset range when no Range header is supplied', () => {
  assert.deepEqual(parseByteRange(null, 321), { start: 0, end: 320, partial: false });
});

test('rejects malformed, multiple, reversed, zero-suffix, and unsatisfiable ranges', () => {
  for (const value of ['bytes=', 'bytes=5-4', 'bytes=1000-', 'bytes=-0', 'bytes=0-1,3-4', 'items=0-3']) {
    assert.equal(parseByteRange(value, 1000), null, value);
  }
});

test('video manifest contains six present, bounded MP4 files with unique IDs', async () => {
  const manifest = JSON.parse(await readFile(resolve(root, 'backend/video-manifest.json'), 'utf8'));
  assert.equal(manifest.length, 6);
  assert.equal(new Set(manifest.map((video) => video.id)).size, manifest.length);
  for (const video of manifest) {
    const filePath = resolve(root, video.path);
    assert.ok(filePath.startsWith(`${root}/sonds/`));
    const metadata = await stat(filePath);
    assert.ok(metadata.size > 0 && metadata.size <= 10 * 1024 * 1024);
    const bytes = await readFile(filePath);
    assert.equal(bytes.toString('ascii', 4, 8), 'ftyp');
  }
});
