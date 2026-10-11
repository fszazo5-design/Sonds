import { neon } from '@neondatabase/serverless';
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
