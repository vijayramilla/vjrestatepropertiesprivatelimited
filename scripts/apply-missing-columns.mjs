#!/usr/bin/env node
/**
 * One-time setup: creates the exec_sql RPC + missing employee columns.
 *
 * USAGE:
 *   node scripts/apply-missing-columns.mjs
 *
 * ENV (already in .env):
 *   SUPABASE_REQ_URL        — site-data Supabase project URL
 *   SUPABASE_REQ_SERVICE_KEY — service-role key
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const URL = process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL;
const KEY = process.env.SUPABASE_REQ_SERVICE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY;

if (!URL || !KEY) {
  console.error('Missing VITE_SUPABASE_REQ_URL or VITE_SUPABASE_REQ_SERVICE_KEY in .env');
  process.exit(1);
}

async function runSql(sql) {
  const res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}`, 'apikey': KEY },
    body: JSON.stringify({ q: sql }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, body: text };
  }
  return { ok: true };
}

// Step 1: Create exec_sql function via Management API (or direct SQL in dashboard)
console.log('Step 1: Creating exec_sql RPC function...\n');
const execSqlFn = `
CREATE OR REPLACE FUNCTION public.exec_sql(q TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE q;
END;
$$;

REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
`;

let r = await runSql(execSqlFn);
if (!r.ok) {
  console.error(`exec_sql RPC not available (HTTP ${r.status}).`);
  console.error('Run this SQL manually in Supabase SQL Editor first:');
  console.error('---');
  console.error(execSqlFn);
  console.error('---');
  console.error('\nThen re-run this script.');
  process.exit(1);
}
console.log('✔ exec_sql RPC ready.\n');

// Step 2: Add missing columns
const columns = [
  { table: 'employees', col: 'face_verify_required', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
  { table: 'employees', col: 'face_verify_frequency', type: "TEXT NOT NULL DEFAULT 'daily'" },
  { table: 'employees', col: 'payroll_visible',      type: 'BOOLEAN NOT NULL DEFAULT TRUE' },
];

for (const { table, col, type } of columns) {
  const sql = `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${col} ${type};`;
  console.log(`Adding ${table}.${col}...`);
  r = await runSql(sql);
  if (r.ok) {
    console.log(`  ✔ done`);
  } else {
    console.error(`  ✖ failed (HTTP ${r.status}): ${r.body?.slice(0, 200)}`);
  }
}

console.log('\n✔ All done. The payroll toggle should now save correctly.');
