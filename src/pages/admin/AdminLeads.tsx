import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmBtn, CrmCard, CRM_INPUT, CrmStatCard, CrmStatGrid, CrmChip, MotionReveal } from '@/components/crm/CrmUi';
import type { Lead, Agent } from '@/types/lead';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '@/types/lead';
import { Search, RefreshCw, UserCog, ClipboardList, MapPin, IndianRupee, Phone, X, Sparkles } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'New Lead': 'bg-blue-50 text-blue-700',
  Contacted: 'bg-purple-50 text-purple-700',
  'Property Shared': 'bg-indigo-50 text-indigo-700',
  'Site Visit Scheduled': 'bg-amber-50 text-amber-700',
  Negotiation: 'bg-orange-50 text-orange-700',
  Booked: 'bg-emerald-50 text-emerald-700',
  Closed: 'bg-green-50 text-green-700',
  Lost: 'bg-red-50 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-blue-100 text-blue-600',
  High: 'bg-orange-100 text-orange-600',
  Urgent: 'bg-red-100 text-red-600',
};

const OPEN_STATUSES = ['New Lead', 'Contacted', 'Property Shared', 'Site Visit Scheduled', 'Negotiation'];
const DONE_STATUSES = ['Booked', 'Closed'];

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** Rough numeric value of a budget string ("50L", "1 Cr", "₹75,00,000") for sorting. */
function budgetValue(budget: string | undefined | null): number {
  if (!budget) return 0;
  const cleaned = budget.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  const lower = budget.toLowerCase();
  if (lower.includes('cr')) return num * 10000000;
  if (lower.includes('lakh') || /[0-9]l/.test(lower)) return num * 100000;
  return num;
}

export default function AdminLeads() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [sortKey, setSortKey] = useState('date-new');
  const [agents, setAgents] = useState<Agent[]>([]);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await leadSupabase.list({ limit: 9999 });
      setLeads(res.data);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  useEffect(() => {
    leadSupabase.agents.list().then((res) => setAgents(res.data)).catch(() => {});
  }, []);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { all: leads.length };
    for (const l of leads) m[l.status] = (m[l.status] ?? 0) + 1;
    return m;
  }, [leads]);

  const openCount = leads.filter((l) => OPEN_STATUSES.includes(l.status)).length;
  const doneCount = leads.filter((l) => DONE_STATUSES.includes(l.status)).length;
  const hotCount = leads.filter((l) => l.priority === 'Urgent' || l.priority === 'High').length;
  const hasFilters = Boolean(search || statusFilter || priorityFilter || agentFilter);

  const filtered = useMemo(() => {
    let list = leads.slice();
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.leadId.toLowerCase().includes(q) ||
        (l.email ?? '').toLowerCase().includes(q),
      );
    }
    if (statusFilter) list = list.filter((l) => l.status === statusFilter);
    if (priorityFilter) list = list.filter((l) => l.priority === priorityFilter);
    if (agentFilter) list = list.filter((l) => l.assignedAgent?._id === agentFilter);

    switch (sortKey) {
      case 'date-old':
        list.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
        break;
      case 'budget-high':
        list.sort((a, b) => budgetValue(b.requirement?.budget) - budgetValue(a.requirement?.budget));
        break;
      case 'budget-low':
        list.sort((a, b) => budgetValue(a.requirement?.budget) - budgetValue(b.requirement?.budget));
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default: // date-new
        list.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }
    return list;
  }, [leads, search, statusFilter, priorityFilter, agentFilter, sortKey]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setAgentFilter('');
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Pipeline"
            title="Requirements"
            description={`${leads.length} total leads · ${openCount} open · ${doneCount} closed`}
            actions={
              <CrmBtn variant="ghost" onClick={fetchLeads}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </CrmBtn>
            }
          />

          {/* Pipeline stats — click to filter */}
          <CrmStatGrid>
            <MotionReveal delay={0}>
              <button type="button" onClick={() => setStatusFilter('')} className="block w-full text-left">
                <CrmStatCard icon={<ClipboardList className="h-5 w-5" strokeWidth={1.6} />} label="Total Leads" value={leads.length} subtext="All requirements" tone="navy" />
              </button>
            </MotionReveal>
            <MotionReveal delay={0.05}>
              <button type="button" onClick={() => setStatusFilter('')} className="block w-full text-left">
                <CrmStatCard icon={<Sparkles className="h-5 w-5" strokeWidth={1.6} />} label="Open" value={openCount} subtext="Active pipeline" tone="gold" />
              </button>
            </MotionReveal>
            <MotionReveal delay={0.1}>
              <button type="button" onClick={() => setStatusFilter(DONE_STATUSES.includes(statusFilter) ? '' : 'Booked')} className="block w-full text-left">
                <CrmStatCard icon={<IndianRupee className="h-5 w-5" strokeWidth={1.6} />} label="Booked & Closed" value={doneCount} subtext="Deals done" tone="emerald" />
              </button>
            </MotionReveal>
            <MotionReveal delay={0.15}>
              <button type="button" onClick={() => setPriorityFilter(priorityFilter === 'Urgent' ? '' : 'Urgent')} className="block w-full text-left">
                <CrmStatCard icon={<Sparkles className="h-5 w-5" strokeWidth={1.6} />} label="Hot (High/Urgent)" value={hotCount} subtext="Act now" tone="red" />
              </button>
            </MotionReveal>
          </CrmStatGrid>

          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, email, or lead ID..."
                className={`${CRM_INPUT} pl-9`}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className={`${CRM_INPUT} lg:w-[190px]`}>
                <option value="date-new">Newest first</option>
                <option value="date-old">Oldest first</option>
                <option value="budget-high">Budget: high to low</option>
                <option value="budget-low">Budget: low to high</option>
                <option value="name">Name: A to Z</option>
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={`${CRM_INPUT} lg:w-[150px]`}>
                <option value="">All Priority</option>
                {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className={`${CRM_INPUT} lg:w-[170px]`}>
                <option value="">All Agents</option>
                {agents.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
              {hasFilters && (
                <CrmBtn variant="ghost" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear
                </CrmBtn>
              )}
            </div>
          </div>

          {/* Status chips with counts */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            <CrmChip active={!statusFilter} onClick={() => setStatusFilter('')}>
              All <span className="opacity-60">{statusCounts.all ?? 0}</span>
            </CrmChip>
            {LEAD_STATUSES.map((s) => (
              <CrmChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
                {s} <span className="opacity-60">{statusCounts[s] ?? 0}</span>
              </CrmChip>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.05] bg-white py-16 text-center">
              <ClipboardList className="mx-auto mb-3 h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
              <p className="text-sm font-semibold text-[#0A1628]">No leads found</p>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="mt-2 text-xs font-bold text-[#96782A] hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <MotionReveal>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {filtered.map((lead) => (
                  <CrmCard key={lead._id} onClick={() => navigate(`/crm/requirements/${lead._id}`)} className="p-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0A1628] to-[#1E3852] text-[13px] font-extrabold text-[#D6B85D] shadow-[0_2px_8px_rgba(10,22,40,0.18)]">
                        {initials(lead.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[14px] font-bold text-[#111827]">{lead.name}</p>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>{lead.status}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10.5px]">
                          <span className="font-mono font-medium text-[#96782A]">{lead.leadId}</span>
                          <span className="text-[#C9A84C]/60">·</span>
                          <span className="truncate text-[#9ca3af]">{lead.leadSource || 'Direct'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1.5 text-[12px] text-[#6b7280]">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" strokeWidth={1.5} />
                        <span className="tabular-nums">{lead.phone}</span>
                      </div>
                      {(lead.requirement.propertyType || lead.requirement.preferredLocation) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" strokeWidth={1.5} />
                          <span className="truncate">{[lead.requirement.propertyType, lead.requirement.preferredLocation].filter(Boolean).join(' · ')}</span>
                        </div>
                      )}
                      {lead.requirement.budget && (
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={1.5} />
                          <span className="font-['Inter',sans-serif] font-semibold text-emerald-600">{lead.requirement.budget}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-black/[0.05] pt-3">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[lead.priority] ?? 'bg-gray-100 text-gray-600'}`}>{lead.priority}</span>
                      {lead.assignedAgent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <UserCog className="h-3 w-3" strokeWidth={1.5} />
                          {lead.assignedAgent.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#9ca3af]">Unassigned</span>
                      )}
                      <span className="ml-auto text-[10.5px] text-[#9ca3af]">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                      </span>
                    </div>
                  </CrmCard>
                ))}
              </div>

              <p className="mt-6 text-center text-[11px] tracking-[0.3px] text-[#9ca3af]">
                {filtered.length} of {leads.length} leads shown · auto-refreshes every 30s
              </p>
            </MotionReveal>
          )}
        </CrmPageBody>
      </main>
    </div>
  );
}
