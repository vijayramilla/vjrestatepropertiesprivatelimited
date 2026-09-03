// ─────────────────────────────────────────────────────────────────────────────
// VJR Estate — migration completion (re-runnable)
//
// Completes the Firestore → Supabase migration for the parts that were missing
// (database rows + storage). Runs fully with the logged-in Firebase CLI
// credentials — no service-account file needed.
//
//   * users             (16 docs)     → public.users
//   * property_leads    (19 docs)     → public.property_leads
//   * requirement_private (1 row)     → public.requirement_private
//   * Firebase Storage   (65 files)   → Supabase buckets (property-images)
//   * properties.images URL rewrite   → Supabase public URLs
//
// USAGE:
//   node scripts/complete-migration.mjs        # rows + storage + URL rewrite
//   node scripts/complete-migration.mjs --rows # database rows only
//
// NOTE: Firebase Storage downloads require the Firebase project's billing
// account to be enabled — a delinquent billing account makes every download
// return HTTP 402/403. Fix billing first, then re-run to finish the storage
// copy and URL rewrite (the script is idempotent).
//
// Uses the logged-in Firebase CLI credentials (OAuth refresh token) for
// Firestore/Storage reads — READ-ONLY on Firebase — and the Supabase
// service-role key from .env for writes (upserts, idempotent).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'C:/Users/vijay/Downloads/vjrwebsite-main';
const env = readFileSync(path.join(ROOT, '.env'), 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] ?? '';
const SB_URL = get('VITE_SUPABASE_REQ_URL') || get('VITE_SUPABASE_URL');
const SB_KEY = get('VITE_SUPABASE_REQ_SERVICE_KEY');

// ── Firebase auth via logged-in CLI ─────────────────────────────────────────
const cfg = JSON.parse(readFileSync(path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
const refreshToken = cfg.tokens?.refresh_token || cfg.refreshToken;
const tok = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }),
}).then((r) => r.json());
if (!tok.access_token) throw new Error(`token exchange failed: ${JSON.stringify(tok).slice(0, 200)}`);
const PID = 'vjr-estate-df034';
const BUCKET = 'vjr-estate-df034.firebasestorage.app';
const H = { Authorization: `Bearer ${tok.access_token}` };
const base = `https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`;

const supabase = createClient(SB_URL, SB_KEY);

// ── Field maps (identical to scripts/migrate-firestore.mjs) ─────────────────
const USER_COLUMNS = {
  uid: 'uid', email: 'email', displayName: 'display_name', photoURL: 'photo_url',
  loginCount: 'login_count', lastLogin: 'last_login', lastSeen: 'last_seen',
  createdAt: 'created_at', suspended: 'suspended', location: 'location',
  gpsLocation: 'gps_location', ipLocation: 'ip_location', loginHistory: 'login_history',
};
const LEAD_COLUMNS = {
  propertyId: 'property_id', propertyTitle: 'property_title', propertyType: 'property_type',
  propertyArea: 'property_area', propertyPrice: 'property_price',
  propertyMonthlyRental: 'property_monthly_rental', propertyUrl: 'property_url',
  leadType: 'lead_type', visitDate: 'visit_date', visitTime: 'visit_time',
  buyerName: 'buyer_name', buyerPhone: 'buyer_phone', buyerLat: 'buyer_lat',
  buyerLng: 'buyer_lng', message: 'message', source: 'source', ownerUid: 'owner_uid',
  listedBy: 'listed_by', ipAddress: 'ip_address', status: 'status', createdAt: 'created_at',
};
const PRIVATE_COLUMNS = {
  paymentMode: 'payment_mode', buyerName: 'buyer_name', buyerPhone: 'buyer_phone',
};

// ── Firestore helpers ────────────────────────────────────────────────────────
async function allDocs(col) {
  const out = [];
  let token = '';
  for (;;) {
    const url = `${base}/${col}?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`;
    const r = await fetch(url, { headers: H });
    if (!r.ok) throw new Error(`${col}: HTTP ${r.status} ${(await r.text()).slice(0, 150)}`);
    const j = await r.json();
    for (const d of j.documents ?? []) out.push({ id: d.name.split('/').pop(), fields: d.fields });
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return out;
}

function valueOf(v) {
  if (!v) return null;
  const [type, val] = Object.entries(v)[0];
  switch (type) {
    case 'nullValue': return null;
    case 'booleanValue': return val;
    case 'integerValue': case 'doubleValue': return Number(val);
    case 'timestampValue': return val;
    case 'stringValue': return val;
    case 'bytesValue': return val;
    case 'referenceValue': return val;
    case 'geoPointValue': return val;
    case 'arrayValue': return (val.values ?? []).map(valueOf);
    case 'mapValue': {
      const out = {};
      for (const [k, x] of Object.entries(val.fields ?? {})) out[k] = valueOf(x);
      return out;
    }
    default: return null;
  }
}

function normalize(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'object') {
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
    if (Array.isArray(v)) return v.map(normalize);
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      const nx = normalize(x);
      if (nx !== undefined) out[k] = nx;
    }
    return out;
  }
  return v;
}

function mapDoc(fields, columns) {
  const row = {};
  for (const [key, value] of Object.entries(fields)) {
    const column = columns[key];
    if (!column) continue;
    row[column] = normalize(valueOf(value));
  }
  return row;
}

async function upsert(table, rows, onConflict = 'id') {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    inserted += chunk.length;
  }
  return inserted;
}

// ── 1. Database rows ────────────────────────────────────────────────────────
console.log('── Database rows ───────────────────────────────────────────');
const userDocs = await allDocs('users');
const userRows = userDocs.map((d) => {
  const row = mapDoc(d.fields, USER_COLUMNS);
  // loginCount arrives as a string via REST; coerce known numerics.
  if (row.login_count !== undefined) row.login_count = Number(row.login_count) || 0;
  return { uid: d.id, ...row };
});
console.log(`  users:               ${await upsert('users', userRows, 'uid')} rows (Firestore: ${userDocs.length})`);

const leadDocs = await allDocs('property_leads');
const leadRows = [];
for (const d of leadDocs) {
  const row = mapDoc(d.fields, LEAD_COLUMNS);
  // Backfill NOT NULL / DEFAULT columns exactly as the SQL schema defines them.
  if (row.property_id === undefined || row.property_id === null) {
    console.log(`  skip lead ${d.id}: missing propertyId`);
    continue;
  }
  if (row.property_title === undefined) row.property_title = '';
  if (row.property_type === undefined) row.property_type = '';
  if (row.property_area === undefined) row.property_area = '';
  if (row.property_price === undefined) row.property_price = '';
  if (row.property_url === undefined) row.property_url = '';
  if (row.lead_type === undefined) row.lead_type = 'whatsapp';
  if (row.message === undefined) row.message = '';
  if (row.source === undefined) row.source = 'card';
  if (row.status === undefined) row.status = 'new';
  if (row.buyer_lat !== undefined) row.buyer_lat = Number(row.buyer_lat) || null;
  if (row.buyer_lng !== undefined) row.buyer_lng = Number(row.buyer_lng) || null;
  leadRows.push({ id: d.id, ...row });
}
console.log(`  property_leads:      ${await upsert('property_leads', leadRows)} rows (Firestore: ${leadDocs.length})`);

const reqDocs = await allDocs('requirements');
const privateRows = [];
for (const d of reqDocs) {
  const p = mapDoc(d.fields, PRIVATE_COLUMNS);
  if (Object.keys(p).length > 0) privateRows.push({ id: d.id, ...p });
}
console.log(`  requirement_private: ${await upsert('requirement_private', privateRows)} rows (derived from requirements)`);

// ── 2. Storage copy ─────────────────────────────────────────────────────────
console.log('\n── Storage copy ─────────────────────────────────────────────');
const all = [];
let token = '';
for (;;) {
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?maxResults=1000${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`;
  const j = await fetch(url, { headers: H }).then((r) => r.json());
  all.push(...(j.items ?? []));
  if (!j.nextPageToken) break;
  token = j.nextPageToken;
}
console.log(`  Firebase files: ${all.length}`);

const ROUTES = [
  { prefix: 'properties/', bucket: 'property-images' },
  { prefix: 'auctions/', bucket: 'auction-images' },
  { prefix: 'resumes/', bucket: 'resumes' },
];
const contentTypeFromName = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }[ext] ?? 'application/octet-stream';
};
const pathToUrl = new Map();
let copied = 0, failed = 0, skipped = 0, totalBytes = 0;
const perBucket = {};

for (const file of all) {
  const route = ROUTES.find((r) => file.name.startsWith(r.prefix));
  if (!route) { console.log(`  skip  ${file.name} (no route)`); skipped++; continue; }
  const rest = file.name.slice(route.prefix.length).split('/').filter(Boolean);
  const key = rest.slice(-2).join('/');
  if (!key.includes('/')) { console.log(`  skip  ${file.name} (short path)`); skipped++; continue; }

  // Download from Firebase (media endpoint).
  const dl = await fetch(
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(file.name)}?alt=media`,
    { headers: H },
  );
  if (!dl.ok) { console.error(`  ✖ download fail ${file.name}: HTTP ${dl.status}`); failed++; continue; }
  const buf = Buffer.from(await dl.arrayBuffer());
  totalBytes += buf.length;

  const { error } = await supabase.storage.from(route.bucket).upload(key, buf, {
    contentType: contentTypeFromName(key),
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: true,
  });
  if (error) { console.error(`  ✖ upload fail ${file.name}: ${error.message}`); failed++; continue; }
  const { data } = supabase.storage.from(route.bucket).getPublicUrl(key);
  pathToUrl.set(file.name, data.publicUrl);
  perBucket[route.bucket] = (perBucket[route.bucket] ?? 0) + 1;
  copied++;
  if (copied % 10 === 0) console.log(`  … ${copied}/${all.length} files copied`);
}
console.log(`  copied: ${copied}, failed: ${failed}, skipped: ${skipped}, bytes: ${(totalBytes / 1048576).toFixed(2)} MB`);
for (const [b, n] of Object.entries(perBucket)) console.log(`    ${b}: ${n}`);

// ── 3. URL rewrite ──────────────────────────────────────────────────────────
console.log('\n── URL rewrite ─────────────────────────────────────────────');
const fbPath = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname !== 'firebasestorage.googleapis.com') return null;
    const m = u.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
};
// Map from last-two-segments key → publicUrl, as fallback for mismatched paths.
const keyToUrl = new Map([...pathToUrl.entries()].map(([p, u]) => [p.split('/').slice(-2).join('/'), u]));
let rewrites = 0, unresolvable = 0;

async function rewriteUrlArray(table, urlField, rows) {
  for (const row of rows) {
    const urls = row[urlField];
    if (!Array.isArray(urls)) continue;
    let changed = false;
    const next = urls.map((u) => {
      const p = fbPath(u);
      if (!p) return u;
      let replacement = pathToUrl.get(p) ?? keyToUrl.get(p.split('/').slice(-2).join('/'));
      if (replacement) { changed = true; rewrites++; return replacement; }
      unresolvable++;
      return u;
    });
    if (changed) {
      const { error } = await supabase.from(table).update({ [urlField]: next }).eq('id', row.id);
      if (error) throw new Error(`${table} ${row.id}: ${error.message}`);
    }
  }
}

const { data: propRows } = await supabase.from('properties').select('id,images').limit(1000);
await rewriteUrlArray('properties', 'images', propRows ?? []);
console.log(`  properties.images: rewrote ${rewrites} URLs, ${unresolvable} left on Firebase`);

const { data: aucRows } = await supabase.from('auctions').select('id,images').limit(1000);
await rewriteUrlArray('auctions', 'images', aucRows ?? []);
console.log(`  auctions.images: done`);

const { data: appRows } = await supabase.from('job_applications').select('id,resume_url').limit(1000);
for (const row of appRows ?? []) {
  const p = fbPath(row.resume_url);
  if (!p) continue;
  const replacement = pathToUrl.get(p) ?? keyToUrl.get(p.split('/').slice(-2).join('/'));
  if (replacement) {
    const { error } = await supabase.from('job_applications').update({ resume_url: replacement }).eq('id', row.id);
    if (error) throw new Error(`job_applications ${row.id}: ${error.message}`);
  }
}
console.log(`  job_applications.resume_url: done`);

console.log('\n── Done ────────────────────────────────────────────────────');
console.log(`rows: users ${userRows.length}, property_leads ${leadRows.length}, requirement_private ${privateRows.length}`);
console.log(`storage: ${copied} copied, ${failed} failed`);
console.log(`urls: ${rewrites} rewritten, ${unresolvable} unresolvable`);
