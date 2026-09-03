import { createClient } from '@supabase/supabase-js';

const REQ_URL = process.env.VITE_SUPABASE_REQ_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const REQ_KEY = process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? '';
const CLI_URL = process.env.VITE_SUPABASE_CLI_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const CLI_KEY = process.env.VITE_SUPABASE_CLI_SERVICE_KEY ?? '';
const CLI_ANON = process.env.VITE_SUPABASE_CLI_ANON_KEY ?? 'sb_publishable_9E-uIJyNW0QBdhwnNCaMNw_d5jeXvkz';

const supabaseCli = CLI_KEY ? createClient(CLI_URL, CLI_KEY) : createClient(CLI_URL, CLI_ANON);
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyAou136n9rrUnlabvQl22BvdHYzuhbwsKs';
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

function isSuperAdminEmail(email) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

async function verifyFirebaseToken(token) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) },
    );
    if (!res.ok) return { authorized: false, email: '' };
    const data = await res.json();
    const email = data.users?.[0]?.email ?? '';
    const normalized = normalizeEmail(email);
    if (ADMIN_EMAILS.includes(normalized)) return { authorized: true, email: normalized, role: 'super_admin', permissions: null };
    // Check if the email belongs to an employee with access enabled
    const emp = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(normalized)}&select=id,employee_id,name,email,status,access_enabled`, null);
    const empRow = emp.data?.[0];
    if (empRow && empRow.status !== 'Terminated' && empRow.access_enabled === true) return { authorized: true, email: normalized, role: 'employee', permissions: [] };
    const { data: admins } = await supabaseFetch('GET', `admin_users?email=eq.${encodeURIComponent(normalized)}&select=id,role,permissions`, null);
    if (admins?.length > 0) return { authorized: true, email: normalized, role: admins[0].role, permissions: admins[0].permissions };
    return { authorized: false, email };
  } catch { return { authorized: false, email: '' }; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function supabaseFetch(method, path, body, baseUrl = REQ_URL, apiKey = REQ_KEY) {
  const opts = { method, headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'apikey': apiKey } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${baseUrl}/rest/v1/${path}`, opts).then(async res => {
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = null; } }
    if (!res.ok) throw new Error(data?.message || `Supabase error: ${res.status}`);
    const count = res.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
    return { data, count: count ? parseInt(count) : null };
  });
}

function employeeFetch(method, path, body) {
  // Use service-role key so RLS-locked tables (employees, employee_attendance, etc.) are accessible
  return supabaseFetch(method, path, body, CLI_URL, CLI_KEY || CLI_ANON);
}

function supabaseRpc(fn, args) {
  return fetch(`${REQ_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REQ_KEY}`, 'Content-Type': 'application/json', 'apikey': REQ_KEY },
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

async function executeAction(action, params) {
  switch (action) {
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
      const sortCol = sortBy === 'leadId' ? 'lead_id' : sortBy === 'leadSource' ? 'lead_source' : sortBy === 'createdAt' ? 'created_at' : 'created_at';
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
      const enriched = rows.map(r => ({
        ...r,
        assignedAgent: r.assigned_agent && agentMap[r.assigned_agent] ? { _id: r.assigned_agent, name: agentMap[r.assigned_agent].name, email: agentMap[r.assigned_agent].email } : null
      }));
      const total = count ?? rows.length;
      return { data: enriched, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    case 'get': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id } = params;
      const lead = await supabaseFetch('GET', `leads?id=eq.${id}&select=*`, null);
      const row = lead.data?.[0];
      if (!row) throw new Error('Lead not found');
      const [fu, sv, al] = await Promise.all([
        supabaseFetch('GET', `follow_ups?lead_id=eq.${id}&order=scheduled_at.desc`, null),
        supabaseFetch('GET', `site_visits?lead_id=eq.${id}&order=visited_at.desc`, null),
        supabaseFetch('GET', `activity_logs?lead_id=eq.${id}&order=created_at.desc`, null),
      ]);
      let agent = null;
      if (row.assigned_agent) {
        const ag = await supabaseFetch('GET', `agents?id=eq.${row.assigned_agent}&select=id,name,email`, null);
        agent = ag.data?.[0] ?? null;
      }
      return { data: row, followUps: fu.data ?? [], siteVisits: sv.data ?? [], activityHistory: al.data ?? [], assignedAgent: agent };
    }
    case 'update': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, performedBy, ...fields } = params;
      const updates = { updated_at: new Date().toISOString() };
      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.phone !== undefined) updates.phone = fields.phone;
      if (fields.email !== undefined) updates.email = fields.email;
      if (fields.leadSource !== undefined) updates.lead_source = fields.leadSource;
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.priority !== undefined) updates.priority = fields.priority;
      if (fields.requirement !== undefined) updates.requirement = fields.requirement;
      await supabaseFetch('PATCH', `leads?id=eq.${id}`, updates);
      if (performedBy) await supabaseFetch('POST', 'activity_logs', { lead_id: id, action: 'lead_updated', description: 'Lead updated', performed_by: performedBy });
      return { id };
    }
    case 'remove': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, performedBy } = params;
      await supabaseFetch('PATCH', `leads?id=eq.${id}`, { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (performedBy) await supabaseFetch('POST', 'activity_logs', { lead_id: id, action: 'lead_deleted', description: 'Lead deleted', performed_by: performedBy });
      return { message: 'Lead deleted' };
    }
    case 'updateStatus': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, status, performedBy } = params;
      await supabaseFetch('PATCH', `leads?id=eq.${id}`, { status, updated_at: new Date().toISOString() });
      if (performedBy) await supabaseFetch('POST', 'activity_logs', { lead_id: id, action: 'status_changed', description: `Status changed to ${status}`, performed_by: performedBy });
      return { id };
    }
    case 'assignAgent': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, agentId, performedBy } = params;
      await supabaseFetch('PATCH', `leads?id=eq.${id}`, { assigned_agent: agentId, updated_at: new Date().toISOString() });
      if (performedBy) await supabaseFetch('POST', 'activity_logs', { lead_id: id, action: 'agent_assigned', description: `Agent ${agentId ? 'assigned' : 'unassigned'}`, performed_by: performedBy });
      return { id };
    }
    case 'addNote': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, text, addedBy } = params;
      const existing = await supabaseFetch('GET', `leads?id=eq.${id}&select=notes`, null);
      const notes = [...(existing.data?.[0]?.notes ?? []), { text: text ?? '', addedBy: addedBy ?? '', createdAt: new Date().toISOString() }];
      await supabaseFetch('PATCH', `leads?id=eq.${id}`, { notes, updated_at: new Date().toISOString() });
      if (addedBy) await supabaseFetch('POST', 'activity_logs', { lead_id: id, action: 'note_added', description: 'Note added', performed_by: addedBy });
      return { data: notes };
    }
    case 'getActivities': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id } = params;
      const { data } = await supabaseFetch('GET', `activity_logs?lead_id=eq.${id}&order=created_at.desc`, null);
      return { data: data ?? [] };
    }
    case 'getSources': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { data } = await supabaseFetch('GET', "leads?select=lead_source&lead_source=not.is.null", null);
      const sources = [...new Set((data ?? []).map(r => r.lead_source).filter(Boolean))];
      return { data: sources };
    }
    case 'agents.list': {
      if (!hasPerm(params._auth, 'agents.view') && !hasPerm(params._auth, 'agents.edit') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      let agents = [];
      try { const { data } = await supabaseFetch('GET', 'agents?select=*', null); agents = data ?? []; } catch {}
      return { data: agents };
    }
    case 'agents.create': {
      if (!hasPerm(params._auth, 'agents.edit')) throw new Error('Forbidden');
      const { name, email, phone } = params;
      await supabaseFetch('POST', 'agents', { name, email: email ?? '', phone: phone ?? '' });
      const { data } = await supabaseFetch('GET', `agents?name=eq.${encodeURIComponent(name)}&order=created_at.desc&limit=1`, null);
      return { data: data?.[0] ?? { id: null, name, email, phone } };
    }
    case 'agents.update': {
      if (!hasPerm(params._auth, 'agents.edit')) throw new Error('Forbidden');
      const { id, ...fields } = params;
      const updates = {};
      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.email !== undefined) updates.email = fields.email;
      if (fields.phone !== undefined) updates.phone = fields.phone;
      if (fields.active !== undefined) updates.active = fields.active;
      await supabaseFetch('PATCH', `agents?id=eq.${id}`, updates);
      const { data } = await supabaseFetch('GET', `agents?id=eq.${id}&select=*`, null);
      return { data: data?.[0] ?? null };
    }
    case 'agents.delete': {
      if (!hasPerm(params._auth, 'agents.edit')) throw new Error('Forbidden');
      const { id } = params;
      await supabaseFetch('PATCH', `leads?assigned_agent=eq.${encodeURIComponent(id)}`, { assigned_agent: null, updated_at: new Date().toISOString() });
      await supabaseFetch('DELETE', `agents?id=eq.${id}`, null);
      return { message: 'Agent deleted' };
    }
    case 'employees.list': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { search, department, status, designation, sortBy, sortOrder } = params;
      let path = 'employees?select=*';
      const filters = [];
      if (search) filters.push(`or=(name.ilike.%25${encodeURIComponent(search)}%25,email.ilike.%25${encodeURIComponent(search)}%25,employee_id.ilike.%25${encodeURIComponent(search)}%25)`);
      if (department) filters.push(`department=eq.${encodeURIComponent(department)}`);
      if (status) filters.push(`status=eq.${encodeURIComponent(status)}`);
      if (designation) filters.push(`designation=eq.${encodeURIComponent(designation)}`);
      const col = sortBy === 'joiningDate' ? 'joining_date' : sortBy === 'employeeId' ? 'employee_id' : 'created_at';
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      filters.push(`order=${col}.${order}`);
      const { data } = await employeeFetch('GET', path + '&' + filters.join('&'), null);
      const all = data ?? [];
      const stats = {
        total: all.length,
        active: all.filter((e) => e.status === 'Active').length,
        onLeave: all.filter((e) => e.status === 'On Leave' || e.status === 'Leave').length,
        newThisMonth: all.filter((e) => {
          if (!e.joining_date) return false;
          const d = new Date(e.joining_date);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
      };
      return { data: all, stats };
    }
    case 'employees.get': {
      const { id } = params;
      const { data } = await employeeFetch('GET', `employees?id=eq.${encodeURIComponent(id)}&select=*`, null);
      return { data: data?.[0] ?? null };
    }
    case 'employees.create': {
      const { _auth, ...fields } = params;
      const payload = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== '') payload[k === 'employeeId' ? 'employee_id' : k] = v;
      }
      await employeeFetch('POST', 'employees', payload);
      const { data } = await employeeFetch('GET', `employees?employee_id=eq.${encodeURIComponent(payload.employee_id || '')}&order=created_at.desc&limit=1`, null);
      return { data: data?.[0] ?? null };
    }
    case 'employees.update': {
      const { id, _auth, ...fields } = params;
      const updates = { updated_at: new Date().toISOString() };
      const MAP = { employeeId: 'employee_id', joiningDate: 'joining_date', emergencyContactName: 'emergency_contact_name', emergencyContactPhone: 'emergency_contact_phone', bankAccountNumber: 'bank_account_number', bankName: 'bank_name', ifscCode: 'ifsc_code', panNumber: 'pan_number', aadharNumber: 'aadhar_number', uanNumber: 'uan_number', esiNumber: 'esi_number', profilePhotoUrl: 'profile_photo_url' };
      for (const [k, v] of Object.entries(fields)) {
        if (v === undefined) continue;
        const col = MAP[k] ?? k;
        updates[col] = v;
      }
      await employeeFetch('PATCH', `employees?id=eq.${encodeURIComponent(id)}`, updates);
      const { data } = await employeeFetch('GET', `employees?id=eq.${encodeURIComponent(id)}&select=*`, null);
      return { data: data?.[0] ?? null };
    }
    case 'employees.delete': {
      const { id } = params;
      await employeeFetch('DELETE', `employees?id=eq.${encodeURIComponent(id)}`, null);
      return { message: 'Employee deleted' };
    }
    case 'employees.maxEmployeeId': {
      const { data } = await employeeFetch('GET', 'employees?select=employee_id&order=employee_id.desc&limit=1', null);
      return { data: data?.[0]?.employee_id ?? null };
    }
    case 'employees.history': {
      const { employeeId } = params;
      const { data } = await employeeFetch('GET', `employee_history?employee_id=eq.${encodeURIComponent(employeeId)}&order=event_date.desc`, null);
      return { data: data ?? [] };
    }
    case 'employees.addHistory': {
      const { employeeId, eventType, title, description, eventDate } = params;
      await employeeFetch('POST', 'employee_history', { employee_id: employeeId, event_type: eventType, title, description, event_date: eventDate, created_by: params._auth.email });
      return { message: 'History added' };
    }
    case 'employees.attendance': {
      const { employeeId, month, year } = params;
      const { data } = await employeeFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(employeeId)}`, null);
      return { data: data ?? [] };
    }
    case 'employees.setAttendance': {
      const { employeeId, date, checkIn, checkOut, status, notes } = params;
      const existing = await employeeFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(employeeId)}&date=eq.${encodeURIComponent(date)}&select=id`, null);
      const body = { employee_id: employeeId, date, check_in: checkIn, check_out: checkOut, status, notes: notes ?? '' };
      if (existing.data?.length) {
        await employeeFetch('PATCH', `employee_attendance?id=eq.${encodeURIComponent(existing.data[0].id)}`, body);
      } else {
        await employeeFetch('POST', 'employee_attendance', body);
      }
      return { message: 'Attendance saved' };
    }
    case 'employees.leaves': {
      const { employeeId } = params;
      const { data } = await employeeFetch('GET', `employee_leaves?employee_id=eq.${encodeURIComponent(employeeId)}&order=start_date.desc`, null);
      return { data: data ?? [] };
    }
    case 'employees.applyLeave': {
      const { employeeId, leaveType, startDate, endDate, reason } = params;
      await employeeFetch('POST', 'employee_leaves', { employee_id: employeeId, leave_type: leaveType, start_date: startDate, end_date: endDate, reason: reason ?? '', status: 'Pending' });
      return { message: 'Leave applied' };
    }
    case 'employees.approveLeave': {
      const { id } = params;
      await employeeFetch('PATCH', `employee_leaves?id=eq.${encodeURIComponent(id)}`, { status: 'Approved' });
      return { message: 'Leave approved' };
    }
    case 'employees.rejectLeave': {
      const { id } = params;
      await employeeFetch('PATCH', `employee_leaves?id=eq.${encodeURIComponent(id)}`, { status: 'Rejected' });
      return { message: 'Leave rejected' };
    }
    case 'employees.payroll': {
      const { employeeId } = params;
      const { data } = await employeeFetch('GET', `employee_payroll?employee_id=eq.${encodeURIComponent(employeeId)}&order=month.desc`, null);
      return { data: data ?? [] };
    }
    case 'employees.generatePayroll': {
      const { employeeId, month, year } = params;
      const emp = await employeeFetch('GET', `employees?id=eq.${encodeURIComponent(employeeId)}&select=name,salary,employee_id`, null);
      const e = emp.data?.[0] ?? {};
      await employeeFetch('POST', 'employee_payroll', { employee_id: employeeId, month, year, gross_salary: e.salary ?? 0, status: 'Pending' });
      return { message: 'Payroll generated' };
    }
    case 'employees.markPaid': {
      const { id, paymentDate } = params;
      await employeeFetch('PATCH', `employee_payroll?id=eq.${encodeURIComponent(id)}`, { status: 'Paid', payment_date: paymentDate ?? new Date().toISOString() });
      return { message: 'Payroll marked paid' };
    }
    case 'followUps.list': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { leadId } = params;
      let path = 'follow_ups?order=scheduled_at.desc';
      if (leadId) path += `&lead_id=eq.${leadId}`;
      const { data } = await supabaseFetch('GET', path, null);
      return { data: data ?? [] };
    }
    case 'followUps.create': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { leadId, scheduledAt, note, createdBy } = params;
      await supabaseFetch('POST', 'follow_ups', { lead_id: leadId, scheduled_at: scheduledAt, note: note ?? '', created_by: createdBy ?? '' });
      const { data } = await supabaseFetch('GET', `follow_ups?lead_id=eq.${leadId}&order=scheduled_at.desc&limit=1`, null);
      if (createdBy) await supabaseFetch('POST', 'activity_logs', { lead_id: leadId, action: 'followup_scheduled', description: 'Follow-up scheduled', performed_by: createdBy });
      return { data: data?.[0] ?? null };
    }
    case 'followUps.update': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, status } = params;
      await supabaseFetch('PATCH', `follow_ups?id=eq.${id}`, { status });
      const { data } = await supabaseFetch('GET', `follow_ups?id=eq.${id}&select=*`, null);
      return { data: data?.[0] ?? null };
    }
    case 'siteVisits.list': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { leadId } = params;
      let path = 'site_visits?order=visited_at.desc';
      if (leadId) path += `&lead_id=eq.${leadId}`;
      const { data } = await supabaseFetch('GET', path, null);
      return { data: data ?? [] };
    }
    case 'siteVisits.create': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { leadId, visitedAt, location, note, outcome, createdBy } = params;
      await supabaseFetch('POST', 'site_visits', { lead_id: leadId, visited_at: visitedAt, location: location ?? '', note: note ?? '', outcome: outcome ?? '', created_by: createdBy ?? '' });
      const { data } = await supabaseFetch('GET', `site_visits?lead_id=eq.${leadId}&order=visited_at.desc&limit=1`, null);
      if (createdBy) await supabaseFetch('POST', 'activity_logs', { lead_id: leadId, action: 'site_visit_scheduled', description: `Site visit ${location ? 'at ' + location : 'scheduled'}`, performed_by: createdBy });
      return { data: data?.[0] ?? null };
    }
    case 'rpc': {
      const { fn, args } = params;
      const data = await supabaseRpc(fn, args ?? {});
      return { data };
    }
    case 'admin.verify': {
      const { _auth } = params;
      if (_auth.role === 'employee') {
        const emp = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(_auth.email)}&select=*`, null);
        return { data: emp.data?.[0] ?? null, email: _auth.email, role: 'employee', permissions: [] };
      }
      let dbRow = null;
      try { const r = await supabaseFetch('GET', `admin_users?email=eq.${encodeURIComponent(_auth.email)}&select=id,email,display_name,role,permissions,created_at`, null); dbRow = r.data?.[0] ?? null; } catch {}
      return { data: dbRow, email: _auth.email, role: _auth.role ?? null, permissions: _auth.permissions ?? null };
    }
    case 'admin.list': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      let rows = [];
      if (params._auth.role === 'super_admin') {
        try {
          const { data } = await supabaseFetch('GET', 'admin_users?select=id,email,display_name,role,permissions,created_at', null);
          rows = (data ?? []).filter((a) => a?.email);
        } catch (e) {
          console.error('[dev-proxy] admin.list: failed to load admin_users (is VITE_SUPABASE_REQ_SERVICE_KEY set?)', e);
        }
      }
      const superRows = buildSuperAdminRows().filter((r) => !rows.some((db) => db.email === r.email));
      return { data: [...superRows, ...rows] };
    }
    case 'admin.add': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const email = normalizeEmail(params.email ?? '');
      if (!email) throw new Error('Email is required');
      if (isSuperAdminEmail(email)) throw new Error('Cannot modify super admin accounts');
      const displayName = params.displayName ?? '';
      const permissions = scopePermissions(params._auth, params.permissions);
      const existing = await supabaseFetch('GET', `admin_users?email=eq.${encodeURIComponent(email)}&select=id`, null);
      if (existing.data?.length) {
        await supabaseFetch('PATCH', `admin_users?email=eq.${encodeURIComponent(email)}`, { display_name: displayName, permissions, role: 'admin' });
      } else {
        await supabaseFetch('POST', 'admin_users', { email, display_name: displayName, permissions, role: 'admin' });
      }
      return { message: 'Admin added' };
    }
    case 'admin.remove': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const email = normalizeEmail(params.email ?? '');
      if (!email) throw new Error('Email is required');
      if (isSuperAdminEmail(email)) throw new Error('Cannot remove super admin accounts');
      await supabaseFetch('DELETE', `admin_users?email=eq.${encodeURIComponent(email)}`, null);
      return { message: 'Admin removed' };
    }
    case 'admin.update': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const email = normalizeEmail(params.email ?? '');
      if (!email) throw new Error('Email is required');
      if (isSuperAdminEmail(email)) throw new Error('Cannot modify super admin accounts');
      const { displayName, permissions } = params;
      const updates = {};
      if (displayName !== undefined) updates.display_name = displayName;
      if (permissions !== undefined) updates.permissions = scopePermissions(params._auth, permissions);
      await supabaseFetch('PATCH', `admin_users?email=eq.${encodeURIComponent(email)}`, updates);
      const { data } = await supabaseFetch('GET', `admin_users?email=eq.${encodeURIComponent(email)}&select=id,email,display_name,role,permissions,created_at`, null);
      return { data: data?.[0] ?? null };
    }
    case 'admin.updateAvatar': {
      const email = normalizeEmail(params.email ?? '');
      if (params._auth.email !== email) throw new Error('Forbidden');
      const { avatarUrl } = params;
      const existing = await supabaseFetch('GET', `admin_users?email=eq.${encodeURIComponent(email)}&select=id`, null);
      if (existing.data?.length) {
        await supabaseFetch('PATCH', `admin_users?email=eq.${encodeURIComponent(email)}`, { avatar_url: avatarUrl ?? '' });
      } else if (isSuperAdminEmail(email)) {
        await supabaseFetch('POST', 'admin_users', {
          email,
          display_name: SUPER_ADMIN_DISPLAY_NAMES[email] ?? '',
          role: 'admin',
          permissions: [],
          avatar_url: avatarUrl ?? '',
        });
      } else {
        throw new Error('Admin not found');
      }
      return { message: 'Avatar updated' };
    }
    case 'crmClients.list': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { data } = await supabaseFetch('GET', 'crm_clients?select=*&order=sno.desc', null, CLI_URL, CLI_ANON);
      return { data: data ?? [] };
    }
    case 'crmClients.upsert': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const client = params.data ?? params;
      const CLI_COLS = ['sno','name','phone','email','type','budget','budget_val','location','closed_price','closing_timeline','requirements','status','date','notes','buyer_comm_pct','buyer_comm_val','seller_comm_pct','seller_comm_val','total_comm','comm_status','my_share','source','updated_date','paid_comm','client_role','property_link','comm_date','property_subtype'];
      const dbFields = {};
      for (const k of CLI_COLS) { if (client[k] !== undefined) dbFields[k] = client[k]; }
      const existing = await supabaseFetch('GET', `crm_clients?sno=eq.${client.sno}&select=id`, null, CLI_URL, CLI_ANON);
      if (existing.data?.length > 0) {
        await supabaseFetch('PATCH', `crm_clients?sno=eq.${client.sno}`, dbFields, CLI_URL, CLI_ANON);
      } else {
        await supabaseFetch('POST', 'crm_clients', dbFields, CLI_URL, CLI_ANON);
      }
      return { data: client };
    }
    case 'crmClients.delete': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      await supabaseFetch('DELETE', `crm_clients?sno=eq.${params.sno}`, null, CLI_URL, CLI_ANON);
      return { message: 'Deleted' };
    }
    case 'crmClients.maxSno': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { data } = await supabaseFetch('GET', 'crm_clients?select=sno&order=sno.desc&limit=1', null, CLI_URL, CLI_ANON);
      return { data: data?.[0]?.sno ?? 0 };
    }
    // ═══════════════════════════════════════════════════════════════════
    // EMPLOYEE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    case 'employees.me': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=*`, null);
      return { data: me.data?.[0] ?? null };
    }
    case 'employees.get': {
      const { id } = params;
      const emp = await employeeFetch('GET', `employees?id=eq.${encodeURIComponent(id)}&select=*`, null);
      const hist = await employeeFetch('GET', `employee_history?employee_id=eq.${encodeURIComponent(id)}&order=created_at.desc`, null);
      const att = await employeeFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(id)}&order=date.desc`, null);
      const leaves = await employeeFetch('GET', `employee_leaves?employee_id=eq.${encodeURIComponent(id)}&order=created_at.desc`, null);
      const payroll = await employeeFetch('GET', `employee_payroll?employee_id=eq.${encodeURIComponent(id)}&order=year.desc,month.desc`, null);
      return { data: emp.data?.[0] ?? null, history: hist.data ?? [], attendance: att.data ?? [], leaves: leaves.data ?? [], payroll: payroll.data ?? [] };
    }
    case 'employees.create': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { _auth, ...fields } = params;
      const payload = {};
      if (fields.employeeId) payload.employee_id = fields.employeeId;
      if (fields.name) payload.name = fields.name;
      if (fields.email) payload.email = normalizeEmail(fields.email);
      if (fields.phone) payload.phone = fields.phone;
      if (fields.designation) payload.designation = fields.designation;
      if (fields.department) payload.department = fields.department;
      if (fields.joiningDate) payload.joining_date = fields.joiningDate;
      if (fields.status) payload.status = fields.status;
      if (fields.salary) payload.salary = fields.salary;
      if (fields.accessEnabled !== undefined) payload.access_enabled = fields.accessEnabled;
      if (fields.faceVerifyRequired !== undefined) payload.face_verify_required = fields.faceVerifyRequired;
      if (fields.faceVerifyFrequency !== undefined) payload.face_verify_frequency = fields.faceVerifyFrequency;
      if (fields.payrollVisible !== undefined) payload.payroll_visible = fields.payrollVisible;
      const res = await employeeFetch('POST', 'employees', payload);
      return { data: res.data?.[0] ?? null };
    }
    case 'employees.update': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id, _auth, ...fields } = params;
      const updates = { updated_at: new Date().toISOString() };
      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.email !== undefined) updates.email = normalizeEmail(fields.email);
      if (fields.phone !== undefined) updates.phone = fields.phone;
      if (fields.designation !== undefined) updates.designation = fields.designation;
      if (fields.department !== undefined) updates.department = fields.department;
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.salary !== undefined) updates.salary = fields.salary;
      if (fields.accessEnabled !== undefined) updates.access_enabled = fields.accessEnabled;
      if (fields.faceVerifyRequired !== undefined) updates.face_verify_required = fields.faceVerifyRequired;
      if (fields.faceVerifyFrequency !== undefined) updates.face_verify_frequency = fields.faceVerifyFrequency;
      if (fields.payrollVisible !== undefined) updates.payroll_visible = fields.payrollVisible;
      if (fields.commissionRate !== undefined) updates.commission_rate = fields.commissionRate;
      if (fields.address !== undefined) updates.address = fields.address;
      await employeeFetch('PATCH', `employees?id=eq.${encodeURIComponent(id)}`, updates);
      const emp = await employeeFetch('GET', `employees?id=eq.${encodeURIComponent(id)}&select=*`, null);
      return { data: emp.data?.[0] ?? null };
    }
    case 'employees.delete': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id } = params;
      await employeeFetch('DELETE', `employee_history?employee_id=eq.${encodeURIComponent(id)}`, null);
      await employeeFetch('DELETE', `employee_attendance?employee_id=eq.${encodeURIComponent(id)}`, null);
      await employeeFetch('DELETE', `employee_leaves?employee_id=eq.${encodeURIComponent(id)}`, null);
      await employeeFetch('DELETE', `employee_payroll?employee_id=eq.${encodeURIComponent(id)}`, null);
      await employeeFetch('DELETE', `employees?id=eq.${encodeURIComponent(id)}`, null);
      return { message: 'Employee deleted' };
    }
    case 'employees.clients': {
      const empId = params.employeeId;
      if (!empId) throw new Error('employeeId is required');
      const { data: clients } = await employeeFetch('GET', `crm_clients?assigned_employee=eq.${encodeURIComponent(empId)}&select=*&order=sno.desc`, null, CLI_URL, CLI_ANON);
      return { data: { clients: clients ?? [] } };
    }
    case 'employees.assignClient': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId, sno } = params;
      await employeeFetch('PATCH', `crm_clients?sno=eq.${sno}`, { assigned_employee: employeeId }, CLI_URL, CLI_ANON);
      return { message: 'Client assigned' };
    }
    case 'employees.unassignClient': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      await employeeFetch('PATCH', `crm_clients?sno=eq.${params.sno}`, { assigned_employee: null }, CLI_URL, CLI_ANON);
      return { message: 'Client unassigned' };
    }
    case 'employees.history': {
      const { employeeId } = params;
      const { data } = await employeeFetch('GET', `employee_history?employee_id=eq.${encodeURIComponent(employeeId)}&order=created_at.desc`, null);
      return { data: data ?? [] };
    }
    case 'employees.addHistory': {
      const { employeeId, eventType, title, description, eventDate } = params;
      const res = await employeeFetch('POST', 'employee_history', { employee_id: employeeId, event_type: eventType, title, description, event_date: eventDate });
      return { data: res.data?.[0] ?? null };
    }
    case 'employees.attendance': {
      const { employeeId, month, year } = params;
      const pad = (n) => String(n).padStart(2, '0');
      const start = `${year}-${pad(month)}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const end = `${endYear}-${pad(endMonth)}-01`;
      const { data } = await employeeFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(employeeId)}&date=gte.${start}&date=lt.${end}&order=date.asc`, null);
      return { data: data ?? [] };
    }
    case 'employees.sessionStats': {
      const empId = params.employeeId;
      if (!empId) return { data: null };
      const emp = await employeeFetch('GET', `employees?id=eq.${encodeURIComponent(empId)}&select=work_start_time,auto_logout_time,login_count,last_login`, null);
      return { data: emp.data?.[0] ?? null };
    }
    case 'employees.logins': {
      return { data: [] };
    }
    case 'employees.faceVerifications': {
      return { data: [], lastFaceVerifiedAt: null };
    }
    case 'employees.pendingFaceVerify': {
      return { data: null };
    }
    case 'employees.requestFaceVerify': {
      return { data: { id: params.employeeId, employee: 'employee' } };
    }
    case 'employees.saveNotes': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
      if (!me.data?.[0]) throw new Error('Employee not found');
      await employeeFetch('PATCH', `employees?id=eq.${encodeURIComponent(me.data[0].id)}`, { notes: params.notes ?? '' });
      return { message: 'Notes saved' };
    }
    case 'employees.uploadPhoto': {
      return { data: { profilePhotoUrl: params.base64 ?? '' } };
    }
    case 'employees.faceVerify': {
      return { data: { verified: true } };
    }
    case 'employees.leaves': {
      return { data: [] };
    }
    case 'employees.applyLeave': {
      return { data: {} };
    }
    case 'employees.approveLeave': {
      return { message: 'Approved' };
    }
    case 'employees.rejectLeave': {
      return { message: 'Rejected' };
    }
    case 'employees.payroll': {
      return { data: [] };
    }
    case 'employees.generatePayroll': {
      return { data: {} };
    }
    case 'employees.markPaid': {
      return { message: 'Marked paid' };
    }
    case 'employees.maxEmployeeId': {
      return { data: null };
    }
    case 'employees.setAttendance': {
      return { message: 'Done' };
    }
    case 'employees.startSession': {
      return { data: { id: 'dev-session' } };
    }
    case 'employees.heartbeat': {
      return { message: 'OK' };
    }
    case 'employees.endSession': {
      return { message: 'Session ended' };
    }
    case 'employees.updateClientDetail': {
      const { sno, requirements, notes } = params;
      const updates = {};
      if (requirements !== undefined) updates.requirements = requirements;
      if (notes !== undefined) updates.notes = notes;
      await employeeFetch('PATCH', `crm_clients?sno=eq.${sno}`, updates, CLI_URL, CLI_ANON);
      return { message: 'Client details updated' };
    }
    // ═══════════════════════════════════════════════════════════════════
    // JIBBLE-STYLE ATTENDANCE & TIME TRACKING
    // ═══════════════════════════════════════════════════════════════════
    case 'attendance.clockIn': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { latitude, longitude, locationLabel, selfieUrl, geofenceId } = params;
      const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
      if (!me.data?.[0]) throw new Error('Employee not found');
      const empId = me.data[0].id;
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().slice(0, 8);
      const existing = await employeeFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(empId)}&date=eq.${dateStr}&select=id,check_in,check_out`, null);
      if (existing.data?.[0]?.check_in && !existing.data?.[0]?.check_out) throw new Error('Already clocked in — clock out first');
      const payload = { employee_id: empId, date: dateStr, check_in: timeStr, status: 'Present', notes: existing.data?.[0]?.check_out ? 'Clock-in (afternoon)' : 'Clock-in', source: 'clock_in', check_in_lat: latitude ?? null, check_in_lng: longitude ?? null, check_in_location: locationLabel ?? '', check_in_selfie_url: selfieUrl ?? '' };
      const res = await employeeInsertRetry('employee_attendance', payload);
      return { data: res.data?.[0] ?? null };
    }
    case 'attendance.clockOut': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { latitude, longitude, locationLabel, selfieUrl } = params;
      const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id,daily_work_hours,overtime_enabled`, null);
      if (!me.data?.[0]) throw new Error('Employee not found');
      const empId = me.data[0].id;
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().slice(0, 8);
      const existing = await employeeFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(empId)}&date=eq.${dateStr}&check_out=is.null&select=id,check_in`, null);
      if (!existing.data?.[0]?.check_in) throw new Error('Not clocked in today');
      const breaks = await employeeFetch('GET', `employee_breaks?employee_id=eq.${encodeURIComponent(empId)}&attendance_date=eq.${dateStr}&select=duration_seconds`, null);
      const totalBreakMin = Math.round((breaks.data ?? []).reduce((s, b) => s + (b.duration_seconds ?? 0), 0) / 60);
      const emp = me.data[0];
      const dailyHours = Number(emp.daily_work_hours ?? 8);
      const otEnabled = emp.overtime_enabled ?? false;
      const [ciH, ciM] = String(existing.data[0].check_in).split(':').map(Number);
      const [coH, coM] = timeStr.split(':').map(Number);
      const workedMinutes = Math.max(0, (coH * 60 + coM) - (ciH * 60 + ciM) - totalBreakMin);
      const otMinutes = otEnabled && workedMinutes > dailyHours * 60 ? workedMinutes - dailyHours * 60 : 0;
      await employeeFetch('PATCH', `employee_attendance?id=eq.${encodeURIComponent(existing.data[0].id)}`, { check_out: timeStr, check_out_lat: latitude ?? null, check_out_lng: longitude ?? null, check_out_location: locationLabel ?? '', check_out_selfie_url: selfieUrl ?? '', total_break_minutes: totalBreakMin, overtime_minutes: otMinutes, notes: 'Clock-out' });
      return { message: 'Clocked out', workedMinutes, overtimeMinutes: otMinutes };
    }
    case 'attendance.startBreak': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { reason } = params;
      const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
      if (!me.data?.[0]) throw new Error('Employee not found');
      const empId = me.data[0].id;
      const dateStr = new Date().toISOString().split('T')[0];
      const active = await employeeFetch('GET', `employee_breaks?employee_id=eq.${encodeURIComponent(empId)}&attendance_date=eq.${dateStr}&break_end=is.null&select=id`, null);
      if (active.data?.[0]) throw new Error('Already on break');
      const res = await employeeFetch('POST', 'employee_breaks', { employee_id: empId, attendance_date: dateStr, reason: reason ?? '' });
      return { data: res.data?.[0] ?? null };
    }
    case 'attendance.endBreak': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
      if (!me.data?.[0]) throw new Error('Employee not found');
      const empId = me.data[0].id;
      const dateStr = new Date().toISOString().split('T')[0];
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      const active = await employeeFetch('GET', `employee_breaks?employee_id=eq.${encodeURIComponent(empId)}&attendance_date=eq.${dateStr}&break_end=is.null&select=id,break_start&order=break_start.desc`, null);
      if (!active.data?.[0]) throw new Error('No active break found');
      const dur = Math.max(0, Math.round((now.getTime() - new Date(active.data[0].break_start).getTime()) / 1000));
      await employeeFetch('PATCH', `employee_breaks?id=eq.${encodeURIComponent(active.data[0].id)}`, { break_end: now.toISOString(), duration_seconds: dur });
      // Auto clock-out after break
      const att = await employeeFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(empId)}&date=eq.${dateStr}&check_out=is.null&select=id,check_in`, null);
      let autoClockOut = false;
      if (att.data?.[0]?.check_in) {
        const breaksAll = await employeeFetch('GET', `employee_breaks?employee_id=eq.${encodeURIComponent(empId)}&attendance_date=eq.${dateStr}&select=duration_seconds`, null);
        const totalBreakMin = Math.round((breaksAll.data ?? []).reduce((s, b) => s + (b.duration_seconds ?? 0), 0) / 60);
        await employeeFetch('PATCH', `employee_attendance?id=eq.${encodeURIComponent(att.data[0].id)}`, { check_out: timeStr, total_break_minutes: totalBreakMin, notes: 'Auto clock-out (break end)' });
        autoClockOut = true;
      }
      return { message: 'Break ended', durationSeconds: dur, autoClockOut };
    }
    case 'attendance.today': {
      const isEmployee = params._auth.role === 'employee';
      let empId = params.employeeId;
      if (isEmployee) {
        const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
        if (!me.data?.[0]) throw new Error('Employee not found');
        empId = me.data[0].id;
      }
      if (!empId) throw new Error('employeeId is required');
      const dateStr = new Date().toISOString().split('T')[0];
      const att = await employeeFetch('GET', `employee_attendance?employee_id=eq.${encodeURIComponent(empId)}&date=eq.${dateStr}&select=*`, null);
      const breaks = await employeeFetch('GET', `employee_breaks?employee_id=eq.${encodeURIComponent(empId)}&attendance_date=eq.${dateStr}&select=*&order=break_start.desc`, null);
      return { data: att.data?.[0] ?? null, breaks: breaks.data ?? [] };
    }
    case 'attendance.activeBreak': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const me = await employeeFetch('GET', `employees?email=eq.${encodeURIComponent(params._auth.email)}&select=id`, null);
      if (!me.data?.[0]) throw new Error('Employee not found');
      const dateStr = new Date().toISOString().split('T')[0];
      const brk = await employeeFetch('GET', `employee_breaks?employee_id=eq.${encodeURIComponent(me.data[0].id)}&attendance_date=eq.${dateStr}&break_end=is.null&select=*&order=break_start.desc`, null);
      return { data: brk.data?.[0] ?? null };
    }
    // ═══════════════════════════════════════════════════════════════════
    // EVENTS & VISITS
    // ═══════════════════════════════════════════════════════════════════
    case 'events.list': {
      const { data } = await supabaseRpc('get_events_for_employee', { p_employee_email: params._auth.email });
      return { data: data ?? [] };
    }
    case 'events.create': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const res = await employeeFetch('POST', 'events', { title: params.title, description: params.description, event_type: params.eventType, event_date: params.eventDate, image_url: params.imageUrl, created_by: params._auth.email });
      return { data: res.data?.[0] ?? null };
    }
    case 'events.update': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      await employeeFetch('PATCH', `events?id=eq.${encodeURIComponent(params.id)}`, { title: params.title, description: params.description, event_type: params.eventType, event_date: params.eventDate, image_url: params.imageUrl });
      return { message: 'Updated' };
    }
    case 'events.delete': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      await employeeFetch('DELETE', `events?id=eq.${encodeURIComponent(params.id)}`, null);
      return { message: 'Deleted' };
    }
    case 'visits.list': {
      let url = 'client_visits?select=*,crm_clients(name,phone)&order=visit_date.desc';
      if (params.employeeId) url += `&employee_id=eq.${encodeURIComponent(params.employeeId)}`;
      const { data } = await employeeFetch('GET', url, null, CLI_URL, CLI_ANON);
      return { data: data ?? [] };
    }
    case 'visits.add': {
      const res = await employeeFetch('POST', 'client_visits', { client_sno: params.clientSno, employee_id: params.employeeId ?? null, visit_date: params.visitDate, visit_time: params.visitTime, notes: params.notes }, CLI_URL, CLI_ANON);
      return { data: res.data?.[0] ?? null };
    }
    case 'visits.updateStatus': {
      await employeeFetch('PATCH', `client_visits?id=eq.${encodeURIComponent(params.id)}`, { status: params.status }, CLI_URL, CLI_ANON);
      return { message: 'Updated' };
    }
    case 'crmClients.activity': {
      return { data: [] };
    }
    case 'geofences.list': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { data } = await employeeFetch('GET', 'geofences?order=created_at.desc', null);
      return { data: data ?? [] };
    }
    case 'geofences.create': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const res = await employeeFetch('POST', 'geofences', { name: params.name, latitude: params.latitude, longitude: params.longitude, radius_meters: params.radiusMeters ?? 200 });
      return { data: res.data?.[0] ?? null };
    }
    case 'geofences.update': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const updates = {};
      if (params.name !== undefined) updates.name = params.name;
      if (params.latitude !== undefined) updates.latitude = params.latitude;
      if (params.longitude !== undefined) updates.longitude = params.longitude;
      if (params.radiusMeters !== undefined) updates.radius_meters = params.radiusMeters;
      if (params.isActive !== undefined) updates.is_active = params.isActive;
      await employeeFetch('PATCH', `geofences?id=eq.${encodeURIComponent(params.id)}`, updates);
      return { message: 'Updated' };
    }
    case 'geofences.delete': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      await employeeFetch('DELETE', `geofences?id=eq.${encodeURIComponent(params.id)}`, null);
      return { message: 'Deleted' };
    }
    case 'geofences.check': {
      const { latitude, longitude } = params;
      const { data: fences } = await employeeFetch('GET', 'geofences?is_active=eq.true&select=*', null);
      const results = (fences ?? []).map(g => {
        const R = 6371000;
        const dLat = (g.latitude - latitude) * Math.PI / 180;
        const dLng = (g.longitude - longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(latitude * Math.PI / 180) * Math.cos(g.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...g, distance_meters: Math.round(dist), is_within: dist <= g.radius_meters };
      });
      return { data: results };
    }

    // ── Storage dashboard ────────────────────────────────────────────────
    case 'storage.stats': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const quotaBytes = Number(
        process.env.VITE_SUPABASE_STORAGE_QUOTA_BYTES ?? 1024 * 1024 * 1024,
      );
      const { data: rpcData, error: rpcError } = await supabaseCli.rpc('get_storage_stats');
      if (!rpcError && rpcData) {
        return { ...(rpcData ?? {}), quotaBytes };
      }
      // Fallback: query storage via the Supabase JS client
      const BUCKETS = ['property-images', 'auction-images', 'resumes'];
      const bucketStats = [];
      let totalBytes = 0;
      let totalObjects = 0;
      const allFiles = [];
      for (const bucket of BUCKETS) {
        try {
          const { data: files } = await supabaseCli.storage.from(bucket).list('', { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });
          if (files && files.length > 0) {
            const bytes = files.reduce((sum, f) => sum + Number(f.metadata?.size ?? 0), 0);
            bucketStats.push({ bucket, objects: files.length, bytes });
            totalBytes += bytes;
            totalObjects += files.length;
            for (const f of files) allFiles.push({ bucket, name: f.name, bytes: Number(f.metadata?.size ?? 0) });
          } else {
            bucketStats.push({ bucket, objects: 0, bytes: 0 });
          }
        } catch {
          bucketStats.push({ bucket, objects: 0, bytes: 0 });
        }
      }
      const largest = allFiles.sort((a, b) => b.bytes - a.bytes).slice(0, 10);
      return { totalBytes, totalObjects, buckets: bucketStats, largest, quotaBytes };
    }

    case 'admin.databaseSummary': {
      if (!isAdmin(params._auth)) throw new Error('Forbidden');
      const tables = ['properties', 'auctions', 'leads', 'crm_clients', 'admin_users', 'employees', 'requirements', 'blog_posts', 'site_settings'];
      const counts = {};
      for (const t of tables) {
        const { count } = await supabaseCli.from(t).select('id', { count: 'exact', head: true });
        counts[t] = count ?? 0;
      }
      return { counts };
    }

    // ── Image upload ──────────────────────────────────────────────────────
    case 'image.upload': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { bucket, entityId, name, contentType, dataBase64 } = params;
      if (!['property-images', 'auction-images'].includes(bucket)) throw new Error('Invalid bucket');
      if (!entityId) throw new Error('entityId required');
      const buffer = Buffer.from(dataBase64, 'base64');
      if (buffer.length === 0) throw new Error('Empty file');
      const safeName = (name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${entityId}/${Date.now()}-${safeName}`;
      const { error } = await supabaseCli.storage.from(bucket).upload(path, buffer, { contentType, upsert: false });
      if (error) throw new Error(error.message);
      const { data: urlData } = supabaseCli.storage.from(bucket).getPublicUrl(path);
      return { url: urlData.publicUrl };
    }

    case 'image.delete': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { url } = params;
      if (!url) throw new Error('Missing url');
      try {
        const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
        if (match) await supabaseCli.storage.from(match[1]).remove([decodeURIComponent(match[2])]);
      } catch { /* ignore */ }
      return { ok: true };
    }

    // ── Resume upload ─────────────────────────────────────────────────────
    case 'resume.upload': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      const { jobId, name, contentType, dataBase64 } = params;
      const buffer = Buffer.from(dataBase64, 'base64');
      if (buffer.length === 0) throw new Error('Empty file');
      const safeName = (name || 'resume').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${jobId}/${Date.now()}_${safeName}`;
      const { error } = await supabaseCli.storage.from('resumes').upload(path, buffer, { contentType: contentType || 'application/octet-stream', upsert: false });
      if (error) throw new Error(error.message);
      const { data: urlData } = supabaseCli.storage.from('resumes').getPublicUrl(path);
      return { url: urlData.publicUrl, fileName: name };
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

        const authHeader = req.headers['authorization'] ?? '';
        const token = authHeader.replace('Bearer ', '');
        if (!token) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Missing authorization' })); return; }

        const auth = await verifyFirebaseToken(token);
        if (!auth.authorized) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }

        let body;
        try { body = await readBody(req); } catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Invalid JSON' })); return; }

        const { action, params = {} } = body;
        if (!action) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Missing action' })); return; }

        try {
          const result = await executeAction(action, { ...params, _auth: auth });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (e) {
          console.error('CRM proxy error:', e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message ?? 'Internal error' }));
        }
      });
    },
  };
}
