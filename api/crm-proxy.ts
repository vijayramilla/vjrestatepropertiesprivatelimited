import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_REQ_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co',
  process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? '',
);

const supabaseCli = createClient(
  'https://qrlkicsxnhaplwkotnyd.supabase.co',
  'sb_publishable_eFTxpapkZXJfw9mMG-leww_U-un-VHt',
);

const ADMIN_EMAILS = ['vijaykodamasuru2023@gmail.com', 'vijay@vjrestate.in', 'vijayramv229@gmail.com'];
const SUPER_ADMIN_DISPLAY_NAMES: Record<string, string> = {
  'vijayramv229@gmail.com': 'Vijay Ram',
  'vijaykodamasuru2023@gmail.com': 'Vijay Kodamasuru',
  'vijay@vjrestate.in': 'Vijay Ram',
};
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyAou136n9rrUnlabvQl22BvdHYzuhbwsKs';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isSuperAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

async function verifyToken(token: string): Promise<{ authorized: boolean; email: string; role?: string; permissions?: string[] | null }> {
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
    const { data: admins, error } = await supabaseAdmin.from('admin_users').select('id,role,permissions').eq('email', normalized);
    if (!error && admins?.length > 0) return { authorized: true, email: normalized, role: admins[0].role, permissions: admins[0].permissions };
    return { authorized: false, email };
  } catch {
    return { authorized: false, email: '' };
  }
}

function hasPerm(auth: any, perm: string): boolean {
  if (!auth?.authorized) return false;
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
    console.error('Proxy error:', e);
    return res.status(500).json({ error: e.message ?? 'Internal error' });
  }
}

async function executeAction(action: string, params: any): Promise<any> {
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
      let agentMap: Record<string, any> = {};
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
      try { const { data } = await supabaseAdmin.from('agents').select('*'); agents = data ?? []; } catch {}
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
      let dbRow = null;
      try { const { data } = await supabaseAdmin.from('admin_users').select('id,email,display_name,role,permissions,created_at').eq('email', _auth.email).maybeSingle(); dbRow = data ?? null; } catch {}
      const role = _auth.role ?? null;
      const permissions = _auth.permissions ?? null;
      return { data: dbRow, email: _auth.email, role, permissions };
    }
    case 'admin.list': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      let rows: any[] = [];
      if (params._auth.role === 'super_admin') {
        try { const { data } = await supabaseAdmin.from('admin_users').select('id,email,display_name,role,permissions,created_at'); rows = (data ?? []).filter((a: { email: string }) => a?.email); } catch (e) { console.error('[crm-proxy] admin.list: failed to load admin_users (is VITE_SUPABASE_REQ_SERVICE_KEY set?)', e); }
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
      return { data: data ?? [] };
    }
    case 'crmClients.upsert': {
      if (!hasPerm(params._auth, 'clients.view')) throw new Error('Forbidden');
      const client = params.data ?? params;
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
      const { search, department, status, sortBy, sortOrder } = params;
      let query = supabaseCli.from('employees').select('*', { count: 'exact' });
      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`);
      if (department) query = query.eq('department', department);
      if (status) query = query.eq('status', status);
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
      const { _auth, ...fields } = params;
      const payload: Record<string, unknown> = {};
      if (fields.employeeId) payload.employee_id = fields.employeeId;
      if (fields.name) payload.name = fields.name;
      if (fields.email) payload.email = fields.email;
      if (fields.phone) payload.phone = fields.phone;
      if (fields.designation) payload.designation = fields.designation;
      if (fields.department) payload.department = fields.department;
      if (fields.joiningDate) payload.joining_date = fields.joiningDate;
      if (fields.status) payload.status = fields.status;
      if (fields.salary) payload.salary = fields.salary;
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
      const { data, error } = await supabaseCli.from('employees').insert(payload).select().single();
      if (error) throw new Error(error.message);
      if (data?.id) {
        await supabaseCli.from('employee_history').insert({ employee_id: data.id, event_type: 'joined', title: 'Joined', description: `${data.name} joined as ${data.designation || 'employee'}`, event_date: data.joining_date, created_by: _auth.email });
      }
      return { data };
    }
    case 'employees.update': {
      const { id, _auth, ...fields } = params;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.email !== undefined) updates.email = fields.email;
      if (fields.phone !== undefined) updates.phone = fields.phone;
      if (fields.designation !== undefined) updates.designation = fields.designation;
      if (fields.department !== undefined) updates.department = fields.department;
      if (fields.joiningDate !== undefined) updates.joining_date = fields.joiningDate;
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.salary !== undefined) updates.salary = fields.salary;
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
      const { error } = await supabaseCli.from('employees').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
      if (fields.addHistory) {
        await supabaseCli.from('employee_history').insert({ employee_id: id, event_type: fields.historyType ?? 'updated', title: fields.historyTitle ?? 'Updated', description: fields.historyDesc ?? '', created_by: _auth.email });
      }
      const { data } = await supabaseCli.from('employees').select('*').eq('id', id).single();
      return { data };
    }
    case 'employees.delete': {
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
      const { employeeId } = params;
      const { data, error } = await supabaseCli.from('employee_history').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }
    case 'employees.addHistory': {
      const { employeeId, eventType, title, description, eventDate, createdBy } = params;
      const { data, error } = await supabaseCli.from('employee_history').insert({ employee_id: employeeId, event_type: eventType ?? 'note', title: title ?? '', description: description ?? '', event_date: eventDate ?? new Date().toISOString().split('T')[0], created_by: createdBy ?? '' }).select().single();
      if (error) throw new Error(error.message);
      return { data };
    }
    case 'employees.attendance': {
      const { employeeId, month, year } = params;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      const { data, error } = await supabaseCli.from('employee_attendance').select('*').eq('employee_id', employeeId).gte('date', startDate).lte('date', endDate).order('date', { ascending: true });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }
    case 'employees.setAttendance': {
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
      const { employeeId } = params;
      const { data, error } = await supabaseCli.from('employee_leaves').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }
    case 'employees.applyLeave': {
      const { employeeId, leaveType, startDate, endDate, reason, createdBy } = params;
      const { data, error } = await supabaseCli.from('employee_leaves').insert({ employee_id: employeeId, leave_type: leaveType ?? '', start_date: startDate, end_date: endDate, reason: reason ?? '', created_by: createdBy ?? '' }).select().single();
      if (error) throw new Error(error.message);
      await supabaseCli.from('employee_history').insert({ employee_id: employeeId, event_type: 'leave', title: `${leaveType} Leave`, description: `${leaveType} leave from ${startDate} to ${endDate}`, created_by: createdBy });
      return { data };
    }
    case 'employees.approveLeave': {
      const { id, approvedBy } = params;
      const { error } = await supabaseCli.from('employee_leaves').update({ status: 'Approved', approved_by: approvedBy ?? '' }).eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Leave approved' };
    }
    case 'employees.rejectLeave': {
      const { id } = params;
      const { error } = await supabaseCli.from('employee_leaves').update({ status: 'Rejected' }).eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Leave rejected' };
    }
    case 'employees.payroll': {
      const { employeeId } = params;
      const { data, error } = await supabaseCli.from('employee_payroll').select('*').eq('employee_id', employeeId).order('year', { ascending: false }).order('month', { ascending: false });
      if (error) throw new Error(error.message);
      return { data: data ?? [] };
    }
    case 'employees.generatePayroll': {
      const { employeeId, month, year, createdBy } = params;
      const { data: emp } = await supabaseCli.from('employees').select('salary').eq('id', employeeId).single();
      const salary = emp?.salary ?? 0;
      const basic = Math.round(salary * 0.5);
      const hra = Math.round(salary * 0.2);
      const allowances = Math.round(salary * 0.2);
      const deductions = Math.round(salary * 0.1);
      const net = salary - deductions;
      const { data, error } = await supabaseCli.from('employee_payroll').insert({
        employee_id: employeeId, month, year, basic_pay: basic, hra, allowances, deductions, net_pay: net, status: 'Pending',
      }).select().single();
      if (error) throw new Error(error.message);
      await supabaseCli.from('employee_history').insert({
        employee_id: employeeId, event_type: 'payroll', title: `Payroll ${month}/${year}`, description: `Payroll generated: ₹${net.toLocaleString()}`, created_by: createdBy,
      });
      return { data };
    }
    case 'employees.markPaid': {
      const { id, paymentDate } = params;
      const { error } = await supabaseCli.from('employee_payroll').update({ status: 'Paid', payment_date: paymentDate ?? new Date().toISOString().split('T')[0] }).eq('id', id);
      if (error) throw new Error(error.message);
      return { message: 'Payroll marked as paid' };
    }
    case 'employees.maxEmployeeId': {
      const { data, error } = await supabaseCli.from('employees').select('employee_id').order('employee_id', { ascending: false }).limit(1);
      if (error) throw new Error(error.message);
      return { data: data?.[0]?.employee_id ?? null };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
