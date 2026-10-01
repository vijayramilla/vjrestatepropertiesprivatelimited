import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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
  authority TEXT DEFAULT '',
  recurrence TEXT DEFAULT 'monthly',
  reminders_sent JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_items_due ON public.ledger_compliance_items (due_date);
CREATE INDEX IF NOT EXISTS idx_ledger_items_fy ON public.ledger_compliance_items (fy);
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
  FOREACH t IN ARRAY ARRAY['ledger_compliance_items','ledger_legal_cases','ledger_company_profile','ledger_activity_log'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
INSERT INTO storage.buckets (id, name, public) VALUES ('ledger-assets','ledger-assets',TRUE) ON CONFLICT (id) DO NOTHING;
`;

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
      if (ownerUid) {
        params.uid = ownerUid;
        params.user_email = params.user_email || auth.email;
      } else {
        // VJR-official listing (admin-created) — never carry a uid.
        delete params.uid;
        delete params.user_email;
        delete params.user_display_name;
      }
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

    case 'property.update': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { id, ...rawFields } = params;
      const row = await getPropertyRow(id);
      if (!row) throw new Error('Property not found');
      if (!isAdmin(auth) && row.uid !== auth.uid) throw new Error('Forbidden');
      const updates: Record<string, unknown> = pickPropertyColumns({ ...rawFields, updated_at: new Date().toISOString() });
      delete updates.uid;
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

    // ── Images (properties, auctions, team) ────────────────────────────
    case 'image.upload': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { bucket, entityId, name, contentType, dataBase64 } = params;
      if (!['property-images', 'team-photos'].includes(bucket)) throw new Error('Invalid bucket');
      if (!entityId) throw new Error('entityId required');
      if (!ALLOWED_IMAGE_TYPES.test(contentType ?? '')) throw new Error('Invalid image type');
      const buffer = decodeBase64(dataBase64);
      if (buffer.length === 0) throw new Error('Empty file');
      if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image exceeds 8 MB');

      // Mirror Firebase rules: admin OR the property owner may upload.
      // team-photos is admin-only (same as team_members writes).
      if (!isAdmin(auth)) {
        if (bucket === 'team-photos') throw new Error('Forbidden');
        const row = await getPropertyRow(entityId);
        if (!row || row.uid !== auth.uid) throw new Error('Forbidden');
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
      if (!['property-images', 'team-photos'].includes(bucket)) throw new Error('Invalid bucket');
      if (!path) throw new Error('path required');
      if (!isAdmin(auth)) {
        if (bucket === 'team-photos') throw new Error('Forbidden');
        const row = await getPropertyRow(path.split('/')[0]);
        if (!row || row.uid !== auth.uid) throw new Error('Forbidden');
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
          .upsert(historyRowFromLead(row, new Date().toISOString()), { onConflict: 'id' });      }
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
      const allowed = ['law', 'form', 'title', 'period', 'fy', 'due_date', 'status', 'owner', 'filed_date', 'arn', 'penalty_exposure', 'notes', 'proof_url', 'source_url', 'assignee', 'priority', 'challan_url'];
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
