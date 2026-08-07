import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import type { Lead, PaginatedResponse, Agent, FollowUp, SiteVisit, ActivityLog, LeadNote } from '@/types/lead';
import type { SheetClient } from '@/data/crmClientsData';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const PROXY_URL = `${API_BASE}/crm-proxy`;

async function callProxy(action: string, params?: Record<string, unknown>): Promise<any> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action, params: params ?? {} }),
  });
  const text = await res.text();
  let body: any = {};
  if (text) { try { body = JSON.parse(text); } catch { body = {}; } }
  if (!res.ok) throw new Error(body?.error ?? 'Request failed');
  return body;
}

function mapLead(row: any): Lead {
  return {
    _id: row.id,
    leadId: row.lead_id ?? '',
    name: row.name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    leadSource: row.lead_source ?? '',
    status: row.status ?? 'New Lead',
    priority: row.priority ?? 'Medium',
    assignedAgent: row.assignedAgent
      ? { _id: row.assignedAgent._id ?? row.assignedAgent.id, name: row.assignedAgent.name ?? '', email: row.assignedAgent.email ?? '' }
      : (row.assigned_agent ? { _id: row.assigned_agent, name: '', email: '' } : null),
    requirement: row.requirement ?? { selfPurchase: '', propertyType: '', preferredLocation: '', budget: '', paymentMode: '', timeline: '', specialRequirements: '' },
    notes: (row.notes ?? []) as LeadNote[],
    followUps: [],
    siteVisits: [],
    activityHistory: [],
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

function mapAgent(row: any): Agent {
  return { _id: row.id, name: row.name ?? '', email: row.email ?? '', phone: row.phone ?? '', active: row.active ?? true };
}

function mapFollowUp(row: any): FollowUp {
  return { _id: row.id, lead: row.lead_id ?? '', scheduledAt: row.scheduled_at ?? '', note: row.note ?? '', status: row.status ?? 'pending', createdBy: row.created_by ?? '', createdAt: row.created_at ?? '' };
}

function mapSiteVisit(row: any): SiteVisit {
  return { _id: row.id, lead: row.lead_id ?? '', visitedAt: row.visited_at ?? '', location: row.location ?? '', note: row.note ?? '', outcome: row.outcome ?? '', createdBy: row.created_by ?? '', createdAt: row.created_at ?? '' };
}

function mapActivityLog(row: any): ActivityLog {
  return { _id: row.id, lead: row.lead_id ?? '', action: row.action ?? '', description: row.description ?? '', performedBy: row.performed_by ?? '', createdAt: row.created_at ?? '' };
}

function normalizeClient(row: any): SheetClient {
  return {
    sno: row.sno ?? 0,
    name: row.name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    type: row.type ?? '',
    budget: row.budget ?? '',
    budget_val: row.budget_val ?? 0,
    location: row.location ?? '',
    closed_price: row.closed_price ?? '',
    closing_timeline: row.closing_timeline ?? '',
    requirements: row.requirements ?? '',
    status: row.status ?? 'New Lead',
    date: row.date ?? null,
    notes: row.notes ?? '',
    buyer_comm_pct: row.buyer_comm_pct ?? '',
    buyer_comm_val: row.buyer_comm_val ?? '',
    seller_comm_pct: row.seller_comm_pct ?? '',
    seller_comm_val: row.seller_comm_val ?? '',
    total_comm: row.total_comm ?? '',
    paid_comm: row.paid_comm ?? '',
    comm_status: row.comm_status ?? '',
    my_share: row.my_share ?? '',
    source: row.source ?? '',
    client_role: row.client_role ?? 'Buyer',
    property_link: row.property_link ?? '',
    comm_date: row.comm_date ?? null,
    property_subtype: row.property_subtype ?? '',
  };
}

export const leadSupabase = {
  async list(params?: {
    search?: string; status?: string; priority?: string; source?: string; agent?: string;
    sortBy?: string; sortOrder?: string; page?: number; limit?: number;
  }): Promise<PaginatedResponse<Lead>> {
    const res = await callProxy('list', params);
    return {
      data: (res.data ?? []).map(mapLead),
      pagination: res.pagination,
    };
  },

  async get(id: string): Promise<{ data: Lead }> {
    const res = await callProxy('get', { id });
    const lead = mapLead(res.data);
    lead.followUps = (res.followUps ?? []).map(mapFollowUp);
    lead.siteVisits = (res.siteVisits ?? []).map(mapSiteVisit);
    lead.activityHistory = (res.activityHistory ?? []).map(mapActivityLog);
    if (res.assignedAgent) {
      lead.assignedAgent = { _id: res.assignedAgent.id, name: res.assignedAgent.name ?? '', email: res.assignedAgent.email ?? '' };
    }
    return { data: lead };
  },

  async update(id: string, body: Record<string, unknown> & { performedBy?: string }): Promise<{ data: Lead }> {
    await callProxy('update', { id, ...body });
    return this.get(id);
  },

  async remove(id: string, performedBy?: string): Promise<{ message: string }> {
    return callProxy('remove', { id, performedBy });
  },

  async updateStatus(id: string, status: string, performedBy?: string): Promise<{ data: Lead }> {
    await callProxy('updateStatus', { id, status, performedBy });
    return this.get(id);
  },

  async assignAgent(id: string, agentId: string | null, performedBy?: string): Promise<{ data: Lead }> {
    await callProxy('assignAgent', { id, agentId, performedBy });
    return this.get(id);
  },

  async addNote(id: string, text: string, addedBy?: string): Promise<{ data: LeadNote[] }> {
    return callProxy('addNote', { id, text, addedBy });
  },

  async getActivities(id: string): Promise<{ data: ActivityLog[] }> {
    const res = await callProxy('getActivities', { id });
    return { data: (res.data ?? []).map(mapActivityLog) };
  },

  async getSources(): Promise<{ data: string[] }> {
    return callProxy('getSources', {});
  },

  agents: {
    async list(): Promise<{ data: Agent[] }> {
      const res = await callProxy('agents.list', {});
      return { data: (res.data ?? []).map(mapAgent) };
    },
    async create(name: string, email?: string, phone?: string): Promise<{ data: Agent }> {
      const res = await callProxy('agents.create', { name, email, phone });
      return { data: mapAgent(res.data) };
    },
    async update(id: string, body: Partial<Agent>): Promise<{ data: Agent }> {
      const res = await callProxy('agents.update', { id, ...body });
      return { data: mapAgent(res.data) };
    },
    async delete(id: string): Promise<{ message: string }> {
      return callProxy('agents.delete', { id });
    },
  },

  admin: {
    async verify(): Promise<{ data: { id?: string; email?: string; display_name?: string; role?: string; permissions?: string[]; avatar_url?: string; created_at?: string } | null; email: string; role?: string; permissions?: string[] }> {
      return callProxy('admin.verify', {});
    },
    async updateAvatar(email: string, avatarUrl: string): Promise<{ message: string }> {
      return callProxy('admin.updateAvatar', { email, avatarUrl });
    },
    async list(): Promise<{ data: any[] }> {
      return callProxy('admin.list', {});
    },
    async add(email: string, displayName?: string, permissions?: string[]): Promise<{ message: string }> {
      return callProxy('admin.add', { email, displayName, permissions });
    },
    async remove(email: string): Promise<{ message: string }> {
      return callProxy('admin.remove', { email });
    },
    async update(email: string, body: Record<string, unknown>): Promise<{ data: any }> {
      return callProxy('admin.update', { email, ...body });
    },
  },

  // Database stats (calls RPC functions on the server)
  async getTableStats(): Promise<{ data: any[] }> {
    return callProxy('rpc', { fn: 'get_table_stats' });
  },
  async getDbStats(): Promise<{ data: any[] }> {
    return callProxy('rpc', { fn: 'get_db_stats' });
  },

  followUps: {
    async list(leadId?: string): Promise<{ data: FollowUp[] }> {
      const res = await callProxy('followUps.list', { leadId });
      return { data: (res.data ?? []).map(mapFollowUp) };
    },
    async create(leadId: string, scheduledAt: string, note?: string, createdBy?: string): Promise<{ data: FollowUp }> {
      const res = await callProxy('followUps.create', { leadId, scheduledAt, note, createdBy });
      return { data: mapFollowUp(res.data) };
    },
    async update(id: string, status: string): Promise<{ data: FollowUp }> {
      const res = await callProxy('followUps.update', { id, status });
      return { data: mapFollowUp(res.data) };
    },
  },

  employees: {
    async list(params?: { search?: string; department?: string; status?: string; sortBy?: string; sortOrder?: string }): Promise<{ data: any[]; stats: { total: number; active: number; onLeave: number; newThisMonth: number } }> {
      return callProxy('employees.list', params);
    },
    async get(id: string): Promise<{ data: any; history: any[]; attendance: any[]; leaves: any[]; payroll: any[] }> {
      return callProxy('employees.get', { id });
    },
    async create(fields: Record<string, unknown>): Promise<{ data: any }> {
      return callProxy('employees.create', fields);
    },
    async update(id: string, fields: Record<string, unknown>): Promise<{ data: any }> {
      return callProxy('employees.update', { id, ...fields });
    },
    async delete(id: string): Promise<{ message: string }> {
      return callProxy('employees.delete', { id });
    },
    async history(employeeId: string): Promise<{ data: any[] }> {
      return callProxy('employees.history', { employeeId });
    },
    async addHistory(employeeId: string, eventType: string, title: string, description?: string, eventDate?: string): Promise<{ data: any }> {
      return callProxy('employees.addHistory', { employeeId, eventType, title, description, eventDate });
    },
    async attendance(employeeId: string, month: number, year: number): Promise<{ data: any[] }> {
      return callProxy('employees.attendance', { employeeId, month, year });
    },
    async setAttendance(employeeId: string, date: string, checkIn?: string, checkOut?: string, status?: string, notes?: string): Promise<{ message: string }> {
      return callProxy('employees.setAttendance', { employeeId, date, checkIn, checkOut, status, notes });
    },
    async leaves(employeeId: string): Promise<{ data: any[] }> {
      return callProxy('employees.leaves', { employeeId });
    },
    async applyLeave(employeeId: string, leaveType: string, startDate: string, endDate: string, reason?: string): Promise<{ data: any }> {
      return callProxy('employees.applyLeave', { employeeId, leaveType, startDate, endDate, reason });
    },
    async approveLeave(id: string): Promise<{ message: string }> {
      return callProxy('employees.approveLeave', { id });
    },
    async rejectLeave(id: string): Promise<{ message: string }> {
      return callProxy('employees.rejectLeave', { id });
    },
    async payroll(employeeId: string): Promise<{ data: any[] }> {
      return callProxy('employees.payroll', { employeeId });
    },
    async generatePayroll(employeeId: string, month: number, year: number): Promise<{ data: any }> {
      return callProxy('employees.generatePayroll', { employeeId, month, year });
    },
    async markPaid(id: string, paymentDate?: string): Promise<{ message: string }> {
      return callProxy('employees.markPaid', { id, paymentDate });
    },
    async maxEmployeeId(): Promise<{ data: string | null }> {
      return callProxy('employees.maxEmployeeId', {});
    },
  },

  crmClients: {
    async list(): Promise<{ data: SheetClient[] }> {
      try {
        const res = await callProxy('crmClients.list', {});
        if (res.data && res.data.length > 0) return { data: res.data.map(normalizeClient) };
      } catch { /* proxy unavailable, fall back to direct read */ }
      try {
        const { data, error } = await supabase.from('crm_clients').select('*').order('sno', { ascending: true });
        if (!error && data && data.length > 0) return { data: (data as unknown as SheetClient[]).map(normalizeClient) };
      } catch { /* direct read unavailable */ }
      return { data: [] };
    },
    async upsert(client: SheetClient): Promise<{ data: SheetClient }> {
      return callProxy('crmClients.upsert', { data: client });
    },
    async delete(sno: number): Promise<{ message: string }> {
      return callProxy('crmClients.delete', { sno });
    },
    async maxSno(): Promise<{ data: number }> {
      try {
        const res = await callProxy('crmClients.maxSno', {});
        if (res.data !== undefined) return res;
      } catch { /* proxy unavailable, fall back to direct read */ }
      try {
        const { data } = await supabase.from('crm_clients').select('sno').order('sno', { ascending: false }).limit(1);
        return { data: data?.[0]?.sno ?? 0 };
      } catch { /* direct read unavailable */ }
      return { data: 0 };
    },
  },

  siteVisits: {
    async list(leadId?: string): Promise<{ data: SiteVisit[] }> {
      const res = await callProxy('siteVisits.list', { leadId });
      return { data: (res.data ?? []).map(mapSiteVisit) };
    },
    async create(leadId: string, visitedAt: string, location?: string, note?: string, outcome?: string, createdBy?: string): Promise<{ data: SiteVisit }> {
      const res = await callProxy('siteVisits.create', { leadId, visitedAt, location, note, outcome, createdBy });
      return { data: mapSiteVisit(res.data) };
    },
  },
};
