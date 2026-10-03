/**
 * GST engine scenario tests (spec §60 — the ten required scenarios).
 * Run: npx tsx src/data/gstEngine.test.ts
 */
import {
  generateComplianceCalendarWithSummary, evaluateGst, isGstRegistered, gstProfileFromLegacy,
} from '../../api/ledger-rules.mjs';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const BASE = { fyStartYear: 2026, entityType: 'pvtltd' as const, registrations: ['tds'], incorporatedOn: null };
const gstr1Count = (items: { form: string }[]) => items.filter((i) => i.form === 'GSTR-1').length;
const hasForm = (items: { form: string }[], form: string) => items.some((i) => i.form === form);

// ── TEST 1: not registered, monitoring ON, ₹10L ──
{
  const r = generateComplianceCalendarWithSummary({ ...BASE, gst: { status: 'not_registered' }, aggregateTurnover: 1_000_000 });
  check('T1: no GSTR-1 when unregistered', gstr1Count(r.items) === 0);
  check('T1: no GSTR-3B when unregistered', !hasForm(r.items, 'GSTR-3B'));
  check('T1: threshold monitor present', hasForm(r.items, 'GST Registration Watch'));
  check('T1: no crossing detected', r.gstEval.crossed === false);
  check('T1: generation off', r.gstEval.generation === false);
}

// ── TEST 2: ₹19.5L — approaching ──
{
  const e = evaluateGst({ status: 'not_registered' }, 1_950_000);
  check('T2: no crossing at 19.5L', e.crossed === false);
  check('T2: 98% used', e.pctUsed === 98, `got ${e.pctUsed}`);
  check('T2: remaining ₹50k', e.remaining === 50_000);
}

// ── TEST 3: exactly ₹20L — statutory trigger evaluation, no blind filing ──
{
  const e = evaluateGst({ status: 'not_registered' }, 2_000_000);
  check('T3: ₹20L crosses (>= threshold)', e.crossed === true);
  check('T3: review required', e.reviewRequired === true);
  const r = generateComplianceCalendarWithSummary({ ...BASE, gst: { status: 'not_registered' }, aggregateTurnover: 2_000_000 });
  check('T3: no GSTR filings created on crossing', gstr1Count(r.items) === 0 && !hasForm(r.items, 'GSTR-3B'));
}

// ── TEST 4: ₹20.25L — crossing event ──
{
  const e = evaluateGst({ status: 'not_registered' }, 2_025_000);
  check('T4: crossing detected', e.crossed === true);
  check('T4: review required', e.reviewRequired === true);
  check('T4: no GST filings auto-created', gstr1Count(generateComplianceCalendarWithSummary({ ...BASE, gst: { status: 'not_registered' }, aggregateTurnover: 2_025_000 }).items) === 0);
}

// ── TEST 5: voluntary registration at ₹10L ──
{
  const r = generateComplianceCalendarWithSummary({ ...BASE, gst: { status: 'voluntarily_registered', compliance_generation_enabled: true }, aggregateTurnover: 1_000_000 });
  check('T5: voluntary → GST filings generated', gstr1Count(r.items) === 12, `got ${gstr1Count(r.items)}`);
  check('T5: watch hidden once registered', !hasForm(r.items, 'GST Registration Watch'));
  check('T5: isGstRegistered true', isGstRegistered('voluntarily_registered'));
}

// ── TEST 6: registered regular ──
{
  const r = generateComplianceCalendarWithSummary({ ...BASE, gst: { status: 'registered_regular', compliance_generation_enabled: true }, aggregateTurnover: 5_000_000 });
  check('T6: 12x GSTR-1', gstr1Count(r.items) === 12);
  check('T6: 12x GSTR-3B', r.items.filter((i) => i.form === 'GSTR-3B').length === 12);
  check('T6: GSTR-9 annual present', hasForm(r.items, 'GSTR-9/9C'));
  check('T6: generation on', r.gstEval.generation === true);
}

// ── TEST 7: registered composition ──
{
  const r = generateComplianceCalendarWithSummary({ ...BASE, gst: { status: 'registered_composition', compliance_generation_enabled: true }, aggregateTurnover: 4_000_000 });
  check('T7: CMP-08 quarterly (4x)', r.items.filter((i) => i.form === 'CMP-08').length === 4, `got ${r.items.filter((i) => i.form === 'CMP-08').length}`);
  check('T7: no GSTR-3B (mutually exclusive)', !hasForm(r.items, 'GSTR-3B'));
  check('T7: no GSTR-1 (mutually exclusive)', gstr1Count(r.items) === 0);
  check('T7: no threshold watch', !hasForm(r.items, 'GST Registration Watch'));
}

// ── TEST 8: cancelled — future stops, review flags ──
{
  const r = generateComplianceCalendarWithSummary({ ...BASE, gst: { status: 'cancelled', compliance_generation_enabled: false }, aggregateTurnover: 5_000_000 });
  check('T8: no GST filings after cancellation', gstr1Count(r.items) === 0 && !hasForm(r.items, 'GSTR-3B'));
  check('T8: isGstRegistered false', isGstRegistered('cancelled') === false);
  check('T8: monitoring still tracks turnover', hasForm(r.items, 'GST Registration Watch'));
}

// ── TEST 9: unknown exception facts → review, never inferred ──
{
  const e = evaluateGst({ status: 'not_registered', interstate_taxable_supply: null, compulsory_registration_condition: null }, 1_000_000);
  check('T9: unknown facts → review required', e.reviewRequired === true);
  // Absent facts count as unknown too — never inferred (spec §11/§57).
  check('T9: absent facts count as unknown (6 total)', e.unknownExceptions === 6, `got ${e.unknownExceptions}`);
  const e2 = evaluateGst({ status: 'not_registered', interstate_taxable_supply: false, compulsory_registration_condition: false, exempt_supply_only: false, ecommerce_condition: false, agent_condition: false, reverse_charge_condition: false }, 1_000_000);
  check('T9: all-answered + below threshold → no review', e2.reviewRequired === false);
}

// ── TEST 10: legacy migration + idempotency of summary ──
{
  const legacy = gstProfileFromLegacy(['gst'], 'qrmp');
  check('T10: legacy gst chip → registered_regular', legacy.status === 'registered_regular');
  check('T10: legacy qrmp honoured', legacy.filing_frequency === 'qrmp');
  const legacyComp = gstProfileFromLegacy(['gst_composition'], 'monthly');
  check('T10: legacy composition chip → registered_composition', legacyComp.status === 'registered_composition');
  // Summary determinism: same input → same output
  const a = generateComplianceCalendarWithSummary({ ...BASE, gst: { status: 'not_registered' }, aggregateTurnover: 1_000_000 });
  const b = generateComplianceCalendarWithSummary({ ...BASE, gst: { status: 'not_registered' }, aggregateTurnover: 1_000_000 });
  check('T10: generation deterministic', a.items.length === b.items.length && a.summary.applicable === b.summary.applicable);
  check('T10: summary counts consistent', a.summary.rulesEvaluated === a.summary.applicable + a.summary.notApplicable);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
