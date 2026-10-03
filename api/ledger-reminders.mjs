/**
 * LEDGERS — reminder engine (server-side).
 *
 * Scans every deadline source (compliance obligations, legal cases, notices,
 * payments, director KYC, document expiry) and creates due/overdue
 * notifications. Talks plain PostgREST fetch with the service-role key, so
 * the SAME code runs in all three proxy environments (Vercel fn + two dev
 * proxies) and in the Vercel cron. Idempotent per day per reminder key —
 * running twice never duplicates.
 *
 * Delivery is in-app today; email/WhatsApp needs a provider key and can be
 * added inside this file without changing the scan logic.
 *
 * Security: caller must hold the service-role key; the notifications table
 * is RLS-locked (no anon/authenticated policies), reads go through the
 * authenticated data-proxy only.
 */

export const REMINDER_SCHEDULE = [30, 15, 7, 3, 1]; // days before due
export const OVERDUE_ESCALATION = [1, 3, 7]; // days after due

export const LEDGER_NOTIFICATIONS_DDL = `
CREATE TABLE IF NOT EXISTS public.ledger_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,             -- reminder key: dedupe + idempotency
  kind TEXT NOT NULL,                   -- compliance | hearing | notice | payment | kyc | document
  entity_id TEXT DEFAULT '',
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  due_date DATE,
  days_delta INT,                       -- negative = overdue, positive = days left
  severity TEXT NOT NULL DEFAULT 'info',-- info | warning | urgent
  delivered_at TIMESTAMPTZ,             -- set when actually sent (future email/WA)
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_notif_created ON public.ledger_notifications (created_at DESC);
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON TABLE public.ledger_notifications FROM anon, authenticated';
  EXECUTE 'ALTER TABLE public.ledger_notifications ENABLE ROW LEVEL SECURITY';
END $$;
`;

// IST "today" regardless of server timezone (site operates in India).
export function istTodayIso() {
  return new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86_400_000);

function message(kind, title, dueIso, delta) {
  const when = delta === 0 ? 'is due TODAY' : delta > 0 ? `is due in ${delta} day${delta === 1 ? '' : 's'}` : `is overdue by ${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'}`;
  const kindLabel = kind === 'compliance' ? 'Compliance' : kind === 'hearing' ? 'Hearing' : kind === 'notice' ? 'Notice reply' : kind === 'payment' ? 'Payment' : kind === 'kyc' ? 'Director KYC' : 'Document';
  return `${kindLabel}: ${title} ${when} (due ${dueIso}).`;
}

const severityFor = (delta) => (delta < 0 ? 'urgent' : delta <= 7 ? 'warning' : 'info');

/**
 * One REST GET against PostgREST with the service-role key. Returns rows or
 * [] when the table does not exist yet (first run before migrations).
 */
async function restGet(base, key, path) {
  const res = await fetch(`${base}/rest/v1/${path}`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
  });
  if (!res.ok) {
    const text = await res.text();
    if (/does not exist|Could not find the table|schema cache/i.test(text)) return [];
    throw new Error(`PostgREST ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** hit = exact reminder-day match (30/15/7/3/1/0/overdue escalations). */
function reminderHit(dueIso, today) {
  const delta = daysBetween(today, dueIso);
  const hit = delta < 0 ? OVERDUE_ESCALATION.includes(Math.abs(delta)) : REMINDER_SCHEDULE.includes(delta) || delta === 0;
  return { delta, hit };
}

/**
 * Scan all sources and upsert notifications.
 * @param {{ baseUrl: string, serviceKey: string }} db service-role credentials
 * @returns {{ today: string, scanned: string, candidates: number, created: number }}
 */
export async function scanAndNotify({ baseUrl, serviceKey }) {
  const base = baseUrl.replace(/\/$/, '');
  const today = istTodayIso();
  const candidates = [];

  // ── Compliance obligations (open only) ──
  try {
    const items = await restGet(base, serviceKey, 'ledger_compliance_items?select=id,form,title,period,due_date,status&status=neq.filed&status=neq.na&limit=500');
    for (const it of items) {
      if (!it.due_date) continue;
      const { delta, hit } = reminderHit(it.due_date, today);
      if (hit) candidates.push({ kind: 'compliance', entity_id: it.id, title: `${it.form} · ${it.title}`, due_date: it.due_date, days_delta: delta, body: message('compliance', `${it.form} (${it.period})`, it.due_date, delta) });
    }
  } catch { /* missing table — first run */ }

  // ── Legal cases: reply deadlines + hearings (open only) ──
  try {
    const cases = await restGet(base, serviceKey, 'ledger_legal_cases?select=id,title,authority,reply_due_on,next_hearing_on,status&status=neq.closed&limit=200');
    for (const c of cases) {
      for (const [field, label] of [['reply_due_on', 'reply'], ['next_hearing_on', null]]) {
        if (!c[field]) continue;
        const { delta, hit } = reminderHit(c[field], today);
        if (hit) candidates.push({ kind: 'hearing', entity_id: c.id, title: c.title, due_date: c[field], days_delta: delta, body: message('hearing', label ? `reply — ${c.title}` : c.title, c[field], delta) });
      }
    }
  } catch { /* missing table */ }

  // ── Government notices: response deadlines (open only) ──
  try {
    const notices = await restGet(base, serviceKey, 'ledger_notices?select=id,subject,authority,response_deadline,status&status=neq.closed&status=neq.resolved&limit=200');
    for (const n of notices) {
      if (!n.response_deadline) continue;
      const { delta, hit } = reminderHit(n.response_deadline, today);
      if (hit) candidates.push({ kind: 'notice', entity_id: n.id, title: n.subject, due_date: n.response_deadline, days_delta: delta, body: message('notice', n.subject ?? 'notice', n.response_deadline, delta) });
    }
  } catch { /* missing table */ }

  // ── Payments (unpaid dues) ──
  try {
    const pays = await restGet(base, serviceKey, 'ledger_payments?select=id,title,amount,due_date,status&status=neq.paid&status=neq.reconciled&limit=500');
    for (const p of pays) {
      if (!p.due_date) continue;
      const { delta, hit } = reminderHit(p.due_date, today);
      if (hit) candidates.push({ kind: 'payment', entity_id: p.id, title: p.title, due_date: p.due_date, days_delta: delta, body: message('payment', `${p.title}${p.amount ? ` (₹${Number(p.amount).toLocaleString('en-IN')})` : ''}`, p.due_date, delta) });
    }
  } catch { /* missing table */ }

  // ── Director KYC (pending only) ──
  try {
    const dirs = await restGet(base, serviceKey, 'ledger_directors?select=id,name,kyc_due_date,kyc_status&kyc_status=eq.pending&limit=100');
    for (const d of dirs) {
      if (!d.kyc_due_date) continue;
      const { delta, hit } = reminderHit(d.kyc_due_date, today);
      if (hit) candidates.push({ kind: 'kyc', entity_id: d.id, title: `DIR-3 KYC — ${d.name}`, due_date: d.kyc_due_date, days_delta: delta, body: message('kyc', `DIR-3 KYC for ${d.name}`, d.kyc_due_date, delta) });
    }
  } catch { /* missing table */ }

  // ── Document expiry (weekly check within ±30 days of expiry) ──
  try {
    const docs = await restGet(base, serviceKey, 'ledger_documents?select=id,name,expiry_date&expiry_date=not.is.null&limit=500');
    for (const doc of docs) {
      const delta = daysBetween(today, doc.expiry_date);
      if (Math.abs(delta) <= 30 && (delta === 0 || delta % 7 === 0)) {
        candidates.push({ kind: 'document', entity_id: doc.id, title: doc.name, due_date: doc.expiry_date, days_delta: delta, body: `Document expiring: ${doc.name} expires on ${doc.expiry_date}.` });
      }
    }
  } catch { /* missing table */ }

  // ── Idempotent upsert: one row per reminder key; response = newly inserted only ──
  const rows = candidates.map((c) => ({
    key: `${c.kind}:${c.entity_id}:${c.due_date}:d${c.days_delta}`,
    kind: c.kind,
    entity_id: c.entity_id ?? '',
    title: c.title ?? '',
    body: c.body ?? '',
    due_date: c.due_date,
    days_delta: c.days_delta,
    severity: severityFor(c.days_delta),
  }));

  let created = 0;
  if (rows.length) {
    const res = await fetch(`${base}/rest/v1/ledger_notifications?on_conflict=key`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify(rows),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notification upsert failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const inserted = await res.json();
    created = Array.isArray(inserted) ? inserted.length : 0;
  }
  return { today, scanned: new Date().toISOString(), candidates: rows.length, created };
}
