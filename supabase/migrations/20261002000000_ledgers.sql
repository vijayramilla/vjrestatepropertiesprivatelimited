-- ============================================================================
-- LEDGERS — company compliance calendar + legal case register
-- Company profile · obligations · legal cases · audit trail · logo storage
--
-- Security model (mirrors supabase/migrations/20260820000000_crm_rls_lockdown.sql):
--   * All reads/writes flow through /api/data-proxy, which verifies the
--     Firebase token server-side and writes with the service role.
--   * RLS is enabled with NO anon/authenticated policies and all grants
--     revoked — the publishable key gets NOTHING from these tables.
--   * The audit log has no UPDATE/DELETE grants even for the dashboard user;
--     only the service role (the proxies) can append.
-- ============================================================================

-- ── Compliance items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ledger_compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law TEXT NOT NULL,
  form TEXT NOT NULL,
  title TEXT NOT NULL,
  period TEXT NOT NULL,
  fy TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | in_progress | filed | na
  owner TEXT DEFAULT '',
  filed_date DATE,
  arn TEXT DEFAULT '',
  penalty_exposure NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  proof_url TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  assignee TEXT DEFAULT '',
  priority TEXT DEFAULT 'normal',           -- low | normal | high
  challan_url TEXT DEFAULT '',
  authority TEXT DEFAULT '',
  recurrence TEXT DEFAULT 'monthly',
  reminders_sent JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_items_due ON public.ledger_compliance_items (due_date);
CREATE INDEX IF NOT EXISTS idx_ledger_items_fy ON public.ledger_compliance_items (fy);
-- Idempotent re-runs: add any column an older version of this table lacks.
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS assignee TEXT DEFAULT '';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS challan_url TEXT DEFAULT '';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS authority TEXT DEFAULT '';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'monthly';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS reminders_sent JSONB NOT NULL DEFAULT '[]';

-- ── Legal cases ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ledger_legal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_no TEXT DEFAULT '',
  title TEXT NOT NULL,
  authority TEXT DEFAULT '',
  case_type TEXT DEFAULT '',                -- Notice | Appeal | Hearing | Inquiry | Civil
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

-- ── Company profile (single row, id='company') ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.ledger_company_profile (
  id TEXT PRIMARY KEY DEFAULT 'company' CHECK (id = 'company'),
  name TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT 'pvtltd',  -- pvtltd | opc | llp | partnership | proprietorship
  incorporated_on DATE,
  fy_start_month INT NOT NULL DEFAULT 4,
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
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Audit trail (append-only via app; no client grants at all) ──────────────
CREATE TABLE IF NOT EXISTS public.ledger_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,                -- item | case | profile
  entity_id TEXT DEFAULT '',
  action TEXT NOT NULL,                     -- created | updated | deleted
  summary TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_log_created ON public.ledger_activity_log (created_at DESC);

-- ── Lockdown: revoke the publishable key everywhere, enable RLS ─────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ledger_compliance_items',
    'ledger_legal_cases',
    'ledger_company_profile',
    'ledger_activity_log'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- ── Storage: logo bucket (public read, service-role write) ──────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('ledger-assets', 'ledger-assets', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Public can view logos; nobody writes through the publishable key.
DROP POLICY IF EXISTS "ledger assets public read" ON storage.objects;
CREATE POLICY "ledger assets public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ledger-assets');

REVOKE ALL ON TABLE storage.objects FROM anon, authenticated;
GRANT SELECT ON TABLE storage.objects TO anon, authenticated;
