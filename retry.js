#!/usr/bin/env node
/**
 * Retry failed files from a previous migration run.
 *
 * Reads failed.log (written by migrate.js) and re-uploads only those files.
 * The file is tab-delimited: <firebase-path>\t<error-message>
 *
 * Usage:
 *   node retry.js
 *
 * Make sure .env is filled in (same as migrate.js uses).
 */
import { readFileSync, existsSync, writeFileSync, appendFileSync } from 'node:fs';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ── Configuration ────────────────────────────────────────────────────────────

const CONCURRENCY = 5;
const FAILED_LOG = 'failed.log';
const RETRY_LOG = 'retry-failed.log';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_REQ_SERVICE_KEY ||
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

if (!existsSync(FAILED_LOG)) {
  console.log(`No ${FAILED_LOG} found. Nothing to retry.`);
  process.exit(0);
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
    'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS in .env',
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
  console.error('Set FIREBASE_STORAGE_BUCKET in .env');
  process.exit(1);
}

const bucket = storage.bucket(defaultBucket);
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Route mapping (same as migrate.js) ───────────────────────────────────────

const ROUTES = [
  { prefix: 'properties/', bucket: 'property-images' },
  { prefix: 'auctions/', bucket: 'auction-images' },
  { prefix: 'resumes/', bucket: 'resumes' },
];

function routeFor(path) {
  return ROUTES.find((r) => path.startsWith(r.prefix));
}

function supabaseKey(path, prefix) {
  const rest = path.slice(prefix.length);
  const parts = rest.split('/').filter(Boolean);
  const tail = parts.slice(-2);
  if (tail.length < 2) return null;
  return tail.join('/');
}

// ── Read failed.log ──────────────────────────────────────────────────────────

const lines = readFileSync(FAILED_LOG, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

const failedPaths = [];
for (const line of lines) {
  const [path] = line.split('\t');
  if (path) failedPaths.push(path);
}

if (failedPaths.length === 0) {
  console.log(`${FAILED_LOG} is empty. Nothing to retry.`);
  process.exit(0);
}

console.log(`Retrying ${failedPaths.length} failed file(s)...`);
console.log('');

// ── Concurrency queue ────────────────────────────────────────────────────────

async function runWithConcurrency(items, fn, limit) {
  let idx = 0;
  const results = { success: 0, failed: 0 };
  const stillFailed = [];

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      const path = items[i];
      try {
        await fn(path, i, items.length);
        results.success++;
      } catch (err) {
        results.failed++;
        stillFailed.push({ path, error: err.message });
        console.error(`  ✖ fail  ${path}  (${err.message})`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);

  // Update the log files
  if (stillFailed.length > 0) {
    writeFileSync(RETRY_LOG, '');
    for (const f of stillFailed) {
      appendFileSync(RETRY_LOG, `${f.path}\t${f.error}\n`);
    }
    console.log(`\nStill-failed files written to ${RETRY_LOG}`);
    // Rename retry-failed.log → failed.log so another retry cycle can pick them up
    const { renameSync } = await import('node:fs');
    try { renameSync(RETRY_LOG, FAILED_LOG); } catch { /* ignore */ }
  } else {
    // All retries succeeded — clean up failed.log
    const { unlinkSync } = await import('node:fs');
    try { unlinkSync(FAILED_LOG); } catch { /* ignore */ }
    console.log(`\nAll retries succeeded! ${FAILED_LOG} removed.`);
  }

  return results;
}

// ── Retry a single file ─────────────────────────────────────────────────────

async function retryFile(filePath, index, total) {
  const route = routeFor(filePath);
  let targetBucket, key;

  if (!route) {
    targetBucket = 'property-images';
    key = filePath;
  } else {
    targetBucket = route.bucket;
    key = supabaseKey(filePath, route.prefix);
    if (!key) throw new Error('Cannot derive entityId/filename');
  }

  const file = bucket.file(filePath);
  const [buffer] = await file.download();
  const contentType = file.metadata?.contentType || 'application/octet-stream';

  const { error } = await supabase.storage.from(targetBucket).upload(key, buffer, {
    contentType,
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: true,
  });
  if (error) throw new Error(error.message);

  const progress = `[${index + 1}/${total}]`;
  const sizeKB = (buffer.length / 1024).toFixed(1);
  console.log(
    `  ✔  ${progress}  ${filePath}  →  ${targetBucket}/${key}  (${sizeKB} KB)`,
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const results = await runWithConcurrency(failedPaths, retryFile, CONCURRENCY);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('── Retry Summary ────────────────────────────────────────');
  console.log(`  Retried:    ${failedPaths.length}`);
  console.log(`  Succeeded:  ${results.success}`);
  console.log(`  Still failed: ${results.failed}`);
  console.log(`  Time:       ${elapsed}s`);
}

main().catch((err) => {
  console.error('Retry failed:', err);
  process.exit(1);
});
