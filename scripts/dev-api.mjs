import http from 'node:http';
import { VASTU_EXTRACTION_PROMPT, vastuBrain } from '../src/data/vastuBrain.ts';

const PORT = 3001;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SUPABASE_URL = 'https://eimvaxrmiizdlgonhiov.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_REQ_SERVICE_KEY || '';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || '';
const ADMIN_EMAILS = ['vijaykodamasuru2023@gmail.com', 'vijay@vjrestate.in'];

async function verifyFirebaseToken(token) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return ADMIN_EMAILS.includes(data.users?.[0]?.email ?? '');
  } catch { return false; }
}

async function supabaseFetch(method, path, body) {
  const opts = { method, headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  const data = method === 'DELETE' ? null : await res.json();
  if (!res.ok) throw new Error(data?.message || `Supabase error: ${res.status}`);
  const count = res.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
  return { data, count: count ? parseInt(count) : null };
}

async function supabaseRpc(fn, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'apikey': SUPABASE_SERVICE_KEY },
    body: JSON.stringify(args ?? {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `RPC error: ${res.status}`);
  return data;
}

async function handleCrmProxy(req, res) {
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) { res.writeHead(401); res.end(JSON.stringify({ error: 'Missing authorization' })); return; }

  const valid = await verifyFirebaseToken(token);
  if (!valid) { res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }

  let bodyStr = '';
  for await (const chunk of req) bodyStr += chunk;
  let body;
  try { body = JSON.parse(bodyStr); } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })); return; }

  const { action, params = {} } = body;
  if (!action) { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing action' })); return; }

  try {
    const result = await executeAction(action, params);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (e) {
    console.error('CRM proxy error:', e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message ?? 'Internal error' }));
  }
}

async function executeAction(action, params) {
  switch (action) {
    case 'list': {
      const { search, status, priority, source, agent, sortBy, sortOrder, page = 1, limit = 15 } = params;

      let queryParts = [];
      if (search) queryParts.push(`or=(name.ilike.%25${encodeURIComponent(search)}%25,phone.ilike.%25${encodeURIComponent(search)}%25,lead_id.ilike.%25${encodeURIComponent(search)}%25)`);
      if (status) queryParts.push(`status=eq.${encodeURIComponent(status)}`);
      if (priority) queryParts.push(`priority=eq.${encodeURIComponent(priority)}`);
      if (source) queryParts.push(`lead_source=eq.${encodeURIComponent(source)}`);
      if (agent) queryParts.push(`assigned_agent=eq.${encodeURIComponent(agent)}`);
      queryParts.push('deleted_at=is.null');

      const sortCol = sortBy === 'leadId' ? 'lead_id' : sortBy === 'leadSource' ? 'lead_source' : sortBy === 'createdAt' ? 'created_at' : 'created_at';
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      queryParts.push(`order=${sortCol}.${order}`);
      queryParts.push(`limit=${limit}`);
      queryParts.push(`offset=${(page - 1) * limit}`);

      const qs = queryParts.join('&');
      const { data, count } = await supabaseFetch('GET', `leads?${qs}`, null);
      const total = count ?? data?.length ?? 0;
      return { data: data ?? [], pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    case 'get': {
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
      if (performedBy) {
        await supabaseFetch('POST', 'activity_logs', { lead_id: id, action: 'lead_updated', description: 'Lead updated', performed_by: performedBy });
      }
      return { id };
    }

    case 'remove': {
      const { id, performedBy } = params;
      await supabaseFetch('PATCH', `leads?id=eq.${id}`, { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (performedBy) {
        await supabaseFetch('POST', 'activity_logs', { lead_id: id, action: 'lead_deleted', description: 'Lead deleted', performed_by: performedBy });
      }
      return { message: 'Lead deleted' };
    }

    case 'updateStatus': {
      const { id, status, performedBy } = params;
      await supabaseFetch('PATCH', `leads?id=eq.${id}`, { status, updated_at: new Date().toISOString() });
      if (performedBy) {
        await supabaseFetch('POST', 'activity_logs', { lead_id: id, action: 'status_changed', description: `Status changed to ${status}`, performed_by: performedBy });
      }
      return { id };
    }

    case 'assignAgent': {
      const { id, agentId, performedBy } = params;
      await supabaseFetch('PATCH', `leads?id=eq.${id}`, { assigned_agent: agentId, updated_at: new Date().toISOString() });
      if (performedBy) {
        await supabaseFetch('POST', 'activity_logs', { lead_id: id, action: 'agent_assigned', description: `Agent ${agentId ? 'assigned' : 'unassigned'}`, performed_by: performedBy });
      }
      return { id };
    }

    case 'addNote': {
      const { id, text, addedBy } = params;
      const existing = await supabaseFetch('GET', `leads?id=eq.${id}&select=notes`, null);
      const notes = [...(existing.data?.[0]?.notes ?? []), { text: text ?? '', addedBy: addedBy ?? '', createdAt: new Date().toISOString() }];
      await supabaseFetch('PATCH', `leads?id=eq.${id}`, { notes, updated_at: new Date().toISOString() });
      if (addedBy) {
        await supabaseFetch('POST', 'activity_logs', { lead_id: id, action: 'note_added', description: 'Note added', performed_by: addedBy });
      }
      return { data: notes };
    }

    case 'getActivities': {
      const { id } = params;
      const { data } = await supabaseFetch('GET', `activity_logs?lead_id=eq.${id}&order=created_at.desc`, null);
      return { data: data ?? [] };
    }

    case 'getSources': {
      const { data } = await supabaseFetch('GET', "leads?select=lead_source&lead_source=not.is.null", null);
      const sources = [...new Set((data ?? []).map(r => r.lead_source).filter(Boolean))];
      return { data: sources };
    }

    case 'agents.list': {
      const { data } = await supabaseFetch('GET', 'agents?active=eq.true&select=*', null);
      return { data: data ?? [] };
    }

    case 'agents.create': {
      const { name, email, phone } = params;
      // POST returns the created row location, we need to fetch it back
      await supabaseFetch('POST', 'agents', { name, email: email ?? '', phone: phone ?? '' });
      // Fetch the most recently created agent by this name
      const { data } = await supabaseFetch('GET', `agents?name=eq.${encodeURIComponent(name)}&order=created_at.desc&limit=1`, null);
      return { data: data?.[0] ?? { id: null, name, email, phone } };
    }

    case 'agents.update': {
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

    case 'followUps.list': {
      const { leadId } = params;
      let path = 'follow_ups?order=scheduled_at.desc';
      if (leadId) path += `&lead_id=eq.${leadId}`;
      const { data } = await supabaseFetch('GET', path, null);
      return { data: data ?? [] };
    }

    case 'followUps.create': {
      const { leadId, scheduledAt, note, createdBy } = params;
      await supabaseFetch('POST', 'follow_ups', { lead_id: leadId, scheduled_at: scheduledAt, note: note ?? '', created_by: createdBy ?? '' });
      const { data } = await supabaseFetch('GET', `follow_ups?lead_id=eq.${leadId}&order=scheduled_at.desc&limit=1`, null);
      if (createdBy) {
        await supabaseFetch('POST', 'activity_logs', { lead_id: leadId, action: 'followup_scheduled', description: 'Follow-up scheduled', performed_by: createdBy });
      }
      return { data: data?.[0] ?? null };
    }

    case 'followUps.update': {
      const { id, status } = params;
      await supabaseFetch('PATCH', `follow_ups?id=eq.${id}`, { status });
      const { data } = await supabaseFetch('GET', `follow_ups?id=eq.${id}&select=*`, null);
      return { data: data?.[0] ?? null };
    }

    case 'siteVisits.list': {
      const { leadId } = params;
      let path = 'site_visits?order=visited_at.desc';
      if (leadId) path += `&lead_id=eq.${leadId}`;
      const { data } = await supabaseFetch('GET', path, null);
      return { data: data ?? [] };
    }

    case 'siteVisits.create': {
      const { leadId, visitedAt, location, note, outcome, createdBy } = params;
      await supabaseFetch('POST', 'site_visits', { lead_id: leadId, visited_at: visitedAt, location: location ?? '', note: note ?? '', outcome: outcome ?? '', created_by: createdBy ?? '' });
      const { data } = await supabaseFetch('GET', `site_visits?lead_id=eq.${leadId}&order=visited_at.desc&limit=1`, null);
      if (createdBy) {
        await supabaseFetch('POST', 'activity_logs', { lead_id: leadId, action: 'site_visit_scheduled', description: `Site visit ${location ? 'at ' + location : 'scheduled'}`, performed_by: createdBy });
      }
      return { data: data?.[0] ?? null };
    }

    case 'rpc': {
      const { fn, args } = params;
      const data = await supabaseRpc(fn, args ?? {});
      return { data };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function handleRequest(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/crm-proxy') {
    return handleCrmProxy(req, res);
  }

  if (req.method !== 'POST' || req.url !== '/api/analyze-vastu') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'OPENROUTER_API_KEY env var not set' }));
    return;
  }

  let bodyStr = '';
  for await (const chunk of req) bodyStr += chunk;

  let body;
  try {
    body = JSON.parse(bodyStr);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }

  const { image, mimeType, northDegrees } = body;
  if (!image || northDegrees === undefined) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'image and northDegrees are required' }));
    return;
  }

  const systemPrompt = VASTU_EXTRACTION_PROMPT.replace('{north_degrees}', String(northDegrees));
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${image}`;

  try {
    const apiRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vjrestate.com',
        'X-Title': 'VJR Estate',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        temperature: 0.1,
        max_tokens: 16384,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Extract all architectural data from this floor plan. North = ${northDegrees}° clockwise from image top. Return ONLY valid JSON matching the specified schema.` },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error('OpenRouter API error:', apiRes.status, err);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'AI extraction failed', detail: err }));
      return;
    }

    const data = await apiRes.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Empty response from AI' }));
      return;
    }

    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const extraction = JSON.parse(cleaned);

    const analysis = vastuBrain.analyze(extraction);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ extraction, analysis }));
  } catch (err) {
    console.error('analyze-vastu error:', err?.message || err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err?.message || 'AI analysis failed' }));
  }
}

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`API dev server running on http://localhost:${PORT}`);
  if (!process.env.OPENROUTER_API_KEY) console.warn('WARNING: OPENROUTER_API_KEY not set.');
});
