-- VJR Estate CRM — Employee KYC onboarding + standard profile fields
-- Adds:
--   * employee_kyc (one row per employee: submission status + review trail)
--   * employee_kyc_documents (uploaded Aadhaar/PAN document images)
--   * extra personal columns commonly required at onboarding (DOB, gender,
--     father/spouse name, alternate phone)

-- ─── 1. Extra standard profile columns ────────────────────────────────────
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS father_or_spouse_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS alternate_phone TEXT DEFAULT '';

-- ─── 2. KYC record (one per employee) ─────────────────────────────────────
-- status values:
--   'pending'            — employee submitted documents, awaiting admin review
--   'changes_requested'  — admin asked for corrections (employee may resubmit)
--   'verified'           — admin approved the KYC
CREATE TABLE IF NOT EXISTS public.employee_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employee_kyc_employee ON public.employee_kyc(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_kyc_status ON public.employee_kyc(status);

-- ─── 3. KYC document images ───────────────────────────────────────────────
-- doc_type values: 'aadhaar_front', 'aadhaar_back', 'pan'
-- One latest image per (employee, doc_type) — re-uploads replace it.
CREATE TABLE IF NOT EXISTS public.employee_kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, doc_type)
);
CREATE INDEX IF NOT EXISTS idx_employee_kyc_docs_employee ON public.employee_kyc_documents(employee_id);

-- ─── 4. Access model ──────────────────────────────────────────────────────
-- Same permissive policy as the other employee tables: writes go through the
-- service-role proxy only; RLS is on to keep the model consistent.
ALTER TABLE public.employee_kyc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.employee_kyc;
CREATE POLICY "Enable all for all users" ON public.employee_kyc FOR ALL USING (true);

ALTER TABLE public.employee_kyc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.employee_kyc_documents;
CREATE POLICY "Enable all for all users" ON public.employee_kyc_documents FOR ALL USING (true);
