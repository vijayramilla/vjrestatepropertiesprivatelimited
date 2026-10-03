-- ============================================================================
-- LEDGERS — registers extension: payments · notices · directors · documents
-- (complements 20261002000000_ledgers.sql: compliance items, legal cases,
--  company profile, activity log)
--
-- Security model (identical to the base ledgers migration):
--   * All reads/writes flow through /api/data-proxy, which verifies the
--     Firebase token server-side and writes with the service role.
--   * RLS is enabled with NO anon/authenticated policies and all grants
--     revoked — the publishable key gets NOTHING from these tables.
--   * Documents live in the PRIVATE `ledger-docs` bucket and are read back
--     only through short-lived signed URLs minted by the proxy.
--   * Document "versions" are new rows sharing a parent_id — old versions
--     are never overwritten or deleted by an update.
-- ============================================================================

-- ── Payments (statutory dues: challans, taxes, fees) ────────────────────────
-- Rule engine versioning: every generated obligation records the rules that
-- produced it; historical rows keep the version that applied at that time.
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS rule_version TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS public.ledger_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type TEXT DEFAULT '',             -- GST | TDS | Advance tax | Fee | Other
  authority TEXT DEFAULT '',
  compliance_item_id UUID DEFAULT NULL,     -- optional link to ledger_compliance_items.id
  title TEXT DEFAULT '',
  period TEXT DEFAULT '',
  fy TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  due_date DATE,
  paid_date DATE,
  payment_ref TEXT DEFAULT '',
  challan_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'upcoming',  -- upcoming | due | paid | overdue | reconciled
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_payments_due ON public.ledger_payments (due_date);
CREATE INDEX IF NOT EXISTS idx_ledger_payments_fy ON public.ledger_payments (fy);

-- ── Government notices (separate from court/legal cases) ────────────────────
CREATE TABLE IF NOT EXISTS public.ledger_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_type TEXT DEFAULT '',              -- GST | Income Tax | ROC | Labour | RERA | Other
  authority TEXT DEFAULT '',
  notice_no TEXT DEFAULT '',
  notice_date DATE,
  received_date DATE,
  response_deadline DATE,
  subject TEXT DEFAULT '',
  amount_involved NUMERIC DEFAULT 0,
  responsible TEXT DEFAULT '',
  advisor TEXT DEFAULT '',
  response_summary TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',      -- open | drafting | response_filed | resolved | closed
  documents_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_notices_deadline ON public.ledger_notices (response_deadline);
CREATE INDEX IF NOT EXISTS idx_ledger_notices_status ON public.ledger_notices (status);

-- ── Directors register (KYC / DSC compliance per director) ──────────────────
CREATE TABLE IF NOT EXISTS public.ledger_directors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  din TEXT DEFAULT '',
  designation TEXT DEFAULT '',              -- Director | Managing Director | Additional | Nominee
  appointment_date DATE,
  resignation_date DATE,
  kyc_status TEXT NOT NULL DEFAULT 'pending', -- pending | done | na
  kyc_due_date DATE,                        -- DIR-3 KYC window closes 30 Sep each year
  dsc_status TEXT NOT NULL DEFAULT 'na',    -- active | expired | na
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_directors_name ON public.ledger_directors (name);

-- ── Document vault (private; versions are new rows sharing parent_id) ───────
CREATE TABLE IF NOT EXISTS public.ledger_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  doc_type TEXT DEFAULT '',                 -- Return | Challan | Acknowledgement | Notice | Certificate | Contract | Other
  fy TEXT DEFAULT '',
  period TEXT DEFAULT '',
  entity_type TEXT DEFAULT '',              -- item | case | payment | notice | director | company
  entity_id UUID DEFAULT NULL,
  url TEXT DEFAULT '',                      -- external link (Drive etc.) when not uploaded
  storage_path TEXT DEFAULT '',             -- path inside the private `ledger-docs` bucket
  expiry_date DATE,
  version_no INT NOT NULL DEFAULT 1,
  parent_id UUID DEFAULT NULL,              -- id of version 1 of this document chain
  notes TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_documents_entity ON public.ledger_documents (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ledger_documents_expiry ON public.ledger_documents (expiry_date);
CREATE INDEX IF NOT EXISTS idx_ledger_documents_parent ON public.ledger_documents (parent_id);

-- ── Lockdown: revoke the publishable key everywhere, enable RLS ─────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ledger_payments',
    'ledger_notices',
    'ledger_directors',
    'ledger_documents'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- ── Storage: PRIVATE documents bucket (no public policy at all) ─────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('ledger-docs', 'ledger-docs', FALSE)
ON CONFLICT (id) DO NOTHING;
-- Deliberately NO policy grants on this bucket: reads happen exclusively via
-- service-role-signed URLs (ledger.doc.url proxy action, 60-minute expiry).
