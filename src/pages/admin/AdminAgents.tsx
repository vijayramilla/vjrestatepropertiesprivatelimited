import { useEffect, useState, useCallback, useMemo } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Agent, Lead } from '@/types/lead';
import { Search, RefreshCw, Plus, Pencil, Power, PowerOff, UserCog, Trash2, Phone, Mail, ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'New Lead': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Contacted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Property Shared': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Site Visit Scheduled': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Negotiation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Booked: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Closed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function statusBreakdown(leads: Lead[]): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const l of leads) {
    counts[l.status] = (counts[l.status] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => {
      const order = ['New Lead', 'Contacted', 'Property Shared', 'Site Visit Scheduled', 'Negotiation', 'Booked', 'Closed', 'Lost'];
      return order.indexOf(a) - order.indexOf(b);
    })
    .map(([label, count]) => ({ label, count }));
}

export default function AdminAgents() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [perms, setPerms] = useState<string[] | null>(null);

  const canEdit = perms === null || perms.length === 0 || perms.includes('agents.edit');

  useEffect(() => {
    leadSupabase.admin.verify().then(p => setPerms(p.permissions ?? null)).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [agRes, ldRes] = await Promise.all([
        leadSupabase.agents.list(),
        leadSupabase.list({ limit: 9999 }),
      ]);
      setAgents(agRes.data);
      setLeads(ldRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const leadsByAgent = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const l of leads) {
      const agentId = l.assignedAgent?._id;
      if (agentId) {
        if (!map[agentId]) map[agentId] = [];
        map[agentId].push(l);
      }
    }
    return map;
  }, [leads]);

  const unassignedLeads = useMemo(() => {
    return leads.filter(l => !l.assignedAgent?._id);
  }, [leads]);

  const filtered = useMemo(() => {
    if (!search) return agents;
    const q = search.toLowerCase();
    return agents.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.phone.includes(q)
    );
  }, [agents, search]);

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openAdd() {
    setEditAgent(null);
    setForm({ name: '', email: '', phone: '' });
    setModalOpen(true);
  }

  function openEdit(agent: Agent) {
    setEditAgent(agent);
    setForm({ name: agent.name, email: agent.email, phone: agent.phone ?? '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editAgent) {
        await leadSupabase.agents.update(editAgent._id, form);
      } else {
        await leadSupabase.agents.create(form.name, form.email, form.phone);
      }
      setModalOpen(false);
      setEditAgent(null);
      setForm({ name: '', email: '', phone: '' });
      await fetchData();
    } catch (err) {
      console.error('Failed to save agent:', err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(agent: Agent) {
    try {
      await leadSupabase.agents.update(agent._id, { active: !agent.active });
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    }
  }

  async function handleDelete(agent: Agent) {
    if (!confirm(`Delete agent "${agent.name}"? This will unassign their leads.`)) return;
    setDeleting(agent._id);
    try {
      await leadSupabase.agents.delete(agent._id);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete agent:', err);
    } finally {
      setDeleting(null);
    }
  }

  const totalAssigned = Object.values(leadsByAgent).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground font-['Manrope',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 p-8 pb-16 max-sm:p-4 overflow-y-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-200/30 shrink-0">
              <UserCog className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="font-['Fraunces',serif] text-[22px] sm:text-[28px] font-semibold tracking-tight m-0">Agents</h1>
              <p className="text-muted-foreground text-[12px] sm:text-[13.5px] mt-0.5">
                {agents.length} agents &middot; {totalAssigned} assigned requirements &middot; {unassignedLeads.length} unassigned
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={fetchData} className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-4 sm:py-2.5 rounded-full border border-border text-xs font-bold text-muted-foreground bg-card hover:bg-accent transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            {canEdit && (
              <button onClick={openAdd} className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-4 sm:py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-emerald-200/30">
                <Plus className="w-4 h-4" /> Add Agent
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents by name, email, or phone..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Loading agents...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">No agents found</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((agent) => {
              const agentLeads = leadsByAgent[agent._id] ?? [];
              const breakdown = statusBreakdown(agentLeads);
              const isExpanded = expanded.has(agent._id);

              return (
                <div key={agent._id} className="bg-card border border-border/60 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-4 px-5 py-4">
                    <button
                      onClick={() => toggleExpanded(agent._id)}
                      className="p-1 rounded-md text-muted-foreground hover:bg-accent transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {initials(agent.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm truncate">{agent.name}</div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{agent.email || '—'}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{agent.phone || '—'}</span>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2.5">
                      {breakdown.slice(0, 4).map(({ label, count }) => (
                        <span key={label} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[label] || 'bg-gray-100 text-gray-600'}`}>
                          {count} {label}
                        </span>
                      ))}
                      {breakdown.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{breakdown.length - 4} more</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        agent.active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {agent.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit ? (
                        <>
                          <button onClick={() => openEdit(agent)} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Edit agent">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleActive(agent)} className={`p-1.5 rounded-md transition-colors ${
                            agent.active
                              ? 'text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
                              : 'text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20'
                          }`} title={agent.active ? 'Deactivate' : 'Activate'}>
                            {agent.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => handleDelete(agent)} disabled={deleting === agent._id}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete agent">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/40">
                      <div className="sm:hidden flex flex-wrap gap-1.5 px-5 py-3 border-b border-border/30">
                        {breakdown.map(({ label, count }) => (
                          <span key={label} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[label] || 'bg-gray-100 text-gray-600'}`}>
                            {count} {label}
                          </span>
                        ))}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-border/30 bg-muted/30">
                              <th className="text-left text-[10px] uppercase tracking-[1px] text-muted-foreground px-5 py-2.5 font-bold">Client</th>
                              <th className="text-left text-[10px] uppercase tracking-[1px] text-muted-foreground px-5 py-2.5 font-bold hidden sm:table-cell">Phone</th>
                              <th className="text-left text-[10px] uppercase tracking-[1px] text-muted-foreground px-5 py-2.5 font-bold">Status</th>
                              <th className="text-left text-[10px] uppercase tracking-[1px] text-muted-foreground px-5 py-2.5 font-bold hidden sm:table-cell">Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agentLeads.length === 0 ? (
                              <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">No requirements assigned</td></tr>
                            ) : agentLeads.map((lead) => (
                              <tr key={lead._id} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                                <td className="px-5 py-2.5">
                                  <div className="font-medium text-foreground text-[13px]">{lead.name}</div>
                                </td>
                                <td className="px-5 py-2.5 text-muted-foreground text-[12px] hidden sm:table-cell">{lead.phone || '—'}</td>
                                <td className="px-5 py-2.5">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {lead.status}
                                  </span>
                                </td>
                                <td className="px-5 py-2.5 text-muted-foreground text-[11px] hidden sm:table-cell">
                                  {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {unassignedLeads.length > 0 && (
              <div className="bg-card border border-dashed border-border/60 rounded-xl px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted border border-dashed border-border flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">?</div>
                  <div className="flex-1">
                    <div className="font-semibold text-muted-foreground text-sm">Unassigned Requirements</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{unassignedLeads.length} requirements with no agent</div>
                  </div>
                  <a href="/crm/requirements" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 no-underline">Assign</a>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-['Fraunces',serif] text-xl">
              {editAgent ? 'Edit Agent' : 'Add Agent'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1.5">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Agent name"
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1.5">Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="agent@example.com" type="email"
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1.5">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" type="tel"
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground bg-card hover:bg-accent transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 transition-all disabled:opacity-50">
                {saving ? 'Saving...' : editAgent ? 'Update Agent' : 'Add Agent'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
