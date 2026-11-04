/**
 * Unit tests for the LEDGERS due-date engine (server-side module).
 * Run: npx tsx src/data/ledgerComplianceRules.test.ts
 */
import { generateComplianceCalendar, rulesForProfile } from '../../api/_lib/ledger-rules.mjs';
import { daysUntil, riskBand, complianceToIcs, REMINDER_SCHEDULE } from './ledgerComplianceRules';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const PVT = { entityType: 'pvtltd' as const, registrations: ['tds'] };
const PVT_GST = { entityType: 'pvtltd' as const, registrations: ['tds', 'gst'] };

{
  const cal = generateComplianceCalendar({ fyStartYear: 2026, ...PVT, incorporatedOn: null, markPastFiled: false });
  check('generates core items for a plain pvtltd', cal.length > 10, `got ${cal.length}`);
  check('no GSTR returns without registration', cal.every((i) => !['GSTR-1', 'GSTR-3B', 'GSTR-9/9C'].includes(i.form)));
  check('GST threshold watch is off until the GST pack is enabled', !cal.some((i) => i.form === 'GST Registration Watch'));
  check('GST threshold watch appears with the GST pack', generateComplianceCalendar({ fyStartYear: 2026, ...PVT, incorporatedOn: null, enabledPacks: ['gst'] }).some((i) => i.form === 'GST Registration Watch'));
  check('every item carries a source', cal.every((i) => i.source_url.length > 3));
  const withGst = generateComplianceCalendar({ fyStartYear: 2026, ...PVT_GST, incorporatedOn: null, enabledPacks: ['gst'], markPastFiled: false });
  const gstr1 = withGst.filter((i) => i.form === 'GSTR-1');
  check('GSTR-1 appears 12x with GST registration', gstr1.length === 12);
  check('GSTR-1 dates are on the 11th', gstr1.every((i) => i.due_date.endsWith('-11')));
  check('FY 2026-27 April return falls in May 2026', gstr1.find((i) => i.period.startsWith('04-'))?.due_date === '2026-05-11');
  check('FY 2026-27 March return falls in April 2027', gstr1.find((i) => i.period.startsWith('03-'))?.due_date === '2027-04-11');
}

{
  const cal = generateComplianceCalendar({ fyStartYear: 2025, ...PVT, incorporatedOn: '2025-10-15', markPastFiled: false });
  check('FY 2025-26 generates first-year obligations', cal.length > 10, `got ${cal.length}`);
  check('pre-incorporation TDS months are excluded', !cal.some((i) => i.form === 'TDS Payment' && /^(0[4-9])-2025$/.test(i.period)));
  check('INC-20A uses 180 calendar days', cal.find((i) => i.form === 'INC-20A')?.due_date === '2026-04-13', cal.find((i) => i.form === 'INC-20A')?.due_date);
  check('first board meeting due 30 days after incorporation', cal.find((i) => i.form === 'First Board Meeting')?.due_date === '2025-11-14');
  check('first auditor appointment has separate 30-day due date', cal.find((i) => i.form === 'First Auditor Appointment')?.due_date === '2025-11-14');
  check('one-time incorporation tasks are absent in later FYs', !generateComplianceCalendar({ fyStartYear: 2026, ...PVT, incorporatedOn: '2025-10-15' }).some((i) => ['First Board Meeting', 'First Auditor Appointment', 'INC-20A'].includes(i.form)));
  check('first ADT-1 is a date-input review, not a guessed filing', cal.find((i) => i.form === 'First ADT-1')?.compliance_type === 'internal_task' && cal.find((i) => i.form === 'First ADT-1')?.penalty_exposure === 0);
  const withAppointment = generateComplianceCalendar({ fyStartYear: 2025, ...PVT, incorporatedOn: '2025-10-15', auditorAppointmentDate: '2025-11-10' });
  check('first ADT-1 deadline uses recorded appointment date plus 15 days', withAppointment.find((i) => i.form === 'First ADT-1')?.due_date === '2025-11-25');
  const actualAgm = generateComplianceCalendar({ fyStartYear: 2025, ...PVT, incorporatedOn: '2025-10-15', agmDates: { 'FY 2025-26': '2026-08-01' } });
  check('first-year AOC-4 deadline is based on the recorded AGM date', actualAgm.find((i) => i.form === 'AOC-4')?.due_date === '2026-08-31');
  check('first-year MGT-7 deadline is based on the recorded AGM date', actualAgm.find((i) => i.form === 'MGT-7')?.due_date === '2026-09-30');
  check('AOC-4 and MGT-7 remain review-only absent actual AGM', cal.filter((i) => ['AOC-4', 'MGT-7'].includes(i.form)).every((i) => i.compliance_type === 'internal_task' && i.penalty_exposure === 0));
  check('first AGM deadline based on first FY close plus nine months', cal.find((i) => i.form === 'AGM')?.due_date === '2026-12-31', cal.find((i) => i.form === 'AGM')?.due_date);
  check('AGM record-date task exists', cal.some((i) => i.form === 'AGM date required'));
  check('MSME-1 uses the correct H1/H2 period-end deadlines', cal.filter((i) => i.form === 'MSME-1').every((i) => i.due_date === '2025-10-31' || i.due_date === '2026-04-30'));
  check('MSME-1 periods have unique half-year labels', new Set(cal.filter((i) => i.form === 'MSME-1').map((i) => i.period)).size === cal.filter((i) => i.form === 'MSME-1').length);
  const small = generateComplianceCalendar({ fyStartYear: 2026, ...PVT, incorporatedOn: null, smallCompany: true });
  check('small companies receive MGT-7A instead of MGT-7', small.some((i) => i.form === 'MGT-7A') && !small.some((i) => i.form === 'MGT-7'));
  check('small-company board obligations follow calendar half-years', small.filter((i) => i.form === 'Board Meetings').map((i) => i.period).sort().join(',') === 'H1 CY2026,H2 CY2026');
}

{
  const base = { fyStartYear: 2026, entityType: 'pvtltd' as const, incorporatedOn: null, markPastFiled: false };
  const withoutAnswers = generateComplianceCalendar({ ...base, registrations: ['tds', 'pf', 'gst'] });
  check('conditional advance tax absent when payable threshold is unknown', !withoutAnswers.some((i) => i.form === 'Advance Tax'));
  check('conditional POSH absent until applicability is confirmed', !withoutAnswers.some((i) => i.form === 'POSH Annual Report'));
  check('conditional MSME-1 absent until qualifying dues are confirmed', !withoutAnswers.some((i) => i.form === 'MSME-1'));
  const withAnswers = generateComplianceCalendar({ ...base, registrations: ['tds', 'pf', 'gst'], enabledPacks: ['employees'], applicability: { advance_tax_payable_10000_or_more: 'yes', posh_10_or_more_employees: 'yes', msme_dues_over_45_days: 'yes' } });
  check('explicit answers enable conditional obligations', ['Advance Tax', 'POSH Annual Report', 'MSME-1'].every((f) => withAnswers.some((i) => i.form === f)));
  check('unknown values do not count as yes', !generateComplianceCalendar({ ...base, registrations: ['tds'], applicability: { advance_tax_payable_10000_or_more: 'unknown' } }).some((i) => i.form === 'Advance Tax'));
  const tdsCal = generateComplianceCalendar({ ...base, registrations: ['tds'], applicability: { tds_q2_applicable: 'yes' } });
  check('TDS return generated only after applicability is confirmed', tdsCal.some((i) => i.form === '24Q / 26Q'));
  check('Q2 TDS return deadline is 31 October', tdsCal.find((i) => i.form === '24Q / 26Q' && i.period.startsWith('Q2'))?.due_date === '2026-10-31');
  check('a positive Q2 answer does not assume other TDS quarters', tdsCal.filter((i) => i.form === '24Q / 26Q').length === 1);
  const noTds = generateComplianceCalendar({ ...base, registrations: ['tds'], applicability: { tds_q2_applicable: 'no' } });
  check('negative TDS answer excludes quarterly returns', !noTds.some((i) => i.form === '24Q / 26Q'));
}

{
  const prop = generateComplianceCalendar({ fyStartYear: 2026, entityType: 'proprietorship', registrations: ['tds'], incorporatedOn: null, markPastFiled: false });
  check('proprietorship generates zero ROC items', prop.every((i) => i.law !== 'ROC'));
  check('proprietorship gets ITR-3/4', prop.some((i) => i.form === 'ITR-3/4'));
  const llp = generateComplianceCalendar({ fyStartYear: 2026, entityType: 'llp', registrations: [], incorporatedOn: null, markPastFiled: false });
  check('LLP gets Form 8 and Form 11', llp.some((i) => i.form === 'LLP Form 8') && llp.some((i) => i.form === 'LLP Form 11'));
  check('rulesForProfile filters by requires', rulesForProfile('pvtltd', []).every((r) => !r.requires?.length));
}

{
  const cal = generateComplianceCalendar({ fyStartYear: 2025, ...PVT, incorporatedOn: '2025-10-15', markPastFiled: true });
  check('past dates are not auto-marked filed', cal.every((i) => i.status !== 'filed' && !i.filed_date));
}

{
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const plus = (n: number) => { const x = new Date(t); x.setDate(x.getDate() + n); return iso(x); };
  const fixedToday = new Date('2026-10-30T12:00:00');
  check('30 October 2026 is the deterministic compliance date', daysUntil('2026-10-30', fixedToday) === 0);
  check('Q2 TDS return is due tomorrow on 30 October 2026', daysUntil('2026-10-31', fixedToday) === 1);
  check('Q2 return is critical on 30 October 2026', riskBand({ due_date: '2026-10-31', status: 'pending' }, fixedToday) === 'critical');
  check('daysUntil 3 days ahead = 3', daysUntil(plus(3)) === 3);
  check('7 days ahead is critical', riskBand({ due_date: plus(7), status: 'pending' }) === 'critical');
  check('filed without evidence stays risk-visible', riskBand({ due_date: plus(-1), status: 'filed' }) === 'overdue');
  check('filed with evidence is done', riskBand({ due_date: plus(-1), status: 'filed', arn: 'ACK-1' }) === 'done');
  check('explicit awaiting-evidence blocks old proof fields', riskBand({ due_date: plus(-1), status: 'filed', evidence_status: 'awaiting_evidence', arn: 'OLD-ACK' }) === 'overdue');
  check('20 days ahead is warning', riskBand({ due_date: plus(20), status: 'pending' }) === 'warning');
  check('90 days ahead is upcoming', riskBand({ due_date: plus(90), status: 'pending' }) === 'upcoming');
  check('yesterday is overdue', riskBand({ due_date: plus(-1), status: 'pending' }) === 'overdue');
  check('filed is done regardless of date only when evidenced', riskBand({ due_date: plus(-1), status: 'filed', evidence_status: 'verified' }) === 'done');
  check('month boundary countdown remains exact', daysUntil(plus(31)) === 31);
}

{
  const cal = generateComplianceCalendar({ fyStartYear: 2026, ...PVT, incorporatedOn: null, markPastFiled: false }).slice(0, 3);
  const ics = complianceToIcs(cal, 'VJR Estate');
  check('ICS opens/closes VCALENDAR', ics.startsWith('BEGIN:VCALENDAR') && ics.trimEnd().endsWith('END:VCALENDAR'));
  check('ICS has one VEVENT per item', (ics.match(/BEGIN:VEVENT/g) ?? []).length === cal.length);
  check('ICS has configured alarms per event', (ics.match(/BEGIN:VALARM/g) ?? []).length === cal.length * REMINDER_SCHEDULE.length);
  check('ICS includes 30/15/7/3/1-day triggers', ['-P30D', '-P15D', '-P7D', '-P3D', '-P1D'].every((t) => ics.includes(t)));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
