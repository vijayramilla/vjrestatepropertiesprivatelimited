import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function loadServerEnv() {
  // Vite only injects VITE_-prefixed vars into the browser bundle; it does NOT
  // put them on process.env for this Node plugin. The plugin's token check
  // (FIREBASE_API_KEY) and CRM lookups would therefore run empty unless the
  // values are loaded here from .env as well.
  const keys = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_REQ_URL',
    'SUPABASE_REQ_SERVICE_KEY',
    'SUPABASE_CLI_URL',
    'SUPABASE_CLI_SERVICE_KEY',
    'VITE_SUPABASE_REQ_URL',
    'VITE_SUPABASE_REQ_SERVICE_KEY',
    'VITE_SUPABASE_CLI_URL',
    'VITE_SUPABASE_CLI_SERVICE_KEY',
    'VITE_SUPABASE_CLI_ANON_KEY',
    'VITE_FIREBASE_API_KEY',
    'VITE_ADMIN_UID',
    'VITE_ADMIN_EMAIL',
  ];
  try {
    const raw = readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      if (!keys.includes(key) || process.env[key]) continue;
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // Production uses deployed environment variables instead of .env.
  }
}

loadServerEnv();

function env(key, fallback) {
  return (process.env[key] ?? fallback).trim();
}

function getEnv() {
  return {
    REQ_URL: env('SUPABASE_REQ_URL', '') || env('VITE_SUPABASE_REQ_URL', 'https://eimvaxrmiizdlgonhiov.supabase.co'),
    REQ_KEY: env('SUPABASE_SERVICE_ROLE_KEY', '') || env('SUPABASE_REQ_SERVICE_KEY', '') || env('VITE_SUPABASE_REQ_SERVICE_KEY', ''),
    CLI_URL: env('SUPABASE_CLI_URL', '') || env('VITE_SUPABASE_CLI_URL', 'https://eimvaxrmiizdlgonhiov.supabase.co'),
    CLI_KEY: env('SUPABASE_CLI_SERVICE_KEY', '') || env('VITE_SUPABASE_CLI_SERVICE_KEY', ''),
    CLI_ANON: env('VITE_SUPABASE_CLI_ANON_KEY', ''),
    FIREBASE_API_KEY: env('VITE_FIREBASE_API_KEY', ''),
  };
}

const ADMIN_EMAILS = ['vijaykodamasuru2023@gmail.com', 'vijay@vjrestate.in', 'vijayramv229@gmail.com'];
const SUPER_ADMIN_DISPLAY_NAMES = {
  'vijayramv229@gmail.com': 'Vijay Ram',
  'vijaykodamasuru2023@gmail.com': 'Vijay Kodamasuru',
  'vijay@vjrestate.in': 'Vijay Ram',
};

const COLUMN_DEFAULTS = {
  employees: {
    access_enabled: 'BOOLEAN NOT NULL DEFAULT FALSE',
    face_verify_required: 'BOOLEAN NOT NULL DEFAULT FALSE',
    face_verify_frequency: "TEXT NOT NULL DEFAULT 'daily'",
    payroll_visible: 'BOOLEAN NOT NULL DEFAULT TRUE',
    bookings_visible: 'BOOLEAN NOT NULL DEFAULT TRUE',
    kyc_required: 'BOOLEAN NOT NULL DEFAULT TRUE',
    commission_rate: 'NUMERIC DEFAULT 0',
    work_start_time: "TIME DEFAULT '09:30'",
    auto_logout_time: "TIME DEFAULT '21:00'",
    login_count: 'INTEGER NOT NULL DEFAULT 0',
    last_login: 'TIMESTAMPTZ',
    date_of_birth: 'DATE',
    gender: "TEXT DEFAULT ''",
    father_or_spouse_name: "TEXT DEFAULT ''",
    alternate_phone: "TEXT DEFAULT ''",
  },
  employee_attendance: {
    check_in_lat: 'DOUBLE PRECISION',
    check_in_lng: 'DOUBLE PRECISION',
    check_in_location: "TEXT DEFAULT ''",
    check_in_selfie_url: "TEXT DEFAULT ''",
    check_out_lat: 'DOUBLE PRECISION',
    check_out_lng: 'DOUBLE PRECISION',
    check_out_location: "TEXT DEFAULT ''",
    check_out_selfie_url: "TEXT DEFAULT ''",
    total_break_minutes: 'INTEGER DEFAULT 0',
    overtime_minutes: 'INTEGER DEFAULT 0',
    source: "TEXT DEFAULT 'auto'",
  },
};
async function ensureColumns(table, cols) {
  const defs = COLUMN_DEFAULTS[table];
  if (!defs) return;
  for (const col of cols) {
    const typeDef = defs[col];
    if (!typeDef) continue;
    const sql = `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${col} ${typeDef};`;
    await employeeFetch('POST', 'rpc/exec_sql', { q: sql }).catch(() => {});
  }
}
async function employeeInsertRetry(table, payload) {
  let result = await employeeFetch('POST', table, payload);
  const msg = result?.data?.message ?? '';
  const m = /column \"(\w+)\"/.exec(msg);
  if (m) { await ensureColumns(table, [m[1]]); result = await employeeFetch('POST', table, payload); }
  return result;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/** 'HH:MM' → 'HH:MM:00' for TIME columns (Supabase rejects bare HH:MM). */
function normalizeTime(val) {
  if (!val) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(val).trim());
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}:00`;
  return String(val).trim() || null;
}

// Front-end form fields (camelCase) → employees table columns. Anything not in
// this map is dropped so PostgREST never sees an unknown column (the dev-proxy
// equivalent of the production proxy's explicit mapping).
const EMPLOYEE_FIELD_MAP = {
  employeeId: 'employee_id', name: 'name', email: 'email', phone: 'phone',
  alternatePhone: 'alternate_phone', gender: 'gender', fatherOrSpouseName: 'father_or_spouse_name',
  dateOfBirth: 'date_of_birth', designation: 'designation', department: 'department',
  joiningDate: 'joining_date', status: 'status', salary: 'salary',
  accessEnabled: 'access_enabled', faceVerifyRequired: 'face_verify_required',    faceVerifyFrequency: 'face_verify_frequency', payrollVisible: 'payroll_visible',
    bookingsVisible: 'bookings_visible', kycRequired: 'kyc_required',
  commissionRate: 'commission_rate', workStartTime: 'work_start_time', autoLogoutTime: 'auto_logout_time',
  address: 'address', emergencyContactName: 'emergency_contact_name',
  emergencyContactPhone: 'emergency_contact_phone', bankAccountNumber: 'bank_account_number',
  bankName: 'bank_name', ifscCode: 'ifsc_code', panNumber: 'pan_number',
  aadharNumber: 'aadhar_number', uanNumber: 'uan_number', esiNumber: 'esi_number',
  profilePhotoUrl: 'profile_photo_url', notes: 'notes',
};

function mapEmployeeFields(fields) {
  const payload = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || !EMPLOYEE_FIELD_MAP[k]) continue;
    const col = EMPLOYEE_FIELD_MAP[k];
    if (col === 'email') { payload[col] = normalizeEmail(v); continue; }
    // Optional newer profile columns: only sent when filled in, so writes keep
    // working on environments where the migration hasn't run yet.
    if ((col === 'date_of_birth' || col === 'gender' || col === 'father_or_spouse_name' || col === 'alternate_phone') && (v === '' || v == null)) continue;
    if (col === 'joining_date') { payload[col] = v === '' || v == null ? null : v; continue; }
    if (col === 'salary' || col === 'commission_rate') { payload[col] = v === '' || v == null ? null : v; continue; }
    if (col === 'work_start_time' || col === 'auto_logout_time') { payload[col] = normalizeTime(v); continue; }
    payload[col] = v;
  }
  return payload;
}

// Columns that actually exist in the properties table.
// Form data may include extra keys (survey_number, water_source, etc.)
// that don't exist in Supabase — we strip them before insert.
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
function pickPropertyColumns(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PROPERTY_COLUMNS.has(k)) out[k] = v;
  }
  return out;
}

function isSuperAdminEmail(email) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

async function verifyFirebaseToken(token) {
  const { FIREBASE_API_KEY } = getEnv();
  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) },
    );
    if (!res.ok) return { authorized: false, email: '', uid: '' };
    const data = await res.json();
    const email = data.users?.[0]?.email ?? '';
    const uid = data.users?.[0]?.localId ?? '';
    const normalized = normalizeEmail(email);
    if (ADMIN_EMAILS.includes(normalized)) return { authorized: true, email: normalized, uid, role: 'super_admin', permissions: null };
    const emp = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(normalized)}&select=id,employee_id,name,email,status,access_enabled`, null);
    const empRow = emp.data?.[0];
    if (empRow && empRow.status !== 'Terminated' && empRow.access_enabled === true) return { authorized: true, email: normalized, uid, role: 'employee', permissions: [] };
    const { data: admins } = await supabaseFetch('GET', `admin_users?email=eq.${encodeURIComponent(normalized)}&select=id,role,permissions`, null);
    if (admins?.length > 0) return { authorized: true, email: normalized, uid, role: admins[0].role, permissions: admins[0].permissions };
    return { authorized: false, email, uid: '' };
  } catch { return { authorized: false, email: '', uid: '' }; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function supabaseFetch(method, path, body, baseUrl, apiKey) {
  const e = getEnv();
  const url = baseUrl || e.REQ_URL;
  const key = apiKey || e.REQ_KEY;
  const opts = { method, headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'apikey': key } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${url}/rest/v1/${path}`, opts).then(async res => {
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = null; } }
    if (!res.ok) throw new Error(data?.message || `Supabase error: ${res.status}`);
    const count = res.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
    return { data, count: count ? parseInt(count) : null };
  });
}

function employeeFetch(method, path, body) {
  const e = getEnv();
  return supabaseFetch(method, path, body, e.CLI_URL, e.CLI_KEY || e.CLI_ANON);
}

function supabaseRpc(fn, args) {
  const e = getEnv();
  return fetch(`${e.REQ_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${e.REQ_KEY}`, 'Content-Type': 'application/json', 'apikey': e.REQ_KEY },
    body: JSON.stringify(args ?? {}),
  }).then(async res => {
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = null; } }
    if (!res.ok) throw new Error(data?.message || `RPC error: ${res.status}`);
    return data;
  });
}

function hasPerm(auth, perm) {
  if (!auth?.authorized) return false;
  if (auth.role === 'super_admin') return true;
  if (auth.permissions === null || auth.permissions === undefined) return true;
  return auth.permissions.length === 0 || auth.permissions.includes(perm);
}

function isAdmin(auth) {
  return auth?.role === 'super_admin' || (auth?.role ?? '') !== 'user';
}

function canManageAdmins(auth) {
  if (!auth?.authorized) return false;
  if (auth.role === 'super_admin') return true;
  return hasPerm(auth, 'manage_admins');
}

function scopePermissions(auth, requested) {
  const perms = requested ?? [];
  if (auth.role === 'super_admin' || auth.permissions === null || auth.permissions === undefined) return perms;
  const callerPerms = auth.permissions;
  if (callerPerms.length === 0) return perms;
  return perms.filter((p) => callerPerms.includes(p));
}

function buildSuperAdminRows() {
  return [{
    id: 'super-vijayramv229@gmail.com',
    email: 'vijayramv229@gmail.com',
    display_name: `Super Admin ${SUPER_ADMIN_DISPLAY_NAMES['vijayramv229@gmail.com'] ?? 'Admin'}`,
    role: 'super_admin',
    permissions: [],
    avatar_url: '',
    created_at: '',
  }];
}

// ── Helpers for data-proxy actions ─────────────────────────────────────────

function dbDate(v) {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

async function nextPropertyCode() {
  const { data } = await supabaseFetch('GET', 'properties?select=property_code&property_code=not.is.null');
  let maxNum = 0;
  for (const r of data ?? []) {
    const m = String(r.property_code).match(/^VJR-(\d+)$/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return `VJR-${String(maxNum + 1).padStart(4, '0')}`;
}

async function getPropertyRow(id) {
  const { data } = await supabaseFetch('GET', `properties?id=eq.${encodeURIComponent(id)}&select=*`);
  return data?.[0] ?? null;
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|png|webp|gif|avif)$/;
const ALLOWED_RESUME_TYPES = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain)$/;

function decodeBase64(data) {
  const base64 = (data ?? '').replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

function sanitizeFileName(name) {
  return (name ?? 'photo').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

const rateBuckets = new Map();
function rateLimited(key, max = 20, windowMs = 60000) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.reset) { rateBuckets.set(key, { count: 1, reset: now + windowMs }); return false; }
  bucket.count += 1;
  if (bucket.count > max) { rateBuckets.delete(key); return true; }
  return false;
}

const AUCTION_COLUMN_MAP = {
  startingBid: 'starting_bid', currentBid: 'current_bid', reservePrice: 'reserve_price',
  bidIncrement: 'bid_increment', totalBids: 'total_bids', areaSqft: 'area_sqft',
  propertyType: 'property_type', registeredBidders: 'registered_bidders', isFeatured: 'is_featured',
};
function mapAuctionFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    out[AUCTION_COLUMN_MAP[key] ?? key] = value;
  }
  return out;
}

async function nextReqId() {
  const year = new Date().getFullYear();
  const { count } = await supabaseFetch('GET', 'requirements?select=id');
  return `VJR-REQ-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

// ── Main action handler ────────────────────────────────────────────────────

async function executeAction(action, params) {
  switch (action) {

    // ── CRM Leads ─────────────────────────────────────────────────────
    case 'list': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { search, status, priority, source, agent, sortBy, sortOrder, page = 1, limit = 15 } = params;
      let filters = [];
      if (search) filters.push(`or=(name.ilike.%25${encodeURIComponent(search)}%25,phone.ilike.%25${encodeURIComponent(search)}%25,lead_id.ilike.%25${encodeURIComponent(search)}%25)`);
      if (status) filters.push(`status=eq.${encodeURIComponent(status)}`);
      if (priority) filters.push(`priority=eq.${encodeURIComponent(priority)}`);
      if (source) filters.push(`lead_source=eq.${encodeURIComponent(source)}`);
      if (agent) filters.push(`assigned_agent=eq.${encodeURIComponent(agent)}`);
      filters.push('deleted_at=is.null');
      const sortCol = sortBy === 'leadId' ? 'lead_id' : sortBy === 'leadSource' ? 'lead_source' : 'created_at';
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      filters.push(`order=${sortCol}.${order}`, `limit=${limit}`, `offset=${(page - 1) * limit}`);
      const { data, count } = await supabaseFetch('GET', `leads?${filters.join('&')}`, null);
      const rows = data ?? [];
      const agentIds = [...new Set(rows.map(r => r.assigned_agent).filter(Boolean))];
      let agentMap = {};
      if (agentIds.length > 0) {
        const agentPromises = agentIds.map(id => supabaseFetch('GET', `agents?id=eq.${encodeURIComponent(id)}&select=id,name,email`, null));
        const agentResults = await Promise.all(agentPromises);
        agentResults.forEach(r => { if (r.data?.[0]) agentMap[r.data[0].id] = r.data[0]; });
      }
      const enriched = rows.map(r => ({ ...r, agent: r.assigned_agent ? agentMap[r.assigned_agent] ?? null : null }));
      return { data: enriched, count: count ?? rows.length };
    }

    case 'get': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { data } = await supabaseFetch('GET', `leads?id=eq.${encodeURIComponent(params.id)}&select=*`, null);
      if (!data?.length) throw new Error('Lead not found');
      return data[0];
    }

    case 'update': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, ...fields } = params;
      const camelToSnake = (s) => s.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
      const updates = {};
      for (const [k, v] of Object.entries(fields)) {
        if (k === '_auth') continue;
        updates[camelToSnake(k)] = v;
      }
      updates.updated_at = new Date().toISOString();
      await supabaseFetch('PATCH', `leads?id=eq.${encodeURIComponent(id)}`, updates);
      return { id };
    }

    case 'remove': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      await supabaseFetch('PATCH', `leads?id=eq.${encodeURIComponent(params.id)}`, { deleted_at: new Date().toISOString() });
      return { id: params.id };
    }

    case 'updateStatus': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      await supabaseFetch('PATCH', `leads?id=eq.${encodeURIComponent(params.id)}`, { status: params.status, updated_at: new Date().toISOString() });
      return { id: params.id };
    }

    case 'assignAgent': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      await supabaseFetch('PATCH', `leads?id=eq.${encodeURIComponent(params.id)}`, { assigned_agent: params.agentId, updated_at: new Date().toISOString() });
      return { id: params.id };
    }

    case 'addNote': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { data: leadRows } = await supabaseFetch('GET', `leads?id=eq.${encodeURIComponent(params.id)}&select=notes`, null);
      const existing = leadRows?.[0]?.notes ?? [];
      const newNote = { text: params.text, author: params.author ?? 'Admin', timestamp: new Date().toISOString() };
      await supabaseFetch('PATCH', `leads?id=eq.${encodeURIComponent(params.id)}`, { notes: [...existing, newNote], updated_at: new Date().toISOString() });
      return { id: params.id };
    }

    case 'getActivities': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { data } = await supabaseFetch('GET', `activity_logs?lead_id=eq.${encodeURIComponent(params.leadId)}&order=created_at.desc&limit=100`, null);
      return { data: data ?? [] };
    }

    case 'getSources': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { data } = await supabaseFetch('GET', 'leads?select=lead_source&lead_source=not.is.null', null);
      const sources = [...new Set((data ?? []).map(r => r.lead_source).filter(Boolean))].sort();
      return { data: sources };
    }

    // ── Agents ────────────────────────────────────────────────────────
    case 'agents.list': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { data } = await supabaseFetch('GET', 'agents?order=created_at.desc', null);
      return { data: data ?? [] };
    }

    case 'agents.create': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { data } = await supabaseFetch('POST', 'agents', { name: params.name, email: params.email, phone: params.phone ?? '', status: params.status ?? 'Active' });
      return data?.[0];
    }

    case 'agents.update': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, ...fields } = params;
      await supabaseFetch('PATCH', `agents?id=eq.${encodeURIComponent(id)}`, fields);
      return { id };
    }

    case 'agents.delete': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      await supabaseFetch('DELETE', `agents?id=eq.${encodeURIComponent(params.id)}`);
      return { id: params.id };
    }

    // ── Employees ─────────────────────────────────────────────────────
    case 'employees.list': {
      const { search, status, department, designation, page = 1, limit = 20 } = params;
      let filters = [];
      if (search) filters.push(`or=(name.ilike.%25${encodeURIComponent(search)}%25,employee_id.ilike.%25${encodeURIComponent(search)}%25,email.ilike.%25${encodeURIComponent(search)}%25)`);
      if (status) filters.push(`status=eq.${encodeURIComponent(status)}`);
      if (department) filters.push(`department=eq.${encodeURIComponent(department)}`);
      if (designation) filters.push(`designation=eq.${encodeURIComponent(designation)}`);
      filters.push(`limit=${limit}`, `offset=${(page - 1) * limit}`, 'order=created_at.desc');
      const { data, count } = await supabaseFetch('GET', `employees?${filters.join('&')}`, null);
      const rows = (data ?? []).map((e) => ({ ...e, assigned_clients: 0, active_assigned_clients: 0, today_visits: 0 }));
      try {
        const today = new Date().toISOString().split('T')[0];
        const [assignRes, visitsRes] = await Promise.all([
          supabaseFetch('GET', 'crm_clients?select=assigned_employee,status', null),
          supabaseFetch('GET', `client_visits?select=employee_id&visit_date=eq.${today}`, null),
        ]);
        const byEmp = new Map(rows.map((e) => [e.id, e]));
        for (const c of assignRes?.data ?? []) {
          const e = byEmp.get(c.assigned_employee);
          if (e) {
            e.assigned_clients += 1;
            if (c.status !== 'Closed') e.active_assigned_clients += 1;
          }
        }
        for (const v of visitsRes?.data ?? []) {
          const e = byEmp.get(v.employee_id);
          if (e) e.today_visits += 1;
        }
      } catch { /* enrichment is best-effort */ }
      // KYC onboarding status per employee (no row = not started yet).
      try {
        const kycRes = await employeeFetch('GET', 'employee_kyc?select=employee_id,status', null);
        const kycByEmp = new Map((kycRes.data ?? []).map((k) => [k.employee_id, k.status]));
        for (const e of rows) e.kyc_status = kycByEmp.get(e.id) ?? 'not_started';
      } catch { /* KYC table may not exist yet on older environments */ }
      const stats = {
        total: rows.length,
        active: rows.filter((e) => e.status === 'Active').length,
        onLeave: rows.filter((e) => e.status === 'On Leave' || e.status === 'Leave').length,
        newThisMonth: rows.filter((e) => {
          if (!e.joining_date) return false;
          const d = new Date(e.joining_date);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
      };
      return { data: rows, stats };
    }

    case 'employees.get': {
      const { id } = params;
      if (params._auth?.role === 'employee') {
        const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
        const meRow = me.data?.[0];
        if (!meRow || meRow.id !== id) throw new Error('Forbidden');
      }
      const { data } = await supabaseFetch('GET', `employees?id=eq.${encodeURIComponent(id)}&select=*`, null);
      const row = data?.[0] ?? null;
      if (!row) return { data: null, history: [], attendance: [], leaves: [], payroll: [] };
      let kycStatus = null;
      try {
        const kycRes = await employeeFetch('GET', `employee_kyc?employee_id=eq.${encodeURIComponent(id)}&select=status`, null);
        kycStatus = kycRes.data?.[0]?.status ?? null;
      } catch { /* table not present yet */ }
      const [histRes, attRes, leaveRes, payRes] = await Promise.all([
        employeeFetch('GET', `employee_history?employee_id=eq.${encodeURIComponent(id)}&order=created_at.desc`, null),
        employeeFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(id)}&order=date.desc&limit=31`, null),
        employeeFetch('GET', `employee_leaves?employee_id=eq.${encodeURIComponent(id)}&order=created_at.desc`, null),
        employeeFetch('GET', `employee_payroll?employee_id=eq.${encodeURIComponent(id)}&order=year.desc&limit=100`, null),
      ]);
      return {
        data: { ...row, kyc_status: kycStatus },
        history: histRes.data ?? [],
        attendance: attRes.data ?? [],
        leaves: leaveRes.data ?? [],
        payroll: payRes.data ?? [],
      };
    }

    case 'employees.create': {
      const { _auth, ...rest } = params;
      const payload = mapEmployeeFields(rest);
      let result;
      try {
        result = await employeeFetch('POST', 'employees?select=*', payload);
      } catch (e) {
        // Auto-create a missing column once, then retry (same as production).
        const m = /Could not find the '(\w+)' column/.exec(e.message) || /column \\?["'](\w+)/.exec(e.message);
        if (!m) throw e;
        await ensureColumns('employees', [m[1]]);
        result = await employeeFetch('POST', 'employees?select=*', payload);
      }
      const row = result?.data?.[0] ?? null;
      if (row?.id) {
        try {
          await employeeFetch('POST', 'employee_history', {
            employee_id: row.id, event_type: 'joined', title: 'Joined',
            description: `${row.name || ''} joined as ${row.designation || 'employee'}`,
            event_date: row.joining_date ?? new Date().toISOString().slice(0, 10), created_by: _auth?.email ?? '',
          });
        } catch { /* non-fatal */ }
      }
      return { data: row };
    }

    case 'employees.update': {
      const { id, _auth, addHistory, historyType, historyTitle, historyDesc, ...rest } = params;
      const payload = mapEmployeeFields(rest);
      if (Object.keys(payload).length > 0) {
        payload.updated_at = new Date().toISOString();
        await employeeFetch('PATCH', `employees?id=eq.${encodeURIComponent(id)}`, payload);
      }
      if (addHistory) {
        try {
          await employeeFetch('POST', 'employee_history', {
            employee_id: id, event_type: historyType ?? 'updated', title: historyTitle ?? 'Updated',
            description: historyDesc ?? '', created_by: _auth?.email ?? '',
          });
        } catch { /* non-fatal */ }
      }
      const { data } = await employeeFetch('GET', `employees?id=eq.${encodeURIComponent(id)}&select=*`, null);
      return { data: data?.[0] ?? null };
    }

    case 'employees.delete': {
      await employeeFetch('DELETE', `employees?id=eq.${encodeURIComponent(params.id)}`);
      return { id: params.id };
    }

    case 'employees.maxEmployeeId': {
      const { data } = await supabaseFetch('GET', 'employees?select=employee_id&order=employee_id.desc&limit=1', null);
      return { maxId: data?.[0]?.employee_id ?? 'EMP-0000' };
    }

    case 'employees.history': {
      const { data } = await supabaseFetch('GET', `employee_history?employee_id=eq.${encodeURIComponent(params.employeeId)}&order=created_at.desc`, null);
      return { data: data ?? [] };
    }

    case 'employees.addHistory': {
      const { data } = await supabaseFetch('POST', 'employee_history', params);
      return data?.[0];
    }

    case 'employees.attendance': {
      const { employeeId, date } = params;
      const { data } = await supabaseFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(employeeId)}&date=eq.${encodeURIComponent(date)}&select=*`, null);
      return data?.[0] ?? null;
    }

    case 'employees.setAttendance': {
      const { employeeId, date, ...fields } = params;
      const { data: existing } = await supabaseFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(employeeId)}&date=eq.${encodeURIComponent(date)}&select=id`, null);
      if (existing?.length) {
        await supabaseFetch('PATCH', `employee_attendance?id=eq.${encodeURIComponent(existing[0].id)}`, fields);
        return { id: existing[0].id };
      }
      const { data } = await supabaseFetch('POST', 'employee_attendance', { employee_id: employeeId, date, ...fields });
      return data?.[0];
    }

    case 'employees.leaves': {
      const { employeeId } = params;
      const { data } = await supabaseFetch('GET', `employee_leaves?employee_id=eq.${encodeURIComponent(employeeId)}&order=start_date.desc`, null);
      return { data: data ?? [] };
    }

    case 'employees.applyLeave': {
      const { data } = await supabaseFetch('POST', 'employee_leaves', params);
      return data?.[0];
    }

    case 'employees.approveLeave': {
      await supabaseFetch('PATCH', `employee_leaves?id=eq.${encodeURIComponent(params.id)}`, { status: 'Approved', approved_by: params.approvedBy, approved_at: new Date().toISOString() });
      return { id: params.id };
    }

    case 'employees.rejectLeave': {
      await supabaseFetch('PATCH', `employee_leaves?id=eq.${encodeURIComponent(params.id)}`, { status: 'Rejected', approved_by: params.approvedBy, approved_at: new Date().toISOString(), rejection_reason: params.reason });
      return { id: params.id };
    }

    case 'employees.payroll': {
      const { employeeId, month, year } = params;
      const { data } = await supabaseFetch('GET', `employee_payroll?employee_id=eq.${encodeURIComponent(employeeId)}&month=eq.${month}&year=eq.${year}&select=*`, null);
      return data?.[0] ?? null;
    }

    case 'employees.generatePayroll': {
      const { employeeId, month, year, ...fields } = params;
      const { data: existing } = await supabaseFetch('GET', `employee_payroll?employee_id=eq.${encodeURIComponent(employeeId)}&month=eq.${month}&year=eq.${year}&select=id`, null);
      if (existing?.length) {
        await supabaseFetch('PATCH', `employee_payroll?id=eq.${encodeURIComponent(existing[0].id)}`, fields);
        return { id: existing[0].id };
      }
      const { data } = await supabaseFetch('POST', 'employee_payroll', { employee_id: employeeId, month, year, ...fields });
      return data?.[0];
    }

    case 'employees.markPaid': {
      await supabaseFetch('PATCH', `employee_payroll?id=eq.${encodeURIComponent(params.id)}`, { status: 'Paid', paid_at: new Date().toISOString() });
      return { id: params.id };
    }

    // ── Follow-ups ────────────────────────────────────────────────────
    case 'followUps.list': {
      const { search, status, agent, page = 1, limit = 20 } = params;
      let filters = [];
      if (search) filters.push(`or=(client_name.ilike.%25${encodeURIComponent(search)}%25,client_phone.ilike.%25${encodeURIComponent(search)}%25)`);
      if (status) filters.push(`status=eq.${encodeURIComponent(status)}`);
      if (agent) filters.push(`assigned_to=eq.${encodeURIComponent(agent)}`);
      filters.push(`limit=${limit}`, `offset=${(page - 1) * limit}`, 'order=follow_up_date.desc');
      const { data, count } = await supabaseFetch('GET', `crm_follow_ups?${filters.join('&')}`, null);
      return { data: data ?? [], count: count ?? (data ?? []).length };
    }

    case 'followUps.create': {
      const { data } = await supabaseFetch('POST', 'crm_follow_ups', params);
      return data?.[0];
    }

    case 'followUps.update': {
      const { id, ...fields } = params;
      await supabaseFetch('PATCH', `crm_follow_ups?id=eq.${encodeURIComponent(id)}`, fields);
      return { id };
    }

    // ── Site visits ───────────────────────────────────────────────────
    case 'siteVisits.list': {
      const { leadId } = params;
      const { data } = await supabaseFetch('GET', `site_visits?lead_id=eq.${encodeURIComponent(leadId)}&order=visit_date.desc`, null);
      return { data: data ?? [] };
    }

    case 'siteVisits.create': {
      const { data } = await supabaseFetch('POST', 'site_visits', params);
      return data?.[0];
    }

    // ── RPC ───────────────────────────────────────────────────────────
    case 'rpc': {
      return await supabaseRpc(params.fn, params.args);
    }

    // ── Admin management ──────────────────────────────────────────────
    case 'admin.verify': {
      // Resolve from the verified token identity (same as production) — the
      // front end never sends an email, so reading params.email here used to
      // return null and crash every admin page that reads verify.role.
      const auth = params._auth;
      if (!auth?.authorized) throw new Error('Unauthorized');
      if (auth.role === 'employee') {
        const emp = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(auth.email)}&select=*`, null);
        return { data: emp.data?.[0] ?? null, email: auth.email, role: 'employee', permissions: [] };
      }
      let dbRow = null;
      try {
        const adm = await supabaseFetch('GET', `admin_users?email=eq.${encodeURIComponent(auth.email)}&select=id,email,display_name,role,permissions,created_at`, null);
        dbRow = adm.data?.[0] ?? null;
      } catch { /* admin_users may be unreachable — token role still applies */ }
      return { data: dbRow, email: auth.email, role: auth.role ?? null, permissions: auth.permissions ?? null };
    }

    case 'admin.list': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const { data: dbAdmins } = await supabaseFetch('GET', 'admin_users?order=created_at.desc', null);
      return [...buildSuperAdminRows(), ...(dbAdmins ?? [])];
    }

    case 'admin.add': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const email = normalizeEmail(params.email);
      if (isSuperAdminEmail(email)) throw new Error('Cannot modify super admin');
      const { data } = await supabaseFetch('POST', 'admin_users', { id: `admin-${Date.now()}`, email, display_name: params.displayName ?? email, role: params.role ?? 'admin', permissions: scopePermissions(params._auth, params.permissions ?? []), avatar_url: '', created_at: new Date().toISOString() });
      return data?.[0];
    }

    case 'admin.remove': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const remEmail = normalizeEmail(params.email);
      if (isSuperAdminEmail(remEmail)) throw new Error('Cannot remove super admin');
      await supabaseFetch('DELETE', `admin_users?email=eq.${encodeURIComponent(remEmail)}`);
      return { email: remEmail };
    }

    case 'admin.update': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const updEmail = normalizeEmail(params.email);
      if (isSuperAdminEmail(updEmail)) throw new Error('Cannot modify super admin');
      await supabaseFetch('PATCH', `admin_users?email=eq.${encodeURIComponent(updEmail)}`, { role: params.role, permissions: scopePermissions(params._auth, params.permissions ?? []) });
      return { email: updEmail };
    }

    case 'admin.updateAvatar': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const avatarEmail = normalizeEmail(params.email);
      if (isSuperAdminEmail(avatarEmail)) throw new Error('Cannot modify super admin avatar');
      await supabaseFetch('PATCH', `admin_users?email=eq.${encodeURIComponent(avatarEmail)}`, { avatar_url: params.avatarUrl });
      return { email: avatarEmail };
    }

    // ── CRM Clients — mirrors api/crm-proxy.ts (same schema contracts) ──
    case 'crmClients.list': {
      const { data } = await supabaseFetch('GET', 'crm_clients?order=sno.desc', null);
      const rows = data ?? [];
      const empIds = [...new Set(rows.map((r) => r.assigned_employee).filter(Boolean))];
      let empMap = {};
      if (empIds.length > 0) {
        const { data: emps } = await employeeFetch('GET', `employees?id=in.(${empIds.join(',')})&select=id,employee_id,name`, null);
        (emps ?? []).forEach((e) => { empMap[e.id] = e; });
      }
      return { data: rows.map((r) => ({ ...r, assigned_employee_info: r.assigned_employee && empMap[r.assigned_employee] ? empMap[r.assigned_employee] : null })) };
    }

    // Assigned Clients dashboard — mirrors api/crm-proxy.ts.
    case 'crmClients.assignedView': {
      if (params._auth?.role === 'employee') throw new Error('Forbidden');
      const clientRes = await supabaseFetch('GET', 'crm_clients?assigned_employee=not.is.null&order=sno.desc', null);
      const rows = clientRes.data ?? [];
      const empIds = [...new Set(rows.map((r) => r.assigned_employee).filter(Boolean))];
      let empMap = {};
      if (empIds.length > 0) {
        const { data: emps } = await employeeFetch('GET', `employees?id=in.(${empIds.join(',')})&select=id,employee_id,name,designation,department,status`, null);
        (emps ?? []).forEach((e) => { empMap[e.id] = e; });
      }
      const todayISO = new Date().toISOString().split('T')[0];
      let visitRows = [];
      try {
        const { data } = await supabaseFetch('GET', `client_visits?visit_date=gte.${todayISO}&order=visit_date.asc`, null);
        visitRows = data ?? [];
      } catch { /* visits may not be configured */ }
      const nextVisitBy = {};
      const upcomingCount = {};
      for (const v of visitRows) {
        const key = v.client_sno;
        if (key == null) continue;
        upcomingCount[key] = (upcomingCount[key] ?? 0) + 1;
        if (!nextVisitBy[key]) nextVisitBy[key] = v;
      }
      const enriched = [];
      for (const r of rows) {
        let lastActivity = null;
        try {
          const actRes = await supabaseFetch('GET', `crm_client_activity?client_sno=eq.${encodeURIComponent(r.sno)}&order=created_at.desc&limit=1`, null);
          lastActivity = actRes.data?.[0] ?? null;
        } catch { /* no activity yet */ }
        enriched.push({
          ...r,
          assigned_employee_info: r.assigned_employee && empMap[r.assigned_employee] ? empMap[r.assigned_employee] : null,
          last_activity: lastActivity,
          next_visit: nextVisitBy[r.sno] ?? null,
          upcoming_visits: upcomingCount[r.sno] ?? 0,
        });
      }
      return { data: enriched };
    }

    case 'crmClients.upsert': {
      const payload = { ...(params.data ?? params) };
      delete payload.assigned_employee_info; // not a DB column
      const sno = payload.sno;
      if (sno == null) throw new Error('sno is required');
      const { data: existing } = await supabaseFetch('GET', `crm_clients?sno=eq.${encodeURIComponent(sno)}&select=id`, null);
      if (existing?.length) {
        await supabaseFetch('PATCH', `crm_clients?sno=eq.${encodeURIComponent(sno)}`, payload);
        return { data: payload };
      }
      const { data } = await supabaseFetch('POST', 'crm_clients', payload);
      return { data: data?.[0] ?? payload };
    }

    // Telecaller / sales self-service: add a new lead from the portal. Mirrors
    // api/crm-proxy.ts — employees create and get self-assigned.
    case 'crmClients.create': {
      const isEmployee = params._auth?.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const name = params.name;
      if (!name?.trim()) throw new Error('Client name is required');
      const maxRes = await supabaseFetch('GET', 'crm_clients?select=sno&order=sno.desc&limit=1', null);
      const sno = (maxRes.data?.[0]?.sno ?? 0) + 1;
      let assigned_employee = params.assigned_employee ?? null;
      let performedBy = params._auth?.email ?? '';
      let performedById = null;
      if (isEmployee) {
        const meRes = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id,employee_id,name`, null);
        const me = meRes.data?.[0] ?? null;
        if (!me) throw new Error('Employee not found');
        assigned_employee = me.id;
        performedBy = `${me.name} (${me.employee_id})`;
        performedById = me.id;
      }
      const payload = {
        sno,
        name: name.trim(),
        phone: params.phone ?? '',
        email: params.email ?? '',
        type: params.type ?? '',
        budget: params.budget ?? '',
        location: params.location ?? '',
        requirements: params.requirements ?? '',
        notes: params.notes ?? '',
        source: params.source ?? '',
        client_role: params.client_role ?? 'Buyer',
        lead_type: params.lead_type ?? 'new lead',
        status: '',
        assigned_employee,
      };
      const { data } = await supabaseFetch('POST', 'crm_clients', payload);
      await supabaseFetch('POST', 'crm_client_activity', {
        client_sno: sno, action: 'created', status: '',
        note: `Lead created by ${performedBy}${isEmployee ? ' (self-assigned)' : ''}`, performed_by: performedBy, performed_by_id: performedById,
      });
      return { data: data?.[0] ?? payload };
    }

    case 'crmClients.delete': {
      if (params.sno == null) throw new Error('sno is required');
      await supabaseFetch('DELETE', `crm_clients?sno=eq.${encodeURIComponent(params.sno)}`);
      return { message: 'Deleted' };
    }

    case 'crmClients.maxSno': {
      const { data } = await supabaseFetch('GET', 'crm_clients?select=sno&order=sno.desc&limit=1', null);
      return { data: data?.[0]?.sno ?? 0 };
    }

    case 'crmClients.updateStatus': {
      const { sno, status, note, leadType } = params;
      if (sno == null || (!status && !leadType)) throw new Error('sno and status are required');
      const isEmployee = params._auth?.role === 'employee';
      const clientRes = await supabaseFetch('GET', `crm_clients?sno=eq.${encodeURIComponent(sno)}&select=sno,name,status,assigned_employee`, null);
      const client = clientRes.data?.[0] ?? null;
      if (!client) throw new Error('Client not found');
      let performedBy = params._auth?.email ?? '';
      let performedById = null;
      if (isEmployee) {
        const meRes = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id,employee_id,name`, null);
        const me = meRes.data?.[0] ?? null;
        if (!me) throw new Error('Employee not found');
        if (client.assigned_employee !== me.id) throw new Error('Client is not assigned to you');
        performedById = me.id;
        performedBy = `${me.name} (${me.employee_id})`;
      }
      const updates = { updated_at: new Date().toISOString() };
      if (status !== undefined && status !== null) updates.status = status;
      if (leadType !== undefined && leadType !== null) updates.lead_type = leadType;
      await supabaseFetch('PATCH', `crm_clients?sno=eq.${encodeURIComponent(sno)}`, updates);
      await supabaseFetch('POST', 'crm_client_activity', {
        client_sno: sno, action: status !== undefined && status !== null ? 'status_changed' : 'lead_type_changed',
        status: status !== undefined && status !== null ? status : client.status ?? '',
        note: note ?? (leadType ? `Lead type set to ${leadType}` : ''),
        performed_by: performedBy, performed_by_id: performedById,
      });
      return { data: { sno, status: updates.status ?? client.status } };
    }

    case 'crmClients.activity': {
      if (params.sno == null) throw new Error('sno is required');
      const { data } = await supabaseFetch('GET', `crm_client_activity?client_sno=eq.${encodeURIComponent(params.sno)}&order=created_at.desc&limit=50`, null);
      return { data: data ?? [] };
    }

    // ── Employee self-service ─────────────────────────────────────────
    case 'employees.me': {
      const email = params._auth?.email ?? '';
      if (!email) throw new Error('Unauthorized');
      const { data } = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(email)}&select=*`, null);
      return { data: data?.[0] ?? null };
    }

    case 'employees.clients': {
      let empId = params.employeeId;
      let locked = false;
      if (!empId && params._auth?.role === 'employee') {
        const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id,kyc_required`, null);
        const meRow = me.data?.[0] ?? null;
        empId = meRow?.id;
        // KYC gate — same policy as production: while KYC is required but not
        // verified, the employee's client pipeline stays locked.
        if (meRow && meRow.kyc_required !== false) {
          let status = null;
          try {
            const kycRow = await employeeFetch('GET', `employee_kyc?employee_id=eq.${encodeURIComponent(empId)}&select=status`, null);
            status = kycRow.data?.[0]?.status ?? null;
          } catch { /* KYC table may not exist yet */ }
          if (status !== 'verified') locked = true;
        }
      }
      if (!empId) throw new Error('employeeId is required');
      if (locked) return { data: { employee: { id: empId }, locked: true, reason: 'kyc', clients: [] } };
      const [empRes, clientRes] = await Promise.all([
        employeeFetch('GET', `employees?id=eq.${encodeURIComponent(empId)}&select=id,employee_id,name,email`, null),
        employeeFetch('GET', `crm_clients?assigned_employee=eq.${encodeURIComponent(empId)}&order=sno.desc`, null),
      ]);
      return { data: { employee: empRes.data?.[0] ?? null, locked: false, clients: clientRes.data ?? [] } };
    }

    case 'employees.assignClient': {
      const { employeeId, sno } = params;
      if (!employeeId || sno == null) throw new Error('employeeId and sno are required');
      const empRes = await employeeFetch('GET', `employees?id=eq.${encodeURIComponent(employeeId)}&select=id,employee_id,name`, null);
      const emp = empRes.data?.[0] ?? null;
      if (!emp) throw new Error('Employee not found');
      const clientRes = await supabaseFetch('GET', `crm_clients?sno=eq.${encodeURIComponent(sno)}&select=sno,name,status`, null);
      const client = clientRes.data?.[0] ?? null;
      if (!client) throw new Error('Client not found');
      await supabaseFetch('PATCH', `crm_clients?sno=eq.${encodeURIComponent(sno)}`, { assigned_employee: employeeId, updated_at: new Date().toISOString() });
      await supabaseFetch('POST', 'crm_client_activity', {
        client_sno: sno, action: 'assigned', status: client.status ?? '',
        note: `Assigned to ${emp.name} (${emp.employee_id})`, performed_by: params._auth?.email ?? '', performed_by_id: employeeId,
      });
      return { message: 'Client assigned' };
    }

    case 'employees.unassignClient': {
      const { sno } = params;
      if (sno == null) throw new Error('sno is required');
      const clientRes = await supabaseFetch('GET', `crm_clients?sno=eq.${encodeURIComponent(sno)}&select=sno,name,status`, null);
      const client = clientRes.data?.[0] ?? null;
      if (client) {
        await supabaseFetch('PATCH', `crm_clients?sno=eq.${encodeURIComponent(sno)}`, { assigned_employee: null, updated_at: new Date().toISOString() });
        await supabaseFetch('POST', 'crm_client_activity', {
          client_sno: sno, action: 'unassigned', status: client.status ?? '',
          note: 'Assignment removed', performed_by: params._auth?.email ?? '',
        });
      }
      return { message: 'Client unassigned' };
    }

    case 'employees.saveNotes': {
      // Personal notes on the employee record (portal Notes popup) — same as prod.
      const email = params._auth?.email ?? '';
      const meRes = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(email)}&select=id`, null);
      const me = meRes.data?.[0] ?? null;
      if (!me) throw new Error('Employee not found');
      await supabaseFetch('PATCH', `employees?id=eq.${encodeURIComponent(me.id)}`, { notes: params.notes ?? '', updated_at: new Date().toISOString() });
      return { message: 'Notes saved' };
    }

    case 'employees.uploadPhoto': {
      const { employeeId: empId, base64 } = params;
      if (!empId || !base64) throw new Error('employeeId and base64 are required');
      // Employees may only set their own photo; admins may set anyone's.
      if (params._auth?.role === 'employee') {
        const meRes = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
        const me = meRes.data?.[0] ?? null;
        if (!me || me.id !== empId) throw new Error('Forbidden');
      }
      const buffer = decodeBase64(base64);
      if (!buffer || buffer.length === 0) throw new Error('Empty image');
      if (buffer.length > 5 * 1024 * 1024) throw new Error('Image too large (max 5 MB)');
      const extMatch = /^data:image\/(jpeg|png|webp)/.exec(base64 ?? '');
      const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'jpg';
      const path = `employee-photos/${empId}-${Date.now()}.${ext}`;
      const e = getEnv();
      const up = await fetch(`${e.CLI_URL}/storage/v1/object/employee-photos/${path}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${e.CLI_KEY || e.CLI_ANON}`, 'Content-Type': `image/${ext === 'jpg' ? 'jpeg' : ext}` },
        body: buffer,
      });
      if (!up.ok) throw new Error('Upload failed');
      const photoUrl = `${e.CLI_URL}/storage/v1/object/public/employee-photos/${path}`;
      await supabaseFetch('PATCH', `employees?id=eq.${encodeURIComponent(empId)}`, { profile_photo_url: photoUrl, updated_at: new Date().toISOString() });
      return { data: { profilePhotoUrl: photoUrl } };
    }

    case 'employees.faceVerify': {
      const { employeeId: empId2, selfieBase64, verificationType } = params;
      return { verified: true, method: verificationType };
    }

    case 'employees.startSession': {
      const { data } = await supabaseFetch('POST', 'employee_sessions', { employee_id: params.employeeId, start_time: new Date().toISOString(), status: 'active' });
      return data?.[0];
    }

    case 'employees.heartbeat': {
      await supabaseFetch('PATCH', `employee_sessions?id=eq.${encodeURIComponent(params.sessionId)}`, { last_heartbeat: new Date().toISOString() });
      return { ok: true };
    }

    case 'employees.endSession': {
      await supabaseFetch('PATCH', `employee_sessions?id=eq.${encodeURIComponent(params.sessionId)}`, { end_time: new Date().toISOString(), status: 'ended' });
      return { ok: true };
    }

    case 'employees.updateClientDetail': {
      const { sno, requirements, notes } = params;
      if (sno == null) throw new Error('sno is required');
      const email = params._auth?.email ?? '';
      const meRes = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(email)}&select=id`, null);
      const me = meRes.data?.[0] ?? null;
      if (!me) throw new Error('Employee not found');
      const clientRes = await supabaseFetch('GET', `crm_clients?sno=eq.${encodeURIComponent(sno)}&select=sno,assigned_employee`, null);
      const client = clientRes.data?.[0] ?? null;
      if (!client) throw new Error('Client not found');
      if (client.assigned_employee !== me.id) throw new Error('Client is not assigned to you');
      const updates = { updated_at: new Date().toISOString() };
      if (requirements !== undefined) updates.requirements = requirements;
      if (notes !== undefined) updates.notes = notes;
      await supabaseFetch('PATCH', `crm_clients?sno=eq.${encodeURIComponent(sno)}`, updates);
      return { message: 'Client details updated' };
    }

    case 'employees.sessionStats': {
      const { data } = await supabaseFetch('GET', `employee_sessions?employee_id=eq.${encodeURIComponent(params.employeeId)}&order=start_time.desc&limit=30`, null);
      return { data: data ?? [] };
    }

    case 'employees.logins': {
      const { data } = await supabaseFetch('GET', `employee_logins?employee_id=eq.${encodeURIComponent(params.employeeId)}&order=login_time.desc&limit=50`, null);
      return { data: data ?? [] };
    }

    case 'employees.faceVerifications': {
      const { data } = await supabaseFetch('GET', `employee_face_verifications?employee_id=eq.${encodeURIComponent(params.employeeId)}&order=created_at.desc&limit=50`, null);
      return { data: data ?? [] };
    }

    case 'employees.pendingFaceVerify': {
      const { data } = await supabaseFetch('GET', `employee_face_verifications?status=eq.pending&order=created_at.desc`, null);
      return { data: data ?? [] };
    }

    case 'employees.requestFaceVerify': {
      const { data } = await supabaseFetch('POST', 'employee_face_verifications', { employee_id: params.employeeId, status: 'pending', requested_by: params.requestedBy, created_at: new Date().toISOString() });
      return data?.[0];
    }

    // ── KYC onboarding: employee submits Aadhaar/PAN docs, admin verifies ───
    case 'employees.kycGet': {
      const isEmployee = params._auth?.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      let employeeId = params.employeeId;
      if (isEmployee) {
        const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
        if (!me.data?.[0]) throw new Error('Employee not found');
        employeeId = me.data[0].id;
      }
      if (!employeeId) throw new Error('employeeId is required');
      const [empRes, kycRes, docsRes] = await Promise.all([
        employeeFetch('GET', `employees?id=eq.${encodeURIComponent(employeeId)}&select=id,employee_id,name,email,designation,department,pan_number,aadhar_number,date_of_birth,gender,status`, null),
        employeeFetch('GET', `employee_kyc?employee_id=eq.${encodeURIComponent(employeeId)}&select=*`, null),
        employeeFetch('GET', `employee_kyc_documents?employee_id=eq.${encodeURIComponent(employeeId)}&select=*`, null),
      ]);
      return {
        data: {
          employee: empRes.data?.[0] ?? null,
          kyc: kycRes.data?.[0] ?? null,
          documents: docsRes.data ?? [],
        },
      };
    }
    case 'employees.kycUploadDoc': {
      if (params._auth?.role !== 'employee') throw new Error('Forbidden');
      const { docType, base64 } = params;
      if (!['aadhaar_front', 'aadhaar_back', 'pan'].includes(docType)) throw new Error('Invalid document type');
      if (!base64) throw new Error('Document image is required');
      const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id,employee_id`, null);
      const meRow = me.data?.[0];
      if (!meRow) throw new Error('Employee not found');
      const buffer = decodeBase64(base64);
      if (buffer.length === 0) throw new Error('Empty file');
      if (buffer.length > 5 * 1024 * 1024) throw new Error('File too large (max 5 MB)');
      const extMatch = /^data:image\/(jpeg|png|webp)/.exec(base64 ?? '');
      const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'jpg';
      const path = `${meRow.employee_id}/kyc/${docType}-${Date.now()}.${ext}`;
      const e = getEnv();
      const up = await fetch(`${e.CLI_URL}/storage/v1/object/employee-photos/${path}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${e.CLI_KEY || e.CLI_ANON}`, 'Content-Type': `image/${ext === 'jpg' ? 'jpeg' : ext}`, 'apikey': e.CLI_KEY || e.CLI_ANON },
        body: buffer,
      });
      if (!up.ok) { const t = await up.text(); throw new Error('Upload failed: ' + (t || up.status)); }
      const fileUrl = `${e.CLI_URL}/storage/v1/object/public/employee-photos/${path}`;
      const existing = await employeeFetch('GET', `employee_kyc_documents?employee_id=eq.${encodeURIComponent(meRow.id)}&doc_type=eq.${docType}&select=id`, null);
      if (existing.data?.length) {
        await employeeFetch('PATCH', `employee_kyc_documents?id=eq.${encodeURIComponent(existing.data[0].id)}`, { file_url: fileUrl, uploaded_at: new Date().toISOString() });
      } else {
        await employeeFetch('POST', 'employee_kyc_documents', { employee_id: meRow.id, doc_type: docType, file_url: fileUrl, uploaded_at: new Date().toISOString() });
      }
      return { data: { employee_id: meRow.id, doc_type: docType, file_url: fileUrl } };
    }
    case 'employees.kycSubmit': {
      if (params._auth?.role !== 'employee') throw new Error('Forbidden');
      const { panNumber, aadharNumber } = params;
      const pan = String(panNumber ?? '').trim().toUpperCase();
      const aadhar = String(aadharNumber ?? '').replace(/[\s-]/g, '');
      if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) throw new Error('PAN format looks wrong — expected 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)');
      if (aadhar && !/^\d{12}$/.test(aadhar)) throw new Error('Aadhaar must be exactly 12 digits');
      if (!pan || !aadhar) throw new Error('PAN and Aadhaar numbers are required to submit KYC');
      const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id,employee_id,name`, null);
      const meRow = me.data?.[0];
      if (!meRow) throw new Error('Employee not found');
      const docs = await employeeFetch('GET', `employee_kyc_documents?employee_id=eq.${encodeURIComponent(meRow.id)}&select=doc_type`, null);
      const have = new Set((docs.data ?? []).map((d) => d.doc_type));
      const missing = ['aadhaar_front', 'aadhaar_back', 'pan'].filter((t) => !have.has(t));
      if (missing.length > 0) throw new Error('Please upload every required document (Aadhaar front, Aadhaar back and PAN) before submitting.');
      await employeeFetch('PATCH', `employees?id=eq.${encodeURIComponent(meRow.id)}`, { pan_number: pan, aadhar_number: aadhar, updated_at: new Date().toISOString() });
      const now = new Date().toISOString();
      const kycExisting = await employeeFetch('GET', `employee_kyc?employee_id=eq.${encodeURIComponent(meRow.id)}&select=id`, null);
      const kycPayload = { status: 'pending', submitted_at: now, admin_note: '', reviewed_at: null, reviewed_by: '', updated_at: now };
      if (kycExisting.data?.length) {
        await employeeFetch('PATCH', `employee_kyc?id=eq.${encodeURIComponent(kycExisting.data[0].id)}`, kycPayload);
      } else {
        await employeeFetch('POST', 'employee_kyc', { employee_id: meRow.id, ...kycPayload });
      }
      try {
        await employeeFetch('POST', 'employee_history', {
          employee_id: meRow.id, event_type: 'kyc_submitted', title: 'KYC submitted',
          description: `Submitted Aadhaar ${aadhar.slice(0, 4)}… & PAN ${pan} for verification`,
        });
      } catch { /* non-fatal */ }
      return { data: { employee_id: meRow.id, status: 'pending' } };
    }
    case 'employees.kycReview': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId, decision, note } = params;
      if (!employeeId) throw new Error('employeeId is required');
      if (!['verified', 'changes_requested'].includes(decision)) throw new Error('Invalid decision');
      const emp = await employeeFetch('GET', `employees?id=eq.${encodeURIComponent(employeeId)}&select=id,employee_id,name`, null);
      if (!emp.data?.[0]) throw new Error('Employee not found');
      const now = new Date().toISOString();
      const kycExisting = await employeeFetch('GET', `employee_kyc?employee_id=eq.${encodeURIComponent(employeeId)}&select=id`, null);
      const kycPayload = {
        status: decision, reviewed_at: now, reviewed_by: params._auth?.email ?? '',
        admin_note: String(note ?? '').slice(0, 500), updated_at: now,
      };
      if (kycExisting.data?.length) {
        await employeeFetch('PATCH', `employee_kyc?id=eq.${encodeURIComponent(kycExisting.data[0].id)}`, kycPayload);
      } else {
        await employeeFetch('POST', 'employee_kyc', { employee_id: employeeId, ...kycPayload });
      }
      try {
        await employeeFetch('POST', 'employee_history', {
          employee_id: employeeId,
          event_type: decision === 'verified' ? 'kyc_verified' : 'kyc_rejected',
          title: decision === 'verified' ? 'KYC verified' : 'KYC changes requested',
          description: decision === 'verified' ? 'Admin approved the KYC documents' : `Admin requested changes: ${note || 'please re-upload the documents'}`,
          created_by: params._auth?.email ?? '',
        });
      } catch { /* non-fatal */ }
      return { data: { employee_id: employeeId, status: decision } };
    }

    // ── Attendance ────────────────────────────────────────────────────
    case 'attendance.clockIn': {
      const { data } = await supabaseFetch('POST', 'employee_attendance', {
        employee_id: params.employeeId,
        date: params.date ?? new Date().toISOString().slice(0, 10),
        check_in_time: new Date().toISOString(),
        check_in_lat: params.lat, check_in_lng: params.lng, check_in_location: params.location,
        check_in_selfie_url: params.selfieUrl, status: 'Present',
      });
      return data?.[0];
    }

    case 'attendance.clockOut': {
      const { data: attRow } = await supabaseFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(params.employeeId)}&date=eq.${params.date ?? new Date().toISOString().slice(0, 10)}&select=id`, null);
      if (attRow?.length) {
        await supabaseFetch('PATCH', `employee_attendance?id=eq.${encodeURIComponent(attRow[0].id)}`, {
          check_out_time: new Date().toISOString(),
          check_out_lat: params.lat, check_out_lng: params.lng, check_out_location: params.location,
          check_out_selfie_url: params.selfieUrl,
        });
      }
      return { ok: true };
    }

    case 'attendance.startBreak': {
      const { data: attRows } = await supabaseFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(params.employeeId)}&date=eq.${params.date ?? new Date().toISOString().slice(0, 10)}&select=id,breaks`, null);
      const row = attRows?.[0];
      if (row) {
        const breaks = row.breaks ?? [];
        breaks.push({ start: new Date().toISOString(), end: null });
        await supabaseFetch('PATCH', `employee_attendance?id=eq.${encodeURIComponent(row.id)}`, { breaks });
      }
      return { ok: true };
    }

    case 'attendance.endBreak': {
      const { data: attRows2 } = await supabaseFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(params.employeeId)}&date=eq.${params.date ?? new Date().toISOString().slice(0, 10)}&select=id,breaks`, null);
      const row2 = attRows2?.[0];
      if (row2) {
        const breaks = row2.breaks ?? [];
        const lastBreak = breaks[breaks.length - 1];
        if (lastBreak && !lastBreak.end) lastBreak.end = new Date().toISOString();
        await supabaseFetch('PATCH', `employee_attendance?id=eq.${encodeURIComponent(row2.id)}`, { breaks });
      }
      return { ok: true };
    }

    case 'attendance.today': {
      const { data } = await supabaseFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(params.employeeId)}&date=eq.${params.date ?? new Date().toISOString().slice(0, 10)}&select=*`, null);
      return data?.[0] ?? null;
    }

    case 'attendance.activeBreak': {
      const { data: attRows3 } = await supabaseFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(params.employeeId)}&date=eq.${params.date ?? new Date().toISOString().slice(0, 10)}&select=breaks`, null);
      const breaks = attRows3?.[0]?.breaks ?? [];
      const active = breaks.find(b => b.start && !b.end);
      return active ?? null;
    }

    // ── Employee events (wishings / announcements) — mirrors api/crm-proxy.ts ──
    case 'events.list': {
      const isEmployee = params._auth?.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { data } = await employeeFetch('GET', 'employee_events?order=event_date.desc&limit=100', null);
      let rows = data ?? [];
      if (isEmployee) {
        const { data: me } = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id,department,designation`, null);
        const meRow = me?.[0];
        if (meRow) {
          rows = rows.filter((ev) => {
            const depts = ev.target_departments ?? [];
            const desigs = ev.target_designations ?? [];
            const emps = ev.target_employee_ids ?? [];
            if (depts.length === 0 && desigs.length === 0 && emps.length === 0) return true; // everyone
            if (depts.includes(meRow.department)) return true;
            if (desigs.includes(meRow.designation)) return true;
            if (emps.includes(meRow.id)) return true;
            return false;
          });
        }
      }
      return { data: rows };
    }
    case 'events.create': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { title, description, eventType, eventDate, imageUrl, targetDepartments, targetDesignations, targetEmployeeIds } = params;
      if (!title) throw new Error('Title is required');
      const { data } = await employeeFetch('POST', 'employee_events', {
        title, description: description ?? '', event_type: eventType ?? 'Update',
        event_date: eventDate ?? null, image_url: imageUrl ?? '', created_by: params._auth?.email ?? '',
        target_departments: targetDepartments ?? [], target_designations: targetDesignations ?? [],
        target_employee_ids: targetEmployeeIds ?? [],
      });
      return { data: data?.[0] ?? null };
    }
    case 'events.update': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id, title, description, eventType, eventDate, imageUrl, targetDepartments, targetDesignations, targetEmployeeIds } = params;
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (eventType !== undefined) updates.event_type = eventType;
      if (eventDate !== undefined) updates.event_date = eventDate;
      if (imageUrl !== undefined) updates.image_url = imageUrl;
      if (targetDepartments !== undefined) updates.target_departments = targetDepartments;
      if (targetDesignations !== undefined) updates.target_designations = targetDesignations;
      if (targetEmployeeIds !== undefined) updates.target_employee_ids = targetEmployeeIds;
      await employeeFetch('PATCH', `employee_events?id=eq.${encodeURIComponent(id)}`, updates);
      return { message: 'Event updated' };
    }
    case 'events.delete': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id } = params;
      await employeeFetch('DELETE', `employee_events?id=eq.${encodeURIComponent(id)}`);
      return { message: 'Event deleted' };
    }

    // ── Client site visits — mirrors api/crm-proxy.ts ──
    case 'visits.list': {
      const isEmployee = params._auth?.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      let path = 'client_visits?order=visit_date.desc&limit=200';
      if (params.employeeId) path += `&employee_id=eq.${encodeURIComponent(params.employeeId)}`;
      if (params.clientSno) path += `&client_sno=eq.${encodeURIComponent(params.clientSno)}`;
      if (isEmployee) {
        const { data: me } = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
        if (!me?.[0]) throw new Error('Employee not found');
        path += `&employee_id=eq.${encodeURIComponent(me[0].id)}`;
      }
      const { data } = await employeeFetch('GET', path, null);
      const rows = data ?? [];
      const empIds = [...new Set(rows.map((r) => r.employee_id).filter(Boolean))];
      let empMap = {};
      if (empIds.length > 0) {
        const { data: emps } = await employeeFetch('GET', `employees?id=in.(${empIds.join(',')})&select=id,employee_id,name`, null);
        (emps ?? []).forEach((e) => { empMap[e.id] = e; });
      }
      const snos = [...new Set(rows.map((r) => r.client_sno).filter((x) => x != null))];
      let clientMap = {};
      if (snos.length > 0) {
        const { data: cl } = await employeeFetch('GET', `crm_clients?sno=in.(${snos.join(',')})&select=sno,name,phone,status,lead_type,type,budget,location,requirements`, null);
        (cl ?? []).forEach((c) => { clientMap[c.sno] = c; });
      }
      return { data: rows.map((r) => ({ ...r, employee_info: empMap[r.employee_id] ?? null, client_info: clientMap[r.client_sno] ?? null })) };
    }
    case 'visits.add': {
      const isEmployee = params._auth?.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { clientSno, visitDate, notes, visitTime } = params;
      if (clientSno == null || !visitDate) throw new Error('clientSno and visitDate are required');
      let employeeId = params.employeeId;
      if (isEmployee) {
        const { data: me } = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
        if (!me?.[0]) throw new Error('Employee not found');
        employeeId = me[0].id;
        const { data: client } = await employeeFetch('GET', `crm_clients?sno=eq.${encodeURIComponent(clientSno)}&select=assigned_employee`, null);
        if (!client?.[0] || client[0].assigned_employee !== employeeId) throw new Error('Client is not assigned to you');
      }
      if (!employeeId) throw new Error('employeeId is required');
      const { data } = await employeeFetch('POST', 'client_visits', {
        employee_id: employeeId, client_sno: clientSno, visit_date: visitDate, notes: notes ?? '',
        visit_time: normalizeTime(visitTime),
      });
      const { data: client } = await employeeFetch('GET', `crm_clients?sno=eq.${encodeURIComponent(clientSno)}&select=name,status`, null);
      await employeeFetch('POST', 'crm_client_activity', {
        client_sno: clientSno, action: 'visit_scheduled', status: client?.[0]?.status ?? '',
        note: `Site visit scheduled for ${visitDate}${visitTime ? ' at ' + visitTime : ''}${notes ? ' — ' + notes : ''}`, performed_by: params._auth?.email ?? '', performed_by_id: employeeId,
      });
      return { data: data?.[0] ?? null };
    }
    case 'visits.updateStatus': {
      const isEmployee = params._auth?.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id, status } = params;
      if (!status) throw new Error('status is required');
      const { data: visit } = await employeeFetch('GET', `client_visits?id=eq.${encodeURIComponent(id)}&select=*`, null);
      const visitRow = visit?.[0] ?? null;
      if (!visitRow) throw new Error('Visit not found');
      if (isEmployee) {
        const { data: me } = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
        if (!me?.[0] || visitRow.employee_id !== me[0].id) throw new Error('Forbidden');
      }
      await employeeFetch('PATCH', `client_visits?id=eq.${encodeURIComponent(id)}`, { status });
      const { data: client } = await employeeFetch('GET', `crm_clients?sno=eq.${encodeURIComponent(visitRow.client_sno)}&select=name,status`, null);
      await employeeFetch('POST', 'crm_client_activity', {
        client_sno: visitRow.client_sno, action: 'visit_status', status: client?.[0]?.status ?? '',
        note: `Site visit marked ${status}`, performed_by: params._auth?.email ?? '', performed_by_id: visitRow.employee_id,
      });
      return { message: 'Visit updated' };
    }

    // ── Geofences ─────────────────────────────────────────────────────
    case 'geofences.list': {
      const { data } = await supabaseFetch('GET', 'geofences?order=created_at.desc', null);
      return { data: data ?? [] };
    }
    case 'geofences.create': {
      const { data } = await supabaseFetch('POST', 'geofences', params);
      return data?.[0];
    }
    case 'geofences.update': {
      const { id, ...fields } = params;
      await supabaseFetch('PATCH', `geofences?id=eq.${encodeURIComponent(id)}`, fields);
      return { id };
    }
    case 'geofences.delete': {
      await supabaseFetch('DELETE', `geofences?id=eq.${encodeURIComponent(params.id)}`);
      return { id: params.id };
    }
    case 'geofences.check': {
      return { inside: true };
    }

    // ── Storage stats ─────────────────────────────────────────────────
    case 'storage.stats': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const e = getEnv();
      const quotaBytes = 1024 * 1024 * 1024;
      const BUCKETS = ['property-images', 'auction-images', 'resumes'];
      const bucketStats = [];
      let totalBytes = 0;
      let totalObjects = 0;
      const allFiles = [];
      for (const bucket of BUCKETS) {
        try {
          // Use the Supabase Storage API (not PostgREST storage.objects table)
          const res = await fetch(`${e.REQ_URL}/storage/v1/object/list/${bucket}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${e.REQ_KEY}`, 'Content-Type': 'application/json', 'apikey': e.REQ_KEY },
            body: JSON.stringify({ prefix: '', limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }),
          });
          const files = await res.json();
          if (Array.isArray(files) && files.length > 0) {
            const bytes = files.reduce((sum, f) => sum + Number(f.metadata?.size ?? 0), 0);
            bucketStats.push({ bucket, objects: files.length, bytes });
            totalBytes += bytes;
            totalObjects += files.length;
            files.forEach(f => allFiles.push({ bucket, name: f.name, bytes: Number(f.metadata?.size ?? 0) }));
          } else {
            bucketStats.push({ bucket, objects: 0, bytes: 0 });
          }
        } catch {
          bucketStats.push({ bucket, objects: 0, bytes: 0 });
        }
      }
      const largest = allFiles.sort((a, b) => b.bytes - a.bytes).slice(0, 5);
      return { totalBytes, totalObjects, buckets: bucketStats, largest, quotaBytes };
    }

    case 'admin.databaseSummary': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const tables = ['properties', 'auctions', 'leads', 'crm_clients', 'admin_users', 'employees', 'requirements', 'blog_posts', 'site_settings'];
      const counts = {};
      for (const t of tables) {
        try {
          const { count } = await supabaseFetch('GET', `${t}?select=id`, null);
          counts[t] = count ?? 0;
        } catch { counts[t] = 0; }
      }
      return { counts };
    }

    // ── Image uploads ─────────────────────────────────────────────────
    case 'image.upload': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { bucket, entityId, name, contentType, dataBase64 } = params;
      if (!['property-images', 'auction-images'].includes(bucket)) throw new Error('Invalid bucket');
      if (!entityId) throw new Error('entityId required');
      if (!ALLOWED_IMAGE_TYPES.test(contentType ?? '')) throw new Error('Invalid image type');
      const buffer = decodeBase64(dataBase64);
      if (buffer.length === 0) throw new Error('Empty file');
      if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image exceeds 3 MB');
      const safeName = sanitizeFileName(name);
      const path = `${entityId}/${Date.now()}-${safeName}`;
      const e = getEnv();
      const { error } = await fetch(`${e.REQ_URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${e.REQ_KEY}`, 'Content-Type': contentType || 'image/jpeg', 'apikey': e.REQ_KEY },
        body: buffer,
      }).then(async r => { if (!r.ok) { const t = await r.text(); return { error: new Error(t) }; } return { error: null }; });
      if (error) throw error;
      const publicUrl = `${e.REQ_URL}/storage/v1/object/public/${bucket}/${path}`;
      return { url: publicUrl, path };
    }

    case 'image.delete': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { bucket, path: imgPath } = params;
      if (!['property-images', 'auction-images'].includes(bucket)) throw new Error('Invalid bucket');
      if (!imgPath) throw new Error('path required');
      const e = getEnv();
      await fetch(`${e.REQ_URL}/storage/v1/object/${bucket}/${imgPath}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${e.REQ_KEY}`, 'apikey': e.REQ_KEY },
      });
      return { path: imgPath };
    }

    // ── Resumes ───────────────────────────────────────────────────────
    case 'resume.upload': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { jobId, name, contentType, dataBase64 } = params;
      if (!ALLOWED_RESUME_TYPES.test(contentType ?? '')) throw new Error('Invalid file type');
      const buffer = decodeBase64(dataBase64);
      if (buffer.length === 0) throw new Error('Empty file');
      if (buffer.length > MAX_RESUME_BYTES) throw new Error('File exceeds 5 MB');
      const safeName = (name || 'resume').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${jobId}/${Date.now()}_${safeName}`;
      const e = getEnv();
      await fetch(`${e.CLI_URL}/storage/v1/object/resumes/${path}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${e.CLI_KEY || e.CLI_ANON}`, 'Content-Type': contentType || 'application/octet-stream' },
        body: buffer,
      });
      return { url: `${e.CLI_URL}/storage/v1/object/public/resumes/${path}`, fileName: name };
    }

    // ── Properties ────────────────────────────────────────────────────
    case 'property.create': {
      console.log('[property.create] auth:', JSON.stringify(params._auth));
      if (!params._auth?.authorized) throw new Error('Forbidden');
      if (!isAdmin(params._auth) && params.uid !== params._auth.uid) throw new Error('Forbidden');
      const { uid: _uid, _auth: _a1, _ip: _ip1, _public: _pub1, ...raw } = params;
      const code = await nextPropertyCode();
      const finalCode = (params.property_code ?? '').trim() || code;
      const propId = crypto.randomUUID();
      const clean = pickPropertyColumns({
        ...raw, id: propId, property_code: finalCode,
        created_at: dbDate(params.createdAt) ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      console.log('[property.create] clean keys:', Object.keys(clean).join(', '));
      try {
        await supabaseFetch('POST', 'properties', clean);
      } catch (fetchErr) {
        console.error('[property.create] Supabase insert failed:', fetchErr.message);
        throw fetchErr;
      }
      console.log('[property.create] SUCCESS id:', propId);
      return { id: propId, propertyCode: finalCode };
    }
    case 'property.update': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { id: _pid, createdAt: _ca, updatedAt: _ua, _auth: _a2, _ip: _ip2, _public: _pub2, ...rawFields } = params;
      const row = await getPropertyRow(_pid);
      if (!row) throw new Error('Property not found');
      if (!isAdmin(params._auth) && row.uid !== params._auth.uid) throw new Error('Forbidden');
      const updates = pickPropertyColumns({ ...rawFields, updated_at: new Date().toISOString() });
      delete updates.uid;
      await supabaseFetch('PATCH', `properties?id=eq.${encodeURIComponent(_pid)}`, updates);
      return { id: _pid };
    }
    case 'property.delete': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      await supabaseFetch('DELETE', `properties?id=eq.${encodeURIComponent(params.id)}`);
      return { id: params.id };
    }
    case 'property.toggleFeatured': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      await supabaseFetch('PATCH', `properties?id=eq.${encodeURIComponent(params.id)}`, { featured: !params.featured, updated_at: new Date().toISOString() });
      return { id: params.id };
    }
    case 'property.backfillCodes': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const { data: toBackfill } = await supabaseFetch('GET', 'properties?select=id,property_code,uid&property_code=is.null&uid=is.null');
      let code = '';
      for (const r of (toBackfill ?? [])) {
        if (!code) code = await nextPropertyCode();
        else { const m = code.match(/^VJR-(\d+)$/); code = `VJR-${String((m ? parseInt(m[1], 10) : 0) + 1).padStart(4, '0')}`; }
        await supabaseFetch('PATCH', `properties?id=eq.${encodeURIComponent(r.id)}`, { property_code: code });
      }
      return { count: (toBackfill ?? []).length };
    }

    // ── Auctions ──────────────────────────────────────────────────────
    case 'auction.create': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const { createdAt: _ac, auctionStartTime: _as, auctionEndTime: _ae, _auth: _ac2, _ip: _aci2, _public: _acp2, ...afields } = params;
      const auctionId = crypto.randomUUID();
      await supabaseFetch('POST', 'auctions', {
        id: auctionId, ...mapAuctionFields(afields),
        auction_start_time: dbDate(_as), auction_end_time: dbDate(_ae),
        created_at: dbDate(_ac) ?? new Date().toISOString(),
      });
      return { id: auctionId };
    }
    case 'auction.update': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const { id: _aid, auctionStartTime: _aus, auctionEndTime: _aue, _auth: _au2, _ip: _aui2, _public: _aup2, ...aupd } = params;
      const auFields = mapAuctionFields(aupd);
      if (_aus !== undefined) auFields.auction_start_time = dbDate(_aus);
      if (_aue !== undefined) auFields.auction_end_time = dbDate(_aue);
      await supabaseFetch('PATCH', `auctions?id=eq.${encodeURIComponent(_aid)}`, auFields);
      return { id: _aid };
    }
    case 'auction.delete': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      await supabaseFetch('DELETE', `auctions?id=eq.${encodeURIComponent(params.id)}`);
      return { id: params.id };
    }
    case 'auction.setStatus': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      await supabaseFetch('PATCH', `auctions?id=eq.${encodeURIComponent(params.id)}`, { status: params.status });
      return { id: params.id };
    }
    case 'bid.place': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { auctionId, amount } = params;
      const bidderName = String(params.bidderName ?? 'Anonymous').slice(0, 60);
      const bidData = await supabaseRpc('place_bid', { p_auction_id: auctionId, p_bidder_id: params._auth.uid, p_bidder_name: bidderName, p_amount: Number(amount) });
      return { id: auctionId, currentBid: bidData?.currentBid, totalBids: bidData?.totalBids };
    }

    // ── Requirements ──────────────────────────────────────────────────
    case 'requirement.create': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const { paymentMode, buyerName, buyerPhone, reqId, postedAt, ...publicFields } = params;
      const generatedReqId = reqId ?? await nextReqId();
      const reqRecId = crypto.randomUUID();
      await supabaseFetch('POST', 'requirements', {
        id: reqRecId,
        purpose: publicFields.purpose ?? '', purpose_other: publicFields.purposeOther ?? null,
        property_type: publicFields.propertyType ?? '', property_type_other: publicFields.propertyTypeOther ?? null,
        locations: publicFields.locations ?? [], budget_min: publicFields.budgetMin ?? 0, budget_max: publicFields.budgetMax ?? 0,
        timeline: publicFields.timeline ?? '', notes: publicFields.notes ?? null,
        req_id: generatedReqId, status: 'open', click_count: 0,
        posted_at: dbDate(postedAt) ?? new Date().toISOString(),
      });
      await supabaseFetch('POST', 'requirement_private', {
        id: reqRecId, payment_mode: paymentMode ?? 'Other', buyer_name: buyerName ?? '', buyer_phone: buyerPhone ?? '',
      });
      return { id: reqRecId, reqId: generatedReqId };
    }
    case 'requirement.update': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const { id: _rid, paymentMode, buyerName, buyerPhone, ...rfields } = params;
      const rupdates = {};
      if (rfields.purpose !== undefined) rupdates.purpose = rfields.purpose;
      if (rfields.propertyType !== undefined) rupdates.property_type = rfields.propertyType;
      if (rfields.locations !== undefined) rupdates.locations = rfields.locations;
      if (rfields.budgetMin !== undefined) rupdates.budget_min = rfields.budgetMin;
      if (rfields.budgetMax !== undefined) rupdates.budget_max = rfields.budgetMax;
      if (rfields.timeline !== undefined) rupdates.timeline = rfields.timeline;
      if (rfields.status !== undefined) rupdates.status = rfields.status;
      if (rfields.notes !== undefined) rupdates.notes = rfields.notes;
      if (Object.keys(rupdates).length > 0) await supabaseFetch('PATCH', `requirements?id=eq.${encodeURIComponent(_rid)}`, rupdates);
      if (paymentMode !== undefined || buyerName !== undefined || buyerPhone !== undefined) {
        await supabaseFetch('PATCH', `requirement_private?id=eq.${encodeURIComponent(_rid)}`, {
          ...(paymentMode !== undefined ? { payment_mode: paymentMode } : {}),
          ...(buyerName !== undefined ? { buyer_name: buyerName } : {}),
          ...(buyerPhone !== undefined ? { buyer_phone: buyerPhone } : {}),
        });
      }
      return { id: _rid };
    }
    case 'requirement.delete': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      await supabaseFetch('DELETE', `requirements?id=eq.${encodeURIComponent(params.id)}`);
      return { id: params.id };
    }
    case 'requirement.click': {
      if (!params._public) throw new Error('Forbidden');
      if (rateLimited(`click:${params._ip}`)) throw new Error('Too many requests');
      const clickData = await supabaseRpc('increment_requirement_click', { p_req_id: params.id });
      return { clickCount: clickData };
    }

    // ── Property leads (public) ───────────────────────────────────────
    case 'lead.create': {
      if (!params._public) throw new Error('Forbidden');
      if (rateLimited(`lead:${params._ip}`, 10, 60000)) throw new Error('Too many requests');
      const { propertyId, propertyTitle, leadType, message, propertyType, propertyArea, propertyPrice, propertyMonthlyRental, propertyUrl, visitDate, visitTime, buyerName, buyerPhone, buyerLat, buyerLng, source, ownerUid, listedBy } = params;
      if (!propertyId || !propertyTitle || !message || !leadType) throw new Error('Invalid lead');
      const leadId = crypto.randomUUID();
      await supabaseFetch('POST', 'property_leads', {
        id: leadId, property_id: propertyId, property_title: propertyTitle, property_type: propertyType ?? '', property_area: propertyArea ?? '',
        property_price: propertyPrice ?? '', property_monthly_rental: propertyMonthlyRental ?? null, property_url: propertyUrl ?? '',
        lead_type: leadType, visit_date: visitDate ?? null, visit_time: visitTime ?? null,
        buyer_name: buyerName ?? null, buyer_phone: buyerPhone ?? null, buyer_lat: buyerLat ?? null, buyer_lng: buyerLng ?? null,
        message, source: source ?? 'card', owner_uid: ownerUid ?? null, listed_by: listedBy ?? null, ip_address: params._ip, status: 'new',
        created_at: new Date().toISOString(),
      });
      return { id: leadId };
    }

    // ── Users ─────────────────────────────────────────────────────────
    case 'user.track': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { uid: _tuid, ...tpayload } = params;
      if (_tuid !== params._auth.uid) throw new Error('Forbidden');
      delete tpayload.suspended;
      const { data: texisting } = await supabaseFetch('GET', `users?uid=eq.${encodeURIComponent(_tuid)}&select=uid,login_count,suspended`);
      const exRow = texisting?.[0];
      if (exRow?.suspended === true) return { suspended: true };
      await supabaseFetch('POST', 'users', {
        uid: _tuid, email: tpayload.email ?? '', display_name: tpayload.displayName ?? '', photo_url: tpayload.photoURL ?? '',
        login_count: exRow ? (exRow.login_count ?? 0) + (tpayload.loginCount ?? 0) : (tpayload.loginCount ?? 1),
        last_login: tpayload.lastLogin ?? new Date().toISOString(), last_seen: tpayload.lastSeen ?? new Date().toISOString(),
        created_at: exRow ? undefined : (tpayload.createdAt ?? new Date().toISOString()), suspended: false,
      });
      return { suspended: false };
    }
    case 'user.list': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const { data: ulist } = await supabaseFetch('GET', 'users?order=last_seen.desc&limit=500');
      return { data: ulist ?? [] };
    }
    case 'user.checkSuspended': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { data: uschk } = await supabaseFetch('GET', `users?uid=eq.${encodeURIComponent(params._auth.uid)}&select=suspended`);
      return { suspended: uschk?.[0]?.suspended === true };
    }
    case 'user.suspend': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      await supabaseFetch('PATCH', `users?uid=eq.${encodeURIComponent(params.uid)}`, { suspended: !!params.suspended });
      return { uid: params.uid, suspended: !!params.suspended };
    }

    // ── Lead list (admin) ─────────────────────────────────────────────
    case 'lead.list': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      let leadQ = 'property_leads?order=created_at.desc&limit=500';
      if (!isAdmin(params._auth)) leadQ += `&owner_uid=eq.${encodeURIComponent(params._auth.uid)}`;
      const { data: leads } = await supabaseFetch('GET', leadQ);
      return { data: leads ?? [] };
    }

    // ── Lead status update (admin) ────────────────────────────────────
    case 'lead.setStatus': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      if (!params.id) throw new Error('Booking id is required');
      if (!['new', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(params.status)) throw new Error('Invalid status');
      const { data: existing } = await supabaseFetch('GET', `property_leads?id=eq.${encodeURIComponent(params.id)}&select=id`);
      if (!existing?.length) throw new Error('Booking not found');
      await supabaseFetch('PATCH', `property_leads?id=eq.${encodeURIComponent(params.id)}`, { status: params.status });
      return { id: params.id };
    }

    // ── Settings ──────────────────────────────────────────────────────
    case 'settings.update': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const supdates = { updated_at: new Date().toISOString() };
      if (params.mapOnly !== undefined) supdates.map_only = params.mapOnly;
      if (params.nexaEnabled !== undefined) supdates.nexa_enabled = params.nexaEnabled;
      await supabaseFetch('PATCH', 'site_settings?key=eq.general', supdates);
      return { message: 'Settings updated' };
    }

    // ── Jobs ──────────────────────────────────────────────────────────
    case 'job.create': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const { postedAt: _jpa, ...jfields } = params;
      const jobId = crypto.randomUUID();
      await supabaseFetch('POST', 'job_openings', { id: jobId, ...jfields, posted_at: dbDate(_jpa) ?? new Date().toISOString() });
      return { id: jobId };
    }
    case 'job.update': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      await supabaseFetch('PATCH', `job_openings?id=eq.${encodeURIComponent(params.id)}`, params);
      return { id: params.id };
    }
    case 'job.toggleActive': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      await supabaseFetch('PATCH', `job_openings?id=eq.${encodeURIComponent(params.id)}`, { is_active: params.isActive });
      return { id: params.id };
    }
    case 'job.delete': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      await supabaseFetch('DELETE', `job_openings?id=eq.${encodeURIComponent(params.id)}`);
      return { id: params.id };
    }
    case 'application.apply': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { referenceId: _ref, applicantLat: _al, applicantLng: _ag, applicantArea: _aa, ...appFields } = params;
      const now = new Date();
      const appId = crypto.randomUUID();
      await supabaseFetch('POST', 'job_applications', {
        id: appId, ...appFields, reference_id: _ref, applicant_uid: params._auth.uid, applicant_email: params._auth.email,
        applicant_lat: _al ?? null, applicant_lng: _ag ?? null, applicant_area: _aa ?? null,
        status: 'Applied', status_history: [{ status: 'Applied', note: 'Application submitted', updatedBy: 'candidate', updatedAt: now }],
        admin_notes: '', rating: 0, tags: [], is_shortlisted: false, viewed_by_admin: false,
        applied_at: now.toISOString(), updated_at: now.toISOString(),
      });
      try { await supabaseRpc('increment_job_applications', { p_job_id: appFields.jobId }); } catch {}
      return { id: appId, referenceId: _ref };
    }
    case 'application.list': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const { data: apps } = await supabaseFetch('GET', 'job_applications?order=applied_at.desc&limit=500');
      return { data: apps ?? [] };
    }
    case 'application.update': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const { id: _appid, ...aupd } = params;
      const appUpdates = { updated_at: new Date().toISOString() };
      if (aupd.status !== undefined) appUpdates.status = aupd.status;
      if (aupd.statusHistory !== undefined) appUpdates.status_history = aupd.statusHistory;
      if (aupd.rating !== undefined) appUpdates.rating = aupd.rating;
      if (aupd.adminNotes !== undefined) appUpdates.admin_notes = aupd.adminNotes;
      if (aupd.viewedByAdmin !== undefined) appUpdates.viewed_by_admin = aupd.viewedByAdmin;
      if (aupd.isShortlisted !== undefined) appUpdates.is_shortlisted = aupd.isShortlisted;
      await supabaseFetch('PATCH', `job_applications?id=eq.${encodeURIComponent(_appid)}`, appUpdates);
      return { id: _appid };
    }

    case 'employees.recordLogin': {
      // Mirrors api/crm-proxy.ts — employee login counter + daily row.
      if (params._auth?.role !== 'employee') throw new Error('Forbidden');
      const { data: me } = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id,employee_id,name,login_count`, null);
      const meRow = me?.[0];
      if (!meRow) throw new Error('Employee not found');
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await employeeFetch('GET', `employee_logins?employee_id=eq.${encodeURIComponent(meRow.id)}&login_date=eq.${today}&select=id`, null);
      if (!existing?.length) {
        await employeeFetch('POST', 'employee_logins', { employee_id: meRow.id, user_agent: (params.userAgent ?? '').slice(0, 200) });
        await employeeFetch('PATCH', `employees?id=eq.${encodeURIComponent(meRow.id)}`, { login_count: (meRow.login_count ?? 0) + 1, last_login: new Date().toISOString() });
      }
      return { message: 'Login recorded' };
    }

    case 'clients.activity': {
      // Mirrors api/crm-proxy.ts — admin sees all; an employee only their own.
      const { sno } = params;
      if (sno == null) throw new Error('sno is required');
      const isEmployee = params._auth?.role === 'employee';
      if (isEmployee) {
        const { data: me } = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
        const { data: client } = await employeeFetch('GET', `crm_clients?sno=eq.${encodeURIComponent(sno)}&select=assigned_employee`, null);
        if (!me?.[0] || !client?.[0] || client[0].assigned_employee !== me[0].id) throw new Error('Forbidden');
      } else if (!hasPerm(params._auth, 'clients.view')) {
        throw new Error('Forbidden');
      }
      const { data } = await employeeFetch('GET', `crm_client_activity?client_sno=eq.${encodeURIComponent(sno)}&order=created_at.desc&limit=100`, null);
      return { data: data ?? [] };
    }

    case 'attendance.liveStatus': {
      // Admin: who is currently clocked in today — mirrors api/crm-proxy.ts.
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const dateStr = new Date().toISOString().slice(0, 10);
      const { data: clockedIn } = await employeeFetch('GET', `employee_attendance?date=eq.${dateStr}&check_in=not.is.null&order=check_in.desc&select=id,employee_id,check_in,check_out,status,check_in_location,check_in_lat,check_in_lng`, null);
      const empIds = [...new Set((clockedIn ?? []).map((r) => r.employee_id).filter(Boolean))];
      let empMap = {};
      if (empIds.length > 0) {
        const { data: emps } = await employeeFetch('GET', `employees?id=in.(${empIds.join(',')})&select=id,name,employee_id,designation,department,profile_photo_url,work_start_time`, null);
        (emps ?? []).forEach((e) => { empMap[e.id] = e; });
      }
      let onLeaveIds = new Set();
      try {
        const { data: leaves } = await employeeFetch('GET', `employee_leaves?status=eq.Approved&start_date=lte.${dateStr}&end_date=gte.${dateStr}&select=employee_id`, null);
        (leaves ?? []).forEach((l) => onLeaveIds.add(l.employee_id));
      } catch { /* leaves may not be configured */ }
      const toMinutes = (t) => {
        if (!t) return null;
        const m = /^(\d{1,2}):(\d{2})/.exec(String(t));
        return m ? Number(m[1]) * 60 + Number(m[2]) : null;
      };
      const results = (clockedIn ?? []).map((r) => {
        const emp = empMap[r.employee_id] ?? null;
        const ci = toMinutes(r.check_in);
        const ws = emp ? toMinutes(emp.work_start_time) : null;
        const lateMinutes = ci != null && ws != null && ci > ws ? ci - ws : 0;
        return { ...r, employee: emp, is_on_shift: !r.check_out, on_leave: onLeaveIds.has(r.employee_id), late_minutes: lateMinutes };
      });
      const onShift = results.filter((r) => r.is_on_shift);
      const done = results.filter((r) => !r.is_on_shift);
      return { onShift, done, total: results.length };
    }

    case 'attendance.weeklyReport': {
      // Mirrors api/crm-proxy.ts — whole-org weekly hours, or one employee.
      const isEmployee = params._auth?.role === 'employee';
      let empId = params.employeeId;
      if (isEmployee) {
        const { data: me } = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
        if (!me?.[0]) throw new Error('Employee not found');
        empId = me[0].id;
      } else if (!hasPerm(params._auth, 'clients.view')) {
        throw new Error('Forbidden');
      }
      const { startDate, endDate } = params;
      if (!startDate || !endDate) throw new Error('startDate and endDate are required');
      let path = `employee_attendance?date=gte.${startDate}&date=lte.${endDate}`;
      if (empId) path += `&employee_id=eq.${encodeURIComponent(empId)}`;
      path += '&order=date.asc';
      const { data: rows } = await employeeFetch('GET', path, null);
      const report = (rows ?? []).map((r) => {
        let workedMinutes = 0;
        if (r.check_in && r.check_out) {
          const [ciH, ciM] = String(r.check_in).split(':').map(Number);
          const [coH, coM] = String(r.check_out).split(':').map(Number);
          workedMinutes = Math.max(0, (coH * 60 + coM) - (ciH * 60 + ciM) - (r.total_break_minutes ?? 0));
        }
        return { ...r, worked_minutes: workedMinutes };
      });
      const sum = (key) => report.reduce((s, r) => s + (r[key] ?? 0), 0);
      const summary = { totalWorkedMinutes: sum('worked_minutes'), totalOvertimeMinutes: sum('overtime_minutes'), totalBreakMinutes: sum('total_break_minutes'), daysWorked: report.filter((r) => r.check_in).length };
      if (!empId && report.length > 0) {
        const ids = [...new Set(report.map((r) => r.employee_id))];
        let empMeta = {};
        try {
          const { data: emps } = await employeeFetch('GET', `employees?id=in.(${ids.join(',')})&select=id,name,employee_id,designation,department,profile_photo_url`, null);
          (emps ?? []).forEach((e) => { empMeta[e.id] = e; });
        } catch { /* meta optional */ }
        const perEmployee = {};
        for (const id of ids) {
          const days = report.filter((r) => r.employee_id === id);
          perEmployee[id] = {
            employee: empMeta[id] ?? {},
            totalWorkedMinutes: days.reduce((s, r) => s + r.worked_minutes, 0),
            totalOvertimeMinutes: days.reduce((s, r) => s + (r.overtime_minutes ?? 0), 0),
            totalBreakMinutes: days.reduce((s, r) => s + (r.total_break_minutes ?? 0), 0),
            daysWorked: days.filter((r) => r.check_in).length,
          };
        }
        return { data: report.map((r) => ({ ...r, employee_info: empMeta[r.employee_id] ?? null })), summary, perEmployee };
      }
      return { data: report, summary };
    }

    // ── Bookings access for sales & telecaller agents — mirrors api/crm-proxy.ts ──
    case 'bookings.visibility': {
      if (!params._auth?.authorized || params._auth.role === 'employee') throw new Error('Forbidden');
      let enabled = true;
      try {
        const { data } = await employeeFetch('GET', 'employees?status=neq.Terminated&select=bookings_visible&limit=1', null);
        enabled = data?.[0] ? data[0].bookings_visible !== false : true;
      } catch (e) { console.warn('[crm-proxy] bookings.visibility failed:', e); }
      return { enabled };
    }
    case 'bookings.setVisibility': {
      if (params._auth?.role === 'employee' || !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const enabled = Boolean(params.enabled);
      await employeeFetch('PATCH', 'employees?status=neq.Terminated', { bookings_visible: enabled, updated_at: new Date().toISOString() });
      return { enabled };
    }
    case 'bookings.mine': {
      const isEmployee = params._auth?.role === 'employee';
      if (isEmployee) {
        const { data: me } = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id,bookings_visible`, null);
        if (!me?.[0]) throw new Error('Employee not found');
        if (me[0].bookings_visible === false) throw new Error('Bookings access is turned off by your admin');
      } else if (!hasPerm(params._auth, 'clients.view')) {
        throw new Error('Forbidden');
      }
      const { data } = await supabaseFetch('GET', 'property_leads?lead_type=eq.book_visit&order=created_at.desc&limit=200&select=id,buyer_name,buyer_phone,property_title,property_type,property_area,property_price,visit_date,visit_time,status,created_at', null);
      return { data: (data ?? []).filter((r) => r.buyer_name || r.buyer_phone) };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export default function crmProxyPlugin() {
  return {
    name: 'crm-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const isCrmProxy = req.method === 'POST' && (req.url === '/api/crm-proxy' || req.url === '/crm-proxy');
        const isDataProxy = req.method === 'POST' && (req.url === '/api/data-proxy' || req.url === '/data-proxy');
        if (!isCrmProxy && !isDataProxy) return next();

        const e = getEnv();
        if (!e.REQ_KEY) console.error('[data-proxy] WARNING: REQ_KEY is empty! process.env.SUPABASE_REQ_SERVICE_KEY =', (process.env.SUPABASE_REQ_SERVICE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? 'undefined')?.substring(0, 20));

        let body;
        try { body = await readBody(req); } catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Invalid JSON' })); return; }

        const { action, params = {}, public: isPublic } = body;
        if (!action) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Missing action' })); return; }

        // Public actions (no token required)
        if (isPublic) {
          try {
            const result = await executeAction(action, { ...params, _public: true, _ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || '' });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (e) {
            console.error('Data proxy public error:', e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message ?? 'Internal error' }));
          }
          return;
        }

        const authHeader = req.headers['authorization'] ?? '';
        const token = authHeader.replace('Bearer ', '');
        if (!token) { console.error(`[data-proxy] ${action}: Missing auth header`); res.statusCode = 401; res.end(JSON.stringify({ error: 'Missing authorization' })); return; }

        let auth;
        try {
          auth = await verifyFirebaseToken(token);
        } catch (authErr) {
          console.error(`[data-proxy] ${action}: Firebase verification threw:`, authErr.message);
          res.statusCode = 401; res.end(JSON.stringify({ error: 'Token verification failed' })); return;
        }
        if (!auth.authorized) { console.error(`[data-proxy] ${action}: Unauthorized email=${auth.email}`); res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }

        try {
          const result = await executeAction(action, { ...params, _auth: auth, _ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || '' });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (e) {
          console.error(`[data-proxy] action=${action} error:`, e.message || e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message ?? 'Internal error' }));
        }
      });
    },
  };
}
