import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { generateComplianceCalendar, generateComplianceCalendarWithSummary, evaluateGst, gstProfileFromLegacy, RULES_VERSION } from './ledger-rules.mjs';
import { LEDGER_NOTIFICATIONS_DDL, scanAndNotify } from './ledger-reminders.mjs';

/**
 * Site-data write proxy (Firebase Auth → Supabase).
 *
 * All Supabase writes flow through this Vercel function:
 *   1. Firebase ID token is verified server-side (identitytoolkit REST API).
 *   2. The caller is classified as admin / logged-in user / anonymous.
 *   3. The requested action runs with the Supabase service-role key, which
 *      never ships to the browser (bypasses RLS — the proxy IS the rule).
 *
 * Reads stay direct from the browser via the anon key + public RLS policies.
 */

const SUPABASE_SERVICE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_REQ_SERVICE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? ''
).trim().replace(/^(['"])(.*)\1$/, '$2');
const supabaseAdmin = createClient(
  process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co',
  SUPABASE_SERVICE_KEY,
);

const ADMIN_EMAILS = [
  'vijaykodamasuru2023@gmail.com',
  'vijay@vjrestate.in',
  'vijayramv229@gmail.com',
];
const ADMIN_UID = process.env.VITE_ADMIN_UID ?? 'AhaNy8oyMHOFsB3u0dQhG0E0by43';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY ?? '';
function assertSupabaseServiceKey() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase service key is missing. Configure SUPABASE_SERVICE_ROLE_KEY on the server.');
  }
  if (SUPABASE_SERVICE_KEY.split('.').length !== 3) {
    throw new Error('Supabase service key is invalid. Configure the service-role JWT, not an anon or publishable key.');
  }
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB binary (~4 MB base64, under Vercel's 4.5 MB body limit)
const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|png|webp|gif|avif)$/;
const ALLOWED_RESUME_TYPES = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain)$/;

function normalizeEmail(email: string) {
  return (email ?? '').trim().toLowerCase();
}

function isSuperAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

function err(res: any, status: number, msg: string) {
  return res.status(status).json({ error: msg });
}

// ── Token verification ──────────────────────────────────────────────────────

interface AuthInfo {
  authorized: boolean;
  email: string;
  uid: string;
  role?: string;
  permissions?: string[] | null;
}

async function verifyToken(token: string): Promise<AuthInfo> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      },
    );
    if (!res.ok) return { authorized: false, email: '', uid: '' };
    const data = await res.json();
    const user = data.users?.[0];
    const email = normalizeEmail(user?.email ?? '');
    const uid = user?.localId ?? '';
    if (!uid) return { authorized: false, email: '', uid: '' };
    if (isSuperAdminEmail(email) || uid === ADMIN_UID) {
      return { authorized: true, email, uid, role: 'super_admin', permissions: null };
    }
    const { data: admins } = await supabaseAdmin
      .from('admin_users')
      .select('id,role,permissions')
      .eq('email', email)
      .maybeSingle();
    if (admins) {
      return { authorized: true, email, uid, role: admins.role, permissions: admins.permissions };
    }
    // Any verified Firebase user is authenticated (but not an admin).
    return { authorized: true, email, uid, role: 'user', permissions: null };
  } catch {
    return { authorized: false, email: '', uid: '' };
  }
}

function isAdmin(auth: AuthInfo | null): boolean {
  return auth?.role === 'super_admin' || (auth?.role ?? '') !== 'user';
}

const PROPERTY_COLUMNS = new Set([
  'id', 'property_code', 'title', 'type', 'commercial_subtype', 'plot_subtype',
  'area', 'location', 'price', 'price_label', 'monthly_rental', 'monthly_rental_label',
  'rental_yield', 'area_sqft', 'area_unit', 'area_acres', 'area_guntas',
  'price_per_sqft', 'built_up_area_sqft', 'dimensions', 'floor_count',
  'total_units', 'available_units', 'occupancy_percent', 'facing', 'age',
  'status', 'featured', 'bank_loan_eligible',
  'katha', 'highlights', 'amenities', 'description', 'listed_days_ago',
  'extra_details', 'images', 'listed_by', 'contact_name', 'contact_phone',
  'map_lat', 'map_lng', 'maps_link', 'agent_id', 'agent_name', 'uid',
  'user_email', 'user_display_name', 'city', 'state', 'pincode',
  'full_address', 'created_at', 'updated_at',
]);
function pickPropertyColumns(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PROPERTY_COLUMNS.has(k)) out[k] = v;
  }
  return out;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeFileName(name: string): string {
  return (name ?? 'photo')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80);
}

function decodeBase64(data: string): Buffer {
  const base64 = (data ?? '').replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

function clientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown'
  );
}

/**
 * Rows whose id appears in deleted_bookings were already moved to history by
 * a successful delete — hide them from the live pipeline (belt-and-braces:
 * lead.remove deletes the row, this guards rows that somehow remain).
 */
async function filterOutSoftDeleted(rows: any[]): Promise<any[]> {
  if (!rows.length) return rows;
  try {
    const { data } = await supabaseAdmin
      .from('deleted_bookings')
      .select('id')
      .in('id', rows.map((r) => r.id));
    const gone = new Set((data ?? []).map((r: any) => r.id));
    return gone.size ? rows.filter((r) => !gone.has(r.id)) : rows;
  } catch {
    return rows;
  }
}

/* ── Deleted-booking history (auto-migrated) ─────────────────────────────── */

const DELETED_BOOKINGS_DDL = `
CREATE TABLE IF NOT EXISTS public.deleted_bookings (
  id                  TEXT PRIMARY KEY,
  property_id         TEXT NOT NULL DEFAULT '',
  property_title      TEXT NOT NULL DEFAULT '',
  property_type       TEXT NOT NULL DEFAULT '',
  property_area       TEXT NOT NULL DEFAULT '',
  property_price      TEXT NOT NULL DEFAULT '',
  visit_date          TEXT,
  visit_time          TEXT,
  buyer_name          TEXT,
  buyer_phone         TEXT,
  lead_type           TEXT NOT NULL DEFAULT 'book_visit',
  source              TEXT,
  listed_by           TEXT,
  status              TEXT NOT NULL DEFAULT 'new',
  message             TEXT NOT NULL DEFAULT '',
  ip_address          TEXT,
  original_created_at TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deleted_bookings_deleted_at ON public.deleted_bookings (deleted_at DESC);
`;

/**
 * Partner program (Agents / Builders / Owners) — public partner registrations
 * that gate the public "List Your Property" flow. Commission model is fixed
 * server-side: Agents & Builders share revenue 50/50 with VJR Estate, Owners
 * pay a 1% referral fee. Kept deliberately separate from the admin
 * add-property pipeline (`property.create`), which stays invite-only.
 */
const PARTNERS_DDL = `
CREATE TABLE IF NOT EXISTS public.partners (
  id                  TEXT PRIMARY KEY,
  uid                 TEXT,
  email               TEXT NOT NULL DEFAULT '',
  partner_type        TEXT NOT NULL DEFAULT 'Owner' CHECK (partner_type IN ('Owner','Builder','Agent')),
  full_name           TEXT NOT NULL DEFAULT '',
  mobile              TEXT NOT NULL DEFAULT '',
  company_name        TEXT,
  rera_number         TEXT,
  experience_years    INT,
  city                TEXT NOT NULL DEFAULT 'Bengaluru',
  areas               TEXT[] NOT NULL DEFAULT '{}',
  commission_percent  NUMERIC NOT NULL DEFAULT 50,
  terms_accepted      BOOLEAN NOT NULL DEFAULT FALSE,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partners_uid ON public.partners (uid);
CREATE INDEX IF NOT EXISTS idx_partners_email ON public.partners (email);
-- Consent records (versioned legal acceptance) — added after initial rollout.
DO $$ BEGIN
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS terms_version TEXT;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS authority_declared_at TIMESTAMPTZ;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS consents JSONB;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
NOTIFY pgrst, 'reload schema';
`;

/**
 * Partner CRM module — partner_code (VJR-P-NNNNNN), lifecycle status machine
 * (pending/active/suspended/terminated/rejected), and the immutable
 * partner_activity_log that powers the Partner 360° timeline.
 */
const PARTNER_CRM_DDL = `
DO $$ BEGIN
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS partner_code TEXT;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
  ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_status_check;
  ALTER TABLE public.partners ADD CONSTRAINT partners_status_check CHECK (status IN ('pending','active','suspended','terminated','rejected'));
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS status_reason TEXT;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS status_note TEXT;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS status_changed_by TEXT;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED';
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS verification_items JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
  -- Device-reported registration location (partner verification aid).
  -- Never exposed via public reads — see partnerLocationColumns usage.
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS latitude NUMERIC;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS longitude NUMERIC;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS resolved_address TEXT;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS capture_method TEXT;
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS location_capture_status TEXT;
  -- Partner-editable profile photo (Supabase partner-photos bucket URL).
  ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS photo_url TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.partner_activity_log (
  id           TEXT PRIMARY KEY,
  partner_id   TEXT NOT NULL,
  action       TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  actor_type   TEXT NOT NULL DEFAULT 'system',
  actor        TEXT NOT NULL DEFAULT '',
  related_type TEXT,
  related_id   TEXT,
  prev_value   TEXT,
  new_value    TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pal_partner ON public.partner_activity_log (partner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.partner_notes (
  id         TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL,
  author_email TEXT NOT NULL DEFAULT '',
  note_type  TEXT NOT NULL DEFAULT 'General',
  priority   TEXT NOT NULL DEFAULT 'Normal',
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pnotes_partner ON public.partner_notes (partner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.partner_transactions (
  id                TEXT PRIMARY KEY,
  partner_id        TEXT NOT NULL,
  property_id       TEXT,
  property_title    TEXT NOT NULL DEFAULT '',
  counterparty_name TEXT NOT NULL DEFAULT '',
  txn_type          TEXT NOT NULL DEFAULT 'sale',
  transaction_value NUMERIC NOT NULL DEFAULT 0,
  commission_percent NUMERIC,
  vjr_amount        NUMERIC NOT NULL DEFAULT 0,
  partner_amount    NUMERIC NOT NULL DEFAULT 0,
  gst_amount        NUMERIC NOT NULL DEFAULT 0,
  paid_amount       NUMERIC NOT NULL DEFAULT 0,
  txn_status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (txn_status IN ('PENDING','NEGOTIATION','AGREED','CLOSED','CANCELLED','DISPUTED')),
  payment_status    TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PARTIAL','PAID')),
  closure_date      DATE,
  notes             TEXT NOT NULL DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ptxn_partner ON public.partner_transactions (partner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.partner_disputes (
  id                TEXT PRIMARY KEY,
  partner_id        TEXT NOT NULL,
  related_property_id TEXT,
  related_lead_id   TEXT,
  related_txn_id    TEXT,
  dispute_type      TEXT NOT NULL DEFAULT 'Other',
  description       TEXT NOT NULL DEFAULT '',
  assigned_admin    TEXT NOT NULL DEFAULT '',
  dispute_status    TEXT NOT NULL DEFAULT 'OPEN' CHECK (dispute_status IN ('OPEN','UNDER_REVIEW','WAITING_FOR_DOCUMENTS','RESOLVED','CLOSED')),
  resolution        TEXT NOT NULL DEFAULT '',
  resolution_date   DATE,
  created_by        TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pdisp_partner ON public.partner_disputes (partner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.partner_support_conversations (
  id               TEXT PRIMARY KEY,
  partner_id       TEXT NOT NULL,
  partner_uid      TEXT NOT NULL DEFAULT '',
  support_ref      TEXT NOT NULL,
  subject          TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'Other',
  status           TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Waiting for Partner','Resolved')),
  assigned_admin   TEXT NOT NULL DEFAULT '',
  priority         TEXT NOT NULL DEFAULT 'Normal',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  resolved_by      TEXT
);
CREATE INDEX IF NOT EXISTS idx_psc_partner ON public.partner_support_conversations (partner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_psc_status ON public.partner_support_conversations (status, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_psc_ref ON public.partner_support_conversations (support_ref);
CREATE TABLE IF NOT EXISTS public.partner_support_messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_role     TEXT NOT NULL CHECK (sender_role IN ('partner','admin')),
  sender_id       TEXT NOT NULL DEFAULT '',
  sender_name     TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_psm_conv ON public.partner_support_messages (conversation_id, created_at);
NOTIFY pgrst, 'reload schema';
`;

/** Daily site-visit slot capacity per property (null = no limit). */
const VISIT_SLOTS_DDL = `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='properties' AND column_name='visit_slots'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN visit_slots INT NULL;
  END IF;
END $$;
`;

const LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS public.ledger_company_profile (
  id TEXT PRIMARY KEY DEFAULT 'company' CHECK (id = 'company'),
  name TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT 'pvtltd',
  incorporated_on DATE,
  fy_start_month INT NOT NULL DEFAULT 4,
  pan TEXT DEFAULT '',
  tan TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  gst_scheme TEXT NOT NULL DEFAULT 'monthly',
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
CREATE TABLE IF NOT EXISTS public.ledger_compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law TEXT NOT NULL,
  form TEXT NOT NULL,
  title TEXT NOT NULL,
  period TEXT NOT NULL,
  fy TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  owner TEXT DEFAULT '',
  filed_date DATE,
  arn TEXT DEFAULT '',
  penalty_exposure NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  proof_url TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  assignee TEXT DEFAULT '',
  priority TEXT DEFAULT 'normal',
  challan_url TEXT DEFAULT '',
  amount_paid NUMERIC DEFAULT 0,
  authority TEXT DEFAULT '',
  recurrence TEXT DEFAULT 'monthly',
  reminders_sent JSONB NOT NULL DEFAULT '[]',
  rule_version TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_items_due ON public.ledger_compliance_items (due_date);
CREATE INDEX IF NOT EXISTS idx_ledger_items_fy ON public.ledger_compliance_items (fy);
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS rule_version TEXT DEFAULT '';
CREATE TABLE IF NOT EXISTS public.ledger_legal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_no TEXT DEFAULT '',
  title TEXT NOT NULL,
  authority TEXT DEFAULT '',
  case_type TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
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
CREATE TABLE IF NOT EXISTS public.ledger_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type TEXT DEFAULT '',
  authority TEXT DEFAULT '',
  compliance_item_id UUID DEFAULT NULL,
  title TEXT DEFAULT '',
  period TEXT DEFAULT '',
  fy TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  due_date DATE,
  paid_date DATE,
  payment_ref TEXT DEFAULT '',
  challan_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'upcoming',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_payments_due ON public.ledger_payments (due_date);
CREATE INDEX IF NOT EXISTS idx_ledger_payments_fy ON public.ledger_payments (fy);
CREATE TABLE IF NOT EXISTS public.ledger_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_type TEXT DEFAULT '',
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
  status TEXT NOT NULL DEFAULT 'open',
  documents_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_notices_deadline ON public.ledger_notices (response_deadline);
CREATE INDEX IF NOT EXISTS idx_ledger_notices_status ON public.ledger_notices (status);
CREATE TABLE IF NOT EXISTS public.ledger_directors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  din TEXT DEFAULT '',
  designation TEXT DEFAULT '',
  appointment_date DATE,
  resignation_date DATE,
  kyc_status TEXT NOT NULL DEFAULT 'pending',
  kyc_due_date DATE,
  dsc_status TEXT NOT NULL DEFAULT 'na',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_directors_name ON public.ledger_directors (name);
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS father_name TEXT DEFAULT '';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Indian';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS occupation TEXT DEFAULT '';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'promoter';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS executive_status TEXT DEFAULT 'executive';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS din_status TEXT NOT NULL DEFAULT 'not_available';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS date_source TEXT DEFAULT '';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS shares_held INT;
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS dsc_expiry_date DATE;
CREATE TABLE IF NOT EXISTS public.ledger_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  doc_type TEXT DEFAULT '',
  fy TEXT DEFAULT '',
  period TEXT DEFAULT '',
  entity_type TEXT DEFAULT '',
  entity_id UUID DEFAULT NULL,
  url TEXT DEFAULT '',
  storage_path TEXT DEFAULT '',
  expiry_date DATE,
  version_no INT NOT NULL DEFAULT 1,
  parent_id UUID DEFAULT NULL,
  notes TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_documents_entity ON public.ledger_documents (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ledger_documents_expiry ON public.ledger_documents (expiry_date);
CREATE INDEX IF NOT EXISTS idx_ledger_documents_parent ON public.ledger_documents (parent_id);
CREATE TABLE IF NOT EXISTS public.ledger_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  action TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_log_created ON public.ledger_activity_log (created_at DESC);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['ledger_compliance_items','ledger_legal_cases','ledger_company_profile','ledger_activity_log','ledger_payments','ledger_notices','ledger_directors','ledger_documents'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
INSERT INTO storage.buckets (id, name, public) VALUES ('ledger-assets','ledger-assets',TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('ledger-docs','ledger-docs',FALSE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('partner-photos','partner-photos',TRUE) ON CONFLICT (id) DO NOTHING;
`;

/**
 * Whitelist for the generic ledger register CRUD (payments / notices /
 * directors / documents). A register not listed here cannot be touched, and
 * only the columns below can be written — everything else is dropped.
 */
const LEDGER_REGISTERS: Record<string, { table: string; columns: string[]; order: string; entity: string; fyFilter?: boolean }> = {
  payments: {
    table: 'ledger_payments',
    columns: ['payment_type', 'authority', 'compliance_item_id', 'title', 'period', 'fy', 'amount', 'due_date', 'paid_date', 'payment_ref', 'challan_url', 'status', 'notes'],
    order: 'due_date.asc', entity: 'payment', fyFilter: true,
  },
  notices: {
    table: 'ledger_notices',
    columns: ['notice_type', 'authority', 'notice_no', 'notice_date', 'received_date', 'response_deadline', 'subject', 'amount_involved', 'responsible', 'advisor', 'response_summary', 'status', 'documents_url', 'notes'],
    order: 'response_deadline.asc', entity: 'notice',
  },
  directors: {
    table: 'ledger_directors',
    columns: ['name', 'din', 'designation', 'appointment_date', 'resignation_date', 'kyc_status', 'kyc_due_date', 'dsc_status', 'dsc_expiry_date', 'email', 'phone', 'notes', 'father_name', 'date_of_birth', 'nationality', 'occupation', 'category', 'executive_status', 'din_status', 'date_source', 'source', 'verification_status', 'shares_held'],
    order: 'name.asc', entity: 'director',
  },
  documents: {
    table: 'ledger_documents',
    columns: ['name', 'doc_type', 'fy', 'period', 'entity_type', 'entity_id', 'url', 'storage_path', 'expiry_date', 'version_no', 'parent_id', 'notes', 'uploaded_by'],
    order: 'created_at.desc', entity: 'document', fyFilter: true,
  },
};

/**
 * LEDGERS self-healing: on first "table missing" error, create the whole
 * schema via the exec_sql RPC, wait for PostgREST's schema-cache reload, and
 * let the caller retry. Runs at most once per server instance.
 */
const ledgerOnceKey = 'ensureLedgerSchema';
async function ensureLedgerSchema(): Promise<void> {
  oncePerProcess(ledgerOnceKey);
  const base = (process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '').replace(/\/$/, '');
  if (!base || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${base}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
      body: JSON.stringify({ q: LEDGER_DDL }),
    });
    await new Promise((r) => setTimeout(r, 1200)); // PostgREST schema cache reload
  } catch { /* exec_sql RPC may not exist — user must run the migration manually */ }
}

async function ensureVisitSlotsColumn(): Promise<void> {
  const base = (process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '').replace(/\/$/, '');
  oncePerProcess(ensureVisitSlotsColumn.name);
  try {
    await fetch(`${base}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY },
      body: JSON.stringify({ q: VISIT_SLOTS_DDL }),
    });
  } catch {
    /* exec_sql RPC may not exist — slots actions degrade gracefully */
  }
}

/** Run a slow idempotent setup at most once per server instance. */
const onceKeys = new Set<string>();
function oncePerProcess(key: string): void {
  if (onceKeys.has(key)) return;
  onceKeys.add(key);
}

/**
 * Create the history table on demand via the exec_sql RPC (same pattern as
 * crm-proxy's ensureColumns). Lets deletes work without a manual migration.
 */
async function ensureDeletedBookingsTable(): Promise<void> {
  const base = (process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '').replace(/\/$/, '');
  if (!base || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${base}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY },
      body: JSON.stringify({ q: DELETED_BOOKINGS_DDL }),
    });
  } catch {
    /* RPC may not exist — callers degrade gracefully */
  }
}

async function ensurePartnersTable(): Promise<void> {
  const base = (process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '').replace(/\/$/, '');
  if (!base || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${base}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY },
      body: JSON.stringify({ q: PARTNERS_DDL }),
    });
    await fetch(`${base}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY },
      body: JSON.stringify({ q: PARTNER_CRM_DDL }),
    });
  } catch {
    /* exec_sql RPC may not exist — partner actions degrade gracefully */
  }
}

/** Immutable activity-log write for the Partner 360° timeline. Never throws —
 * logging must never break the main flow. */
async function logPartnerActivity(entry: {
  partnerId: string;
  action: string;
  description?: string;
  actorType?: 'admin' | 'partner' | 'system';
  actor?: string;
  relatedType?: string | null;
  relatedId?: string | null;
  prevValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from('partner_activity_log').insert({
      id: randomUUID(),
      partner_id: entry.partnerId,
      action: entry.action,
      description: entry.description ?? '',
      actor_type: entry.actorType ?? 'system',
      actor: entry.actor ?? '',
      related_type: entry.relatedType ?? null,
      related_id: entry.relatedId ?? null,
      prev_value: entry.prevValue ?? null,
      new_value: entry.newValue ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch {
    /* activity logging must never break the main flow */
  }
}

/** Postgres error for a missing table (PostgREST hides the schema behind a cache message). */
function isMissingRelation(message: string): boolean {
  return /does not exist|Could not find the table|schema cache|relation .* does not exist/i.test(message ?? '');
}

function historyRowFromLead(row: any, deletedAt: string): Record<string, unknown> {
  return {
    id: row.id,
    property_id: row.property_id ?? '',
    property_title: row.property_title ?? '',
    property_type: row.property_type ?? '',
    property_area: row.property_area ?? '',
    property_price: row.property_price ?? '',
    visit_date: row.visit_date ?? null,
    visit_time: row.visit_time ?? null,
    buyer_name: row.buyer_name ?? null,
    buyer_phone: row.buyer_phone ?? null,
    lead_type: row.lead_type ?? 'book_visit',
    source: row.source ?? null,
    listed_by: row.listed_by ?? null,
    status: row.status ?? 'new',
    message: row.message ?? '',
    ip_address: row.ip_address ?? null,
    original_created_at: row.created_at ?? null,
    deleted_at: deletedAt,
  };
}

/** Tiny per-instance rate limiter for anonymous actions. */
const rateBuckets = new Map<string, { count: number; reset: number }>();
function rateLimited(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.reset) {
    rateBuckets.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  bucket.count += 1;
  if (bucket.count > max) {
    rateBuckets.delete(key);
    return true;
  }
  return false;
}

async function nextPropertyCode(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('properties')
    .select('property_code')
    .not('property_code', 'is', null);
  let maxNum = 0;
  for (const r of data ?? []) {
    const m = String(r.property_code).match(/^VJR-(\d+)$/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return `VJR-${String(maxNum + 1).padStart(4, '0')}`;
}

async function nextReqId(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin
    .from('requirements')
    .select('id', { count: 'exact', head: true });
  return `VJR-REQ-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

/** First line of a message body for activity log previews. */
function subjectShort(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** Sequential support reference: VJR-SUP-YYYY-NNNN from the current year's rows. */
async function nextSupportRef(): Promise<string> {
  const year = new Date().getFullYear();
  const { data } = await supabaseAdmin
    .from('partner_support_conversations')
    .select('support_ref')
    .like('support_ref', `VJR-SUP-${year}-%`);
  let maxNum = 0;
  for (const r of data ?? []) {
    const m = String(r.support_ref).match(new RegExp(`^VJR-SUP-${year}-(\\d+)$`));
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return `VJR-SUP-${year}-${String(maxNum + 1).padStart(4, '0')}`;
}

async function getPropertyRow(id: string) {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function dbDate(v: string | Date | undefined): string | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Shared insert with VJR-NNNN code generation + unique-constraint retry. */
async function insertPropertyWithCode(params: any): Promise<{ id: string; propertyCode: string }> {
  const raw = { ...params };
  let finalCode = (params.property_code ?? '').trim() || await nextPropertyCode();
  const propId = randomUUID();
  let lastError: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const clean = pickPropertyColumns({
      ...raw,
      id: propId,
      property_code: finalCode,
      created_at: dbDate(params.createdAt) ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const { data, error } = await supabaseAdmin
      .from('properties')
      .insert(clean)
      .select('id')
      .single();
    if (!error) return { id: data.id, propertyCode: finalCode };
    if (/property_code_key|unique constraint/i.test(error.message)) {
      lastError = error;
      finalCode = await nextPropertyCode();
      continue;
    }
    throw new Error(error.message);
  }
  throw new Error(lastError?.message ?? 'Failed to create property after retries');
}

/**
 * Validated device-reported location from partner.register payload.
 * Returns a partial partners-row spread when valid, null when absent, and
 * THROWS when present-but-malformed (client bug or tampering attempt).
 * Precision is preserved as sent — no rounding.
 */
function parseLocationCapture(
  loc: { latitude?: unknown; longitude?: unknown; accuracyMeters?: unknown; capturedAt?: unknown; resolvedAddress?: unknown; status?: unknown } | null | undefined,
): Record<string, unknown> | null {
  if (!loc) return null;
  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('Invalid latitude in location payload');
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error('Invalid longitude in location payload');
  const acc = loc.accuracyMeters == null ? null : Number(loc.accuracyMeters);
  if (acc != null && (!Number.isFinite(acc) || acc < 0 || acc > 100000)) throw new Error('Invalid accuracy in location payload');
  const capturedAt = String(loc.capturedAt ?? '');
  if (capturedAt && Number.isNaN(new Date(capturedAt).getTime())) throw new Error('Invalid capture timestamp in location payload');
  const status = ['CAPTURED', 'CAPTURED_LOW_ACCURACY', 'FAILED', 'DENIED', 'SKIPPED'].includes(String(loc.status))
    ? String(loc.status)
    : 'CAPTURED';
  return {
    latitude: lat,
    longitude: lng,
    accuracy_meters: acc,
    captured_at: capturedAt || new Date().toISOString(),
    resolved_address: String(loc.resolvedAddress ?? '').slice(0, 400) || null,
    capture_method: 'browser_geolocation_gps',
    location_capture_status: status,
  };
}

/**
 * Partner lookup by verified uid or email. Claims email-only registrations
 * (made before the visitor signed in) on first authenticated hit.
 */
async function findPartner(uid: string, email: string): Promise<any | null> {
  const { data: byUid } = await supabaseAdmin
    .from('partners')
    .select('*')
    .eq('uid', uid)
    .maybeSingle();
  if (byUid) return byUid;
  if (!email) return null;
  const { data: byEmail } = await supabaseAdmin
    .from('partners')
    .select('*')
    .eq('email', normalizeEmail(email))
    .maybeSingle();
  if (!byEmail) return null;
  if (!byEmail.uid) {
    await supabaseAdmin
      .from('partners')
      .update({ uid, updated_at: new Date().toISOString() })
      .eq('id', byEmail.id);
    return { ...byEmail, uid };
  }
  return byEmail.uid === uid ? byEmail : null;
}

// ── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');

  try {
    assertSupabaseServiceKey();
  } catch (e: any) {
    return err(res, 500, e.message);
  }

  let body: any;
  if (typeof req.body === 'object' && req.body !== null) {
    body = req.body;
  } else {
    try {
      body = JSON.parse(req.body ?? '{}');
    } catch {
      return err(res, 400, 'Invalid JSON body');
    }
  }

  const { action, params = {}, public: isPublic } = body;
  if (!action) return err(res, 400, 'Missing action');

  // Anonymous actions (no token): requirement clicks, property leads.
  if (isPublic) {
    try {
      const result = await executeAction(action, { ...params, _public: true, _ip: clientIp(req) });
      return res.status(200).json(result);
    } catch (e: any) {
      console.error('[data-proxy] public error:', e);
      return res.status(500).json({ error: e.message ?? 'Internal error' });
    }
  }

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return err(res, 401, 'Missing authorization token');

  const auth = await verifyToken(token);
  if (!auth.authorized) {
    console.log(`[data-proxy] REJECTED ${action} — token invalid`);
    return err(res, 401, 'Unauthorized');
  }

  console.log(`[data-proxy] ${action} by ${auth.email || auth.uid || 'unknown'} (role ${auth.role ?? 'none'})`);
  try {
    const result = await executeAction(action, { ...params, _auth: auth, _ip: clientIp(req) });
    console.log(`[data-proxy] OK ${action}`);
    return res.status(200).json(result);
  } catch (e: any) {
    console.log(`[data-proxy] FAIL ${action}: ${e?.message ?? e}`);
    return res.status(500).json({ error: e.message ?? 'Internal error' });
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────

async function executeAction(action: string, params: any): Promise<any> {
  const auth: AuthInfo | null = params._auth ?? null;
  const ip: string = params._ip ?? '';

  switch (action) {
    // ── Properties ──────────────────────────────────────────────────────
    case 'property.create': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const isAdminCall = isAdmin(auth);
      const ownerUid = String(params.uid ?? '');
      if (!isAdminCall && ownerUid !== auth.uid) throw new Error('Forbidden');
      // Invite-only listing: non-admins need the admin-granted flag.
      if (!isAdminCall) {
        const { data: acc } = await supabaseAdmin
          .from('users')
          .select('can_add_property')
          .eq('uid', auth.uid)
          .maybeSingle();
        if (acc?.can_add_property !== true) throw new Error('Add Property access not granted for this account');
      }
      // Persist ownership so the listing shows under the submitter's
      // account (My Listings) and in the admin Listings dashboard — this
      // mirrors the Firestore docs these rows replaced.
      // Company-side listing (admin or granted user): always attributed to
      // VJR Estate, never a partner type — partners (Owner/Builder/Agent)
      // only come in through partner.property.create.
      params.listed_by = 'VJR Estate';
      if (ownerUid) {
        params.uid = ownerUid;
        params.user_email = params.user_email || auth.email;
      } else {
        // VJR-official listing (admin-created) — never carry a uid.
        delete params.uid;
        delete params.user_email;
        delete params.user_display_name;
      }
      return insertPropertyWithCode(params);
    }

    case 'property.update': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { id, ...rawFields } = params;
      const row = await getPropertyRow(id);
      if (!row) throw new Error('Property not found');
      if (!isAdmin(auth) && row.uid !== auth.uid) throw new Error('Forbidden');
      const updates: Record<string, unknown> = pickPropertyColumns({ ...rawFields, updated_at: new Date().toISOString() });
      delete updates.uid;
      // listed_by is authoritative attribution: set only at create time
      // (VJR Estate for company rows, partner_type for partner rows). Not
      // editable through property.update.
      delete updates.listed_by;
      const { error } = await supabaseAdmin
        .from('properties')
        .update(updates)
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'property.delete': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id } = params;
      const row = await getPropertyRow(id);
      if (!row) throw new Error('Property not found');
      // Clean up the listing's storage objects first (best-effort) so a
      // property never leaves orphaned images behind.
      const imageUrls = Array.isArray(row.images) ? (row.images as string[]) : [];
      for (const url of imageUrls) {
        try {
          const u = new URL(String(url));
          const match = u.pathname.match(/\/storage\/v1\/object\/public\/property-images\/(.+)$/);
          if (!match) continue;
          await supabaseAdmin.storage.from('property-images').remove([decodeURIComponent(match[1])]);
        } catch { /* individual image cleanup is best-effort */ }
      }
      const { error } = await supabaseAdmin.from('properties').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'property.toggleFeatured': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, featured } = params;
      const { error } = await supabaseAdmin
        .from('properties')
        .update({ featured: !featured, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'property.backfillCodes': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { data: rows } = await supabaseAdmin
        .from('properties')
        .select('id,property_code,uid')
        .is('property_code', null)
        .is('uid', null);
      const toUpdate = (rows ?? []).filter((r) => !r.property_code);
      let code = '';
      for (const row of toUpdate) {
        if (!code) code = await nextPropertyCode();
        else {
          const m = code.match(/^VJR-(\d+)$/);
          code = `VJR-${String((m ? parseInt(m[1], 10) : 0) + 1).padStart(4, '0')}`;
        }
        await supabaseAdmin
          .from('properties')
          .update({ property_code: code })
          .eq('id', row.id);
      }
      return { count: toUpdate.length };
    }

    // ── Partner program (public Agent/Builder/Owner listing flow) ───────
    // Separate pipeline from admin property.create: any signed-in user may
    // register as a partner and list, subject to the commission model.
    case 'partner.register': {
      if (rateLimited(`partner-register:${ip}`, 6, 60_000)) throw new Error('Too many requests');
      await ensurePartnersTable();
      const isAuthed = !!auth?.authorized;
      const partnerType = ['Owner', 'Builder', 'Agent'].includes(params.partnerType) ? params.partnerType : '';
      if (!partnerType) throw new Error('Select a partner type (Owner, Builder or Agent)');
      const email = isAuthed ? auth!.email : normalizeEmail(String(params.email ?? ''));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid email address is required');
      const fullName = String(params.fullName ?? '').trim().slice(0, 100);
      if (!fullName) throw new Error('Full name is required');
      const mobile = String(params.mobile ?? '').replace(/\D/g, '').slice(0, 10);
      if (mobile.length !== 10) throw new Error('A valid 10-digit mobile number is required');
      // RERA / firm details apply to Agents & Builders and are recommended but
      // optional at registration (validated only when provided).
      const needsRera = partnerType !== 'Owner';
      const companyName = String(params.companyName ?? '').trim().slice(0, 120);
      const reraNumber = String(params.reraNumber ?? '').trim().toUpperCase().slice(0, 60);
      if (needsRera && reraNumber && reraNumber.length < 6) {
        throw new Error('Enter a valid Karnataka RERA registration number, or leave it blank to add later');
      }
      if (params.termsAccepted !== true) throw new Error('You must accept the partnership terms to register');
      // Device-reported geolocation (optional at submit): client sends the raw
      // best reading; the server validates format/range here — the proxy is
      // the rule, so unvalidated browser values never reach the database.
      const loc = parseLocationCapture(params.location);
      // Fixed commission model: VJR Estate takes 50% from Agents & Builders
      // (50/50 revenue share) and 1% from Owners.
      const commissionPercent = partnerType === 'Owner' ? 1 : 50;
      const now = new Date().toISOString();
      const existing = isAuthed
        ? await findPartner(auth!.uid, auth!.email)
        : await (async () => {
            if (!email) return null;
            const { data } = await supabaseAdmin.from('partners').select('*').eq('email', email).maybeSingle();
            return data ?? null;
          })();
      // CRM lifecycle: new registrations enter PENDING review. Existing
      // partners re-registering (profile updates) keep their lifecycle status.
      const crmStatus = existing?.status === 'pending' || existing?.status === 'suspended'
        ? existing.status
        : existing?.status ?? 'pending';
      // Sequential partner ID: VJR-P-000001, never reused.
      let partnerCode: string = existing?.partner_code ?? '';
      if (!partnerCode) {
        const { data: lastCoded } = await supabaseAdmin
          .from('partners')
          .select('partner_code')
          .not('partner_code', 'is', null)
          .order('partner_code', { ascending: false })
          .limit(1);
        const lastNum = Number(String(lastCoded?.[0]?.partner_code ?? '').split('-').pop() ?? '0') || 0;
        partnerCode = `VJR-P-${String(lastNum + 1).padStart(6, '0')}`;
      }
      const row = {
        ...(existing?.id ? { id: existing.id } : { id: randomUUID() }),
        uid: isAuthed ? auth!.uid : existing?.uid ?? null,
        email,
        partner_type: partnerType,
        full_name: fullName,
        mobile,
        company_name: companyName || null,
        rera_number: needsRera ? reraNumber : null,
        experience_years: Number(params.experienceYears) > 0 ? Math.floor(Number(params.experienceYears)) : null,
        city: String(params.city ?? 'Bengaluru').trim().slice(0, 60) || 'Bengaluru',
        areas: Array.isArray(params.areas) ? params.areas.map((a: unknown) => String(a).slice(0, 80)).filter(Boolean).slice(0, 10) : [],
        partner_code: partnerCode,
        commission_percent: commissionPercent,
        terms_accepted: true,
        status: crmStatus,
        verification_status: existing?.verification_status ?? 'UNVERIFIED',
        // Versioned consent record — Partner Terms v2026-10 (/partner-terms) and
        // Partner Privacy Policy v2026-10 (/partner-privacy).
        terms_version: '2026-10',
        terms_accepted_at: now,
        privacy_accepted_at: now,
        authority_declared_at: now,
        marketing_consent: params.marketingConsent === true,
        ...(loc ?? {}),
        consents: {
          terms: { version: '2026-10', at: now },
          privacy: { at: now },
          authority: { at: now },
          marketing: params.marketingConsent === true ? { at: now } : null,
          ip: ip || null,
        },
        updated_at: now,
      };
      if (existing?.id) {
        const { error } = await supabaseAdmin.from('partners').update(row).eq('id', existing.id);
        if (error) throw new Error(error.message);
        if (crmStatus !== existing.status) {
          await logPartnerActivity({ partnerId: existing.id, action: 'PARTNER REGISTERED (UPDATED)', description: `${partnerType} re-registered; lifecycle status moved to ${crmStatus}`, actorType: 'partner', actor: email });
        }
      } else {
        const { error } = await supabaseAdmin.from('partners').insert({ ...row, created_at: now });
        if (error) throw new Error(error.message);
        await logPartnerActivity({ partnerId: row.id, action: 'PARTNER REGISTERED', description: `${partnerType} partner registered as ${fullName} (${email}) and entered pending review`, actorType: 'partner', actor: email, newValue: 'PENDING' });
      }
      return {
        partnerType,
        commissionPercent,
        email,
        registeredWithAccount: isAuthed,
        status: crmStatus,
        partnerCode,
      };
    }

    case 'partner.check': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const partner = await findPartner(auth.uid, auth.email);
      const regStatus = partner?.status ?? '';
      return {
        registered: !!partner && ['active', 'pending'].includes(regStatus),
        partner: partner
          ? {
              partnerType: partner.partner_type,
              fullName: partner.full_name,
              companyName: partner.company_name ?? '',
              commissionPercent: Number(partner.commission_percent ?? (partner.partner_type === 'Owner' ? 1 : 50)),
              status: regStatus,
              partnerCode: partner.partner_code ?? '',
            }
          : null,
      };
    }

    case 'partner.profile.update': {
      // Partner-editable profile fields. Authenticated + scoped to the token:
      // a partner can only ever update their own row; system-controlled
      // fields (partner_code, status, verification) are never writable here.
      if (!auth?.authorized) throw new Error('Forbidden');
      await ensurePartnersTable();
      const partner = await findPartner(auth.uid, auth.email);
      if (!partner) throw new Error('No partner registration found for this account.');
      if (partner.status === 'terminated') throw new Error('This partnership is terminated; the profile cannot be edited.');

      const fullName = String(params.fullName ?? '').trim().slice(0, 100);
      if (!fullName) throw new Error('Full name is required');
      const companyName = String(params.companyName ?? '').trim().slice(0, 120);
      const experience = Number(params.experienceYears) > 0 ? Math.floor(Number(params.experienceYears)) : null;
      if (experience != null && experience > 60) throw new Error('Experience must be 60 years or less');
      const areas = Array.isArray(params.areas)
        ? params.areas.map((a: unknown) => String(a).trim().slice(0, 80)).filter(Boolean).slice(0, 10)
        : [];

      // Photo: URL string from the partner-photos bucket upload, or '' to remove.
      let photoUrl: string | null = partner.photo_url ?? null;
      if (params.photo !== undefined) {
        const next = String(params.photo ?? '').trim();
        if (next && !/^https:\/\//.test(next)) throw new Error('Photo must be an uploaded image URL');
        // Queue-delete the previous uploaded photo (ignore failures — the
        // update below is the source of truth).
        try {
          const prevPath = (partner.photo_url ?? '').match(/[?&]path=([^&]+)/);
          const prevStorage = (partner.photo_url ?? '').match(/\/storage\/v1\/object\/public\/partner-photos\/(.+)$/);
          if (prevStorage?.[1] && decodeURIComponent(prevStorage[1]) !== decodeURIComponent(prevPath?.[1] ?? prevStorage[1])) {
            await supabaseAdmin.storage.from('partner-photos').remove([decodeURIComponent(prevStorage[1])]);
          }
        } catch { /* non-fatal */ }
        photoUrl = next || null;
      }

      const updates: Record<string, unknown> = {
        full_name: fullName,
        company_name: companyName || null,
        experience_years: experience,
        areas,
        photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin.from('partners').update(updates).eq('id', String(partner.id));
      if (error) throw new Error(error.message);
      await logPartnerActivity({
        partnerId: String(partner.id),
        action: 'PROFILE UPDATED',
        description: `${auth.email} updated their partner profile`,
        actorType: 'partner',
        actor: auth.email,
      });
      const { data: refreshed } = await supabaseAdmin.from('partners').select('*').eq('id', String(partner.id)).maybeSingle();
      return { partner: refreshed ?? null };
    }

    case 'partner.dashboard': {
      // Partner-facing dashboard feed. Everything is scoped to the verified
      // session — the partner id is derived from the token, never the body.
      if (!auth?.authorized) throw new Error('Forbidden');
      await ensurePartnersTable();
      const partner = await findPartner(auth.uid, auth.email);
      if (!partner) throw new Error('No partner registration found for this account. Register at /partner-register first.');
      const partnerId = String(partner.id);
      const uid = String(partner.uid ?? '__none__');
      const { data: props } = await supabaseAdmin
        .from('properties')
        .select('id,property_code,title,type,status,area,location,price,price_label,monthly_rental,monthly_rental_label,images,created_at,updated_at')
        .eq('uid', uid)
        .order('created_at', { ascending: false })
        .limit(200);
      const listings = props ?? [];
      const propIds = listings.map((p) => String(p.id)).filter(Boolean);
      const leads: any[] = [];
      for (let i = 0; i < propIds.length; i += 100) {
        const chunk = propIds.slice(i, i + 100);
        if (!chunk.length) continue;
        const { data } = await supabaseAdmin
          .from('property_leads')
          .select('id,property_id,property_title,property_type,property_area,property_price,visit_date,visit_time,buyer_name,buyer_phone,message,lead_type,source,listed_by,status,created_at')
          .in('property_id', chunk)
          .order('created_at', { ascending: false })
          .limit(10000);
        if (data) leads.push(...data);
      }
      const { data: txns } = await supabaseAdmin
        .from('partner_transactions')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(200);
      const { data: activity } = await supabaseAdmin
        .from('partner_activity_log')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(100);
      const { data: disputes } = await supabaseAdmin
        .from('partner_disputes')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(100);
      const transactions = txns ?? [];
      const closed = transactions.filter((t) => t.txn_status === 'CLOSED');
      const paidSum = closed.reduce((n: number, t) => n + Number(t.paid_amount ?? 0), 0);
      const vjrDue = closed.reduce((n: number, t) => n + Math.max(0, Number(t.vjr_amount ?? 0) - Number(t.paid_amount ?? 0)), 0);
      const partnerDue = closed.reduce((n: number, t) => n + Math.max(0, Number(t.partner_amount ?? 0) - Number(t.paid_amount ?? 0)), 0);
      const visitLeads = leads.filter((l) => l.lead_type === 'book_visit');
      return {
        partner,
        listings,
        leads,
        transactions,
        disputes: disputes ?? [],
        activity: activity ?? [],
        counts: {
          properties: listings.length,
          leads: leads.length,
          visitsUpcoming: visitLeads.filter((l) => l.visit_date && String(l.visit_date) >= new Date().toISOString().slice(0, 10)).length,
          transactionsOpen: transactions.filter((t) => !['CLOSED', 'CANCELLED', 'DISPUTED'].includes(String(t.txn_status))).length,
          transactionsClosed: closed.length,
          partnerEarnings: closed.reduce((n: number, t) => n + Number(t.partner_amount ?? 0), 0),
          partnerPaid: paidSum,
          partnerDue,
          vjrDue,
        },
      };
    }

    case 'partner.property.create': {
      if (!auth?.authorized) throw new Error('Forbidden');
      await ensurePartnersTable();
      const partner = await findPartner(auth.uid, auth.email);
      if (!partner || partner.status !== 'active') {
        throw new Error('Register as a VJR Estate partner before listing properties');
      }
      // Identity always comes from the verified token, never the request body.
      delete params.uid;
      delete params.user_email;
      delete params.user_display_name;
      delete params.agent_id;
      delete params.property_code;
      params.uid = auth.uid;
      params.user_email = auth.email;
      params.listed_by = partner.partner_type; // Owner | Builder | Agent
      params.featured = false;
      return insertPropertyWithCode(params);
    }

    // ── Partner CRM (admin) — lifecycle, verification, notes, activity, transactions, disputes ──
    case 'partner.admin.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const { data: partners } = await supabaseAdmin
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      const list = partners ?? [];
      const { data: props } = await supabaseAdmin
        .from('properties')
        .select('id,uid,title,status,listed_by,price,monthly_rental,created_at,updated_at')
        .not('uid', 'is', null)
        .limit(5000);
      const propRows = props ?? [];
      const propsByUid = new Map<string, typeof propRows>();
      for (const p of propRows) {
        const arr = propsByUid.get(String(p.uid)) ?? [];
        arr.push(p);
        propsByUid.set(String(p.uid), arr);
      }
      const propIds = propRows.map((p) => String(p.id)).filter(Boolean);
      const leadCounts = new Map<string, number>();
      for (let i = 0; i < propIds.length; i += 100) {
        const chunk = propIds.slice(i, i + 100);
        if (!chunk.length) continue;
        const { data: leads } = await supabaseAdmin
          .from('property_leads')
          .select('property_id')
          .in('property_id', chunk)
          .limit(20000);
        for (const l of leads ?? []) {
          const pid = String(l.property_id);
          leadCounts.set(pid, (leadCounts.get(pid) ?? 0) + 1);
        }
      }
      const { data: txns } = await supabaseAdmin.from('partner_transactions').select('partner_id,vjr_amount,partner_amount,txn_status,payment_status').limit(10000);
      const finByPartner = new Map<string, { vjr: number; partner: number; pending: number }>();
      for (const t of txns ?? []) {
        const f = finByPartner.get(String(t.partner_id)) ?? { vjr: 0, partner: 0, pending: 0 };
        f.vjr += Number(t.vjr_amount ?? 0);
        f.partner += Number(t.partner_amount ?? 0);
        if (t.payment_status !== 'PAID' && t.txn_status === 'CLOSED') f.pending += Number(t.vjr_amount ?? 0);
        finByPartner.set(String(t.partner_id), f);
      }
      const enriched = list.map((p) => {
        const myProps = p.uid ? (propsByUid.get(String(p.uid)) ?? []) : [];
        const fin = finByPartner.get(String(p.id)) ?? { vjr: 0, partner: 0, pending: 0 };
        return {
          ...p,
          listingsCount: myProps.length,
          activeListings: myProps.length,
          leadsCount: myProps.reduce((n, pr) => n + (leadCounts.get(String(pr.id)) ?? 0), 0),
          transactionsCount: (txns ?? []).filter((t) => String(t.partner_id) === String(p.id)).length,
          vjrRevenue: fin.vjr,
          partnerRevenue: fin.partner,
          pendingPayments: fin.pending,
        };
      });
      return { partners: enriched };
    }

    case 'partner.admin.detail': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const { data: partner } = await supabaseAdmin.from('partners').select('*').eq('id', String(params.id ?? '')).maybeSingle();
      if (!partner) throw new Error('Partner not found');
      const { data: props } = await supabaseAdmin
        .from('properties')
        .select('id,property_code,title,type,status,listed_by,area,location,price,price_label,monthly_rental,monthly_rental_label,images,contact_name,contact_phone,created_at,updated_at')
        .eq('uid', String(partner.uid ?? '__none__'))
        .order('created_at', { ascending: false })
        .limit(200);
      const listings = props ?? [];
      const propIds = listings.map((p) => String(p.id)).filter(Boolean);
      const leads: unknown[] = [];
      for (let i = 0; i < propIds.length; i += 100) {
        const chunk = propIds.slice(i, i + 100);
        if (!chunk.length) continue;
        const { data } = await supabaseAdmin
          .from('property_leads')
          .select('id,property_id,property_title,buyer_name,buyer_phone,message,lead_type,source,status,created_at')
          .in('property_id', chunk)
          .order('created_at', { ascending: false })
          .limit(20000);
        if (data) leads.push(...data);
      }
      const [notes, activity, txns, disputes] = await Promise.all([
        supabaseAdmin.from('partner_notes').select('*').eq('partner_id', String(partner.id)).order('created_at', { ascending: false }).limit(100),
        supabaseAdmin.from('partner_activity_log').select('*').eq('partner_id', String(partner.id)).order('created_at', { ascending: false }).limit(100),
        supabaseAdmin.from('partner_transactions').select('*').eq('partner_id', String(partner.id)).order('created_at', { ascending: false }).limit(200),
        supabaseAdmin.from('partner_disputes').select('*').eq('partner_id', String(partner.id)).order('created_at', { ascending: false }).limit(100),
      ]);
      return {
        partner,
        listings,
        leads,
        notes: notes.data ?? [],
        activity: activity.data ?? [],
        transactions: txns.data ?? [],
        disputes: disputes.data ?? [],
      };
    }

    case 'partner.admin.status': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const id = String(params.id ?? '');
      const nextStatus = String(params.status ?? '');
      if (!['active', 'suspended', 'terminated', 'rejected'].includes(nextStatus)) {
        throw new Error('Invalid partner status');
      }
      // Status machine: PENDING→ACTIVE|REJECTED, ACTIVE→SUSPENDED|TERMINATED, SUSPENDED→ACTIVE|TERMINATED.
      const ALLOWED: Record<string, string[]> = {
        pending: ['active', 'rejected'],
        active: ['suspended', 'terminated'],
        suspended: ['active', 'terminated'],
        rejected: [],
        terminated: [],
      };
      const { data: partner } = await supabaseAdmin.from('partners').select('id,status,full_name,partner_code').eq('id', id).maybeSingle();
      if (!partner) throw new Error('Partner not found');
      const prev = String(partner.status ?? 'active');
      if (!(ALLOWED[prev] ?? []).includes(nextStatus)) {
        throw new Error(`Cannot change partner status from ${prev.toUpperCase()} to ${nextStatus.toUpperCase()}`);
      }
      const reason = String(params.reason ?? '').trim();
      const note = String(params.note ?? '').trim().slice(0, 1000);
      if (!reason) throw new Error('A reason is required for this action');
      const nowIso = new Date().toISOString();
      const statusMeta = nextStatus === 'suspended'
        ? { type: String(params.suspensionType ?? 'INDEFINITE'), reason, note, at: nowIso, by: auth!.email }
        : nextStatus === 'terminated'
          ? { reason, note, effectiveDate: String(params.effectiveDate ?? nowIso.slice(0, 10)), settlement: String(params.settlement ?? ''), at: nowIso, by: auth!.email }
          : { reason, note, at: nowIso, by: auth!.email };
      const { error } = await supabaseAdmin.from('partners').update({
        status: nextStatus,
        status_reason: reason,
        status_note: note || null,
        status_changed_at: nowIso,
        status_changed_by: auth!.email,
      }).eq('id', id);
      if (error) throw new Error(error.message);
      await logPartnerActivity({
        partnerId: id,
        action: nextStatus === 'suspended' ? 'PARTNER SUSPENDED' : nextStatus === 'terminated' ? 'PARTNER TERMINATED' : nextStatus === 'active' ? 'PARTNER REINSTATED' : 'PARTNER STATUS CHANGED',
        description: `${partner.partner_code ?? id} (${partner.full_name}) — ${reason}${note ? ` · ${note}` : ''}`,
        actorType: 'admin',
        actor: auth!.email,
        prevValue: prev.toUpperCase(),
        newValue: nextStatus.toUpperCase(),
        metadata: statusMeta as Record<string, unknown>,
      });
      return { ok: true, status: nextStatus };
    }

    case 'partner.admin.verify': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const id = String(params.id ?? '');
      const verificationStatus = String(params.verificationStatus ?? '');
      if (!['UNVERIFIED', 'PARTIALLY VERIFIED', 'VERIFIED', 'VERIFICATION REQUIRED', 'REJECTED'].includes(verificationStatus)) {
        throw new Error('Invalid verification status');
      }
      const { data: partner } = await supabaseAdmin.from('partners').select('id,verification_status').eq('id', id).maybeSingle();
      if (!partner) throw new Error('Partner not found');
      const items = (partner as unknown as { verification_items?: Record<string, unknown> }).verification_items ?? {};
      const itemKey = String(params.item ?? 'identity');
      const nextItems = { ...items, [itemKey]: { status: verificationStatus, at: new Date().toISOString(), by: auth!.email, notes: String(params.notes ?? '') } };
      const { error } = await supabaseAdmin.from('partners').update({ verification_status: verificationStatus, verification_items: nextItems }).eq('id', id);
      if (error) throw new Error(error.message);
      await logPartnerActivity({
        partnerId: id,
        action: 'VERIFICATION UPDATED',
        description: `${itemKey} → ${verificationStatus}${params.notes ? ` · ${String(params.notes).slice(0, 200)}` : ''}`,
        actorType: 'admin',
        actor: auth!.email,
        prevValue: String(partner.verification_status ?? ''),
        newValue: verificationStatus,
      });
      return { ok: true, verificationStatus };
    }

    case 'partner.admin.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const id = String(params.id ?? '');
      const { data: partner } = await supabaseAdmin.from('partners').select('*').eq('id', id).maybeSingle();
      if (!partner) throw new Error('Partner not found');
      const editable = ['full_name', 'mobile', 'company_name', 'rera_number', 'experience_years', 'areas', 'city', 'partner_type'] as const;
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const changes: string[] = [];
      for (const key of editable) {
        if (params[key] === undefined) continue;
        const nextVal = key === 'experience_years' ? Math.max(0, Math.floor(Number(params[key]) || 0)) : params[key];
        if (String(nextVal) !== String((partner as Record<string, unknown>)[key] ?? '')) {
          patch[key] = nextVal;
          changes.push(`${key}: ${String((partner as Record<string, unknown>)[key] ?? '—')} → ${String(nextVal)}`);
        }
      }
      if (Object.keys(patch).length === 1) return { ok: true, changed: false };
      const { error } = await supabaseAdmin.from('partners').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
      // Sensitive fields (partner type, RERA) must always be audited.
      await logPartnerActivity({
        partnerId: id,
        action: 'PARTNER PROFILE UPDATED',
        description: changes.join(' · ').slice(0, 900),
        actorType: 'admin',
        actor: auth!.email,
      });
      return { ok: true, changed: true };
    }

    // ── Partner support / live chat (partner + admin) ───────────────────
    case 'partner.support.list': {
      if (!auth?.authorized) throw new Error('Forbidden');
      await ensurePartnersTable();
      const partner = await findPartner(auth.uid, auth.email);
      if (!partner) throw new Error('No partner registration found for this account.');
      const partnerId = String(partner.id);
      const { data: convs } = await supabaseAdmin
        .from('partner_support_conversations')
        .select('*')
        .eq('partner_id', partnerId)
        .order('updated_at', { ascending: false })
        .limit(100);
      const ids = (convs ?? []).map((c) => String(c.id));
      const lastByConv = new Map<string, { body: string; created_at: string }>();
      let unreadByConv: Record<string, number> = {};
      if (ids.length) {
        const { data: msgs } = await supabaseAdmin
          .from('partner_support_messages')
          .select('conversation_id,body,created_at,sender_role,read_at')
          .in('conversation_id', ids)
          .order('created_at', { ascending: false })
          .limit(1000);
        for (const m of (msgs ?? [])) {
          if (!lastByConv.has(String(m.conversation_id))) {
            lastByConv.set(String(m.conversation_id), { body: String(m.body), created_at: String(m.created_at) });
          }
          // Unread for the partner = admin messages without a read receipt.
          if (m.sender_role === 'admin' && !m.read_at) {
            unreadByConv[String(m.conversation_id)] = (unreadByConv[String(m.conversation_id)] ?? 0) + 1;
          }
        }
      }
      return {
        partnerCode: partner.partner_code ?? '',
        conversations: (convs ?? []).map((c) => ({
          ...c,
          lastMessage: lastByConv.get(String(c.id))?.body ?? '',
          lastMessageAt: lastByConv.get(String(c.id))?.created_at ?? c.last_message_at,
          unreadCount: unreadByConv[String(c.id)] ?? 0,
        })),
      };
    }

    case 'partner.support.get': {
      if (!auth?.authorized) throw new Error('Forbidden');
      await ensurePartnersTable();
      const partner = await findPartner(auth.uid, auth.email);
      if (!partner) throw new Error('No partner registration found for this account.');
      const conversationId = String(params.id ?? '');
      const { data: conv } = await supabaseAdmin
        .from('partner_support_conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (!conv) throw new Error('Conversation not found');
      if (String(conv.partner_id) !== String(partner.id)) throw new Error('Forbidden');
      const { data: msgs } = await supabaseAdmin
        .from('partner_support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(500);
      // Mark the partner's side read: every unread admin message is receipted.
      const unreadAdmin = (msgs ?? []).filter((m) => m.sender_role === 'admin' && !m.read_at);
      for (const m of unreadAdmin) {
        void supabaseAdmin.from('partner_support_messages').update({ read_at: new Date().toISOString() }).eq('id', String(m.id));
      }
      const { data: props } = partner.uid
        ? await supabaseAdmin.from('properties').select('id,property_code,title,status').eq('uid', String(partner.uid)).order('created_at', { ascending: false }).limit(20)
        : { data: [] };
      return { conversation: conv, messages: msgs ?? [], partner, relatedProperties: props ?? [] };
    }

    case 'partner.support.create': {
      if (!auth?.authorized) throw new Error('Forbidden');
      if (rateLimited(`support:${auth.uid}`, 5, 60_000)) throw new Error('Too many requests — please wait a moment.');
      await ensurePartnersTable();
      const partner = await findPartner(auth.uid, auth.email);
      if (!partner) throw new Error('No partner registration found for this account.');
      const subject = String(params.subject ?? '').trim().slice(0, 160);
      const body = String(params.body ?? '').trim().slice(0, 4000);
      const category = String(params.category ?? 'Other').trim().slice(0, 60);
      if (!subject || !body) throw new Error('Subject and message are required.');
      const now = new Date().toISOString();
      const conversationId = randomUUID();
      const insertConv: Record<string, unknown> = {
        id: conversationId,
        partner_id: String(partner.id),
        partner_uid: String(partner.uid ?? ''),
        support_ref: await nextSupportRef(),
        subject,
        category,
        status: 'Open',
        created_at: now,
        updated_at: now,
        last_message_at: now,
      };
      { const { error } = await supabaseAdmin.from('partner_support_conversations').insert(insertConv); if (error) throw new Error(error.message); }
      const { data: msg, error: msgErr } = await supabaseAdmin.from('partner_support_messages').insert({
        id: randomUUID(),
        conversation_id: conversationId,
        sender_role: 'partner',
        sender_id: auth.uid,
        sender_name: String(partner.full_name ?? ''),
        body,
        created_at: now,
      }).select().single();
      if (msgErr) throw new Error(msgErr.message);
      await logPartnerActivity({
        partnerId: String(partner.id),
        action: 'SUPPORT REQUEST OPENED',
        description: `${insertConv.support_ref} — ${subject}`.slice(0, 300),
        actorType: 'partner',
        actor: String(partner.full_name ?? auth.email),
        relatedType: 'support_conversation',
        relatedId: conversationId,
      });
      return { conversation: insertConv, message: msg };
    }

    case 'partner.support.reply': {
      if (!auth?.authorized) throw new Error('Forbidden');
      if (rateLimited(`support:${auth.uid}`, 12, 60_000)) throw new Error('Too many requests — please wait a moment.');
      await ensurePartnersTable();
      const partner = await findPartner(auth.uid, auth.email);
      if (!partner) throw new Error('No partner registration found for this account.');
      const conversationId = String(params.id ?? '');
      const body = String(params.body ?? '').trim().slice(0, 4000);
      if (!body) throw new Error('Message is empty.');
      const { data: conv } = await supabaseAdmin
        .from('partner_support_conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (!conv) throw new Error('Conversation not found');
      if (String(conv.partner_id) !== String(partner.id)) throw new Error('Forbidden');
      const now = new Date().toISOString();
      const { data: msg, error: msgErr } = await supabaseAdmin.from('partner_support_messages').insert({
        id: randomUUID(),
        conversation_id: conversationId,
        sender_role: 'partner',
        sender_id: auth.uid,
        sender_name: String(partner.full_name ?? ''),
        body,
        created_at: now,
      }).select().single();
      if (msgErr) throw new Error(msgErr.message);
      // A partner reply on a resolved thread reopens it; otherwise keep status.
      const nextStatus = conv.status === 'Resolved' ? 'Open' : conv.status;
      await supabaseAdmin.from('partner_support_conversations').update({ status: nextStatus, updated_at: now, last_message_at: now }).eq('id', conversationId);
      await logPartnerActivity({
        partnerId: String(partner.id),
        action: conv.status === 'Resolved' ? 'SUPPORT REQUEST REOPENED' : 'SUPPORT MESSAGE SENT',
        description: `${conv.support_ref} — ${subjectShort(body)}`,
        actorType: 'partner',
        actor: String(partner.full_name ?? auth.email),
        relatedType: 'support_conversation',
        relatedId: conversationId,
      });
      return { message: msg, conversation: { ...conv, status: nextStatus, updated_at: now } };
    }

    case 'partner.support.adminList': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const { data: convsRaw } = await supabaseAdmin
        .from('partner_support_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(300);
      const convs = convsRaw ?? [];
      const partnerIds = Array.from(new Set(convs.map((c) => String(c.partner_id))));
      const partnerMap = new Map<string, Record<string, unknown>>();
      for (let i = 0; i < partnerIds.length; i += 100) {
        const chunk = partnerIds.slice(i, i + 100);
        if (!chunk.length) continue;
        const { data: prows } = await supabaseAdmin.from('partners').select('id,partner_code,full_name,partner_type,status,mobile,email').in('id', chunk);
        for (const p of prows ?? []) partnerMap.set(String(p.id), p);
      }
      const ids = convs.map((c) => String(c.id));
      const lastByConv = new Map<string, { body: string; created_at: string }>();
      const unreadByConv: Record<string, number> = {};
      if (ids.length) {
        const { data: msgs } = await supabaseAdmin
          .from('partner_support_messages')
          .select('conversation_id,body,created_at,sender_role,read_at')
          .in('conversation_id', ids)
          .order('created_at', { ascending: false })
          .limit(2000);
        for (const m of (msgs ?? [])) {
          if (!lastByConv.has(String(m.conversation_id))) {
            lastByConv.set(String(m.conversation_id), { body: String(m.body), created_at: String(m.created_at) });
          }
          if (m.sender_role === 'partner' && !m.read_at) {
            unreadByConv[String(m.conversation_id)] = (unreadByConv[String(m.conversation_id)] ?? 0) + 1;
          }
        }
      }
      return {
        conversations: convs.map((c) => ({
          ...c,
          lastMessage: lastByConv.get(String(c.id))?.body ?? '',
          lastMessageAt: lastByConv.get(String(c.id))?.created_at ?? c.last_message_at,
          unreadCount: unreadByConv[String(c.id)] ?? 0,
          partner: partnerMap.get(String(c.partner_id)) ?? null,
        })),
      };
    }

    case 'partner.support.adminGet': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const { data: conv } = await supabaseAdmin
        .from('partner_support_conversations')
        .select('*')
        .eq('id', String(params.id ?? ''))
        .maybeSingle();
      if (!conv) throw new Error('Conversation not found');
      const { data: msgs } = await supabaseAdmin
        .from('partner_support_messages')
        .select('*')
        .eq('conversation_id', String(conv.id))
        .order('created_at', { ascending: true })
        .limit(500);
      // Read receipt for the admin side: partner messages are marked read.
      const unreadPartner = (msgs ?? []).filter((m) => m.sender_role === 'partner' && !m.read_at);
      if (unreadPartner.length) {
        const now = new Date().toISOString();
        await supabaseAdmin
          .from('partner_support_messages')
          .update({ read_at: now })
          .in('id', unreadPartner.map((m) => String(m.id)));
      }
      const { data: partner } = await supabaseAdmin.from('partners').select('*').eq('id', String(conv.partner_id)).maybeSingle();
      const { data: props } = (partner?.uid ?? '')
        ? await supabaseAdmin.from('properties').select('id,property_code,title,status').eq('uid', String(partner.uid)).order('created_at', { ascending: false }).limit(20)
        : { data: [] };
      return { conversation: conv, messages: msgs ?? [], partner: partner ?? null, relatedProperties: props ?? [] };
    }

    case 'partner.support.adminReply': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const conversationId = String(params.id ?? '');
      const body = String(params.body ?? '').trim().slice(0, 4000);
      if (!body) throw new Error('Message is empty.');
      const { data: conv } = await supabaseAdmin
        .from('partner_support_conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (!conv) throw new Error('Conversation not found');
      const now = new Date().toISOString();
      const { data: msg, error: msgErr } = await supabaseAdmin.from('partner_support_messages').insert({
        id: randomUUID(),
        conversation_id: conversationId,
        sender_role: 'admin',
        sender_id: auth.uid,
        sender_name: auth.email,
        body,
        created_at: now,
      }).select().single();
      if (msgErr) throw new Error(msgErr.message);
      await supabaseAdmin.from('partner_support_conversations').update({ status: 'In Progress', updated_at: now, last_message_at: now }).eq('id', conversationId);
      await logPartnerActivity({
        partnerId: String(conv.partner_id),
        action: 'SUPPORT REPLY RECEIVED',
        description: `${conv.support_ref} — a reply from the VJR Estate team is waiting in Help & Support.`,
        actorType: 'admin',
        actor: auth.email,
        relatedType: 'support_conversation',
        relatedId: conversationId,
      });
      return { message: msg };
    }

    case 'partner.support.adminUpdate': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const conversationId = String(params.id ?? '');
      const { data: conv } = await supabaseAdmin
        .from('partner_support_conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      if (!conv) throw new Error('Conversation not found');
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const allowedStatuses = ['Open', 'In Progress', 'Waiting for Partner', 'Resolved'];
      if (params.status !== undefined) {
        const status = String(params.status);
        if (!allowedStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);
        patch.status = status;
        if (status === 'Resolved') {
          patch.resolved_at = new Date().toISOString();
          patch.resolved_by = auth.email;
        }
        if (conv.status === 'Resolved' && status !== 'Resolved') {
          patch.resolved_at = null;
          patch.resolved_by = null;
        }
      }
      if (params.assignedAdmin !== undefined) patch.assigned_admin = String(params.assignedAdmin).slice(0, 120);
      if (params.priority !== undefined) {
        const priority = String(params.priority);
        if (!['Low', 'Normal', 'High'].includes(priority)) throw new Error(`Invalid priority: ${priority}`);
        patch.priority = priority;
      }
      const { error } = await supabaseAdmin.from('partner_support_conversations').update(patch).eq('id', conversationId);
      if (error) throw new Error(error.message);
      if (patch.status !== undefined && patch.status !== conv.status) {
        await logPartnerActivity({
          partnerId: String(conv.partner_id),
          action: patch.status === 'Resolved' ? 'SUPPORT REQUEST RESOLVED' : 'SUPPORT STATUS CHANGED',
          description: `${conv.support_ref} — status: ${String(conv.status)} → ${String(patch.status)}`,
          actorType: 'admin',
          actor: auth.email,
          relatedType: 'support_conversation',
          relatedId: conversationId,
        });
      }
      return { ok: true };
    }

    case 'partner.admin.note.add': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const id = String(params.id ?? '');
      const body = String(params.body ?? '').trim().slice(0, 2000);
      if (!body) throw new Error('Note text is required');
      const noteType = String(params.noteType ?? 'General').slice(0, 40);
      const priority = String(params.priority ?? 'Normal').slice(0, 20);
      const { data: note, error } = await supabaseAdmin.from('partner_notes').insert({
        id: randomUUID(),
        partner_id: id,
        author_email: auth!.email,
        note_type: noteType,
        priority,
        body,
      }).select('*').single();
      if (error) throw new Error(error.message);
      await logPartnerActivity({ partnerId: id, action: 'ADMIN NOTE ADDED', description: `[${noteType}/${priority}] ${body.slice(0, 300)}`, actorType: 'admin', actor: auth!.email, relatedType: 'note', relatedId: note.id });
      return { note };
    }

    case 'partner.admin.transaction.create': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const partnerId = String(params.partnerId ?? '');
      const transactionValue = Math.max(0, Number(params.transactionValue) || 0);
      const commissionPercent = params.commissionPercent === undefined || params.commissionPercent === null || params.commissionPercent === ''
        ? null
        : Math.max(0, Number(params.commissionPercent));
      const vjrAmount = Math.max(0, Number(params.vjrAmount) || (commissionPercent !== null ? (transactionValue * commissionPercent) / 100 : 0));
      const partnerAmount = Math.max(0, Number(params.partnerAmount) || (transactionValue - vjrAmount));
      const gstAmount = Math.max(0, Number(params.gstAmount) || 0);
      const { data: txn, error } = await supabaseAdmin.from('partner_transactions').insert({
        id: randomUUID(),
        partner_id: partnerId,
        property_id: params.propertyId ? String(params.propertyId) : null,
        property_title: String(params.propertyTitle ?? '').slice(0, 200),
        counterparty_name: String(params.counterpartyName ?? '').slice(0, 120),
        txn_type: ['sale', 'lease', 'rental'].includes(String(params.txnType)) ? String(params.txnType) : 'sale',
        transaction_value: transactionValue,
        commission_percent: commissionPercent,
        vjr_amount: vjrAmount,
        partner_amount: partnerAmount,
        gst_amount: gstAmount,
        txn_status: ['PENDING', 'NEGOTIATION', 'AGREED', 'CLOSED', 'CANCELLED', 'DISPUTED'].includes(String(params.txnStatus)) ? String(params.txnStatus) : 'PENDING',
        payment_status: 'UNPAID',
        closure_date: params.closureDate ? String(params.closureDate) : null,
        notes: String(params.notes ?? '').slice(0, 1000),
        created_by: auth!.email,
      }).select('*').single();
      if (error) throw new Error(error.message);
      await logPartnerActivity({
        partnerId,
        action: 'TRANSACTION CREATED',
        description: `${txn.property_title || 'Transaction'} · ₹${transactionValue.toLocaleString('en-IN')} · ${txn.txn_status}`,
        actorType: 'admin',
        actor: auth!.email,
        relatedType: 'transaction',
        relatedId: txn.id,
      });
      return { transaction: txn };
    }

    case 'partner.admin.transaction.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const id = String(params.id ?? '');
      const { data: prevTxn } = await supabaseAdmin.from('partner_transactions').select('*').eq('id', id).maybeSingle();
      if (!prevTxn) throw new Error('Transaction not found');
      // Transactions are historical records: update only, never delete.
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const key of ['txn_status', 'payment_status', 'notes', 'closure_date'] as const) {
        if (params[key] !== undefined) patch[key] = params[key];
      }
      if (params.paidAmount !== undefined) patch.paid_amount = Math.max(0, Number(params.paidAmount) || 0);
      if (params.paidAmount !== undefined) {
        const paid = Math.max(0, Number(params.paidAmount) || 0);
        const total = Number(prevTxn.vjr_amount ?? 0) + Number(prevTxn.gst_amount ?? 0);
        patch.payment_status = paid >= total && total > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';
      }
      const { data: txn, error } = await supabaseAdmin.from('partner_transactions').update(patch).eq('id', id).select('*').single();
      if (error) throw new Error(error.message);
      await logPartnerActivity({
        partnerId: String(prevTxn.partner_id),
        action: 'TRANSACTION UPDATED',
        description: `${txn.property_title || 'Transaction'} · status ${txn.txn_status} · payment ${txn.payment_status}`,
        actorType: 'admin',
        actor: auth!.email,
        relatedType: 'transaction',
        relatedId: id,
        prevValue: `${prevTxn.txn_status}/${prevTxn.payment_status}`,
        newValue: `${txn.txn_status}/${txn.payment_status}`,
      });
      return { transaction: txn };
    }

    case 'partner.admin.dispute.create': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const partnerId = String(params.partnerId ?? '');
      const description = String(params.description ?? '').trim().slice(0, 2000);
      if (!description) throw new Error('Dispute description is required');
      const { data: dispute, error } = await supabaseAdmin.from('partner_disputes').insert({
        id: randomUUID(),
        partner_id: partnerId,
        related_property_id: params.relatedPropertyId ? String(params.relatedPropertyId) : null,
        related_lead_id: params.relatedLeadId ? String(params.relatedLeadId) : null,
        related_txn_id: params.relatedTxnId ? String(params.relatedTxnId) : null,
        dispute_type: String(params.disputeType ?? 'Other').slice(0, 60),
        description,
        assigned_admin: auth!.email,
        dispute_status: 'OPEN',
        created_by: auth!.email,
      }).select('*').single();
      if (error) throw new Error(error.message);
      await logPartnerActivity({ partnerId, action: 'DISPUTE OPENED', description: `[${dispute.dispute_type}] ${description.slice(0, 300)}`, actorType: 'admin', actor: auth!.email, relatedType: 'dispute', relatedId: dispute.id });
      return { dispute };
    }

    case 'partner.admin.dispute.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      await ensurePartnersTable();
      const id = String(params.id ?? '');
      const { data: prevDisp } = await supabaseAdmin.from('partner_disputes').select('*').eq('id', id).maybeSingle();
      if (!prevDisp) throw new Error('Dispute not found');
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (params.disputeStatus !== undefined) {
        if (!['OPEN', 'UNDER_REVIEW', 'WAITING_FOR_DOCUMENTS', 'RESOLVED', 'CLOSED'].includes(String(params.disputeStatus))) throw new Error('Invalid dispute status');
        patch.dispute_status = params.disputeStatus;
      }
      if (params.resolution !== undefined) {
        patch.resolution = String(params.resolution).slice(0, 2000);
        patch.resolution_date = new Date().toISOString().slice(0, 10);
      }
      if (params.assignedAdmin !== undefined) patch.assigned_admin = String(params.assignedAdmin).slice(0, 120);
      const { data: dispute, error } = await supabaseAdmin.from('partner_disputes').update(patch).eq('id', id).select('*').single();
      if (error) throw new Error(error.message);
      await logPartnerActivity({
        partnerId: String(prevDisp.partner_id),
        action: 'DISPUTE UPDATED',
        description: `Status ${dispute.dispute_status}${dispute.resolution ? ` · ${String(dispute.resolution).slice(0, 200)}` : ''}`,
        actorType: 'admin',
        actor: auth!.email,
        relatedType: 'dispute',
        relatedId: id,
        prevValue: String(prevDisp.dispute_status),
        newValue: String(dispute.dispute_status),
      });
      return { dispute };
    }

    // ── Images (properties, auctions, team) ────────────────────────────
    case 'image.upload': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { bucket, entityId, name, contentType, dataBase64 } = params;
      if (!['property-images', 'team-photos', 'partner-photos'].includes(bucket)) throw new Error('Invalid bucket');
      if (!entityId) throw new Error('entityId required');
      if (!ALLOWED_IMAGE_TYPES.test(contentType ?? '')) throw new Error('Invalid image type');
      const buffer = decodeBase64(dataBase64);
      if (buffer.length === 0) throw new Error('Empty file');
      if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image exceeds 8 MB');

      // Mirror Firebase rules: admin OR the property owner may upload.
      // team-photos is admin-only (same as team_members writes).
      // partner-photos: entityId IS the partner id — only that partner or an
      // admin may upload to their folder.
      if (!isAdmin(auth)) {
        if (bucket === 'team-photos') throw new Error('Forbidden');
        if (bucket === 'partner-photos') {
          await ensurePartnersTable();
          const partner = await findPartner(auth.uid, auth.email);
          if (!partner || String(partner.id) !== String(entityId)) throw new Error('Forbidden');
        } else {
          const row = await getPropertyRow(entityId);
          if (!row || row.uid !== auth.uid) throw new Error('Forbidden');
        }
      }

      const safeName = sanitizeFileName(name);
      const path = `${entityId}/${Date.now()}-${safeName}`;
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, buffer, { contentType, upsert: false });
      if (error) throw new Error(error.message);
      const { data: publicUrl } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
      // getPublicUrl returns { publicUrl } — unwrap so callers always receive
      // a plain URL string. The object shape used to be persisted into the
      // properties.images array, which broke every listing's photo gallery.
      const url = typeof publicUrl === 'string' ? publicUrl : publicUrl?.publicUrl ?? '';
      if (!url) throw new Error('Upload succeeded but no public URL was generated');
      return { url, path };
    }

    case 'image.delete': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { bucket, path } = params;
      if (!['property-images', 'team-photos', 'partner-photos'].includes(bucket)) throw new Error('Invalid bucket');
      if (!path) throw new Error('path required');
      if (!isAdmin(auth)) {
        if (bucket === 'team-photos') throw new Error('Forbidden');
        if (bucket === 'partner-photos') {
          await ensurePartnersTable();
          const partner = await findPartner(auth.uid, auth.email);
          if (!partner || String(partner.id) !== String(path.split('/')[0])) throw new Error('Forbidden');
        } else {
          const row = await getPropertyRow(path.split('/')[0]);
          if (!row || row.uid !== auth.uid) throw new Error('Forbidden');
        }
      }
      const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
      if (error) throw new Error(error.message);
      return { path };
    }

    // ── Resumes ─────────────────────────────────────────────────────────
    case 'resume.upload': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { jobId, name, contentType, dataBase64 } = params;
      if (!ALLOWED_RESUME_TYPES.test(contentType ?? '')) throw new Error('Invalid file type');
      const buffer = decodeBase64(dataBase64);
      if (buffer.length === 0) throw new Error('Empty file');
      if (buffer.length > MAX_RESUME_BYTES) throw new Error('File exceeds 5 MB');
      const safeName = sanitizeFileName(name);
      const path = `${jobId}/${Date.now()}-${safeName}`;
      const { error } = await supabaseAdmin.storage
        .from('resumes')
        .upload(path, buffer, { contentType, upsert: false });
      if (error) throw new Error(error.message);
      const { data: publicUrl } = supabaseAdmin.storage.from('resumes').getPublicUrl(path);
      const url = typeof publicUrl === 'string' ? publicUrl : publicUrl?.publicUrl ?? '';
      return { url, path, fileName: name };
    }

    // ── Requirements ────────────────────────────────────────────────────
    case 'requirement.create': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { paymentMode, buyerName, buyerPhone, reqId, postedAt, ...publicFields } = params;
      const generatedReqId = reqId ?? await nextReqId();
      const { data: req, error } = await supabaseAdmin
        .from('requirements')
        .insert({
          purpose: publicFields.purpose ?? '',
          purpose_other: publicFields.purposeOther ?? null,
          property_type: publicFields.propertyType ?? '',
          property_type_other: publicFields.propertyTypeOther ?? null,
          locations: publicFields.locations ?? [],
          budget_min: publicFields.budgetMin ?? 0,
          budget_max: publicFields.budgetMax ?? 0,
          timeline: publicFields.timeline ?? '',
          notes: publicFields.notes ?? null,
          req_id: generatedReqId,
          status: 'open',
          click_count: 0,
          posted_at: dbDate(postedAt) ?? new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      await supabaseAdmin.from('requirement_private').insert({
        id: req.id,
        payment_mode: paymentMode ?? 'Other',
        buyer_name: buyerName ?? '',
        buyer_phone: buyerPhone ?? '',
      });
      return { id: req.id, reqId: generatedReqId };
    }

    case 'requirement.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, paymentMode, buyerName, buyerPhone, ...fields } = params;
      const updates: Record<string, unknown> = {};
      if (fields.purpose !== undefined) updates.purpose = fields.purpose;
      if (fields.propertyType !== undefined) updates.property_type = fields.propertyType;
      if (fields.locations !== undefined) updates.locations = fields.locations;
      if (fields.budgetMin !== undefined) updates.budget_min = fields.budgetMin;
      if (fields.budgetMax !== undefined) updates.budget_max = fields.budgetMax;
      if (fields.timeline !== undefined) updates.timeline = fields.timeline;
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.notes !== undefined) updates.notes = fields.notes;
      if (Object.keys(updates).length > 0) {
        const { error } = await supabaseAdmin.from('requirements').update(updates).eq('id', id);
        if (error) throw new Error(error.message);
      }
      if (paymentMode !== undefined || buyerName !== undefined || buyerPhone !== undefined) {
        const { error } = await supabaseAdmin.from('requirement_private').update({
          ...(paymentMode !== undefined ? { payment_mode: paymentMode } : {}),
          ...(buyerName !== undefined ? { buyer_name: buyerName } : {}),
          ...(buyerPhone !== undefined ? { buyer_phone: buyerPhone } : {}),
        }).eq('id', id);
        if (error) throw new Error(error.message);
      }
      return { id };
    }

    case 'requirement.delete': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id } = params;
      const { error } = await supabaseAdmin.from('requirements').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'requirement.click': {
      if (!params._public) throw new Error('Forbidden');
      if (rateLimited(`click:${ip}`)) throw new Error('Too many requests');
      const { id } = params;
      const { data, error } = await supabaseAdmin.rpc('increment_requirement_click', {
        p_req_id: id,
      });
      if (error) throw new Error(error.message);
      return { clickCount: data };
    }

    // ── Property leads (public) ─────────────────────────────────────────
    // Site-visit bookings are anonymous (no login): the booking form posts
    // name, mobile, visit date & time and they are stored in Supabase.
    // Message text is derived server-side so callers can't spoof content.
    case 'lead.create': {
      if (!params._public) throw new Error('Forbidden');
      if (rateLimited(`lead:${ip}`, 10, 60_000)) throw new Error('Too many requests');
      const {
        propertyId,
        propertyTitle,
        leadType,
        propertyType,
        propertyArea,
        propertyPrice,
        propertyMonthlyRental,
        propertyUrl,
        visitDate,
        visitTime,
        buyerName,
        buyerPhone,
        listedBy,
        source,
      } = params;
      if (!propertyId || !propertyTitle || !leadType) {
        throw new Error('Invalid lead');
      }
      if (!buyerName || !buyerPhone) {
        throw new Error('Name and mobile number are required');
      }
      if (leadType === 'book_visit' && !visitDate) {
        throw new Error('Visit date is required');
      }
      const cleanName = String(buyerName).trim().slice(0, 80);
      const cleanPhone = String(buyerPhone).replace(/\D/g, '').slice(0, 10);
      if (cleanPhone.length !== 10) {
        throw new Error('A valid 10-digit mobile number is required');
      }
      const message = `Site visit booking — ${propertyTitle}${visitDate ? ` on ${visitDate}` : ''}${visitTime ? ` at ${visitTime}` : ''}`;
      // Booking source is derived server-side from the property's owning
      // partner (properties.uid) — never from a client-supplied label.
      const { data: listingOwner } = await supabaseAdmin
        .from('properties')
        .select('uid')
        .eq('id', String(propertyId))
        .maybeSingle();
      const { data, error } = await supabaseAdmin
        .from('property_leads')
        .insert({
          property_id: String(propertyId),
          property_title: String(propertyTitle).slice(0, 200),
          property_type: propertyType ?? '',
          property_area: propertyArea ?? '',
          property_price: propertyPrice ?? '',
          property_monthly_rental: propertyMonthlyRental ?? null,
          property_url: propertyUrl ?? '',
          lead_type: leadType === 'book_visit' ? 'book_visit' : 'whatsapp',
          visit_date: visitDate ?? null,
          visit_time: visitTime ?? null,
          buyer_name: cleanName,
          buyer_phone: cleanPhone,
          message,
          source: source ?? 'card',
          owner_uid: (listingOwner as { uid?: string | null } | null)?.uid ?? null,
          listed_by: listedBy ?? null,
          ip_address: ip,
          status: 'new',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    // ── Users ───────────────────────────────────────────────────────────
    case 'user.track': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { uid, ...payload } = params;
      if (uid !== auth.uid) throw new Error('Forbidden');
      // Users can never change their own suspension state.
      delete payload.suspended;
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('uid,login_count,suspended')
        .eq('uid', uid)
        .maybeSingle();
      if (existing?.suspended === true) {
        return { suspended: true };
      }
      const row = {
        uid,
        email: payload.email ?? '',
        display_name: payload.displayName ?? '',
        photo_url: payload.photoURL ?? '',
        login_count: existing ? (existing.login_count ?? 0) + (payload.loginCount ?? 0) : (payload.loginCount ?? 1),
        last_login: payload.lastLogin ?? new Date().toISOString(),
        last_seen: payload.lastSeen ?? new Date().toISOString(),
        created_at: existing ? undefined : (payload.createdAt ?? new Date().toISOString()),
        suspended: false,
        ...(payload.ipLocation ? { ip_location: payload.ipLocation } : {}),
        ...(payload.location ? { location: payload.location } : {}),
        ...(payload.gpsLocation ? { gps_location: payload.gpsLocation } : {}),
        ...(payload.loginHistory ? { login_history: payload.loginHistory } : {}),
      };
      const { error } = await supabaseAdmin.from('users').upsert(row, { onConflict: 'uid' });
      if (error) throw new Error(error.message);
      return { suspended: existing?.suspended === true };
    }

    case 'user.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('last_seen', { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }

    // ── Agents for listing forms (any signed-in user: granted users pick
    //    the agent they're listing for; admins see the same list) ─────────
    case 'agents.publicList': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const [agRes, empRes] = await Promise.all([
        supabaseAdmin
          .from('agents')
          .select('id,name')
          .eq('active', true)
          .order('name', { ascending: true }),
        supabaseAdmin
          .from('employees')
          .select('employee_id,name,designation,status')
          .or('designation.ilike.%agent%,designation.ilike.%sales%,designation.ilike.%partner%')
          .eq('status', 'Active')
          .order('name', { ascending: true }),
      ]);
      if (agRes.error) throw new Error(agRes.error.message);
      const agentEntries = (agRes.data ?? []).map((a: { id: string; name: string }) => ({
        id: a.id,
        name: a.name,
        source: 'agent' as const,
      }));
      const empEntries = empRes.error
        ? []
        : (empRes.data ?? []).map((e: { employee_id: string; name: string }) => ({
            id: e.employee_id,
            name: e.name,
            source: 'employee' as const,
          }));
      return { data: [...agentEntries, ...empEntries] };
    }

    // ── User-facing agents for the List Property form (public reads) ──

    case 'user.checkSuspended': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('suspended')
        .eq('uid', auth.uid)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { suspended: data?.suspended === true };
    }

    case 'user.suspend': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { uid, suspended } = params;
      const { error } = await supabaseAdmin.from('users').update({ suspended: !!suspended }).eq('uid', uid);
      if (error) throw new Error(error.message);
      return { uid, suspended: !!suspended };
    }

    // ── Add-Property access grant (admin) ─────────────────────────────
    case 'user.access': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { uid, canAddProperty } = params;
      const { error } = await supabaseAdmin
        .from('users')
        .update({ can_add_property: !!canAddProperty })
        .eq('uid', uid);
      if (error) throw new Error(error.message);
      return { uid, canAddProperty: !!canAddProperty };
    }

    case 'user.accessStatus': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('can_add_property')
        .eq('uid', auth.uid)
        .maybeSingle();
      if (error) throw new Error(error.message);
      // Super admins always have access.
      return { canAddProperty: isAdmin(auth) || data?.can_add_property === true };
    }

    // ── Property leads (read: admin all, owner own) ────────────────────
    // Soft-deleted bookings (moved to deleted_bookings history) are excluded
    // from the live pipeline; the CRM reads history via lead.history.
    case 'lead.list': {
      if (!auth?.authorized) throw new Error('Forbidden');
      let query = supabaseAdmin
        .from('property_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!isAdmin(auth)) query = query.eq('owner_uid', auth.uid);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = await filterOutSoftDeleted(data ?? []);
      return { data: rows };
    }

    // ── Property leads: booking status management (admin) ──────────────────
    case 'lead.setStatus': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, status } = params;
      if (!id) throw new Error('Booking id is required');
      if (!['new', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
        throw new Error('Invalid status');
      }
      const { data: row, error: fetchErr } = await supabaseAdmin
        .from('property_leads')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) throw new Error(fetchErr.message);
      if (!row) throw new Error('Booking not found');
      const { error } = await supabaseAdmin
        .from('property_leads')
        .update({ status })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    // ── Property leads: delete a booking (admin) — moves it into the
    //    deleted_bookings history so the CRM can show it under History.
    //    Permanent removal from history is a separate action (lead.purge).
    case 'lead.remove': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id } = params;
      if (!id) throw new Error('Booking id is required');
      const { data: row, error: fetchErr } = await supabaseAdmin
        .from('property_leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) throw new Error(fetchErr.message);
      if (!row) throw new Error('Booking not found');

      // Archive to history first, but NEVER let history problems block the
      // delete: if the table is missing it is auto-created and the booking
      // is still removed from the live pipeline either way.
      let historyError: string | null = null;
      let histRes = await supabaseAdmin
        .from('deleted_bookings')
        .upsert(historyRowFromLead(row, new Date().toISOString()), { onConflict: 'id' });
      if (histRes.error && isMissingRelation(histRes.error.message)) {
        await ensureDeletedBookingsTable();
        histRes = await supabaseAdmin
          .from('deleted_bookings')
          .upsert(historyRowFromLead(row, new Date().toISOString()), { onConflict: 'id' });
      }
      if (histRes.error) historyError = histRes.error.message;

      const { error } = await supabaseAdmin
        .from('property_leads')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { id, archived: !historyError };
    }

    // ── Deleted-booking history (admin): read + permanent delete ────────
    case 'lead.history': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      let res = await supabaseAdmin
        .from('deleted_bookings')
        .select('*')
        .order('deleted_at', { ascending: false })
        .limit(500);
      if (res.error && isMissingRelation(res.error.message)) {
        await ensureDeletedBookingsTable();
        res = await supabaseAdmin
          .from('deleted_bookings')
          .select('*')
          .order('deleted_at', { ascending: false })
          .limit(500);
      }
      if (res.error) throw new Error(res.error.message);
      return { data: res.data ?? [] };
    }

    case 'lead.purge': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id } = params;
      if (!id) throw new Error('Booking id is required');
      let res = await supabaseAdmin
        .from('deleted_bookings')
        .delete()
        .eq('id', id);
      if (res.error && isMissingRelation(res.error.message)) {
        await ensureDeletedBookingsTable();
        res = await supabaseAdmin
          .from('deleted_bookings')
          .delete()
          .eq('id', id);
      }
      if (res.error) throw new Error(res.error.message);
      return { id };
    }

    // ── Site-visit slot capacity (admin) ────────────────────────────────
    // Admin sets how many visits per day a property accepts. Stored on the
    // property row; availability is always derived from live bookings.
    case 'slots.set': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { propertyId, slots } = params;
      if (!propertyId) throw new Error('Property id is required');
      const value = slots === null || slots === undefined || slots === '' ? null : Number(slots);
      if (value !== null && (!Number.isFinite(value) || value < 0 || value > 50)) {
        throw new Error('Slots must be between 0 and 50 (or empty for no limit)');
      }
      let res = await supabaseAdmin
        .from('properties')
        .update({ visit_slots: value, updated_at: new Date().toISOString() })
        .eq('id', String(propertyId));
      if (res.error && isMissingRelation(res.error.message)) {
        await ensureVisitSlotsColumn();
        res = await supabaseAdmin
          .from('properties')
          .update({ visit_slots: value, updated_at: new Date().toISOString() })
          .eq('id', String(propertyId));
      }
      if (res.error) throw new Error(res.error.message);
      return { propertyId: String(propertyId), visitSlots: value };
    }

    case 'slots.availability': {
      if (!params._public) throw new Error('Forbidden');
      const propertyId = String(params.propertyId ?? '');
      if (!propertyId) throw new Error('Property id is required');
      // Today in IST (site operates in India regardless of server timezone).
      const todayIso = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
      let propRes = await supabaseAdmin
        .from('properties')
        .select('visit_slots')
        .eq('id', propertyId)
        .maybeSingle();
      if (propRes.error && isMissingRelation(propRes.error.message)) {
        await ensureVisitSlotsColumn();
        propRes = await supabaseAdmin
          .from('properties')
          .select('visit_slots')
          .eq('id', propertyId)
          .maybeSingle();
      }
      const leadsRes = await supabaseAdmin
        .from('property_leads')
        .select('id')
        .eq('property_id', propertyId)
        .eq('visit_date', todayIso)
        .neq('status', 'cancelled');
      const limit = propRes.data?.visit_slots ?? null;
      const booked = (leadsRes.data ?? []).length;
      const remaining = limit === null ? null : Math.max(0, limit - booked);
      return { visitSlots: limit, bookedToday: booked, remaining };
    }

    // ── LEDGERS: compliance calendar + legal cases ──────────────────────
    case 'ledger.items.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const fy = params.fy ? String(params.fy) : null;
      const runQ = () => {
        let q = supabaseAdmin
          .from('ledger_compliance_items')
          .select('*')
          .order('due_date', { ascending: true })
          .limit(500);
        if (fy) q = q.eq('fy', fy);
        return q;
      };
      let r = await runQ();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelation(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? [] };
    }

    case 'ledger.item.upsert': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, ...fields } = params;
      const clean: Record<string, unknown> = {};
      const allowed = ['law', 'form', 'title', 'period', 'fy', 'due_date', 'status', 'owner', 'filed_date', 'arn', 'penalty_exposure', 'notes', 'proof_url', 'source_url', 'assignee', 'priority', 'challan_url', 'amount_paid'];
      for (const k of allowed) if (fields[k] !== undefined) clean[k] = fields[k];
      const logIt = async () => {
        try {
          await supabaseAdmin.from('ledger_activity_log').insert({
            entity_type: 'item', entity_id: String(id ?? ''), action: id ? 'updated' : 'created',
            summary: `${clean.form ?? fields.form ?? 'Item'} (${clean.period ?? fields.period ?? ''}) ${clean.status !== undefined ? `→ ${clean.status}` : ''}`.trim(),
            actor: auth?.email ?? '',
          });
        } catch { /* log table may not exist yet */ }
      };
      if (id) {
        clean.updated_at = new Date().toISOString();
        let r = await supabaseAdmin.from('ledger_compliance_items').update(clean).eq('id', String(id));
        if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('ledger_compliance_items').update(clean).eq('id', String(id)); }
        if (r.error) throw new Error(r.error.message);
        await logIt();
        return { id: String(id) };
      }
      let r = await supabaseAdmin.from('ledger_compliance_items').insert(clean).select('id').single();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('ledger_compliance_items').insert(clean).select('id').single(); }
      if (r.error) throw new Error(r.error.message);
      await logIt();
      return { id: r.data.id };
    }

    case 'ledger.item.delete': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { error } = await supabaseAdmin.from('ledger_compliance_items').delete().eq('id', String(params.id));
      if (error) throw new Error(error.message);
      try {
        await supabaseAdmin.from('ledger_activity_log').insert({ entity_type: 'item', entity_id: String(params.id), action: 'deleted', summary: 'Obligation removed', actor: auth?.email ?? '' });
      } catch { /* best-effort */ }
      return { id: String(params.id) };
    }

    case 'ledger.log.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const runQ = () => supabaseAdmin
        .from('ledger_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      let r = await runQ();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelation(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? [] };
    }

    case 'ledger.cases.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const runQ = () => supabaseAdmin
        .from('ledger_legal_cases')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);
      let r = await runQ();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelation(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? [] };
    }

    case 'ledger.case.upsert': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, ...fields } = params;
      const clean: Record<string, unknown> = {};
      const allowed = ['case_no', 'title', 'authority', 'case_type', 'status', 'filed_on', 'next_hearing_on', 'reply_due_on', 'advocate', 'advocate_phone', 'description', 'outcome_notes', 'documents_url'];
      for (const k of allowed) if (fields[k] !== undefined) clean[k] = fields[k];
      if (id) {
        clean.updated_at = new Date().toISOString();
        let r = await supabaseAdmin.from('ledger_legal_cases').update(clean).eq('id', String(id));
        if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('ledger_legal_cases').update(clean).eq('id', String(id)); }
        if (r.error) throw new Error(r.error.message);
        return { id: String(id) };
      }
      let r = await supabaseAdmin.from('ledger_legal_cases').insert(clean).select('id').single();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('ledger_legal_cases').insert(clean).select('id').single(); }
      if (r.error) throw new Error(r.error.message);
      return { id: r.data.id };
    }

    case 'ledger.case.delete': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { error } = await supabaseAdmin.from('ledger_legal_cases').delete().eq('id', String(params.id));
      if (error) throw new Error(error.message);
      return { id: String(params.id) };
    }

    // ── LEDGERS: company profile (single row, id='company') ─────────────
    case 'ledger.logo.upload': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const ct = String(params.contentType ?? 'image/png');
      const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!ALLOWED.includes(ct)) throw new Error('Only PNG, JPG, WebP or SVG logos are allowed');
      const buf = Buffer.from(String(params.dataBase64 ?? ''), 'base64');
      if (!buf.length) throw new Error('Empty file');
      if (buf.length > 2 * 1024 * 1024) throw new Error('Logo must be under 2 MB');
      const ext = ct === 'image/svg+xml' ? 'svg' : ct === 'image/jpeg' ? 'jpg' : ct === 'image/webp' ? 'webp' : 'png';
      const path = `logos/company-logo-${Date.now()}.${ext}`;
      let up = await supabaseAdmin.storage.from('ledger-assets').upload(path, buf, { contentType: ct, upsert: false, cacheControl: '3600' });
      if (up.error && /bucket/i.test(up.error.message)) {
        // Bucket missing — create it best-effort via the exec_sql RPC and retry once.
        try {
          await fetch(`${(process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '').replace(/\/$/, '')}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
            body: JSON.stringify({ q: "INSERT INTO storage.buckets (id, name, public) VALUES ('ledger-assets','ledger-assets',TRUE) ON CONFLICT (id) DO NOTHING;" }),
          });
          up = await supabaseAdmin.storage.from('ledger-assets').upload(path, buf, { contentType: ct, upsert: false, cacheControl: '3600' });
        } catch { /* fall through to the original error */ }
      }
      if (up.error) throw new Error(up.error.message);
      const pub = supabaseAdmin.storage.from('ledger-assets').getPublicUrl(path);
      return { url: pub.data.publicUrl };
    }

    // ── LEDGERS: company master data (incorporation baseline + editable) ─
    // One read returning everything the Company Master UI needs. Each row
    // carries source + verification_status; ownership is CALCULATED.
    case 'ledger.master.get': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const tables = ['ledger_share_capital', 'ledger_shareholders', 'ledger_shareholding', 'ledger_address_history', 'ledger_moa_objects', 'ledger_constitution'] as const;
      const out: Record<string, unknown> = {};
      for (const t of tables) {
        const q = () => supabaseAdmin.from(t).select('*').limit(200);
        let r = await q();
        if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await q(); }
        if (r.error && !isMissingRelation(r.error.message)) throw new Error(r.error.message);
        out[t] = r.data ?? [];
      }
      const cQ = () => supabaseAdmin.from('ledger_constitution').select('*').eq('id', 'company').maybeSingle();
      let c = await cQ();
      if (c.error && isMissingRelation(c.error.message)) { await ensureLedgerSchema(); c = await cQ(); }
      out.ledger_constitution = c.data ?? null;
      return out;
    }

    // Single-table editable write with a strict per-table whitelist. Every
    // change is audit-logged (spec §35) — never silent.
    case 'ledger.master.set': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const MASTER_TABLES: Record<string, string[]> = {
        ledger_share_capital: ['capital_type', 'authorised_amount', 'authorised_shares', 'subscribed_amount', 'subscribed_shares', 'face_value', 'class_name', 'effective_from', 'effective_to', 'source', 'verification_status'],
        ledger_shareholders: ['name', 'type', 'pan', 'occupation', 'original_subscriber', 'current_shareholder', 'source', 'verification_status', 'effective_from', 'effective_to', 'notes'],
        ledger_shareholding: ['shareholder_id', 'snapshot_type', 'shares_held', 'share_class', 'face_value', 'subscription_value', 'effective_from', 'effective_to', 'source', 'verification_status'],
        ledger_address_history: ['address_type', 'full_address', 'state', 'district', 'city', 'pin', 'effective_from', 'effective_to', 'source', 'verification_status'],
        ledger_moa_objects: ['object_type', 'title', 'description', 'moa_supported', 'currently_conducted', 'source'],
      };
      const table = String(params.table ?? '');
      const allowed = MASTER_TABLES[table];
      if (!allowed) throw new Error('Unknown master table');
      const { id, ...fields } = params.row as Record<string, unknown>;
      const clean: Record<string, unknown> = {};
      for (const k of allowed) if (fields[k] !== undefined) clean[k] = fields[k];
      if (!Object.keys(clean).length) throw new Error('Nothing to update');
      const write = async () => {
        if (id) {
          clean.updated_at = new Date().toISOString();
          const { error } = await supabaseAdmin.from(table).update(clean).eq('id', String(id));
          if (error) throw new Error(error.message);
          return { id: String(id) };
        }
        const { data, error } = await supabaseAdmin.from(table).insert(clean).select('id').single();
        if (error) throw new Error(error.message);
        return { id: data.id };
      };
      let result: { id: string };
      try {
        result = await write();
      } catch (e) {
        if (!isMissingRelation((e as Error).message)) throw e;
        await ensureLedgerSchema();
        result = await write();
      }
      try {
        await supabaseAdmin.from('ledger_activity_log').insert({ entity_type: 'master', entity_id: result.id, action: id ? 'updated' : 'created', summary: `${table}: ${String(clean.name ?? clean.title ?? clean.address_type ?? clean.class_name ?? 'row')}`, actor: auth?.email ?? '' });
      } catch { /* log best-effort */ }
      return result;
    }

    case 'ledger.profile.get': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const runQ = () => supabaseAdmin
        .from('ledger_company_profile')
        .select('*')
        .eq('id', 'company')
        .maybeSingle();
      let r = await runQ();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelation(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? null };
    }

    // ── LEDGERS: GST engine (spec §22-26/§52) ────────────────────────────
    // gst_profile: registration state machine + monitoring + generation are
    // three independent concepts; regular/composition mutually exclusive.
    case 'ledger.gst.get': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const runQ = () => supabaseAdmin.from('gst_profile').select('*').eq('id', 'company').maybeSingle();
      let r = await runQ();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelation(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? null };
    }

    case 'ledger.gst.set': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const allowed = ['status','threshold_monitoring_enabled','threshold_amount','registration_type','gstin','registration_state','effective_date','cancellation_date','compliance_generation_enabled','filing_frequency','voluntary_registration','interstate_taxable_supply','compulsory_registration_condition','exempt_supply_only','ecommerce_condition','agent_condition','reverse_charge_condition','other_state_registration','rule_version'];
      const clean: Record<string, unknown> = { id: 'company', updated_at: new Date().toISOString(), rule_version: RULES_VERSION };
      for (const k of allowed) if (params[k] !== undefined) clean[k] = params[k];
      // Guard the state machine server-side (spec §3): regular and      // composition are modes, never simultaneous.
      if (clean.status === 'registered_composition') clean.registration_type = 'composition';
      else if (clean.status === 'registered_regular' || clean.status === 'voluntarily_registered') clean.registration_type = clean.registration_type ?? 'regular';
      // Generation follows an active registration; cancellation stops future      // obligations but preserves all history (spec §54).
      const s = String(clean.status ?? 'not_registered');
      const active = ['registered_regular', 'registered_composition', 'voluntarily_registered'].includes(s);
      clean.compliance_generation_enabled = active ? clean.compliance_generation_enabled ?? true : false;
      let r = await supabaseAdmin.from('gst_profile').upsert(clean, { onConflict: 'id' });
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('gst_profile').upsert(clean, { onConflict: 'id' }); }
      if (r.error) throw new Error(r.error.message);
      try {
        await supabaseAdmin.from('ledger_activity_log').insert({ entity_type: 'gst', entity_id: 'company', action: 'gst_status_changed', summary: `GST status → ${s}`, actor: auth?.email ?? '' });
      } catch { /* log table may not exist */ }
      return { ok: true };
    }

    // Turnover: list / upsert / evaluate-threshold. Evaluation is idempotent —
    // a crossing event is created only when no open event exists for the FY.
    case 'ledger.gst.turnover.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const runQ = () => supabaseAdmin.from('gst_turnover_records').select('*').order('period', { ascending: true }).limit(200);
      let r = await runQ();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelation(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? [] };
    }

    case 'ledger.gst.turnover.set': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const allowed = ['id','period','period_type','fy','opening_turnover','taxable_supplies','exempt_supplies','exports','interstate_supplies','other_included','inward_rcm','taxes_excluded','aggregate_turnover','as_of_date','source','verified','notes'];
      const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of allowed) if (params[k] !== undefined) clean[k] = params[k];
      if (!clean.period || !clean.fy) throw new Error('period and fy are required');
      // Aggregate = taxable + exempt + exports + inter-state + other − taxes
      // (PAN-based, all-India; §6). Client may pass aggregate_turnover      // directly for a simple manual entry; recompute when components given.
      const comps = ['taxable_supplies','exempt_supplies','exports','interstate_supplies','other_included'].reduce((s2, k) => s2 + (Number(clean[k]) || 0), 0) - (Number(clean.taxes_excluded) || 0);
      if (comps > 0) clean.aggregate_turnover = comps;
      let r = await supabaseAdmin.from('gst_turnover_records').upsert(clean, { onConflict: clean.id ? 'id' : undefined });
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('gst_turnover_records').upsert(clean as any, { onConflict: clean.id ? 'id' : undefined }); }
      if (r.error) throw new Error(r.error.message);
      const saved = r.data as { id: string } | { id: string }[] | null;
      const savedRow = Array.isArray(saved) ? saved[0] : saved;
      return { id: savedRow?.id ?? null };
    }

    case 'ledger.gst.evaluate': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const fy = String(params.fy ?? '');
      // Latest annual record for the FY, else the sum of monthly records.
      const tQ = () => supabaseAdmin.from('gst_turnover_records').select('*').eq('fy', fy).order('period', { ascending: false });
      let tr = await tQ();
      if (tr.error && isMissingRelation(tr.error.message)) { await ensureLedgerSchema(); tr = await tQ(); }
      if (tr.error && !isMissingRelation(tr.error.message)) throw new Error(tr.error.message);
      const rows = tr.data ?? [];
      const annual = rows.find((x: any) => x.period_type === 'annual');
      const turnover = annual
        ? Number(annual.aggregate_turnover) || 0
        : rows.filter((x: any) => x.period_type === 'monthly').reduce((s2: number, x: any) => s2 + (Number(x.aggregate_turnover) || 0), 0);

      const gQ = () => supabaseAdmin.from('gst_profile').select('*').eq('id', 'company').maybeSingle();
      let gr = await gQ();
      if (gr.error && isMissingRelation(gr.error.message)) { await ensureLedgerSchema(); gr = await gQ(); }
      const gst = gr.data ?? {};
      const evalResult = evaluateGst(gst as any, turnover);

      // Crossing event — created once per FY (idempotent, spec §8/§49).
      let event: any = null;
      if (evalResult.crossed) {
        const eQ = () => supabaseAdmin.from('gst_threshold_events').select('*').eq('fy', fy).order('created_at', { ascending: false }).limit(1);
        let er = await eQ();
        if (er.error && isMissingRelation(er.error.message)) { await ensureLedgerSchema(); er = await eQ(); }
        event = (er.data ?? [])[0] ?? null;
        if (!event) {
          const threshold = evalResult.threshold;
          const asOf = rows[0]?.as_of_date ?? new Date().toISOString().slice(0, 10);
          const ins = await supabaseAdmin.from('gst_threshold_events').insert({
            fy, threshold,
            previous_turnover: Math.max(0, turnover - (turnover - threshold)), // crossing point approximated; exact per-record logic in monitor UI
            current_turnover: turnover,
            crossing_amount: turnover - threshold,
            crossing_date: asOf,
            as_of_date: asOf,
            liability_status: 'requires_review',
            deadline_basis: 'Sec 23(2)/30 days from crossing — CONFIRM WITH CA',
            source_record_id: annual?.id ?? rows[0]?.id ?? null,
          }).select('*').single();
          if (!ins.error) event = ins.data;
          try {
            await supabaseAdmin.from('ledger_activity_log').insert({ entity_type: 'gst', entity_id: 'company', action: 'threshold_crossed', summary: `Aggregate turnover ₹${turnover.toLocaleString('en-IN')} crossed threshold ₹${threshold.toLocaleString('en-IN')} for ${fy}`, actor: auth?.email ?? '' });
          } catch { /* log best-effort */ }
        }
      }
      return { eval: evalResult, event };
    }

    case 'ledger.gst.events.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const runQ = () => supabaseAdmin.from('gst_threshold_events').select('*').order('created_at', { ascending: false }).limit(50);
      let r = await runQ();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelation(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? [] };
    }

    case 'ledger.profile.set': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const allowed = ['name', 'entity_type', 'incorporated_on', 'fy_start_month', 'pan', 'tan', 'gstin', 'gst_scheme', 'registered_office', 'cin', 'registrations', 'turnover_band', 'employee_count', 'ca_name', 'cs_name', 'logo_url'];
      const clean: Record<string, unknown> = { id: 'company', updated_at: new Date().toISOString() };
      for (const k of allowed) if (params[k] !== undefined) clean[k] = params[k];
      let r = await supabaseAdmin
        .from('ledger_company_profile')
        .upsert(clean, { onConflict: 'id' });
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('ledger_company_profile').upsert(clean, { onConflict: 'id' }); }
      if (r.error) throw new Error(r.error.message);
      return { ok: true };
    }

    // ── LEDGERS: registers — payments / notices / directors / documents ──
    // Generic CRUD behind a strict per-table whitelist (LEDGER_REGISTERS).
    case 'ledger.rows.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const reg = LEDGER_REGISTERS[String(params.register ?? '')];
      if (!reg) throw new Error('Unknown register');
      const [orderCol, orderDir] = reg.order.split('.');
      const runQ = () => {
        let q = supabaseAdmin.from(reg.table).select('*').order(orderCol, { ascending: orderDir !== 'desc' }).limit(500);
        if (reg.fyFilter && params.fy) q = q.eq('fy', String(params.fy));
        return q;
      };
      let r = await runQ();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelation(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? [] };
    }

    case 'ledger.rows.upsert': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const reg = LEDGER_REGISTERS[String(params.register ?? '')];
      if (!reg) throw new Error('Unknown register');
      const { id, ...fields } = params;
      const clean: Record<string, unknown> = {};
      for (const k of reg.columns) if (fields[k] !== undefined) clean[k] = fields[k];
      const label = () => String(clean.name ?? clean.title ?? clean.subject ?? reg.entity);
      const logIt = async (action: string) => {
        try {
          await supabaseAdmin.from('ledger_activity_log').insert({ entity_type: reg.entity, entity_id: String(id ?? ''), action, summary: label(), actor: auth?.email ?? '' });
        } catch { /* log table may not exist yet */ }
      };
      if (id) {
        clean.updated_at = new Date().toISOString();
        let r = await supabaseAdmin.from(reg.table).update(clean).eq('id', String(id));
        if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from(reg.table).update(clean).eq('id', String(id)); }
        if (r.error) throw new Error(r.error.message);
        await logIt('updated');
        return { id: String(id) };
      }
      let r = await supabaseAdmin.from(reg.table).insert(clean).select('id').single();
      if (r.error && isMissingRelation(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from(reg.table).insert(clean).select('id').single(); }
      if (r.error) throw new Error(r.error.message);
      await logIt('created');
      return { id: r.data.id };
    }

    case 'ledger.rows.delete': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const reg = LEDGER_REGISTERS[String(params.register ?? '')];
      if (!reg) throw new Error('Unknown register');
      const { error } = await supabaseAdmin.from(reg.table).delete().eq('id', String(params.id));
      if (error) throw new Error(error.message);
      try {
        await supabaseAdmin.from('ledger_activity_log').insert({ entity_type: reg.entity, entity_id: String(params.id), action: 'deleted', summary: `${reg.entity} removed`, actor: auth?.email ?? '' });
      } catch { /* best-effort */ }
      return { id: String(params.id) };
    }

    // Private document vault: upload lands in the ledger-docs bucket (no
    // public policy); reads go through short-lived signed URLs only.
    case 'ledger.doc.upload': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const ct = String(params.contentType ?? '');
      const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/msword', 'text/csv'];
      if (!ALLOWED.includes(ct)) throw new Error('Only PDF, image, Excel, Word or CSV files are allowed');
      const buf = decodeBase64(String(params.dataBase64 ?? ''));
      if (!buf.length) throw new Error('Empty file');
      if (buf.length > 3 * 1024 * 1024) throw new Error('Documents must be under 3 MB');
      const path = `docs/${Date.now()}-${sanitizeFileName(String(params.name ?? 'document'))}`;
      let up = await supabaseAdmin.storage.from('ledger-docs').upload(path, buf, { contentType: ct, upsert: false });
      if (up.error && /bucket/i.test(up.error.message)) {
        try {
          await fetch(`${(process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '').replace(/\/$/, '')}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
            body: JSON.stringify({ q: "INSERT INTO storage.buckets (id, name, public) VALUES ('ledger-docs','ledger-docs',FALSE) ON CONFLICT (id) DO NOTHING;" }),
          });
          up = await supabaseAdmin.storage.from('ledger-docs').upload(path, buf, { contentType: ct, upsert: false });
        } catch { /* fall through to the original error */ }
      }
      if (up.error) throw new Error(up.error.message);
      return { path };
    }

    case 'ledger.doc.url': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const path = String(params.path ?? '');
      if (!path || path.includes('..')) throw new Error('Invalid document path');
      const signed = await supabaseAdmin.storage.from('ledger-docs').createSignedUrl(path, 3600);
      if (signed.error) throw new Error(signed.error.message);
      return { url: signed.data.signedUrl };
    }

    // ── LEDGERS: server-side calendar generation (rule engine runs here, not
    // in the browser) — idempotent per form|period, stamps the rule version.
    case 'ledger.generate': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const fyStartYear = Number(params.fyStartYear);
      if (!Number.isFinite(fyStartYear)) throw new Error('fyStartYear is required');
      const prof = await supabaseAdmin.from('ledger_company_profile').select('*').eq('id', 'company').maybeSingle();
      if (prof.error && isMissingRelation(prof.error.message)) { await ensureLedgerSchema(); }
      const p = prof.data;
      if (!p?.name) throw new Error('Save the company profile first — the rule engine needs the entity type and registrations.');
      const entityType = String(p.entity_type ?? 'pvtltd');
      const registrations: string[] = Array.isArray(p.registrations) ? p.registrations : [];
      if (!registrations.length) throw new Error('No registrations ticked in the company profile — nothing to generate.');

      // GST context comes from the gst_profile state machine (spec §66),
      // plus the FY's aggregate turnover for threshold evaluation.
      const gQ = () => supabaseAdmin.from('gst_profile').select('*').eq('id', 'company').maybeSingle();
      let gRes = await gQ();
      if (gRes.error && isMissingRelation(gRes.error.message)) { await ensureLedgerSchema(); gRes = await gQ(); }
      const gstProfile = gRes.data ?? gstProfileFromLegacy(registrations, p.gst_scheme);
      const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
      const tQ = () => supabaseAdmin.from('gst_turnover_records').select('*').eq('fy', fyLabel).order('period', { ascending: false });
      let tRes = await tQ();
      if (tRes.error && isMissingRelation(tRes.error.message)) { await ensureLedgerSchema(); tRes = await tQ(); }
      const tRows = tRes.data ?? [];
      const annual = tRows.find((x: any) => x.period_type === 'annual');
      const aggregateTurnover = annual ? Number(annual.aggregate_turnover) || 0 : tRows.filter((x: any) => x.period_type === 'monthly').reduce((s2: number, x: any) => s2 + (Number(x.aggregate_turnover) || 0), 0);

      const { items: generated, summary, gstEval } = generateComplianceCalendarWithSummary({
        fyStartYear,
        entityType: entityType as any,
        registrations,
        incorporatedOn: p.incorporated_on ?? null,
        gstScheme: (p.gst_scheme as 'monthly' | 'qrmp') ?? 'monthly',
        gst: gstProfile,
        aggregateTurnover,
        markPastFiled: params.markPastFiled !== false,
      });
      if (!generated.length) throw new Error(`Generated 0 obligations for a ${entityType} with those registrations — tick GST/TDS/PF etc. in Company Profile.`);

      // Threshold crossing → create the review event once (idempotent).
      if (gstEval.crossed) {
        const eQ = () => supabaseAdmin.from('gst_threshold_events').select('id').eq('fy', fyLabel).limit(1);
        let eRes = await eQ();
        if (eRes.error && isMissingRelation(eRes.error.message)) { await ensureLedgerSchema(); eRes = await eQ(); }
        if (!(eRes.data ?? []).length) {
          const asOf = tRows[0]?.as_of_date ?? new Date().toISOString().slice(0, 10);
          await supabaseAdmin.from('gst_threshold_events').insert({
            fy: fyLabel, threshold: gstEval.threshold, previous_turnover: gstEval.threshold,
            current_turnover: aggregateTurnover, crossing_amount: aggregateTurnover - gstEval.threshold,
            crossing_date: asOf, as_of_date: asOf, liability_status: 'requires_review',
            deadline_basis: 'Sec 23(2)/30 days from crossing — CONFIRM WITH CA',
          });
          try {
            await supabaseAdmin.from('ledger_activity_log').insert({ entity_type: 'gst', entity_id: 'company', action: 'threshold_crossed', summary: `Aggregate turnover crossed GST threshold for ${fyLabel}`, actor: auth?.email ?? '' });
          } catch { /* best-effort */ }
        }
      }

      // Existing rows keep manual edits (status/ARN/due overrides); only
      // missing form|period pairs are inserted.
      const insertItems = async (rows: Record<string, unknown>[]) => {
        let savedCount = 0;
        const failures: string[] = [];
        for (const g of rows) {
          const { error } = await supabaseAdmin.from('ledger_compliance_items').insert(g);
          if (error) { failures.push(`${g.form}: ${error.message}`); if (failures.length >= 3) break; }
          else savedCount++;
        }
        return { savedCount, failures };
      };

      const existing = await supabaseAdmin.from('ledger_compliance_items').select('form,period').eq('fy', `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`);
      const have = new Set((existing.data ?? []).map((r: any) => `${r.form}|${r.period}`));
      const fresh = generated.filter((g) => !have.has(`${g.form}|${g.period}`));
      let { savedCount: saved, failures } = await insertItems(fresh.map((g) => ({ ...g, owner: '', assignee: '', priority: 'normal', authority: '', reminders_sent: [], rule_version: RULES_VERSION })));
      // Self-heal: a live table missing columns added after its creation fails
      // every insert with a schema-cache error — re-run the DDL once and retry.
      if (saved === 0 && failures.length && isMissingRelation(failures[0])) {
        await ensureLedgerSchema();
        ({ savedCount: saved, failures } = await insertItems(fresh.map((g) => ({ ...g, owner: '', assignee: '', priority: 'normal', authority: '', reminders_sent: [], rule_version: RULES_VERSION }))));
      }
      try {
        await supabaseAdmin.from('ledger_activity_log').insert({ entity_type: 'item', entity_id: '', action: 'generated', summary: `Rules evaluated ${summary.rulesEvaluated} · applicable ${summary.applicable} · created ${saved} for ${fyLabel} (v${RULES_VERSION})`, actor: auth?.email ?? '' });
      } catch { /* log table may not exist */ }
      if (saved === 0 && failures.length) throw new Error(`Could not save obligations — ${failures[0]}${failures.length > 1 ? ` (+${failures.length - 1} more)` : ''}`);
      return { generated: generated.length, saved, skippedDuplicates: generated.length - fresh.length, ruleVersion: RULES_VERSION, summary };
    }

    // ── LEDGERS: reminder engine (same code the cron runs — manual trigger) ──
    case 'ledger.reminders.run': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      try { await supabaseAdmin.rpc('exec_sql', { q: LEDGER_NOTIFICATIONS_DDL }); } catch { /* table likely exists */ }
      return await scanAndNotify({ baseUrl: process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '', serviceKey: SUPABASE_SERVICE_KEY });
    }

    case 'ledger.notifications.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const runQ = () => supabaseAdmin.from('ledger_notifications').select('*').order('created_at', { ascending: false }).limit(100);
      let r = await runQ();
      if (r.error && isMissingRelation(r.error.message)) { await supabaseAdmin.rpc('exec_sql', { q: LEDGER_NOTIFICATIONS_DDL }); r = await runQ(); }
      if (r.error && !isMissingRelation(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? [] };
    }

    case 'ledger.notification.read': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { error } = await supabaseAdmin.from('ledger_notifications').update({ read_at: new Date().toISOString() }).eq('id', String(params.id));
      if (error) throw new Error(error.message);
      return { id: String(params.id) };
    }

    case 'ledger.notifications.readAll': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { error } = await supabaseAdmin.from('ledger_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    // ── Site settings ───────────────────────────────────────────────────
    case 'settings.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { nexaEnabled } = params;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (nexaEnabled !== undefined) updates.nexa_enabled = nexaEnabled;
      const { error } = await supabaseAdmin
        .from('site_settings')
        .update(updates)
        .eq('key', 'general');
      if (error) throw new Error(error.message);
      return { message: 'Settings updated' };
    }

    // ── Jobs ────────────────────────────────────────────────────────────
    case 'job.create': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { postedAt, ...fields } = params;
      const { data, error } = await supabaseAdmin
        .from('job_openings')
        .insert({
          ...fields,
          posted_at: dbDate(postedAt) ?? new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    case 'job.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, ...fields } = params;
      const { error } = await supabaseAdmin.from('job_openings').update(fields).eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'job.toggleActive': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, isActive } = params;
      const { error } = await supabaseAdmin
        .from('job_openings')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'job.delete': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id } = params;
      const { error } = await supabaseAdmin.from('job_openings').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    // ── Team members ────────────────────────────────────────────────────
    case 'team.create': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { _auth: _a, _ip: _i, ...memberFields } = params;
      const { data, error } = await supabaseAdmin
        .from('team_members')
        .insert(memberFields)
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    case 'team.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, _auth: _a, _ip: _i, ...fields } = params;
      const { error } = await supabaseAdmin.from('team_members').update(fields).eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'team.delete': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id } = params;
      const { error } = await supabaseAdmin.from('team_members').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'application.apply': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { referenceId, applicantLat, applicantLng, applicantArea, ...fields } = params;
      const now = new Date();
      const { data, error } = await supabaseAdmin
        .from('job_applications')
        .insert({
          ...fields,
          reference_id: referenceId,
          applicant_uid: auth.uid,
          applicant_email: auth.email,
          applicant_lat: applicantLat ?? null,
          applicant_lng: applicantLng ?? null,
          applicant_area: applicantArea ?? null,
          status: 'Applied',
          status_history: [
            { status: 'Applied', note: 'Application submitted', updatedBy: 'candidate', updatedAt: now },
          ],
          admin_notes: '',
          rating: 0,
          tags: [],
          is_shortlisted: false,
          viewed_by_admin: false,
          applied_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      // Keep the public job count cheap (mirrors the old onApplicationSubmitted trigger).
      try {
        await supabaseAdmin.rpc('increment_job_applications', { p_job_id: fields.jobId });
      } catch {
        /* non-fatal — count is best-effort */
      }
      return { id: data.id, referenceId };
    }

    case 'application.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { data, error } = await supabaseAdmin
        .from('job_applications')
        .select('*')
        .order('applied_at', { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }

    case 'application.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, ...fields } = params;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.statusHistory !== undefined) updates.status_history = fields.statusHistory;
      if (fields.rating !== undefined) updates.rating = fields.rating;
      if (fields.adminNotes !== undefined) updates.admin_notes = fields.adminNotes;
      if (fields.viewedByAdmin !== undefined) updates.viewed_by_admin = fields.viewedByAdmin;
      if (fields.isShortlisted !== undefined) updates.is_shortlisted = fields.isShortlisted;
      const { error } = await supabaseAdmin.from('job_applications').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    // ── Storage dashboard (admin) ──────────────────────────────────────
    case 'storage.stats': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const quotaBytes = Number(
        process.env.VITE_SUPABASE_STORAGE_QUOTA_BYTES ?? 1024 * 1024 * 1024,
      );
      const { data, error } = await supabaseAdmin.rpc('get_storage_stats');
      if (error) throw new Error(`Unable to read storage usage: ${error.message}`);
      return { ...(data ?? {}), quotaBytes };
    }

    case 'admin.databaseSummary': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const tables = ['properties', 'auctions', 'leads', 'crm_clients', 'admin_users', 'employees', 'requirements', 'blog_posts', 'site_settings'] as const;
      const counts: Record<string, number> = {};
      for (const t of tables) {
        const { count } = await supabaseAdmin.from(t).select('id', { count: 'exact', head: true });
        counts[t] = count ?? 0;
      }
      return { counts };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
