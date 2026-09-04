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
      const { search, status, department, page = 1, limit = 20 } = params;
      let filters = [];
      if (search) filters.push(`or=(name.ilike.%25${encodeURIComponent(search)}%25,employee_id.ilike.%25${encodeURIComponent(search)}%25,email.ilike.%25${encodeURIComponent(search)}%25)`);
      if (status) filters.push(`status=eq.${encodeURIComponent(status)}`);
      if (department) filters.push(`department=eq.${encodeURIComponent(department)}`);
      filters.push(`limit=${limit}`, `offset=${(page - 1) * limit}`, 'order=created_at.desc');
      const { data, count } = await supabaseFetch('GET', `employees?${filters.join('&')}`, null);
      return { data: data ?? [], count: count ?? (data ?? []).length };
    }

    case 'employees.get': {
      const { data } = await supabaseFetch('GET', `employees?id=eq.${encodeURIComponent(params.id)}&select=*`, null);
      return data?.[0] ?? null;
    }

    case 'employees.create': {
      const { data } = await employeeInsertRetry('employees', params);
      return data?.[0];
    }

    case 'employees.update': {
      const { id, ...fields } = params;
      await supabaseFetch('PATCH', `employees?id=eq.${encodeURIComponent(id)}`, fields);
      return { id };
    }

    case 'employees.delete': {
      await supabaseFetch('DELETE', `employees?id=eq.${encodeURIComponent(params.id)}`);
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
      const email = normalizeEmail(params.email ?? '');
      if (isSuperAdminEmail(email)) return { role: 'super_admin', permissions: null, display_name: SUPER_ADMIN_DISPLAY_NAMES[email] ?? 'Admin' };
      const { data } = await supabaseFetch('GET', `admin_users?email=eq.${encodeURIComponent(email)}&select=id,role,permissions,display_name`, null);
      if (data?.length) return { role: data[0].role, permissions: data[0].permissions, display_name: data[0].display_name };
      return null;
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

    // ── CRM Clients ───────────────────────────────────────────────────
    case 'crmClients.list': {
      const { search, agentId, page = 1, limit = 20 } = params;
      let filters = [];
      if (search) filters.push(`or=(client_name.ilike.%25${encodeURIComponent(search)}%25,client_phone.ilike.%25${encodeURIComponent(search)}%25)`);
      if (agentId) filters.push(`assigned_agent=eq.${encodeURIComponent(agentId)}`);
      filters.push(`limit=${limit}`, `offset=${(page - 1) * limit}`, 'order=created_at.desc');
      const { data, count } = await supabaseFetch('GET', `crm_clients?${filters.join('&')}`, null);
      return { data: data ?? [], count: count ?? (data ?? []).length };
    }

    case 'crmClients.upsert': {
      const { sno, ...fields } = params;
      const { data: existing } = await supabaseFetch('GET', `crm_clients?sno=eq.${sno}&select=id`, null);
      if (existing?.length) {
        await supabaseFetch('PATCH', `crm_clients?id=eq.${encodeURIComponent(existing[0].id)}`, fields);
        return { id: existing[0].id, sno };
      }
      const { data } = await supabaseFetch('POST', 'crm_clients', { sno, ...fields });
      return data?.[0];
    }

    case 'crmClients.delete': {
      await supabaseFetch('DELETE', `crm_clients?id=eq.${encodeURIComponent(params.id)}`);
      return { id: params.id };
    }

    case 'crmClients.maxSno': {
      const { data } = await supabaseFetch('GET', 'crm_clients?select=sno&order=sno.desc&limit=1', null);
      return { maxSno: data?.[0]?.sno ?? 0 };
    }

    case 'crmClients.activity': {
      const { clientId } = params;
      const { data } = await supabaseFetch('GET', `crm_client_activity?client_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc&limit=50`, null);
      return { data: data ?? [] };
    }

    // ── Employee self-service ─────────────────────────────────────────
    case 'employees.me': {
      const { data } = await supabaseFetch('GET', `employees?email=eq.${encodeURIComponent(params.email)}&select=*`, null);
      return data?.[0] ?? null;
    }

    case 'employees.clients': {
      const { data } = await supabaseFetch('GET', `crm_clients?assigned_agent=eq.${encodeURIComponent(params.employeeId)}&order=created_at.desc`, null);
      return { data: data ?? [] };
    }

    case 'employees.assignClient': {
      await supabaseFetch('PATCH', `crm_clients?id=eq.${encodeURIComponent(params.clientId)}`, { assigned_agent: params.employeeId });
      return { id: params.clientId };
    }

    case 'employees.unassignClient': {
      await supabaseFetch('PATCH', `crm_clients?id=eq.${encodeURIComponent(params.clientId)}`, { assigned_agent: null });
      return { id: params.clientId };
    }

    case 'employees.saveNotes': {
      await supabaseFetch('PATCH', `crm_clients?id=eq.${encodeURIComponent(params.clientId)}`, { notes: params.notes });
      return { id: params.clientId };
    }

    case 'employees.uploadPhoto': {
      const { employeeId: empId, photoBase64, photoType } = params;
      const buffer = decodeBase64(photoBase64);
      const path = `employee-photos/${empId}/${Date.now()}.jpg`;
      const e = getEnv();
      await fetch(`${e.CLI_URL}/storage/v1/object/employee-photos/${path}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${e.CLI_KEY || e.CLI_ANON}`, 'Content-Type': photoType || 'image/jpeg' },
        body: buffer,
      });
      const { data: urlData } = await supabaseFetch('GET', `employee-photos?name=eq.${path}`);
      return { url: `${e.CLI_URL}/storage/v1/object/public/employee-photos/${path}` };
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
      const { clientId, ...fields } = params;
      await supabaseFetch('PATCH', `crm_clients?id=eq.${encodeURIComponent(clientId)}`, fields);
      return { id: clientId };
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

    // ── Events ────────────────────────────────────────────────────────
    case 'events.list': {
      const { data } = await supabaseFetch('GET', 'events?order=event_date.desc&limit=100', null);
      return { data: data ?? [] };
    }
    case 'events.create': {
      const { data } = await supabaseFetch('POST', 'events', params);
      return data?.[0];
    }
    case 'events.update': {
      const { id, ...fields } = params;
      await supabaseFetch('PATCH', `events?id=eq.${encodeURIComponent(id)}`, fields);
      return { id };
    }
    case 'events.delete': {
      await supabaseFetch('DELETE', `events?id=eq.${encodeURIComponent(params.id)}`);
      return { id: params.id };
    }

    // ── Visits ────────────────────────────────────────────────────────
    case 'visits.list': {
      const { data } = await supabaseFetch('GET', `site_visits?client_id=eq.${encodeURIComponent(params.clientId)}&order=visit_date.desc`, null);
      return { data: data ?? [] };
    }
    case 'visits.add': {
      const { data } = await supabaseFetch('POST', 'site_visits', params);
      return data?.[0];
    }
    case 'visits.updateStatus': {
      await supabaseFetch('PATCH', `site_visits?id=eq.${encodeURIComponent(params.id)}`, { status: params.status });
      return { id: params.id };
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
