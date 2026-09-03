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
    'VITE_SUPABASE_REQ_URL',
    'VITE_SUPABASE_REQ_SERVICE_KEY',
    'VITE_SUPABASE_CLI_URL',
    'VITE_SUPABASE_CLI_SERVICE_KEY',
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
  process.env.VITE_SUPABASE_REQ_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const SERVICE_KEY = process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? '';
// Single Supabase project — all data, CRM, storage, employees.
const CLI_URL =
  process.env.VITE_SUPABASE_CLI_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const CLI_SERVICE_KEY = process.env.VITE_SUPABASE_CLI_SERVICE_KEY ?? '';
const FIREBASE_API_KEY =
  process.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyAou136n9rrUnlabvQl22BvdHYzuhbwsKs';
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
            'VITE_SUPABASE_REQ_SERVICE_KEY is not set — add it to .env (see .env.example) before using the data proxy.',
          );
        },
      },
    );

// CLI/CRM project client for the storage dashboard. Needs the CLI service key
// in .env (VITE_SUPABASE_CLI_SERVICE_KEY) — like REQ above, it fails with a
// clear message instead of crashing the dev server.
const supabaseCli = CLI_SERVICE_KEY
  ? createClient(CLI_URL, CLI_SERVICE_KEY)
  : new Proxy(
      {},
      {
        get() {
          throw new Error(
            'VITE_SUPABASE_CLI_SERVICE_KEY is not set — add it to .env (see .env.example) before using the Storage dashboard.',
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

const AUCTION_COLUMN_MAP = {
  startingBid: 'starting_bid',
  currentBid: 'current_bid',
  reservePrice: 'reserve_price',
  bidIncrement: 'bid_increment',
  totalBids: 'total_bids',
  areaSqft: 'area_sqft',
  propertyType: 'property_type',
  registeredBidders: 'registered_bidders',
  isFeatured: 'is_featured',
};

function mapAuctionFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    out[AUCTION_COLUMN_MAP[key] ?? key] = value;
  }
  return out;
}

async function nextPropertyCode() {
  const { data } = await supabaseAdmin
    .from('properties')
    .select('property_code')
    .not('property_code', 'is', null)
    .order('property_code', { ascending: false })
    .limit(1);
  let maxNum = 0;
  const last = data?.[0]?.property_code;
  if (last) {
    const m = String(last).match(/^VJR-(\d+)$/);
    if (m) maxNum = parseInt(m[1], 10);
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
      const { uid, ...rest } = params;
      const code = await nextPropertyCode();
      const finalCode = (params.property_code ?? '').trim() || code;
      const { data, error } = await supabaseAdmin
        .from('properties')
        .insert({
          ...rest,
          property_code: finalCode,
          created_at: dbDate(params.createdAt) ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id, propertyCode: finalCode };
    }

    case 'property.update': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { id, createdAt, updatedAt, ...fields } = params;
      const row = await getPropertyRow(id);
      if (!row) throw new Error('Property not found');
      if (!isAdmin(auth) && row.uid !== auth.uid) throw new Error('Forbidden');
      const updates = { ...fields, updated_at: new Date().toISOString() };
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
      if (!['property-images', 'auction-images'].includes(bucket)) throw new Error('Invalid bucket');
      if (!entityId) throw new Error('entityId required');
      if (!ALLOWED_IMAGE_TYPES.test(contentType ?? '')) throw new Error('Invalid image type');
      const buffer = decodeBase64(dataBase64);
      if (buffer.length === 0) throw new Error('Empty file');
      if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image exceeds 8 MB');
      if (!isAdmin(auth)) {
        if (bucket === 'property-images') {
          const row = await getPropertyRow(entityId);
          if (!row || row.uid !== auth.uid) throw new Error('Forbidden');
        } else {
          const { data: auction } = await supabaseAdmin
            .from('auctions')
            .select('id')
            .eq('id', entityId)
            .maybeSingle();
          if (!auction) throw new Error('Forbidden');
        }
      }
      const safeName = sanitizeFileName(name);
      const path = `${entityId}/${Date.now()}-${safeName}`;
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, buffer, { contentType, upsert: false });
      if (error) throw new Error(error.message);
      const { data: publicUrl } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
      return { url: publicUrl, path };
    }

    case 'image.delete': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { bucket, path } = params;
      if (!['property-images', 'auction-images'].includes(bucket)) throw new Error('Invalid bucket');
      if (!path) throw new Error('path required');
      if (!isAdmin(auth)) {
        const entityId = path.split('/')[0];
        if (bucket === 'property-images') {
          const row = await getPropertyRow(entityId);
          if (!row || row.uid !== auth.uid) throw new Error('Forbidden');
        } else {
          const { data: auction } = await supabaseAdmin
            .from('auctions')
            .select('id')
            .eq('id', entityId)
            .maybeSingle();
          if (!auction) throw new Error('Forbidden');
        }
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
      return { url: publicUrl, path, fileName: name };
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
      const { data: rpcData, error: rpcError } = await supabaseCli.rpc('get_storage_stats');
      if (!rpcError && rpcData) {
        return { ...(rpcData ?? {}), quotaBytes };
      }
      // Fallback: query storage.objects directly
      const BUCKETS = ['property-images', 'auction-images', 'resumes'];
      const bucketStats = [];
      let totalBytes = 0;
      let totalObjects = 0;
      let largest = [];
      for (const bucket of BUCKETS) {
        const { data: files } = await supabaseCli
          .from('storage.objects')
          .select('name, metadata')
          .eq('bucket_id', bucket);
        if (files && files.length > 0) {
          const bytes = files.reduce((sum, f) => sum + Number(f.metadata?.size ?? 0), 0);
          bucketStats.push({ bucket, objects: files.length, bytes });
          totalBytes += bytes;
          totalObjects += files.length;
        } else {
          bucketStats.push({ bucket, objects: 0, bytes: 0 });
        }
      }
      const allFiles = [];
      for (const bs of bucketStats) {
        if (bs.objects === 0) continue;
        const { data: files } = await supabaseCli
          .from('storage.objects')
          .select('name, metadata')
          .eq('bucket_id', bs.bucket)
          .order('metadata->>size', { ascending: false })
          .limit(10);
        if (files) {
          for (const f of files) {
            allFiles.push({ bucket: bs.bucket, name: f.name, bytes: Number(f.metadata?.size ?? 0) });
          }
        }
      }
      largest = allFiles.sort((a, b) => b.bytes - a.bytes).slice(0, 10);
      return { totalBytes, totalObjects, buckets: bucketStats, largest, quotaBytes };
    }

    case 'auction.create': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { createdAt, auctionStartTime, auctionEndTime, ...fields } = params;
      const { data, error } = await supabaseAdmin
        .from('auctions')
        .insert({
          ...mapAuctionFields(fields),
          auction_start_time: dbDate(auctionStartTime),
          auction_end_time: dbDate(auctionEndTime),
          created_at: dbDate(createdAt) ?? new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    case 'auction.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, auctionStartTime, auctionEndTime, ...fields } = params;
      const updates = mapAuctionFields(fields);
      if (auctionStartTime !== undefined) updates.auction_start_time = dbDate(auctionStartTime);
      if (auctionEndTime !== undefined) updates.auction_end_time = dbDate(auctionEndTime);
      const { error } = await supabaseAdmin.from('auctions').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'auction.delete': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id } = params;
      const { error } = await supabaseAdmin.from('auctions').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'auction.setStatus': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { id, status } = params;
      const { error } = await supabaseAdmin.from('auctions').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);
      return { id };
    }

    case 'bid.place': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { auctionId, amount } = params;
      const bidderName = String(params.bidderName ?? 'Anonymous').slice(0, 60);
      const { data, error } = await supabaseAdmin.rpc('place_bid', {
        p_auction_id: auctionId,
        p_bidder_id: auth.uid,
        p_bidder_name: bidderName,
        p_amount: Number(amount),
      });
      if (error) throw new Error(error.message);
      return { id: auctionId, currentBid: data?.currentBid, totalBids: data?.totalBids };
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
