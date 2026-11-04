-- Keep removed obligations recoverable; the active register filters archived rows.
ALTER TABLE public.ledger_compliance_items
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pack_id TEXT NOT NULL DEFAULT 'core';

-- A filed date, especially one copied from a deadline, is not evidence.
UPDATE public.ledger_compliance_items
SET legacy_status = CASE WHEN legacy_status = '' THEN status ELSE legacy_status END,
    status = 'pending',
    filed_date = NULL,
    evidence_status = 'awaiting_evidence',
    updated_at = now()
WHERE status = 'filed'
  AND (COALESCE(NULLIF(arn, ''), '') = ''
    OR filed_date IS NULL
    OR COALESCE(NULLIF(proof_url, ''), '') = '');

-- These are optional, conditional or incorrect for the current company state.
UPDATE public.ledger_compliance_items
SET archived = TRUE,
    archive_reason = 'Moved to disabled/conditional pack or removed from active rules on 2026-10-30.',
    updated_at = now()
WHERE archived = FALSE
  AND (
    form ILIKE 'PAS-6%'
    OR form ILIKE 'Board%Report%'
    OR (form ILIKE '%ADT-1%' AND form NOT ILIKE 'First ADT-1%')
    OR (form ILIKE 'DIR-3 KYC%' AND form NOT ILIKE 'DIR-3 KYC tracker%')
    OR form ILIKE '%3CA%3CD%'
    OR form ILIKE '%3CB%3CD%'
    OR form ILIKE 'POSH%'
    OR form ILIKE 'Advance Tax%'
    OR form ILIKE 'DPT-3%'
    OR form ILIKE 'Property Tax%'
    OR form ILIKE 'BBMP%'
    OR form ILIKE 'Lease%'
    OR form ILIKE 'Insurance%'
    OR form ILIKE '%DPDP%'
    OR form ILIKE 'MSME-1%'
    OR form ILIKE 'TDS Payment%'
    OR form ILIKE '24Q / 26Q%'
    OR form ILIKE 'TDS Q2 return%'
    OR form ILIKE 'Gratuity%'
    OR form ILIKE 'PTRC%'
    OR form ILIKE 'PF ECR%'
    OR form ILIKE 'ESI Contribution%'
    OR form ILIKE 'Tax audit%'
    OR form ILIKE 'Statutory audit FY%'
    OR form ILIKE 'Accounts approval and AGM notice%'
    OR form ILIKE 'Gratuity / Bonus review%'
    OR form ILIKE 'S&E Registration Renewal%'
    OR form ILIKE 'Half-yearly Return (S&E)%'
    OR form ILIKE 'RERA %'
  );

-- Keep archived obligations linked to the pack that owns them so they can be
-- restored without losing their original categorisation.
UPDATE public.ledger_compliance_items
SET pack_id = CASE
  WHEN form ILIKE 'POSH%' OR form ILIKE 'PF ECR%' OR form ILIKE 'ESI Contribution%' OR form ILIKE 'PTRC%' OR form ILIKE 'Gratuity%' OR form ILIKE 'Karnataka Labour Welfare Fund%' THEN 'employees'
  WHEN form ILIKE 'GSTR-%' OR form ILIKE 'GST %' OR form ILIKE 'CMP-08%' OR form ILIKE 'ITC-04%' OR form ILIKE 'E-invoice%' THEN 'gst'
  WHEN form ILIKE '%3CA%3CD%' OR form ILIKE '%3CB%3CD%' OR form ILIKE 'Tax audit%' THEN 'tax_audit'
  WHEN form ILIKE 'RERA %' THEN 'rera'
  WHEN form ILIKE 'Property Tax%' OR form ILIKE 'BBMP%' OR form ILIKE 'Lease%' OR form ILIKE 'Insurance%' OR form ILIKE '%DPDP%' OR form ILIKE 'PAS-6%' THEN 'business_hygiene'
  WHEN form ILIKE 'DPT-3%' OR form ILIKE 'MSME-1%' OR form ILIKE 'TDS Payment%' OR form ILIKE '24Q / 26Q%' OR form ILIKE 'Advance Tax%' OR form ILIKE 'PAS-3%' OR form ILIKE 'INC-22%' OR form ILIKE '%Shops%' THEN 'conditional'
  ELSE COALESCE(NULLIF(pack_id, ''), 'core') END
WHERE pack_id = 'core';

-- Persist pack choices separately from statutory rule definitions.
CREATE TABLE IF NOT EXISTS public.ledger_compliance_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  default_on BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  trigger_expr TEXT NOT NULL DEFAULT '',
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.ledger_compliance_packs  (id,name,description,default_on,enabled,trigger_expr,rules) VALUES
  ('core','Core','Always-on company and annual-compliance essentials.',TRUE,TRUE,'Always enabled','[]'),
  ('conditional','Conditional obligations','Generate only obligations whose answer is Yes.',TRUE,TRUE,'Applicability answer is Yes','[]'),
  ('employees','Employees','Payroll, labour and workplace rules.',FALSE,FALSE,'Salary threshold, 10 or 20 employees','[]'),
  ('gst','GST','GST threshold meter and returns.',FALSE,FALSE,'70% rolling turnover, interstate supply or e-commerce','[]'),
  ('tax_audit','Tax audit','Section 44AB tax-audit workflow.',FALSE,FALSE,'Turnover above ₹1 crore','[]'),
  ('rera','RERA','Agent/promoter registration and project reporting.',FALSE,FALSE,'KRERA agent or promoter role','[]'),
  ('business_hygiene','Business hygiene','Optional property, lease, insurance, privacy and register calendar.',FALSE,FALSE,'Manual opt-in','[]')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  default_on = EXCLUDED.default_on, trigger_expr = EXCLUDED.trigger_expr, rules = EXCLUDED.rules,
  enabled = CASE WHEN ledger_compliance_packs.updated_at = ledger_compliance_packs.created_at THEN EXCLUDED.enabled ELSE ledger_compliance_packs.enabled END;

DO $$
DECLARE t text;
BEGIN
  REVOKE ALL ON TABLE public.ledger_compliance_packs FROM anon, authenticated;
  ALTER TABLE public.ledger_compliance_packs ENABLE ROW LEVEL SECURITY;
END $$;

-- Start the eight wizard sections unanswered. Existing explicit answers remain.
INSERT INTO public.ledger_applicability_answers (question_key, answer, notes) VALUES
 ('dpt3_applicable','unknown','Any loan, deposit or advance from directors or others during the period?'),
 ('msme_dues_over_45_days','unknown','Any qualifying MSME dues unpaid for over 45 days?'),
 ('tds_applicable','unknown','Any rent, commission, professional payment or salary requiring TDS/TAN?'),
 ('advance_tax_payable_10000_or_more','unknown','Estimated advance tax payable ₹10,000 or more?'),
 ('pas3_applicable','unknown','Any share allotment this FY?'),
 ('inc22_applicable','unknown','Any registered-office change this FY?'),
 ('shops_applicable','unknown','Does the company need Karnataka Shops & Establishment registration/returns?'),
 ('krera_applicable','unknown','Does the company act as a RERA agent or promoter?')
ON CONFLICT (question_key) DO NOTHING;

-- Correct and seed the FY 2025-26 / FY 2026-27 Core rows.
INSERT INTO public.ledger_compliance_items
  (law,form,title,period,fy,due_date,status,filed_date,arn,penalty_exposure,notes,source_url,rule_id,rule_version,compliance_type,evidence_status,amount_paid)
VALUES
 ('Income Tax','ITR-6','Income tax return · AY 2026-27','AY 2026-27','FY 2025-26',DATE '2026-10-31','pending',NULL,'',10000,'FY 2025-26 return due 31 Oct 2026. Late filing fee under section 234F: up to ₹5,000 (₹1,000 where total income is within the statutory ₹5 lakh limit); confirm the applicable amount and any current extension with CA.','https://www.incometax.gov.in/iec/foportal/','itr','2026-10-30.1','statutory_filing','not_required',0),
 ('Corporate','Statutory audit','Complete statutory audit before first AGM','FY 2025-26','FY 2025-26',DATE '2026-12-31','pending',NULL,'',0,'Complete the FY 2025-26 statutory audit before the first AGM.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','auditBeforeAgm','2026-10-30.1','internal_task','not_required',0),
 ('ROC','Board Meetings','Board meeting · H2 CY2026','H2 CY2026','FY 2026-27',DATE '2026-12-31','pending',NULL,'',0,'Board meeting to approve accounts, approve the Board report, and convene the first AGM. Small-company cadence and minimum 90-day gap are flagged for CA confirmation. Known resolutions: 02 on 12 Nov 2025; 03 on 11 Apr 2026. Upload meeting minutes.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','boardMtg','2026-10-30.1','meeting','not_required',0),
 ('ROC','AGM','First annual general meeting','FY 2025-26','FY 2025-26',DATE '2026-12-31','pending',NULL,'',0,'First AGM due within nine months of the first FY end (31 Mar 2026). Record actual AGM date to calculate following filings.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','agm','2026-10-30.1','meeting','not_required',0),
 ('ROC','AOC-4','Financial statements filing','FY 2025-26','FY 2025-26',DATE '2026-12-31','pending',NULL,'',0,'First-year planning date is the AGM deadline. Set actual AGM date to replace this with AGM + 30 days.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','aoc4','2026-10-30.1','internal_task','not_required',0),
 ('ROC','MGT-7A','Annual return (small company)','FY 2025-26','FY 2025-26',DATE '2026-12-31','pending',NULL,'',0,'First-year planning date is the AGM deadline. Set actual AGM date to replace this with AGM + 60 days. Use MGT-7 instead if no longer eligible as a small company.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','mgt7','2026-10-30.1','internal_task','not_required',0),
 ('ROC','First AGM auditor appointment','Reappoint auditor at first AGM','FY 2025-26','FY 2025-26',DATE '2026-12-31','pending',NULL,'',0,'First auditor term shown to 31 Mar 2030 does not continue through that date: first auditor holds office only until first AGM. Reappoint at AGM.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','firstAgmAuditor','2026-10-30.1','internal_task','not_required',0),
 ('ROC','First AGM ADT-1','File auditor reappointment within 15 days after AGM','FY 2025-26','FY 2025-26',DATE '2027-01-15','pending',NULL,'',0,'Set actual AGM date; due date is AGM + 15 days.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','firstAgmAdt1','2026-10-30.1','statutory_filing','not_required',0),
 ('ROC','First Board Meeting','First board meeting minutes required','One-time','FY 2025-26',DATE '2025-11-14','pending',NULL,'',0,'Evidence pending — request minutes for the first board meeting. Known meetings: Resolution 02 on 12 Nov 2025 and Resolution 03 on 11 Apr 2026; confirm the first meeting record.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','firstBoardRecords','2026-10-30.1','meeting','awaiting_evidence',0),
 ('ROC','MBP-1 / DIR-8','Director interest and disqualification disclosures','FY 2025-26','FY 2025-26',DATE '2025-11-14','pending',NULL,'',0,'Internal record: obtain disclosures at the first board meeting of each FY.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','mbp1','2026-10-30.1','internal_task','not_required',0),
 ('ROC','Statutory Registers','Maintain company statutory registers','FY 2025-26','FY 2025-26',DATE '2026-12-31','pending',NULL,'',0,'Internal record calendar; update registers when events occur and review before AGM.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','statRegisters','2026-10-30.1','internal_task','not_required',0),
 ('Labour','PTEC ₹2,500 (company)','Karnataka professional tax enrolment payment','FY 2026-27','FY 2026-27',DATE '2027-04-30','pending',NULL,'',0,'₹2,000 reportedly paid against ₹2,500 due: ₹500 shortfall alert. Verify payment and challan. Next due 30 Apr 2027.','https://ptax.karnataka.gov.in/','ptec','2026-10-30.1','payment','awaiting_evidence',2000)
ON CONFLICT (fy,form,period) DO UPDATE SET
 title=EXCLUDED.title,due_date=EXCLUDED.due_date,
 status=CASE WHEN ledger_compliance_items.evidence_status='verified' THEN 'filed' WHEN ledger_compliance_items.status='filed' THEN EXCLUDED.status ELSE ledger_compliance_items.status END,
 filed_date=CASE WHEN ledger_compliance_items.evidence_status='verified' THEN ledger_compliance_items.filed_date WHEN ledger_compliance_items.status='filed' THEN NULL ELSE ledger_compliance_items.filed_date END,
 penalty_exposure=EXCLUDED.penalty_exposure,notes=EXCLUDED.notes,source_url=EXCLUDED.source_url,
 rule_id=EXCLUDED.rule_id,rule_version=EXCLUDED.rule_version,compliance_type=EXCLUDED.compliance_type,
 archived=CASE WHEN ledger_compliance_items.archive_reason='Pack disabled; retained for history.' THEN FALSE ELSE ledger_compliance_items.archived END,
 archive_reason=CASE WHEN ledger_compliance_items.archive_reason='Pack disabled; retained for history.' THEN '' ELSE ledger_compliance_items.archive_reason END,
 evidence_status=CASE WHEN ledger_compliance_items.evidence_status='verified' THEN 'verified' ELSE EXCLUDED.evidence_status END,
 updated_at=now();

-- Known board resolutions stay as historical records, but lack of proof is never "Filed".
UPDATE public.ledger_compliance_items
SET status='pending', filed_date=NULL, evidence_status='awaiting_evidence', archived=FALSE,
    notes=COALESCE(notes,'') || ' Minutes/proof upload required.', updated_at=now()
WHERE form='Board Meeting record' AND period IN ('Resolution 02','Resolution 03');

-- Due-date-driven synthetic ADT-1 and INC-20A rows are replaced by supplied SRNs.
UPDATE public.ledger_compliance_items
SET archived=TRUE, archive_reason='Replaced by supplied one-time filing record; retained for history.', updated_at=now()
WHERE (form='ADT-1' OR form='INC-20A') AND period NOT IN ('One-time');

-- The initial user-supplied SRNs are preserved as pending evidence until both
-- the filing acknowledgement and proof are attached; no PDF was supplied here.
UPDATE public.ledger_compliance_items
SET status='pending', evidence_status='awaiting_evidence',
    filed_date=CASE WHEN form='First ADT-1' THEN DATE '2025-11-20' ELSE DATE '2026-04-11' END,
    due_date=CASE WHEN form='First ADT-1' THEN DATE '2025-11-27' ELSE DATE '2026-04-13' END,
    notes=COALESCE(notes,'') || ' SRN and filing date supplied; attach the official acknowledgement/proof to mark Done.', updated_at=now()
WHERE form IN ('First ADT-1','INC-20A') AND arn IN ('AB9164930','AC2977244');

UPDATE public.ledger_compliance_items
SET status='pending', filed_date=NULL, evidence_status='awaiting_evidence',
    due_date=DATE '2025-11-14', updated_at=now()
WHERE form='First Board Meeting';
