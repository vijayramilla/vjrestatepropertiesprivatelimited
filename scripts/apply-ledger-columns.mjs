#!/usr/bin/env node
/**
 * One-time fix: apply the GST engine migration (tables + columns + unique
 * index). Mirrors scripts/apply-missing-columns.mjs — runs through exec_sql.
 *
 * USAGE: node scripts/apply-ledger-columns.mjs
 */
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';

config(); // loads .env from cwd

const BASE = (process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_REQ_SERVICE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY;

if (!BASE || !SERVICE_KEY) {
  console.error('Missing SUPABASE_REQ_URL / SUPABASE_REQ_SERVICE_KEY in .env');
  process.exit(1);
}

const sql = readFileSync(new URL('../supabase/migrations/20261004010000_director_dsc_expiry.sql', import.meta.url), 'utf8');

const res = await fetch(`${BASE}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  body: JSON.stringify({ q: sql }),
});
const text = await res.text().catch(() => '');
if (!res.ok) {
  console.error(`FAILED (${res.status}): ${text}`);
  process.exit(1);
}
console.log('✓ director DSC expiry migration applied');
