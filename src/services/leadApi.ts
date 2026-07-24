import type { Lead, PaginatedResponse, Agent, FollowUp, SiteVisit, ActivityLog, LeadNote } from '@/types/lead';

const API_KEY = import.meta.env.VITE_LEAD_API_KEY ?? 'vjr-lead-webhook-key-2026';
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export const leadApi = {
  list(params?: {
    search?: string;
    status?: string;
    priority?: string;
    source?: string;
    agent?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') q.set(k, String(v));
      });
    }
    return request<PaginatedResponse<Lead>>(`/leads?${q.toString()}`);
  },

  get(id: string) {
    return request<{ data: Lead }>(`/leads/${id}`);
  },

  update(id: string, body: Partial<Lead> & { performedBy?: string }) {
    return request<{ data: Lead }>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },

  remove(id: string, performedBy?: string) {
    return request<{ message: string }>(`/leads/${id}`, { method: 'DELETE', body: JSON.stringify({ performedBy }) });
  },

  updateStatus(id: string, status: string, performedBy?: string) {
    return request<{ data: Lead }>(`/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, performedBy }),
    });
  },

  assignAgent(id: string, agentId: string | null, performedBy?: string) {
    return request<{ data: Lead }>(`/leads/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ agentId, performedBy }),
    });
  },

  addNote(id: string, text: string, addedBy?: string) {
    return request<{ data: LeadNote[] }>(`/leads/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text, addedBy }),
    });
  },

  getActivities(id: string) {
    return request<{ data: ActivityLog[] }>(`/leads/${id}/activities`);
  },

  getSources() {
    return request<{ data: string[] }>('/leads/sources');
  },

  agents: {
    list() {
      return request<{ data: Agent[] }>('/agents');
    },
    create(name: string, email?: string, phone?: string) {
      return request<{ data: Agent }>('/agents', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone }),
      });
    },
    update(id: string, body: Partial<Agent>) {
      return request<{ data: Agent }>(`/agents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
  },

  followUps: {
    list(leadId?: string) {
      const q = leadId ? `?lead=${leadId}` : '';
      return request<{ data: FollowUp[] }>(`/followups${q}`);
    },
    create(leadId: string, scheduledAt: string, note?: string, createdBy?: string) {
      return request<{ data: FollowUp }>('/followups', {
        method: 'POST',
        body: JSON.stringify({ leadId, scheduledAt, note, createdBy }),
      });
    },
    update(id: string, status: string) {
      return request<{ data: FollowUp }>(`/followups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  },

  siteVisits: {
    list(leadId?: string) {
      const q = leadId ? `?lead=${leadId}` : '';
      return request<{ data: SiteVisit[] }>(`/site-visits${q}`);
    },
    create(leadId: string, visitedAt: string, location?: string, note?: string, outcome?: string, createdBy?: string) {
      return request<{ data: SiteVisit }>('/site-visits', {
        method: 'POST',
        body: JSON.stringify({ leadId, visitedAt, location, note, outcome, createdBy }),
      });
    },
  },
};
