#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VJR Estate — Firebase Storage → Supabase Storage migration (Phase 3)
 *
 * Copies every file in the default Firebase Storage bucket into the Supabase
 * buckets created by the SQL migration:
 *
 *   Firebase path                        Supabase bucket + path
 *   properties/{uid}/{propId}/{file}  →  property-images/{propId}/{file}
 *   auctions/{uid}/{auctionId}/{file} →  auction-images/{auctionId}/{file}
 *   resumes/{jobId}/{file}            →  resumes/{jobId}/{file}
 *
 * After copying, it rewrites the URL arrays in the Supabase rows that still
 * point at Firebase (properties.images, auctions.images,
 * job_applications.resume_url) so the app renders Supabase URLs after cutover.
 *
 * READ-ONLY on Firebase: files are never deleted. Supabase uploads are
 * upserted by path, so re-running is safe.
 *
 * USAGE:
 *   node scripts/migrate-storage.mjs            # migrate everything
 *   node scripts/migrate-storage.mjs --dry-run  # plan only, change nothing
 *
 * ENV:
 *   FIREBASE_SERVICE_ACCOUNT   path to (or inline JSON of) the Firebase
 *                              service-account key (falls back to
 *                              GOOGLE_APPLICATION_CREDENTIALS / ADC).
 *   FIREBASE_STORAGE_BUCKET    e.g. vjr-estate.appspot.com (optional if the
 *                              project's default bucket is named {project}.appspot.com).
 *   SUPABASE_URL               default https://eimvaxrmiizdlgonhiov.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  (or SUPABASE_SERVICE_KEY) — never expose this.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync, existsSync } from 'node:fs';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { createClient } from '@supabase/supabase-js';

// ── Configuration ────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).');
  process.exit(1);
}

let adminApp;
let serviceAccount = null;
const account = process.env.FIREBASE_SERVICE_ACCOUNT;
if (account) {
  const raw = account.trim().startsWith('{')
    ? account
    : existsSync(account)
      ? readFileSync(account, 'utf8')
      : null;
  if (!raw) {
    console.error(`FIREBASE_SERVICE_ACCOUNT set but not found: ${account}`);
    process.exit(1);
  }
  serviceAccount = JSON.parse(raw);
  adminApp = initializeApp({ credential: cert(serviceAccount) });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  adminApp = initializeApp({ credential: applicationDefault() });
} else {
  console.error(
    'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT (path or JSON) or GOOGLE_APPLICATION_CREDENTIALS.',
  );
  process.exit(1);
}

const storage = getStorage(adminApp);
const defaultBucket =
  process.env.FIREBASE_STORAGE_BUCKET ??
  (serviceAccount?.project_id ? `${serviceAccount.project_id}.appspot.com` : null);
if (!defaultBucket) {
  console.error('Set FIREBASE_STORAGE_BUCKET (could not infer it).');
  process.exit(1);
}

const bucket = storage.bucket(defaultBucket);
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Prefix → (Supabase bucket, path mapper). The app writes the uid segment in
// Firebase paths; Supabase keys are {entityId}/{filename}, so we keep the last
// two segments (entityId/filename).
const ROUTES = [
  { prefix: 'properties/', bucket: 'property-images' },
  { prefix: 'auctions/', bucket: 'auction-images' },
  { prefix: 'resumes/', bucket: 'resumes' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the Firebase object path from a firebasestorage.googleapis.com URL. */
function firebasePathFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== 'firebasestorage.googleapis.com') return null;
    const m = u.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

function routeFor(path) {
  return ROUTES.find((r) => path.startsWith(r.prefix));
}

/** Keep {entityId}/{filename} from a Firebase path. */
function supabaseKey(path, prefix) {
  const rest = path.slice(prefix.length);
  const parts = rest.split('/').filter(Boolean);
  const tail = parts.slice(-2); // entityId + filename
  if (tail.length < 2) return null;
  return tail.join('/');
}

async function fetchAllRows(table, columns) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
    from += 1000;
  }
  return rows;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Migrating Firebase Storage → Supabase Storage…`);
  console.log(`  Firebase bucket: ${defaultBucket}`);
  console.log(`  Supabase:        ${SUPABASE_URL}`);
  console.log('');

  const [files] = await bucket.getFiles();
  console.log(`Found ${files.length} file(s) in Firebase.`);
  console.log('');

  const pathToUrl = new Map();
  let copied = 0;
  let skipped = 0;
  let totalBytes = 0;
  const perBucket = {};

  for (const file of files) {
    const route = routeFor(file.name);
    if (!route) {
      console.log(`  skip  ${file.name}  (no matching Supabase bucket)`);
      skipped += 1;
      continue;
    }
    const key = supabaseKey(file.name, route.prefix);
    if (!key) {
      console.log(`  skip  ${file.name}  (cannot derive entityId/filename)`);
      skipped += 1;
      continue;
    }

    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size ?? 0);
    const contentType = metadata.contentType || 'application/octet-stream';

    if (DRY_RUN) {
      console.log(`  plan  ${file.name}  →  ${route.bucket}/${key}  (${(size / 1024).toFixed(1)} KB)`);
      perBucket[route.bucket] = (perBucket[route.bucket] ?? 0) + 1;
      totalBytes += size;
      continue;
    }

    const [buffer] = await file.download();
    const { error } = await supabase.storage
      .from(route.bucket)
      .upload(key, buffer, {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
        upsert: true,
      });
    if (error) {
      console.error(`  ✖ fail  ${file.name}  (${error.message})`);
      process.exitCode = 1;
      continue;
    }
    const { data: publicUrl } = supabase.storage.from(route.bucket).getPublicUrl(key);
    pathToUrl.set(file.name, publicUrl);
    perBucket[route.bucket] = (perBucket[route.bucket] ?? 0) + 1;
    totalBytes += size;
    copied += 1;
    console.log(`  ✔  ${file.name}  →  ${route.bucket}/${key}  (${(size / 1024).toFixed(1)} KB)`);
  }

  console.log('');
  console.log('── Storage summary ────────────────────────────────────────');
  console.log(`  files copied:  ${copied}`);
  console.log(`  files skipped: ${skipped}`);
  console.log(`  total bytes:   ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
  for (const [b, n] of Object.entries(perBucket)) {
    console.log(`  ${b.padEnd(18)} ${n} file(s)`);
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN — nothing was changed. Remove --dry-run to migrate.');
    return;
  }

  // ── Rewrite stored URLs ────────────────────────────────────────────────────
  console.log('');
  console.log('Rewriting database rows that reference Firebase Storage…');

  const rewriteUrl = (url) => {
    const path = firebasePathFromUrl(url);
    if (!path) return null;
    const replacement = pathToUrl.get(path);
    return replacement?.publicUrl ?? null;
  };

  const rewriteArray = (urls) => {
    if (!Array.isArray(urls)) return null;
    let changed = false;
    const next = urls.map((u) => {
      const r = rewriteUrl(u);
      if (r) {
        changed = true;
        return r;
      }
      return u;
    });
    return changed ? next : null;
  };

  const propertyRows = await fetchAllRows('properties', 'id,images');
  let propertyUpdates = 0;
  for (const row of propertyRows) {
    const next = rewriteArray(row.images);
    if (next) {
      const { error } = await supabase.from('properties').update({ images: next }).eq('id', row.id);
      if (error) throw new Error(`properties ${row.id}: ${error.message}`);
      propertyUpdates += 1;
    }
  }
  console.log(`  properties.images updated:  ${propertyUpdates} row(s)`);

  const auctionRows = await fetchAllRows('auctions', 'id,images');
  let auctionUpdates = 0;
  for (const row of auctionRows) {
    const next = rewriteArray(row.images);
    if (next) {
      const { error } = await supabase.from('auctions').update({ images: next }).eq('id', row.id);
      if (error) throw new Error(`auctions ${row.id}: ${error.message}`);
      auctionUpdates += 1;
    }
  }
  console.log(`  auctions.images updated:     ${auctionUpdates} row(s)`);

  const applicationRows = await fetchAllRows('job_applications', 'id,resume_url');
  let applicationUpdates = 0;
  for (const row of applicationRows) {
    const next = rewriteUrl(row.resume_url);
    if (next) {
      const { error } = await supabase
        .from('job_applications')
        .update({ resume_url: next })
        .eq('id', row.id);
      if (error) throw new Error(`job_applications ${row.id}: ${error.message}`);
      applicationUpdates += 1;
    }
  }
  console.log(`  job_applications.resume_url updated: ${applicationUpdates} row(s)`);

  console.log('');
  console.log('Done. Firebase Storage is untouched; you can verify Supabase and then flip VITE_USE_SUPABASE_DATA=1.');
}

main();
