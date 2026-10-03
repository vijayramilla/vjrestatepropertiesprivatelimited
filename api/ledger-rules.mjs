/**
 * LEDGERS — India statutory compliance rules engine (server-side).
 *
 * Single source of truth for obligation generation, imported by all three
 * proxy environments: api/data-proxy.ts (Vercel), scripts/dev-data-proxy-core.mjs
 * and scripts/vite-crm-proxy-plugin.js (dev). The browser never runs this —
 * generation always happens behind the authenticated data-proxy.
 *
 * Ported verbatim from src/data/ledgerComplianceRules.ts (keep the two in
 * sync only for the UI-helper half: risk bands, ICS, FY labels live there).
 * Unit tests: npx tsx src/data/ledgerComplianceRules.test.ts
 *
 * Due dates verified Oct 2026: gst.gov.in, incometaxindia.gov.in, mca.gov.in,
 * epfindia.gov.in, esic.gov.in, Karnataka CTD/Labour. Authorities extend
 * dates by circular — every rule carries "confirm with CA/CS".
 */

export const RULES_VERSION = '2026-10-02';

const FY_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export const COMPLIANCE_RULES = [
  /* ── GST ── */
  { law: 'GST', form: 'GSTR-1', title: 'Outward supplies statement', freq: 'monthly', months: FY_MONTHS, rule: 'gstr1', dueRuleLabel: '11th monthly / 13th quarterly (QRMP)', penalty: '₹50/day (₹20 nil); non-filing blocks buyer ITC', penaltyExposure: 5000, source: 'gst.gov.in — CGST Rules 59, Notif. 83/2020', lastVerified: '2026-10-01', requires: ['gst'] },
  { law: 'GST', form: 'GSTR-3B', title: 'Summary return + tax payment', freq: 'monthly', months: FY_MONTHS, rule: 'gstr3b', dueRuleLabel: '20th monthly / 22nd-24th QRMP', penalty: '₹50/day late fee + 18% p.a. interest', penaltyExposure: 5000, source: 'gst.gov.in — CGST Rules 61', lastVerified: '2026-10-01', requires: ['gst'] },
  { law: 'GST', form: 'CMP-08', title: 'Composition scheme statement-cum-challan', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'cmp08', dueRuleLabel: '18th of month after quarter', penalty: '₹200/day (₹50 nil), cap ₹5,000', penaltyExposure: 5000, source: 'gst.gov.in — Rule 32(11), Sec 10 CGST Act', lastVerified: '2026-10-01', requires: ['gst'] },
  { law: 'GST', form: 'GSTR-9/9C', title: 'Annual return + reconciliation (if audit)', freq: 'annual', months: [3], rule: 'gst9', dueRuleLabel: '31 December after FY end', penalty: '₹100/day each Act, cap 0.25% turnover', penaltyExposure: 20000, source: 'gst.gov.in — Sec 44 CGST Act', lastVerified: '2026-10-01', requires: ['gst'] },
  { law: 'GST', form: 'ITC-04', title: 'Job work goods challan details', freq: 'half-yearly', months: [3, 9], rule: 'itc04', dueRuleLabel: '25 Apr (Oct–Mar) / 25 Oct (Apr–Sep)', penalty: '₹50/day, cap ₹20,000', penaltyExposure: 20000, source: 'gst.gov.in — Rule 45(3)', lastVerified: '2026-10-01', requires: ['gst'], note: 'Only if goods move to job workers' },
  { law: 'GST', form: 'E-invoice / E-way readiness', title: 'E-invoicing registration check (₹5cr+ aggregate turnover)', freq: 'annual', months: [4], rule: 'einvoice', dueRuleLabel: 'Verify status each April', penalty: 'Invoice invalid → ITC denial to buyer + penalty', penaltyExposure: 50000, source: 'gst.gov.in — Notif. 10/2020, 61/2024', lastVerified: '2026-10-01', requires: ['gst'], complianceType: 'internal_task' },

  /* ── Income Tax ── */
  { law: 'Income Tax', form: 'TDS Payment', title: 'TDS/TCS deposit (ITNS-281)', freq: 'monthly', months: FY_MONTHS, rule: 'tdsPay', dueRuleLabel: '7th next month; March → 30 April', penalty: '1.5%/month interest + Sec 271C penalty', penaltyExposure: 10000, source: 'incometax.gov.in — Sec 200', lastVerified: '2026-10-01', requires: ['tds'], complianceType: 'payment' },
  { law: 'Income Tax', form: '24Q / 26Q', title: 'TDS quarterly returns', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'tdsRet', dueRuleLabel: '31 Jul / 31 Oct / 31 Jan / 31 May', penalty: '₹200/day u/s 234E + ₹10k–₹1L u/s 271H', penaltyExposure: 15000, source: 'incometax.gov.in — Sec 200(3)', lastVerified: '2026-10-01', requires: ['tds'] },
  { law: 'Income Tax', form: 'Advance Tax', title: 'Advance tax instalment', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'advTax', dueRuleLabel: '15% / 45% / 75% / 100% by 15 Jun/Sep/Dec/15 Mar', penalty: '234B/234C interest on shortfall', penaltyExposure: 0, source: 'incometaxindia.gov.in — Sec 207–211', lastVerified: '2026-10-01', complianceType: 'payment' },
  { law: 'Income Tax', form: 'ITR-6', title: 'Income tax return (companies)', freq: 'annual', months: [10], rule: 'itr', dueRuleLabel: '31 Oct (audit) / 31 Jul (no audit)', penalty: '234F fee ₹5k–₹10k', penaltyExposure: 10000, source: 'incometax.gov.in — Sec 139', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'Income Tax', form: 'ITR-5', title: 'Income tax return (LLP / firm)', freq: 'annual', months: [10], rule: 'itr5', dueRuleLabel: '31 Oct (audit) / 31 Jul (no audit)', penalty: '234F fee ₹5k–₹10k', penaltyExposure: 10000, source: 'incometax.gov.in — Sec 139', lastVerified: '2026-10-01', entities: ['llp', 'partnership'] },
  { law: 'Income Tax', form: 'ITR-3/4', title: 'Proprietor income tax return', freq: 'annual', months: [7], rule: 'itrProp', dueRuleLabel: '31 Jul (audit: 31 Oct)', penalty: '234F fee ₹1k–₹5k', penaltyExposure: 5000, source: 'incometax.gov.in — Sec 139', lastVerified: '2026-10-01', entities: ['proprietorship'] },
  { law: 'Income Tax', form: '3CA/3CB-3CD', title: 'Tax audit report (turnover > ₹1cr / ₹10cr digital)', freq: 'annual', months: [9], rule: 'taxAudit', dueRuleLabel: '30 September', penalty: 'Best-judgment assessment risk', penaltyExposure: 25000, source: 'incometaxindia.gov.in — Sec 44AB', lastVerified: '2026-10-01' },

  /* ── ROC: companies (Pvt Ltd / OPC) ── */
  { law: 'ROC', form: 'First Board Meeting', title: 'First board meeting of the company', freq: 'once', months: [4], rule: 'firstBoard', dueRuleLabel: 'Within 30 days of incorporation', penalty: '₹1L company / ₹25k officer (Sec 173)', penaltyExposure: 5000, source: 'mca.gov.in — Sec 173(1)', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'One-time — anchored to incorporation date', complianceType: 'meeting' },
  { law: 'ROC', form: 'First Auditor + ADT-1', title: 'First statutory auditor appointment (15 months) + ADT-1 filing', freq: 'once', months: [4], rule: 'firstAuditor', dueRuleLabel: 'Board appoints within 30 days; ADT-1 within 15 days of appointment (first term up to 5 AGMs)', penalty: 'Company ₹50k + officer ₹500/day', penaltyExposure: 10000, source: 'mca.gov.in — Sec 139(6), 139(1)', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'One-time for the first auditor' },
  { law: 'ROC', form: 'AOC-4', title: 'Financial statements filing', freq: 'annual', months: [10], rule: 'aoc4', dueRuleLabel: 'Within 30 days of AGM', penalty: '₹10k + ₹100/day, cap ₹2L (co) / ₹50k (officer)', penaltyExposure: 20000, source: 'mca.gov.in — Sec 137', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'MGT-7', title: 'Annual return', freq: 'annual', months: [11], rule: 'mgt7', dueRuleLabel: 'Within 60 days of AGM', penalty: '₹10k + ₹100/day, cap ₹2L (co) / ₹50k (officer)', penaltyExposure: 20000, source: 'mca.gov.in — Sec 92', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'DIR-3 KYC', title: 'Director KYC (every DIN holder)', freq: 'annual', months: [9], rule: 'dir3', dueRuleLabel: '30 September', penalty: '₹5,000/director; DIN deactivation', penaltyExposure: 10000, source: 'mca.gov.in — Rule 12A', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'DPT-3', title: 'Return of deposits & loans', freq: 'annual', months: [6], rule: 'dpt3', dueRuleLabel: '30 June', penalty: 'Officer ₹50k–₹5L', penaltyExposure: 10000, source: 'mca.gov.in — Rule 16A', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'MSME-1', title: 'Outstanding MSME payments return', freq: 'half-yearly', months: [4, 10], rule: 'msme1', dueRuleLabel: '30 Apr / 31 Oct', penalty: '₹20k–₹25k on officers', penaltyExposure: 25000, source: 'mca.gov.in — S.O. 1686(E) 2019', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'Only if buying from registered MSMEs' },
  { law: 'ROC', form: 'ADT-1', title: 'Auditor appointment', freq: 'annual', months: [10], rule: 'adt1', dueRuleLabel: 'Within 15 days of AGM', penalty: '₹50k company + ₹500/day officer', penaltyExposure: 10000, source: 'mca.gov.in — Sec 139', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'ROC', form: 'Board Meetings', title: 'Board meetings (4/yr, ≤120d gap; OPC 1/yr)', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'boardMtg', dueRuleLabel: 'Quarterly + 7 days notice', penalty: '₹1L company / ₹25k officer', penaltyExposure: 5000, source: 'mca.gov.in — Sec 173', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'OPC: at least one meeting each half-year, gap < 90 days', complianceType: 'meeting' },
  { law: 'ROC', form: 'INC-20A', title: 'Commencement of business declaration', freq: 'once', months: [4], rule: 'inc20a', dueRuleLabel: 'Within 180 days of incorporation (once)', penalty: '₹50k company / ₹1L officers; company can be struck off', penaltyExposure: 50000, source: 'mca.gov.in — Sec 10A', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'One-time — skip if already filed' },
  { law: 'ROC', form: 'AGM', title: 'Annual General Meeting', freq: 'annual', months: [9], rule: 'agm', dueRuleLabel: 'Within 6 months of FY end (by 30 Sep)', penalty: '₹1L company + ₹100/day continuing, cap ₹5L', penaltyExposure: 30000, source: 'mca.gov.in — Sec 96', lastVerified: '2026-10-01', entities: ['pvtltd'], note: 'OPC & LLP exempt' },
  { law: 'ROC', form: 'PAS-6', title: 'Allotment of shares return', freq: 'annual', months: [6], rule: 'pas6', dueRuleLabel: 'Within 30 days of each allotment (yrly check 30 Jun)', penalty: '₹50k–₹5L officers', penaltyExposure: 10000, source: 'mca.gov.in — Sec 56(4)', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], note: 'Only if shares allotted during the year' },
  { law: 'ROC', form: 'MBP-1 / DIR-8', title: 'Director interest & disqualification disclosures', freq: 'annual', months: [4], rule: 'mbp1', dueRuleLabel: 'First board meeting of FY', penalty: '₹25k–₹1L officer', penaltyExposure: 5000, source: 'mca.gov.in — Sec 184(2), 164(2)', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], complianceType: 'internal_task' },
  { law: 'ROC', form: 'Statutory Registers', title: 'Registers of members/directors/charges update', freq: 'annual', months: [4], rule: 'statRegisters', dueRuleLabel: 'Verify each April', penalty: 'Officer ₹50k–₹3L', penaltyExposure: 5000, source: 'mca.gov.in — Sec 88, 170', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'], complianceType: 'internal_task' },

  /* ── LLP ── */
  { law: 'LLP', form: 'LLP Form 8', title: 'Statement of account & solvency', freq: 'annual', months: [10], rule: 'llp8', dueRuleLabel: 'Within 30 days of 6 months from FY end (30 Oct)', penalty: '₹100/day, no cap', penaltyExposure: 15000, source: 'mca.gov.in — Rule 24 LLP Rules 2009', lastVerified: '2026-10-01', entities: ['llp'] },
  { law: 'LLP', form: 'LLP Form 11', title: 'Annual return', freq: 'annual', months: [5], rule: 'llp11', dueRuleLabel: 'Within 60 days of FY end (30 May)', penalty: '₹25/day, no cap', penaltyExposure: 10000, source: 'mca.gov.in — Rule 25 LLP Rules 2009', lastVerified: '2026-10-01', entities: ['llp'] },
  { law: 'LLP', form: 'DIR-3 KYC', title: 'Designated partner KYC', freq: 'annual', months: [9], rule: 'dir3', dueRuleLabel: '30 September', penalty: '₹5,000/partner; DPIN deactivation', penaltyExposure: 10000, source: 'mca.gov.in — Rule 12A', lastVerified: '2026-10-01', entities: ['llp'] },

  /* ── Labour ── */
  { law: 'Labour', form: 'PF ECR', title: 'EPF contribution + ECR', freq: 'monthly', months: FY_MONTHS, rule: 'pf', dueRuleLabel: '15th of next month', penalty: '14B damages 5%–25% p.a. + 12% interest', penaltyExposure: 5000, source: 'epfindia.gov.in — Para 38, Sec 14B', lastVerified: '2026-10-01', requires: ['pf'] },
  { law: 'Labour', form: 'ESI Contribution', title: 'ESIC payment', freq: 'monthly', months: FY_MONTHS, rule: 'esi', dueRuleLabel: '15th of next month', penalty: '85B damages 5%–25% p.a.', penaltyExposure: 5000, source: 'esic.gov.in — Reg 31, Sec 85B', lastVerified: '2026-10-01', requires: ['esi'] },
  { law: 'Labour', form: 'PTEC ₹2,500 (company)', title: 'Professional tax on company — PTEC annual payment', freq: 'annual', months: [6], rule: 'ptec', dueRuleLabel: '₹2,500/year, payable by 30 June for the FY (Karnataka)', penalty: 'Interest + penalty per KPT Act; PT clearance needed for licences/renewals', penaltyExposure: 5000, source: 'ptax.karnataka.gov.in — KPT Act 1976 Sec 4/6 (PTEC enrolment)', lastVerified: '2026-10-01', requires: ['ptec'] },
  { law: 'Labour', form: 'PTRC (employees)', title: 'Professional tax deducted from employee salaries', freq: 'monthly', months: FY_MONTHS, rule: 'pt', dueRuleLabel: '20th of next month (Karnataka registered employers)', penalty: 'Penalty + 1.25%–2% p.m. interest; ₹200–₹2,000 fine', penaltyExposure: 2000, source: 'karnataka CTD — KPT Act 1976 Rule 24', lastVerified: '2026-10-01', requires: ['pt'] },
  { law: 'GST', form: 'GST Registration Watch', title: 'Turnover watch — register for GST when aggregate turnover crosses ₹20 lakh', freq: 'annual', months: [4], rule: 'gstWatch', dueRuleLabel: 'Services threshold: ₹20L aggregate turnover (Karnataka); registration within 30 days of crossing', penalty: 'Tax + interest + penalty on unregistered supplies past threshold', penaltyExposure: 50000, source: 'gst.gov.in — Sec 22 CGST Act; Notif. 10/2017-CTR', lastVerified: '2026-10-01', requires: [], complianceType: 'threshold_monitor', note: 'Only tracks the threshold — a crossing creates a review event, never a filing' },

  /* ── Karnataka real-estate industry (VJR Estate profile) ── */
  { law: 'Labour', form: 'POSH Annual Report', title: 'Annual report to District Officer', freq: 'annual', months: [1], rule: 'posh', dueRuleLabel: 'By 31 January', penalty: '₹50,000 (Sec 21/22)', penaltyExposure: 50000, source: 'wcd.gov.in — POSH Act 2013', lastVerified: '2026-10-01', requires: [], note: 'Applies at 10+ employees — uncheck if smaller', complianceType: 'internal_task' },
  { law: 'Labour', form: 'Gratuity / Bonus review', title: 'Payment of Gratuity & Bonus Act checks', freq: 'annual', months: [3], rule: 'gratuity', dueRuleLabel: 'FY-end review by 31 March', penalty: 'Interest + imprisonment provisions', penaltyExposure: 10000, source: 'labour.gov.in — PG Act 1972 Sec 7', lastVerified: '2026-10-01', requires: ['pf'], complianceType: 'internal_task' },
  { law: 'Labour', form: 'Half-yearly Return (S&E)', title: 'Karnataka S&E half-yearly return', freq: 'half-yearly', months: [1, 7], rule: 'seReturn', dueRuleLabel: 'End of Jan (Jul–Dec) / Jul (Jan–Jun)', penalty: '₹5,000–₹50,000', penaltyExposure: 10000, source: 'labour.karnataka.gov.in — S&E Act 1961 Rule 9', lastVerified: '2026-10-01', requires: ['shops'] },

  /* ── Corporate governance / other ── */
  { law: 'Corporate', form: "Board's Report", title: "Directors' report", freq: 'annual', months: [8], rule: 'boardReport', dueRuleLabel: 'Attached to AOC-4, pre-AGM', penalty: 'Officer ₹50k–₹3L', penaltyExposure: 50000, source: 'mca.gov.in — Sec 134', lastVerified: '2026-10-01', entities: ['pvtltd', 'opc'] },
  { law: 'Corporate', form: 'FLA Return', title: 'Annual return on Foreign Liabilities & Assets', freq: 'annual', months: [7], rule: 'fla', dueRuleLabel: 'By 15 July', penalty: 'RBI compounding; ₹10k–3x investment', penaltyExposure: 50000, source: 'rbi.org.in — FEMA 20(R)', lastVerified: '2026-10-01', requires: ['fdi'] },
  { law: 'Corporate', form: 'FC-GPR / FC-TRS', title: 'Foreign investment reporting (30/60 days)', freq: 'annual', months: [4], rule: 'fcgpr', dueRuleLabel: '30d of allotment / 60d of transfer — verify Apr', penalty: 'RBI compounding ₹10k–₹3L+', penaltyExposure: 50000, source: 'rbi.org.in — FEMA 20(R)', lastVerified: '2026-10-01', requires: ['fdi'], note: 'Event-based — verify annually' },
  { law: 'Licences', form: 'Trade Licence Renewal', title: 'BBMP trade licence renewal', freq: 'annual', months: [3], rule: 'tradeLicence', dueRuleLabel: 'Before 31 March', penalty: 'Double fee + prosecution', penaltyExposure: 10000, source: 'bbmp.gov.in — KMC Act 1976 Sec 250', lastVerified: '2026-10-01', requires: ['trade_licence'], complianceType: 'renewal' },
  { law: 'Licences', form: 'S&E Registration Renewal', title: 'Shops & Establishment renewal', freq: 'annual', months: [3], rule: 'shopsRenewal', dueRuleLabel: 'Before 31 March', penalty: '₹5,000–₹50,000', penaltyExposure: 10000, source: 'labour.karnataka.gov.in — S&E Act 1961', lastVerified: '2026-10-01', requires: ['shops'], complianceType: 'renewal' },
  { law: 'Licences', form: 'FSSAI Renewal', title: 'FSSAI licence return/renewal', freq: 'annual', months: [3], rule: 'fssai', dueRuleLabel: 'Renew before 31 March (as per licence)', penalty: '₹5L fine + imprisonment for continued trade', penaltyExposure: 50000, source: 'fssai.gov.in — FSS Act 2006', lastVerified: '2026-10-01', requires: ['fssai'], complianceType: 'renewal' },
  { law: 'Licences', form: 'IEC Update', title: 'IEC annual update (Apr–Jun)', freq: 'annual', months: [6], rule: 'iecUpdate', dueRuleLabel: 'Apr–Jun window', penalty: 'IEC deactivated if not updated', penaltyExposure: 10000, source: 'dgft.gov.in — FTP para 2.07', lastVerified: '2026-10-01', requires: ['ie_code'] },
  { law: 'Licences', form: 'Trademark Renewal', title: 'TM renewal (every 10 yrs) / renewal notice check', freq: 'annual', months: [4], rule: 'tmRenewal', dueRuleLabel: 'Verify each April', penalty: 'Mark removed from register', penaltyExposure: 25000, source: 'ipindia.gov.in — TM Act 1999 Sec 25', lastVerified: '2026-10-01', requires: ['trademark'], complianceType: 'renewal' },
  { law: 'Other', form: 'Insurance Renewals', title: 'Fire/office/vehicle/D&O policy renewals', freq: 'annual', months: [4], rule: 'insurance', dueRuleLabel: 'Verify every April', penalty: 'Uninsured exposure', penaltyExposure: 0, source: 'Policy schedules', lastVerified: '2026-10-01', complianceType: 'renewal' },

  /* ── Karnataka real-estate industry (VJR Estate profile) ── */
  { law: 'Licences', form: 'Property Tax (BBMP)', title: 'Municipal property tax on owned premises', freq: 'annual', months: [4], rule: 'propertyTax', dueRuleLabel: 'BBMP blocks: pay by 30 April for early-payment rebate', penalty: 'Interest 2% p.m. on arrears', penaltyExposure: 15000, source: 'bbmptax.karnataka.gov.in — KMC Act 1976 Sec 108-110', lastVerified: '2026-10-01', note: 'Only if the company owns premises (not for rented offices)' },
  { law: 'Licences', form: 'Lease / Rent Agreement Renewals', title: 'Office & warehouse lease renewals / stamp duty', freq: 'annual', months: [4], rule: 'leaseRenewal', dueRuleLabel: 'Track expiry; register leases > 1 yr (Registration Act) with stamp duty', penalty: 'Unregistered lease inadmissible; penalty up to 18x duty', penaltyExposure: 25000, source: 'kaverionline.karnataka.gov.in — Registration Act 1908, Karnataka Stamp Act 1957', lastVerified: '2026-10-01', note: 'Set each lease\u2019s actual expiry as due date', complianceType: 'renewal' },
  { law: 'Licences', form: 'RERA Quarterly Update', title: 'KRERA agent quarterly compliance self-check', freq: 'quarterly', months: [6, 9, 12, 3], rule: 'reraUpdate', dueRuleLabel: 'Agent details/ads compliant; quarterly self-check by quarter end', penalty: 'KRERA penalty up to ₹1L for agent defaults', penaltyExposure: 20000, source: 'rera.karnataka.gov.in — Sec 9/62 RERA Act 2016', lastVerified: '2026-10-01', requires: ['rera_agent'], complianceType: 'internal_task' },
  { law: 'Licences', form: 'RERA Agent Renewal (Form ABC)', title: 'Karnataka RERA agent registration renewal', freq: 'annual', months: [4], rule: 'reraRenewal', dueRuleLabel: 'Certificate valid 5 years — renew ≥ 60–90 days before expiry; verify each April', penalty: 'Unregistered brokerage is an offence — penalties + barred from RERA projects', penaltyExposure: 100000, source: 'rera.karnataka.gov.in — Sec 9/62 RERA Act 2016, KRERA Form ABC', lastVerified: '2026-10-01', requires: ['rera_agent'], note: 'Set the true expiry date on the generated item', complianceType: 'renewal' },
  { law: 'Corporate', form: 'TDS 194I (office rent)', title: 'TDS on office/shop rent @10%', freq: 'monthly', months: FY_MONTHS, rule: 'tdsRent', dueRuleLabel: 'Deduct monthly if rent > ₹50,000 p.m.; deposit by 7th (30 Apr for Mar)', penalty: '1.5%/month interest + disallowance of rent expense', penaltyExposure: 10000, source: 'incometaxindia.gov.in — Sec 194I', lastVerified: '2026-10-01', requires: ['tds'], note: 'Applies if paying rent for office premises' },
  { law: 'Corporate', form: 'TDS 194H (channel commissions)', title: 'TDS on commission/brokerage paid @2%', freq: 'monthly', months: FY_MONTHS, rule: 'tdsCommission', dueRuleLabel: 'Deduct on paying commission > ₹20,000/yr per payee; deposit by 7th', penalty: '1.5%/month interest + Sec 271C penalty', penaltyExposure: 10000, source: 'incometaxindia.gov.in — Sec 194H', lastVerified: '2026-10-01', requires: ['tds'], note: 'Applies to channel partners / freelance brokers on the books' },
  { law: 'Corporate', form: 'GST on brokerage (SAC 9971)', title: 'GST output on commission income (18%)', freq: 'monthly', months: FY_MONTHS, rule: 'gstBrokerage', dueRuleLabel: 'Charge 18% GST on brokerage invoices; include in GSTR-1/3B', penalty: 'Interest 18% p.a. + late fees as per GSTR-3B', penaltyExposure: 20000, source: 'gst.gov.in — Notification 11/2017-CTR (R), SAC 9971', lastVerified: '2026-10-01', requires: ['gst'], note: 'Real-estate agency service — always 18%, no composition benefit for services > threshold' },
  { law: 'Labour', form: 'S&E Registration Renewal', title: 'Karnataka S&E establishment registration renewal', freq: 'annual', months: [1], rule: 'seRegistration', dueRuleLabel: 'Renew by end of Jan (5-year validity per 1961 Act + Rules)', penalty: '₹5,000–₹50,000 + closure risk on continued default', penaltyExposure: 25000, source: 'labour.karnataka.gov.in — Karnataka S&E Act 1961 & Rules 1962', lastVerified: '2026-10-01', requires: ['shops'], note: 'Separate from the half-yearly return — this is the certificate renewal', complianceType: 'renewal' },
  { law: 'Corporate', form: 'DPDP data hygiene', title: 'DPDP Act 2023 — buyer/lead data handling review', freq: 'annual', months: [4], rule: 'dpdp', dueRuleLabel: 'Annual review each April (rules phased in)', penalty: 'Up to ₹250 crore for security-safeguard failures', penaltyExposure: 50000, source: 'meity.gov.in — Digital Personal Data Protection Act 2023', lastVerified: '2026-10-01', note: 'You hold buyer KYC/phone data — consent notices on forms recommended', complianceType: 'internal_task' },
];

export function rulesForProfile(entityType, registrations) {
  return COMPLIANCE_RULES.filter((r) => {
    if (r.entities && !r.entities.includes(entityType)) return false;
    if (r.requires && !r.requires.every((reg) => registrations.includes(reg))) return false;
    return true;
  });
}

/* ── Due-date engine ────────────────────────────────────────────────── */

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/** Due date for one rule in one period month. `fyStartY` = calendar year the FY begins. */
function dueDateFor(rule, fyStartY, month) {
  const nextMonthY = month >= 3 ? fyStartY : fyStartY + 1;
  const nextMonth = month === 12 ? 1 : month + 1;
  switch (rule.rule) {
    case 'gstr1': return { y: nextMonthY, m: nextMonth, d: 11 };
    case 'gstr3b': return { y: nextMonthY, m: nextMonth, d: 20 };
    case 'cmp08': return month === 3 ? { y: fyStartY + 1, m: 4, d: 18 } : { y: nextMonthY, m: nextMonth, d: 18 };
    case 'gst9': return { y: fyStartY + 1, m: 12, d: 31 };
    case 'itc04': return month === 9 ? { y: fyStartY, m: 10, d: 25 } : { y: fyStartY + 1, m: 4, d: 25 };
    case 'einvoice': return { y: fyStartY, m: 4, d: 15 };
    case 'tdsPay': return month === 3 ? { y: fyStartY + 1, m: 4, d: 30 } : { y: nextMonthY, m: nextMonth, d: 7 };
    case 'tdsRet': return month === 6 ? { y: fyStartY, m: 7, d: 31 } : month === 9 ? { y: fyStartY, m: 10, d: 31 } : month === 12 ? { y: fyStartY, m: 12, d: 31 } : { y: fyStartY + 1, m: 5, d: 31 };
    case 'advTax': return month === 3 ? { y: fyStartY + 1, m: 3, d: 15 } : { y: fyStartY, m: month, d: 15 };
    case 'itr': case 'itr5': return { y: fyStartY + 1, m: 10, d: 31 };
    case 'itrProp': return { y: fyStartY + 1, m: 7, d: 31 };
    case 'taxAudit': return { y: fyStartY + 1, m: 9, d: 30 };
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
    case 'llp8': return { y: fyStartY + 1, m: 10, d: 30 };
    case 'llp11': return { y: fyStartY + 1, m: 5, d: 30 };
    case 'pf': return { y: nextMonthY, m: nextMonth, d: 15 };
    case 'esi': return { y: nextMonthY, m: nextMonth, d: 15 };
    case 'pt': return { y: nextMonthY, m: nextMonth, d: 20 };
    case 'lwf': return { y: fyStartY + 1, m: 1, d: 15 };
    case 'posh': return { y: fyStartY + 1, m: 1, d: 31 };
    case 'gratuity': return { y: fyStartY + 1, m: 3, d: 31 };
    case 'seReturn': return month === 7 ? { y: fyStartY, m: 7, d: 31 } : { y: fyStartY + 1, m: 1, d: 31 };
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
    case 'reraRenewal': return { y: fyStartY, m: 4, d: 30 };
    case 'tdsRent': return month === 3 ? { y: fyStartY + 1, m: 4, d: 30 } : { y: nextMonthY, m: nextMonth, d: 7 };
    case 'tdsCommission': return month === 3 ? { y: fyStartY + 1, m: 4, d: 30 } : { y: nextMonthY, m: nextMonth, d: 7 };
    case 'gstBrokerage': return { y: nextMonthY, m: nextMonth, d: 20 };
    case 'seRegistration': return { y: fyStartY + 1, m: 1, d: 31 };
    case 'dpdp': return { y: fyStartY, m: 4, d: 30 };
    default: return { y: nextMonthY, m: nextMonth, d: 15 };
  }
}

const quarterOf = (m) => (m === 6 ? 'Q1' : m === 9 ? 'Q2' : m === 12 ? 'Q3' : 'Q4');
const ANNUAL_PERIOD_RULES = ['gst9', 'itr', 'itr5', 'itrProp', 'taxAudit', 'aoc4', 'mgt7', 'dir3', 'dpt3', 'adt1', 'agm', 'llp8', 'llp11', 'boardReport', 'lwf', 'posh', 'gratuity', 'tradeLicence', 'shopsRenewal', 'fssai', 'fla', 'inc20a', 'mbp1', 'statRegisters', 'tmRenewal', 'insurance', 'einvoice', 'fcgpr', 'reraRenewal', 'dpdp', 'ptec', 'gstWatch'];
const ONCE_RULES = ['firstBoard', 'firstAuditor', 'inc20a'];
const FIRST_YEAR_ANCHOR_RULES = ['inc20a', 'agm', 'aoc4', 'mgt7', 'llp8', 'llp11', 'gst9', 'itr', 'itr5', 'itrProp', 'firstBoard', 'firstAuditor'];
const PERIOD_CLAMP_EXEMPT = ['reraRenewal', 'dpdp', 'einvoice', 'inc20a', 'mbp1', 'statRegisters', 'fcgpr', 'tmRenewal', 'insurance', 'ptec', 'gstWatch', 'propertyTax', 'leaseRenewal', 'firstBoard', 'firstAuditor'];

/** Half-yearly periods keep their month in the label so two H1/H2 rows of
 *  one rule never collide with the (fy, form, period) unique index. */
const HALF_YEARLY_RULES = ['itc04', 'msme1', 'seReturn'];

/** H1 = Apr–Sep, H2 = Oct–Mar — month included so labels never repeat. */
function halfYearPeriod(rule, m) {
  const half = m >= 4 && m <= 9 ? 'H1' : 'H2';
  return `${half} (${pad(m)})`;
}

/**
 * Generate the compliance calendar for one FY, filtered by entity type and
 * registrations, clamped to the incorporation date.
 *
 * `markPastFiled`: obligations with a due date already in the past (relative
 * to today) get status 'filed' with a synthetic filed date, so a fresh
 * generation reflects "cleared till today" instead of a wall of overdue red.
 */
export function generateComplianceCalendar(opts) {
  const { fyStartYear, entityType, registrations, incorporatedOn, markPastFiled = true } = opts;
  const fy = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
  const incDate = incorporatedOn ? new Date(incorporatedOn + 'T00:00:00') : null;
  const incYm = incDate ? `${incDate.getFullYear()}-${pad(incDate.getMonth() + 1)}` : null;
  // Local date (not toISOString) — IST must not roll back a day at midnight.
  const _now = new Date();
  const todayIso = `${_now.getFullYear()}-${pad(_now.getMonth() + 1)}-${pad(_now.getDate())}`;
  const items = [];

  for (const rule of rulesForProfile(entityType, registrations)) {
    const months = rule.months ?? [4];
    for (const m of months) {
      const due = dueDateFor(rule, fyStartYear, m);
      const isQ = rule.freq === 'quarterly' || rule.freq === 'half-yearly';
      const period = ANNUAL_PERIOD_RULES.includes(rule.rule)
        ? 'Annual'
        : ONCE_RULES.includes(rule.rule)
          ? 'One-time'
          : isQ
            ? (HALF_YEARLY_RULES.includes(rule.rule) ? halfYearPeriod(rule.rule, m) : `${quarterOf(m)} ${fy}`)
            : `${pad(m)}-${m >= 4 ? fyStartYear : fyStartYear + 1}`;

      const periodYm = PERIOD_CLAMP_EXEMPT.includes(rule.rule) ? '9999' : `${m >= 4 ? fyStartYear : fyStartYear + 1}-${pad(m)}`;
      if (incYm && periodYm < incYm) continue;
      if (incDate && new Date(due.y, due.m - 1, due.d) < incDate) {
        if (!FIRST_YEAR_ANCHOR_RULES.includes(rule.rule)) continue;
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
        compliance_type: rule.complianceType ?? 'statutory_filing',
      });
    }
  }
  items.sort((a, b) => a.due_date.localeCompare(b.due_date));
  return items;
}

/* ── GST state machine (spec §3/§66) ────────────────────────────────────
 *
 * Three independent concepts:
 *   1. gstStatus  — registration state (not_registered → registered → cancelled)
 *   2. monitoring — threshold monitoring on/off
 *   3. generation — compliance generation on/off (becomes true on activation)
 *
 * Regular/Composition are mutually exclusive taxpayer MODES, enforced here
 * and by a DB CHECK constraint. Unknown exception facts never flip status —
 * they surface as requiresReview for professional evaluation (§10/§47).
 */

export const GST_STATUSES = ['not_registered','registration_required','application_in_progress','registered_regular','registered_composition','voluntarily_registered','cancelled','suspended','requires_review'];

/** True when the GST status means the company holds a live registration. */
export function isGstRegistered(gstStatus) {
  return ['registered_regular', 'registered_composition', 'voluntarily_registered'].includes(gstStatus);
}

/** Normalise a legacy registration array + gst_scheme into a gst profile shape. */
export function gstProfileFromLegacy(registrations = [], gstScheme = 'monthly') {
  const hadRegular = registrations.includes('gst');
  const hadComposition = registrations.includes('gst_composition');
  return {
    status: hadRegular ? 'registered_regular' : hadComposition ? 'registered_composition' : 'not_registered',
    threshold_monitoring_enabled: true,
    threshold_amount: 2000000,
    registration_type: hadRegular ? 'regular' : hadComposition ? 'composition' : null,
    compliance_generation_enabled: hadRegular || hadComposition,
    filing_frequency: gstScheme === 'qrmp' ? 'qrmp' : 'monthly',
  };
}

/**
 * Evaluate GST facts → { status, monitoring, generation, review }
 * (spec §8/§9/§10). Threshold crossings NEVER create filings here — they
 * flag review and the proxy records a gst_threshold_events row.
 */
export function evaluateGst(gst = {}, turnover = 0) {
  const status = gst.status ?? 'not_registered';
  const monitoring = gst.threshold_monitoring_enabled !== false;
  const threshold = Number(gst.threshold_amount) || 2_000_000;
  const registered = isGstRegistered(status);
  const generation = registered && gst.compliance_generation_enabled !== false;

  // Exception facts: null = unknown → requires review (never inferred).
  const unknownExceptions = [
    gst.interstate_taxable_supply,
    gst.compulsory_registration_condition,
    gst.exempt_supply_only,
    gst.ecommerce_condition,
    gst.agent_condition,
    gst.reverse_charge_condition,
  ].filter((v) => v === null || v === undefined).length;

  const crossed = monitoring && !registered && turnover >= threshold;
  const pct = threshold > 0 ? Math.min(100, Math.round((turnover / threshold) * 100)) : 0;

  return {
    status,
    registered,
    generation,
    monitoring,
    threshold,
    turnover,
    pctUsed: pct,
    remaining: Math.max(0, threshold - turnover),
    crossed,
    reviewRequired: crossed || unknownExceptions > 0 || status === 'requires_review',
    unknownExceptions,
  };
}

/**
 * Generate the compliance calendar for one FY + full evaluation summary
 * (spec §48). GST filings appear ONLY for an active registration; the
 * threshold watch appears only while monitoring is on and GST is inactive.
 */
export function generateComplianceCalendarWithSummary(opts) {
  const { fyStartYear, entityType, registrations, incorporatedOn, gstScheme, gst = {}, aggregateTurnover = 0, markPastFiled = true } = opts;
  const gstEval = evaluateGst(gst, aggregateTurnover);
  const gstActive = gstEval.registered && gstEval.generation;

  // Legacy 'gst'/'gst_composition' chips must not leak into rule filtering —
  // GST applicability now comes exclusively from the gst_profile state machine.
  const effectiveRegistrations = (registrations ?? []).filter((r) => r !== 'gst' && r !== 'gst_composition');
  // GST rules carry requires:['gst'] — feed them a marker only when the
  // state machine says generation is actually on (spec §47/§66).
  const gstMarker = gstActive ? ['gst'] : [];
  const allRules = rulesForProfile(entityType, [...effectiveRegistrations, ...gstMarker]);

  // Composition scheme: only composition-specific GST rules (CMP-08 etc.),
  // never the regular-monthly set — the two modes are mutually exclusive.
  const rules = allRules.filter((r) => {
    if (['cmp08'].includes(r.rule)) return gstActive && gstEval.status === 'registered_composition';
    if (['gstr1', 'gstr3b', 'gst9', 'itc04', 'einvoice', 'gstBrokerage'].includes(r.rule)) {
      return gstActive && gstEval.status !== 'registered_composition';
    }
    return true;
  });

  const notApplicable = allRules.length - rules.length;
  // Pass GST rules through to the generator by adding the marker to the
  // registrations the generator sees, then filter its output to match.
  const items = generateComplianceCalendar({ fyStartYear, entityType, registrations: [...effectiveRegistrations, ...(gstActive ? gstMarker : [])], incorporatedOn, gstScheme, markPastFiled });
  const filtered = items.filter((i) => {
    if (i.form === 'GST Registration Watch') return gstEval.monitoring && !gstActive;
    if (i.form === 'CMP-08') return gstActive && gstEval.status === 'registered_composition';
    if (['GSTR-1', 'GSTR-3B', 'GSTR-9/9C', 'ITC-04', 'E-invoice / E-way readiness', 'GST on brokerage (SAC 9971)'].includes(i.form)) {
      return gstActive && gstEval.status !== 'registered_composition';
    }
    return true;
  });

  // Non-GST registration-chip rules that were filtered out by requires:
  const evaluated = COMPLIANCE_RULES.filter((r) => {
    if (r.entities && !r.entities.includes(entityType)) return false;
    return true;
  }).length;

  return {
    items: filtered,
    summary: {
      rulesEvaluated: evaluated,
      applicable: rules.length,
      notApplicable: evaluated - rules.length,
      gstStatus: gstEval.status,
      gstGeneration: gstEval.generation,
      gstReviewRequired: gstEval.reviewRequired,
      thresholdCrossed: gstEval.crossed,
      ruleVersion: RULES_VERSION,
    },
    gstEval,
  };
}
