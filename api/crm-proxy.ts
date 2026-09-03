import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co',
  process.env.SUPABASE_REQ_SERVICE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? '',
);

// Service-role reads/writes for the CRM project.
const supabaseCli = createClient(
  process.env.SUPABASE_CLI_URL ?? process.env.VITE_SUPABASE_CLI_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co',
  process.env.SUPABASE_CLI_SERVICE_KEY ?? process.env.VITE_SUPABASE_CLI_SERVICE_KEY ?? '',
);

// Service-role client for privileged writes.
const supabaseCliAdmin = createClient(
  process.env.SUPABASE_CLI_URL ?? process.env.VITE_SUPABASE_CLI_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co',
  process.env.SUPABASE_CLI_SERVICE_KEY ?? process.env.VITE_SUPABASE_CLI_SERVICE_KEY ?? '',
);

const ADMIN_EMAILS = ['vijaykodamasuru2023@gmail.com', 'vijay@vjrestate.in', 'vijayramv229@gmail.com'];
const SUPER_ADMIN_DISPLAY_NAMES: Record<string, string> = {
  'vijayramv229@gmail.com': 'Vijay Ram',
  'vijaykodamasuru2023@gmail.com': 'Vijay Kodamasuru',
  'vijay@vjrestate.in': 'Vijay Ram',
};
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY ?? '';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function decodeBase64(data: string): Buffer {
  const base64 = (data ?? '').replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

/** 'HH:MM' → 'HH:MM:00' for TIME columns (Supabase rejects bare HH:MM). */
function normalizeTime(val: string | undefined | null): string | null {
  if (!val) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(val.trim());
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}:00`;
  return val.trim() || null;
}

function isSuperAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

interface AuthResult { authorized: boolean; email: string; uid: string; role?: string; permissions?: string[] | null }

async function verifyToken(token: string): Promise<AuthResult> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) },
    );
    if (!res.ok) return { authorized: false, email: '', uid: '' } satisfies AuthResult;
    const data: any = await res.json();
    const email: string = data.users?.[0]?.email ?? '';
    const uid: string = data.users?.[0]?.localId ?? '';
    const normalized = normalizeEmail(email);
    if (ADMIN_EMAILS.includes(normalized)) return { authorized: true, email: normalized, uid, role: 'super_admin', permissions: null } satisfies AuthResult;
    // Employees log in with the work email stored on their employee record —
    // only when the admin has enabled login access for them (access_enabled).
    // Checked BEFORE admin_users so an explicitly-enabled employee always lands
    // on the employee workspace even when the same email is also an admin
    // account (common while testing the portal). Unticking the box restores
    // the admin role for that email.
    const { data: emp } = await supabaseCli.from('employees').select('id,employee_id,name,email,status,access_enabled').eq('email', normalized).maybeSingle();
    if (emp && emp.status !== 'Terminated' && emp.access_enabled === true) return { authorized: true, email: normalized, uid, role: 'employee', permissions: [] } satisfies AuthResult;
    const { data: admins, error } = await supabaseAdmin.from('admin_users').select('id,role,permissions').eq('email', normalized);
    if (!error && admins?.length > 0) return { authorized: true, email: normalized, uid, role: admins[0].role, permissions: admins[0].permissions } satisfies AuthResult;
    return { authorized: false, email, uid } satisfies AuthResult;
  } catch {
    return { authorized: false, email: '', uid: '' } satisfies AuthResult;
  }
}

/**
 * If PostgREST says a column is missing, auto-create it so the write succeeds.
 * This avoids silent data loss when migrations haven't been applied yet.
 */
const COLUMN_DEFAULTS: Record<string, Record<string, string>> = {
  employees: {
    face_verify_required: 'BOOLEAN NOT NULL DEFAULT FALSE',
    face_verify_frequency: "TEXT NOT NULL DEFAULT 'daily'",
    payroll_visible: 'BOOLEAN NOT NULL DEFAULT TRUE',
    access_enabled: 'BOOLEAN NOT NULL DEFAULT FALSE',
    commission_rate: 'NUMERIC DEFAULT 0',
    work_start_time: "TIME DEFAULT '09:30'",
    auto_logout_time: "TIME DEFAULT '21:00'",
    login_count: 'INTEGER NOT NULL DEFAULT 0',
    last_login: 'TIMESTAMPTZ',
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

async function ensureColumns(table: string, cols: string[]): Promise<void> {
  const defs = COLUMN_DEFAULTS[table];
  if (!defs) return;
  for (const col of cols) {
    const typeDef = defs[col];
    if (!typeDef) continue;
    console.warn(`[crm-proxy] auto-creating column '${col}' on '${table}'`);
    const sql = `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${col} ${typeDef};`;
    // Try the exec_sql RPC first (site-data project), fall back to direct fetch
    await fetch(`${process.env.SUPABASE_REQ_URL ?? process.env.VITE_SUPABASE_REQ_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_REQ_SERVICE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY}`, 'apikey': process.env.SUPABASE_REQ_SERVICE_KEY ?? process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? '' },
      body: JSON.stringify({ q: sql }),
    }).catch(() => {
      // If exec_sql RPC doesn't exist, ignore — column may already exist
    });
  }
}

async function insertOrRetry(supabase: any, table: string, payload: Record<string, unknown>): Promise<any> {
  let result = await supabase.from(table).insert(payload).select().single();
  while (result.error) {
    const m = /Could not find the '(\w+)' column/.exec(result.error.message);
    if (!m) break;
    // Auto-create the missing column, then retry with it included.
    await ensureColumns(table, [m[1]]);
    result = await supabase.from(table).insert(payload).select().single();
  }
  return result;
}

async function updateOrRetry(supabase: any, table: string, updates: Record<string, unknown>, eqCol: string, eqVal: unknown): Promise<any> {
  let result = await supabase.from(table).update(updates).eq(eqCol, eqVal);
  while (result.error) {
    const m = /Could not find the '(\w+)' column/.exec(result.error.message);
    if (!m) break;
    // Auto-create the missing column, then retry with it included.
    await ensureColumns(table, [m[1]]);
    result = await supabase.from(table).update(updates).eq(eqCol, eqVal);
  }
  return result;
}

function hasPerm(auth: any, perm: string): boolean {
  if (!auth?.authorized) return false;
  // Employees only get employee-scoped actions (my clients, my logins, status updates
  // on assigned clients). Everything admin is explicitly denied.
  if (auth.role === 'employee') return false;
  if (auth.role === 'super_admin') return true;
  if (auth.permissions === null || auth.permissions === undefined) return true;
  return auth.permissions.length === 0 || auth.permissions.includes(perm);
}

function canManageAdmins(auth: any): boolean {
  if (!auth?.authorized) return false;
  if (auth.role === 'super_admin') return true;
  return hasPerm(auth, 'manage_admins');
}

function scopePermissions(auth: any, requested: string[] | undefined): string[] {
  const perms = requested ?? [];
  if (auth.role === 'super_admin' || auth.permissions === null || auth.permissions === undefined) return perms;
  const callerPerms = auth.permissions as string[];
  if (callerPerms.length === 0) return perms;
  return perms.filter((p) => callerPerms.includes(p));
}

function buildSuperAdminRows() {
  return [{
    id: 'super-vijayramv229@gmail.com',
    email: 'vijayramv229@gmail.com',
    display_name: `Super Admin ${SUPER_ADMIN_DISPLAY_NAMES['vijayramv229@gmail.com'] ?? 'Admin'}`,
    role: 'super_admin',
    permissions: [] as string[],
    avatar_url: '',
    created_at: '',
  }];
}

function err(res: any, status: number, msg: string) {
  return res.status(status).json({ error: msg });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return err(res, 401, 'Missing authorization token');

  const auth = await verifyToken(token);
  if (!auth.authorized) return err(res, 401, 'Unauthorized');

  const { action, params } = req.body ?? {};
  if (!action) return err(res, 400, 'Missing action');

  try {
    const result = await executeAction(action, { ...params ?? {}, _auth: auth });
    return res.status(200).json(result);
  } catch (e: any) {
    console.error(`[crm-proxy] action '${action}' failed:`, e);
    return res.status(500).json({ error: e.message ?? 'Internal error' });
  }
}

// Employee-management actions an employee must never call on themselves or others.
const EMPLOYEE_MANAGEMENT_ACTIONS = new Set([
  'employees.list', 'employees.create', 'employees.update', 'employees.delete', 'employees.maxEmployeeId',
  'employees.history', 'employees.addHistory', 'employees.attendance', 'employees.setAttendance',
  'employees.leaves', 'employees.applyLeave', 'employees.approveLeave', 'employees.rejectLeave',
  'employees.generatePayroll', 'employees.markPaid', 'employees.logins',
  'attendance.liveStatus', 'attendance.weeklyReport',
  'geofences.create', 'geofences.update', 'geofences.delete',
]);

async function executeAction(action: string, params: any): Promise<any> {
  if (EMPLOYEE_MANAGEMENT_ACTIONS.has(action) && params._auth?.role === 'employee') throw new Error('Forbidden');
  switch (action) {
    // Leads
    case 'list': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { search, status, priority, source, agent, sortBy, sortOrder, page = 1, limit = 15 } = params;
      let query = supabaseAdmin.from('leads').select('*', { count: 'exact' });
      if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,lead_id.ilike.%${search}%`);
      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);
      if (source) query = query.eq('lead_source', source);
      if (agent) query = query.eq('assigned_agent', agent);
      query = query.is('deleted_at', null);
      const sortCol = sortBy === 'leadId' ? 'lead_id' : sortBy === 'leadSource' ? 'lead_source' : sortBy === 'createdAt' ? 'created_at' : 'created_at';
      const order = sortOrder === 'asc' ? { ascending: true } as const : { ascending: false } as const;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await query.order(sortCol, order).range(from, to);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      const agentIds: string[] = [...new Set(rows.map(r => r.assigned_agent).filter(Boolean))];
      const agentMap: Record<string, any> = {};
      if (agentIds.length > 0) {
        const { data: agents } = await supabaseAdmin.from('agents').select('id,name,email').in('id', agentIds);
        if (agents) agents.forEach(a => { agentMap[a.id] = a; });
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
      const { data: row, error } = await supabaseAdmin.from('leads').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      const [fuRes, svRes, alRes, agRes] = await Promise.all([
        supabaseAdmin.from('follow_ups').select('*').eq('lead_id', id).order('scheduled_at', { ascending: false }),
        supabaseAdmin.from('site_visits').select('*').eq('lead_id', id).order('visited_at', { ascending: false }),
        supabaseAdmin.from('activity_logs').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
        row.assigned_agent ? supabaseAdmin.from('agents').select('id,name,email').eq('id', row.assigned_agent).single() : Promise.resolve({ data: null }),
      ]);
      return {
        data: row,
        followUps: fuRes.data ?? [],
        siteVisits: svRes.data ?? [],
        activityHistory: alRes.data ?? [],
        assignedAgent: agRes.data ?? null,
      };
    }

    case 'update': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, performedBy, ...fields } = params;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.phone !== undefined) updates.phone = fields.phone;
      if (fields.email !== undefined) updates.email = fields.email;
      if (fields.leadSource !== undefined) updates.lead_source = fields.leadSource;
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.priority !== undefined) updates.priority = fields.priority;
      if (fields.requirement !== undefined) updates.requirement = fields.requirement;
      const { error } = await supabaseAdmin.from('leads').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      if (performedBy) {
        await supabaseAdmin.from('activity_logs').insert({ lead_id: id, action: 'lead_updated', description: 'Lead updated', performed_by: performedBy });
      }
      return { id };
    }

    case 'remove': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, performedBy } = params;
      const { error } = await supabaseAdmin.from('leads').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(error.message);
      if (performedBy) {
        await supabaseAdmin.from('activity_logs').insert({ lead_id: id, action: 'lead_deleted', description: 'Lead deleted', performed_by: performedBy });
      }
      return { message: 'Lead deleted' };
    }

    case 'updateStatus': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, status, performedBy } = params;
      const { error } = await supabaseAdmin.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(error.message);
      if (performedBy) {
        await supabaseAdmin.from('activity_logs').insert({ lead_id: id, action: 'status_changed', description: `Status changed to ${status}`, performed_by: performedBy });
      }
      return { id };
    }

    case 'assignAgent': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, agentId, performedBy } = params;
      const { error } = await supabaseAdmin.from('leads').update({ assigned_agent: agentId, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(error.message);
      if (performedBy) {
        await supabaseAdmin.from('activity_logs').insert({ lead_id: id, action: 'agent_assigned', description: `Agent ${agentId ? 'assigned' : 'unassigned'}`, performed_by: performedBy });
      }
      return { id };
    }

    case 'addNote': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, text, addedBy } = params;
      const note = { text: text ?? '', addedBy: addedBy ?? '', createdAt: new Date().toISOString() };
      const { data: row, error } = await supabaseAdmin.from('leads').select('notes').eq('id', id).single();
      if (error) throw new Error(error.message);
      const notes = [...(row.notes ?? []), note];
      const { error: updateErr } = await supabaseAdmin.from('leads').update({ notes, updated_at: new Date().toISOString() }).eq('id', id);
      if (updateErr) throw new Error(updateErr.message);
      if (addedBy) {
        await supabaseAdmin.from('activity_logs').insert({ lead_id: id, action: 'note_added', description: 'Note added', performed_by: addedBy });
      }
      return { data: notes };
    }

    case 'getActivities': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id } = params;
      const { data, error } = await supabaseAdmin.from('activity_logs').select('*').eq('lead_id', id).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }

    case 'getSources': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { data, error } = await supabaseAdmin.from('leads').select('lead_source').not('lead_source', 'is', null);
      if (error) throw new Error(error.message);
      const sources = [...new Set((data ?? []).map((r: any) => r.lead_source).filter(Boolean))];
      return { data: sources };
    }

    // Agents
    case 'agents.list': {
      if (!hasPerm(params._auth, 'agents.view') && !hasPerm(params._auth, 'agents.edit') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      let agents: any[] = [];
      try { const { data } = await supabaseAdmin.from('agents').select('*'); agents = data ?? []; } catch (e) { console.warn('[crm-proxy] agents.list failed:', e); }
      return { data: agents };
    }

    case 'agents.create': {
      if (!hasPerm(params._auth, 'agents.edit')) throw new Error('Forbidden');
      const { name, email, phone } = params;
      const { data, error } = await supabaseAdmin.from('agents').insert({ name, email: email ?? '', phone: phone ?? '' }).select().single();
      if (error) throw new Error(error.message);
      return { data };
    }

    case 'agents.update': {
      if (!hasPerm(params._auth, 'agents.edit')) throw new Error('Forbidden');
      const { id, ...fields } = params;
      const updates: Record<string, unknown> = {};
      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.email !== undefined) updates.email = fields.email;
      if (fields.phone !== undefined) updates.phone = fields.phone;
      if (fields.active !== undefined) updates.active = fields.active;
      const { error } = await supabaseAdmin.from('agents').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      const { data } = await supabaseAdmin.from('agents').select('*').eq('id', id).single();
      return { data };
    }

    case 'agents.delete': {
      if (!hasPerm(params._auth, 'agents.edit')) throw new Error('Forbidden');
      const { id } = params;
      const { error: unassignError } = await supabaseAdmin.from('leads').update({ assigned_agent: null, updated_at: new Date().toISOString() }).eq('assigned_agent', id);
      if (unassignError) throw new Error(unassignError.message);
      const { error } = await supabaseAdmin.from('agents').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Agent deleted' };
    }

    // Follow Ups
    case 'followUps.list': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { leadId } = params;
      let query = supabaseAdmin.from('follow_ups').select('*');
      if (leadId) query = query.eq('lead_id', leadId);
      const { data, error } = await query.order('scheduled_at', { ascending: false });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }

    case 'followUps.create': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { leadId, scheduledAt, note, createdBy } = params;
      const { data, error } = await supabaseAdmin.from('follow_ups').insert({ lead_id: leadId, scheduled_at: scheduledAt, note: note ?? '', created_by: createdBy ?? '' }).select().single();
      if (error) throw new Error(error.message);
      if (createdBy) {
        await supabaseAdmin.from('activity_logs').insert({ lead_id: leadId, action: 'followup_scheduled', description: 'Follow-up scheduled', performed_by: createdBy });
      }
      return { data };
    }

    case 'followUps.update': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { id, status } = params;
      const { error } = await supabaseAdmin.from('follow_ups').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);
      const { data } = await supabaseAdmin.from('follow_ups').select('*').eq('id', id).single();
      return { data };
    }

    // Site Visits
    case 'siteVisits.list': {
      if (!hasPerm(params._auth, 'requirements.view') && !hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { leadId } = params;
      let query = supabaseAdmin.from('site_visits').select('*');
      if (leadId) query = query.eq('lead_id', leadId);
      const { data, error } = await query.order('visited_at', { ascending: false });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }

    case 'siteVisits.create': {
      if (!hasPerm(params._auth, 'requirements.edit')) throw new Error('Forbidden');
      const { leadId, visitedAt, location, note, outcome, createdBy } = params;
      const { data, error } = await supabaseAdmin.from('site_visits').insert({ lead_id: leadId, visited_at: visitedAt, location: location ?? '', note: note ?? '', outcome: outcome ?? '', created_by: createdBy ?? '' }).select().single();
      if (error) throw new Error(error.message);
      if (createdBy) {
        await supabaseAdmin.from('activity_logs').insert({ lead_id: leadId, action: 'site_visit_scheduled', description: `Site visit ${location ? 'at ' + location : 'scheduled'}`, performed_by: createdBy });
      }
      return { data };
    }

    // Admin management
    case 'admin.verify': {
      const { _auth } = params;
      if (_auth.role === 'employee') {
        const { data: emp } = await supabaseCli.from('employees').select('*').eq('email', _auth.email).maybeSingle();
        return { data: emp ?? null, email: _auth.email, role: 'employee', permissions: [] };
      }
      let dbRow = null;
      try { const { data } = await supabaseAdmin.from('admin_users').select('id,email,display_name,role,permissions,created_at').eq('email', _auth.email).maybeSingle(); dbRow = data ?? null; } catch (e) { console.warn('[crm-proxy] admin.verify failed:', e); }
      const role = _auth.role ?? null;
      const permissions = _auth.permissions ?? null;
      return { data: dbRow, email: _auth.email, role, permissions };
    }
    case 'admin.list': {
      if (!params._auth?.authorized || params._auth.role === 'employee') throw new Error('Forbidden');
      let rows: any[] = [];
      if (params._auth.role === 'super_admin') {
        try { const { data } = await supabaseAdmin.from('admin_users').select('id,email,display_name,role,permissions,created_at'); rows = (data ?? []).filter((a: { email: string }) => a?.email); } catch (e) { console.error('[crm-proxy] admin.list: failed to load admin_users (is SUPABASE_REQ_SERVICE_KEY set?)', e); }
      }
      const superRows = buildSuperAdminRows().filter(r => !rows.some((db: { email: string }) => db.email === r.email));
      return { data: [...superRows, ...rows] };
    }
    case 'admin.add': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const email = normalizeEmail(params.email ?? '');
      if (!email) throw new Error('Email is required');
      if (isSuperAdminEmail(email)) throw new Error('Cannot modify super admin accounts');
      const displayName = params.displayName ?? '';
      const permissions = scopePermissions(params._auth, params.permissions);
      const { data: existing } = await supabaseAdmin.from('admin_users').select('id').eq('email', email).maybeSingle();
      if (existing) {
        const { error } = await supabaseAdmin.from('admin_users').update({ display_name: displayName, permissions, role: 'admin' }).eq('email', email);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseAdmin.from('admin_users').insert({ email, display_name: displayName, permissions, role: 'admin' });
        if (error) throw new Error(error.message);
      }
      return { message: 'Admin added' };
    }
    case 'admin.remove': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const email = normalizeEmail(params.email ?? '');
      if (!email) throw new Error('Email is required');
      if (isSuperAdminEmail(email)) throw new Error('Cannot remove super admin accounts');
      const { error } = await supabaseAdmin.from('admin_users').delete().eq('email', email);
      if (error) throw new Error(error.message);
      return { message: 'Admin removed' };
    }
    case 'admin.update': {
      if (!canManageAdmins(params._auth)) throw new Error('Forbidden');
      const email = normalizeEmail(params.email ?? '');
      if (!email) throw new Error('Email is required');
      if (isSuperAdminEmail(email)) throw new Error('Cannot modify super admin accounts');
      const { displayName, permissions } = params;
      const updates: Record<string, unknown> = {};
      if (displayName !== undefined) updates.display_name = displayName;
      if (permissions !== undefined) updates.permissions = scopePermissions(params._auth, permissions);
      const { error } = await supabaseAdmin.from('admin_users').update(updates).eq('email', email);
      if (error) throw new Error(error.message);
      const { data } = await supabaseAdmin.from('admin_users').select('id,email,display_name,role,permissions,created_at').eq('email', email).single();
      return { data };
    }
    case 'admin.updateAvatar': {
      const email = normalizeEmail(params.email ?? '');
      if (params._auth.email !== email) throw new Error('Forbidden');
      const { avatarUrl } = params;
      const { data: existing } = await supabaseAdmin.from('admin_users').select('id').eq('email', email).maybeSingle();
      if (existing) {
        const { error } = await supabaseAdmin.from('admin_users').update({ avatar_url: avatarUrl ?? '' }).eq('email', email);
        if (error) throw new Error(error.message);
      } else if (isSuperAdminEmail(email)) {
        const { error } = await supabaseAdmin.from('admin_users').insert({
          email,
          display_name: SUPER_ADMIN_DISPLAY_NAMES[email] ?? '',
          role: 'admin',
          permissions: [],
          avatar_url: avatarUrl ?? '',
        });
        if (error) throw new Error(error.message);
      } else {
        throw new Error('Admin not found');
      }
      return { message: 'Avatar updated' };
    }

    // Generic RPC (for database stats page)
    case 'rpc': {
      // Database stats page — any admin may call the read-only stats RPCs, but
      // employees must never reach the site-data project's service-role RPCs.
      if (params._auth.role === 'employee') throw new Error('Forbidden');
      const { fn, args } = params;
      const { data, error } = await supabaseAdmin.rpc(fn, args ?? {});
      if (error) throw new Error(error.message);
      return { data };
    }

    // CRM Clients
    case 'crmClients.list': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { data, error } = await supabaseCli.from('crm_clients').select('*').order('sno', { ascending: false });
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      const empIds: string[] = [...new Set(rows.map((r: any) => r.assigned_employee).filter(Boolean))];
      let empMap: Record<string, any> = {};
      if (empIds.length > 0) {
        const { data: emps } = await supabaseCli.from('employees').select('id,employee_id,name').in('id', empIds);
        if (emps) emps.forEach((e: any) => { empMap[e.id] = e; });
      }
      return {
        data: rows.map((r: any) => ({
          ...r,
          assigned_employee_info: r.assigned_employee && empMap[r.assigned_employee] ? empMap[r.assigned_employee] : null,
        })),
      };
    }
    case 'crmClients.upsert': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const client = { ...(params.data ?? params) };
      delete client.assigned_employee_info; // not a DB column — assignments live in assigned_employee
      const { data: existing } = await supabaseCli.from('crm_clients').select('id').eq('sno', client.sno).maybeSingle();
      if (existing) {
        const { error } = await supabaseCli.from('crm_clients').update(client).eq('sno', client.sno);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseCli.from('crm_clients').insert(client);
        if (error) throw new Error(error.message);
      }
      return { data: client };
    }
    case 'crmClients.delete': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { error } = await supabaseCli.from('crm_clients').delete().eq('sno', params.sno);
      if (error) throw new Error(error.message);
      return { message: 'Deleted' };
    }
    case 'crmClients.maxSno': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { data } = await supabaseCli.from('crm_clients').select('sno').order('sno', { ascending: false }).limit(1);
      return { data: data?.[0]?.sno ?? 0 };
    }

    // Employees
    case 'employees.list': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { search, department, status, designation, sortBy, sortOrder } = params;
      let query = supabaseCli.from('employees').select('*', { count: 'exact' });
      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`);
      if (department) query = query.eq('department', department);
      if (status) query = query.eq('status', status);
      if (designation) query = query.eq('designation', designation);
      const col = sortBy === 'joiningDate' ? 'joining_date' : sortBy === 'employeeId' ? 'employee_id' : 'created_at';
      const order = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      const { data, error } = await query.order(col, order);
      if (error) throw new Error(error.message);
      const all = data ?? [];
      const stats = {
        total: all.length,
        active: all.filter((e: any) => e.status === 'Active').length,
        onLeave: all.filter((e: any) => e.status === 'On Leave' || e.status === 'Leave').length,
        newThisMonth: all.filter((e: any) => {
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
      if (params._auth.role === 'employee') {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        if (!me || me.id !== id) throw new Error('Forbidden');
      }
      const { data: emp, error } = await supabaseCli.from('employees').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      const [histRes, attRes, leaveRes, payrollRes] = await Promise.all([
        supabaseCli.from('employee_history').select('*').eq('employee_id', id).order('created_at', { ascending: false }),
        supabaseCli.from('employee_attendance').select('*').eq('employee_id', id).order('date', { ascending: false }).limit(31),
        supabaseCli.from('employee_leaves').select('*').eq('employee_id', id).order('created_at', { ascending: false }),
        supabaseCli.from('employee_payroll').select('*').eq('employee_id', id).order('year', { ascending: false }).order('month', { ascending: false }),
      ]);
      return { data: emp, history: histRes.data ?? [], attendance: attRes.data ?? [], leaves: leaveRes.data ?? [], payroll: payrollRes.data ?? [] };
    }
    case 'employees.create': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { _auth, ...fields } = params;
      const payload: Record<string, unknown> = {};
      if (fields.employeeId) payload.employee_id = fields.employeeId;
      if (fields.name) payload.name = fields.name;
      // Store the email lowercase so the Google sign-in lookup (which lowercases
      // the account email) always matches, regardless of how it was typed.
      if (fields.email) payload.email = normalizeEmail(fields.email);
      if (fields.phone) payload.phone = fields.phone;
      if (fields.designation) payload.designation = fields.designation;
      if (fields.department) payload.department = fields.department;
      // Date/numeric columns reject '' — coerce empty to null.
      if (fields.joiningDate !== undefined) payload.joining_date = fields.joiningDate === '' || fields.joiningDate == null ? null : fields.joiningDate;
      if (fields.status) payload.status = fields.status;
      if (fields.salary !== undefined) payload.salary = fields.salary === '' || fields.salary == null ? null : fields.salary;
      if (fields.accessEnabled !== undefined) payload.access_enabled = fields.accessEnabled;
      if (fields.faceVerifyRequired !== undefined) payload.face_verify_required = fields.faceVerifyRequired;
      if (fields.faceVerifyFrequency !== undefined) payload.face_verify_frequency = fields.faceVerifyFrequency;
      if (fields.payrollVisible !== undefined) payload.payroll_visible = fields.payrollVisible;
      if (fields.commissionRate !== undefined) payload.commission_rate = fields.commissionRate === '' || fields.commissionRate == null ? null : fields.commissionRate;
      payload.work_start_time = normalizeTime(fields.workStartTime);
      payload.auto_logout_time = normalizeTime(fields.autoLogoutTime);
      if (fields.address) payload.address = fields.address;
      if (fields.emergencyContactName) payload.emergency_contact_name = fields.emergencyContactName;
      if (fields.emergencyContactPhone) payload.emergency_contact_phone = fields.emergencyContactPhone;
      if (fields.bankAccountNumber) payload.bank_account_number = fields.bankAccountNumber;
      if (fields.bankName) payload.bank_name = fields.bankName;
      if (fields.ifscCode) payload.ifsc_code = fields.ifscCode;
      if (fields.panNumber) payload.pan_number = fields.panNumber;
      if (fields.aadharNumber) payload.aadhar_number = fields.aadharNumber;
      if (fields.uanNumber) payload.uan_number = fields.uanNumber;
      if (fields.esiNumber) payload.esi_number = fields.esiNumber;
      if (fields.profilePhotoUrl) payload.profile_photo_url = fields.profilePhotoUrl;
      if (fields.notes) payload.notes = fields.notes;
      const { data, error } = await insertOrRetry(supabaseCli, 'employees', payload);
      if (error) throw new Error(error.message);
      if (data?.id) {
        await supabaseCli.from('employee_history').insert({ employee_id: data.id, event_type: 'joined', title: 'Joined', description: `${data.name} joined as ${data.designation || 'employee'}`, event_date: data.joining_date, created_by: _auth.email });
      }
      return { data };
    }
    case 'employees.update': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id, _auth, ...fields } = params;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (fields.name !== undefined) updates.name = fields.name;
      // Store the email lowercase so the Google sign-in lookup always matches.
      if (fields.email !== undefined) updates.email = normalizeEmail(fields.email);
      if (fields.phone !== undefined) updates.phone = fields.phone;
      if (fields.designation !== undefined) updates.designation = fields.designation;
      if (fields.department !== undefined) updates.department = fields.department;
      // Date/numeric columns reject '' — coerce empty to null.
      if (fields.joiningDate !== undefined) updates.joining_date = fields.joiningDate === '' || fields.joiningDate == null ? null : fields.joiningDate;
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.salary !== undefined) updates.salary = fields.salary === '' || fields.salary == null ? null : fields.salary;
      if (fields.accessEnabled !== undefined) updates.access_enabled = fields.accessEnabled;
      if (fields.faceVerifyRequired !== undefined) updates.face_verify_required = fields.faceVerifyRequired;
      if (fields.faceVerifyFrequency !== undefined) updates.face_verify_frequency = fields.faceVerifyFrequency;
      if (fields.payrollVisible !== undefined) updates.payroll_visible = fields.payrollVisible;
      if (fields.commissionRate !== undefined) updates.commission_rate = fields.commissionRate === '' || fields.commissionRate == null ? null : fields.commissionRate;
      if (fields.workStartTime !== undefined) updates.work_start_time = normalizeTime(fields.workStartTime);
      if (fields.autoLogoutTime !== undefined) updates.auto_logout_time = normalizeTime(fields.autoLogoutTime);
      if (fields.address !== undefined) updates.address = fields.address;
      if (fields.emergencyContactName !== undefined) updates.emergency_contact_name = fields.emergencyContactName;
      if (fields.emergencyContactPhone !== undefined) updates.emergency_contact_phone = fields.emergencyContactPhone;
      if (fields.bankAccountNumber !== undefined) updates.bank_account_number = fields.bankAccountNumber;
      if (fields.bankName !== undefined) updates.bank_name = fields.bankName;
      if (fields.ifscCode !== undefined) updates.ifsc_code = fields.ifscCode;
      if (fields.panNumber !== undefined) updates.pan_number = fields.panNumber;
      if (fields.aadharNumber !== undefined) updates.aadhar_number = fields.aadharNumber;
      if (fields.uanNumber !== undefined) updates.uan_number = fields.uanNumber;
      if (fields.esiNumber !== undefined) updates.esi_number = fields.esiNumber;
      if (fields.profilePhotoUrl !== undefined) updates.profile_photo_url = fields.profilePhotoUrl;
      if (fields.notes !== undefined) updates.notes = fields.notes;
      const { error } = await updateOrRetry(supabaseCli, 'employees', updates, 'id', id);
      if (error) throw new Error(error.message);
      if (fields.addHistory) {
        await supabaseCli.from('employee_history').insert({ employee_id: id, event_type: fields.historyType ?? 'updated', title: fields.historyTitle ?? 'Updated', description: fields.historyDesc ?? '', created_by: _auth.email });
      }
      const { data } = await supabaseCli.from('employees').select('*').eq('id', id).single();
      return { data };
    }
    case 'employees.delete': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id } = params;
      await supabaseCli.from('employee_history').delete().eq('employee_id', id);
      await supabaseCli.from('employee_attendance').delete().eq('employee_id', id);
      await supabaseCli.from('employee_leaves').delete().eq('employee_id', id);
      await supabaseCli.from('employee_payroll').delete().eq('employee_id', id);
      const { error } = await supabaseCli.from('employees').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Employee deleted' };
    }
    case 'employees.history': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId } = params;
      const { data, error } = await supabaseCli.from('employee_history').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }
    case 'employees.addHistory': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId, eventType, title, description, eventDate, createdBy } = params;
      const { data, error } = await supabaseCli.from('employee_history').insert({ employee_id: employeeId, event_type: eventType ?? 'note', title: title ?? '', description: description ?? '', event_date: eventDate ?? new Date().toISOString().split('T')[0], created_by: createdBy ?? '' }).select().single();
      if (error) throw new Error(error.message);
      return { data };
    }
    case 'employees.attendance': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId, month, year } = params;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      const { data, error } = await supabaseCli.from('employee_attendance').select('*').eq('employee_id', employeeId).gte('date', startDate).lte('date', endDate).order('date', { ascending: true });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }
    case 'employees.setAttendance': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId, date, checkIn, checkOut, status, notes } = params;
      const payload: Record<string, unknown> = { employee_id: employeeId, date, status: status ?? 'Present', notes: notes ?? '' };
      if (checkIn) payload.check_in = checkIn;
      if (checkOut) payload.check_out = checkOut;
      const { data: existing } = await supabaseCli.from('employee_attendance').select('id').eq('employee_id', employeeId).eq('date', date).maybeSingle();
      if (existing) {
        const { error } = await supabaseCli.from('employee_attendance').update(payload).eq('id', existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseCli.from('employee_attendance').insert(payload);
        if (error) throw new Error(error.message);
      }
      return { message: 'Attendance saved' };
    }
    case 'employees.leaves': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId } = params;
      const { data, error } = await supabaseCli.from('employee_leaves').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }
    case 'employees.applyLeave': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId, leaveType, startDate, endDate, reason, createdBy } = params;
      const { data, error } = await supabaseCli.from('employee_leaves').insert({ employee_id: employeeId, leave_type: leaveType ?? '', start_date: startDate, end_date: endDate, reason: reason ?? '', created_by: createdBy ?? '' }).select().single();
      if (error) throw new Error(error.message);
      await supabaseCli.from('employee_history').insert({ employee_id: employeeId, event_type: 'leave', title: `${leaveType} Leave`, description: `${leaveType} leave from ${startDate} to ${endDate}`, created_by: createdBy });
      return { data };
    }
    case 'employees.approveLeave': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id, approvedBy } = params;
      const { error } = await supabaseCli.from('employee_leaves').update({ status: 'Approved', approved_by: approvedBy ?? '' }).eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Leave approved' };
    }
    case 'employees.rejectLeave': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id } = params;
      const { error } = await supabaseCli.from('employee_leaves').update({ status: 'Rejected' }).eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Leave rejected' };
    }
    case 'employees.payroll': {
      // Admins see any employee's payroll; employees may only read their own.
      const isEmployee = params._auth.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      let employeeId = params.employeeId;
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        if (!me) throw new Error('Employee not found');
        employeeId = me.id;
      }
      if (!employeeId) throw new Error('employeeId is required');
      const { data, error } = await supabaseCli.from('employee_payroll').select('*').eq('employee_id', employeeId).order('year', { ascending: false }).order('month', { ascending: false });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }
    case 'employees.generatePayroll': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId, month, year, createdBy } = params;
      const { data: emp } = await supabaseCli.from('employees').select('salary').eq('id', employeeId).single();
      // Supabase returns NUMERIC as a string — coerce before arithmetic.
      const salary = Number(emp?.salary ?? 0) || 0;
      if (salary <= 0) throw new Error('This employee has no monthly salary set yet — set one on their profile first.');
      const basic = Math.round(salary * 0.5);
      const hra = Math.round(salary * 0.2);
      const allowances = Math.round(salary * 0.2);
      const deductions = Math.round(salary * 0.1);
      const net = salary - deductions;
      const { data, error } = await supabaseCli.from('employee_payroll').upsert({
        employee_id: employeeId, month, year, basic_pay: basic, hra, allowances, deductions, net_pay: net, status: 'Pending',
      }, { onConflict: 'employee_id,month,year' }).select().single();
      if (error) throw new Error(error.message);
      await supabaseCli.from('employee_history').insert({
        employee_id: employeeId, event_type: 'payroll', title: `Payroll ${month}/${year}`, description: `Payroll generated: ₹${net.toLocaleString()}`, created_by: createdBy,
      });
      return { data };
    }
    case 'employees.markPaid': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id, paymentDate } = params;
      const { error } = await supabaseCli.from('employee_payroll').update({ status: 'Paid', payment_date: paymentDate ?? new Date().toISOString().split('T')[0] }).eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Payroll marked as paid' };
    }
    case 'employees.maxEmployeeId': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { data, error } = await supabaseCli.from('employees').select('employee_id').order('employee_id', { ascending: false }).limit(1);
      if (error) throw new Error(error.message);
      return { data: data?.[0]?.employee_id ?? null };
    }

    // ── Employee workspace: my profile, my clients, login tracking ──────────
    case 'employees.me': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { data, error } = await supabaseCli.from('employees').select('*').eq('email', params._auth.email).maybeSingle();
      if (error) throw new Error(error.message);
      return { data };
    }
    case 'employees.clients': {
      const isEmployee = params._auth.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      let empId = params.employeeId;
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        if (!me) throw new Error('Employee not found');
        empId = me.id;
      }
      if (!empId) throw new Error('employeeId is required');
      const { data: emp } = await supabaseCli.from('employees').select('id,employee_id,name,email').eq('id', empId).maybeSingle();
      const { data: clients, error } = await supabaseCli.from('crm_clients').select('*').eq('assigned_employee', empId).order('sno', { ascending: false });
      if (error) throw new Error(error.message);
      return { data: { employee: emp, clients: clients ?? [] } };
    }
    case 'employees.assignClient': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId, sno } = params;
      if (!employeeId || !sno) throw new Error('employeeId and sno are required');
      const { data: emp } = await supabaseCli.from('employees').select('id,employee_id,name').eq('id', employeeId).maybeSingle();
      if (!emp) throw new Error('Employee not found');
      const { data: client } = await supabaseCli.from('crm_clients').select('sno,name,status').eq('sno', sno).maybeSingle();
      if (!client) throw new Error('Client not found');
      const { error } = await supabaseCli.from('crm_clients').update({ assigned_employee: employeeId, updated_at: new Date().toISOString() }).eq('sno', sno);
      if (error) throw new Error(error.message);
      await supabaseCli.from('crm_client_activity').insert({
        client_sno: sno, action: 'assigned', status: client.status ?? '',
        note: `Assigned to ${emp.name} (${emp.employee_id})`, performed_by: params._auth.email, performed_by_id: employeeId,
      });
      return { message: 'Client assigned' };
    }
    case 'employees.unassignClient': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { sno } = params;
      const { data: client } = await supabaseCli.from('crm_clients').select('sno,name,status').eq('sno', sno).maybeSingle();
      if (client) {
        const { error } = await supabaseCli.from('crm_clients').update({ assigned_employee: null, updated_at: new Date().toISOString() }).eq('sno', sno);
        if (error) throw new Error(error.message);
        await supabaseCli.from('crm_client_activity').insert({
          client_sno: sno, action: 'unassigned', status: client.status ?? '',
          note: 'Assignment removed', performed_by: params._auth.email,
        });
      }
      return { message: 'Client unassigned' };
    }
    case 'employees.logins': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId, limit = 100 } = params;
      let query = supabaseCli.from('employee_logins').select('*').order('login_at', { ascending: false }).limit(limit);
      if (employeeId) query = supabaseCli.from('employee_logins').select('*').eq('employee_id', employeeId).order('login_at', { ascending: false }).limit(limit);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }
    case 'employees.recordLogin': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { data: me, error: meErr } = await supabaseCli.from('employees').select('id,employee_id,name,login_count').eq('email', params._auth.email).maybeSingle();
      if (meErr) throw new Error(meErr.message);
      if (!me) throw new Error('Employee not found');
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabaseCli.from('employee_logins').select('id').eq('employee_id', me.id).eq('login_date', today).maybeSingle();
      if (!existing) {
        await supabaseCli.from('employee_logins').insert({ employee_id: me.id, user_agent: (params.userAgent ?? '').slice(0, 200) });
        await supabaseCli.from('employees').update({ login_count: (me.login_count ?? 0) + 1, last_login: new Date().toISOString() }).eq('id', me.id);
      }
      return { message: 'Login recorded' };
    }
    // ── Employee sessions: realtime dashboard, time-online, auto-logout, attendance ──
    case 'employees.startSession': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { data: me, error: meErr } = await supabaseCli.from('employees').select('id,employee_id,name,login_count').eq('email', params._auth.email).maybeSingle();
      if (meErr) throw new Error(meErr.message);
      if (!me) throw new Error('Employee not found');
      const ua = (params.userAgent ?? '').slice(0, 200);
      const { data: sess, error } = await supabaseCli.from('employee_sessions').insert({ employee_id: me.id, user_agent: ua }).select().single();
      if (error) throw new Error(error.message);
      // Daily login counter (idempotent per day via UNIQUE) + attendance will be derived on logout
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabaseCli.from('employee_logins').select('id').eq('employee_id', me.id).eq('login_date', today).maybeSingle();
      if (!existing) {
        await supabaseCli.from('employee_logins').insert({ employee_id: me.id, user_agent: ua });
        await supabaseCli.from('employees').update({ login_count: (me.login_count ?? 0) + 1, last_login: new Date().toISOString() }).eq('id', me.id);
      }
      return { data: { id: sess.id } };
    }
    case 'employees.heartbeat': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { id } = params;
      const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
      if (!me) throw new Error('Employee not found');
      const { error } = await supabaseCli.from('employee_sessions').update({ last_active_at: new Date().toISOString() }).eq('id', id).eq('employee_id', me.id);
      if (error) throw new Error(error.message);
      return { message: 'ok' };
    }
    case 'employees.endSession': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { id, durationSeconds } = params;
      const { data: me } = await supabaseCli.from('employees').select('id,employee_id,name').eq('email', params._auth.email).maybeSingle();
      if (!me) throw new Error('Employee not found');
      const { data: sess } = await supabaseCli.from('employee_sessions').select('*').eq('id', id).eq('employee_id', me.id).maybeSingle();
      if (!sess) return { message: 'Session not found' };
      const now = new Date();
      const dur = durationSeconds ?? Math.max(0, Math.round((now.getTime() - new Date(sess.login_at).getTime()) / 1000));
      await supabaseCli.from('employee_sessions').update({ logout_at: now.toISOString(), duration_seconds: dur }).eq('id', id);
      // Attendance derived from login: check-in = first login of the day, check-out = last logout
      const dateStr = now.toISOString().split('T')[0];
      const loginTime = new Date(sess.login_at);
      const fmt = (d: Date) => d.toTimeString().slice(0, 8);
      const { data: existing } = await supabaseCli.from('employee_attendance').select('id,check_in,check_out').eq('employee_id', me.id).eq('date', dateStr).maybeSingle();
      const outStr = fmt(now);
      if (existing) {
        const newOut = existing.check_out && existing.check_out >= outStr ? existing.check_out : outStr;
        await supabaseCli.from('employee_attendance').update({ check_out: newOut, status: 'Present', notes: 'Auto from login' }).eq('id', existing.id);
      } else {
        await supabaseCli.from('employee_attendance').insert({ employee_id: me.id, date: dateStr, check_in: fmt(loginTime), check_out: outStr, status: 'Present', notes: 'Auto from login' });
      }
      return { message: 'Session ended' };
    }
    case 'employees.sessionStats': {
      const { employeeId } = params;
      const isEmployee = params._auth.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      let empId = employeeId;
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        if (!me) throw new Error('Employee not found');
        empId = me.id;
      }
      if (!empId) throw new Error('employeeId is required');
      const { data: sessions } = await supabaseCli.from('employee_sessions').select('*').eq('employee_id', empId).order('login_at', { ascending: false }).limit(500);
      const { data: emp } = await supabaseCli.from('employees').select('login_count,last_login,work_start_time,auto_logout_time').eq('id', empId).maybeSingle();
      const rows = sessions ?? [];
      const now = Date.now();
      const totalSeconds = rows.reduce((s: number, r: any) => s + (r.duration_seconds ?? 0) + (r.logout_at ? 0 : Math.max(0, Math.round((now - new Date(r.login_at).getTime()) / 1000))), 0);
      return {
        data: {
          login_count: emp?.login_count ?? 0,
          last_login: emp?.last_login ?? null,
          work_start_time: emp?.work_start_time ?? null,
          auto_logout_time: emp?.auto_logout_time ?? null,
          total_sessions: rows.length,
          total_seconds_online: totalSeconds,
          history: rows.map((r: any) => ({
            id: r.id,
            login_at: r.login_at,
            logout_at: r.logout_at,
            duration_seconds: r.duration_seconds,
            open: !r.logout_at,
            user_agent: r.user_agent,
          })),
        },
      };
    }

    case 'crmClients.updateStatus': {
      const { sno, status, note } = params;
      if (!sno || !status) throw new Error('sno and status are required');
      const isEmployee = params._auth.role === 'employee';
      const { data: client, error: clientErr } = await supabaseCli.from('crm_clients').select('sno,name,status,assigned_employee').eq('sno', sno).maybeSingle();
      if (clientErr) throw new Error(clientErr.message);
      if (!client) throw new Error('Client not found');
      let performedBy = params._auth.email;
      let performedById: string | null = null;
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id,employee_id,name').eq('email', params._auth.email).maybeSingle();
        if (!me) throw new Error('Employee not found');
        if (client.assigned_employee !== me.id) throw new Error('Client is not assigned to you');
        performedById = me.id;
        performedBy = `${me.name} (${me.employee_id})`;
      } else if (!hasPerm(params._auth, 'clients.view')) {
        throw new Error('Forbidden');
      }
      const { error } = await supabaseCli.from('crm_clients').update({ status, updated_at: new Date().toISOString() }).eq('sno', sno);
      if (error) throw new Error(error.message);
      await supabaseCli.from('crm_client_activity').insert({
        client_sno: sno, action: 'status_changed', status, note: note ?? '',
        performed_by: performedBy, performed_by_id: performedById,
      });
      return { data: { sno, status } };
    }
    case 'clients.activity': {
      const { sno } = params;
      if (!sno) throw new Error('sno is required');
      const isEmployee = params._auth.role === 'employee';
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        const { data: client } = await supabaseCli.from('crm_clients').select('assigned_employee').eq('sno', sno).maybeSingle();
        if (!me || !client || client.assigned_employee !== me.id) throw new Error('Forbidden');
      } else if (!hasPerm(params._auth, 'clients.view')) {
        throw new Error('Forbidden');
      }
      const { data, error } = await supabaseCli.from('crm_client_activity').select('*').eq('client_sno', sno).order('created_at', { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }

    // ── Employee events (posters / wishings / announcements) ─────────────────
    case 'events.list': {
      // Employees see events on their dashboard — filtered by targeting.
      // Admins manage them and see everything.
      const isEmployee = params._auth.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { data, error } = await supabaseCli.from('employee_events').select('*').order('event_date', { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      let rows = data ?? [];
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id,department,designation').eq('email', params._auth.email).maybeSingle();
        if (me) {
          rows = rows.filter((ev: any) => {
            const depts: string[] = ev.target_departments ?? [];
            const desigs: string[] = ev.target_designations ?? [];
            const emps: string[] = ev.target_employee_ids ?? [];
            if (depts.length === 0 && desigs.length === 0 && emps.length === 0) return true; // everyone
            if (depts.includes(me.department)) return true;
            if (desigs.includes(me.designation)) return true;
            if (emps.includes(me.id)) return true;
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
      const { data, error } = await supabaseCli.from('employee_events').insert({
        title, description: description ?? '', event_type: eventType ?? 'Update',
        event_date: eventDate ?? null, image_url: imageUrl ?? '', created_by: params._auth.email,
        target_departments: targetDepartments ?? [], target_designations: targetDesignations ?? [],
        target_employee_ids: targetEmployeeIds ?? [],
      }).select().single();
      if (error) throw new Error(error.message);
      return { data };
    }
    case 'events.update': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id, title, description, eventType, eventDate, imageUrl, targetDepartments, targetDesignations, targetEmployeeIds } = params;
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (eventType !== undefined) updates.event_type = eventType;
      if (eventDate !== undefined) updates.event_date = eventDate;
      if (imageUrl !== undefined) updates.image_url = imageUrl;
      if (targetDepartments !== undefined) updates.target_departments = targetDepartments;
      if (targetDesignations !== undefined) updates.target_designations = targetDesignations;
      if (targetEmployeeIds !== undefined) updates.target_employee_ids = targetEmployeeIds;
      const { error } = await supabaseCli.from('employee_events').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Event updated' };
    }
    case 'events.delete': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id } = params;
      const { error } = await supabaseCli.from('employee_events').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Event deleted' };
    }

    // ── Client site visits (employees schedule for their assigned clients) ──
    case 'visits.list': {
      const isEmployee = params._auth.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      let query = supabaseCli.from('client_visits').select('*').order('visit_date', { ascending: false }).limit(200);
      if (params.employeeId) query = query.eq('employee_id', params.employeeId);
      if (params.clientSno) query = query.eq('client_sno', params.clientSno);
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        if (!me) throw new Error('Employee not found');
        query = query.eq('employee_id', me.id);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      const empIds: string[] = [...new Set(rows.map((r: any) => r.employee_id))];
      let empMap: Record<string, any> = {};
      if (empIds.length > 0) {
        const { data: emps } = await supabaseCli.from('employees').select('id,employee_id,name').in('id', empIds);
        if (emps) emps.forEach((e: any) => { empMap[e.id] = e; });
      }
      const snos: number[] = [...new Set(rows.map((r: any) => r.client_sno))];
      let clientMap: Record<number, any> = {};
      if (snos.length > 0) {
        const { data: cl } = await supabaseCli.from('crm_clients').select('sno,name,phone,status').in('sno', snos);
        if (cl) cl.forEach((c: any) => { clientMap[c.sno] = c; });
      }
      return {
        data: rows.map((r: any) => ({
          ...r,
          employee_info: empMap[r.employee_id] ?? null,
          client_info: clientMap[r.client_sno] ?? null,
        })),
      };
    }
    case 'visits.add': {
      const isEmployee = params._auth.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { clientSno, visitDate, notes, visitTime } = params;
      if (!clientSno || !visitDate) throw new Error('clientSno and visitDate are required');
      let employeeId = params.employeeId;
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        if (!me) throw new Error('Employee not found');
        employeeId = me.id;
        // Employee can only schedule visits for clients assigned to them.
        const { data: client } = await supabaseCli.from('crm_clients').select('assigned_employee').eq('sno', clientSno).maybeSingle();
        if (!client || client.assigned_employee !== me.id) throw new Error('Client is not assigned to you');
      }
      if (!employeeId) throw new Error('employeeId is required');
      const { data, error } = await supabaseCli.from('client_visits').insert({
        employee_id: employeeId, client_sno: clientSno, visit_date: visitDate, notes: notes ?? '',
        visit_time: normalizeTime(visitTime),
      }).select().single();
      if (error) throw new Error(error.message);
      const { data: client } = await supabaseCli.from('crm_clients').select('name,status').eq('sno', clientSno).maybeSingle();
      await supabaseCli.from('crm_client_activity').insert({
        client_sno: clientSno, action: 'visit_scheduled', status: client?.status ?? '',
        note: `Site visit scheduled for ${visitDate}${visitTime ? ' at ' + visitTime : ''}${notes ? ' — ' + notes : ''}`, performed_by: params._auth.email, performed_by_id: employeeId,
      });
      return { data };
    }
    case 'visits.updateStatus': {
      const isEmployee = params._auth.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id, status } = params;
      if (!status) throw new Error('status is required');
      const { data: visit } = await supabaseCli.from('client_visits').select('*').eq('id', id).maybeSingle();
      if (!visit) throw new Error('Visit not found');
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        if (!me || visit.employee_id !== me.id) throw new Error('Forbidden');
      }
      const { error } = await supabaseCli.from('client_visits').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);
      const { data: client } = await supabaseCli.from('crm_clients').select('name,status').eq('sno', visit.client_sno).maybeSingle();
      await supabaseCli.from('crm_client_activity').insert({
        client_sno: visit.client_sno, action: 'visit_status', status: client?.status ?? '',
        note: `Site visit marked ${status}`, performed_by: params._auth.email, performed_by_id: visit.employee_id,
      });
      return { message: 'Visit updated' };
    }

    // ── Employee photo upload (base64 → storage) ─────────────────────────────
    case 'employees.uploadPhoto': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId, base64 } = params;
      if (!employeeId || !base64) throw new Error('employeeId and base64 are required');
      const { data: emp } = await supabaseCli.from('employees').select('id,employee_id').eq('id', employeeId).maybeSingle();
      if (!emp) throw new Error('Employee not found');
      const buffer = decodeBase64(base64);
      if (buffer.length === 0) throw new Error('Empty image');
      if (buffer.length > 5 * 1024 * 1024) throw new Error('Image too large (max 5 MB)');
      const extMatch = /^data:image\/(jpeg|png|webp)/.exec(base64 ?? '');
      const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'jpg';
      const path = `${emp.employee_id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabaseCliAdmin.storage.from('employee-photos').upload(path, buffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true });
      if (upErr) throw new Error('Upload failed: ' + upErr.message);
      const photoUrl = `https://eimvaxrmiizdlgonhiov.supabase.co/storage/v1/object/public/employee-photos/${path}`;
      const { error } = await supabaseCli.from('employees').update({ profile_photo_url: photoUrl, updated_at: new Date().toISOString() }).eq('id', employeeId);
      if (error) throw new Error(error.message);
      return { data: { profilePhotoUrl: photoUrl } };
    }

    // ── Face verification (photo + exact location + timestamp) ───────────────
    case 'employees.faceVerify': {
      const isEmployee = params._auth.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { base64, latitude, longitude, locationLabel } = params;
      if (!base64) throw new Error('Photo is required');
      // Resolve which employee: the caller (employee) or the admin-chosen one.
      let employeeId = params.employeeId;
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id,employee_id').eq('email', params._auth.email).maybeSingle();
        if (!me) throw new Error('Employee not found');
        employeeId = me.id;
      }
      if (!employeeId) throw new Error('employeeId is required');
      const { data: emp } = await supabaseCli.from('employees').select('id,employee_id').eq('id', employeeId).maybeSingle();
      if (!emp) throw new Error('Employee not found');
      const buffer = decodeBase64(base64);
      if (buffer.length === 0) throw new Error('Empty image');
      if (buffer.length > 5 * 1024 * 1024) throw new Error('Image too large (max 5 MB)');
      const extMatch = /^data:image\/(jpeg|png|webp)/.exec(base64 ?? '');
      const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'jpg';
      const path = `faces/${emp.employee_id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabaseCliAdmin.storage.from('employee-photos').upload(path, buffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true });
      if (upErr) throw new Error('Upload failed: ' + upErr.message);
      const photoUrl = `https://eimvaxrmiizdlgonhiov.supabase.co/storage/v1/object/public/employee-photos/${path}`;
      const { data, error } = await supabaseCli.from('employee_face_verifications').insert({
        employee_id: employeeId, image_url: photoUrl,
        latitude: latitude != null ? latitude : null,
        longitude: longitude != null ? longitude : null,
        location_label: locationLabel ?? '',
      }).select().single();
      if (error) throw new Error(error.message);
      // The verification row itself is the source of truth for "last verified".
      // Clear any pending admin-requested verification so the dashboard stops
      // prompting (requests live in employee_history — no extra table needed).
      try {
        await supabaseCli.from('employee_history').delete().eq('employee_id', employeeId).eq('event_type', 'face_verify_request');
      } catch { /* non-fatal */ }
      return { data };
    }
    case 'employees.faceVerifications': {
      const isEmployee = params._auth.role === 'employee';
      if (!isEmployee && !hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      let employeeId = params.employeeId;
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        if (!me) throw new Error('Employee not found');
        employeeId = me.id;
      }
      if (!employeeId) throw new Error('employeeId is required');
      const { data, error } = await supabaseCli.from('employee_face_verifications').select('*').eq('employee_id', employeeId).order('verified_at', { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      // The employees table has no last_face_verified_at column — the newest
      // verification record is the source of truth (schema-cache error fix).
      return { data: data ?? [], lastFaceVerifiedAt: (data?.[0]?.verified_at ?? null) as string | null };
    }

    // ── Face-verification requests (admin triggers → employee dashboard popup) ─
    // Pending requests are stored as employee_history rows (event_type
    // 'face_verify_request') so the feature works without any extra table.
    case 'employees.requestFaceVerify': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { employeeId } = params;
      if (!employeeId) throw new Error('employeeId is required');
      const { data: emp } = await supabaseCli.from('employees').select('id,employee_id,name,email').eq('id', employeeId).maybeSingle();
      if (!emp) throw new Error('Employee not found');
      // One live pending request per employee — replace any older pending one.
      await supabaseCli.from('employee_history').delete().eq('employee_id', employeeId).eq('event_type', 'face_verify_request');
      const { data, error } = await supabaseCli.from('employee_history').insert({
        employee_id: employeeId, event_type: 'face_verify_request', title: 'Face ID requested',
        description: `Requested by ${params._auth.email ?? ''}`, created_by: params._auth.email ?? '',
      }).select().single();
      if (error) throw new Error(error.message);
      return { data: { id: data.id, employee: emp.name } };
    }
    case 'employees.pendingFaceVerify': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
      if (!me) throw new Error('Employee not found');
      const { data, error } = await supabaseCli.from('employee_history').select('*').eq('employee_id', me.id).eq('event_type', 'face_verify_request').order('created_at', { ascending: false }).limit(1);
      if (error) throw new Error(error.message);
      return { data: data?.[0] ?? null };
    }

    // ── Employee workspace: personal notes + client requirements ─────────────
    case 'employees.saveNotes': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { notes } = params;
      const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
      if (!me) throw new Error('Employee not found');
      const { error } = await supabaseCli.from('employees').update({ notes: notes ?? '', updated_at: new Date().toISOString() }).eq('id', me.id);
      if (error) throw new Error(error.message);
      return { message: 'Notes saved' };
    }
    case 'employees.updateClientDetail': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { sno, requirements, notes } = params;
      if (sno == null) throw new Error('sno is required');
      const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
      if (!me) throw new Error('Employee not found');
      const { data: client } = await supabaseCli.from('crm_clients').select('sno,name,status,assigned_employee').eq('sno', sno).maybeSingle();
      if (!client) throw new Error('Client not found');
      if (client.assigned_employee !== me.id) throw new Error('Client is not assigned to you');
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (requirements !== undefined) updates.requirements = requirements;
      if (notes !== undefined) updates.notes = notes;
      const { error } = await supabaseCli.from('crm_clients').update(updates).eq('sno', sno);
      if (error) throw new Error(error.message);
      return { message: 'Client details updated' };
    }

    // ═══════════════════════════════════════════════════════════════════
    // JIBBLE-STYLE ATTENDANCE & TIME TRACKING
    // ═══════════════════════════════════════════════════════════════════

    case 'attendance.clockIn': {
      // Employee clocks in with GPS + optional selfie
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { latitude, longitude, locationLabel, selfieUrl, geofenceId } = params;
      const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
      if (!me) throw new Error('Employee not found');
      const dateStr = new Date().toISOString().split('T')[0];
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);

      // Check if already clocked in today (with no checkout = still on shift)
      const { data: existing } = await supabaseCli.from('employee_attendance')
        .select('id,check_in,check_out')
        .eq('employee_id', me.id)
        .eq('date', dateStr)
        .maybeSingle();
      if (existing?.check_in && !existing?.check_out) throw new Error('Already clocked in — clock out first');

      // If there's an existing row with check_out, this is a re-clock-in (afternoon session)
      // Create a NEW attendance row so morning + afternoon are separate records
      const payload: Record<string, unknown> = {
        employee_id: me.id,
        date: dateStr,
        check_in: timeStr,
        status: 'Present',
        notes: existing?.check_out ? 'Clock-in (afternoon)' : 'Clock-in',
        source: 'clock_in',
        check_in_lat: latitude ?? null,
        check_in_lng: longitude ?? null,
        check_in_location: locationLabel ?? '',
        check_in_selfie_url: selfieUrl ?? '',
      };

      const res = await supabaseCli.from('employee_attendance').insert(payload).select().single();
      if (res.error) throw new Error(res.error.message);
      const data = res.data;

      // Log history
      await supabaseCli.from('employee_history').insert({
        employee_id: me.id,
        event_type: 'clock_in',
        title: 'Clocked In',
        description: `${locationLabel || 'No location'} · ${timeStr}`,
        metadata: { lat: latitude, lng: longitude, location: locationLabel, geofence_id: geofenceId },
      });

      return { data };
    }

    case 'attendance.clockOut': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { latitude, longitude, locationLabel, selfieUrl } = params;
      const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
      if (!me) throw new Error('Employee not found');
      const dateStr = new Date().toISOString().split('T')[0];
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);

      const { data: existing } = await supabaseCli.from('employee_attendance')
        .select('id,check_in')
        .eq('employee_id', me.id)
        .eq('date', dateStr)
        .maybeSingle();
      if (!existing?.check_in) throw new Error('Not clocked in today');

      // Calculate total break minutes for today
      const { data: breaks } = await supabaseCli.from('employee_breaks')
        .select('duration_seconds')
        .eq('employee_id', me.id)
        .eq('attendance_date', dateStr);
      const totalBreakMin = Math.round((breaks ?? []).reduce((s: number, b: any) => s + (b.duration_seconds ?? 0), 0) / 60);

      // Calculate overtime
      const empRes = await supabaseCli.from('employees').select('daily_work_hours,overtime_enabled,overtime_rate').eq('id', me.id).single();
      const dailyHours = Number(empRes?.data?.daily_work_hours ?? 8);
      const otEnabled = empRes?.data?.overtime_enabled ?? false;
      const otRate = Number(empRes?.data?.overtime_rate ?? 1.5);

      // Parse check_in and check_out to compute worked minutes
      const [ciH, ciM] = String(existing.check_in).split(':').map(Number);
      const [coH, coM] = timeStr.split(':').map(Number);
      const workedMinutes = Math.max(0, (coH * 60 + coM) - (ciH * 60 + ciM) - totalBreakMin);
      const expectedMinutes = dailyHours * 60;
      const otMinutes = otEnabled && workedMinutes > expectedMinutes ? workedMinutes - expectedMinutes : 0;

      const { error } = await supabaseCli.from('employee_attendance').update({
        check_out: timeStr,
        check_out_lat: latitude ?? null,
        check_out_lng: longitude ?? null,
        check_out_location: locationLabel ?? '',
        check_out_selfie_url: selfieUrl ?? '',
        total_break_minutes: totalBreakMin,
        overtime_minutes: otMinutes,
        notes: 'Clock-out',
      }).eq('id', existing.id);
      if (error) throw new Error(error.message);

      await supabaseCli.from('employee_history').insert({
        employee_id: me.id,
        event_type: 'clock_out',
        title: 'Clocked Out',
        description: `${locationLabel || 'No location'} · ${timeStr} · ${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m worked`,
        metadata: { lat: latitude, lng: longitude, location: locationLabel, worked_minutes: workedMinutes, overtime_minutes: otMinutes },
      });

      return { message: 'Clocked out', workedMinutes, overtimeMinutes: otMinutes };
    }

    case 'attendance.startBreak': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { reason } = params;
      const { data: me } = await supabaseCli.from('employees').select('id,max_break_minutes').eq('email', params._auth.email).maybeSingle();
      if (!me) throw new Error('Employee not found');
      const dateStr = new Date().toISOString().split('T')[0];

      // Check if already on break
      const { data: activeBreak } = await supabaseCli.from('employee_breaks')
        .select('id')
        .eq('employee_id', me.id)
        .eq('attendance_date', dateStr)
        .is('break_end', null)
        .maybeSingle();
      if (activeBreak) throw new Error('Already on break');

      const { data, error } = await supabaseCli.from('employee_breaks').insert({
        employee_id: me.id,
        attendance_date: dateStr,
        reason: reason ?? '',
      }).select().single();
      if (error) throw new Error(error.message);
      return { data };
    }

    case 'attendance.endBreak': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
      if (!me) throw new Error('Employee not found');
      const dateStr = new Date().toISOString().split('T')[0];
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);

      const { data: activeBreak } = await supabaseCli.from('employee_breaks')
        .select('id,break_start')
        .eq('employee_id', me.id)
        .eq('attendance_date', dateStr)
        .is('break_end', null)
        .order('break_start', { ascending: false })
        .maybeSingle();
      if (!activeBreak) throw new Error('No active break found');

      const dur = Math.max(0, Math.round((now.getTime() - new Date(activeBreak.break_start).getTime()) / 1000));
      const { error: brkErr } = await supabaseCli.from('employee_breaks').update({
        break_end: now.toISOString(),
        duration_seconds: dur,
      }).eq('id', activeBreak.id);
      if (brkErr) throw new Error(brkErr.message);

      // Auto clock-out after break — employee re-clock-in for afternoon session
      const { data: att } = await supabaseCli.from('employee_attendance')
        .select('id,check_in')
        .eq('employee_id', me.id)
        .eq('date', dateStr)
        .is('check_out', null)
        .maybeSingle();
      let autoClockOut = false;
      if (att?.check_in) {
        // Sum all breaks for this session
        const { data: breaks } = await supabaseCli.from('employee_breaks')
          .select('duration_seconds')
          .eq('employee_id', me.id)
          .eq('attendance_date', dateStr);
        const totalBreakMin = Math.round((breaks ?? []).reduce((s: number, b: any) => s + (b.duration_seconds ?? 0), 0) / 60);
        await supabaseCli.from('employee_attendance').update({
          check_out: timeStr,
          total_break_minutes: totalBreakMin,
          notes: 'Auto clock-out (break end)',
        }).eq('id', att.id);
        autoClockOut = true;
      }

      return { message: 'Break ended', durationSeconds: dur, autoClockOut };
    }

    case 'attendance.activeBreak': {
      if (params._auth.role !== 'employee') throw new Error('Forbidden');
      const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
      if (!me) throw new Error('Employee not found');
      const dateStr = new Date().toISOString().split('T')[0];
      const { data } = await supabaseCli.from('employee_breaks')
        .select('*')
        .eq('employee_id', me.id)
        .eq('attendance_date', dateStr)
        .is('break_end', null)
        .order('break_start', { ascending: false })
        .maybeSingle();
      return { data: data ?? null };
    }

    case 'attendance.today': {
      // Employee gets their own; admin can query any employee
      const isEmployee = params._auth.role === 'employee';
      let empId = params.employeeId;
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        if (!me) throw new Error('Employee not found');
        empId = me.id;
      }
      if (!empId && !isEmployee) throw new Error('employeeId is required');
      if (!empId) throw new Error('employeeId is required');
      const dateStr = new Date().toISOString().split('T')[0];
      const { data: att } = await supabaseCli.from('employee_attendance').select('*').eq('employee_id', empId).eq('date', dateStr).maybeSingle();
      const { data: breaks } = await supabaseCli.from('employee_breaks').select('*').eq('employee_id', empId).eq('attendance_date', dateStr).order('break_start', { ascending: false });
      return { data: att ?? null, breaks: breaks ?? [] };
    }

    case 'attendance.liveStatus': {
      // Admin: who is currently clocked in (checked in but not checked out today)
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const dateStr = new Date().toISOString().split('T')[0];
      const { data: clockedIn } = await supabaseCli.from('employee_attendance')
        .select('id,employee_id,check_in,check_out,status,check_in_location,check_in_lat,check_in_lng')
        .eq('date', dateStr)
        .not('check_in', 'is', null)
        .order('check_in', { ascending: false });
      // Get employee names
      const empIds = [...new Set((clockedIn ?? []).map((r: any) => r.employee_id))];
      let empMap: Record<string, any> = {};
      if (empIds.length > 0) {
        const { data: emps } = await supabaseCli.from('employees').select('id,name,employee_id,designation,department,profile_photo_url').in('id', empIds);
        if (emps) emps.forEach((e: any) => { empMap[e.id] = e; });
      }
      const results = (clockedIn ?? []).map((r: any) => ({
        ...r,
        employee: empMap[r.employee_id] ?? null,
        is_on_shift: !r.check_out,
      }));
      const onShift = results.filter((r: any) => r.is_on_shift);
      const done = results.filter((r: any) => !r.is_on_shift);
      return { onShift, done, total: results.length };
    }

    case 'attendance.weeklyReport': {
      // Admin or employee: weekly hours breakdown
      const isEmployee = params._auth.role === 'employee';
      let empId = params.employeeId;
      if (isEmployee) {
        const { data: me } = await supabaseCli.from('employees').select('id').eq('email', params._auth.email).maybeSingle();
        if (!me) throw new Error('Employee not found');
        empId = me.id;
      }
      if (!empId) throw new Error('employeeId is required');
      const { startDate, endDate } = params;
      if (!startDate || !endDate) throw new Error('startDate and endDate are required');
      const { data: rows } = await supabaseCli.from('employee_attendance')
        .select('*')
        .eq('employee_id', empId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      // Compute daily hours
      const report = (rows ?? []).map((r: any) => {
        let workedMinutes = 0;
        if (r.check_in && r.check_out) {
        const [ciH, ciM] = String(r.check_in).split(':').map(Number);
          const [coH, coM] = String(r.check_out).split(':').map(Number);
          workedMinutes = Math.max(0, (coH * 60 + coM) - (ciH * 60 + ciM) - (r.total_break_minutes ?? 0));
        }
        return { ...r, worked_minutes: workedMinutes };
      });
      const totalWorked = report.reduce((s: number, r: any) => s + r.worked_minutes, 0);
      const totalOvertime = report.reduce((s: number, r: any) => s + (r.overtime_minutes ?? 0), 0);
      const totalBreaks = report.reduce((s: number, r: any) => s + (r.total_break_minutes ?? 0), 0);
      return { data: report, summary: { totalWorkedMinutes: totalWorked, totalOvertimeMinutes: totalOvertime, totalBreakMinutes: totalBreaks, daysWorked: report.filter((r: any) => r.check_in).length } };
    }

    // ── Geofences ─────────────────────────────────────────────────────────
    case 'geofences.list': {
      const { data, error } = await supabaseCli.from('geofences').select('*').order('name');
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }
    case 'geofences.create': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { name, latitude, longitude, radiusMeters } = params;
      if (!name || latitude == null || longitude == null) throw new Error('name, latitude, longitude required');
      const { data, error } = await supabaseCli.from('geofences').insert({
        name, latitude, longitude, radius_meters: radiusMeters ?? 200,
      }).select().single();
      if (error) throw new Error(error.message);
      return { data };
    }
    case 'geofences.update': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id, name, latitude, longitude, radiusMeters, isActive } = params;
      if (!id) throw new Error('id is required');
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (latitude !== undefined) updates.latitude = latitude;
      if (longitude !== undefined) updates.longitude = longitude;
      if (radiusMeters !== undefined) updates.radius_meters = radiusMeters;
      if (isActive !== undefined) updates.is_active = isActive;
      const { error } = await supabaseCli.from('geofences').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Geofence updated' };
    }
    case 'geofences.delete': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const { id } = params;
      if (!id) throw new Error('id is required');
      const { error } = await supabaseCli.from('geofences').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Geofence deleted' };
    }
    case 'geofences.check': {
      // Check which geofences a point falls within
      const { latitude, longitude } = params;
      if (latitude == null || longitude == null) throw new Error('latitude and longitude required');
      const { data: fences } = await supabaseCli.from('geofences').select('*').eq('is_active', true);
      const results = (fences ?? []).map((f: any) => {
        const R = 6371000;
        const dLat = (f.latitude - latitude) * Math.PI / 180;
        const dLng = (f.longitude - longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(latitude * Math.PI / 180) * Math.cos(f.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { id: f.id, name: f.name, distance_meters: Math.round(dist), is_within: dist <= f.radius_meters, radius_meters: f.radius_meters };
      });
      return { data: results };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
