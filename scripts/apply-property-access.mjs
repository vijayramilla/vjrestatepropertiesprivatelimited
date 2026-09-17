#!/usr/bin/env node
/**
 * One-time setup: adds the users.can_add_property column used by the
 * admin-granted "Add Property" permission.
 *
 * USAGE:
 *   node scripts/apply-property-access.mjs
 *
 * ENV (already in .env):
 *   SUPABASE_REQ_URL         — site-data Supabase project URL
 *   SUPABASE_REQ_SERVICE_KEY — service-role key
 *
 * Uses the exec_sql RPC (created by scripts/apply-missing-columns.mjs). If
 * that RPC is missing, the exact SQL to paste into the Supabase SQL Editor
 * is printed instead.
 */
const URL_ = process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL;
const KEY = process.env.SUPABASE_REQ_SERVICE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY;

if (!URL_ || !KEY) {
  console.error('Missing SUPABASE_REQ_URL or SUPABASE_REQ_SERVICE_KEY in .env');
  process.exit(1);
}

const SQL = 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS can_add_property BOOLEAN NOT NULL DEFAULT false;';

async function runSql(sql) {
  const res = await fetch(`${URL_}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}`, apikey: KEY },
    body: JSON.stringify({ q: sql }),
  });
  const text = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, body: text };
}

console.log('Adding users.can_add_property via exec_sql RPC…');
const r = await runSql(SQL);
if (r.ok) {
  console.log('✔ Column added. The Grant Property Access toggle will now save.');
  process.exit(0);
}

console.error(`✖ exec_sql RPC failed (HTTP ${r.status}): ${r.body?.slice(0, 300)}`);
console.error('\nRun this SQL manually in the Supabase dashboard → SQL Editor:');
console.error('---');
console.error(SQL);
console.error('---');
process.exit(1);
