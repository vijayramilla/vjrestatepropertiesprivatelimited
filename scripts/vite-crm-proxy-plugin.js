const REQ_URL = process.env.VITE_SUPABASE_REQ_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const REQ_KEY = process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? '';
const CLI_URL = process.env.VITE_SUPABASE_URL ?? 'https://qrlkicsxnhaplwkotnyd.supabase.co';
const CLI_KEY = process.env.VITE_SUPABASE_CLI_SERVICE_KEY ?? '';
const CLI_ANON = process.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_eFTxpapkZXJfw9mMG-leww_U-un-VHt';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyAou136n9rrUnlabvQl22BvdHYzuhbwsKs';
const ADMIN_EMAILS = ['vijaykodamasuru2023@gmail.com', 'vijay@vjrestate.in', 'vijayramv229@gmail.com'];
const SUPER_ADMIN_DISPLAY_NAMES = {
  'vijayramv229@gmail.com': 'Vijay Ram',
  'vijaykodamasuru2023@gmail.com': 'Vijay Kodamasuru',
  'vijay@vjrestate.in': 'Vijay Ram',
};

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
      let dbRow = null;
      try { const r = await supabaseFetch('GET', `admin_users?email=eq.${encodeURIComponent(_auth.email)}&select=id,email,display_name,role,permissions`, null); dbRow = r.data?.[0] ?? null; } catch {}
      return { data: dbRow, email: _auth.email, role: _auth.role ?? null, permissions: _auth.permissions ?? null };
    }
    case 'admin.list': {
      if (!params._auth?.authorized) throw new Error('Forbidden');
      let rows = [];
      if (params._auth.role === 'super_admin') {
        try {
          const { data } = await supabaseFetch('GET', 'admin_users?select=id,email,display_name,role,permissions', null);
          rows = (data ?? []).filter((a) => a?.email);
        } catch {}
      }
      return { data: [...buildSuperAdminRows(), ...rows] };
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
      const { data } = await supabaseFetch('GET', `admin_users?email=eq.${encodeURIComponent(email)}&select=id,email,display_name,role,permissions`, null);
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
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export default function crmProxyPlugin() {
  return {
    name: 'crm-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/api/crm-proxy') return next();

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
