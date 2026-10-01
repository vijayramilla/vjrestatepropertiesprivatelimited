/**
 * LEDGERS — India statutory compliance rules engine (entity-aware).
 *
 * Entity types supported: Private Limited, OPC, LLP, Partnership,
 * Proprietorship. Rules auto-filter by entity + held registrations
 * (GST/PF/ESI/PT/TDS…), and the calendar generates from the company's
 * incorporation date — a company incorporated in Nov 2026 gets its first
 * filings from Nov, not April.
 *
 * Due dates verified Oct 2026: gst.gov.in, incometaxindia.gov.in, mca.gov.in,
 * epfindia.gov.in, esic.gov.in, Karnataka CTD/Labour. Authorities extend
 * dates by circular — every rule carries "confirm with CA/CS".
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

export interface ComplianceRule {
  law: LawArea;
  form: string;
  title: string;
  freq: 'monthly' | 'quarterly' | 'annual' | 'half-yearly' | 'once';
  /** Calendar months the obligation's period covers (inside Apr–Mar FY). */
  months?: number[];
  rule: string;
  dueRuleLabel: string;
  penalty: string;
  penaltyExposure: number;
  source: string;
  /** When the due-date rule was last verified against the source. */
  lastVerified: string;
  /** Entity applicability — empty = all entities. */
  entities?: EntityType[];
  /** Required registrations (ALL must be held). Empty = always applies. */
  requires?: string[];
  /** Optional extra note shown in UI. */
  note?: string;
}

const FY_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export const COMPLIANCE_RULES: ComplianceRule[] = [
  /* ── GST ── */
  { law: 'GST', form: 'GSTR-1', title: 'Outward supplies statement', freq: 'monthly', months: FY_MONTHS, rule: 'gstr1', dueRuleLabel: '11th monthly / 13th quarterly (QRMP)', penalty: '₹50/day (₹20 nil); non-filing blocks buyer ITC', penaltyExposure: 5000, source: 'gst.gov.in — CGST Rules 59, Notif. 83/2020', lastVerified: '2026-10-01', requires: ['gst'] },
  { law: 'GST', form: 'GSTR-3B', title: 'Summary return + tax payment', freq: 'monthly', months: FY_MONTHS, rule: 'gstr3b', dueRuleLabel: '20th monthly / 22nd-24th QRMP', penalty: '₹50/day late fee + 18% p.a. interest', penaltyExposure: 5000, source: 'gst.gov.in — CGST Rules 61', lastVerified: '2026-10-01', requires: ['gst'] },
  { law: 'GST', form: 'CMP-08', title: 'Composition scheme statement-cum-challan', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'cmp08', dueRuleLabel: '18th of month after quarter', penalty: '₹200/day (₹50 nil), cap ₹5,000', penaltyExposure: 5000, source: 'gst.gov.in — Rule 32(11), Sec 10 CGST Act', lastVerified: '2026-10-01', requires: ['gst_composition'] },
  { law: 'GST', form: 'GSTR-9/9C', title: 'Annual return + reconciliation (if audit)', freq: 'annual', months: [3], rule: 'gst9', dueRuleLabel: '31 December after FY end', penalty: '₹100/day each Act, cap 0.25% turnover', penaltyExposure: 20000, source: 'gst.gov.in — Sec 44 CGST Act', lastVerified: '2026-10-01', requires: ['gst'] },
  { law: 'GST', form: 'ITC-04', title: 'Job work goods challan details', freq: 'half-yearly', months: [3, 9], rule: 'itc04', dueRuleLabel: '25 Apr (Oct–Mar) / 25 Oct (Apr–Sep)', penalty: '₹50/day, cap ₹20,000', penaltyExposure: 20000, source: 'gst.gov.in — Rule 45(3)', lastVerified: '2026-10-01', requires: ['gst'], note: 'Only if goods move to job workers' },
  { law: 'GST', form: 'E-invoice / E-way readiness', title: 'E-invoicing registration check (₹5cr+ aggregate turnover)', freq: 'annual', months: [4], rule: 'einvoice', dueRuleLabel: 'Verify status each April', penalty: 'Invoice invalid → ITC denial to buyer + penalty', penaltyExposure: 50000, source: 'gst.gov.in — Notif. 10/2020, 61/2024', lastVerified: '2026-10-01', requires: ['gst'] },

  /* ── Income Tax ── */
  { law: 'Income Tax', form: 'TDS Payment', title: 'TDS/TCS deposit (ITNS-281)', freq: 'monthly', months: FY_MONTHS, rule: 'tdsPay', dueRuleLabel: '7th next month; March → 30 April', penalty: '1.5%/month interest + Sec 271C penalty', penaltyExposure: 10000, source: 'incometax.gov.in — Sec 200', lastVerified: '2026-10-01', requires: ['tds'] },
  { law: 'Income Tax', form: '24Q / 26Q', title: 'TDS quarterly returns', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'tdsRet', dueRuleLabel: '31 Jul / 31 Oct / 31 Jan / 31 May', penalty: '₹200/day u/s 234E + ₹10k–₹1L u/s 271H', penaltyExposure: 15000, source: 'incometax.gov.in — Sec 200(3)', lastVerified: '2026-10-01', requires: ['tds'] },
  { law: 'Income Tax', form: 'Advance Tax', title: 'Advance tax instalment', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'advTax', dueRuleLabel: '15% / 45% / 75% / 100% by 15 Jun/Sep/Dec/15 Mar', penalty: '234B/234C interest on shortfall', penaltyExposure: 0, source: 'incometaxindia.gov.in — Sec 207–211', lastVerified: '2026-10-01' },
  { law: 'Income Tax', form: 'ITR-6', title: 'Income tax return (companies)', freq: 'annual', months: [10], rule: 'itr', dueRuleLabel: '31 Oct (audit) / 31 Jul (no audit)', penalty: '234F fee ₹5k–₹10k', penaltyExposure: 10000, source: 'incometax.gov.in — Sec 139', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'Income Tax', form: 'ITR-5', title: 'Income tax return (LLP / firm)', freq: 'annual', months: [10], rule: 'itr5', dueRuleLabel: '31 Oct (audit) / 31 Jul (no audit)', penalty: '234F fee ₹5k–₹10k', penaltyExposure: 10000, source: 'incometax.gov.in — Sec 139', lastVerified: '2026-10-01', entities: ['llp', 'partnership'] },
  { law: 'Income Tax', form: 'ITR-3/4', title: 'Proprietor income tax return', freq: 'annual', months: [7], rule: 'itrProp', dueRuleLabel: '31 Jul (audit: 31 Oct)', penalty: '234F fee ₹1k–₹5k', penaltyExposure: 5000, source: 'incometax.gov.in — Sec 139', lastVerified: '2026-10-01', entities: ['proprietorship'] },
  { law: 'Income Tax', form: '3CA/3CB-3CD', title: 'Tax audit report (turnover > ₹1cr / ₹10cr digital)', freq: 'annual', months: [9], rule: 'taxAudit', dueRuleLabel: '30 September', penalty: 'Best-judgment assessment risk', penaltyExposure: 25000, source: 'incometaxindia.gov.in — Sec 44AB', lastVerified: '2026-10-01' },

  /* ── ROC: companies (Pvt Ltd / OPC) ── */
  { law: 'ROC', form: 'First Board Meeting', title: 'First board meeting of the company', freq: 'once', months: [4], rule: 'firstBoard', dueRuleLabel: 'Within 30 days of incorporation', penalty: '₹1L company / ₹25k officer (Sec 173)', penaltyExposure: 5000, source: 'mca.gov.in — Sec 173(1)', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'One-time — anchored to incorporation date' },
  { law: 'ROC', form: 'First Auditor + ADT-1', title: 'First statutory auditor appointment (15 months) + ADT-1 filing', freq: 'once', months: [4], rule: 'firstAuditor', dueRuleLabel: 'Board appoints within 30 days; ADT-1 within 15 days of appointment (first term up to 5 AGMs)', penalty: 'Company ₹50k + officer ₹500/day', penaltyExposure: 10000, source: 'mca.gov.in — Sec 139(6), 139(1)', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'One-time for the first auditor' },
  { law: 'ROC', form: 'AOC-4', title: 'Financial statements filing', freq: 'annual', months: [10], rule: 'aoc4', dueRuleLabel: 'Within 30 days of AGM', penalty: '₹10k + ₹100/day, cap ₹2L (co) / ₹50k (officer)', penaltyExposure: 20000, source: 'mca.gov.in — Sec 137', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'MGT-7', title: 'Annual return', freq: 'annual', months: [11], rule: 'mgt7', dueRuleLabel: 'Within 60 days of AGM', penalty: '₹10k + ₹100/day, cap ₹2L (co) / ₹50k (officer)', penaltyExposure: 20000, source: 'mca.gov.in — Sec 92', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'DIR-3 KYC', title: 'Director KYC (every DIN holder)', freq: 'annual', months: [9], rule: 'dir3', dueRuleLabel: '30 September', penalty: '₹5,000/director; DIN deactivation', penaltyExposure: 10000, source: 'mca.gov.in — Rule 12A', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'DPT-3', title: 'Return of deposits & loans', freq: 'annual', months: [6], rule: 'dpt3', dueRuleLabel: '30 June', penalty: 'Officer ₹50k–₹5L', penaltyExposure: 10000, source: 'mca.gov.in — Rule 16A', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'MSME-1', title: 'Outstanding MSME payments return', freq: 'half-yearly', months: [4, 10], rule: 'msme1', dueRuleLabel: '30 Apr / 31 Oct', penalty: '₹20k–₹25k on officers', penaltyExposure: 25000, source: 'mca.gov.in — S.O. 1686(E) 2019', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'Only if buying from registered MSMEs' },
  { law: 'ROC', form: 'ADT-1', title: 'Auditor appointment', freq: 'annual', months: [10], rule: 'adt1', dueRuleLabel: 'Within 15 days of AGM', penalty: '₹50k company + ₹500/day officer', penaltyExposure: 10000, source: 'mca.gov.in — Sec 139', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'Board Meetings', title: 'Board meetings (4/yr, ≤120d gap; OPC 1/yr)', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'boardMtg', dueRuleLabel: 'Quarterly + 7 days notice', penalty: '₹1L company / ₹25k officer', penaltyExposure: 5000, source: 'mca.gov.in — Sec 173', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'OPC: at least one meeting each half-year, gap < 90 days' },
  { law: 'ROC', form: 'INC-20A', title: 'Commencement of business declaration', freq: 'once', months: [4], rule: 'inc20a', dueRuleLabel: 'Within 180 days of incorporation (once)', penalty: '₹50k company / ₹1L officers; company can be struck off', penaltyExposure: 50000, source: 'mca.gov.in — Sec 10A', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'One-time — skip if already filed' },
  { law: 'ROC', form: 'AGM', title: 'Annual General Meeting', freq: 'annual', months: [9], rule: 'agm', dueRuleLabel: 'Within 6 months of FY end (by 30 Sep)', penalty: '₹1L company + ₹100/day continuing, cap ₹5L', penaltyExposure: 30000, source: 'mca.gov.in — Sec 96', lastVerified: '2026-10-01', entities: ['pvtltd'], note: 'OPC & LLP exempt' },
  { law: 'ROC', form: 'PAS-6', title: 'Allotment of shares return', freq: 'annual', months: [6], rule: 'pas6', dueRuleLabel: 'Within 30 days of each allotment (yrly check 30 Jun)', penalty: '₹50k–₹5L officers', penaltyExposure: 10000, source: 'mca.gov.in — Sec 56(4)', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'Only if shares allotted during the year' },
  { law: 'ROC', form: 'MBP-1 / DIR-8', title: 'Director interest & disqualification disclosures', freq: 'annual', months: [4], rule: 'mbp1', dueRuleLabel: 'First board meeting of FY', penalty: '₹25k–₹1L officer', penaltyExposure: 5000, source: 'mca.gov.in — Sec 184(2), 164(2)', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'Statutory Registers', title: 'Registers of members/directors/charges update', freq: 'annual', months: [4], rule: 'statRegisters', dueRuleLabel: 'Verify each April', penalty: 'Officer ₹50k–₹3L', penaltyExposure: 5000, source: 'mca.gov.in — Sec 88, 170', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },

  /* ── LLP ── */
  { law: 'LLP', form: 'LLP Form 8', title: 'Statement of account & solvency', freq: 'annual', months: [10], rule: 'llp8', dueRuleLabel: 'Within 30 days of 6 months from FY end (30 Oct)', penalty: '₹100/day, no cap', penaltyExposure: 15000, source: 'mca.gov.in — Rule 24 LLP Rules 2009', lastVerified: '2026-10-01', entities: ['llp'] },
  { law: 'LLP', form: 'LLP Form 11', title: 'Annual return', freq: 'annual', months: [5], rule: 'llp11', dueRuleLabel: 'Within 60 days of FY end (30 May)', penalty: '₹25/day, no cap', penaltyExposure: 10000, source: 'mca.gov.in — Rule 25 LLP Rules 2009', lastVerified: '2026-10-01', entities: ['llp'] },
  { law: 'LLP', form: 'DIR-3 KYC', title: 'Designated partner KYC', freq: 'annual', months: [9], rule: 'dir3', dueRuleLabel: '30 September', penalty: '₹5,000/partner; DPIN deactivation', penaltyExposure: 10000, source: 'mca.gov.in — Rule 12A', lastVerified: '2026-10-01', entities: ['llp'] },

  /* ── Labour ── */
  { law: 'Labour', form: 'PF ECR', title: 'EPF contribution + ECR', freq: 'monthly', months: FY_MONTHS, rule: 'pf', dueRuleLabel: '15th of next month', penalty: '14B damages 5%–25% p.a. + 12% interest', penaltyExposure: 5000, source: 'epfindia.gov.in — Para 38, Sec 14B', lastVerified: '2026-10-01', requires: ['pf'] },
  { law: 'Labour', form: 'ESI Contribution', title: 'ESIC payment', freq: 'monthly', months: FY_MONTHS, rule: 'esi', dueRuleLabel: '15th of next month', penalty: '85B damages 5%–25% p.a.', penaltyExposure: 5000, source: 'esic.gov.in — Reg 31, Sec 85B', lastVerified: '2026-10-01', requires: ['esi'] },
  { law: 'Labour', form: 'PTEC ₹2,500 (company)', title: 'Professional tax on company — PTEC annual payment', freq: 'annual', months: [6], rule: 'ptec', dueRuleLabel: '₹2,500/year, payable by 30 June for the FY (Karnataka)', penalty: 'Interest + penalty per KPT Act; PT clearance needed for licences/renewals', penaltyExposure: 5000, source: 'ptax.karnataka.gov.in — KPT Act 1976 Sec 4/6 (PTEC enrolment)', lastVerified: '2026-10-01', requires: ['ptec'] },
  { law: 'Labour', form: 'PTRC (employees)', title: 'Professional tax deducted from employee salaries', freq: 'monthly', months: FY_MONTHS, rule: 'pt', dueRuleLabel: '20th of next month (Karnataka registered employers)', penalty: 'Penalty + 1.25%–2% p.m. interest; ₹200–₹2,000 fine', penaltyExposure: 2000, source: 'karnataka CTD — KPT Act 1976 Rule 24', lastVerified: '2026-10-01', requires: ['pt'] },
  { law: 'GST', form: 'GST Registration Watch', title: 'Turnover watch — register for GST when aggregate turnover crosses ₹20 lakh', freq: 'annual', months: [4, 10], rule: 'gstWatch', dueRuleLabel: 'Services threshold: ₹20L aggregate turnover (Karnataka); registration within 30 days of crossing', penalty: 'Tax + interest + penalty on unregistered supplies past threshold', penaltyExposure: 50000, source: 'gst.gov.in — Sec 22 CGST Act; Notif. 10/2017-CTR', lastVerified: '2026-10-01', requires: [], note: 'Below ₹20L: NO GST registration or returns needed — this item only tracks the threshold' },

  /* ── Karnataka real-estate industry (VJR Estate profile) ── */
  { law: 'Labour', form: 'POSH Annual Report', title: 'Annual report to District Officer', freq: 'annual', months: [1], rule: 'posh', dueRuleLabel: 'By 31 January', penalty: '₹50,000 (Sec 21/22)', penaltyExposure: 50000, source: 'wcd.gov.in — POSH Act 2013', lastVerified: '2026-10-01', requires: [], note: 'Applies at 10+ employees — uncheck if smaller' },
  { law: 'Labour', form: 'Gratuity / Bonus review', title: 'Payment of Gratuity & Bonus Act checks', freq: 'annual', months: [3], rule: 'gratuity', dueRuleLabel: 'FY-end review by 31 March', penalty: 'Interest + imprisonment provisions', penaltyExposure: 10000, source: 'labour.gov.in — PG Act 1972 Sec 7', lastVerified: '2026-10-01', requires: ['pf'] },
  { law: 'Labour', form: 'Half-yearly Return (S&E)', title: 'Karnataka S&E half-yearly return', freq: 'half-yearly', months: [1, 7], rule: 'seReturn', dueRuleLabel: 'End of Jan (Jul–Dec) / Jul (Jan–Jun)', penalty: '₹5,000–₹50,000', penaltyExposure: 10000, source: 'labour.karnataka.gov.in — S&E Act 1961 Rule 9', lastVerified: '2026-10-01', requires: ['shops'] },

  /* ── Corporate governance / other ── */
  { law: 'Corporate', form: "Board's Report", title: "Directors' report", freq: 'annual', months: [8], rule: 'boardReport', dueRuleLabel: 'Attached to AOC-4, pre-AGM', penalty: 'Officer ₹50k–₹3L', penaltyExposure: 50000, source: 'mca.gov.in — Sec 134', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'Corporate', form: 'FLA Return', title: 'Annual return on Foreign Liabilities & Assets', freq: 'annual', months: [7], rule: 'fla', dueRuleLabel: 'By 15 July', penalty: 'RBI compounding; ₹10k–3x investment', penaltyExposure: 50000, source: 'rbi.org.in — FEMA 20(R)', lastVerified: '2026-10-01', requires: ['fdi'] },
  { law: 'Corporate', form: 'FC-GPR / FC-TRS', title: 'Foreign investment reporting (30/60 days)', freq: 'annual', months: [4], rule: 'fcgpr', dueRuleLabel: '30d of allotment / 60d of transfer — verify Apr', penalty: 'RBI compounding ₹10k–₹3L+', penaltyExposure: 50000, source: 'rbi.org.in — FEMA 20(R)', lastVerified: '2026-10-01', requires: ['fdi'], note: 'Event-based — verify annually' },
  { law: 'Licences', form: 'Trade Licence Renewal', title: 'BBMP trade licence renewal', freq: 'annual', months: [3], rule: 'tradeLicence', dueRuleLabel: 'Before 31 March', penalty: 'Double fee + prosecution', penaltyExposure: 10000, source: 'bbmp.gov.in — KMC Act 1976 Sec 250', lastVerified: '2026-10-01', requires: ['trade_licence'] },
  { law: 'Licences', form: 'S&E Registration Renewal', title: 'Shops & Establishment renewal', freq: 'annual', months: [3], rule: 'shopsRenewal', dueRuleLabel: 'Before 31 March', penalty: '₹5,000–₹50,000', penaltyExposure: 10000, source: 'labour.karnataka.gov.in — S&E Act 1961', lastVerified: '2026-10-01', requires: ['shops'] },
  { law: 'Licences', form: 'FSSAI Renewal', title: 'FSSAI licence return/renewal', freq: 'annual', months: [3], rule: 'fssai', dueRuleLabel: 'Renew before 31 March (as per licence)', penalty: '₹5L fine + imprisonment for continued trade', penaltyExposure: 50000, source: 'fssai.gov.in — FSS Act 2006', lastVerified: '2026-10-01', requires: ['fssai'] },
  { law: 'Licences', form: 'IEC Update', title: 'IEC annual update (Apr–Jun)', freq: 'annual', months: [6], rule: 'iecUpdate', dueRuleLabel: 'Apr–Jun window', penalty: 'IEC deactivated if not updated', penaltyExposure: 10000, source: 'dgft.gov.in — FTP para 2.07', lastVerified: '2026-10-01', requires: ['ie_code'] },
  { law: 'Licences', form: 'Trademark Renewal', title: 'TM renewal (every 10 yrs) / renewal notice check', freq: 'annual', months: [4], rule: 'tmRenewal', dueRuleLabel: 'Verify each April', penalty: 'Mark removed from register', penaltyExposure: 25000, source: 'ipindia.gov.in — TM Act 1999 Sec 25', lastVerified: '2026-10-01', requires: ['trademark'] },
  { law: 'Other', form: 'Insurance Renewals', title: 'Fire/office/vehicle/D&O policy renewals', freq: 'annual', months: [4], rule: 'insurance', dueRuleLabel: 'Verify every April', penalty: 'Uninsured exposure', penaltyExposure: 0, source: 'Policy schedules', lastVerified: '2026-10-01' },

  /* ── Karnataka real-estate industry (VJR Estate profile) ── */
  { law: 'Licences', form: 'Property Tax (BBMP)', title: 'Municipal property tax on owned premises', freq: 'annual', months: [4], rule: 'propertyTax', dueRuleLabel: 'BBMP blocks: pay by 30 April for early-payment rebate', penalty: 'Interest 2% p.m. on arrears', penaltyExposure: 15000, source: 'bbmptax.karnataka.gov.in — KMC Act 1976 Sec 108-110', lastVerified: '2026-10-01', note: 'Only if the company owns premises (not for rented offices)' },
  { law: 'Licences', form: 'Lease / Rent Agreement Renewals', title: 'Office & warehouse lease renewals / stamp duty', freq: 'annual', months: [4], rule: 'leaseRenewal', dueRuleLabel: 'Track expiry; register leases > 1 yr (Registration Act) with stamp duty', penalty: 'Unregistered lease inadmissible; penalty up to 18x duty', penaltyExposure: 25000, source: 'kaverionline.karnataka.gov.in — Registration Act 1908, Karnataka Stamp Act 1957', lastVerified: '2026-10-01', note: 'Set each lease\u2019s actual expiry as due date' },
  { law: 'Licences', form: 'RERA Quarterly Update', title: 'KRERA agent quarterly compliance self-check', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'reraUpdate', dueRuleLabel: 'Agent details/ads compliant; quarterly self-check by quarter end', penalty: 'KRERA penalty up to ₹1L for agent defaults', penaltyExposure: 20000, source: 'rera.karnataka.gov.in — Sec 9/62 RERA Act 2016', lastVerified: '2026-10-01', requires: ['rera_agent'] },
  { law: 'Licences', form: 'RERA Agent Renewal (Form ABC)', title: 'Karnataka RERA agent registration renewal', freq: 'annual', months: [4], rule: 'reraRenewal', dueRuleLabel: 'Certificate valid 5 years — renew ≥ 60–90 days before expiry; verify each April', penalty: 'Unregistered brokerage is an offence — penalties + barred from RERA projects', penaltyExposure: 100000, source: 'rera.karnataka.gov.in — Sec 9/62 RERA Act 2016, KRERA Form ABC', lastVerified: '2026-10-01', requires: ['rera_agent'], note: 'Set the true expiry date on the generated item' },
  { law: 'Corporate', form: 'TDS 194I (office rent)', title: 'TDS on office/shop rent @10%', freq: 'monthly', months: FY_MONTHS, rule: 'tdsRent', dueRuleLabel: 'Deduct monthly if rent > ₹50,000 p.m.; deposit by 7th (30 Apr for Mar)', penalty: '1.5%/month interest + disallowance of rent expense', penaltyExposure: 10000, source: 'incometaxindia.gov.in — Sec 194I', lastVerified: '2026-10-01', requires: ['tds'], note: 'Applies if paying rent for office premises' },
  { law: 'Corporate', form: 'TDS 194H (channel commissions)', title: 'TDS on commission/brokerage paid @2%', freq: 'monthly', months: FY_MONTHS, rule: 'tdsCommission', dueRuleLabel: 'Deduct on paying commission > ₹20,000/yr per payee; deposit by 7th', penalty: '1.5%/month interest + Sec 271C penalty', penaltyExposure: 10000, source: 'incometaxindia.gov.in — Sec 194H', lastVerified: '2026-10-01', requires: ['tds'], note: 'Applies to channel partners / freelance brokers on the books' },
  { law: 'Corporate', form: 'GST on brokerage (SAC 9971)', title: 'GST output on commission income (18%)', freq: 'monthly', months: FY_MONTHS, rule: 'gstBrokerage', dueRuleLabel: 'Charge 18% GST on brokerage invoices; include in GSTR-1/3B', penalty: 'Interest 18% p.a. + late fees as per GSTR-3B', penaltyExposure: 20000, source: 'gst.gov.in — Notification 11/2017-CTR (R), SAC 9971', lastVerified: '2026-10-01', requires: ['gst'], note: 'Real-estate agency service — always 18%, no composition benefit for services > threshold' },
  { law: 'Labour', form: 'S&E Registration Renewal', title: 'Karnataka S&E establishment registration renewal', freq: 'annual', months: [1], rule: 'seRegistration', dueRuleLabel: 'Renew by end of Jan (5-year validity per 1961 Act + Rules)', penalty: '₹5,000–₹50,000 + closure risk on continued default', penaltyExposure: 25000, source: 'labour.karnataka.gov.in — Karnataka S&E Act 1961 & Rules 1962', lastVerified: '2026-10-01', requires: ['shops'], note: 'Separate from the half-yearly return — this is the certificate renewal' },
  { law: 'Corporate', form: 'DPDP data hygiene', title: 'DPDP Act 2023 — buyer/lead data handling review', freq: 'annual', months: [4], rule: 'dpdp', dueRuleLabel: 'Annual review each April (rules phased in)', penalty: 'Up to ₹250 crore for security-safeguard failures', penaltyExposure: 50000, source: 'meity.gov.in — Digital Personal Data Protection Act 2023', lastVerified: '2026-10-01', note: 'You hold buyer KYC/phone data — consent notices on forms recommended' },
];

/* ── FY helpers ─────────────────────────────────────────────────────────── */

export function fyStartYearFor(fyLabel: string): number {
  return Number(fyLabel.split(' ')[1]);
}

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

/* ── Rule filtering ─────────────────────────────────────────────────────── */

export function rulesForProfile(entityType: EntityType, registrations: string[]): ComplianceRule[] {
  return COMPLIANCE_RULES.filter((r) => {
    if (r.entities && !r.entities.includes(entityType)) return false;
    if (r.requires && !r.requires.every((reg) => registrations.includes(reg))) return false;
    return true;
  });
}

/* ── Due-date engine ────────────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/**
 * Due date for one rule in one period month.
 * `fyStartY` = the calendar year in which the FY begins (April 1 of that year).
 * `incorporatedOn` clamps the FIRST period: a company born 2026-11-20 does not
 * owe a GSTR-3B for October — the engine starts from November (its first
 * full month, with GSTR-1/3B for Nov due Dec; INC-20A/AOC timelines anchor
 * to incorporation + their own windows).
 */
function dueDateFor(rule: ComplianceRule, fyStartY: number, month: number): { y: number; m: number; d: number } {
  // "Next month" year: months 4–12 sit in calendar year fyStartY; months 1–3
  // (Jan–Mar) sit in fyStartY+1. So Dec→Jan crosses into fyStartY+1, and any
  // next-month inside Jan–Mar also belongs to fyStartY+1.
  const nextMonthY = month >= 3 ? fyStartY : fyStartY + 1;
  const nextMonth = month === 12 ? 1 : month + 1;
  switch (rule.rule) {
    // GST — next month 11th/20th
    case 'gstr1': return { y: nextMonthY, m: nextMonth, d: 11 };
    case 'gstr3b': return { y: nextMonthY, m: nextMonth, d: 20 };
    case 'cmp08': return month === 3 ? { y: fyStartY + 1, m: 4, d: 18 } : { y: nextMonthY, m: nextMonth, d: 18 };
    case 'gst9': return { y: fyStartY + 1, m: 12, d: 31 };
    case 'itc04': return month === 9 ? { y: fyStartY, m: 10, d: 25 } : { y: fyStartY + 1, m: 4, d: 25 };
    case 'einvoice': return { y: fyStartY, m: 4, d: 15 };

    // Income tax
    case 'tdsPay': return month === 3 ? { y: fyStartY + 1, m: 4, d: 30 } : { y: nextMonthY, m: nextMonth, d: 7 };
    case 'tdsRet': return month === 6 ? { y: fyStartY, m: 7, d: 31 } : month === 9 ? { y: fyStartY, m: 10, d: 31 } : month === 12 ? { y: fyStartY, m: 12, d: 31 } : { y: fyStartY + 1, m: 5, d: 31 };
    case 'advTax': return month === 3 ? { y: fyStartY + 1, m: 3, d: 15 } : { y: fyStartY, m: month, d: 15 };
    case 'itr': case 'itr5': return { y: fyStartY + 1, m: 10, d: 31 };
    case 'itrProp': return { y: fyStartY + 1, m: 7, d: 31 };
    case 'taxAudit': return { y: fyStartY + 1, m: 9, d: 30 };

    // ROC / companies
    case 'aoc4': return { y: fyStartY + 1, m: 10, d: 30 };
    case 'mgt7': return { y: fyStartY + 1, m: 11, d: 29 };
    case 'dir3': return { y: fyStartY + 1, m: 9, d: 30 };
    case 'dpt3': return { y: fyStartY + 1, m: 6, d: 30 };
    case 'msme1': return month === 4 ? { y: fyStartY + 1, m: 4, d: 30 } : { y: fyStartY, m: 10, d: 31 };
    case 'adt1': return { y: fyStartY + 1, m: 10, d: 15 };
    case 'boardMtg': return { y: month >= 4 ? fyStartY : fyStartY + 1, m: month, d: 30 };
    case 'inc20a': return { y: fyStartY, m: 4, d: 30 }; // adjusted for incorporation below
    case 'agm': return { y: fyStartY + 1, m: 9, d: 30 };
    case 'pas6': return { y: fyStartY + 1, m: 6, d: 30 };
    case 'mbp1': return { y: fyStartY, m: 4, d: 30 };
    case 'statRegisters': return { y: fyStartY, m: 4, d: 30 };

    // LLP
    case 'llp8': return { y: fyStartY + 1, m: 10, d: 30 };
    case 'llp11': return { y: fyStartY + 1, m: 5, d: 30 };

    // Labour
    case 'pf': return { y: nextMonthY, m: nextMonth, d: 15 };
    case 'esi': return { y: nextMonthY, m: nextMonth, d: 15 };
    case 'pt': return { y: nextMonthY, m: nextMonth, d: 20 };
    case 'lwf': return { y: fyStartY + 1, m: 1, d: 15 };
    case 'posh': return { y: fyStartY + 1, m: 1, d: 31 };
    case 'gratuity': return { y: fyStartY + 1, m: 3, d: 31 };
    case 'seReturn': return month === 7 ? { y: fyStartY, m: 7, d: 31 } : { y: fyStartY + 1, m: 1, d: 31 };

    // Other
    case 'boardReport': return { y: fyStartY + 1, m: 8, d: 30 };
    case 'fla': return { y: fyStartY + 1, m: 7, d: 15 };
    case 'fcgpr': return { y: fyStartY, m: 4, d: 30 };
    case 'tradeLicence': return { y: fyStartY + 1, m: 3, d: 31 };
    case 'shopsRenewal': return { y: fyStartY + 1, m: 3, d: 31 };
    case 'fssai': return { y: fyStartY + 1, m: 3, d: 31 };
    case 'iecUpdate': return { y: fyStartY + 1, m: 6, d: 30 };
    case 'tmRenewal': return { y: fyStartY, m: 4, d: 30 };
    case 'insurance': return { y: fyStartY, m: 4, d: 30 };
    case 'ptec': return { y: fyStartY + 1, m: 6, d: 30 }; // 30 June of the FY's closing year
    case 'gstWatch': return month === 4 ? { y: fyStartY, m: 4, d: 15 } : { y: fyStartY, m: 10, d: 15 };
    case 'propertyTax': return { y: fyStartY, m: 4, d: 30 };
    case 'leaseRenewal': return { y: fyStartY, m: 4, d: 30 };
    case 'reraUpdate': return month === 3 ? { y: fyStartY + 1, m: 3, d: 31 } : { y: fyStartY, m: month, d: 30 };

    // Karnataka real-estate industry
    case 'reraRenewal': return { y: fyStartY, m: 4, d: 30 };
    case 'tdsRent': return month === 3 ? { y: fyStartY + 1, m: 4, d: 30 } : { y: nextMonthY, m: nextMonth, d: 7 };
    case 'tdsCommission': return month === 3 ? { y: fyStartY + 1, m: 4, d: 30 } : { y: nextMonthY, m: nextMonth, d: 7 };
    case 'gstBrokerage': return { y: nextMonthY, m: nextMonth, d: 20 };
    case 'seRegistration': return { y: fyStartY + 1, m: 1, d: 31 };
    case 'dpdp': return { y: fyStartY, m: 4, d: 30 };

    default: return { y: nextMonthY, m: nextMonth, d: 15 };
  }
}

export interface GeneratedInstance {
  law: LawArea;
  form: string;
  title: string;
  period: string;
  fy: string;
  due_date: string;
  status: string;
  filed_date?: string | null;
  penalty_exposure: number;
  source_url: string;
  notes: string;
  recurrence: string;
}

const quarterOf = (m: number) => (m === 6 ? 'Q1' : m === 9 ? 'Q2' : m === 12 ? 'Q3' : 'Q4');

/**
 * Generate the compliance calendar for one FY, filtered by entity type and
 * registrations, clamped to the incorporation date.
 *
 * `markPastFiled`: obligations with a due date already in the past (relative
 * to today) get status 'filed' with a synthetic filed date, so a fresh
 * generation reflects "cleared till today" instead of a wall of overdue
 * red. Flip any of them in the UI if something was actually missed.
 */
export function generateComplianceCalendar(opts: {
  fyStartYear: number;
  entityType: EntityType;
  registrations: string[];
  incorporatedOn?: string | null;
  gstScheme?: 'monthly' | 'qrmp';
  markPastFiled?: boolean;
}): GeneratedInstance[] {
  const { fyStartYear, entityType, registrations, incorporatedOn, markPastFiled = true } = opts;
  const fy = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
  const incDate = incorporatedOn ? new Date(incorporatedOn + 'T00:00:00') : null;
  const incYm = incDate ? `${incDate.getFullYear()}-${pad(incDate.getMonth() + 1)}` : null;
  // Local date (not toISOString) — IST must not roll back a day at midnight.
  const _now = new Date();
  const todayIso = `${_now.getFullYear()}-${pad(_now.getMonth() + 1)}-${pad(_now.getDate())}`;
  const items: GeneratedInstance[] = [];

  for (const rule of rulesForProfile(entityType, registrations)) {
    const months = rule.months ?? [4];
    for (const m of months) {
      const due = dueDateFor(rule, fyStartYear, m);
      // Period label: the month the obligation relates to.
      const isQ = rule.freq === 'quarterly' || rule.freq === 'half-yearly';
      const period =
        rule.rule === 'gst9' || ['itr', 'itr5', 'itrProp', 'taxAudit', 'aoc4', 'mgt7', 'dir3', 'dpt3', 'adt1', 'agm', 'llp8', 'llp11', 'boardReport', 'lwf', 'posh', 'gratuity', 'tradeLicence', 'shopsRenewal', 'fssai', 'fla', 'inc20a', 'mbp1', 'statRegisters', 'tmRenewal', 'insurance', 'einvoice', 'fcgpr', 'reraRenewal', 'dpdp', 'ptec', 'gstWatch'].includes(rule.rule)
          ? 'Annual'
          : ['firstBoard', 'firstAuditor', 'inc20a'].includes(rule.rule)
            ? 'One-time'
            : isQ
              ? `${quarterOf(m)} ${fy}`
              : `${pad(m)}-${m >= 4 ? fyStartYear : fyStartYear + 1}`;

      // Skip obligations whose PERIOD month predates incorporation.
      const periodYm = ['reraRenewal', 'dpdp', 'einvoice', 'inc20a', 'mbp1', 'statRegisters', 'fcgpr', 'tmRenewal', 'insurance', 'ptec', 'gstWatch', 'propertyTax', 'leaseRenewal', 'firstBoard', 'firstAuditor'].includes(rule.rule)
        ? '9999' // annual-check / one-time rules are never period-clamped
        : `${m >= 4 ? fyStartYear : fyStartYear + 1}-${pad(m)}`;
      if (incYm && periodYm < incYm) continue;
      // Skip if the due date itself predates incorporation (nothing can be due before you exist).
      if (incDate && new Date(due.y, due.m - 1, due.d) < incDate) {
        // Exception: INC-20A & AOC-4 style first-year filings anchor AFTER incorporation.
        if (!['inc20a', 'agm', 'aoc4', 'mgt7', 'llp8', 'llp11', 'gst9', 'itr', 'itr5', 'itrProp', 'firstBoard', 'firstAuditor'].includes(rule.rule)) continue;
        // First-year anchor: due date = incorporation + applicable window (approx. flags for CA).
        const anchor = new Date(incDate.getTime());
        if (rule.rule === 'inc20a') anchor.setMonth(anchor.getMonth() + 6); // 180 days ≈ 6 months
        else if (rule.rule === 'agm') anchor.setMonth(anchor.getMonth() + 9);
        else if (rule.rule === 'firstBoard') anchor.setDate(anchor.getDate() + 30); // 30 days
        else if (rule.rule === 'firstAuditor') anchor.setDate(anchor.getDate() + 45); // 30d appoint + 15d ADT-1
        else anchor.setMonth(anchor.getMonth() + 12);
        const anchorIso = iso(anchor.getFullYear(), anchor.getMonth() + 1, anchor.getDate());
        items.push({
          law: rule.law, form: rule.form, title: rule.title, period: 'First-year', fy,
          due_date: anchorIso,
          status: markPastFiled && anchorIso < todayIso ? 'filed' : 'pending',
          filed_date: markPastFiled && anchorIso < todayIso ? anchorIso : null,
          penalty_exposure: rule.penaltyExposure, source_url: rule.source,
          notes: `${rule.dueRuleLabel} — first-year date anchored to incorporation (${incorporatedOn}). CONFIRM WITH CA/CS.`,
          recurrence: rule.freq,
        });
        continue;
      }

      items.push({
        law: rule.law, form: rule.form, title: rule.title, period, fy,
        due_date: iso(due.y, due.m, due.d),
        status: markPastFiled && iso(due.y, due.m, due.d) < todayIso ? 'filed' : 'pending',
        filed_date: markPastFiled && iso(due.y, due.m, due.d) < todayIso ? iso(due.y, due.m, due.d) : null,
        penalty_exposure: rule.penaltyExposure, source_url: rule.source,
        notes: rule.dueRuleLabel + (rule.note ? ` · ${rule.note}` : ''),
        recurrence: rule.freq,
      });
    }
  }
  items.sort((a, b) => a.due_date.localeCompare(b.due_date));
  return items;
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

/** Reminder cadence (days before due) used for ICS alarms + email/WhatsApp links. */
export const REMINDER_SCHEDULE = [30, 15, 7, 3, 1];

/**
 * Build mailto / WhatsApp reminder links for one obligation and a reminder day.
 * Email/WhatsApp sending needs a server-side scheduler; these links let the
 * team fire reminders manually today and wire an API later without UI change.
 */
export function reminderLinks(item: { form: string; title: string; due_date: string }, opts: { email: string; phone: string }): { day: number; mailto: string; whatsapp: string }[] {
  return REMINDER_SCHEDULE.map((day) => {
    const body = `Reminder: ${item.form} (${item.title}) is due on ${item.due_date} — ${day} day${day > 1 ? 's' : ''} left. — VJR Estate Ledgers`;
    return {
      day,
      mailto: `mailto:${opts.email}?subject=${encodeURIComponent(`[Ledgers] ${item.form} due ${item.due_date}`)}&body=${encodeURIComponent(body)}`,
      whatsapp: `https://wa.me/${opts.phone.replace(/\D/g, '')}?text=${encodeURIComponent(body)}`,
    };
  });
}
