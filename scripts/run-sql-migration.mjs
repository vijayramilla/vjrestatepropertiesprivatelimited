#!/usr/bin/env node
/**
 * Applies supabase/migrations/20260811000000_site_data_migration.sql to a
 * Supabase project using the Management API (no SQL editor needed).
 *
 * USAGE:
 *   SUPABASE_MGMT_TOKEN=sbp_... node scripts/run-sql-migration.mjs
 *   SUPABASE_MGMT_TOKEN=sbp_... node scripts/run-sql-migration.mjs --file path/to.sql
 *
 * ENV:
 *   SUPABASE_MGMT_TOKEN   personal access token from supabase.com dashboard
 *                         (Account → Access Tokens). Full account access —
 *                         revoke it after use.
 *   SUPABASE_PROJECT_REF  default eimvaxrmiizdlgonhiov
 */
import { readFileSync } from 'node:fs';

const TOKEN = process.env.SUPABASE_MGMT_TOKEN ?? '';
const REF = process.env.SUPABASE_PROJECT_REF ?? 'eimvaxrmiizdlgonhiov';
const FILE = process.argv.find((a) => a.startsWith('--file='))?.split('=')[1]
  ?? 'supabase/migrations/20260811000000_site_data_migration.sql';

if (!TOKEN) {
  console.error('Missing SUPABASE_MGMT_TOKEN.');
  process.exit(1);
}

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

/** Split a SQL file into banner-delimited sections (safe: banners are top-level). */
function splitSections(sql) {
  const parts = sql.split(/\r?\n--\s*[=-]{5,}\s*\r?\n/);
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^--/.test(p)); // drop pure-comment blocks
}

const sql = readFileSync(FILE, 'utf8');
console.log(`Applying ${FILE} to project ${REF}…\n`);

// 1) Try the whole file first (most Management API endpoints accept it).
const whole = await runQuery(sql);
if (whole.ok) {
  console.log('✔ Whole migration applied successfully.');
  process.exit(0);
}
console.log(`Whole-file attempt: HTTP ${whole.status} — ${JSON.stringify(whole.data)?.slice(0, 300)}\nFalling back to section-by-section…\n`);

// 2) Fall back to banner-delimited sections.
const sections = splitSections(sql);
console.log(`Split into ${sections.length} section(s).\n`);
let failed = 0;
for (let i = 0; i < sections.length; i++) {
  const res = await runQuery(sections[i]);
  if (res.ok) {
    console.log(`✔ Section ${i + 1}/${sections.length}`);
  } else {
    failed += 1;
    console.error(`✖ Section ${i + 1}/${sections.length} failed (HTTP ${res.status}):`);
    console.error(`  ${JSON.stringify(res.data)?.slice(0, 500)}`);
  }
}

console.log('');
if (failed === 0) {
  console.log('✔ All sections applied successfully.');
} else {
  console.error(`${failed} section(s) failed. Inspect the errors above (idempotent statements can be re-run).`);
  process.exitCode = 1;
}
