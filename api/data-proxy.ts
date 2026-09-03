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
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? ''
).trim().replace(/^(['"])(.*)\1$/, '$2');
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_REQ_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co',
  SUPABASE_SERVICE_KEY,
);

// The org's real Supabase project (employees, CRM clients, storage buckets).
// The Storage dashboard reads its usage through this client — the site-data
// REQ project above has its own (empty) storage, which is why the dashboard
// showed 0% when pointed at it.
const supabaseCli = createClient(
  process.env.VITE_SUPABASE_CLI_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co',
  process.env.VITE_SUPABASE_CLI_SERVICE_KEY ?? '',
);

const ADMIN_EMAILS = [
  'vijaykodamasuru2023@gmail.com',
  'vijay@vjrestate.in',
  'vijayramv229@gmail.com',
];
const ADMIN_UID = process.env.VITE_ADMIN_UID ?? 'AhaNy8oyMHOFsB3u0dQhG0E0by43';
const FIREBASE_API_KEY =
  process.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyAou136n9rrUnlabvQl22BvdHYzuhbwsKs';
const SUPABASE_URL = process.env.VITE_SUPABASE_REQ_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
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
  'status', 'featured', 'bbmp_approved', 'bank_loan_eligible', 'clear_title',
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

function hasPerm(auth: AuthInfo, perm: string): boolean {
  if (!auth?.authorized) return false;
  if (auth.role === 'super_admin') return true;
  if (auth.permissions === null || auth.permissions === undefined) return true;
  return auth.permissions.length === 0 || auth.permissions.includes(perm);
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

const AUCTION_COLUMN_MAP: Record<string, string> = {
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

/** Map the form's camelCase auction fields to DB column names. */
function mapAuctionFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    out[AUCTION_COLUMN_MAP[key] ?? key] = value;
  }
  return out;
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
  try {
    body = JSON.parse(req.body ?? '{}');
  } catch {
    return err(res, 400, 'Invalid JSON body');
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
  if (!auth.authorized) return err(res, 401, 'Unauthorized');

  try {
    const result = await executeAction(action, { ...params, _auth: auth, _ip: clientIp(req) });
    return res.status(200).json(result);
  } catch (e: any) {
    console.error('[data-proxy] error:', e);
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
      if (!isAdminCall && params.uid !== auth.uid) throw new Error('Forbidden');
      const { uid, ...raw } = params;
      const code = await nextPropertyCode();
      const finalCode = (params.property_code ?? '').trim() || code;
      const propId = randomUUID();
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
      if (error) throw new Error(error.message);
      return { id: data.id, propertyCode: finalCode };
    }

    case 'property.update': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { id, createdAt, updatedAt, ...rawFields } = params;
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

    // ── Images (properties, auctions) ───────────────────────────────────
    case 'image.upload': {
      if (!auth?.authorized) throw new Error('Forbidden');
      const { bucket, entityId, name, contentType, dataBase64 } = params;
      if (!['property-images', 'auction-images'].includes(bucket)) throw new Error('Invalid bucket');
      if (!entityId) throw new Error('entityId required');
      if (!ALLOWED_IMAGE_TYPES.test(contentType ?? '')) throw new Error('Invalid image type');
      const buffer = decodeBase64(dataBase64);
      if (buffer.length === 0) throw new Error('Empty file');
      if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image exceeds 8 MB');

      // Mirror Firebase rules: admin OR the property/auction owner may upload.
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
      return { url: publicUrl, path, fileName: name };
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
    case 'lead.create': {
      if (!params._public) throw new Error('Forbidden');
      if (rateLimited(`lead:${ip}`, 10, 60_000)) throw new Error('Too many requests');
      const {
        propertyId,
        propertyTitle,
        leadType,
        message,
        propertyType,
        propertyArea,
        propertyPrice,
        propertyMonthlyRental,
        propertyUrl,
        visitDate,
        visitTime,
        buyerName,
        buyerPhone,
        buyerLat,
        buyerLng,
        source,
        ownerUid,
        listedBy,
      } = params;
      if (!propertyId || !propertyTitle || !message || !leadType) {
        throw new Error('Invalid lead');
      }
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

    // ── Property leads (read: admin all, owner own) ────────────────────────
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
      return { data: data ?? [] };
    }

    // ── Site settings ───────────────────────────────────────────────────
    case 'settings.update': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { mapOnly, nexaEnabled } = params;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (mapOnly !== undefined) updates.map_only = mapOnly;
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

    // ── Auctions ────────────────────────────────────────────────────────
    case 'auction.create': {
      if (!isAdmin(auth)) throw new Error('Forbidden');
      const { createdAt, auctionStartTime, auctionEndTime, ...fields } = params;
      const auctionId = randomUUID();
      const { data, error } = await supabaseAdmin
        .from('auctions')
        .insert({
          id: auctionId,
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
      const updates: Record<string, unknown> = mapAuctionFields(fields);
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
