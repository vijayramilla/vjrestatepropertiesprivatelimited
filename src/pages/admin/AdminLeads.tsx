import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import CrmSidebar from '@/components/crm/CrmSidebar';
import type { Lead, LeadStatus, LeadPriority, Agent } from '@/types/lead';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '@/types/lead';
import { Search, RefreshCw, ChevronDown, Users, UserCog } from 'lucide-react';

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

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  High: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  Urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminLeads() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [sources, setSources] = useState<string[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentFilter, setAgentFilter] = useState('');

  const fetchLeads = useCallback(async () => {
    try {
      const res = await leadSupabase.list({
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        agent: agentFilter || undefined,
        sortBy,
        sortOrder,
        limit: 9999,
      });
      setLeads(res.data);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, agentFilter, sortBy, sortOrder]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  useEffect(() => {
    leadSupabase.getSources().then((res) => setSources(res.data)).catch(() => {});
    leadSupabase.agents.list().then((res) => setAgents(res.data)).catch(() => {});
  }, []);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortArrow = (field: string) => {
    if (sortBy !== field) return '';
    return sortOrder === 'desc' ? ' ↓' : ' ↑';
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-['Manrope',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 p-8 pb-16 max-sm:p-4 overflow-y-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-200/30 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="font-['Fraunces',serif] text-[22px] sm:text-[28px] font-semibold tracking-tight m-0">Requirements</h1>
              <p className="text-muted-foreground text-[12px] sm:text-[13.5px] mt-0.5">{leads.length} total leads</p>
            </div>
          </div>
          <button onClick={fetchLeads} className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 sm:px-4 sm:py-2.5 rounded-full border border-border text-xs font-bold text-muted-foreground bg-card hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-blue-400 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-card text-sm outline-none text-muted-foreground"
          >
            <option value="">All Status</option>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-card text-sm outline-none text-muted-foreground"
          >
            <option value="">All Priority</option>
            {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-card text-sm outline-none text-muted-foreground"
          >
            <option value="">All Agents</option>
            {agents.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </div>

        <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {[
                    { key: 'leadId', label: 'Lead ID' },
                    { key: 'name', label: 'Name' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'requirement.propertyType', label: 'Property' },
                    { key: 'requirement.preferredLocation', label: 'Location' },
                    { key: 'requirement.budget', label: 'Budget' },
                    { key: 'status', label: 'Status' },
                    { key: 'priority', label: 'Priority' },
                    { key: 'leadSource', label: 'Source' },
                    { key: 'agent', label: 'Agent' },
                    { key: 'createdAt', label: 'Date' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="text-left text-[10.5px] uppercase tracking-[1px] text-muted-foreground px-4 py-3.5 font-bold cursor-pointer hover:text-foreground whitespace-nowrap"
                    >
                      {col.label}{sortArrow(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-16 text-muted-foreground text-sm">Loading leads...</td></tr>
                ) : leads.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-16 text-muted-foreground text-sm">No leads found</td></tr>
                ) : leads.map((lead) => (
                  <tr
                    key={lead._id}
                    onClick={() => navigate(`/crm/requirements/${lead._id}`)}
                    className="border-b border-border/40 hover:bg-accent/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-blue-600 dark:text-blue-400 font-medium">{lead.leadId}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{lead.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">{lead.requirement.propertyType || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">{lead.requirement.preferredLocation || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.requirement.budget || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10.5px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[lead.status] ?? ''}`}>{lead.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${PRIORITY_COLORS[lead.priority] ?? ''}`}>{lead.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">{lead.leadSource}</td>
                    <td className="px-4 py-3">
                      {lead.assignedAgent ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <UserCog className="w-3 h-3" strokeWidth={1.5} />
                          {lead.assignedAgent.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">{new Date(lead.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
