/**
 * Unit tests for the director KYC due-date derivation.
 * Run: npx tsx src/data/directorKyc.test.ts
 */
import {
  parseFyStartYear, dir3DueDate, fiscalYearOf, latestFyStart, deriveKyc, kycState, DIR3_DUE,
  dscState, directorDuties, DSC_RENEW_LEAD_DAYS, DSC_STATUS_META,
} from './directorKyc';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

// ── FY parsing ──
check('parses FY 2025-26 → 2025', parseFyStartYear('FY 2025-26') === 2025);
check('parses FY 2026-27 → 2026', parseFyStartYear('FY 2026-27') === 2026);
check('garbage label → null', parseFyStartYear('nope') === null);
check('null label → null', parseFyStartYear(null) === null);

// ── Due date rule (must equal engine case 'dir3': fyStartY+1, Sept 30) ──
check('FY2025 → 2026-09-30', dir3DueDate(2025) === '2026-09-30');
check('FY2026 → 2027-09-30', dir3DueDate(2026) === '2027-09-30');
check('due month/day are Sept 30', DIR3_DUE.month === 9 && DIR3_DUE.day === 30);

// ── Fiscal year of a date (April-start) ──
check('15 Oct 2025 → FY2025', fiscalYearOf('2025-10-15') === 2025);
check('15 Mar 2026 → FY2025', fiscalYearOf('2026-03-15') === 2025);
check('01 Apr 2026 → FY2026', fiscalYearOf('2026-04-01') === 2026);
check('31 Mar 2026 → FY2025', fiscalYearOf('2026-03-31') === 2025);

// ── Latest FY start ──
check('Oct 3 2026 → FY2026', latestFyStart(new Date(2026, 9, 3)) === 2026);
check('Feb 2026 → FY2025', latestFyStart(new Date(2026, 1, 10)) === 2025);

// ── deriveKyc: label wins over live calendar ──
{
  const fromLabel = deriveKyc({ fy: 'FY 2025-26', now: new Date(2026, 9, 3) });
  check('label FY 2025-26 → due 2026-09-30', fromLabel.dueDate === '2026-09-30' && fromLabel.source === 'fy');
  const fromNow = deriveKyc({ now: new Date(2026, 9, 3) });
  check('no label → current FY 2026 → 2027-09-30', fromNow.dueDate === '2027-09-30' && fromNow.source === 'current');
}

// ── kycState ──
{
  const fixed = new Date(2026, 9, 3); // 3 Oct 2026
  check('done stays done', kycState('done', '2026-09-30', fixed) === 'done');
  check('na stays na', kycState('na', '2026-09-30', fixed) === 'na');
  check('no due date → upcoming', kycState('pending', null, fixed) === 'upcoming');
  check('past due → overdue', kycState('pending', '2026-09-30', fixed) === 'overdue');
  check('within 30d → due', kycState('pending', '2026-10-20', fixed) === 'due');
  check('beyond 30d → upcoming', kycState('pending', '2027-09-30', fixed) === 'upcoming');
}

// ── DSC state ──
{
  const fixed = new Date(2026, 9, 3); // 3 Oct 2026
  check('DSC active when far from expiry', dscState('2027-10-15', fixed) === 'active');
  check('DSC expiring within 90d', dscState('2026-12-15', fixed) === 'expiring');
  check('DSC renew-due within 30d', dscState('2026-10-25', fixed) === 'renew_due');
  check('DSC expired in the past', dscState('2026-09-30', fixed) === 'expired');
  check('DSC no expiry → active', dscState(null, fixed) === 'active');
  check('DSC renew lead is 30 days', DSC_RENEW_LEAD_DAYS === 30);
  check('DSC meta covers all 4 states', Object.keys(DSC_STATUS_META).length === 4);
}

// ── directorDuties (VJR benchmark: incorporated 15 Oct 2025) ──
{
  const duties = directorDuties({ incorporatedOn: '2025-10-15', dscExpiry: '2027-10-15', fy: 'FY 2026-27', now: new Date(2026, 9, 3) });
  const byForm = new Map(duties.map((d) => [d.form, d]));
  check('DIR-3 KYC FY2026-27 → 2027-09-30', byForm.get('DIR-3 KYC')?.dueDate === '2027-09-30');
  check('DSC renewal anchored at expiry 2027-10-15', byForm.get('DSC renewal')?.dueDate === '2027-10-15');
  check('INC-20A = incorporation + 180d → 2026-04-13', byForm.get('INC-20A')?.dueDate === '2026-04-13');
  check('first auditor = incorporation + 45d → 2025-11-29', byForm.get('First auditor (ADT-1)')?.dueDate === '2025-11-29');
  check('first board = incorporation + 30d → 2025-11-14', byForm.get('First board meeting')?.dueDate === '2025-11-14');
  check('duties sorted nearest first', duties.every((d, i) => i === 0 || duties[i - 1].dueDate <= d.dueDate));
  check('every duty carries a note', duties.every((d) => d.note.length > 10));
  const noDsc = directorDuties({ incorporatedOn: null, dscExpiry: null, fy: 'FY 2026-27' });
  check('no DSC/incorporation → only DIR-3 KYC', noDsc.length === 1 && noDsc[0].kind === 'kyc');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
