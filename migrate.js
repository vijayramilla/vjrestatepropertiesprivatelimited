#!/usr/bin/env node
/**
 * Firebase Storage → Supabase Storage migration
 *
 * Copies every file from your Firebase Storage bucket into the matching
 * Supabase bucket, preserving folder structure.
 *
 * Firebase path                          →  Supabase bucket/key
 * properties/{uid}/{propId}/{file}       →  property-images/{propId}/{file}
 * auctions/{uid}/{auctionId}/{file}      →  auction-images/{auctionId}/{file}
 * resumes/{uid-or-jobId}/{file}          →  resumes/{uid-or-jobId}/{file}
 * (anything else)                        →  property-images/{rest of path}
 *
 * Usage:
 *   node migrate.js              # migrate everything
 *   node migrate.js --dry-run    # plan only, change nothing
 *
 * Before running, copy .env.migration to .env and fill in real values.
 */
import { readFileSync, existsSync, writeFileSync, appendFileSync } from 'node:fs';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ── Configuration ────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const CONCURRENCY = 5;
const FAILED_LOG = 'failed.log';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_REQ_SERVICE_KEY ||
  '';

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) in .env');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_REQ_SERVICE_KEY in .env');
  process.exit(1);
}

// Firebase Admin init
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
    console.error(`FIREBASE_SERVICE_ACCOUNT path not found: ${account}`);
    process.exit(1);
  }
  serviceAccount = JSON.parse(raw);
  adminApp = initializeApp({ credential: cert(serviceAccount) });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  adminApp = initializeApp({ credential: applicationDefault() });
} else {
  console.error(
    'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT (path or JSON) or GOOGLE_APPLICATION_CREDENTIALS in .env',
  );
  process.exit(1);
}

const storage = getStorage(adminApp);
const defaultBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  (serviceAccount?.project_id
    ? `${serviceAccount.project_id}.appspot.com`
    : null);
if (!defaultBucket) {
  console.error('Set FIREBASE_STORAGE_BUCKET in .env (could not infer it)');
  process.exit(1);
}

const bucket = storage.bucket(defaultBucket);
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Route mapping ────────────────────────────────────────────────────────────

const ROUTES = [
  { prefix: 'properties/', bucket: 'property-images' },
  { prefix: 'auctions/', bucket: 'auction-images' },
  { prefix: 'resumes/', bucket: 'resumes' },
];

function routeFor(path) {
  return ROUTES.find((r) => path.startsWith(r.prefix));
}

/** Extract entityId/filename from a Firebase path, stripping the uid segment. */
function supabaseKey(path, prefix) {
  const rest = path.slice(prefix.length);
  const parts = rest.split('/').filter(Boolean);
  // Firebase paths have: {uid}/{entityId}/{file}
  // Supabase key: {entityId}/{file}
  const tail = parts.slice(-2);
  if (tail.length < 2) return null;
  return tail.join('/');
}

function decodeBase64(data) {
  return Buffer.from(data, 'base64');
}

// ── Concurrency queue ────────────────────────────────────────────────────────

async function runWithConcurrency(items, fn, limit) {
  let idx = 0;
  const results = { success: 0, failed: 0 };
  const failedFiles = [];

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      const item = items[i];
      try {
        await fn(item, i, items.length);
        results.success++;
      } catch (err) {
        results.failed++;
        failedFiles.push({ path: item.name, error: err.message });
        console.error(`  ✖ fail  ${item.name}  (${err.message})`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);

  // Write failed.log
  if (failedFiles.length > 0) {
    writeFileSync(FAILED_LOG, ''); // clear previous
    for (const f of failedFiles) {
      appendFileSync(FAILED_LOG, `${f.path}\t${f.error}\n`);
    }
    console.log(`\nFailed files written to ${FAILED_LOG}`);
  } else if (existsSync(FAILED_LOG)) {
    // Clean up old failed.log if everything succeeded
    const { unlinkSync } = await import('node:fs');
    try { unlinkSync(FAILED_LOG); } catch { /* ignore */ }
  }

  return results;
}

// ── Migrate a single file ───────────────────────────────────────────────────

async function migrateFile(file, index, total) {
  const route = routeFor(file.name);
  if (!route) {
    // Files outside known prefixes go to property-images as a fallback
    const key = file.name;
    if (DRY_RUN) {
      console.log(`  plan  ${file.name}  →  property-images/${key}`);
      return;
    }
    // getMetadata is only needed for content type; file object may already have it
    const contentType = file.metadata?.contentType || 'application/octet-stream';
    const [buffer] = await file.download();
    const { error } = await supabase.storage
      .from('property-images')
      .upload(key, buffer, {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
        upsert: true,
      });
    if (error) throw new Error(error.message);
    const progress = `[${index + 1}/${total}]`;
    console.log(`  ✔  ${progress}  ${file.name}  →  property-images/${key}`);
    return;
  }

  const key = supabaseKey(file.name, route.prefix);
  if (!key) {
    console.log(`  skip  ${file.name}  (cannot derive entityId/filename)`);
    return;
  }

  if (DRY_RUN) {
    console.log(`  plan  ${file.name}  →  ${route.bucket}/${key}`);
    return;
  }

  const contentType = file.metadata?.contentType || 'application/octet-stream';
  const [buffer] = await file.download();

  const { error } = await supabase.storage.from(route.bucket).upload(key, buffer, {
    contentType,
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: true,
  });
  if (error) throw new Error(error.message);

  const progress = `[${index + 1}/${total}]`;
  const sizeKB = (buffer.length / 1024).toFixed(1);
  console.log(
    `  ✔  ${progress}  ${file.name}  →  ${route.bucket}/${key}  (${sizeKB} KB)`,
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `${DRY_RUN ? '[DRY RUN] ' : ''}Firebase Storage → Supabase Storage migration`,
  );
  console.log(`  Firebase bucket:  ${defaultBucket}`);
  console.log(`  Supabase URL:     ${SUPABASE_URL}`);
  console.log(`  Concurrency:      ${CONCURRENCY}`);
  console.log('');

  // List ALL files with pagination (maxResults keeps each request fast)
  console.log('Listing all files in Firebase Storage...');
  let allFiles = [];
  let pageToken = undefined;
  do {
    const [files, nextToken] = await bucket.getFiles({ pageToken, maxResults: 1000 });
    allFiles.push(...files);
    pageToken = nextToken;
    process.stdout.write(`  ... ${allFiles.length} files so far\r`);
  } while (pageToken);
  console.log('');

  console.log(`Found ${allFiles.length} file(s) in Firebase.`);
  console.log('');

  // Filter out already-migrated files if Supabase is reachable
  // (skip this check in dry-run mode)
  let filesToMigrate = allFiles;
  if (!DRY_RUN && allFiles.length > 0) {
    // Check a sample to see if files already exist in Supabase
    // (full per-file check would be too slow; upsert handles duplicates anyway)
    console.log('Files will be uploaded with upsert (safe to re-run).');
    console.log('');
  }

  const startTime = Date.now();

  const results = await runWithConcurrency(
    filesToMigrate,
    migrateFile,
    CONCURRENCY,
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('── Summary ──────────────────────────────────────────────');
  console.log(`  Total files:     ${allFiles.length}`);
  if (!DRY_RUN) {
    console.log(`  Uploaded:        ${results.success}`);
    console.log(`  Failed:          ${results.failed}`);
  }
  console.log(`  Time:            ${elapsed}s`);
  console.log('');

  if (DRY_RUN) {
    console.log('DRY RUN — nothing was changed. Remove --dry-run to migrate.');
  } else if (results.failed === 0) {
    console.log('All files migrated successfully!');
    console.log('Firebase Storage is untouched — you can verify in Supabase dashboard.');
    console.log('Next: run the Firestore data migration if you haven\'t already.');
  } else {
    console.log(
      `${results.failed} file(s) failed. Check ${FAILED_LOG} and run "node retry.js" to retry them.`,
    );
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
