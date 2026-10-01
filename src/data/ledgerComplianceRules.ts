/**
 * LEDGERS — India statutory compliance rules master (Karnataka company).
 *
 * Due-date rules verified Oct 2026 from official portals: gst.gov.in (GSTR-1
 * 11th/13th, 3B 20th/22nd/24th), incometaxindia.gov.in (TDS 7th/30 Apr,
 * returns 31 Jul/31 Oct/31 Jan/31 May, advance tax 15 Jun/Sep/Dec/15 Mar),
 * MCA (AOC-4 30d after AGM, MGT-7 60d, DIR-3 KYC 30 Sep), epfindia (PF ECR
 * 15th), esic (15th). GST/ROC authorities periodically extend dates via
 * circulars — the "Confirm with your CA/CS" tag is baked into every rule.
 */

export type LawArea = 'ROC' | 'GST' | 'Income Tax' | 'Labour' | 'Corporate' | 'Other';

export interface ComplianceRule {
  law: LawArea;
  form: string;
  title: string;
  /** freq: monthly | quarterly | annual | event */
  freq: 'monthly' | 'quarterly' | 'annual';
  /** Months (1-12) the item covers, for monthly/quarterly generation. */
  months?: number[];
  /** Fixed due day-of-month (or fixed date rule key handled by dueDateFor). */
  rule: string;
  /** Human-readable due-date rule for the UI. */
  dueRuleLabel: string;
  penalty: string;
  penaltyExposure: number;
  source: string;
}

/** All months covered by an Apr–Mar FY, as calendar months of that FY window. */
const FY_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export const COMPLIANCE_RULES: ComplianceRule[] = [
  // ── GST (Karnataka — CGST Act/SGST Act; monthly filer, non-QRMP default) ──
  { law: 'GST', form: 'GSTR-1', title: 'Outward supplies statement', freq: 'monthly', months: FY_MONTHS, rule: 'gstr1', dueRuleLabel: '11th of next month (13th under QRMP)', penalty: '₹50/day (₹20 nil), 10% of tax or ₹10k min for non-filing', penaltyExposure: 5000, source: 'gst.gov.in — CGST Rules 59; Notification 83/2020' },
  { law: 'GST', form: 'GSTR-3B', title: 'Summary return + tax payment', freq: 'monthly', months: FY_MONTHS, rule: 'gstr3b', dueRuleLabel: '20th of next month (22nd/24th QRMP by state)', penalty: 'Late fee ₹50/day (₹20 nil) + interest 18% p.a. on unpaid tax', penaltyExposure: 5000, source: 'gst.gov.in — CGST Rules 61; Notification 83/2020' },
  { law: 'GST', form: 'GSTR-9/9C', title: 'Annual return + reconciliation', freq: 'annual', months: [3], rule: 'gst9', dueRuleLabel: '31 December after FY end', penalty: '₹100/day (CGST+SGST each), cap 0.25% of turnover', penaltyExposure: 20000, source: 'gst.gov.in — Sec 44 CGST Act' },

  // ── Income Tax ──
  { law: 'Income Tax', form: 'TDS Payment', title: 'TDS/TCS deposit (Challan ITNS-281)', freq: 'monthly', months: FY_MONTHS, rule: 'tdsPay', dueRuleLabel: '7th of next month; March → 30 April', penalty: 'Interest 1.5%/month from deduction to payment + Sec 271C penalty', penaltyExposure: 10000, source: 'incometax.gov.in — Sec 200; CBDT circulars' },
  { law: 'Income Tax', form: '24Q / 26Q', title: 'TDS quarterly returns', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'tdsRet', dueRuleLabel: '31 Jul / 31 Oct / 31 Jan / 31 May', penalty: 'Late fee ₹200/day (Sec 234E, cap = TDS amount); filing fee ₹5k–₹1L (Sec 271H)', penaltyExposure: 15000, source: 'incometax.gov.in — Sec 200(3), 234E, 271H' },
  { law: 'Income Tax', form: 'Advance Tax', title: 'Advance tax instalment', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'advTax', dueRuleLabel: '15% Jun 15 · 45% Sep 15 · 75% Dec 15 · 100% Mar 15', penalty: 'Interest u/s 234B/234C on shortfall', penaltyExposure: 0, source: 'incometaxindia.gov.in — Sec 207–211, 234' },
  { law: 'Income Tax', form: 'ITR-6', title: 'Company income tax return', freq: 'annual', months: [10], rule: 'itr', dueRuleLabel: '31 October (31 Jul if no tax audit)', penalty: 'Late fee u/s 234F ₹5,000/₹10,000 by delay slab', penaltyExposure: 10000, source: 'incometax.gov.in — Sec 139(1), 234F' },
  { law: 'Income Tax', form: '3CA/3CB-3CD', title: 'Tax audit report (if turnover > ₹1cr / limits)', freq: 'annual', months: [9], rule: 'taxAudit', dueRuleLabel: '30 September preceding ITR due date', penalty: 'Best-judgment assessment; penalty exposure', penaltyExposure: 25000, source: 'incometaxindia.gov.in — Sec 44AB' },

  // ── ROC / Companies Act 2013 ──
  { law: 'ROC', form: 'AOC-4', title: 'Financial statements filing (post-AGM)', freq: 'annual', months: [10], rule: 'aoc4', dueRuleLabel: 'Within 30 days of AGM (AGM ≤ 6 months of FY end)', penalty: '₹10,000 + ₹100/day continuing, cap ₹2,00,000 (company) / ₹50,000 (officer)', penaltyExposure: 20000, source: 'mca.gov.in — Sec 137, Sec 92 read with Rule 12Companies (Accounts) Rules' },
  { law: 'ROC', form: 'MGT-7', title: 'Annual return', freq: 'annual', months: [11], rule: 'mgt7', dueRuleLabel: 'Within 60 days of AGM', penalty: '₹10,000 + ₹100/day continuing, cap ₹2,00,000 (company) / ₹50,000 (officer)', penaltyExposure: 20000, source: 'mca.gov.in — Sec 92, Rule 11 Companies (Management and Administration) Rules' },
  { law: 'ROC', form: 'DIR-3 KYC', title: 'Director KYC (each director with DIN)', freq: 'annual', months: [9], rule: 'dir3', dueRuleLabel: '30 September', penalty: '₹5,000 per director; DIN deactivated until filed', penaltyExposure: 10000, source: 'mca.gov.in — Rule 12A Companies (Appointment and Qualification of Directors) Rules' },
  { law: 'ROC', form: 'DPT-3', title: 'Return of deposits / loans particulars', freq: 'annual', months: [6], rule: 'dpt3', dueRuleLabel: '30 June', penalty: 'Officer: ₹50k–₹5L; company continuing default ₹500/day', penaltyExposure: 10000, source: 'mca.gov.in — Rule 16A Companies (Acceptance of Deposits) Rules' },
  { law: 'ROC', form: 'MSME-1', title: 'Outstanding MSME payments half-year return', freq: 'quarterly', months: [4, 10], rule: 'msme1', dueRuleLabel: '30 Apr (Oct–Mar) / 31 Oct (Apr–Sep)', penalty: 'Fine ₹20,000–₹25,000 on officers', penaltyExposure: 25000, source: 'mca.gov.in — Notification S.O. 1686(E) 2019' },
  { law: 'ROC', form: 'ADT-1', title: 'Auditor appointment intimation', freq: 'annual', months: [10], rule: 'adt1', dueRuleLabel: 'Within 15 days of AGM', penalty: '₹50,000 company + officer ₹500/day continuing', penaltyExposure: 10000, source: 'mca.gov.in — Sec 139(1)' },
  { law: 'ROC', form: 'Board Meetings', title: 'First board meeting + min 4 per year (gap ≤ 120 days)', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'boardMtg', dueRuleLabel: 'Quarterly + 7 days notice', penalty: 'Company ₹1L, officer ₹25k (Sec 173)', penaltyExposure: 5000, source: 'mca.gov.in — Sec 173, SS-1' },

  // ── Labour (Karnataka) ──
  { law: 'Labour', form: 'PF ECR', title: 'EPF contribution + ECR', freq: 'monthly', months: FY_MONTHS, rule: 'pf', dueRuleLabel: '15th of next month', penalty: 'Damages Sec 14B: 5%–25% p.a. by delay slab + interest 12% p.a.', penaltyExposure: 5000, source: 'epfindia.gov.in — EPF Scheme para 38; Sec 14B' },
  { law: 'Labour', form: 'ESI Contribution', title: 'ESIC payment', freq: 'monthly', months: FY_MONTHS, rule: 'esi', dueRuleLabel: '15th of next month', penalty: 'Damages Sec 85B: 5%–25% p.a. by delay slab', penaltyExposure: 5000, source: 'esic.gov.in — ESI Act Sec 40, Reg 31; Sec 85B' },
  { law: 'Labour', form: 'PT-5 (Karnataka)', title: 'Professional tax remittance + PT-5', freq: 'monthly', months: FY_MONTHS, rule: 'pt', dueRuleLabel: '20th of next month (Karnatakaregistered employers)', penalty: 'Penalty + 1.25%–2% p.m. interest; ₹200–₹2,000 fine', penaltyExposure: 2000, source: 'karnataka.gov.in CTD — KPT Act 1976, Rule 24' },
  { law: 'Labour', form: 'LWF (Karnataka)', title: 'Labour Welfare Fund contribution (Dec)', freq: 'annual', months: [12], rule: 'lwf', dueRuleLabel: 'By 15 January (Dec deduction)', penalty: 'Fine ₹500–₹5,000 + interest', penaltyExposure: 5000, source: 'klwb.karnataka.gov.in — KLWF Act 1965; Karnataka LWF Rules' },
  { law: 'Labour', form: 'POSH Annual Report', title: 'Annual report to District Officer', freq: 'annual', months: [1], rule: 'posh', dueRuleLabel: 'By 31 January for calendar year', penalty: '₹50,000 fine for non-compliance (Sec 21/22)', penaltyExposure: 50000, source: 'wcd.gov.in — POSH Act 2013 Sec 21, Rules 13/14' },

  // ── Corporate / other statutory ──
  { law: 'Corporate', form: 'Board Report', title: 'Directors report + management reply', freq: 'annual', months: [8], rule: 'boardReport', dueRuleLabel: 'Attached to AOC-4 (before AGM)', penalty: 'Officer ₹50k–₹3L (Sec 134)', penaltyExposure: 50000, source: 'mca.gov.in — Sec 134' },
  { law: 'Other', form: 'Trade Licence Renewal', title: 'BBMP trade licence renewal', freq: 'annual', months: [3], rule: 'tradeLicence', dueRuleLabel: 'Renew before 31 March', penalty: 'Double fee + prosecution on continued default', penaltyExposure: 10000, source: 'bbmp.gov.in — KMC Act 1976 Sec 250' },
  { law: 'Other', form: 'Shops & Est. Renewal', title: 'Karnataka Shops & Commercial Establishments registration renewal', freq: 'annual', months: [3], rule: 'shopsRenewal', dueRuleLabel: 'Before 31 March (as per registration expiry)', penalty: 'Fine ₹5,000–₹50,000 by slab', penaltyExposure: 10000, source: 'labour.karnataka.gov.in — S&E Act 1961 (Karnataka Act 34 of 1961)' },
  { law: 'Other', form: 'Insurance Renewals', title: 'Fire/office/vehicle policy renewals check', freq: 'annual', months: [4], rule: 'insurance', dueRuleLabel: 'Policy-specific — verify every April', penalty: 'Uninsured exposure risk', penaltyExposure: 0, source: 'Policy schedules — verify each FY' },
];

export interface GeneratedInstance {
  law: LawArea;
  form: string;
  title: string;
  period: string;
  fy: string;
  due_date: string; // ISO yyyy-mm-dd
  status: string;
  penalty_exposure: number;
  source_url: string;
  notes: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Due date per rule key — FY window Apr 1 (fyStartY) → Mar 31 (fyStartY+1). */
function dueDateFor(rule: string, fyStartY: number, month: number): { y: number; m: number; d: number } {
  const nextMonthY = month === 12 ? fyStartY + 1 : fyStartY;
  const nextMonth = month === 12 ? 1 : month + 1;
  const thisY = month >= 4 ? fyStartY : fyStartY + 1;
  switch (rule) {
    case 'gstr1': return { y: nextMonthY, m: nextMonth, d: 11 };
    case 'gstr3b': return { y: nextMonthY, m: nextMonth, d: 20 };
    case 'gst9': return { y: fyStartY + 1, m: 12, d: 31 };
    case 'tdsPay': return month === 3 ? { y: fyStartY + 1, m: 4, d: 30 } : { y: nextMonthY, m: nextMonth, d: 7 };
    case 'tdsRet': return month === 3 ? { y: fyStartY + 1, m: 5, d: 31 } : month === 6 ? { y: fyStartY, m: 7, d: 31 } : month === 9 ? { y: fyStartY, m: 10, d: 31 } : { y: fyStartY, m: 12, d: 31 };
    case 'advTax': return month === 3 ? { y: fyStartY + 1, m: 3, d: 15 } : { y: fyStartY, m: month, d: 15 };
    case 'itr': return { y: fyStartY + 1, m: 10, d: 31 };
    case 'taxAudit': return { y: fyStartY + 1, m: 9, d: 30 };
    case 'aoc4': return { y: fyStartY + 1, m: 10, d: 30 };
    case 'mgt7': return { y: fyStartY + 1, m: 11, d: 29 };
    case 'dir3': return { y: fyStartY + 1, m: 9, d: 30 };
    case 'dpt3': return { y: fyStartY + 1, m: 6, d: 30 };
    case 'msme1': return month === 4 ? { y: fyStartY + 1, m: 4, d: 30 } : { y: fyStartY, m: 10, d: 31 };
    case 'adt1': return { y: fyStartY + 1, m: 10, d: 15 };
    case 'boardMtg': return { y: month >= 4 ? fyStartY : fyStartY + 1, m: month, d: 30 };
    case 'pf': return { y: nextMonthY, m: nextMonth, d: 15 };
    case 'esi': return { y: nextMonthY, m: nextMonth, d: 15 };
    case 'pt': return { y: nextMonthY, m: nextMonth, d: 20 };
    case 'lwf': return { y: fyStartY + 1, m: 1, d: 15 };
    case 'posh': return { y: fyStartY + 1, m: 1, d: 31 };
    case 'boardReport': return { y: fyStartY + 1, m: 8, d: 30 };
    case 'tradeLicence': return { y: fyStartY + 1, m: 3, d: 31 };
    case 'shopsRenewal': return { y: fyStartY + 1, m: 3, d: 31 };
    case 'insurance': return { y: fyStartY + 1, m: 4, d: 30 };
    default: return { y: nextMonthY, m: nextMonth, d: 15 };
  }
}

const periodLabel = (rule: string, y: number, m: number) => {
  if (rule === 'gst9' || rule === 'itr' || rule === 'taxAudit' || rule === 'aoc4' || rule === 'mgt7' || rule === 'dir3' || rule === 'dpt3' || rule === 'adt1' || rule === 'boardReport' || rule === 'lwf' || rule === 'posh' || rule === 'tradeLicence' || rule === 'shopsRenewal' || rule === 'insurance') {
    return 'FY end';
  }
  if (rule === 'tdsRet' || rule === 'advTax' || rule === 'msme1' || rule === 'boardMtg') {
    return m === 3 ? 'Q4' : m === 6 ? 'Q1' : m === 9 ? 'Q2' : 'Q3';
  }
  return y >= 4 ? `${pad(y)}` : `${pad(y)}`; // placeholder replaced below with year
};

/** Expand the rules master into concrete instances for one FY (Apr–Mar). */
export function generateComplianceCalendar(fyStartYear: number): GeneratedInstance[] {
  const fy = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
  const items: GeneratedInstance[] = [];
  for (const rule of COMPLIANCE_RULES) {
    const months = rule.months ?? [4];
    for (const m of months) {
      const due = dueDateFor(rule.rule, fyStartYear, m);
      // Monthly payroll/GST items for March land in the next FY window — keep them.
      const period =
        rule.rule === 'tdsRet' || rule.rule === 'advTax' || rule.rule === 'msme1' || rule.rule === 'boardMtg'
          ? `Q${m === 6 ? 1 : m === 9 ? 2 : m === 12 ? 3 : 4} ${fy}`
          : `${pad(m)}-${m >= 4 ? fyStartYear : fyStartYear + 1}`;
      items.push({
        law: rule.law,
        form: rule.form,
        title: rule.title,
        period,
        fy,
        due_date: iso(due.y, due.m, due.d),
        status: 'pending',
        penalty_exposure: rule.penaltyExposure,
        source_url: rule.source,
        notes: rule.dueRuleLabel,
      });
    }
  }
  items.sort((a, b) => a.due_date.localeCompare(b.due_date));
  return items;
}

export const CURRENT_FY = 'FY 2026-27';
export const CURRENT_FY_START_YEAR = 2026;

export function daysUntil(dueIso: string): number {
  const due = new Date(dueIso + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
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

/** .ics (iCalendar) blob so reminders export to Google Calendar / Outlook. */
export function complianceToIcs(items: GeneratedInstance[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VJR Estate//LEDGERS Compliance//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const it of items) {
    const dt = it.due_date.replace(/-/g, '');
    const remind = it.due_date ? new Date(new Date(it.due_date + 'T00:00:00').getTime() - 7 * 86_400_000) : null;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:ledger-${(it.form + it.period).replace(/\W/g, '')}-${dt}@vjrestate.in`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dt}`,
      `SUMMARY:[${it.law}] ${it.form} — ${it.title}`,
      `DESCRIPTION:Due ${it.due_date}. ${it.notes}. Penalty exposure: ₹${it.penalty_exposure}. Source: ${it.source_url}. Confirm with your CA/CS.`,
      `BEGIN:VALARM`,
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:7 days to ${it.form} (${it.period})`,
      'END:VALARM',
      'END:VEVENT',
    );
    void remind;
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
