import { neon } from '@neondatabase/serverless';
import { parseByteRange } from './media-core.mjs';
import {
  getAllowedOrigins,
  serializeSyncState,
  validateDeviceId,
  validateDeviceSecret,
} from './sync-core.mjs';

const MAX_REQUEST_BYTES = 800 * 1024;
const MAX_EVENT_PAYLOAD_BYTES = 24 * 1024;
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
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Range, If-None-Match');
  headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, ETag');
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

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}
function integer(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? Math.round(result) : fallback;
}

const GAME_IMAGE_MAX_BYTES = 420 * 1024;
const GAME_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;

function decodeBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function handleGameImageRequest(request, env, cors, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const sql = getSql(env);

  if (url.pathname === '/v1/game-images') {
    if (request.method !== 'POST') {
      cors.set('Allow', 'POST, OPTIONS');
      return jsonResponse({ error: 'method_not_allowed' }, 405, cors);
    }
    if (!String(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
      return jsonResponse({ error: 'content_type_must_be_json' }, 415, cors);
    }
    const body = await readJson(request);
    const { deviceId, secretHash } = await parseIdentity(body);
    const [authorizedDevice] = await sql`
      SELECT 1
      FROM public.sonds_device_sync
      WHERE device_id = ${deviceId}::uuid AND secret_hash = ${secretHash}
      LIMIT 1
    `;
    if (!authorizedDevice) return jsonResponse({ error: 'device_key_conflict' }, 409, cors);
    const gameId = text(body.gameId);
    if (!GAME_ID_PATTERN.test(gameId)) return jsonResponse({ error: 'invalid_game_id' }, 400, cors);
    const match = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(text(body.imageData));
    if (!match) return jsonResponse({ error: 'invalid_game_image' }, 400, cors);
    const imageBytes = decodeBase64(match[2]);
    if (imageBytes.byteLength === 0 || imageBytes.byteLength > GAME_IMAGE_MAX_BYTES) {
      return jsonResponse({ error: 'game_image_too_large' }, 413, cors);
    }
    const imageId = await sha256Hex(new TextEncoder().encode(`${deviceId}:${gameId}`));
    const sha256 = await sha256Hex(imageBytes);
    await sql`
      INSERT INTO public.sonds_game_images (image_id, device_id, game_id, mime_type, byte_size, sha256, image_bytes, updated_at)
      VALUES (${imageId}, ${deviceId}::uuid, ${gameId}, ${match[1]}, ${imageBytes.byteLength}, ${sha256}, decode(${match[2]}, 'base64'), NOW())
      ON CONFLICT (device_id, game_id) DO UPDATE SET image_id=EXCLUDED.image_id, mime_type=EXCLUDED.mime_type, byte_size=EXCLUDED.byte_size, sha256=EXCLUDED.sha256, image_bytes=EXCLUDED.image_bytes, updated_at=NOW()
    `;
    return jsonResponse({ ok: true, imageUrl: new URL(`/v1/game-images/${imageId}`, url).toString() }, 200, cors);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    cors.set('Allow', 'GET, HEAD, POST, OPTIONS');
    return jsonResponse({ error: 'method_not_allowed' }, 405, cors);
  }
  const imageId = url.pathname.slice('/v1/game-images/'.length);
  if (!/^[a-f0-9]{64}$/.test(imageId)) return jsonResponse({ error: 'invalid_game_image_id' }, 400, cors);
  const [image] = await sql`
    SELECT mime_type AS "mimeType", byte_size AS "byteSize", sha256
    FROM public.sonds_game_images
    WHERE image_id = ${imageId}
    LIMIT 1
  `;
  if (!image) return jsonResponse({ error: 'game_image_not_found' }, 404, cors);
  const headers = new Headers(cors);
  headers.set('Content-Type', image.mimeType);
  headers.set('Content-Length', String(image.byteSize));
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', `"${image.sha256}"`);
  headers.set('Content-Disposition', 'inline');
  if (request.headers.get('If-None-Match') === `"${image.sha256}"`) return new Response(null, { status: 304, headers });
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
  const [encoded] = await sql`
    SELECT encode(image_bytes, 'base64') AS data
    FROM public.sonds_game_images
    WHERE image_id = ${imageId}
    LIMIT 1
  `;
  if (!encoded?.data) return jsonResponse({ error: 'game_image_data_unavailable' }, 503, cors);
  return new Response(decodeBase64(encoded.data), { status: 200, headers });
}

async function saveNormalizedState(sql, deviceId, state) {
  const meals = asArray(state.meals);
  const day = asObject(state.day);
  const checked = asObject(day.checked);
  const messages = asObject(state.mealMessages);
  const rewards = asArray(state.rewards);
  const games = asArray(state.customActivities);
  const reminders = asObject(state.gameReminders);
  const water = asObject(state.water);
  const cupsByDate = asObject(water.cupsByDate);
  const weightByDate = asObject(water.weightByDate);
  const adhkarSettings = asObject(state.adhkarSettings);
  const adhkarProgress = asObject(state.adhkarProgress);
  const appSettings = {
    dailyWaterGoal: integer(water.dailyGoal, 8),
    waterRemindersEnabled: Boolean(water.remindersEnabled),
    waterReminderTimes: asArray(water.reminderTimes),
    adhkarSettings,
    gameReminders: reminders,
    achievementVersion: integer(state.achievementVersion),
  };
  await sql`DELETE FROM public.sonds_meals WHERE device_id = ${deviceId}::uuid`;
  for (const meal of meals) {
    if (!meal || typeof meal !== 'object' || !text(meal.id) || !text(meal.title)) continue;
    await sql`INSERT INTO public.sonds_meals (device_id, meal_id, title, label, time, calories, accent, icon, items, updated_at)
      VALUES (${deviceId}::uuid, ${text(meal.id)}, ${text(meal.title)}, ${text(meal.label)}, ${text(meal.time)}, ${integer(meal.calories)}, ${text(meal.accent)}, ${text(meal.icon)}, ${JSON.stringify(asArray(meal.items))}::jsonb, NOW())
      ON CONFLICT (device_id, meal_id) DO UPDATE SET title=EXCLUDED.title, label=EXCLUDED.label, time=EXCLUDED.time, calories=EXCLUDED.calories, accent=EXCLUDED.accent, icon=EXCLUDED.icon, items=EXCLUDED.items, updated_at=NOW()`;
  }
  if (text(day.date)) {
    await sql`DELETE FROM public.sonds_meal_completions WHERE device_id = ${deviceId}::uuid AND day_date = ${text(day.date)}::date`;
    for (const meal of meals) {
      if (!meal || typeof meal !== 'object' || !text(meal.id)) continue;
      await sql`INSERT INTO public.sonds_meal_completions (device_id, day_date, meal_id, completed, message, updated_at)
        VALUES (${deviceId}::uuid, ${text(day.date)}::date, ${text(meal.id)}, ${Boolean(checked[meal.id])}, ${text(messages[`${day.date}:${meal.id}`]) || null}, NOW())
        ON CONFLICT (device_id, day_date, meal_id) DO UPDATE SET completed=EXCLUDED.completed, message=EXCLUDED.message, updated_at=NOW()`;
    }
  }
  await sql`DELETE FROM public.sonds_rewards WHERE device_id = ${deviceId}::uuid`;
  for (const reward of rewards) {
    if (!reward || typeof reward !== 'object' || reward.id === undefined || !text(reward.title)) continue;
    await sql`INSERT INTO public.sonds_rewards (device_id, reward_id, title, note, unlocked, updated_at)
      VALUES (${deviceId}::uuid, ${String(reward.id)}, ${text(reward.title)}, ${text(reward.note)}, ${Boolean(reward.unlocked)}, NOW())
      ON CONFLICT (device_id, reward_id) DO UPDATE SET title=EXCLUDED.title, note=EXCLUDED.note, unlocked=EXCLUDED.unlocked, updated_at=NOW()`;
  }
  await sql`DELETE FROM public.sonds_activity_games WHERE device_id = ${deviceId}::uuid`;
  for (const game of games) {
    if (!game || typeof game !== 'object' || !text(game.id) || !text(game.title)) continue;
    await sql`INSERT INTO public.sonds_activity_games (device_id, game_id, title, description, instruction, mode, duration, unit, image, updated_at)
      VALUES (${deviceId}::uuid, ${text(game.id)}, ${text(game.title)}, ${text(game.description)}, ${text(game.instruction)}, ${text(game.mode, 'reps')}, ${integer(game.duration)}, ${text(game.unit)}, ${text(game.image) || null}, NOW())
      ON CONFLICT (device_id, game_id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, instruction=EXCLUDED.instruction, mode=EXCLUDED.mode, duration=EXCLUDED.duration, unit=EXCLUDED.unit, image=EXCLUDED.image, updated_at=NOW()`;
  }
  await sql`DELETE FROM public.sonds_game_reminders WHERE device_id = ${deviceId}::uuid`;
  for (const [gameId, reminder] of Object.entries(reminders)) {
    const item = asObject(reminder);
    await sql`INSERT INTO public.sonds_game_reminders (device_id, game_id, enabled, reminder_time, updated_at)
      VALUES (${deviceId}::uuid, ${gameId}, ${Boolean(item.enabled)}, ${text(item.time, '18:00')}, NOW())
      ON CONFLICT (device_id, game_id) DO UPDATE SET enabled=EXCLUDED.enabled, reminder_time=EXCLUDED.reminder_time, updated_at=NOW()`;
  }
  await sql`DELETE FROM public.sonds_water_daily WHERE device_id = ${deviceId}::uuid`;
  for (const [date, cups] of Object.entries(cupsByDate)) {
    await sql`INSERT INTO public.sonds_water_daily (device_id, day_date, cups, updated_at) VALUES (${deviceId}::uuid, ${date}::date, ${integer(cups)}, NOW()) ON CONFLICT (device_id, day_date) DO UPDATE SET cups=EXCLUDED.cups, updated_at=NOW()`;
  }
  await sql`DELETE FROM public.sonds_water_weights WHERE device_id = ${deviceId}::uuid`;
  for (const [date, weight] of Object.entries(weightByDate)) {
    const numericWeight = Number(weight);
    if (!Number.isFinite(numericWeight)) continue;
    await sql`INSERT INTO public.sonds_water_weights (device_id, day_date, weight, updated_at) VALUES (${deviceId}::uuid, ${date}::date, ${numericWeight}, NOW()) ON CONFLICT (device_id, day_date) DO UPDATE SET weight=EXCLUDED.weight, updated_at=NOW()`;
  }
  const validTime = (value, fallback) => /^([01]\d|2[0-3]):[0-5]\d$/.test(text(value)) ? text(value) : fallback;
  await sql`INSERT INTO public.sonds_adhkar_settings (device_id, morning_enabled, morning_time, evening_enabled, evening_time, morning_progress, evening_progress, updated_at)
    VALUES (${deviceId}::uuid, ${Boolean(adhkarSettings.morningEnabled)}, ${validTime(adhkarSettings.morningTime, '07:00')}, ${Boolean(adhkarSettings.eveningEnabled)}, ${validTime(adhkarSettings.eveningTime, '19:00')}, ${JSON.stringify(asArray(adhkarProgress.morning))}::jsonb, ${JSON.stringify(asArray(adhkarProgress.evening))}::jsonb, NOW())
    ON CONFLICT (device_id) DO UPDATE SET morning_enabled=EXCLUDED.morning_enabled, morning_time=EXCLUDED.morning_time, evening_enabled=EXCLUDED.evening_enabled, evening_time=EXCLUDED.evening_time, morning_progress=EXCLUDED.morning_progress, evening_progress=EXCLUDED.evening_progress, updated_at=NOW()`;
  await sql`INSERT INTO public.sonds_app_settings (device_id, settings, updated_at)
    VALUES (${deviceId}::uuid, ${JSON.stringify(appSettings)}::jsonb, NOW())
    ON CONFLICT (device_id) DO UPDATE SET settings=EXCLUDED.settings, updated_at=NOW()`;
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
    await sql`INSERT INTO public.sonds_state_snapshots (device_id, state) VALUES (${deviceId}::uuid, ${serializedState}::jsonb)`;
    await saveNormalizedState(sql, deviceId, body.state);
    return jsonResponse({ version: 1, ok: true, updatedAt: rows[0].updatedAt }, 200, cors);
  }

  if (body.action === 'event') {
    const eventId = text(body.eventId);
    const eventName = text(body.eventName);
    const payload = asObject(body.payload);
    const occurredAt = text(body.occurredAt);
    if (!/^[A-Za-z0-9._:-]{1,120}$/.test(eventId) || !/^[A-Za-z0-9._:-]{1,120}$/.test(eventName) || !occurredAt) {
      return jsonResponse({ error: 'invalid_event' }, 400, cors);
    }
    if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > MAX_EVENT_PAYLOAD_BYTES) return jsonResponse({ error: 'event_too_large' }, 413, cors);
    await sql`INSERT INTO public.sonds_app_events (device_id, event_id, event_name, payload, occurred_at)
      VALUES (${deviceId}::uuid, ${eventId}, ${eventName}, ${JSON.stringify(payload)}::jsonb, ${occurredAt}::timestamptz)
      ON CONFLICT (device_id, event_id) DO NOTHING`;
    if (eventName === 'activity_game_completed') {
      await sql`INSERT INTO public.sonds_activity_sessions (device_id, game_id, reps, duration_seconds, completed_at)
        VALUES (${deviceId}::uuid, ${text(payload.gameId) || null}, ${integer(payload.reps)}, ${integer(payload.durationSeconds) || null}, ${occurredAt}::timestamptz)`;
    }
    return jsonResponse({ version: 1, ok: true }, 200, cors);
  }

  return jsonResponse({ error: 'action_must_be_pull_push_or_event' }, 400, cors);
}

async function handleMediaRequest(request, env, cors, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    cors.set('Allow', 'GET, HEAD, OPTIONS');
    return jsonResponse({ error: 'method_not_allowed' }, 405, cors);
  }

  if (url.pathname === '/v1/media') {
    const sql = getSql(env);
    const videos = await sql`
      SELECT video_id AS id, title, mime_type AS "mimeType", byte_size AS "byteSize",
             duration_seconds AS "durationSeconds", sort_order AS "sortOrder"
      FROM public.sonds_video_library
      WHERE is_active = TRUE
      ORDER BY sort_order, video_id
    `;
    const headers = new Headers(cors);
    headers.set('Cache-Control', 'public, max-age=300');
    return Response.json({ videos }, { status: 200, headers });
  }

  const encodedId = url.pathname.slice('/v1/media/'.length);
  let videoId;
  try {
    videoId = decodeURIComponent(encodedId);
  } catch {
    return jsonResponse({ error: 'invalid_video_id' }, 400, cors);
  }
  if (!/^[a-z0-9-]{1,64}$/.test(videoId)) return jsonResponse({ error: 'invalid_video_id' }, 400, cors);

  const sql = getSql(env);
  const [video] = await sql`
    SELECT video_id AS id, mime_type AS "mimeType", byte_size AS "byteSize", sha256
    FROM public.sonds_video_library
    WHERE video_id = ${videoId} AND is_active = TRUE
    LIMIT 1
  `;
  if (!video) return jsonResponse({ error: 'video_not_found' }, 404, cors);

  const size = Number(video.byteSize);
  const range = parseByteRange(request.headers.get('Range'), size);
  if (!range) {
    const headers = new Headers(cors);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Range', `bytes */${size}`);
    headers.set('Content-Length', '0');
    headers.set('Cache-Control', 'public, max-age=3600');
    return new Response(null, { status: 416, headers });
  }

  const etag = `"${video.sha256}"`;
  const responseHeaders = new Headers(cors);
  responseHeaders.set('Content-Type', video.mimeType);
  responseHeaders.set('Accept-Ranges', 'bytes');
  responseHeaders.set('Content-Length', String(range.end - range.start + 1));
  responseHeaders.set('Cache-Control', 'public, max-age=3600');
  responseHeaders.set('ETag', etag);
  responseHeaders.set('Content-Disposition', `inline; filename="${video.id}.mp4"`);
  if (range.partial) responseHeaders.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);

  if (!range.partial && request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: responseHeaders });
  }
  if (request.method === 'HEAD') return new Response(null, { status: range.partial ? 206 : 200, headers: responseHeaders });

  const length = range.end - range.start + 1;
  const [chunk] = await sql`
    SELECT encode(substring(video_bytes FROM ${range.start + 1} FOR ${length}), 'base64') AS data
    FROM public.sonds_video_library
    WHERE video_id = ${videoId} AND is_active = TRUE
    LIMIT 1
  `;
  if (!chunk?.data) return jsonResponse({ error: 'video_data_unavailable' }, 503, cors);
  const body = Uint8Array.from(atob(chunk.data), (character) => character.charCodeAt(0));
  if (body.byteLength !== length) return jsonResponse({ error: 'video_data_corrupt' }, 503, cors);
  return new Response(body, { status: range.partial ? 206 : 200, headers: responseHeaders });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (!cors.allowed) return jsonResponse({ error: 'origin_not_allowed' }, 403, cors.headers);
    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({ ok: true, databaseConfigured: Boolean(env.NEON_DATABASE_URL) }, 200, cors.headers);
    }
    if (url.pathname === '/v1/media' || url.pathname.startsWith('/v1/media/')) {
      try {
        return await handleMediaRequest(request, env, cors.headers, url);
      } catch (error) {
        const status = Number.isInteger(error?.statusCode) ? error.statusCode : 503;
        if (status >= 500) console.error('Neon video request failed; verify Worker secret and video table migration.');
        return jsonResponse({ error: status === 503 ? 'media_service_unavailable' : (error?.message ?? 'media_request_failed') }, status, cors.headers);
      }
    }
    if (url.pathname === '/v1/game-images' || url.pathname.startsWith('/v1/game-images/')) {
      try {
        return await handleGameImageRequest(request, env, cors.headers, url);
      } catch (error) {
        const status = Number.isInteger(error?.statusCode) ? error.statusCode : 503;
        if (status >= 500) console.error('Neon game image request failed; verify Worker secret and game image migration.');
        return jsonResponse({ error: status === 503 ? 'game_image_service_unavailable' : (error?.message ?? 'game_image_request_failed') }, status, cors.headers);
      }
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
