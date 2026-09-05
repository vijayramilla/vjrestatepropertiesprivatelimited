import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CrmSidebar from '@/components/crm/CrmSidebar';
import {
  CrmBtn, CrmCard, CrmChip, CRM_INPUT, CrmPageBody, CrmPageHeader, CrmStatCard, CrmStatGrid, MotionReveal,
} from '@/components/crm/CrmUi';
import { leadSupabase } from '@/services/leadSupabase';
import { WhatsAppIcon } from '@/components/crm/EmployeeClientsSection';
import {
  CalendarClock, CalendarDays, History, Loader2, MapPin, Phone, Search, Users, X, Copy, Check, Clock, Building2, IndianRupee,
} from 'lucide-react';

const STATUS_META: Record<string, { badge: string; dot: string }> = {
  'Site Visit': { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  'Token Done': { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  'Visit Done': { badge: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200', dot: 'bg-purple-500' },
  Closed: { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
};

const STATUSES = ['Site Visit', 'Token Done', 'Visit Done', 'Closed'];

const LEAD_TYPE_BADGE: Record<string, string> = {
  'new lead': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  'old lead': 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
};

function leadTypeLabel(v?: string | null): string {
  return (v ?? 'new lead').toLowerCase() === 'old lead' ? 'Old Lead' : 'New Lead';
}

function initials(name: string) {
  return String(name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

function fmtDay(label?: string | null): string {
  if (!label) return '—';
  const t = String(label);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? t : d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

function fmtTime12(t?: string | null): string {
  if (!t) return '';
  const raw = String(t).length >= 8 ? String(t).slice(0, 5) : String(t);
  const [hStr, mStr] = raw.split(':').map(Number);
  if (hStr == null || mStr == null || Number.isNaN(hStr)) return raw;
  const h = hStr % 12 === 0 ? 12 : hStr % 12;
  const suffix = hStr < 12 ? 'AM' : 'PM';
  return `${h}:${String(mStr).padStart(2, '0')} ${suffix}`;
}

function waLink(phone: string, name: string): string | null {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) digits = `91${digits}`;
  else if (digits.startsWith('0')) digits = `91${digits.slice(1)}`;
  const text = encodeURIComponent(`Hi ${name}, this is VJR Estate following up on your enquiry.`);
  return `https://wa.me/${digits}?text=${text}`;
}

const ACT_LABEL: Record<string, string> = {
  assigned: 'Assigned', unassigned: 'Unassigned', status_changed: 'Status updated',
  call: 'Call logged', note: 'Note added', visit: 'Site visit', requirement: 'Requirement updated',
  created: 'Lead created', visit_scheduled: 'Visit scheduled', visit_status: 'Visit updated', lead_type_changed: 'Lead type set',
};

/** Plain-text visit summary for the clipboard — date, time, name, contact, property. */
function visitCopyText(v: any): string {
  const c = v.client_info ?? {};
  const e = v.employee_info ?? {};
  const lines = [
    'SITE VISIT',
    `Date: ${fmtDay(v.visit_date)}`,
    v.visit_time ? `Time: ${fmtTime12(v.visit_time)}` : 'Time: —',
    `Name: ${c.name || '—'}`,
    `Contact: ${c.phone || '—'}`,
    c.type ? `Property Type: ${c.type}` : null,
    c.budget ? `Budget: ${c.budget}` : null,
    c.location ? `Preferred Location: ${c.location}` : null,
    c.requirements ? `Requirement: ${c.requirements}` : null,
    v.notes ? `Notes: ${v.notes}` : null,
    e.name ? `Agent: ${e.name}${e.employee_id ? ` (${e.employee_id})` : ''}` : null,
    `Status: ${v.status || 'scheduled'}`,
  ].filter(Boolean);
  return lines.join('\n');
}

export default function CrmAssignedClients() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [empFilter, setEmpFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState('');
  const [view, setView] = useState<'pipeline' | 'visits'>('pipeline');
  const [copiedVisit, setCopiedVisit] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [cRes, vRes, eRes] = await Promise.all([
        leadSupabase.crmClients.assignedView().catch(() => ({ data: [] as any[] })),
        leadSupabase.visits.list().catch(() => ({ data: [] as any[] })),
        leadSupabase.employees.list({}).catch(() => ({ data: [] as any[] })),
      ]);
      setClients(cRes.data ?? []);
      setVisits(vRes.data ?? []);
      setEmployees((eRes.data ?? []).filter((e: any) => e.status !== 'Terminated'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let active = 0;
    let todayVisits = 0;
    const todayLabel = new Date().toISOString().split('T')[0];
    for (const c of clients) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      if (c.status !== 'Closed') active += 1;
      if ((c.next_visit?.visit_date ?? '').startsWith(todayLabel)) todayVisits += 1;
    }
    return { total: clients.length, active, todayVisits, byStatus };
  }, [clients]);

  const visitStats = useMemo(() => {
    const todayLabel = new Date().toISOString().split('T')[0];
    let upcoming = 0;
    let today = 0;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    let week = 0;
    for (const v of visits) {
      const d = String(v.visit_date ?? '');
      if (d >= todayLabel) {
        upcoming += 1;
        if (d === todayLabel) today += 1;
        if (d <= nextWeek.toISOString().split('T')[0]) week += 1;
      }
    }
    return { upcoming, today, week };
  }, [visits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (empFilter && c.assigned_employee !== empFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (leadTypeFilter && (c.lead_type ?? 'new lead') !== leadTypeFilter) return false;
      if (q && ![c.name, c.phone, c.location, c.requirements, c.notes].some((v) => String(v ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [clients, search, empFilter, statusFilter, leadTypeFilter]);

  const sortedVisits = useMemo(() => {
    const todayLabel = new Date().toISOString().split('T')[0];
    return [...visits].sort((a, b) => {
      const aUp = String(a.visit_date ?? '') >= todayLabel ? 0 : 1;
      const bUp = String(b.visit_date ?? '') >= todayLabel ? 0 : 1;
      if (aUp !== bUp) return aUp - bUp;
      const da = `${a.visit_date ?? ''}${a.visit_time ?? ''}`;
      const db = `${b.visit_date ?? ''}${b.visit_time ?? ''}`;
      return aUp === 0 ? da.localeCompare(db) : db.localeCompare(da);
    });
  }, [visits]);

  const copyVisit = async (v: any) => {
    try {
      await navigator.clipboard.writeText(visitCopyText(v));
      setCopiedVisit(v.id ?? v.client_sno);
      setTimeout(() => setCopiedVisit(null), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const hasFilters = Boolean(search || empFilter || statusFilter || leadTypeFilter);
  const clearFilters = () => { setSearch(''); setEmpFilter(''); setStatusFilter(''); setLeadTypeFilter(''); };

  return (
    <div className="min-h-screen bg-[#f4f5f7] font-['Inter',sans-serif] text-[#0A1628] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Pipeline · Team"
            title="Assigned Clients"
            description="Every client a telecaller or sales agent owns — statuses, site visits and lead types update live as agents work the pipeline."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-black/10 bg-white p-1">
                  <button
                    onClick={() => setView('pipeline')}
                    className={`min-h-[34px] rounded-lg px-3 text-[11px] font-bold transition-all ${view === 'pipeline' ? 'bg-[#0A1628] text-[#D6B85D]' : 'text-[#6b7280] hover:bg-black/[0.03]'}`}
                  >
                    Pipeline
                  </button>
                  <button
                    onClick={() => setView('visits')}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-all ${view === 'visits' ? 'bg-[#0A1628] text-[#D6B85D]' : 'text-[#6b7280] hover:bg-black/[0.03]'}`}
                  >
                    <CalendarClock className="h-3.5 w-3.5" /> Site Visits
                    {visitStats.upcoming > 0 && <span className="rounded-full bg-[#C9A84C]/[0.16] px-1.5 text-[9px] font-bold text-[#96782A]">{visitStats.upcoming}</span>}
                  </button>
                </div>
                <CrmBtn variant="ghost" onClick={() => { setRefreshing(true); fetchAll(); }} disabled={refreshing}>
                  {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />}
                  Refresh
                </CrmBtn>
              </div>
            }
          />

          {view === 'pipeline' ? (
            <>
              <CrmStatGrid>
                <MotionReveal delay={0}>
                  <CrmStatCard icon={<Users className="h-5 w-5" strokeWidth={1.6} />} label="Assigned Clients" value={counts.total} subtext="Across the team" tone="navy" />
                </MotionReveal>
                <MotionReveal delay={0.05}>
                  <CrmStatCard icon={<CalendarClock className="h-5 w-5" strokeWidth={1.6} />} label="Active Pipeline" value={counts.active} subtext="Not closed" tone="gold" />
                </MotionReveal>
                <MotionReveal delay={0.1}>
                  <CrmStatCard icon={<CalendarDays className="h-5 w-5" strokeWidth={1.6} />} label="Visits Today" value={counts.todayVisits} subtext="Scheduled site visits" tone="blue" />
                </MotionReveal>
                <MotionReveal delay={0.15}>
                  <CrmStatCard icon={<Phone className="h-5 w-5" strokeWidth={1.6} />} label="Agents" value={employees.filter((e) => e.assigned_clients > 0 || e.active_assigned_clients > 0).length || new Set(clients.map((c) => c.assigned_employee).filter(Boolean)).size} subtext="Carrying clients" tone="emerald" />
                </MotionReveal>
              </CrmStatGrid>

              <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, mobile, location, requirement…"
                    className={`${CRM_INPUT} pl-9`}
                  />
                </div>
                <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} className={`${CRM_INPUT} lg:w-[220px]`}>
                  <option value="">All employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name || e.employee_id}</option>
                  ))}
                </select>
                <select value={leadTypeFilter} onChange={(e) => setLeadTypeFilter(e.target.value)} className={`${CRM_INPUT} lg:w-[180px]`}>
                  <option value="">All lead types</option>
                  <option value="new lead">New Lead</option>
                  <option value="old lead">Old Lead</option>
                </select>
                {hasFilters && (
                  <CrmBtn variant="ghost" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5" /> Clear
                  </CrmBtn>
                )}
              </div>

              <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                <CrmChip active={!statusFilter} onClick={() => setStatusFilter('')}>
                  All <span className="opacity-60">{counts.total}</span>
                </CrmChip>
                {STATUSES.map((s) => (
                  <CrmChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
                    {s} <span className="opacity-60">{counts.byStatus[s] ?? 0}</span>
                  </CrmChip>
                ))}
              </div>

              {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.05] bg-white py-16 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
                  <p className="text-sm font-semibold text-[#0A1628]">
                    {clients.length === 0 ? 'No clients assigned yet' : 'No clients match these filters'}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#9ca3af]">
                    {clients.length === 0
                      ? 'Open any employee profile and use Assign Client to hand over leads. Once an agent updates a status, it appears here instantly.'
                      : 'Try clearing the filters.'}
                  </p>
                  {hasFilters && (
                    <button type="button" onClick={clearFilters} className="mt-3 text-xs font-bold text-[#96782A] hover:underline">
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <MotionReveal>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                    {filtered.map((c) => {
                      const meta = STATUS_META[c.status] ?? STATUS_META['Site Visit'];
                      const emp = c.assigned_employee_info ?? null;
                      const wa = waLink(c.phone, c.name);
                      const la = c.last_activity;
                      return (
                        <CrmCard key={c.sno} className="flex flex-col overflow-hidden p-0">
                          <div className="border-b border-black/[0.04] p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A1628] to-[#1E3852] text-[13px] font-extrabold text-[#D6B85D] ring-1 ring-[#C9A84C]/20">
                                {initials(c.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="truncate text-[15px] font-bold text-[#0A1628]">{c.name || `Client #${c.sno}`}</p>
                                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.badge}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {c.status || 'Fresh'}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${LEAD_TYPE_BADGE[c.lead_type] ?? LEAD_TYPE_BADGE['new lead']}`}>
                                    {leadTypeLabel(c.lead_type)}
                                  </span>
                                  <p className="text-[11px] text-[#6b7280]">
                                    <span className="font-mono text-[#96782A]">#{c.sno}</span>
                                    {c.location && <span className="ml-2 inline-flex items-center gap-1"><MapPin className="h-3 w-3" strokeWidth={1.8} /> {c.location}</span>}
                                    {c.budget && <span className="ml-2 font-semibold text-emerald-600">{c.budget}</span>}
                                  </p>
                                </div>
                                {c.phone && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <a
                                      href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
                                      className="inline-flex min-h-[30px] items-center gap-1.5 rounded-lg border border-black/5 bg-[#fafafa] px-2.5 text-[11.5px] font-semibold text-[#0A1628] tabular-nums transition-colors hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/[0.06]"
                                    >
                                      <Phone className="h-3 w-3 text-[#9ca3af]" strokeWidth={1.8} /> {c.phone}
                                    </a>
                                    {wa && (
                                      <a
                                        href={wa}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="WhatsApp the client"
                                        className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[#25D366]/25 text-[#1DA851] transition-colors hover:bg-[#25D366]/10"
                                      >
                                        <WhatsAppIcon className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 space-y-2.5 p-4">
                            {c.requirements && (
                              <p className="rounded-xl bg-[#fafafa] px-3 py-2 text-[11.5px] leading-relaxed text-[#0A1628]">
                                <span className="font-bold text-[#6b7280]">Requirement: </span>{c.requirements}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-[11px] text-[#6b7280]">
                              <History className="h-3.5 w-3.5 shrink-0 text-[#96782A]" strokeWidth={1.8} />
                              <span className="min-w-0 truncate">
                                {la ? (
                                  <>
                                    <span className="font-bold capitalize text-[#0A1628]">{ACT_LABEL[la.action] ?? la.action?.replace(/_/g, ' ')}</span>
                                    {la.status && <> → <span className="font-semibold text-[#96782A]">{la.status}</span></>}
                                    <span className="text-[#9ca3af]"> · by {la.performed_by || 'system'} · {timeAgo(la.created_at)}</span>
                                  </>
                                ) : 'No updates recorded yet'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 border-t border-black/[0.04] bg-[#fafafa] px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-[#C9A84C]/[0.12] px-2 py-1 text-[10.5px] font-bold text-[#8a6d1f]">
                                <CalendarClock className="h-3 w-3" strokeWidth={1.8} /> Next visit {c.next_visit ? fmtDay(c.next_visit.visit_date) : '—'}
                                {c.next_visit?.visit_time ? ` · ${String(c.next_visit.visit_time).slice(0, 5)}` : ''}
                              </span>
                              {c.upcoming_visits > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10.5px] font-bold text-blue-700">
                                  <CalendarDays className="h-3 w-3" strokeWidth={1.8} /> {c.upcoming_visits} upcoming
                                </span>
                              )}
                            </div>
                            {emp ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/crm/employees/${emp.id}/dashboard`)}
                                className="flex w-full items-center gap-2.5 rounded-xl border border-black/[0.05] bg-white px-2.5 py-2 text-left transition-colors hover:border-[#C9A84C]/50"
                                title="Open the agent's live dashboard"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0A1628] text-[9.5px] font-extrabold text-[#D6B85D]">
                                  {initials(emp.name)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[11.5px] font-bold text-[#0A1628]">{emp.name}</span>
                                  <span className="block truncate text-[9.5px] font-semibold uppercase tracking-wide text-[#9ca3af]">
                                    {emp.employee_id} · {emp.designation || emp.department || 'Employee'}
                                  </span>
                                </span>
                                <span className="text-[10px] font-bold text-[#96782A]">Live →</span>
                              </button>
                            ) : (
                              <p className="text-[10.5px] text-[#9ca3af]">No agent assigned</p>
                            )}
                          </div>
                        </CrmCard>
                      );
                    })}
                  </div>

                  <p className="mt-6 text-center text-[11px] tracking-[0.3px] text-[#9ca3af]">
                    {filtered.length} of {clients.length} assigned clients · statuses sync live from the agents' portals
                  </p>
                </MotionReveal>
              )}
            </>
          ) : (
            /* ─────────────── SITE VISITS DASHBOARD ─────────────── */
            <>
              <CrmStatGrid>
                <MotionReveal delay={0}>
                  <CrmStatCard icon={<CalendarClock className="h-5 w-5" strokeWidth={1.6} />} label="Upcoming Visits" value={visitStats.upcoming} subtext="Scheduled from today" tone="navy" />
                </MotionReveal>
                <MotionReveal delay={0.05}>
                  <CrmStatCard icon={<CalendarDays className="h-5 w-5" strokeWidth={1.6} />} label="Today" value={visitStats.today} subtext="Site visits today" tone="gold" />
                </MotionReveal>
                <MotionReveal delay={0.1}>
                  <CrmStatCard icon={<Clock className="h-5 w-5" strokeWidth={1.6} />} label="This Week" value={visitStats.week} subtext="Next 7 days" tone="blue" />
                </MotionReveal>
                <MotionReveal delay={0.15}>
                  <CrmStatCard icon={<CalendarDays className="h-5 w-5" strokeWidth={1.6} />} label="Total Scheduled" value={visits.length} subtext="All logged visits" tone="emerald" />
                </MotionReveal>
              </CrmStatGrid>

              <p className="mb-3 rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.06] px-4 py-3 text-[11.5px] leading-relaxed text-[#6b7280]">
                Every date a telecaller schedules from their portal lands here in real time. Use the copy button on any visit to paste the full plain-text summary — date, time, client name, contact number and property details.
              </p>

              {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />)}
                </div>
              ) : sortedVisits.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.05] bg-white py-16 text-center">
                  <CalendarClock className="mx-auto mb-3 h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
                  <p className="text-sm font-semibold text-[#0A1628]">No site visits scheduled yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#9ca3af]">
                    When a telecaller opens a client and sets a visit date, it appears here with the full client details.
                  </p>
                </div>
              ) : (
                <MotionReveal>
                  <div className="space-y-2.5">
                    {sortedVisits.map((v: any) => {
                      const c = v.client_info ?? {};
                      const e = v.employee_info ?? {};
                      const isUpcoming = String(v.visit_date ?? '') >= new Date().toISOString().split('T')[0];
                      const copied = copiedVisit === (v.id ?? v.client_sno);
                      return (
                        <CrmCard key={v.id ?? `${v.client_sno}-${v.visit_date}`} className="overflow-hidden p-0">
                          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                            {/* Date block */}
                            <div className={`flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 ${isUpcoming ? 'bg-[#0A1628]' : 'bg-gray-100'}`}>
                              <CalendarClock className={`h-5 w-5 ${isUpcoming ? 'text-[#D6B85D]' : 'text-[#9ca3af]'}`} strokeWidth={1.8} />
                              <div>
                                <p className={`text-[13px] font-bold leading-tight ${isUpcoming ? 'text-white' : 'text-[#0A1628]'}`}>{fmtDay(v.visit_date)}</p>
                                <p className={`text-[10px] font-bold ${isUpcoming ? 'text-[#D6B85D]/80' : 'text-[#9ca3af]'}`}>
                                  {v.visit_time ? fmtTime12(v.visit_time) : 'Time TBD'}
                                </p>
                              </div>
                            </div>

                            {/* Client + property details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="text-[14px] font-bold text-[#0A1628]">{c.name || `Client #${c.sno}`}</p>
                                {c.lead_type && (
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${LEAD_TYPE_BADGE[c.lead_type] ?? LEAD_TYPE_BADGE['new lead']}`}>
                                    {leadTypeLabel(c.lead_type)}
                                  </span>
                                )}
                                {c.status && (
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_META[c.status]?.badge ?? 'bg-gray-100 text-gray-600'}`}>
                                    {c.status}
                                  </span>
                                )}
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${v.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : isUpcoming ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {v.status === 'completed' ? 'Completed' : isUpcoming ? 'Upcoming' : 'Past'}
                                </span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#6b7280]">
                                {c.phone && (
                                  <a href={`tel:${String(c.phone).replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 font-semibold text-[#96782A] hover:underline">
                                    <Phone className="h-3 w-3" strokeWidth={1.8} /> {c.phone}
                                  </a>
                                )}
                                {c.type && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" strokeWidth={1.8} /> {c.type}</span>}
                                {c.budget && <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><IndianRupee className="h-3 w-3" strokeWidth={1.8} /> {c.budget}</span>}
                                {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" strokeWidth={1.8} /> {c.location}</span>}
                              </div>
                              {c.requirements && (
                                <p className="mt-1.5 text-[11px] leading-relaxed text-[#6b7280]"><span className="font-bold text-[#9ca3af]">Requirement: </span>{c.requirements}</p>
                              )}
                              {v.notes && <p className="mt-1 text-[10.5px] text-[#9ca3af]">📝 {v.notes}</p>}
                              {e.name && (
                                <p className="mt-1 text-[10.5px] font-semibold text-[#9ca3af]">
                                  Agent: {e.name}{e.employee_id ? ` (${e.employee_id})` : ''}
                                </p>
                              )}
                            </div>

                            {/* Copy button */}
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                onClick={() => copyVisit(v)}
                                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 text-[11px] font-bold transition-all ${
                                  copied
                                    ? 'bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]'
                                    : 'border border-[#C9A84C]/40 bg-white text-[#96782A] hover:bg-[#C9A84C]/[0.1]'
                                }`}
                                title="Copy visit summary (plain text)"
                              >
                                {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.9} />}
                                {copied ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        </CrmCard>
                      );
                    })}
                  </div>
                  <p className="mt-6 text-center text-[11px] tracking-[0.3px] text-[#9ca3af]">
                    {sortedVisits.length} visits · dates and times sync live from the telecallers' portals
                  </p>
                </MotionReveal>
              )}
            </>
          )}
        </CrmPageBody>
      </main>
    </div>
  );
}