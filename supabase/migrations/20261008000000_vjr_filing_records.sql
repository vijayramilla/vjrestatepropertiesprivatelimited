-- VJR Estate supplied filing records and compliance facts.
-- Idempotent: preserve unrelated/manual fields, and never imply missing PDFs exist.

ALTER TABLE public.ledger_company_profile
  ADD COLUMN IF NOT EXISTS company_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_activity TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS operating_office TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS registered_office_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS registered_office_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS paid_up_capital NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS turnover_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS small_company BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS small_company_thresholds JSONB NOT NULL DEFAULT '{"paid_up_capital":100000000,"turnover":1000000000}'::jsonb,
  ADD COLUMN IF NOT EXISTS auditor_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS auditor_membership_no TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS auditor_firm_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS auditor_frn TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_quality_alerts JSONB NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO public.ledger_company_profile
  (id, name, entity_type, incorporated_on, fy_start_month, cin, pan, tan, gstin, registered_office,
   registered_office_lat, registered_office_lng, operating_office, company_email, business_activity,
   paid_up_capital, turnover_amount, turnover_band, small_company, small_company_thresholds,
   auditor_name, auditor_membership_no, auditor_firm_name, auditor_frn, first_auditor_appointment_date,
   data_quality_alerts, registrations)
VALUES
  ('company','VJR ESTATE PROPERTIES PRIVATE LIMITED','pvtltd',DATE '2025-10-15',4,'U68100KA2025PTC209772','AALCV5120G','BLRV32731G','',
   'C/O Vasudeva, Karatgi, Sindhanur Basavanna Camp, Gangavathi, Koppal, Karnataka 583229',15.626546,76.618165,
   'HSR Layout, Bengaluru','e1945723@goledgers.com','Real estate; not regulated by RBI, SEBI, or IRDAI',
   10000,NULL,'lt_20l',TRUE,
   '{"paid_up_capital":100000000,"turnover":1000000000}'::jsonb,
   'Chinta Venkata Ramana','277045','Venkata Chinta & Co','028072S',DATE '2025-11-12',
   '[{"id":"office-location","severity":"warning","message":"Registered office differs from operating location - confirm; INC-22 / PT / Shops & Establishment may be affected"},{"id":"auditor-individual-firm","severity":"warning","message":"ADT-1 filed as Individual, while the board resolution names Venkata Chinta & Co (FRN 028072S); reconcile the auditor identity"},{"id":"first-auditor-term","severity":"warning","message":"Term shown 15/10/2025-31/03/2030, but a Sec 139(6) first auditor holds office only till first AGM - reappoint at AGM, new ADT-1 within 15 days"},{"id":"inc20a-evidence","severity":"warning","message":"INC-20A fee receipt and MCA approval status are still pending evidence"}]'::jsonb,
   ARRAY['ptec']::text[])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  entity_type = EXCLUDED.entity_type,
  incorporated_on = EXCLUDED.incorporated_on,
  fy_start_month = EXCLUDED.fy_start_month,
  cin = EXCLUDED.cin,
  pan = EXCLUDED.pan, tan = EXCLUDED.tan, gstin = '',
  registered_office = EXCLUDED.registered_office,
  registered_office_lat = EXCLUDED.registered_office_lat,
  registered_office_lng = EXCLUDED.registered_office_lng,
  operating_office = EXCLUDED.operating_office,
  company_email = EXCLUDED.company_email,
  business_activity = EXCLUDED.business_activity,
  paid_up_capital = EXCLUDED.paid_up_capital,
  turnover_amount = EXCLUDED.turnover_amount,
  turnover_band = EXCLUDED.turnover_band,
  small_company = EXCLUDED.small_company,
  small_company_thresholds = EXCLUDED.small_company_thresholds,
  auditor_name = EXCLUDED.auditor_name,
  auditor_membership_no = EXCLUDED.auditor_membership_no,
  auditor_firm_name = EXCLUDED.auditor_firm_name,
  auditor_frn = EXCLUDED.auditor_frn,
  first_auditor_appointment_date = EXCLUDED.first_auditor_appointment_date,
  data_quality_alerts = EXCLUDED.data_quality_alerts,
  registrations = EXCLUDED.registrations,
  updated_at = now();

-- Keep the supplied DINs on the company director register.
UPDATE public.ledger_directors
SET din = '11343816', din_status = 'confirmed', verification_status = 'confirmed', updated_at = now()
WHERE lower(name) = 'vijay ram';
UPDATE public.ledger_directors
SET din = '11343815', din_status = 'confirmed', verification_status = 'confirmed', updated_at = now()
WHERE lower(name) = 'chinnigari devendra reddy';
UPDATE public.ledger_shareholders
SET din = '11343816', verification_status = 'confirmed', updated_at = now()
WHERE lower(name) = 'vijay ram';
UPDATE public.ledger_shareholders
SET din = '11343815', verification_status = 'confirmed', updated_at = now()
WHERE lower(name) = 'chinnigari devendra reddy';

-- Additional paid-up capital/shareholding snapshot at the supplied payment date.
INSERT INTO public.ledger_share_capital
  (authorised_amount, authorised_shares, subscribed_amount, subscribed_shares, face_value, class_name, effective_from, source, verification_status)
SELECT 100000, 10000, 10000, 1000, 10, 'Equity Class A', DATE '2026-04-11',
       'Share capital paid 11 Apr 2026 · Axis Bank account ending 5036 (masked)', 'confirmed'
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_share_capital WHERE effective_from = DATE '2026-04-11');

INSERT INTO public.ledger_shareholding (shareholder_id, snapshot_type, shares_held, subscription_value, effective_from, source, verification_status)
SELECT s.id, 'current', 990, 9900, DATE '2026-04-11', 'Shareholding paid 11 Apr 2026 · bank account ending 5036 (masked)', 'confirmed'
FROM public.ledger_shareholders s WHERE lower(s.name) = 'vijay ram'
AND NOT EXISTS (SELECT 1 FROM public.ledger_shareholding h WHERE h.shareholder_id = s.id AND h.snapshot_type = 'current' AND h.effective_from = DATE '2026-04-11');

INSERT INTO public.ledger_shareholding (shareholder_id, snapshot_type, shares_held, subscription_value, effective_from, source, verification_status)
SELECT s.id, 'current', 10, 100, DATE '2026-04-11', 'Shareholding paid 11 Apr 2026 · bank account ending 5036 (masked)', 'confirmed'
FROM public.ledger_shareholders s WHERE lower(s.name) = 'chinnigari devendra reddy'
AND NOT EXISTS (SELECT 1 FROM public.ledger_shareholding h WHERE h.shareholder_id = s.id AND h.snapshot_type = 'current' AND h.effective_from = DATE '2026-04-11');

-- Board appointments recorded in the supplied resolutions.
INSERT INTO public.ledger_compliance_items AS existing
  (law, form, title, period, fy, due_date, status, filed_date, penalty_exposure, notes, rule_id, rule_version, compliance_type, evidence_status)
VALUES
  ('ROC','Board Meeting record','Board meeting · Resolution 02 (first auditor appointment)','Resolution 02','FY 2025-26',DATE '2025-11-12','pending',NULL,0,'Board meeting held 12 Nov 2025. First board meeting (Resolution 01) date and minutes are unknown; request minutes.','boardMeetingRecord','2026-10-30','meeting','awaiting_evidence'),
  ('ROC','Board Meeting record','Board meeting · Resolution 03 (INC-20A)','Resolution 03','FY 2026-27',DATE '2026-04-11','pending',NULL,0,'Board meeting held 11 Apr 2026. 150-day gap from 12 Nov 2025; calendar-day gap is a review note, not a conclusion on statutory compliance.','boardMeetingRecord','2026-10-30','meeting','awaiting_evidence')
ON CONFLICT (fy, form, period) DO UPDATE SET
  title = EXCLUDED.title, due_date = EXCLUDED.due_date,
  status = CASE WHEN existing.evidence_status = 'verified' THEN 'filed' ELSE 'pending' END,
  filed_date = CASE WHEN existing.evidence_status = 'verified' THEN existing.filed_date ELSE NULL END, notes = EXCLUDED.notes,
  evidence_status = CASE
    WHEN existing.evidence_status = 'verified'
      OR NULLIF(existing.proof_url, '') IS NOT NULL
      OR NULLIF(existing.challan_url, '') IS NOT NULL
    THEN existing.evidence_status
    ELSE EXCLUDED.evidence_status
  END,
  rule_id = EXCLUDED.rule_id, rule_version = EXCLUDED.rule_version,
  updated_at = now();

-- Verified filing identifiers and dates from the supplied records. PDFs were
-- not present in the repository, so references remain explicit evidence gaps.
INSERT INTO public.ledger_compliance_items AS existing
  (law, form, title, period, fy, due_date, status, filed_date, arn, penalty_exposure, notes, source_url, rule_id, rule_version, compliance_type, evidence_status, amount_paid)
VALUES
  ('ROC','First ADT-1','First auditor appointment filing','One-time','FY 2025-26',DATE '2025-11-27','pending',DATE '2025-11-20','AB9164930',0,'Appointed 12 Nov 2025; filed 20 Nov 2025 (7 days before 27 Nov statutory due date). Fee ₹300; no additional fee. Board resolution 02 dated 12 Nov 2025. Fee receipt BharatKosh 1-22375505882. Signed form, receipt, board extract, and intimation letter need upload to the private document vault. Filed as supplied; PDF attachments not available in this project.','https://www.mca.gov.in/content/mca/global/en/mca/e-filing/company-forms-download.html','firstAdt1','2026-10-30','statutory_filing','awaiting_evidence',300),
  ('ROC','INC-20A','Commencement of business declaration','One-time','FY 2025-26',DATE '2026-04-13','pending',DATE '2026-04-11','AC2977244',0,'Filed 11 Apr 2026, 2 days before due date. Board resolution 03 dated 11 Apr 2026. Signed form noted; fee receipt and MCA approval status are pending evidence. PDF attachment not available in this project.','https://www.mca.gov.in/content/mca/global/en/mca/e-filing/company-forms-download.html','inc20a','2026-10-30','statutory_filing','awaiting_evidence',0),
  ('ROC','Board Meeting record','First auditor appointment within 30 days of incorporation','Appointment','FY 2025-26',DATE '2025-11-14','pending',NULL,'',0,'First auditor appointed 12 Nov 2025, before the 14 Nov 2025 deadline. Resolution 02. Board extract/minutes require upload.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','firstAuditor','2026-10-30','meeting','awaiting_evidence',0),
  ('ROC','Board Meetings','Board meeting · H1 CY2026 (Resolution 03)','H1 CY2026','FY 2026-27',DATE '2026-06-30','pending',NULL,'',0,'Recorded meeting held 11 Apr 2026 under Resolution 03. Small-company half-year cadence is an assumption for CA confirmation. Meeting minutes require upload.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','boardMtg','2026-10-30','meeting','awaiting_evidence',0),
  ('ROC','Board Meetings','Board meeting · H2 CY2026','H2 CY2026','FY 2026-27',DATE '2026-12-31','pending',NULL,'',5000,'Small-company calendar-half-year cadence assumed; CA to confirm. H2 CY2026 board meeting due by 31 Dec 2026.','','boardMtg','2026-10-30','meeting','not_required',0),
  ('Income Tax','ITR-6','Income tax return · AY 2026-27','AY 2026-27','FY 2025-26',DATE '2026-10-31','pending',NULL,'',10000,'Company income tax return for FY 2025-26 / AY 2026-27. Due 31 Oct 2026; confirm current extension/circulars with CA.','https://www.incometax.gov.in/iec/foportal/','itr','2026-10-30','statutory_filing','not_required',0),
  ('Income Tax','TDS Q2 return','TDS quarterly return · Q2 FY 2026-27','Q2 FY 2026-27','FY 2026-27',DATE '2026-10-31','pending',NULL,'',15000,'Conditional: ask whether tax was deducted during Jul-Sep 2026. If yes, file by 31 Oct 2026. Applicability answer is unknown.','https://www.incometax.gov.in/iec/foportal/','tdsRet','2026-10-30','statutory_filing','not_required',0),
  ('ROC','MSME-1 H1','Outstanding MSME payments return · H1 FY 2026-27','H1 Apr-Sep 2026','FY 2026-27',DATE '2026-10-31','pending',NULL,'',25000,'Conditional: ask whether qualifying dues to registered micro/small enterprises remained unpaid for over 45 days during Apr-Sep 2026. Applicability answer is unknown.','https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html','msme1','2026-10-30','statutory_filing','not_required',0),
  ('ROC','First board meeting minutes','Obtain date and minutes for Board Resolution 01','Resolution 01','FY 2025-26',DATE '2026-10-30','pending',NULL,'',0,'First board meeting date is unknown. Ask for Resolution 01 and minutes; no completion is assumed.','','boardMeetingUnknown','2026-10-30','internal_task','not_required',0),
  ('Corporate','Statutory audit FY 2025-26','Complete statutory audit before the first AGM','FY 2025-26','FY 2025-26',DATE '2026-12-31','pending',NULL,'',0,'Complete and obtain the statutory audit before the first AGM; expected AGM deadline is 31 Dec 2026. Confirm exact audit schedule with CA.','','auditBeforeAgm','2026-10-30','internal_task','not_required',0),
  ('ROC','Accounts approval and AGM notice','Board meeting to approve accounts and convene first AGM','FY 2025-26','FY 2025-26',DATE '2026-12-31','pending',NULL,'',0,'Board approval and AGM notice must precede the first AGM. Record the actual meeting date and minutes.','','accountsBoardMeeting','2026-10-30','meeting','not_required',0),
  ('Labour','PTEC payment verification','Verify ₹2,500 PTEC payment for FY 2026-27','FY 2026-27','FY 2026-27',DATE '2027-04-30','pending',NULL,'',0,'User reports ₹2,000 paid; verify the challan and possible ₹500 shortfall. Next due date 30 Apr 2027.','https://ptax.karnataka.gov.in/','ptecPaymentReview','2026-10-30','payment','awaiting_evidence',2000)
ON CONFLICT (fy, form, period) DO UPDATE SET
  title = EXCLUDED.title, due_date = EXCLUDED.due_date,
  status = CASE WHEN existing.evidence_status = 'verified' THEN 'filed' ELSE 'pending' END,
  filed_date = CASE WHEN existing.evidence_status = 'verified' THEN existing.filed_date ELSE COALESCE(existing.filed_date, EXCLUDED.filed_date) END,
  arn = COALESCE(NULLIF(existing.arn, ''), EXCLUDED.arn),
  penalty_exposure = EXCLUDED.penalty_exposure,
  notes = EXCLUDED.notes, source_url = EXCLUDED.source_url, rule_id = EXCLUDED.rule_id,
  rule_version = EXCLUDED.rule_version, compliance_type = EXCLUDED.compliance_type,
  evidence_status = CASE
    WHEN existing.evidence_status = 'verified'
      OR NULLIF(existing.proof_url, '') IS NOT NULL
      OR NULLIF(existing.challan_url, '') IS NOT NULL
    THEN existing.evidence_status
    ELSE EXCLUDED.evidence_status
  END,
  amount_paid = GREATEST(existing.amount_paid, EXCLUDED.amount_paid),
  updated_at = now();

-- Record missing identifiers as a single applicability prompt so generation
-- never guesses that conditional obligations apply.
INSERT INTO public.ledger_applicability_answers (question_key, answer, notes, updated_at)
VALUES
  ('tds_q2_applicable','unknown','Confirm whether any tax was deducted in Q2 FY 2026-27; if yes, file the Q2 TDS return by 31 Oct 2026.',now()),
  ('msme_dues_over_45_days','unknown','Confirm qualifying unpaid dues to registered micro/small enterprises for Apr-Sep 2026; MSME-1 H1 is due 31 Oct 2026 only if applicable.',now()),
  ('advance_tax_payable_10000_or_more','unknown','Confirm estimated tax/advance-tax applicability with CA.',now()),
  ('job_work_goods','unknown','Confirm whether goods were sent to job workers.',now()),
  ('posh_10_or_more_employees','unknown','Confirm employee count and workplace applicability.',now())
ON CONFLICT (question_key) DO NOTHING;
