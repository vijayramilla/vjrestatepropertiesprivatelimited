-- ============================================================================
-- VJR Estate — Firebase → Supabase site-data migration (Phase 2/3/4)
-- Run this in the Supabase SQL editor for project: eimvaxrmiizdlgonhiov
--
-- Design notes:
--  * Every table uses a TEXT primary key so Firestore document IDs are
--    preserved 1:1 (no re-mapping of references anywhere in the app).
--  * Firestore Timestamps are migrated as ISO-8601 strings into TIMESTAMPTZ
--    columns; the app's read layer wraps them in a `{ toDate() }` facade so
--    existing components keep working unchanged.
--  * Row Level Security mirrors firestore.rules: public SELECT where Firebase
--    allowed public reads; NO anon write policies anywhere. All writes flow
--    through the Vercel serverless proxy (/api/data-proxy) which verifies the
--    Firebase ID token and writes with the service-role key (RLS bypassed).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PROPERTIES (Firestore: properties)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
  id                    TEXT PRIMARY KEY,
  property_code         TEXT UNIQUE,
  title                 TEXT NOT NULL DEFAULT '',
  type                  TEXT NOT NULL DEFAULT '',
  commercial_subtype    TEXT,
  plot_subtype          TEXT,
  area                  TEXT NOT NULL DEFAULT '',
  location              TEXT NOT NULL DEFAULT '',
  price                 DOUBLE PRECISION NOT NULL DEFAULT 0,
  price_label           TEXT NOT NULL DEFAULT '',
  monthly_rental        DOUBLE PRECISION NOT NULL DEFAULT 0,
  monthly_rental_label  TEXT NOT NULL DEFAULT '',
  rental_yield          DOUBLE PRECISION,
  area_sqft             DOUBLE PRECISION NOT NULL DEFAULT 0,
  area_unit             TEXT,
  area_acres            DOUBLE PRECISION,
  area_guntas           DOUBLE PRECISION,
  price_per_sqft        DOUBLE PRECISION,
  built_up_area_sqft    DOUBLE PRECISION,
  dimensions            TEXT NOT NULL DEFAULT '',
  floor_count           INTEGER NOT NULL DEFAULT 0,
  total_units           INTEGER NOT NULL DEFAULT 0,
  available_units       INTEGER NOT NULL DEFAULT 0,
  occupancy_percent     DOUBLE PRECISION NOT NULL DEFAULT 0,
  facing                TEXT NOT NULL DEFAULT '',
  age                   TEXT NOT NULL DEFAULT '',
  status                TEXT NOT NULL DEFAULT 'Ready',
  featured              BOOLEAN NOT NULL DEFAULT FALSE,
  bbmp_approved         BOOLEAN NOT NULL DEFAULT FALSE,
  bank_loan_eligible    BOOLEAN NOT NULL DEFAULT FALSE,
  clear_title           BOOLEAN NOT NULL DEFAULT FALSE,
  katha                 TEXT NOT NULL DEFAULT '',
  highlights            TEXT[] NOT NULL DEFAULT '{}',
  amenities             TEXT[] NOT NULL DEFAULT '{}',
  description           TEXT NOT NULL DEFAULT '',
  listed_days_ago       INTEGER NOT NULL DEFAULT 0,
  extra_details         JSONB,
  images                TEXT[] NOT NULL DEFAULT '{}',
  listed_by             TEXT NOT NULL DEFAULT 'VJR Estate',
  contact_name          TEXT NOT NULL DEFAULT '',
  contact_phone         TEXT NOT NULL DEFAULT '',
  map_lat               DOUBLE PRECISION,
  map_lng               DOUBLE PRECISION,
  maps_link             TEXT,
  agent_id              TEXT NOT NULL DEFAULT '',
  agent_name            TEXT NOT NULL DEFAULT '',
  uid                   TEXT,
  user_email            TEXT,
  user_display_name     TEXT,
  city                  TEXT,
  state                 TEXT,
  pincode               TEXT,
  full_address          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_type      ON public.properties (type);
CREATE INDEX IF NOT EXISTS idx_properties_area      ON public.properties (area);
CREATE INDEX IF NOT EXISTS idx_properties_created   ON public.properties (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_featured  ON public.properties (featured);
CREATE INDEX IF NOT EXISTS idx_properties_uid       ON public.properties (uid);
CREATE INDEX IF NOT EXISTS idx_properties_status    ON public.properties (status);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "properties_public_read" ON public.properties;
CREATE POLICY "properties_public_read" ON public.properties
  FOR SELECT USING (true);
-- Writes are only allowed via the service-role proxy (no anon policy).

-- ---------------------------------------------------------------------------
-- REQUIREMENTS (Firestore: requirements — public fields)
-- Private buyer fields (paymentMode/buyerName/buyerPhone) live in
-- requirement_private, mirroring Firestore, so public reads never leak them.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requirements (
  id                  TEXT PRIMARY KEY,
  req_id              TEXT NOT NULL,
  purpose             TEXT NOT NULL,
  purpose_other       TEXT,
  property_type       TEXT NOT NULL,
  property_type_other TEXT,
  locations           TEXT[] NOT NULL DEFAULT '{}',
  budget_min          DOUBLE PRECISION NOT NULL DEFAULT 0,
  budget_max          DOUBLE PRECISION NOT NULL DEFAULT 0,
  timeline            TEXT NOT NULL,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'open',
  click_count         INTEGER NOT NULL DEFAULT 0,
  posted_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requirements_status ON public.requirements (status);
CREATE INDEX IF NOT EXISTS idx_requirements_posted ON public.requirements (posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_requirements_reqid  ON public.requirements (req_id);

ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requirements_public_read" ON public.requirements;
CREATE POLICY "requirements_public_read" ON public.requirements
  FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.requirement_private (
  id            TEXT PRIMARY KEY REFERENCES public.requirements (id) ON DELETE CASCADE,
  payment_mode  TEXT NOT NULL DEFAULT 'Other',
  buyer_name    TEXT NOT NULL DEFAULT '',
  buyer_phone   TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.requirement_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requirement_private_admin_read" ON public.requirement_private;
CREATE POLICY "requirement_private_admin_read" ON public.requirement_private
  FOR SELECT USING (false); -- admin-only via proxy (service role bypasses RLS)

-- ---------------------------------------------------------------------------
-- PROPERTY LEADS (Firestore: property_leads)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_leads (
  id                     TEXT PRIMARY KEY,
  property_id            TEXT NOT NULL,
  property_title         TEXT NOT NULL DEFAULT '',
  property_type          TEXT NOT NULL DEFAULT '',
  property_area          TEXT NOT NULL DEFAULT '',
  property_price         TEXT NOT NULL DEFAULT '',
  property_monthly_rental TEXT,
  property_url           TEXT NOT NULL DEFAULT '',
  lead_type              TEXT NOT NULL DEFAULT 'whatsapp',
  visit_date             TEXT,
  visit_time             TEXT,
  buyer_name             TEXT,
  buyer_phone            TEXT,
  buyer_lat              DOUBLE PRECISION,
  buyer_lng              DOUBLE PRECISION,
  message                TEXT NOT NULL DEFAULT '',
  source                 TEXT NOT NULL DEFAULT 'card',
  owner_uid              TEXT,
  listed_by              TEXT,
  ip_address             TEXT,
  status                 TEXT NOT NULL DEFAULT 'new',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_leads_owner ON public.property_leads (owner_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_leads_prop  ON public.property_leads (property_id);

ALTER TABLE public.property_leads ENABLE ROW LEVEL SECURITY;

-- Leads contain buyer names, phone numbers and IP addresses. NO public read:
-- the data-proxy serves them via lead.list (admin sees all, owners see their
-- own rows only). The anonymous write path (lead.create) is unchanged.
DROP POLICY IF EXISTS "property_leads_public_read" ON public.property_leads;
DROP POLICY IF EXISTS "property_leads_no_read" ON public.property_leads;
CREATE POLICY "property_leads_no_read" ON public.property_leads
  FOR SELECT USING (false);

-- ---------------------------------------------------------------------------
-- SITE SETTINGS (Firestore: settings/general + properties/_config_)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key           TEXT PRIMARY KEY,
  map_only      BOOLEAN NOT NULL DEFAULT FALSE,
  nexa_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (key) VALUES ('general') ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read" ON public.site_settings
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- USERS (Firestore: users — login tracking, suspension)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  uid           TEXT PRIMARY KEY,
  email         TEXT NOT NULL DEFAULT '',
  display_name  TEXT NOT NULL DEFAULT '',
  photo_url     TEXT NOT NULL DEFAULT '',
  login_count   INTEGER NOT NULL DEFAULT 0,
  last_login    TEXT,
  last_seen     TEXT,
  created_at    TEXT,
  suspended     BOOLEAN NOT NULL DEFAULT FALSE,
  location      JSONB,
  gps_location  JSONB,
  ip_location   JSONB,
  login_history JSONB
);

CREATE INDEX IF NOT EXISTS idx_users_suspended ON public.users (suspended);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users (last_seen);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users hold emails, login history and locations — NO public read. The app
-- checks suspension via the user.checkSuspended proxy action (self-only) and
-- the admin panel lists users via user.list (admin-only).
DROP POLICY IF EXISTS "users_public_read" ON public.users;
DROP POLICY IF EXISTS "users_no_read" ON public.users;
CREATE POLICY "users_no_read" ON public.users
  FOR SELECT USING (false);

-- ---------------------------------------------------------------------------
-- JOB OPENINGS + APPLICATIONS (Firestore: job_openings, job_applications)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_openings (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  department          TEXT NOT NULL DEFAULT '',
  type                TEXT NOT NULL DEFAULT 'Full Time',
  location            TEXT NOT NULL DEFAULT 'Bangalore',
  experience          TEXT NOT NULL DEFAULT '',
  salary              TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  responsibilities    TEXT[] NOT NULL DEFAULT '{}',
  requirements        TEXT[] NOT NULL DEFAULT '{}',
  nice_to_have        TEXT[] NOT NULL DEFAULT '{}',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  total_applications  INTEGER NOT NULL DEFAULT 0,
  department_color    TEXT NOT NULL DEFAULT '',
  posted_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  closing_date        TIMESTAMPTZ
);

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_openings_public_read" ON public.job_openings;
CREATE POLICY "job_openings_public_read" ON public.job_openings
  FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.job_applications (
  id                 TEXT PRIMARY KEY,
  job_id             TEXT NOT NULL,
  job_title          TEXT NOT NULL DEFAULT '',
  department         TEXT NOT NULL DEFAULT '',
  full_name          TEXT NOT NULL DEFAULT '',
  email              TEXT NOT NULL DEFAULT '',
  phone              TEXT NOT NULL DEFAULT '',
  current_location   TEXT NOT NULL DEFAULT '',
  current_company    TEXT NOT NULL DEFAULT '',
  "current_role"    TEXT NOT NULL DEFAULT '', -- quoted: CURRENT_ROLE is a reserved word
  total_experience   TEXT NOT NULL DEFAULT '',
  expected_salary    TEXT NOT NULL DEFAULT '',
  notice_period      TEXT NOT NULL DEFAULT '',
  linkedin_url       TEXT NOT NULL DEFAULT '',
  resume_url         TEXT NOT NULL DEFAULT '',
  resume_file_name   TEXT NOT NULL DEFAULT '',
  cover_letter       TEXT NOT NULL DEFAULT '',
  why_vjr            TEXT NOT NULL DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'Applied',
  status_history     JSONB NOT NULL DEFAULT '[]',
  admin_notes        TEXT NOT NULL DEFAULT '',
  rating             INTEGER NOT NULL DEFAULT 0,
  tags               TEXT[] NOT NULL DEFAULT '{}',
  is_shortlisted     BOOLEAN NOT NULL DEFAULT FALSE,
  viewed_by_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id       TEXT,
  applicant_uid      TEXT,
  applicant_email    TEXT,
  pin_code           TEXT NOT NULL DEFAULT '',
  applicant_lat      DOUBLE PRECISION,
  applicant_lng      DOUBLE PRECISION,
  applicant_area     TEXT,
  applied_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications (status);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Applications hold candidate PII (email, phone, GPS, resume URL) and admin
-- notes — NO public read. Served via the application.list proxy action
-- (admin-only). The public apply path writes through the proxy unchanged.
DROP POLICY IF EXISTS "job_applications_public_read" ON public.job_applications;
DROP POLICY IF EXISTS "job_applications_no_read" ON public.job_applications;
CREATE POLICY "job_applications_no_read" ON public.job_applications
  FOR SELECT USING (false);

-- ---------------------------------------------------------------------------
-- AUCTIONS + BIDS (Firestore: auctions, auction_bids; RTDB mirror removed)
-- currentBid/totalBids become the live source; Supabase Realtime broadcasts
-- updates to open pages (replaces the Realtime Database mirror).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auctions (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'Residential',
  location            TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL DEFAULT 'Bangalore',
  images              TEXT[] NOT NULL DEFAULT '{}',
  description         TEXT NOT NULL DEFAULT '',
  starting_bid        DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_bid         DOUBLE PRECISION NOT NULL DEFAULT 0,
  reserve_price       DOUBLE PRECISION NOT NULL DEFAULT 0,
  bid_increment       DOUBLE PRECISION NOT NULL DEFAULT 100000,
  total_bids          INTEGER NOT NULL DEFAULT 0,
  auction_start_time  TIMESTAMPTZ,
  auction_end_time    TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'upcoming',
  area_sqft           DOUBLE PRECISION,
  property_type       TEXT,
  khata               TEXT,
  facing              TEXT,
  registered_bidders  INTEGER NOT NULL DEFAULT 0,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  map_lat             DOUBLE PRECISION,
  map_lng             DOUBLE PRECISION,
  maps_link           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auctions_category ON public.auctions (category);
CREATE INDEX IF NOT EXISTS idx_auctions_status   ON public.auctions (status);
CREATE INDEX IF NOT EXISTS idx_auctions_featured ON public.auctions (is_featured);

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auctions_public_read" ON public.auctions;
CREATE POLICY "auctions_public_read" ON public.auctions
  FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.auction_bids (
  id           TEXT PRIMARY KEY,
  auction_id   TEXT NOT NULL REFERENCES public.auctions (id) ON DELETE CASCADE,
  bidder_id    TEXT NOT NULL,
  bidder_name  TEXT NOT NULL,
  amount       DOUBLE PRECISION NOT NULL,
  is_winning   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction ON public.auction_bids (auction_id, created_at DESC);

ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auction_bids_public_read" ON public.auction_bids;
CREATE POLICY "auction_bids_public_read" ON public.auction_bids
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- RPC: place_bid — atomic, race-safe bid placement (replaces the client-side
-- Firestore + RTDB double-write). Only the proxy calls this, with a verified
-- Firebase token; bidder_id is set server-side from the verified token.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_bid(
  p_auction_id TEXT,
  p_bidder_id TEXT,
  p_bidder_name TEXT,
  p_amount DOUBLE PRECISION
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
  v_min_bid DOUBLE PRECISION;
BEGIN
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;

  IF v_auction.status IN ('closed', 'sold') THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  IF v_auction.status = 'upcoming' THEN
    RAISE EXCEPTION 'Bidding has not started';
  END IF;

  v_min_bid := GREATEST(v_auction.current_bid, v_auction.starting_bid)
               + GREATEST(v_auction.bid_increment, 1);
  IF p_amount < v_min_bid THEN
    RAISE EXCEPTION 'Bid must be at least %', v_min_bid;
  END IF;

  INSERT INTO public.auction_bids (id, auction_id, bidder_id, bidder_name, amount, is_winning)
  VALUES (md5(concat(p_auction_id, ':', p_bidder_id, ':', p_amount, ':', clock_timestamp()::text)),
          p_auction_id, p_bidder_id, p_bidder_name, p_amount, TRUE);

  UPDATE public.auctions
     SET current_bid = p_amount,
         total_bids  = total_bids + 1
   WHERE id = p_auction_id;

  RETURN jsonb_build_object(
    'id', p_auction_id,
    'currentBid', p_amount,
    'totalBids', v_auction.total_bids + 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_bid(TEXT, TEXT, TEXT, DOUBLE PRECISION) TO service_role;
REVOKE EXECUTE ON FUNCTION public.place_bid(TEXT, TEXT, TEXT, DOUBLE PRECISION) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: increment_requirement_click — public, idempotent-safe click counter
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_requirement_click(p_req_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.requirements
     SET click_count = click_count + 1
   WHERE id = p_req_id
   RETURNING click_count INTO v_count;

  IF v_count IS NULL THEN
    RAISE EXCEPTION 'Requirement not found';
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_requirement_click(TEXT) TO anon, authenticated;
-- Public (anonymous) click counting is intended — mirrors Firestore's
-- isValidClickCountIncrement rule. Guarded by the proxy's rate limit.

-- ---------------------------------------------------------------------------
-- RPC: increment_job_applications — cheap public counter on job openings
-- (mirrors the old Firebase onApplicationSubmitted cloud function).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_job_applications(p_job_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.job_openings
     SET total_applications = total_applications + 1
   WHERE id = p_job_id
   RETURNING total_applications INTO v_count;
  IF v_count IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_job_applications(TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_job_applications(TEXT) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- STORAGE BUCKETS (Firebase Storage → Supabase Storage)
--   property-images/{propertyId}/{timestamp}-{filename}
--   auction-images/{auctionId}/{timestamp}-{filename}
--   resumes/{jobId}/{timestamp}-{filename}
-- Public read (same as Firebase download URLs); writes ONLY via proxy.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('auction-images', 'auction-images', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('property-images', 'auction-images', 'resumes')
  );

-- Enable Realtime on the PUBLIC tables the app subscribes to (Firestore
-- onSnapshot parity). PII tables (users, job_applications, property_leads)
-- are intentionally NOT published — their reads go through the proxy.
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requirements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_openings;

-- ---------------------------------------------------------------------------
-- RPC: get_storage_stats — admin storage dashboard aggregate
-- Aggregates storage.objects per bucket + the largest files, so the admin
-- Storage page can render usage charts without exposing the storage schema
-- to PostgREST. SECURITY DEFINER: the owner (postgres) bypasses storage RLS;
-- only the service-role proxy may execute it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_storage_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'totalBytes', COALESCE(sum((metadata->>'size')::bigint), 0),
    'totalObjects', count(*),
    'buckets', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('bucket', b.bucket_id, 'objects', b.cnt, 'bytes', b.bytes)
        ORDER BY b.bytes DESC
      )
      FROM (
        SELECT bucket_id, count(*) AS cnt,
               COALESCE(sum((metadata->>'size')::bigint), 0) AS bytes
        FROM storage.objects
        GROUP BY bucket_id
      ) b
    ), '[]'::jsonb),
    'largest', COALESCE((
      SELECT jsonb_agg(
        x ORDER BY (x->>'bytes')::bigint DESC NULLS LAST
      )
      FROM (
        SELECT jsonb_build_object(
          'bucket', o.bucket_id,
          'name', o.name,
          'bytes', (o.metadata->>'size')::bigint
        ) AS x
        FROM storage.objects o
        ORDER BY (o.metadata->>'size')::bigint DESC NULLS LAST
        LIMIT 15
      ) t
    ), '[]'::jsonb)
  )
  FROM storage.objects;
$$;

REVOKE ALL ON FUNCTION public.get_storage_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_storage_stats() TO service_role;

-- ---------------------------------------------------------------------------
-- SEED JOB OPENINGS (Firestore seeded these client-side on first load; on
-- Supabase, empty tables are seeded here so the Careers page is never blank).
-- ---------------------------------------------------------------------------
INSERT INTO public.job_openings (id, title, department, type, location, experience, salary, description, responsibilities, requirements, nice_to_have, is_active, is_featured, total_applications, department_color, posted_at)
VALUES
  ('seed-senior-sales-manager', 'Senior Sales Manager', 'Sales', 'Full Time', 'Bangalore', '3-6 Years', '₹66K-1.25L per month + Incentives', 'Lead our premium property sales team and drive revenue growth across Bangalore''s real estate market.',
   ARRAY['Drive property sales and achieve monthly targets','Build and maintain relationships with HNI clients','Conduct property site visits and presentations','Negotiate and close high-value deals','Mentor and guide junior sales executives'],
   ARRAY['3+ years in real estate sales','Proven track record of closing ₹1Cr+ deals','Strong network in Bangalore real estate','Excellent communication in English and Kannada','Own vehicle and valid driving license'],
   ARRAY[]::TEXT[], TRUE, TRUE, 0, '#EF4444', now()),
  ('seed-telecalling-agent', 'Telecaller / Inside Sales Agent', 'Sales', 'Full Time', 'Bangalore', '0-2 Years', '₹20K-37K per month + Incentives', 'Connect with potential property buyers, qualify leads, and schedule site visits for our sales team.',
   ARRAY['Make outbound calls to potential property buyers','Qualify leads and understand buyer requirements','Schedule site visits for the sales team','Follow up with existing leads in CRM','Maintain daily call logs and reports','Achieve daily/weekly call and conversion targets'],
   ARRAY['Good communication skills in Kannada, Hindi and English','Basic computer knowledge','Positive attitude and target-oriented mindset','Freshers welcome — real estate experience preferred','Ability to handle rejection and stay motivated'],
   ARRAY['Previous telecalling or BPO experience','Knowledge of Bangalore localities','Experience with CRM tools'], TRUE, TRUE, 0, '#EF4444', now()),
  ('seed-real-estate-agent', 'Real Estate Agent', 'Sales', 'Full Time', 'Bangalore', '1-3 Years', '₹25K-50K per month + High Incentives', 'Help clients buy and sell properties across Bangalore with expert guidance and local market knowledge.',
   ARRAY['Source and list new properties on VJR platform','Guide buyers through property selection process','Conduct property inspections and valuations','Handle documentation and legal verification','Build strong referral network'],
   ARRAY['Real estate license or willingness to obtain','Knowledge of Bangalore property market','Strong interpersonal and negotiation skills','Self-motivated and target-driven'],
   ARRAY[]::TEXT[], TRUE, FALSE, 0, '#EF4444', now()),
  ('seed-fullstack-developer', 'Full Stack Developer', 'Technology', 'Full Time', 'Bangalore', '2-4 Years', '₹66K-1.5L per month', 'Build and scale VJR Estate''s technology platform — from property listings to AI-powered features.',
   ARRAY['Develop and maintain React + TypeScript frontend','Build Firebase/Node.js backend services','Implement AI/ML features for property intelligence','Optimize performance and SEO','Work on Google Maps integrations and geospatial features'],
   ARRAY['Proficiency in React, TypeScript, Node.js','Experience with Firebase or similar BaaS','Strong JavaScript/TypeScript fundamentals','Experience with REST APIs and real-time systems','Git and modern development workflows'],
   ARRAY['Experience with Gemini/OpenAI APIs','Real estate tech or PropTech background','Knowledge of geospatial technologies'], TRUE, TRUE, 0, '#3B82F6', now()),
  ('seed-digital-marketing', 'Digital Marketing Executive', 'Marketing', 'Full Time', 'Bangalore', '1-3 Years', '₹33K-58K per month', 'Drive VJR Estate''s digital presence and generate quality leads through strategic marketing campaigns.',
   ARRAY['Manage Google Ads and Meta Ads campaigns','Create property listing content and social media posts','SEO optimization for vjrestate.com','Email marketing and lead nurturing campaigns','Analyse campaign performance and ROI'],
   ARRAY['Experience with Google Ads and Meta Ads','Content creation and copywriting skills','Google Analytics and SEO knowledge','Creative mindset with eye for design'],
   ARRAY[]::TEXT[], TRUE, FALSE, 0, '#8B5CF6', now()),
  ('seed-customer-relations', 'Customer Relations Executive', 'Customer Relations', 'Full Time', 'Bangalore', '1-2 Years', '₹25K-42K per month', 'Be the voice of VJR Estate — ensure every client has an exceptional experience throughout their property journey.',
   ARRAY['Handle inbound calls and WhatsApp inquiries','Coordinate between buyers, sellers and agents','Manage post-sale documentation support','Resolve client complaints and feedback','Maintain client satisfaction scores'],
   ARRAY['Excellent communication in English, Hindi, Kannada','Patient, empathetic and solution-oriented','Basic CRM and MS Office knowledge','Customer service experience preferred'],
   ARRAY[]::TEXT[], TRUE, FALSE, 0, '#10B981', now())
ON CONFLICT (id) DO NOTHING;
