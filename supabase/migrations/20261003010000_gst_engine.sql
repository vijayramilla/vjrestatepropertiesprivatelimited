-- ═══════════════════════════════════════════════════════════════════════════
-- LEDGERS — GST engine: registration state machine, threshold monitoring,
-- PAN-based aggregate turnover tracking, and event-driven crossing detection.
--
-- Design notes (from the compliance architecture spec):
--   • GST registration status, threshold monitoring and compliance generation
--     are THREE independent concepts (spec §66). gst_profile holds all three.
--   • Regular and Composition are mutually exclusive taxpayer modes (§3) —
--     enforced by a CHECK constraint, not UI convention.
--   • "GST Registration Watch" is a THRESHOLD_MONITOR, not a filing (§20):
--     compliance_type distinguishes them in the database.
--   • Threshold values are rule data, not code constants (§45).
--   • Generation is idempotent via a unique index on (fy, form, period) (§49).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. GST profile (one row per company) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gst_profile (
  id TEXT PRIMARY KEY DEFAULT 'company' CHECK (id = 'company'),
  -- concept 1: registration status — exactly one active at a time
  status TEXT NOT NULL DEFAULT 'not_registered'
    CHECK (status IN ('not_registered','registration_required','application_in_progress','registered_regular','registered_composition','voluntarily_registered','cancelled','suspended','requires_review')),
  -- concept 2: threshold monitoring
  threshold_monitoring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  threshold_amount NUMERIC NOT NULL DEFAULT 2000000,
  -- registration details
  registration_type TEXT CHECK (registration_type IN ('regular','composition')),
  gstin TEXT DEFAULT '',
  registration_state TEXT DEFAULT 'Karnataka',
  effective_date DATE,
  cancellation_date DATE,
  -- concept 3: compliance generation (independent of status)
  compliance_generation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  filing_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (filing_frequency IN ('monthly','qrmp')),
  voluntary_registration BOOLEAN NOT NULL DEFAULT FALSE,
  -- exception conditions (§10/§11) — true/false/null = unknown, never inferred
  interstate_taxable_supply BOOLEAN,
  compulsory_registration_condition BOOLEAN,
  exempt_supply_only BOOLEAN,
  ecommerce_condition BOOLEAN,
  agent_condition BOOLEAN,
  reverse_charge_condition BOOLEAN,
  other_state_registration BOOLEAN,
  -- provenance (§46)
  source_url TEXT DEFAULT 'https://cbic-gst.gov.in/',
  source_title TEXT DEFAULT 'CBIC GST — Registration (CGST Act Sec 22-24)',
  rule_version TEXT DEFAULT '',
  last_verified_at TIMESTAMPTZ,
  verified_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Turnover records (PAN-based aggregate turnover, per period) ────────
CREATE TABLE IF NOT EXISTS public.gst_turnover_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,              -- 'FY 2026-27' or '2026-04'
  period_type TEXT NOT NULL DEFAULT 'annual' CHECK (period_type IN ('annual','monthly')),
  fy TEXT NOT NULL,
  opening_turnover NUMERIC NOT NULL DEFAULT 0,
  taxable_supplies NUMERIC NOT NULL DEFAULT 0,
  exempt_supplies NUMERIC NOT NULL DEFAULT 0,
  exports NUMERIC NOT NULL DEFAULT 0,
  interstate_supplies NUMERIC NOT NULL DEFAULT 0,
  other_included NUMERIC NOT NULL DEFAULT 0,
  inward_rcm NUMERIC NOT NULL DEFAULT 0,
  taxes_excluded NUMERIC NOT NULL DEFAULT 0,
  aggregate_turnover NUMERIC NOT NULL DEFAULT 0,
  as_of_date DATE,
  source TEXT DEFAULT '',            -- Books / CA / GST records / Manual
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by TEXT DEFAULT '',
  verified_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gst_turnover_fy ON public.gst_turnover_records (fy, period_type, period);

-- ── 3. Threshold crossing events — the ONLY path to registration liability ─
CREATE TABLE IF NOT EXISTS public.gst_threshold_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fy TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  previous_turnover NUMERIC NOT NULL,
  current_turnover NUMERIC NOT NULL,
  crossing_amount NUMERIC NOT NULL,
  crossing_date DATE NOT NULL,
  as_of_date DATE,
  -- review workflow
  liability_status TEXT NOT NULL DEFAULT 'requires_review'
    CHECK (liability_status IN ('requires_review','liability_established','no_liability','registered','closed')),
  registration_deadline DATE,
  deadline_basis TEXT DEFAULT '',    -- e.g. "Sec 23(2) / 30 days from crossing"
  reviewed_by TEXT DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT DEFAULT '',
  source_record_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gst_events_fy ON public.gst_threshold_events (fy);

-- ── 4. Threshold rules — value lives in data, changeable without deploy ───
CREATE TABLE IF NOT EXISTS public.gst_threshold_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_type TEXT NOT NULL DEFAULT 'services',
  entity_type TEXT DEFAULT 'any',
  state TEXT DEFAULT 'any',
  threshold NUMERIC NOT NULL,
  effective_from DATE NOT NULL DEFAULT '1900-01-01',
  effective_to DATE,
  source_url TEXT DEFAULT 'https://cbic-gst.gov.in/',
  source_title TEXT DEFAULT 'CGST Act Sec 22 — threshold registration liability',
  rule_version TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_gst_threshold_rules
  ON public.gst_threshold_rules (supply_type, entity_type, state, effective_from)
  WHERE is_active;

-- Seed the Karnataka services threshold (services: ₹20L; verified against
-- Sec 22 CGST Act — CONFIRM WITH CA before relying on it operationally).
INSERT INTO public.gst_threshold_rules (supply_type, entity_type, state, threshold, rule_version)
SELECT 'services', 'any', 'Karnataka', 2000000, '2026-10-01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.gst_threshold_rules WHERE supply_type = 'services' AND state = 'Karnataka' AND is_active
);

-- ── 5. Compliance type on existing items (§20) + idempotency (§49) ────────
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS compliance_type TEXT NOT NULL DEFAULT 'statutory_filing'
  CHECK (compliance_type IN ('statutory_filing','registration_trigger','payment','meeting','notice','renewal','document_expiry','threshold_monitor','event_based','internal_task'));
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS invalidated_reason TEXT DEFAULT '';

-- Idempotent generation: one row per FY + form + period. Existing duplicates
-- (from the pre-constraint era) would block this index — clean them first,
-- keeping the oldest row of each group.
DELETE FROM public.ledger_compliance_items a
USING public.ledger_compliance_items b
WHERE a.id > b.id AND a.fy = b.fy AND a.form = b.form AND a.period = b.period;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_items_fy_form_period
  ON public.ledger_compliance_items (fy, form, period);

CREATE INDEX IF NOT EXISTS idx_ledger_items_type ON public.ledger_compliance_items (compliance_type);
