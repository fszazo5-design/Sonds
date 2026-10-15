import { createHash } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import pg from 'pg';

const { Client } = pg;
const AUDIO_KEY = 'game_end_ringtone';
const PUBLIC_ID = 'sonds-app/game-end-ringtone';
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_required_env:${name}`);
  return value;
}

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };

  const raw = process.env.CLOUDINARY_URL?.trim().replace(/^CLOUDINARY_URL\s*=\s*/i, '').replace(/^['"]|['"]$/g, '');
  if (!raw) throw new Error('missing_cloudinary_credentials');
  const parsed = new URL(raw);
  if (parsed.protocol !== 'cloudinary:' || !parsed.hostname || !parsed.username || !parsed.password) {
    throw new Error('invalid_cloudinary_url');
  }
  return {
    cloudName: parsed.hostname,
    apiKey: decodeURIComponent(parsed.username),
    apiSecret: decodeURIComponent(parsed.password),
  };
}

function isMp3(bytes) {
  const hasId3 = bytes.byteLength >= 3 && bytes.subarray(0, 3).toString('ascii') === 'ID3';
  const hasMpegFrame = bytes.byteLength >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return hasId3 || hasMpegFrame;
}

async function downloadSource() {
  const sourceUrl = new URL(requireEnv('AUDIO_SOURCE_URL'));
  if (sourceUrl.protocol !== 'https:' || !sourceUrl.hostname.endsWith('.sg2.manus.computer')) {
    throw new Error('audio_source_must_be_temporary_sandbox_https_url');
  }
  const response = await fetch(sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`audio_source_http_${response.status}`);
  const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'audio/mpeg') throw new Error('audio_source_must_be_audio_mpeg');
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_AUDIO_BYTES) throw new Error('audio_file_too_large');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_AUDIO_BYTES) throw new Error('audio_file_too_large');
  if (!isMp3(bytes)) throw new Error('audio_file_is_not_mp3');
  return bytes;
}

async function uploadToCloudinary(bytes) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `overwrite=true&public_id=${PUBLIC_ID}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(`${signaturePayload}${apiSecret}`).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'audio/mpeg' }), 'game-end-ringtone.mp3');
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('public_id', PUBLIC_ID);
  form.append('overwrite', 'true');
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof result?.error?.message === 'string' ? result.error.message.slice(0, 180) : 'cloudinary_upload_failed';
    throw new Error(`cloudinary_upload_failed:${message}`);
  }
  if (result?.resource_type !== 'video' || result?.format !== 'mp3' ||
      typeof result?.secure_url !== 'string' || !result.secure_url.startsWith('https://res.cloudinary.com/') ||
      result?.public_id !== PUBLIC_ID) {
    throw new Error('cloudinary_response_did_not_match_expected_mp3_asset');
  }
  return {
    cloudinaryUrl: result.secure_url,
    publicId: result.public_id,
    durationSeconds: Number.isFinite(Number(result.duration)) ? Number(result.duration) : 0,
  };
}

async function saveToNeon(bytes, sha256, cloudinaryAsset) {
  const client = new Client({
    connectionString: requireEnv('NEON_DATABASE_URL'),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO public.sonds_audio_assets
        (asset_key, title, cloudinary_public_id, cloudinary_url, original_filename,
         mime_type, byte_size, sha256, duration_seconds, audio_bytes, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'audio/mpeg', $6, $7, $8, $9, TRUE, NOW())
       ON CONFLICT (asset_key) DO UPDATE SET
         title = EXCLUDED.title,
         cloudinary_public_id = EXCLUDED.cloudinary_public_id,
         cloudinary_url = EXCLUDED.cloudinary_url,
         original_filename = EXCLUDED.original_filename,
         mime_type = EXCLUDED.mime_type,
         byte_size = EXCLUDED.byte_size,
         sha256 = EXCLUDED.sha256,
         duration_seconds = EXCLUDED.duration_seconds,
         audio_bytes = EXCLUDED.audio_bytes,
         is_active = TRUE,
         updated_at = NOW()`,
      [AUDIO_KEY, 'نغمة نهاية الجولة', cloudinaryAsset.publicId, cloudinaryAsset.cloudinaryUrl,
        'game-end-ringtone.mp3', bytes.length, sha256, cloudinaryAsset.durationSeconds, bytes],
    );
  } finally {
    await client.end();
  }
}

const bytes = await downloadSource();
const sha256 = createHash('sha256').update(bytes).digest('hex');
const asset = await uploadToCloudinary(bytes);
await saveToNeon(bytes, sha256, asset);
const summary = {
  assetKey: AUDIO_KEY,
  cloudinaryPublicId: asset.publicId,
  cloudinaryUrl: asset.cloudinaryUrl,
  mimeType: 'audio/mpeg',
  byteSize: bytes.length,
  sha256,
  durationSeconds: asset.durationSeconds,
  neonSaved: true,
};
console.log(JSON.stringify(summary, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## نغمة نهاية الجولة\n\n- Cloudinary: ${asset.cloudinaryUrl}\n- Neon: تم حفظ الرابط ونسخة MP3\n- الحجم: ${bytes.length} بايت\n- المدة: ${asset.durationSeconds.toFixed(3)} ثانية\n- SHA-256: \`${sha256}\`\n`);
}
