/**
 * Local stand-in for the Vercel /api/data-proxy function
 * (api/data-proxy.ts). Keeps the same actions and the same security model
 * (Firebase token verification + service-role writes) so `npm run dev`
 * behaves like production. Used by the Vite plugin and dev-crm-proxy.mjs.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Vite does NOT load .env into process.env before evaluating vite.config.ts,
// so the proxy env vars were empty when this module was imported by the Vite
// plugin — which crashed the dev server with "supabaseKey is required". Load
// the service-role pair from .env here (real shell vars win). Only these two
// are injected on purpose: they are the config-time values with no fallback
// constants, and both the Vite plugin and scripts/dev-crm-proxy.mjs import
// this module first, so the values reach all of them. Every other variable
// keeps its existing env-or-constant precedence — in particular the
// single Supabase project (eimvaxrmiizdlgonhiov) is used for everything.
function loadDotEnv() {
  const ALLOWED = [
    'SUPABASE_REQ_URL', 'VITE_SUPABASE_REQ_URL',
    'SUPABASE_REQ_SERVICE_KEY', 'VITE_SUPABASE_REQ_SERVICE_KEY',
    'SUPABASE_CLI_URL', 'VITE_SUPABASE_CLI_URL',
    'SUPABASE_CLI_SERVICE_KEY', 'VITE_SUPABASE_CLI_SERVICE_KEY',
  ];
  try {
    const raw = readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!ALLOWED.includes(key)) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Real env wins, but only when it has a truthy value — a var that exists
      // as an empty string (the common broken-shell case) is replaced from .env.
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // No .env file — rely on the real environment only.
  }
}
loadDotEnv();

const SUPABASE_URL =
  process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_REQ_SERVICE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? '';
// Single Supabase project — all data, CRM, storage, employees.
const CLI_URL =
  process.env.SUPABASE_CLI_URL ?? process.env.VITE_SUPABASE_CLI_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const CLI_SERVICE_KEY = process.env.SUPABASE_CLI_SERVICE_KEY ?? process.env.VITE_SUPABASE_CLI_SERVICE_KEY ?? '';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY ?? '';
const ADMIN_EMAILS = [
  'vijaykodamasuru2023@gmail.com',
  'vijay@vjrestate.in',
  'vijayramv229@gmail.com',
];
const ADMIN_UID = process.env.VITE_ADMIN_UID ?? 'AhaNy8oyMHOFsB3u0dQhG0E0by43';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|png|webp|gif|avif)$/;
const ALLOWED_RESUME_TYPES = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain)$/;

// Guard so a genuinely missing key can never crash the dev server at import
// time again — proxy calls fail with a clear message instead.
const supabaseAdmin = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY)
  : new Proxy(
      {},
      {
        get() {
          throw new Error(
            'SUPABASE_REQ_SERVICE_KEY is not set — add it to .env (see .env.example) before using the data proxy.',
          );
        },
      },
    );

// CLI/CRM project client for the storage dashboard. Needs the CLI service key
// in .env (SUPABASE_CLI_SERVICE_KEY) — like REQ above, it fails with a
// clear message instead of crashing the dev server.
const supabaseCli = CLI_SERVICE_KEY
  ? createClient(CLI_URL, CLI_SERVICE_KEY)
  : new Proxy(
      {},
      {
        get() {
          throw new Error(
            'SUPABASE_CLI_SERVICE_KEY is not set — add it to .env (see .env.example) before using the Storage dashboard.',
          );
        },
      },
    );

function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase();
}

function isSuperAdminEmail(email) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

function isAdmin(auth) {
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
function pickPropertyColumns(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PROPERTY_COLUMNS.has(k)) out[k] = v;
  }
  return out;
}

async function verifyToken(token) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) },
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
    if (admins) return { authorized: true, email, uid, role: admins.role, permissions: admins.permissions };
    return { authorized: true, email, uid, role: 'user', permissions: null };
  } catch {
    return { authorized: false, email: '', uid: '' };
  }
}

const rateBuckets = new Map();
function rateLimited(key, max = 20, windowMs = 60_000) {
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

function sanitizeFileName(name) {
  return (name ?? 'photo').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

function decodeBase64(data) {
  const base64 = (data ?? '').replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

function clientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown'
  );
}

function dbDate(v) {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Mirror of the history row mapping in api/data-proxy.ts. */
function historyRowFromLead(row, deletedAt) {
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

async function nextPropertyCode() {
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

async function nextReqId() {
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin
    .from('requirements')
    .select('id', { count: 'exact', head: true });
  return `VJR-REQ-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

// Daily site-visit slot capacity per property (null = no limit).
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

const _visitSlotsOnce = { done: false };
// LEDGERS schema DDL — run once via exec_sql when a ledger table is missing.
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

const _ledgerSchemaOnce = { done: false };
async function ensureLedgerSchema() {
  if (_ledgerSchemaOnce.done) return;
  _ledgerSchemaOnce.done = true;
  try {
    const base = (process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '').replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.VITE_SUPABASE_SERVICE_KEY ?? '';
    if (!base || !key) return;
    await fetch(`${base}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ q: LEDGER_DDL }),
    });
    // PostgREST caches the schema — wait briefly so the retry sees new tables.
    await new Promise((r) => setTimeout(r, 1200));
  } catch { /* exec_sql RPC may not exist — user must run the migration manually */ }
}

function isMissingRelationMsg(message) {
  return /does not exist|Could not find the table|schema cache|relation .* does not exist/i.test(message ?? '');
}

async function ensureVisitSlotsColumn() {
  if (_visitSlotsOnce.done) return;
  _visitSlotsOnce.done = true;
  try {
    const base = (process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '').replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.VITE_SUPABASE_SERVICE_KEY ?? '';
    if (!base || !key) return;
    await fetch(`${base}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ q: VISIT_SLOTS_DDL }),
    });
  } catch { /* exec_sql RPC may not exist — degrade gracefully */ }
}

async function getPropertyRow(id) {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// ── Actions ─────────────────────────────────────────────────────────────────

async function executeAction(action, params) {
  const auth = params._auth ?? null;
  const ip = params._ip ?? '';

  switch (action) {
    case 'property.create': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const isAdminCall = isAdmin(auth);
      if (!isAdminCall && params.uid !== auth.uid) throw new Error('Forbidden');
      const { uid, ...raw } = params;
      const code = await nextPropertyCode();
      const finalCode = (params.property_code ?? '').trim() || code;
      const clean = pickPropertyColumns({
        ...raw,
        property_code: finalCode,
        created_at: dbDate(params.createdAt) ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      const { data, error } = await supabaseAdmin
        .from('properties')
        .insert(clean)
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id, propertyCode: finalCode };
    }

    case 'property.update': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { id, createdAt, updatedAt, ...rawFields } = params;
      const row = await getPropertyRow(id);
      if (!row) throw new Error('Property not found');
      if (!isAdmin(auth) && row.uid !== auth.uid) throw new Error('Forbidden');
      const updates = pickPropertyColumns({ ...rawFields, updated_at: new Date().toISOString() });
      delete updates.uid;
      const { error } = await supabaseAdmin.from('properties').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'property.delete': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id } = params;
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
        await supabaseAdmin.from('properties').update({ property_code: code }).eq('id', row.id);
      }
      return { count: toUpdate.length };
    }

    case 'image.upload': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { bucket, entityId, name, contentType, dataBase64 } = params;
      if (!['property-images', 'team-photos'].includes(bucket)) throw new Error('Invalid bucket');
      if (!entityId) throw new Error('entityId required');
      if (!ALLOWED_IMAGE_TYPES.test(contentType ?? '')) throw new Error('Invalid image type');
      const buffer = decodeBase64(dataBase64);
      if (buffer.length === 0) throw new Error('Empty file');
      if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image exceeds 8 MB');
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
      const updates = {};
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
        const { error } = await supabaseAdmin
          .from('requirement_private')
          .update({
            ...(paymentMode !== undefined ? { payment_mode: paymentMode } : {}),
            ...(buyerName !== undefined ? { buyer_name: buyerName } : {}),
            ...(buyerPhone !== undefined ? { buyer_phone: buyerPhone } : {}),
          })
          .eq('id', id);
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
      const { data, error } = await supabaseAdmin.rpc('increment_requirement_click', { p_req_id: id });
      if (error) throw new Error(error.message);
      return { clickCount: data };
    }

    case 'lead.create': {
      if (!params._public) throw new Error('Forbidden');
      if (rateLimited(`lead:${ip}`, 10, 60_000)) throw new Error('Too many requests');
      const {
        propertyId, propertyTitle, leadType, message, propertyType, propertyArea,
        propertyPrice, propertyMonthlyRental, propertyUrl, visitDate, visitTime,
        buyerName, buyerPhone, buyerLat, buyerLng, source, ownerUid, listedBy,
      } = params;
      if (!propertyId || !propertyTitle || !message || !leadType) throw new Error('Invalid lead');
      const { data, error } = await supabaseAdmin
        .from('property_leads')
        .insert({
          property_id: propertyId,
          property_title: propertyTitle,
          property_type: propertyType ?? '',
          property_area: propertyArea ?? '',
          property_price: propertyPrice ?? '',
          property_monthly_rental: propertyMonthlyRental ?? null,
          property_url: propertyUrl ?? '',
          lead_type: leadType,
          visit_date: visitDate ?? null,
          visit_time: visitTime ?? null,
          buyer_name: buyerName ?? null,
          buyer_phone: buyerPhone ?? null,
          buyer_lat: buyerLat ?? null,
          buyer_lng: buyerLng ?? null,
          message,
          source: source ?? 'card',
          owner_uid: ownerUid ?? null,
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

    // ── Lead status update (admin) — mirrors api/data-proxy.ts ─────────
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

    // ── Lead delete → move to history (admin, mirrors api/data-proxy.ts) ──
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

      // History is best-effort — never block the delete.
      let historyError = null;
      try {
        await supabaseAdmin
          .from('deleted_bookings')
          .upsert(historyRowFromLead(row, new Date().toISOString()), { onConflict: 'id' });
      } catch (e) {
        historyError = e.message;
      }

      const { error } = await supabaseAdmin
        .from('property_leads')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { id, archived: !historyError };
    }

    // ── Deleted-booking history (admin): read + permanent delete ──────
    case 'lead.history': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { data, error } = await supabaseAdmin
        .from('deleted_bookings')
        .select('*')
        .order('deleted_at', { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }

    case 'lead.purge': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id } = params;
      if (!id) throw new Error('Booking id is required');
      const { error } = await supabaseAdmin
        .from('deleted_bookings')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    // ── Site-visit slot capacity ────────────────────────────────────────
    case 'slots.set': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const value = params.slots === null || params.slots === undefined || params.slots === '' ? null : Number(params.slots);
      if (value !== null && (!Number.isFinite(value) || value < 0 || value > 50)) {
        throw new Error('Slots must be between 0 and 50 (or empty for no limit)');
      }
      let res = await supabaseAdmin
        .from('properties')
        .update({ visit_slots: value, updated_at: new Date().toISOString() })
        .eq('id', String(params.propertyId));
      if (res.error && /does not exist|Could not find the table|schema cache/i.test(res.error.message)) {
        await ensureVisitSlotsColumn();
        res = await supabaseAdmin
          .from('properties')
          .update({ visit_slots: value, updated_at: new Date().toISOString() })
          .eq('id', String(params.propertyId));
      }
      if (res.error) throw new Error(res.error.message);
      return { propertyId: String(params.propertyId), visitSlots: value };
    }

    case 'slots.availability': {
      if (!params._public) throw new Error('Forbidden');
      const propertyId = String(params.propertyId ?? '');
      if (!propertyId) throw new Error('Property id is required');
      const todayIso = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
      const [propRes, leadsRes] = await Promise.all([
        supabaseAdmin.from('properties').select('visit_slots').eq('id', propertyId).maybeSingle(),
        supabaseAdmin
          .from('property_leads')
          .select('id')
          .eq('property_id', propertyId)
          .eq('visit_date', todayIso)
          .neq('status', 'cancelled'),
      ]);
      const limit = propRes.data?.visit_slots ?? null;
      const booked = (leadsRes.data ?? []).length;
      const remaining = limit === null ? null : Math.max(0, limit - booked);
      return { visitSlots: limit, bookedToday: booked, remaining };
    }

    case 'user.track': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { uid, ...payload } = params;
      if (uid !== auth.uid) throw new Error('Forbidden');
      delete payload.suspended;
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('uid,login_count,suspended')
        .eq('uid', uid)
        .maybeSingle();
      if (existing?.suspended === true) return { suspended: true };
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

    // ── LEDGERS: compliance calendar + legal cases ──────────────────────
    case 'ledger.items.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const runQ = () => {
        let q = supabaseAdmin
          .from('ledger_compliance_items')
          .select('*')
          .order('due_date', { ascending: true })
          .limit(500);
        if (params.fy) q = q.eq('fy', String(params.fy));
        return q;
      };
      let r = await runQ();
      if (r.error && isMissingRelationMsg(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelationMsg(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? [] };
    }

    case 'ledger.item.upsert': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, ...fields } = params;
      const clean = {};
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
        if (r.error && isMissingRelationMsg(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('ledger_compliance_items').update(clean).eq('id', String(id)); }
        if (r.error) throw new Error(r.error.message);
        await logIt();
        return { id: String(id) };
      }
      let r = await supabaseAdmin.from('ledger_compliance_items').insert(clean).select('id').single();
      if (r.error && isMissingRelationMsg(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('ledger_compliance_items').insert(clean).select('id').single(); }
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
      const runQ = () => supabaseAdmin.from('ledger_activity_log').select('*').order('created_at', { ascending: false }).limit(200);
      let r = await runQ();
      if (r.error && isMissingRelationMsg(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelationMsg(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? [] };
    }

    case 'ledger.cases.list': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      let r = await supabaseAdmin
        .from('ledger_legal_cases')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (r.error && isMissingRelationMsg(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('ledger_legal_cases').select('*').order('updated_at', { ascending: false }).limit(200); }
      if (r.error && !isMissingRelationMsg(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? [] };
    }

    case 'ledger.case.upsert': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, ...fields } = params;
      const clean = {};
      const allowed = ['case_no', 'title', 'authority', 'case_type', 'status', 'filed_on', 'next_hearing_on', 'reply_due_on', 'advocate', 'advocate_phone', 'description', 'outcome_notes', 'documents_url'];
      for (const k of allowed) if (fields[k] !== undefined) clean[k] = fields[k];
      if (id) {
        clean.updated_at = new Date().toISOString();
        let r = await supabaseAdmin.from('ledger_legal_cases').update(clean).eq('id', String(id));
        if (r.error && isMissingRelationMsg(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('ledger_legal_cases').update(clean).eq('id', String(id)); }
        if (r.error) throw new Error(r.error.message);
        return { id: String(id) };
      }
      let r = await supabaseAdmin.from('ledger_legal_cases').insert(clean).select('id').single();
      if (r.error && isMissingRelationMsg(r.error.message)) { await ensureLedgerSchema(); r = await supabaseAdmin.from('ledger_legal_cases').insert(clean).select('id').single(); }
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
        try {
          await fetch(`${(process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? '').replace(/\/$/, '')}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
            body: JSON.stringify({ q: "INSERT INTO storage.buckets (id, name, public) VALUES ('ledger-assets','ledger-assets',TRUE) ON CONFLICT (id) DO NOTHING;" }),
          });
          up = await supabaseAdmin.storage.from('ledger-assets').upload(path, buf, { contentType: ct, upsert: false, cacheControl: '3600' });
        } catch { /* fall through */ }
      }
      if (up.error) throw new Error(up.error.message);
      const pub = supabaseAdmin.storage.from('ledger-assets').getPublicUrl(path);
      return { url: pub.data.publicUrl };
    }

    case 'ledger.profile.get': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const runQ = () => supabaseAdmin.from('ledger_company_profile').select('*').eq('id', 'company').maybeSingle();
      let r = await runQ();
      if (r.error && isMissingRelationMsg(r.error.message)) { await ensureLedgerSchema(); r = await runQ(); }
      if (r.error && !isMissingRelationMsg(r.error.message)) throw new Error(r.error.message);
      return { data: r.data ?? null };
    }

    case 'ledger.profile.set': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const allowed = ['name', 'entity_type', 'incorporated_on', 'fy_start_month', 'pan', 'tan', 'gstin', 'gst_scheme', 'registered_office', 'cin', 'registrations', 'turnover_band', 'employee_count', 'ca_name', 'cs_name', 'logo_url'];
      const clean = { id: 'company', updated_at: new Date().toISOString() };
      for (const k of allowed) if (params[k] !== undefined) clean[k] = params[k];
      let err = null;
      try {
        const r = await supabaseAdmin.from('ledger_company_profile').upsert(clean, { onConflict: 'id' });
        err = r.error;
        if (err && isMissingRelation(err.message)) {
          await ensureLedgerSchema();
          const r2 = await supabaseAdmin.from('ledger_company_profile').upsert(clean, { onConflict: 'id' });
          err = r2.error;
        }
      } catch (e) { err = e; }
      if (err) throw new Error(err.message ?? String(err));
      return { ok: true };
    }

    case 'settings.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { mapOnly, nexaEnabled } = params;
      const updates = { updated_at: new Date().toISOString() };
      if (mapOnly !== undefined) updates.map_only = mapOnly;
      if (nexaEnabled !== undefined) updates.nexa_enabled = nexaEnabled;
      const { error } = await supabaseAdmin.from('site_settings').update(updates).eq('key', 'general');
      if (error) throw new Error(error.message);
      return { message: 'Settings updated' };
    }

    case 'job.create': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { postedAt, ...fields } = params;
      const { data, error } = await supabaseAdmin
        .from('job_openings')
        .insert({ ...fields, posted_at: dbDate(postedAt) ?? new Date().toISOString() })
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
      const { error } = await supabaseAdmin.from('job_openings').update({ is_active: isActive }).eq('id', id);
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
      try {
        await supabaseAdmin.rpc('increment_job_applications', { p_job_id: fields.jobId });
      } catch { /* non-fatal — count is best-effort */ }
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
      const updates = { updated_at: new Date().toISOString() };
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

    case 'storage.stats': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const quotaBytes = Number(
        process.env.VITE_SUPABASE_STORAGE_QUOTA_BYTES ?? 1024 * 1024 * 1024,
      );
      const { data, error } = await supabaseAdmin.rpc('get_storage_stats');
      if (error) throw new Error(`Unable to read storage usage: ${error.message}`);
      return { ...(data ?? {}), quotaBytes };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// ── HTTP handler (Vite middleware + dev server compatible) ──────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

export async function handleDataProxyRequest(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  const { action, params = {}, public: isPublic } = body;
  if (!action) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing action' }));
    return;
  }

  try {
    let result;
    if (isPublic) {
      result = await executeAction(action, { ...params, _public: true, _ip: clientIp(req) });
    } else {
      const authHeader = req.headers.authorization ?? '';
      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: 'Missing authorization token' }));
        return;
      }
      const auth = await verifyToken(token);
      if (!auth.authorized) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      result = await executeAction(action, { ...params, _auth: auth, _ip: clientIp(req) });
    }
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (e) {
    console.error('[data-proxy] error:', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: e.message ?? 'Internal error' }));
  }
}
