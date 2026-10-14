import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const databaseUrl = process.env.NEON_DATABASE_URL;
if (!databaseUrl) throw new Error('NEON_DATABASE_URL is required.');

const manifest = JSON.parse(await readFile(resolve(repositoryRoot, 'backend/video-manifest.json'), 'utf8'));
if (!Array.isArray(manifest) || manifest.length !== 6) throw new Error('The video manifest must contain exactly six videos.');
const migration = await readFile(resolve(repositoryRoot, 'backend/migrations/004_create_sonds_video_library.sql'), 'utf8');
const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 15000 });
let totalBytes = 0;
const expectedById = new Map();

try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(migration);
  const schema = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'sonds_video_library'`,
  );
  const columns = new Set(schema.rows.map((row) => row.column_name));
  for (const required of ['video_id', 'title', 'mime_type', 'byte_size', 'sha256', 'duration_seconds', 'sort_order', 'video_bytes', 'is_active']) {
    if (!columns.has(required)) throw new Error(`Neon video table is missing the expected column: ${required}.`);
  }

  for (const [index, video] of manifest.entries()) {
    const filePath = resolve(repositoryRoot, video.path);
    if (!filePath.startsWith(`${repositoryRoot}/sonds/`)) throw new Error(`Video path is outside the expected folder: ${video.path}`);
    const bytes = await readFile(filePath);
    if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) throw new Error(`Invalid file size for ${video.id}.`);
    if (bytes.toString('ascii', 4, 8) !== 'ftyp') throw new Error(`The file is not an MP4: ${video.path}`);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    expectedById.set(video.id, { sha256, byteSize: bytes.length });

    await client.query(
      `INSERT INTO public.sonds_video_library
        (video_id, title, mime_type, byte_size, sha256, duration_seconds, sort_order, video_bytes, is_active, updated_at)
       VALUES ($1, $2, 'video/mp4', $3, $4, $5, $6, $7, TRUE, NOW())
       ON CONFLICT (video_id) DO UPDATE SET
         title = EXCLUDED.title,
         mime_type = EXCLUDED.mime_type,
         byte_size = EXCLUDED.byte_size,
         sha256 = EXCLUDED.sha256,
         duration_seconds = EXCLUDED.duration_seconds,
         sort_order = EXCLUDED.sort_order,
         video_bytes = EXCLUDED.video_bytes,
         is_active = TRUE,
         updated_at = NOW()`,
      [video.id, video.title, bytes.length, sha256, video.durationSeconds, video.order ?? index + 1, bytes],
    );
    totalBytes += bytes.length;
  }

  const verification = await client.query(
    'SELECT video_id, byte_size, sha256 FROM public.sonds_video_library WHERE is_active = TRUE AND video_id = ANY($1::text[])',
    [manifest.map((video) => video.id)],
  );
  if (verification.rowCount !== manifest.length) throw new Error(`Expected ${manifest.length} active videos; found ${verification.rowCount}.`);
  for (const row of verification.rows) {
    const expected = expectedById.get(row.video_id);
    if (!expected || row.sha256 !== expected.sha256 || Number(row.byte_size) !== expected.byteSize) {
      throw new Error(`Verification failed for video ${row.video_id}.`);
    }
  }
  await client.query('COMMIT');
  console.log(`Uploaded and verified ${verification.rowCount} videos (${totalBytes} bytes) in Neon.`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
