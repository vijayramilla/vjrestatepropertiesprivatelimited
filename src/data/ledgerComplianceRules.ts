/**
 * LEDGERS — UI-side helpers for the compliance module.
 *
 * The statutory RULES + obligation GENERATION live server-side in
 * api/ledger-rules.mjs (imported by the data proxy and run behind
 * authentication) — the browser never computes statutory data. This file
 * keeps only presentational helpers: entity/registration options for the
 * onboarding wizard, FY labels, risk bands, and ICS export.
 *
 * Engine unit tests: npx tsx src/data/ledgerComplianceRules.test.ts
 */

export type LawArea = 'ROC' | 'LLP' | 'GST' | 'Income Tax' | 'Labour' | 'Corporate' | 'Licences' | 'Other';
export type EntityType = 'pvtltd' | 'opc' | 'llp' | 'partnership' | 'proprietorship';

export const ENTITY_TYPES: { value: EntityType; label: string; blurb: string; roc: boolean }[] = [
  { value: 'pvtltd', label: 'Private Limited Company', blurb: 'Full ROC + audit + board compliance', roc: true },
  { value: 'opc', label: 'One Person Company (OPC)', blurb: 'ROC annual set, no AGM/board-of-2 rules', roc: true },
  { value: 'llp', label: 'Limited Liability Partnership', blurb: 'LLP Form 8/11, no share capital filings', roc: true },
  { value: 'partnership', label: 'Partnership Firm', blurb: 'No ROC; IT + GST + labour only', roc: false },
  { value: 'proprietorship', label: 'Proprietorship', blurb: 'No ROC; IT + GST + labour only', roc: false },
];

export const REGISTRATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'rera_agent', label: 'RERA agent (Karnataka Form ABC)' },
  { value: 'gst', label: 'GST (regular)' },
  { value: 'gst_composition', label: 'GST (composition)' },
  { value: 'tds', label: 'TAN / TDS deductor' },
  { value: 'pf', label: 'EPF (20+ employees)' },
  { value: 'esi', label: 'ESIC (10+ employees)' },
  { value: 'ptec', label: 'PTEC — company PT ₹2,500/yr (Karnataka)' },
  { value: 'pt', label: 'PTRC — employee PT deduction (Karnataka, 20th monthly)' },
  { value: 'lwf', label: 'Karnataka Labour Welfare Fund' },
  { value: 'shops', label: 'Shops & Establishment (Karnataka)' },
  { value: 'trade_licence', label: 'BBMP Trade Licence' },
  { value: 'ie_code', label: 'IEC (import/export)' },
  { value: 'fssai', label: 'FSSAI licence' },
  { value: 'udyam', label: 'Udyam / MSME' },
  { value: 'startup', label: 'Startup India (80-IAC)' },
  { value: 'fdi', label: 'FDI / FEMA reporting' },
  { value: 'trademark', label: 'Trademark / IP' },
];

/* ── FY helpers ─────────────────────────────────────────────────────────── */

/** FY labels from incorporation (or a fixed start) up to the current FY. */
export function availableFyLabels(incorporatedOn?: string | null, fyStartMonth = 4): string[] {
  const now = new Date();
  const thisFyStart = now.getFullYear() - (now.getMonth() + 1 < fyStartMonth ? 1 : 0);
  const start = incorporatedOn
    ? new Date(incorporatedOn + 'T00:00:00').getFullYear() - (new Date(incorporatedOn + 'T00:00:00').getMonth() + 1 < fyStartMonth ? 1 : 0)
    : thisFyStart - 0;
  const labels: string[] = [];
  for (let y = Math.max(start, thisFyStart - 9); y <= thisFyStart; y++) {
    labels.push(`FY ${y}-${String(y + 1).slice(2)}`);
  }
  return labels.reverse();
}

export function currentFyLabel(fyStartMonth = 4): string {
  const now = new Date();
  const y = now.getFullYear() - (now.getMonth() + 1 < fyStartMonth ? 1 : 0);
  return `FY ${y}-${String(y + 1).slice(2)}`;
}

/* ── Risk bands ─────────────────────────────────────────────────────────── */

export function daysUntil(dueIso: string): number {
  const [y, m, d] = dueIso.split('-').map(Number);
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - todayUtc) / 86_400_000);
}

export type RiskBand = 'overdue' | 'critical' | 'warning' | 'upcoming' | 'done';

export function riskBand(item: { due_date: string; status: string }): RiskBand {
  if (item.status === 'filed' || item.status === 'na') return 'done';
  const d = daysUntil(item.due_date);
  if (d < 0) return 'overdue';
  if (d <= 7) return 'critical';
  if (d <= 30) return 'warning';
  return 'upcoming';
}

/* ── ICS export ─────────────────────────────────────────────────────────── */

/** Reminder cadence (days before due) used for ICS alarms; server scan uses the same. */
export const REMINDER_SCHEDULE = [30, 15, 7, 3, 1];

export function complianceToIcs(items: { form: string; period: string; due_date: string; title: string; notes?: string; law: string }[], companyName: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VJR Estate//LEDGERS//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Compliance — ' + companyName,
  ];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const alarms = REMINDER_SCHEDULE.map((d) => `P${d}D`);
  for (const it of items) {
    const dt = it.due_date.replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:ledger-${(it.form + it.period).replace(/\W/g, '')}-${dt}@vjrestate.in`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dt}`,
      `SUMMARY:[${it.law}] ${it.form} — ${it.title}`,
      `DESCRIPTION:Due ${it.due_date}. ${it.notes ?? ''}. Confirm with your CA/CS.`,
      ...alarms.flatMap((trig) => [
        'BEGIN:VALARM', `TRIGGER:-${trig}`, 'ACTION:DISPLAY',
        `DESCRIPTION:${trig.replace('-P', '').replace('D', '')} days to ${it.form} (${it.period})`, 'END:VALARM',
      ]),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
