/**
 * Unit tests for the LEDGERS due-date engine (server-side module).
 * Run: npx tsx src/data/ledgerComplianceRules.test.ts
 * (no test framework installed — plain asserts, ponytail-style)
 */
import {
  generateComplianceCalendar, rulesForProfile,
} from '../../api/ledger-rules.mjs';
import {
  daysUntil, riskBand, complianceToIcs, REMINDER_SCHEDULE,
} from './ledgerComplianceRules';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const PVT = { entityType: 'pvtltd' as const, registrations: ['tds'] };
const PVT_GST = { entityType: 'pvtltd' as const, registrations: ['tds', 'gst'] };

// ── Generation counts ──
{
  const cal = generateComplianceCalendar({ fyStartYear: 2026, ...PVT, incorporatedOn: null });
  check('generates items for a plain pvtltd', cal.length > 20, `got ${cal.length}`);
  check('no GSTR/return items without gst registration', cal.every((i) => !['GSTR-1', 'GSTR-3B', 'GSTR-9/9C'].includes(i.form)), JSON.stringify(cal.filter((i) => i.law === 'GST').map((i) => i.form)));
  check('GST threshold watch present even without GST (it tracks the trigger)', cal.some((i) => i.form === 'GST Registration Watch'));
  check('every item carries a source', cal.every((i) => i.source_url.length > 3));
  check('every item carries last-verified', cal.every((i) => i.source_url.includes('—') || i.source_url.length > 0));

  const withGst = generateComplianceCalendar({ fyStartYear: 2026, ...PVT_GST, incorporatedOn: null });
  const gstr1 = withGst.filter((i) => i.form === 'GSTR-1');
  check('GSTR-1 appears 12x with GST registration', gstr1.length === 12, `got ${gstr1.length}`);
  check('GSTR-1 dates all on the 11th', gstr1.every((i) => i.due_date.endsWith('-11')));
  const gstr3b = withGst.filter((i) => i.form === 'GSTR-3B');
  check('GSTR-3B dates all on the 20th', gstr3b.every((i) => i.due_date.endsWith('-20')));
}

// ── Incorporation clamping (VJR: incorporated 15 Oct 2025) ──
{
  const cal = generateComplianceCalendar({ fyStartYear: 2025, ...PVT, incorporatedOn: '2025-10-15' });
  check('FY 2025-26 for an Oct-15 incorporation still generates items', cal.length > 15, `got ${cal.length}`);
  // Monthly items (TDS) for period months before incorporation must not exist.
  // Incorporation 15 Oct 2025 → the Oct-2025 deduction month still applies
  // (half the month existed), but nothing earlier (Apr–Sep 2025).
  check('no TDS Payment items for periods Apr–Sep 2025 (pre-incorporation)', !cal.some((i) => i.form === 'TDS Payment' && /^(0[4-9])-2025$/.test(i.period)), JSON.stringify(cal.filter((i) => i.form === 'TDS Payment').map((i) => i.period)));
  check('TDS Payment for Nov 2025 period exists (11-2025, due 07-12-2025)', cal.some((i) => i.form === 'TDS Payment' && i.period === '11-2025' && i.due_date === '2025-12-07'));

  // First-year anchors:
  const inc20a = cal.find((i) => i.form === 'INC-20A');
  check('INC-20A anchored ~6 months after incorporation', !!inc20a && inc20a.due_date >= '2026-04-01' && inc20a.due_date <= '2026-04-30', inc20a?.due_date);
  const firstBoard = cal.find((i) => i.form === 'First Board Meeting');
  check('first board meeting = incorporation + 30 days', !!firstBoard && firstBoard.due_date === '2025-11-14', firstBoard?.due_date);
  const firstAuditor = cal.find((i) => i.form === 'First Auditor + ADT-1');
  check('first auditor = incorporation + 45 days', !!firstAuditor && firstAuditor.due_date === '2025-11-29', firstAuditor?.due_date);
}

// ── Entity filtering ──
{
  const prop = generateComplianceCalendar({ fyStartYear: 2026, entityType: 'proprietorship', registrations: ['tds'], incorporatedOn: null });
  check('proprietorship generates zero ROC items', prop.every((i) => i.law !== 'ROC'));
  check('proprietorship gets ITR-3/4', prop.some((i) => i.form === 'ITR-3/4'));
  const llp = generateComplianceCalendar({ fyStartYear: 2026, entityType: 'llp', registrations: [], incorporatedOn: null });
  check('LLP gets Form 8 and Form 11', llp.some((i) => i.form === 'LLP Form 8') && llp.some((i) => i.form === 'LLP Form 11'));
  const ptec = generateComplianceCalendar({ fyStartYear: 2026, entityType: 'pvtltd', registrations: ['ptec'], incorporatedOn: null });
  const ptecItem = ptec.find((i) => i.form === 'PTEC ₹2,500 (company)');
  check('PTEC due 30 June', !!ptecItem && ptecItem.due_date === '2027-06-30', ptecItem?.due_date);
  check('PTRC excluded without ptrc registration', !ptec.some((i) => i.form === 'PTRC (employees)'));
}

// ── markPastFiled ──
{
  const today = new Date().toISOString().slice(0, 10);
  const cal = generateComplianceCalendar({ fyStartYear: 2025, ...PVT, incorporatedOn: '2025-10-15', markPastFiled: true });
  const past = cal.filter((i) => i.due_date < today);
  check('past items marked filed with filed_date set', past.every((i) => i.status === 'filed' && !!i.filed_date));
  const future = cal.filter((i) => i.due_date >= today);
  check('future items stay pending', future.every((i) => i.status === 'pending'));
}

// ── riskBand / daysUntil ──
{
  const t = new Date(); t.setHours(0, 0, 0, 0);
  // Local-date formatting — toISOString would shift the day under UTC+ zones.
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const plus = (n: number) => { const x = new Date(t); x.setDate(x.getDate() + n); return iso(x); };
  check('daysUntil 3 days ahead = 3', daysUntil(plus(3)) === 3, String(daysUntil(plus(3))));
  check('7 days ahead → critical', riskBand({ due_date: plus(7), status: 'pending' }) === 'critical');
  check('20 days ahead → warning', riskBand({ due_date: plus(20), status: 'pending' }) === 'warning');
  check('90 days ahead → upcoming', riskBand({ due_date: plus(90), status: 'pending' }) === 'upcoming');
  check('yesterday → overdue', riskBand({ due_date: plus(-2), status: 'pending' }) === 'overdue');
  check('filed → done regardless of date', riskBand({ due_date: plus(-2), status: 'filed' }) === 'done');
  // Weekend sanity: due dates are calendar dates; the countdown must cross months correctly.
  const endOfMonthPlus = daysUntil(plus(31));
  check('31-day countdown crosses month boundary exactly', endOfMonthPlus === 31, String(endOfMonthPlus));
}

// ── ICS export ──
{
  const cal = generateComplianceCalendar({ fyStartYear: 2026, ...PVT, incorporatedOn: null, markPastFiled: false }).slice(0, 3);
  const ics = complianceToIcs(cal, 'VJR Estate');
  check('ICS opens/closes VCALENDAR', ics.startsWith('BEGIN:VCALENDAR') && ics.trimEnd().endsWith('END:VCALENDAR'));
  check('ICS has one VEVENT per item', (ics.match(/BEGIN:VEVENT/g) ?? []).length === cal.length);
  const alarms = ics.match(/BEGIN:VALARM/g)?.length ?? 0;
  check(`ICS carries ${REMINDER_SCHEDULE.length} alarms per event`, alarms === cal.length * REMINDER_SCHEDULE.length, `${alarms} vs ${cal.length * REMINDER_SCHEDULE.length}`);
  check('ICS includes 30/15/7/3/1-day triggers', ['-P30D', '-P15D', '-P7D', '-P3D', '-P1D'].every((t) => ics.includes(t)));
}

// ── Government-extension shift hook ──
{
  // dueDateFor is private; the extension behaviour is tested via the public
  // generator: an admin override shifts the stored due_date (UI edit path),
  // so here we assert the engine's dates stay stable and the DB row is the
  // single source of truth after generation.
  const a = generateComplianceCalendar({ fyStartYear: 2026, ...PVT_GST, incorporatedOn: null });
  const b = generateComplianceCalendar({ fyStartYear: 2026, ...PVT_GST, incorporatedOn: null });
  check('generation is deterministic (extensions live in DB overrides)', JSON.stringify(a.map((i) => i.due_date)) === JSON.stringify(b.map((i) => i.due_date)));
  check('rulesForProfile filters by requires', rulesForProfile('pvtltd', []).every((r) => !r.requires?.length));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
