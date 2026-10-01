-- LEDGERS — company compliance calendar + legal case register.
-- Written only through the data-proxy (service-role key). RLS enabled with
-- no anon policies: direct client access is denied by default.
CREATE TABLE IF NOT EXISTS public.ledger_compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law TEXT NOT NULL,                        -- ROC | GST | Income Tax | Labour | Other
  form TEXT NOT NULL,                       -- GSTR-3B, AOC-4, 26Q, PT…
  title TEXT NOT NULL,
  period TEXT NOT NULL,                     -- '2026-04' | 'Q1 FY26-27' | 'FY 2026-27'
  fy TEXT NOT NULL,                         -- 'FY 2026-27'
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | in_progress | filed | na
  owner TEXT DEFAULT '',
  filed_date DATE,
  arn TEXT DEFAULT '',
  penalty_exposure NUMERIC NOT NULL DEFAULT 0, -- est. ₹ if missed
  notes TEXT DEFAULT '',
  proof_url TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_items_due ON public.ledger_compliance_items (due_date);
ALTER TABLE public.ledger_compliance_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ledger_legal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_no TEXT DEFAULT '',
  title TEXT NOT NULL,
  authority TEXT DEFAULT '',                -- GST Dept | IT Dept | NCLT | Civil Court…
  case_type TEXT DEFAULT '',                -- Notice | Appeal | Hearing | Inquiry
  status TEXT NOT NULL DEFAULT 'open',      -- open | reply_filed | hearing | closed
  filed_on DATE,
  next_hearing_on DATE,
  reply_due_on DATE,
  advocate TEXT DEFAULT '',
  advocate_phone TEXT DEFAULT '',
  description TEXT DEFAULT '',
  outcome_notes TEXT DEFAULT '',
  documents_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_cases_hearing ON public.ledger_legal_cases (next_hearing_on);
ALTER TABLE public.ledger_legal_cases ENABLE ROW LEVEL SECURITY;

-- Company profile — one row (id='company'). Entity type drives which
-- compliance rules apply (Pvt Ltd → ROC annual set, LLP → Form 11/8,
-- Proprietorship → no ROC at all, etc.). Registrations is a text array of
-- held registrations (gst, pf, esi, pt, ...).
CREATE TABLE IF NOT EXISTS public.ledger_company_profile (
  id TEXT PRIMARY KEY DEFAULT 'company' CHECK (id = 'company'),
  name TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT 'pvtltd',  -- pvtltd | opc | llp | partnership | proprietorship
  incorporated_on DATE,
  fy_start_month INT NOT NULL DEFAULT 4,       -- April (India default)
  pan TEXT DEFAULT '',
  tan TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  gst_scheme TEXT NOT NULL DEFAULT 'monthly',  -- monthly | qrmp
  registered_office TEXT DEFAULT '',
  cin TEXT DEFAULT '',
  registrations TEXT[] NOT NULL DEFAULT '{}',
  turnover_band TEXT DEFAULT '',
  employee_count INT DEFAULT 0,
  ca_name TEXT DEFAULT '',
  cs_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ledger_company_profile ENABLE ROW LEVEL SECURITY;

-- Extended fields on items (set by later rules; safe additive columns).
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS authority TEXT DEFAULT '';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'monthly';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS reminders_sent JSONB NOT NULL DEFAULT '[]';
