-- ═══════════════════════════════════════════════════════════════════════════
-- LEDGERS — Company Master Data (incorporation baseline).
--
-- Source documents (authoritative for incorporation facts):
--   Certificate of Incorporation · MOA · AOA · SPICe+ Part B · DIN letter.
-- Every seeded row carries source + verification_status. Facts the documents
-- do not establish stay NULL/NEEDS_VERIFICATION — never 0/false (spec §37).
--
-- Design: normalized tables, historical rows preserved (never overwritten),
-- ownership CALCULATED from share counts (not stored percentages).
-- Idempotent: safe to run repeatedly.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Share capital (versioned snapshots; incorporation row seeded) ──────
CREATE TABLE IF NOT EXISTS public.ledger_share_capital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capital_type TEXT NOT NULL DEFAULT 'equity',
  authorised_amount NUMERIC NOT NULL DEFAULT 0,
  authorised_shares INT NOT NULL DEFAULT 0,
  subscribed_amount NUMERIC NOT NULL DEFAULT 0,
  subscribed_shares INT NOT NULL DEFAULT 0,
  face_value NUMERIC NOT NULL DEFAULT 10,
  class_name TEXT NOT NULL DEFAULT 'Equity Class A',
  effective_from DATE NOT NULL,
  effective_to DATE,
  source TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('confirmed','unverified','needs_review','conflicting','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_share_capital_eff ON public.ledger_share_capital (effective_from DESC);

INSERT INTO public.ledger_share_capital
  (authorised_amount, authorised_shares, subscribed_amount, subscribed_shares, face_value, class_name, effective_from, source, verification_status)
SELECT 100000, 10000, 10000, 1000, 10, 'Equity Class A', DATE '2025-10-15',
       'SPICe+ Part B / INC-32 (page 1) · Certificate of Incorporation', 'confirmed'
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_share_capital WHERE effective_from = DATE '2025-10-15');

-- ── 2. Shareholders (master) + incorporation shareholding snapshot ────────
CREATE TABLE IF NOT EXISTS public.ledger_shareholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual','entity')),
  pan TEXT DEFAULT '',
  occupation TEXT DEFAULT '',
  original_subscriber BOOLEAN NOT NULL DEFAULT FALSE,
  current_shareholder BOOLEAN NOT NULL DEFAULT TRUE,
  din TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('confirmed','unverified','needs_review','conflicting','expired')),
  effective_from DATE,
  effective_to DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shareholders_name ON public.ledger_shareholders (lower(name))
  WHERE effective_to IS NULL;

CREATE TABLE IF NOT EXISTS public.ledger_shareholding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shareholder_id UUID NOT NULL REFERENCES public.ledger_shareholders(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL DEFAULT 'current'
    CHECK (snapshot_type IN ('incorporation','current','historical')),
  shares_held INT NOT NULL,
  share_class TEXT NOT NULL DEFAULT 'Equity Class A',
  face_value NUMERIC NOT NULL DEFAULT 10,
  subscription_value NUMERIC NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_to DATE,
  source TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('confirmed','unverified','needs_review','conflicting','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shareholding_sh ON public.ledger_shareholding (shareholder_id, snapshot_type);

-- Seed shareholders + incorporation snapshot (Vijay 990 / Devendra 10).
INSERT INTO public.ledger_shareholders (name, type, occupation, original_subscriber, current_shareholder, source, verification_status, effective_from)
SELECT 'Vijay Ram', 'individual', 'Business', TRUE, TRUE, 'MOA / SPICe+ Part B (subscriber section)', 'confirmed', DATE '2025-10-15'
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_shareholders WHERE lower(name) = 'vijay ram');

INSERT INTO public.ledger_shareholders (name, type, occupation, original_subscriber, current_shareholder, source, verification_status, effective_from, notes)
SELECT 'Chinnigari Devendra Reddy', 'individual', 'Business', TRUE, TRUE, 'MOA / SPICe+ Part B (subscriber section)', 'needs_review', DATE '2025-10-15',
       'DIN not available in supplied incorporation documents — NEEDS_VERIFICATION'
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_shareholders WHERE lower(name) = 'chinnigari devendra reddy');

INSERT INTO public.ledger_shareholding (shareholder_id, snapshot_type, shares_held, subscription_value, effective_from, source, verification_status)
SELECT s.id, 'incorporation', 990, 9900, DATE '2025-10-15', 'MOA / SPICe+ Part B (subscriber section)', 'confirmed'
FROM public.ledger_shareholders s WHERE lower(s.name) = 'vijay ram'
AND NOT EXISTS (SELECT 1 FROM public.ledger_shareholding h WHERE h.shareholder_id = s.id AND h.snapshot_type = 'incorporation');

INSERT INTO public.ledger_shareholding (shareholder_id, snapshot_type, shares_held, subscription_value, effective_from, source, verification_status)
SELECT s.id, 'incorporation', 10, 100, DATE '2025-10-15', 'MOA / SPICe+ Part B (subscriber section)', 'confirmed'
FROM public.ledger_shareholders s WHERE lower(s.name) = 'chinnigari devendra reddy'
AND NOT EXISTS (SELECT 1 FROM public.ledger_shareholding h WHERE h.shareholder_id = s.id AND h.snapshot_type = 'incorporation');

-- ── 3. Address history (incorporation row preserved; never overwritten) ───
CREATE TABLE IF NOT EXISTS public.ledger_address_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_type TEXT NOT NULL
    CHECK (address_type IN ('incorporation_registered_address','current_registered_address','correspondence_address','principal_place_of_business','additional_place_of_business')),
  full_address TEXT NOT NULL,
  state TEXT DEFAULT 'Karnataka',
  district TEXT DEFAULT '',
  city TEXT DEFAULT '',
  pin TEXT DEFAULT '',
  effective_from DATE NOT NULL,
  effective_to DATE,
  source TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('confirmed','unverified','needs_review','conflicting','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ledger_address_history
  (address_type, full_address, state, district, city, pin, effective_from, source, verification_status)
SELECT 'incorporation_registered_address',
       'C/O VASUDEVA, KARATAGI, SINDHANUR BASAVANNA CAMP, Karatgi, Gangawathi, Koppal - 583229, Karnataka, India',
       'Karnataka', 'Koppal', 'Karatgi', '583229', DATE '2025-10-15',
       'Certificate of Incorporation', 'confirmed'
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_address_history WHERE address_type = 'incorporation_registered_address');

-- ── 4. MOA objects (what the company MAY do — not what it DOES) ───────────
CREATE TABLE IF NOT EXISTS public.ledger_moa_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type TEXT NOT NULL DEFAULT 'principal' CHECK (object_type IN ('principal','ancillary')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  moa_supported BOOLEAN NOT NULL DEFAULT TRUE,
  currently_conducted TEXT NOT NULL DEFAULT 'unknown'
    CHECK (currently_conducted IN ('active','inactive','planned','not_conducted','unknown','requires_review')),
  source TEXT NOT NULL DEFAULT 'Memorandum of Association',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ledger_moa_objects (object_type, title, description)
SELECT v.object_type, v.title, v.description FROM (VALUES
  ('principal', 'Rental income property dealing', 'Dealing in rental-income properties including PG buildings and commercial properties'),
  ('principal', 'Property sourcing on commission', 'Sourcing properties from sellers for clients on commission basis'),
  ('principal', 'Property purchase & sale', 'Purchase, sale and acquisition of real estate, buildings, houses and shops'),
  ('principal', 'Property development & leasing', 'Development, lease and letting of apartments and buildings'),
  ('principal', 'Property-related agency activity', 'Property-related supporting and agency activities')
) AS v(object_type, title, description)
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_moa_objects);

-- ── 5. AOA / constitution metadata ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ledger_constitution (
  id TEXT PRIMARY KEY DEFAULT 'company' CHECK (id = 'company'),
  private_company BOOLEAN NOT NULL DEFAULT TRUE,
  limited_by_shares BOOLEAN NOT NULL DEFAULT TRUE,
  table_f_applicable BOOLEAN NOT NULL DEFAULT TRUE,
  aoa_version TEXT DEFAULT 'Incorporation AOA (Table F)',
  source TEXT DEFAULT 'Articles of Association',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.ledger_constitution (id) VALUES ('company') ON CONFLICT (id) DO NOTHING;

-- ── 6. Director master: provenance columns (table exists; extend safely) ──
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS father_name TEXT DEFAULT '';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Indian';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS occupation TEXT DEFAULT '';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'promoter';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS executive_status TEXT DEFAULT 'executive';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS din_status TEXT NOT NULL DEFAULT 'not_available'
  CHECK (din_status IN ('confirmed','not_available','needs_verification'));
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS date_source TEXT DEFAULT '';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
  CHECK (verification_status IN ('confirmed','unverified','needs_review','conflicting','expired'));
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS shares_held INT;

-- Seed first directors (idempotent by DIN when known, else name).
-- ledger_directors has kyc_status, no `status` col — active status is derived
-- from resignation_date IS NULL, matching the existing table shape.
INSERT INTO public.ledger_directors (name, din, designation, category, appointment_date, father_name, date_of_birth, nationality, occupation, din_status, date_source, source, verification_status)
SELECT 'Vijay Ram', '11343816', 'Director', 'promoter', DATE '2025-10-15',
       'Y Dharma Apparao', DATE '2005-06-06', 'Indian', 'Business', 'confirmed', 'INCORPORATION_DOCUMENT',
       'DIN Approval Letter dated 15 Oct 2025 + SPICe+ Part B', 'confirmed'
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_directors WHERE din = '11343816');

INSERT INTO public.ledger_directors (name, din, designation, category, appointment_date, father_name, date_of_birth, nationality, occupation, notes, din_status, date_source, source, verification_status)
SELECT 'Chinnigari Devendra Reddy', NULL, 'Director', 'promoter', DATE '2025-10-15',
       'Chinnigari Bhaskar Reddy', DATE '2000-04-04', 'Indian', 'Business',
       'Born: Chittoor · Education: Bachelor''s Degree', 'not_available', 'INCORPORATION_DOCUMENT',
       'AOA (first directors) + SPICe+ (subscriber-cum-director)', 'needs_review'
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_directors WHERE lower(name) = 'chinnigari devendra reddy');
