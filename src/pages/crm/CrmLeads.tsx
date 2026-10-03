import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import { getCrmClients, parseBudget, type SheetClient } from '@/data/crmClientsData';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Pencil, Phone, MessageSquare, Search, X, Check, IndianRupee, Plus, ExternalLink,
  ToggleLeft, ToggleRight, LayoutDashboard, Briefcase, UserPlus, UserX, History,
  Loader2, Users, TrendingUp, Trophy, UserRound, Mail, MapPin, StickyNote, Landmark,
} from 'lucide-react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmChip, CrmBtn, CrmCard, CrmStatCard, CrmStatGrid, MotionReveal, CRM_INPUT } from '@/components/crm/CrmUi';

/* ═══════════════ shared helpers ═══════════════ */

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function parseDateSafe(d: string | null | undefined): Date | null {
  if (!d) return null;
  const dt = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d);
  return isNaN(dt.getTime()) ? null : dt;
}

function activityLabel(action: string): string {
  return (action ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function activityTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' · ' + dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(d: string | null) {
  if (!d) return null;
  const dt = parseDateSafe(d);
  if (!dt) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toLakhs(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === '') return '\u2014';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '\u2014';
  if (num >= 10000000) return `${(num / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
}

function formatIndian(num: number): string {
  if (isNaN(num)) return '\u2014';
  const str = Math.round(num).toString();
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  if (!rest) return last3;
  const groups: string[] = [];
  let i = rest.length;
  while (i > 0) {
    const start = Math.max(0, i - 2);
    groups.unshift(rest.slice(start, i));
    i -= 2;
  }
  return groups.join(',') + ',' + last3;
}

function formatLakhText(num: number): string {
  if (isNaN(num)) return '';
  if (num >= 10000000) {
    const val = (num / 10000000).toFixed(2).replace(/\.00$/, '');
    return val + ' Crore';
  }
  if (num >= 100000) {
    const val = (num / 100000).toFixed(2).replace(/\.00$/, '');
    return val === '1' ? '1 Lakh' : val + ' Lakhs';
  }
  if (num >= 1000) return (num / 1000).toFixed(2).replace(/\.00$/, '') + ' Thousand';
  return '\u20B9' + Math.round(num);
}

function parseToLakhs(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return String(parseFloat((num / 100000).toFixed(4)));
}

/* ── Salesforce-style pipeline path ──
 * One source of truth for the lead lifecycle, ordered like the SF Lead Path:
 * New (no status yet) → working the deal → won. Statuses on records stay
 * exactly as stored today; 'New' is just the display state for an empty one. */
const PATH_STEPS = ['New', 'Site Visit', 'Token Done', 'Visit Done', 'Closed'] as const;

const pathIndex = (status: string | null | undefined): number => {
  const s = (status ?? '').trim();
  return s ? Math.max(1, PATH_STEPS.indexOf(s as (typeof PATH_STEPS)[number])) : 0;
};

const STATUS_CHIP: Record<string, string> = {
  '': 'bg-[#C9A84C]/[0.14] text-[#96782A]',
  'site visit': 'bg-amber-50 text-amber-700',
  'token done': 'bg-blue-50 text-blue-700',
  'visit done': 'bg-indigo-50 text-indigo-700',
  closed: 'bg-emerald-50 text-emerald-700',
};
const statusChip = (status?: string | null) => STATUS_CHIP[(status ?? '').trim().toLowerCase()] ?? 'bg-gray-100 text-gray-600';

type SortKey = 'default' | 'budget-desc' | 'budget-asc' | 'name' | 'date';

/* ═══════════════ page ═══════════════ */

export default function CrmLeads() {
  const [clients, setClients] = useState<SheetClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('default');

  useEffect(() => {
    leadSupabase.employees.list({ status: 'Active' })
      .then((r) => setAgents((r.data ?? []).filter((a: any) => a.status === 'Active')))
      .catch(() => {});
  }, []);

  async function loadActivity(sno: number) {
    setActivityLoading(true);
    try {
      const res = await leadSupabase.crmClients.activity(sno);
      setActivity(res.data ?? []);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }

  async function handleAssign(employeeId: string) {
    if (!selectedClient) return;
    setAssigning(true);
    setAssignMsg('');
    try {
      if (employeeId) await leadSupabase.employees.assignClient(employeeId, selectedClient.sno);
      else await leadSupabase.employees.unassignClient(selectedClient.sno);
      const agent = agents.find((a: any) => a.id === employeeId) ?? null;
      const updated = {
        ...selectedClient,
        assigned_employee: employeeId || null,
        assigned_employee_info: agent ? { id: agent.id, employee_id: agent.employee_id, name: agent.name } : null,
      } as SheetClient;
      setSelectedClient(updated);
      setClients((prev) => prev.map((c) => (c.sno === updated.sno ? updated : c)));
      setAssignId(employeeId);
      setAssignMsg(employeeId && agent ? `Assigned to ${agent.name}` : 'Assignment removed');
      loadActivity(selectedClient.sno);
    } catch (e: any) {
      setAssignMsg(e?.message ?? 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  }

  async function handleLogStatus() {
    if (!selectedClient || !statusLog.status) return;
    setAssigning(true);
    setAssignMsg('');
    try {
      await leadSupabase.crmClients.updateStatus(selectedClient.sno, statusLog.status, statusLog.note);
      const updated = { ...selectedClient, status: statusLog.status } as SheetClient;
      setSelectedClient(updated);
      setClients((prev) => prev.map((c) => (c.sno === updated.sno ? updated : c)));
      setStatusLog((s) => ({ ...s, note: '' }));
      setAssignMsg('Status updated — change logged on this lead');
      loadActivity(selectedClient.sno);
    } catch (e: any) {
      setAssignMsg(e?.message ?? 'Update failed');
    } finally {
      setAssigning(false);
    }
  }

  const [selectedClient, setSelectedClient] = useState<SheetClient | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<SheetClient>>({});
  const [saving, setSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', type: '', budget: '', location: '', status: '', lead_type: 'new lead', source: '', notes: '', client_role: 'Buyer', property_link: '', property_subtype: '', paid_comm: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [perms, setPerms] = useState<string[] | null>(null);
  const canEdit = perms === null || perms.length === 0;
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Team assignment center: employees who can own leads ──
  const [agents, setAgents] = useState<any[]>([]);
  const [agentFilter, setAgentFilter] = useState('');
  const [assignId, setAssignId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');
  const [statusLog, setStatusLog] = useState<{ status: string; note: string }>({ status: '', note: '' });
  const [activity, setActivity] = useState<any[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    leadSupabase.admin.verify().then(p => setPerms(p.permissions ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: supabaseData } = await leadSupabase.crmClients.list();
        if (supabaseData.length > 0) {
          setClients(supabaseData);
          setLoading(false);
          searchRef.current?.focus();
          return;
        }
      } catch (err) {
        console.error('Failed to load CRM clients from proxy:', err);
      }
      const saved = localStorage.getItem('crm_clients');
      if (saved) {
        try { setClients(JSON.parse(saved)); }
        catch { setClients(getCrmClients()); }
      } else {
        setClients(getCrmClients());
      }
      setLoading(false);
      searchRef.current?.focus();
    })();
  }, []);

  useEffect(() => {
    if (!loading) localStorage.setItem('crm_clients', JSON.stringify(clients));
  }, [clients, loading]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) &&
          document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(() => {
    let list = clients.slice();

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.source || '').toLowerCase().includes(q) ||
          (c.notes || '').toLowerCase().includes(q) ||
          (c.location || '').toLowerCase().includes(q) ||
          (c.budget || '').toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q),
      );
    }

    if (activeFilter === 'dated') list = list.filter((c) => c.date);
    if (activeFilter === 'notes') list = list.filter((c) => c.notes);
    if (activeFilter === 'instagram') list = list.filter((c) => c.source.toLowerCase() === 'instagram');
    if (activeFilter === 'buyer') list = list.filter((c) => (c.client_role || 'Buyer') === 'Buyer');
    if (activeFilter === 'seller') list = list.filter((c) => c.client_role === 'Seller');
    if (activeFilter === 'unassigned') list = list.filter((c) => !c.assigned_employee);
    if (activeFilter === 'assigned') list = list.filter((c) => !!c.assigned_employee);
    if (activeFilter === 'fresh') list = list.filter((c) => !c.status);
    if (activeFilter === 'closed') list = list.filter((c) => c.status.toLowerCase().includes('closed'));
    if (activeFilter === 'site visit') list = list.filter((c) => c.status.toLowerCase() === 'site visit');
    if (activeFilter === 'token done') list = list.filter((c) => c.status.toLowerCase() === 'token done');
    if (activeFilter === 'visit done') list = list.filter((c) => c.status.toLowerCase() === 'visit done');
    if (agentFilter) list = list.filter((c) => c.assigned_employee === agentFilter);

    if (sortKey === 'budget-desc') list.sort((a, b) => b.budget_val - a.budget_val);
    if (sortKey === 'budget-asc') list.sort((a, b) => a.budget_val - b.budget_val);
    if (sortKey === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === 'date')
      list.sort((a, b) => (parseDateSafe(b.date)?.getTime() ?? 0) - (parseDateSafe(a.date)?.getTime() ?? 0));

    return list;
  }, [clients, search, activeFilter, agentFilter, sortKey]);

  function openDrawer(client: SheetClient) {
    setSelectedClient(client);
    setEditing(false);
    setEditData({});
    setAssignId(client.assigned_employee ?? '');
    setAssignMsg('');
    setStatusLog({ status: client.status || '', note: '' });
    setActivity(null);
    loadActivity(client.sno);
  }

  function startEdit() {
    if (!selectedClient) return;
    setEditing(true);
    setSaveError('');
    setEditData({ ...selectedClient });
  }

  function cancelEdit() {
    setEditing(false);
    setEditData({});
  }

  async function saveEdit() {
    if (!selectedClient || !editData) return;
    setSaving(true);
    const merged: SheetClient = {
      ...selectedClient,
      ...editData,
      budget_val: parseBudget((editData.budget ?? selectedClient.budget) || ''),
    };
    try {
      await leadSupabase.crmClients.upsert(merged);
      setClients((prev) => prev.map((c) => (c.sno === merged.sno ? merged : c)));
      setSelectedClient(merged);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save client');
    } finally {
      setSaving(false);
    }
  }

  async function persistClient(updated: SheetClient) {
    setSelectedClient(updated);
    setClients((prev) => prev.map((c) => (c.sno === updated.sno ? updated : c)));
    try {
      await leadSupabase.crmClients.upsert(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save client');
      const ref = await leadSupabase.crmClients.list();
      if (ref.data.length > 0) {
        const found = ref.data.find((c) => c.sno === updated.sno);
        if (found) {
          setSelectedClient(found);
          setClients((prev) => prev.map((c) => (c.sno === found.sno ? found : c)));
        }
      }
    }
  }

  async function handleAddClient() {
    if (!addForm.name.trim()) return;
    setAddSaving(true);
    try {
      const { data: maxSno } = await leadSupabase.crmClients.maxSno();
      const newSno = maxSno + 1;
      const budgetVal = parseFloat(addForm.budget) || 0;
      const client: SheetClient = {
        sno: newSno,
        name: addForm.name.trim(),
        phone: addForm.phone,
        email: addForm.email,
        type: addForm.type,
        budget: addForm.budget,
        budget_val: budgetVal,
        location: addForm.location,
        closed_price: '',
        closing_timeline: '',
        requirements: '',
        status: addForm.status,
        lead_type: addForm.lead_type,
        date: null,
        notes: addForm.notes,
        buyer_comm_pct: '',
        buyer_comm_val: '',
        seller_comm_pct: '',
        seller_comm_val: '',
        total_comm: '',
        paid_comm: '',
        comm_status: 'Pending',
        my_share: '',
        source: addForm.source,
        client_role: addForm.client_role,
        property_link: addForm.property_link,
        comm_date: null,
        property_subtype: addForm.property_subtype,
      };
      await leadSupabase.crmClients.upsert(client);
      setClients(prev => [...prev, client]);
      setAddOpen(false);
      setAddForm({ name: '', phone: '', email: '', type: '', budget: '', location: '', status: '', lead_type: 'new lead', source: '', notes: '', client_role: 'Buyer', property_link: '', property_subtype: '', paid_comm: '' });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add client');
    } finally {
      setAddSaving(false);
    }
  }

  // ── Salesforce-style Path bar: the list IS the pipeline ──
  const stageCounts = useMemo(() => ([
    { key: null as string | null, label: 'All leads', count: clients.length },
    { key: 'fresh', label: 'New', count: clients.filter((c) => !c.status).length },
    { key: 'site visit', label: 'Site Visit', count: clients.filter((c) => c.status.toLowerCase() === 'site visit').length },
    { key: 'token done', label: 'Token Done', count: clients.filter((c) => c.status.toLowerCase() === 'token done').length },
    { key: 'visit done', label: 'Visit Done', count: clients.filter((c) => c.status.toLowerCase() === 'visit done').length },
    { key: 'closed', label: 'Closed won', count: clients.filter((c) => c.status.toLowerCase().includes('closed')).length },
  ]), [clients]);

  const filterCounts = useMemo(() => ({
    all: clients.length,
    fresh: clients.filter((c) => !c.status).length,
    buyer: clients.filter((c) => (c.client_role || 'Buyer') === 'Buyer').length,
    seller: clients.filter((c) => c.client_role === 'Seller').length,
    assigned: clients.filter((c) => !!c.assigned_employee).length,
    unassigned: clients.filter((c) => !c.assigned_employee).length,
    closed: clients.filter((c) => c.status.toLowerCase().includes('closed')).length,
    notes: clients.filter((c) => c.notes).length,
  }), [clients]);

  // ── Stats band (Salesforce dashboard strip) ──
  const stats = useMemo(() => ({
    total: clients.length,
    pipeline: clients.filter((c) => c.status && !c.status.toLowerCase().includes('closed')).length,
    won: filterCounts.closed,
    unassigned: filterCounts.unassigned,
  }), [clients, filterCounts]);

  const statusVariant = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('closed') || s.includes('done')) return 'default' as const;
    if (s.includes('visit') || s.includes('token')) return 'secondary' as const;
    return 'outline' as const;
  };

  const drawerOpen = !!selectedClient;

  return (
    <div className="h-screen overflow-hidden bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Sales Pipeline"
            title="Leads"
            description={`${clients.length} leads on file · synced from Supabase`}
            actions={
              <>
                <Link to="/crm" className="no-underline">
                  <CrmBtn variant="ghost"><LayoutDashboard className="h-3.5 w-3.5" /> Dashboard</CrmBtn>
                </Link>
                {canEdit && (
                  <CrmBtn variant="gold" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" /> Add Lead</CrmBtn>
                )}
              </>
            }
          />

          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : clients.length === 0 ? (
            <div className="text-center py-16 text-[#9ca3af] text-sm">No client data available.</div>
          ) : (
            <>
              {/* ── Stats band ── */}
              <MotionReveal>
                <CrmStatGrid>
                  <CrmStatCard icon={<Users className="h-4.5 w-4.5" strokeWidth={1.8} />} tone="navy" value={stats.total} label="Total leads" subtext="all time" />
                  <CrmStatCard icon={<TrendingUp className="h-4.5 w-4.5" strokeWidth={1.8} />} tone="gold" value={stats.pipeline} label="Working the deal" subtext="active pipeline" />
                  <CrmStatCard icon={<Trophy className="h-4.5 w-4.5" strokeWidth={1.8} />} tone="emerald" value={stats.won} label="Closed / won" subtext="deals done" />
                  <CrmStatCard icon={<UserRound className="h-4.5 w-4.5" strokeWidth={1.8} />} tone="amber" value={stats.unassigned} label="Unassigned" subtext={stats.unassigned > 0 ? 'needs an owner' : 'everyone owned'} />
                </CrmStatGrid>
              </MotionReveal>

              {/* ── Search ── */}
              <div className="relative mb-6 w-full max-w-[720px]">
                <Search className="pointer-events-none absolute left-[18px] top-1/2 h-5 w-5 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search by name, phone, email, source, budget, location, status…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="crm-search w-full rounded-2xl border border-black/10 bg-white py-4 pl-[52px] pr-[52px] font-['Inter',sans-serif] text-base text-[#111827] shadow-[0_1px_3px_rgba(10,22,40,0.06)] outline-none transition-[border-color,box-shadow] duration-200 box-border"
                />
                <span className="pointer-events-none absolute right-[14px] top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border border-black/10 bg-[#f5f5f5] text-xs font-bold text-[#9ca3af]">
                  /
                </span>
              </div>

              {/* ── Salesforce Path — the list is the pipeline ── */}
              <MotionReveal delay={0.02}>
                <div className="mb-4 flex gap-0 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-[0_1px_3px_rgba(10,22,40,0.06)] ring-1 ring-black/[0.05]">
                  {stageCounts.map((s, i) => {
                    const active = activeFilter === (s.key ?? 'all');
                    return (
                      <button key={s.label} type="button" onClick={() => setActiveFilter(s.key ?? 'all')}
                        aria-pressed={active}
                        className={`relative flex min-w-[92px] flex-1 cursor-pointer flex-col items-center px-3 py-2.5 transition-all duration-200 first:rounded-l-xl last:rounded-r-xl sm:flex-row sm:justify-center sm:gap-2 ${active ? 'text-[#0A1628]' : 'text-[#6b7280] hover:text-[#0A1628]'}`}>
                        <span className={`absolute inset-0 transition-colors duration-200 first:rounded-l-xl last:rounded-r-xl ${active ? 'bg-gradient-to-br from-[#D6B85D] to-[#C9A84C] shadow-[0_2px_10px_rgba(201,168,76,0.45)]' : 'bg-transparent'}`} />
                        <span className="relative whitespace-nowrap text-[10.5px] font-extrabold uppercase tracking-wide">{s.label}</span>
                        <span className={`relative rounded-full px-1.5 text-[10px] font-extrabold tabular-nums ${active ? 'bg-[#0A1628]/15 text-[#0A1628]' : 'bg-black/[0.05] text-[#6b7280]'}`}>{s.count}</span>
                        {i < stageCounts.length - 1 && <span className="pointer-events-none absolute -right-[3px] top-1/2 z-10 hidden h-3 w-3 -translate-y-1/2 rotate-45 bg-white sm:block" style={{ boxShadow: '1px -1px 0 0 rgba(10,22,40,0.06)' }} />}
                      </button>
                    );
                  })}
                </div>
              </MotionReveal>

              {/* ── Filters ── */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {(['buyer', 'seller', 'assigned', 'unassigned', 'notes'] as const).map((f) => {
                  const label = { buyer: 'Buyer', seller: 'Seller', assigned: 'Assigned', unassigned: 'Unassigned', notes: 'Has notes' }[f];
                  const count = filterCounts[f];
                  return (
                    <CrmChip key={f} active={activeFilter === f} onClick={() => setActiveFilter(f)}>
                      {label} <span className="opacity-60">{count}</span>
                    </CrmChip>
                  );
                })}
                <div className="flex-1" />
                {agents.length > 0 && (
                  <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v)}>
                    <SelectTrigger className="h-9 w-[190px] rounded-full border-black/10 bg-white text-xs font-bold text-[#6b7280]">
                      <SelectValue placeholder="Agent: Everyone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Agent: Everyone</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} · {a.designation || a.department || 'Agent'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={sortKey} onValueChange={(v: SortKey) => setSortKey(v)}>
                  <SelectTrigger className="h-9 w-[190px] rounded-full border-black/10 bg-white text-xs font-bold text-[#6b7280]">
                    <SelectValue placeholder="Sort: Default (S.No)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Sort: Default (S.No)</SelectItem>
                    <SelectItem value="budget-desc">Sort: Budget High Low</SelectItem>
                    <SelectItem value="budget-asc">Sort: Budget Low High</SelectItem>
                    <SelectItem value="name">Sort: Name A Z</SelectItem>
                    <SelectItem value="date">Sort: Lead Date, Newest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── Lead cards ── */}
              <MotionReveal delay={0.05}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {filtered.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-sm text-[#9ca3af]">No leads match this filter.</div>
                  ) : filtered.map((c) => {
                    const pi = pathIndex(c.status);
                    return (
                      <CrmCard key={c.sno} onClick={() => openDrawer(c)} className="group relative overflow-hidden p-4 pl-[18px] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(10,22,40,0.10)]">
                        <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${STAGE_STRIPE[(c.status ?? '').trim().toLowerCase()] ?? 'bg-gray-300'}`} />
                        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#C9A84C] via-[#D6B85D] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <div className="flex items-start gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e8d8ae] to-[#c9a962] text-[14px] font-extrabold text-[#0a0d12] shadow-[0_2px_8px_rgba(201,169,98,0.35)]">
                            {initials(c.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-[14.5px] font-bold text-[#111827]">{c.name}</div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide ${(c.client_role || 'Buyer') === 'Buyer' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                {c.client_role || 'Buyer'}
                              </span>
                            </div>
                            <div className="mt-1 space-y-0.5 text-[12px] text-[#6b7280]">
                              <a href={`tel:${c.phone.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 no-underline hover:text-[#96782A]">
                                <Phone className="h-3 w-3 text-[#9ca3af]" strokeWidth={1.5} />
                                <span className="tabular-nums">{c.phone}</span>
                              </a>
                              {c.email && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <Mail className="h-3 w-3 shrink-0 text-[#9ca3af]" strokeWidth={1.5} />
                                  <span className="truncate">{c.email}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="h-3 w-3 shrink-0 text-[#9ca3af]" strokeWidth={1.5} />
                                <span className="truncate">{[(c.client_role || 'Buyer') === 'Seller' ? c.type : c.type, (c.client_role || 'Buyer') === 'Seller' ? c.property_subtype : c.location].filter(Boolean).join(' · ') || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pipeline progress rail — position at a glance */}
                        <div className="mt-3 flex items-center gap-1">
                          {PATH_STEPS.map((_, i) => (
                            <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= pi ? 'bg-gradient-to-r from-[#C9A84C] to-[#D6B85D]' : 'bg-black/[0.07]'}`} />
                          ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/[0.05] pt-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${statusChip(c.status)}`}>
                              {c.status || 'New'}
                            </span>
                            {(c.lead_type ?? 'new lead') === 'old lead' && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">Old</span>
                            )}
                            {c.assigned_employee_info ? (
                              <span className="truncate rounded-full bg-[#0A1628]/[0.05] px-2 py-0.5 text-[10px] font-bold text-[#96782A]">
                                {c.assigned_employee_info.name}
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">Unassigned</span>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-[#9ca3af]">{c_role(c) === 'Seller' ? 'Price' : 'Budget'}</p>
                            <span className="font-['Inter',sans-serif] text-[14px] font-extrabold text-emerald-600 tabular-nums">₹{c.budget}</span>
                            {c.total_comm && <div className="text-[10px] font-semibold text-[#9ca3af]">comm ₹{toLakhs(parseFloat(String(c.total_comm)) * 100000)}</div>}
                            {c.date && <div className="text-[10px] text-[#9ca3af]">{formatDate(c.date)}</div>}
                          </div>
                        </div>
                      </CrmCard>
                    );
                  })}
                </div>
              </MotionReveal>

              <p className="mt-8 text-center text-[11.5px] tracking-[0.3px] text-[#9ca3af]">
                VJR Estate Properties &mdash; Confidential Client Register &middot; Data synced from Supabase
              </p>
            </>
          )}
        </CrmPageBody>
      </main>

      {/* ═══════════ LEAD DOSSIER DRAWER — Salesforce highlights-panel style ═══════════ */}
      <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) { setSelectedClient(null); setEditing(false); setEditData({}); } }}>
        <SheetContent className="w-[460px] max-w-[94vw] border-l border-[#e5e7eb] bg-[#fafafa] p-0 overflow-y-auto">
          {selectedClient && (() => {
            const pi = pathIndex(selectedClient.status);
            const waLink = `https://wa.me/91${selectedClient.phone.replace(/\D/g, '').slice(-10)}`;
            return (
              <>
                {/* ── Highlights panel (navy, brand) ── */}
                <SheetHeader className="relative border-b border-white/10 bg-[#0A1628] bg-gradient-to-br from-[#0A1628] via-[#0E2036] to-[#132A45] p-6 pb-5 text-white [&&]:p-6 [&&]:pb-5 [&&]:space-y-0">
                  <span className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#C9A84C]/[0.12] blur-2xl" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e8d8ae] to-[#c9a962] font-['Inter',sans-serif] text-[22px] font-extrabold text-[#0a0d12] shadow-[0_0_0_4px_rgba(201,169,98,0.18)]">
                      {initials(selectedClient.name)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {canEdit && !editing && (
                        <button type="button" onClick={startEdit} aria-label="Edit lead" className="cursor-pointer rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {editing && (
                        <>
                          <button type="button" onClick={cancelEdit} aria-label="Cancel editing" className="cursor-pointer rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                            <X className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={saveEdit} disabled={saving} aria-label="Save changes" className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#C9A84C] px-3 py-2 text-[11px] font-extrabold text-[#0A1628] transition-all hover:bg-[#D6B85D] disabled:opacity-50">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <SheetTitle className="mt-3 text-left font-['Inter',sans-serif] text-[22px] font-bold tracking-tight text-white [&&]:mt-3">{selectedClient.name}</SheetTitle>
                  <p className="mt-1 text-[11.5px] font-medium text-white/50">
                    Lead #{selectedClient.sno} · {selectedClient.source || 'Direct'} · {selectedClient.date ? `logged ${formatDate(selectedClient.date)}` : 'no date logged'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ring-1 ${(c_role(selectedClient) === 'Buyer' ? 'bg-amber-400/15 text-amber-200 ring-amber-300/30' : 'bg-blue-400/15 text-blue-200 ring-blue-300/30')}`}>
                      {c_role(selectedClient)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ring-1 ${selectedClient.status ? 'bg-white/10 text-white/85 ring-white/20' : 'bg-[#C9A84C]/20 text-[#e8d8ae] ring-[#C9A84C]/40'}`}>
                      {selectedClient.status || 'New'}
                    </span>
                    {(selectedClient.lead_type ?? 'new lead') === 'old lead' && (
                      <span className="rounded-full bg-indigo-400/15 px-2.5 py-1 text-[10.5px] font-extrabold text-indigo-200 ring-1 ring-indigo-300/30">Old lead</span>
                    )}
                    {selectedClient.assigned_employee_info ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10.5px] font-extrabold text-white/85 ring-1 ring-white/20">
                        <Briefcase className="h-3 w-3" /> {selectedClient.assigned_employee_info.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10.5px] font-extrabold text-white/50 ring-1 ring-white/15">
                        <Briefcase className="h-3 w-3" /> Unassigned
                      </span>
                    )}
                  </div>
                  {saveError && <p className="mt-2 text-[11px] font-semibold text-red-300">{saveError}</p>}

                  {/* Quick actions */}
                  <div className="mt-4 flex gap-2">
                    <a href={`tel:${selectedClient.phone.replace(/\s/g, '')}`}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#D6B85D] to-[#C9A84C] py-2.5 text-[11.5px] font-extrabold text-[#0A1628] no-underline shadow-[0_2px_8px_rgba(201,168,76,0.35)] transition-all hover:brightness-[1.06]">
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                    <a href={waLink} target="_blank" rel="noopener noreferrer"
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2.5 text-[11.5px] font-extrabold text-white ring-1 ring-white/20 no-underline transition-colors hover:bg-white/[0.16]">
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </div>
                </SheetHeader>

                <div className="p-6 pt-5">
                  {/* ── Salesforce Path ── */}
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9ca3af]">Deal path</p>
                  <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
                    <div className="flex items-center">
                      {PATH_STEPS.map((step, i) => (
                        <div key={step} className="relative flex-1 text-center">
                          {i > 0 && <span className={`absolute right-1/2 top-[7px] -z-0 h-0.5 w-full ${i <= pi ? 'bg-[#C9A84C]/60' : 'bg-black/[0.08]'}`} />}
                          <span className={`relative z-10 mx-auto flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 transition-colors ${i < pi ? 'border-[#C9A84C] bg-[#C9A84C]' : i === pi ? 'border-[#C9A84C] bg-white shadow-[0_0_0_3px_rgba(201,168,76,0.2)]' : 'border-black/15 bg-white'}`}>
                            {i < pi && <Check className="h-2 w-2 text-white" strokeWidth={3.5} />}
                          </span>
                          {canEdit && !editing ? (
                            <button type="button"
                              onClick={() => {
                                const nextStatus = i === 0 ? '' : step;
                                if (nextStatus === selectedClient.status) return;
                                void persistClient({ ...selectedClient, status: nextStatus });
                              }}
                              className={`mt-1.5 w-full cursor-pointer border-none bg-transparent p-0 text-[9.5px] font-bold leading-tight transition-colors ${i <= pi ? 'text-[#96782A]' : 'text-[#9ca3af] hover:text-[#0A1628]'}`}>
                              {step}
                            </button>
                          ) : (
                            <span className={`mt-1.5 block w-full text-[9.5px] font-bold leading-tight ${i <= pi ? 'text-[#96782A]' : 'text-[#9ca3af]'}`}>{step}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Overview (editable) ── */}
                  <SectionLabel icon={<Users className="h-3 w-3" />}>Client overview</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldDisplay label="Phone" edit={editing} value={editData.phone ?? selectedClient.phone} onChange={(v) => setEditData({ ...editData, phone: v })}>
                      <a href={`tel:${selectedClient.phone.replace(/\s/g, '')}`} className="text-[13px] font-bold text-[#111827] no-underline">{selectedClient.phone}</a>
                    </FieldDisplay>
                    <FieldDisplay label="Email" edit={editing} value={editData.email ?? selectedClient.email} onChange={(v) => setEditData({ ...editData, email: v })}>
                      <span className="text-[13px] font-semibold">{selectedClient.email || '\u2014'}</span>
                    </FieldDisplay>
                    {(c_role(selectedClient)) === 'Seller' ? (
                      <>
                        <FieldDisplay label="Property category" edit={editing} value={editData.type ?? selectedClient.type} onChange={(v) => setEditData({ ...editData, type: v })}>
                          <span className="text-[13px] font-semibold">{selectedClient.type}</span>
                        </FieldDisplay>
                        <FieldDisplay label="Sub-type" edit={editing} value={editData.property_subtype ?? selectedClient.property_subtype} onChange={(v) => setEditData({ ...editData, property_subtype: v })}>
                          <span className="text-[13px] font-semibold">{selectedClient.property_subtype || '\u2014'}</span>
                        </FieldDisplay>
                        <FieldDisplay label="Location" edit={editing} value={editData.location ?? selectedClient.location} onChange={(v) => setEditData({ ...editData, location: v })}>
                          <span className="text-[13px] font-semibold">{selectedClient.location || '\u2014'}</span>
                        </FieldDisplay>
                      </>
                    ) : (
                      <>
                        <FieldDisplay label="Property type" edit={editing} value={editData.type ?? selectedClient.type} onChange={(v) => setEditData({ ...editData, type: v })}>
                          <span className="text-[13px] font-semibold">{selectedClient.type || '\u2014'}</span>
                        </FieldDisplay>
                        <FieldDisplay label="Preferred area" edit={editing} value={editData.location ?? selectedClient.location} onChange={(v) => setEditData({ ...editData, location: v })}>
                          <span className="text-[13px] font-semibold">{selectedClient.location || '\u2014'}</span>
                        </FieldDisplay>
                      </>
                    )}
                    <FieldDisplay label="Lead source" edit={editing} value={editData.source ?? selectedClient.source} onChange={(v) => setEditData({ ...editData, source: v })}>
                      <span className="text-[13px] font-semibold">{selectedClient.source || 'Direct'}</span>
                    </FieldDisplay>
                    <FieldDisplay label="Lead date" edit={editing} value={editData.date ?? selectedClient.date ?? ''} onChange={(v) => setEditData({ ...editData, date: v })}>
                      <span className="text-[13px] font-semibold">{selectedClient.date ? formatDate(selectedClient.date) : 'Not logged'}</span>
                    </FieldDisplay>
                    <FieldDisplay label="Closing timeline" edit={editing} value={editData.closing_timeline ?? selectedClient.closing_timeline} onChange={(v) => setEditData({ ...editData, closing_timeline: v })}>
                      <span className="text-[13px] font-semibold">{selectedClient.closing_timeline || '\u2014'}</span>
                    </FieldDisplay>
                    <div className="rounded-2xl border border-black/[0.05] bg-white p-3.5">
                      <p className="mb-1 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#9ca3af]">Role</p>
                      {canEdit ? (
                        <select value={c_role(selectedClient)} onChange={(e) => void persistClient({ ...selectedClient, client_role: e.target.value })} className={CRM_INPUT}>
                          <option value="Buyer">Buyer</option>
                          <option value="Seller">Seller</option>
                        </select>
                      ) : (
                        <span className={`inline-block rounded-lg px-2.5 py-1 text-[12px] font-bold ${c_role(selectedClient) === 'Buyer' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{c_role(selectedClient)}</span>
                      )}
                    </div>
                    <div className="col-span-2 rounded-2xl border border-black/[0.05] bg-white p-3.5">
                      <p className="mb-1 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#9ca3af]">{c_role(selectedClient) === 'Seller' ? 'Asking price' : 'Budget range'}</p>
                      {editing ? (
                        <input value={editData.budget ?? selectedClient.budget} onChange={(e) => setEditData({ ...editData, budget: e.target.value })} className="w-full border-b border-[#C9A84C] bg-transparent text-[14px] font-bold text-emerald-600 outline-none font-['Inter',sans-serif]" />
                      ) : (
                        <span className="font-['Inter',sans-serif] text-[16px] font-extrabold tabular-nums text-emerald-600">₹{selectedClient.budget || '\u2014'}</span>
                      )}
                    </div>
                    {selectedClient.property_link && (
                      <div className="col-span-2 rounded-2xl border border-black/[0.05] bg-white p-3.5">
                        <p className="mb-1 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#9ca3af]">Property link</p>
                        {editing ? (
                          <input type="url" value={editData.property_link ?? selectedClient.property_link} onChange={(e) => setEditData({ ...editData, property_link: e.target.value })} className="w-full border-b border-[#C9A84C] bg-transparent text-[13px] outline-none" />
                        ) : (
                          <a href={selectedClient.property_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 break-all text-[12.5px] font-semibold text-blue-600 hover:underline">
                            <ExternalLink className="h-3 w-3 shrink-0" /> Open property
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Requirements ── */}
                  <SectionLabel icon={<StickyNote className="h-3 w-3" />}>Special requirements</SectionLabel>
                  {editing ? (
                    <textarea value={editData.requirements ?? selectedClient.requirements} onChange={(e) => setEditData({ ...editData, requirements: e.target.value })} rows={3}
                      className="w-full resize-none rounded-2xl border border-black/[0.08] bg-white p-4 text-[13px] leading-relaxed outline-none focus:border-[#C9A84C] font-['Inter',sans-serif]"
                      placeholder="What exactly is the client looking for…" />
                  ) : (
                    <div className={`rounded-2xl border border-black/[0.05] border-l-[3px] border-l-[#C9A84C] bg-white p-4 text-[13px] leading-relaxed ${selectedClient.requirements ? 'text-[#374151] italic' : 'text-[#9ca3af]'}`}>
                      {selectedClient.requirements ? `\u201C${selectedClient.requirements}\u201D` : 'No requirements captured yet.'}
                    </div>
                  )}

                  {/* ── Earnings ── */}
                  <SectionLabel icon={<IndianRupee className="h-3 w-3" />}>Earnings</SectionLabel>
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-green-50 p-5">
                    <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-400/[0.07]" />
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-200">
                        <IndianRupee className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">Total commission</p>
                        <p className="text-[10px] text-emerald-500/70">{selectedClient.comm_status || 'Pending'}{selectedClient.comm_date ? ` · ${formatDate(selectedClient.comm_date)}` : ''}</p>
                      </div>
                    </div>
                    <p className="mt-3 font-['Inter',sans-serif] text-[26px] font-extrabold tabular-nums text-emerald-600">
                      {selectedClient.total_comm ? (() => {
                        const v = parseFloat(String(selectedClient.total_comm)) * 100000;
                        return <>₹{formatIndian(v)}<span className="ml-1.5 text-[13px] font-semibold text-emerald-400">{formatLakhText(v)}</span></>;
                      })() : '\u2014'}
                    </p>
                  </div>

                  {/* ── Commission breakdown (editable) ── */}
                  <SectionLabel icon={<IndianRupee className="h-3 w-3" />}>Commission detail</SectionLabel>
                  <div className="space-y-2.5">
                    <FieldDisplay label="Total commission (₹)" edit={editing} value={editData.total_comm ?? selectedClient.total_comm ?? ''} onChange={(v) => setEditData({ ...editData, total_comm: v })}>
                      <span className="text-[13px] font-bold text-emerald-600">{selectedClient.total_comm ? `₹${formatIndian(parseFloat(String(selectedClient.total_comm)) * 100000)}` : '\u2014'}</span>
                    </FieldDisplay>
                    {c_role(selectedClient) === 'Seller' && (
                      <FieldDisplay label="Seller commission (%)" edit={editing} value={editData.seller_comm_pct ?? selectedClient.seller_comm_pct} onChange={(v) => setEditData({ ...editData, seller_comm_pct: v })}>
                        <span className="text-[13px] font-semibold">{selectedClient.seller_comm_pct || '\u2014'}</span>
                      </FieldDisplay>
                    )}
                    <div className="flex items-center justify-between rounded-2xl border border-black/[0.05] bg-white p-3.5">
                      <div>
                        <p className="mb-1 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#9ca3af]">Commission status</p>
                        <span className={`text-[11px] font-extrabold ${(selectedClient.comm_status || 'Pending') === 'Received' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {selectedClient.comm_status || 'Pending'}
                        </span>
                      </div>
                      {canEdit && parseFloat(String(selectedClient.total_comm || '0')) > 0 && (
                        <button type="button"
                          onClick={() => void persistClient({ ...selectedClient, comm_status: (selectedClient.comm_status || 'Pending') === 'Pending' ? 'Received' : 'Pending' })}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-extrabold transition-colors ${(selectedClient.comm_status || 'Pending') === 'Received' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                          {(selectedClient.comm_status || 'Pending') === 'Received' ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                          Mark {(selectedClient.comm_status || 'Pending') === 'Pending' ? 'received' : 'pending'}
                        </button>
                      )}
                    </div>
                  </div>

                  <Separator className="my-5" />

                  {/* ── Team assignment ── */}
                  <SectionLabel icon={<Briefcase className="h-3 w-3" />}>Team assignment</SectionLabel>
                  <div className="rounded-2xl border border-black/[0.06] bg-gradient-to-br from-[#0A1628]/[0.03] to-transparent p-4">
                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <select value={assignId} onChange={(e) => setAssignId(e.target.value)} className={CRM_INPUT}>
                          <option value="">Unassigned — nobody owns this lead</option>
                          {agents.map((a: any) => (
                            <option key={a.id} value={a.id}>{a.name} · {a.employee_id} · {a.designation || a.department}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => handleAssign(assignId)} disabled={assigning || assignId === (selectedClient.assigned_employee ?? '')}
                          className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#0A1628] px-4 text-[11.5px] font-extrabold text-white transition-colors hover:bg-[#1E3852] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[40px]">
                          {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : assignId ? <UserPlus className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                          {assigning ? 'Saving…' : assignId ? 'Assign' : 'Unassign'}
                        </button>
                      </div>
                    ) : selectedClient.assigned_employee_info ? (
                      <p className="text-[12px] font-bold text-[#0A1628]">Owned by {selectedClient.assigned_employee_info.name} ({selectedClient.assigned_employee_info.employee_id})</p>
                    ) : (
                      <p className="text-[12px] text-[#9ca3af]">This lead is unassigned.</p>
                    )}
                    {canEdit && (
                      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-black/[0.05] pt-3 sm:grid-cols-[130px_1fr_auto]">
                        <select value={statusLog.status} onChange={(e) => setStatusLog((s) => ({ ...s, status: e.target.value }))} className="h-9 rounded-xl border border-black/10 bg-white px-2.5 text-[11.5px] font-bold text-[#0A1628] outline-none">
                          <option value="">Fresh — no pipeline yet</option>
                          <option>Site Visit</option>
                          <option>Token Done</option>
                          <option>Visit Done</option>
                          <option>Closed</option>
                        </select>
                        <input value={statusLog.note} onChange={(e) => setStatusLog((s) => ({ ...s, note: e.target.value }))}
                          placeholder="Note for the team (who spoke, what happened)…"
                          className="h-9 rounded-xl border border-black/10 bg-white px-3 text-[11.5px] text-[#0A1628] outline-none placeholder:text-[#9ca3af] focus:border-[#C9A84C]/60" />
                        <button type="button" onClick={handleLogStatus} disabled={assigning || !statusLog.status || statusLog.status === selectedClient.status}
                          className="inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#C9A84C]/50 bg-white px-3.5 text-[11px] font-extrabold text-[#96782A] transition-colors hover:bg-[#C9A84C]/10 disabled:cursor-not-allowed disabled:opacity-40">
                          {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Update
                        </button>
                      </div>
                    )}
                    {assignMsg && <p className="mt-2 text-[11px] font-semibold text-emerald-600">{assignMsg}</p>}
                  </div>

                  <Separator className="my-5" />

                  {/* ── Activity timeline ── */}
                  <SectionLabel icon={<History className="h-3 w-3" />}>Activity timeline</SectionLabel>
                  <div className="relative rounded-2xl border border-black/[0.05] bg-white p-4">
                    {activityLoading ? (
                      <div className="space-y-2.5">{[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-black/[0.04]" />)}</div>
                    ) : !activity || activity.length === 0 ? (
                      <div className="py-4 text-center">
                        <History className="mx-auto mb-2 h-5 w-5 text-[#C9A84C]" strokeWidth={1.5} />
                        <p className="text-[11.5px] text-[#9ca3af]">No activity yet — status changes and assignments will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {activity.map((a: any, i: number) => (
                          <div key={a.id} className={`flex items-start gap-3 py-2.5 ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
                            <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${a.action === 'status_changed' ? 'bg-[#C9A84C]/[0.15] text-[#96782A]' : 'bg-[#0A1628]/[0.06] text-[#0A1628]'}`}>
                              <Check className="h-3 w-3" strokeWidth={2.2} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <p className="text-[12px] font-bold text-[#0A1628]">{activityLabel(a.action)}</p>
                                {a.status && <span className="text-[11px] font-semibold text-[#96782A]">→ {a.status}</span>}
                                <span className="ml-auto text-[9.5px] font-semibold text-[#9ca3af]">{activityTime(a.created_at)}</span>
                              </div>
                              {a.note && <p className="mt-0.5 break-words text-[11.5px] leading-relaxed text-[#6b7280]">{a.note}</p>}
                              <p className="mt-0.5 text-[9.5px] font-semibold text-[#c4a84c]">{a.performed_by || 'System'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Notes ── */}
                  <SectionLabel icon={<StickyNote className="h-3 w-3" />}>Notes</SectionLabel>
                  {editing ? (
                    <textarea value={editData.notes ?? selectedClient.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={4}
                      className="w-full resize-none rounded-2xl border border-black/[0.08] bg-white p-4 text-[13px] leading-relaxed outline-none focus:border-[#C9A84C] font-['Inter',sans-serif]"
                      placeholder="Add notes about this client…" />
                  ) : selectedClient.notes ? (
                    <div className="rounded-2xl border border-black/[0.05] border-l-[3px] border-l-[#C9A84C] bg-white p-4 text-[13px] italic leading-relaxed text-[#6b7280]">
                      &ldquo;{selectedClient.notes}&rdquo;
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-black/10 bg-white py-4 text-center text-[12px] text-[#9ca3af]">
                      No notes added for this client yet.
                    </div>
                  )}

                  {canEdit && !editing && (
                    <div className="mt-6 border-t border-black/[0.05] pt-4">
                      <button type="button" onClick={async () => {
                        if (!confirm('Delete this client permanently?')) return;
                        try {
                          await leadSupabase.crmClients.delete(selectedClient.sno);
                          setClients(prev => prev.filter(c => c.sno !== selectedClient.sno));
                          setSelectedClient(null);
                        } catch (e: any) {
                          alert(e?.message || 'Failed to delete');
                        }
                      }}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[11.5px] font-extrabold text-red-600 transition-colors hover:bg-red-100">
                        <Landmark className="h-3.5 w-3.5" /> Delete lead
                      </button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ═══════════ ADD LEAD ═══════════ */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddError(''); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-['Inter',sans-serif] text-xl">Add lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            {addError && <p className="text-xs font-semibold text-red-500">{addError}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Name *</label>
                <input value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} placeholder="Client name" className={CRM_INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Phone</label>
                <input value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} placeholder="Phone number" type="tel" className={CRM_INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Role</label>
                <select value={addForm.client_role} onChange={e => setAddForm({...addForm, client_role: e.target.value})} className={CRM_INPUT}>
                  <option value="Buyer">Buyer</option>
                  <option value="Seller">Seller</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Email</label>
                <input value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} placeholder="email@example.com" type="email" className={CRM_INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {addForm.client_role === 'Seller' ? (
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Property category</label>
                  <select value={addForm.type} onChange={e => setAddForm({...addForm, type: e.target.value, property_subtype: ''})} className={CRM_INPUT}>
                    <option value="">Select</option>
                    <option value="Land">Land</option>
                    <option value="PG Building">PG Building</option>
                    <option value="Residential Building">Residential Building</option>
                    <option value="Commercial Building">Commercial Building</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Property type</label>
                  <input value={addForm.type} onChange={e => setAddForm({...addForm, type: e.target.value})} placeholder="e.g. Villa, Plot, Apt" className={CRM_INPUT} />
                </div>
              )}
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">{addForm.client_role === 'Seller' ? 'Price' : 'Budget'}</label>
                <input value={addForm.budget} onChange={e => setAddForm({...addForm, budget: e.target.value})} placeholder="e.g. 1.5 Cr" className={CRM_INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Location</label>
                <input value={addForm.location} onChange={e => setAddForm({...addForm, location: e.target.value})} placeholder="Preferred area" className={CRM_INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Source</label>
                <input value={addForm.source} onChange={e => setAddForm({...addForm, source: e.target.value})} placeholder="e.g. Instagram, Referral" className={CRM_INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Lead type</label>
                <select value={addForm.lead_type} onChange={e => setAddForm({...addForm, lead_type: e.target.value})} className={CRM_INPUT}>
                  <option value="new lead">New Lead</option>
                  <option value="old lead">Old Lead</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Status</label>
                <select value={addForm.status} onChange={e => setAddForm({...addForm, status: e.target.value})} className={CRM_INPUT}>
                  <option value="">New — fresh lead</option>
                  <option>Site Visit</option>
                  <option>Token Done</option>
                  <option>Visit Done</option>
                  <option>Closed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Notes</label>
              <textarea value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} placeholder="Any notes about the client…" className={`${CRM_INPUT} h-16 resize-none py-2`} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6b7280]">Property link</label>
              <input value={addForm.property_link} onChange={e => setAddForm({...addForm, property_link: e.target.value})} placeholder="https://example.com/property" type="url" className={CRM_INPUT} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <CrmBtn variant="ghost" onClick={() => setAddOpen(false)}>Cancel</CrmBtn>
              <CrmBtn variant="gold" onClick={handleAddClient} disabled={addSaving || !addForm.name.trim()}>
                {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {addSaving ? 'Adding…' : 'Add lead'}
              </CrmBtn>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .crm-search:focus { border-color: #C9A84C !important; box-shadow: 0 0 0 4px rgba(201,168,76,0.14) !important; }
        @media (max-width: 640px) { .crm-search { font-size: 15px !important; } }
      `}</style>
    </div>
  );
}

/* ═══════════════ small shared pieces ═══════════════ */

const c_role = (c: SheetClient) => c.client_role || 'Buyer';

/** Left spine on every card — stage color at a glance (Zoho-style row highlight). */
const STAGE_STRIPE: Record<string, string> = {
  '': 'bg-[#C9A84C]',
  'site visit': 'bg-amber-400',
  'token done': 'bg-blue-500',
  'visit done': 'bg-indigo-400',
  closed: 'bg-emerald-500',
};



function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="mb-2.5 mt-6 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6b7280] first:mt-0">
      <span className="text-[#C9A84C]">{icon}</span>
      {children}
    </p>
  );
}

function FieldDisplay({
  label, edit, value, onChange, children,
}: {
  label: string;
  edit: boolean;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.05] bg-white p-3.5">
      <p className="mb-1 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#9ca3af]">{label}</p>
      {edit ? inputFor(label, value, onChange) : <div className="text-[13px] font-semibold">{children}</div>}
    </div>
  );
}

function inputFor(label: string, value: string, onChange: (v: string) => void) {
  const base = 'w-full border-b border-[#C9A84C] bg-transparent text-[13px] font-semibold text-[#0A1628] outline-none font-[\'Inter\',sans-serif]';
  if (label.toLowerCase().includes('phone')) {
    return <input value={value} onChange={(e) => onChange(e.target.value)} className={base} type="tel" />;
  }
  if (label.toLowerCase().includes('date')) {
    return <input value={value} onChange={(e) => onChange(e.target.value)} className={base} type="date" />;
  }
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={base} />;
}
