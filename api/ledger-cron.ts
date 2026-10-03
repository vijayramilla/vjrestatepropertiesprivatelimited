import { LEDGER_NOTIFICATIONS_DDL, scanAndNotify } from './ledger-reminders.mjs';

/**
 * Daily cron endpoint — creates the notifications table on first use and
 * scans every Ledgers deadline source for due/overdue reminders.
 *
 * Schedule: vercel.json crons → daily 03:30 IST (22:00 UTC).
 * Auth: Authorization: Bearer CRON_SECRET (set CRON_SECRET in Vercel env).
 * Manual: also runnable via the authenticated proxy action `ledger.reminders.run`.
 */

const SUPABASE_SERVICE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_REQ_SERVICE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? ''
).trim().replace(/^(['"])(.*)\1$/, '$2');

function json(res: any, status: number, body: unknown) {
  res.status(status).json(body);
}

export default async function handler(req: any, res: any) {
  // Vercel Cron sends the CRON_SECRET automatically; manual GETs must match.
  const auth = String(req.headers.authorization ?? '');
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return json(res, 401, { error: 'Unauthorized — set Authorization: Bearer CRON_SECRET' });
  }

  const url = process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '';
  if (!url || !SUPABASE_SERVICE_KEY) {
    return json(res, 500, { error: 'Supabase service credentials missing on the server' });
  }

  try {
    // Table is created once; exec_sql RPC exists in this project already.
    try {
      await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
        body: JSON.stringify({ q: LEDGER_NOTIFICATIONS_DDL }),
      });
    } catch { /* table likely exists — the scan below errors if truly missing */ }

    const result = await scanAndNotify({ baseUrl: url, serviceKey: SUPABASE_SERVICE_KEY });
    return json(res, 200, { ok: true, ...result });
  } catch (e: any) {
    console.error('[ledger-cron] scan failed:', e?.message ?? e);
    return json(res, 500, { ok: false, error: e?.message ?? 'Reminder scan failed' });
  }
}
