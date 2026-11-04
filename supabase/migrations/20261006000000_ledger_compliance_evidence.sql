-- LEDGERS: versioned rule metadata, explicit applicability, and evidence history.
-- Additive and idempotent: existing compliance rows/IDs/statuses are preserved.

ALTER TABLE public.ledger_compliance_items
  ADD COLUMN IF NOT EXISTS rule_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS legacy_status TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS evidence_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (evidence_status IN ('not_required','awaiting_evidence','verified')),
  ADD COLUMN IF NOT EXISTS source_verified_at DATE;

-- Preserve the original status while flagging old filed rows that have no
-- acknowledgement, proof, or challan to support the completion claim.
UPDATE public.ledger_compliance_items
SET legacy_status = status,
    evidence_status = 'awaiting_evidence'
WHERE status = 'filed'
  AND COALESCE(NULLIF(arn, ''), NULL) IS NULL
  AND COALESCE(NULLIF(proof_url, ''), NULL) IS NULL
  AND COALESCE(NULLIF(challan_url, ''), NULL) IS NULL
  AND evidence_status = 'not_required';

CREATE TABLE IF NOT EXISTS public.ledger_rule_catalog (
  rule_id TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  law TEXT NOT NULL,
  form TEXT NOT NULL,
  due_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
  applicability JSONB NOT NULL DEFAULT '{}'::jsonb,
  penalty_basis TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  source_verified_at DATE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (rule_id, rule_version)
);

ALTER TABLE public.ledger_company_profile ADD COLUMN IF NOT EXISTS agm_dates JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.ledger_company_profile ADD COLUMN IF NOT EXISTS first_auditor_appointment_date DATE;

CREATE TABLE IF NOT EXISTS public.ledger_applicability_answers (
  question_key TEXT PRIMARY KEY,
  answer TEXT NOT NULL DEFAULT 'unknown'
    CHECK (answer IN ('yes','no','unknown')),
  answer_value TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ,
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_item_id UUID NOT NULL REFERENCES public.ledger_compliance_items(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_compliance_events_item
  ON public.ledger_compliance_events (compliance_item_id, created_at DESC);

-- Seed metadata for the changed first-year and conditional rules. Dates are
-- reviewed against the cited primary-source material before rule updates.
INSERT INTO public.ledger_rule_catalog
  (rule_id, rule_version, law, form, due_rule, applicability, penalty_basis, source_url, source_verified_at)
VALUES
  ('itc04','2026-10-29.1','GST','ITC-04','{"half_years":["Apr-Sep","Oct-Mar"]}'::jsonb,'{"answer_key":"job_work_goods"}'::jsonb,'Confirm current form deadline with GST practitioner','https://www.gst.gov.in/help/helpmodules/',DATE '2026-10-29'),
  ('inc20a','2026-10-29.1','ROC','INC-20A','{"days_after_incorporation":180}'::jsonb,'{"entities":["pvtltd","opc"]}'::jsonb,'Companies Act, 2013 section 10A; verify the current MCA form deadline','https://www.mca.gov.in/content/mca/global/en/mca/e-filing/company-forms-download.html',DATE '2026-10-29'),
  ('firstBoard','2026-10-29.1','ROC','First Board Meeting','{"days_after_incorporation":30}'::jsonb,'{"entities":["pvtltd","opc"]}'::jsonb,'Companies Act, 2013 section 173','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html',DATE '2026-10-29'),
  ('firstAuditor','2026-10-29.1','ROC','First Auditor Appointment','{"days_after_incorporation":30}'::jsonb,'{"entities":["pvtltd","opc"]}'::jsonb,'Companies Act, 2013 section 139(6)','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html',DATE '2026-10-29'),
  ('firstAdt1','2026-10-29.1','ROC','First ADT-1','{"days_after_appointment":15}'::jsonb,'{"entities":["pvtltd","opc"],"appointment_date_required":true}'::jsonb,'Companies Act, 2013 section 139 and applicable rules','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html',DATE '2026-10-29'),
  ('agm','2026-10-29.1','ROC','AGM','{"first_financial_year_months_after_close":9,"later_financial_year_months_after_close":6}'::jsonb,'{"entities":["pvtltd"]}'::jsonb,'Companies Act, 2013 section 96; actual AGM date must be recorded','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html',DATE '2026-10-29'),
  ('aoc4','2026-10-29.1','ROC','AOC-4','{"days_after_actual_agm":30}'::jsonb,'{"entities":["pvtltd","opc"],"agm_date_required":true}'::jsonb,'Companies Act, 2013 section 137','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html',DATE '2026-10-29'),
  ('mgt7','2026-10-29.1','ROC','MGT-7','{"days_after_actual_agm":60}'::jsonb,'{"entities":["pvtltd","opc"],"agm_date_required":true}'::jsonb,'Companies Act, 2013 section 92','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html',DATE '2026-10-29'),
  ('msme1','2026-10-29.1','ROC','MSME-1','{"half_years":["Apr-Sep","Oct-Mar"]}'::jsonb,'{"answer_key":"msme_dues_over_45_days"}'::jsonb,'Companies Act, 2013 section 405 and applicable MSME rules','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html',DATE '2026-10-29'),
  ('posh','2026-10-29.1','Labour','POSH Annual Report','{"month":1,"day":31}'::jsonb,'{"answer_key":"posh_10_or_more_employees"}'::jsonb,'Sexual Harassment of Women at Workplace Act, 2013 section 21','https://wcd.nic.in/acts/sexual-harassment-women-workplace-prevention-prohibition-and-redressal-act-2013',DATE '2026-10-29'),
  ('advTax','2026-10-29.1','Income Tax','Advance Tax','{"instalments":["15-Jun","15-Sep","15-Dec","15-Mar"]}'::jsonb,'{"answer_key":"advance_tax_payable_10000_or_more"}'::jsonb,'Income-tax Act, 1961 sections 207-211; confirm applicable law and threshold for the assessment year','https://www.incometax.gov.in/iec/foportal/help/advance-tax',DATE '2026-10-29')
ON CONFLICT (rule_id, rule_version) DO NOTHING;

-- Seed only statutory identity facts already present in the incorporation
-- master. Never overwrite an existing operating profile or invent registrations.
INSERT INTO public.ledger_company_profile
  (id, name, entity_type, incorporated_on, fy_start_month, cin, pan, tan, registrations)
SELECT 'company', 'VJR Estate Properties Private Limited', 'pvtltd', DATE '2025-10-15', 4,
       'U68100KA2025PTC209772', 'AALCV5120G', 'BLRV32731G', '{}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_company_profile
  WHERE id = 'company' AND NULLIF(name, '') IS NOT NULL
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ledger_rule_catalog','ledger_applicability_answers','ledger_compliance_events'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.ledger_compliance_events FROM anon, authenticated;
