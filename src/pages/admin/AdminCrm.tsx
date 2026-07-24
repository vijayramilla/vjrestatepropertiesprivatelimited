import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import { getCrmClients, type SheetClient } from '@/data/crmClientsData';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Pencil, Phone, MessageSquare, Search, ChevronRight, X, Check, IndianRupee, Users, TrendingUp, Plus, ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import StatCard from '@/components/crm/StatCard';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

type SortKey = 'default' | 'budget-desc' | 'budget-asc' | 'name' | 'date';

export default function AdminCrm() {
  const [clients, setClients] = useState<SheetClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [selectedClient, setSelectedClient] = useState<SheetClient | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<SheetClient>>({});
  const [saving, setSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', type: '', budget: '', location: '', status: 'New Lead', source: '', notes: '', client_role: 'Buyer', property_link: '', property_subtype: '', paid_comm: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [perms, setPerms] = useState<string[] | null>(null);
  const canEdit = perms === null || perms.length === 0;
  const searchRef = useRef<HTMLInputElement>(null);

  const earningsMeta = useMemo(() => {
    const withComm = clients.filter((c) => c.total_comm && parseFloat(String(c.total_comm)) > 0);
    const total = withComm.reduce((sum, c) => sum + parseFloat(String(c.total_comm)) * 100000, 0);
    return { count: withComm.length, total };
  }, [clients]);

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

    if (sortKey === 'budget-desc') list.sort((a, b) => b.budget_val - a.budget_val);
    if (sortKey === 'budget-asc') list.sort((a, b) => a.budget_val - b.budget_val);
    if (sortKey === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === 'date')
      list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    return list;
  }, [clients, search, activeFilter, sortKey]);

  function openDrawer(client: SheetClient) {
    setSelectedClient(client);
    setEditing(false);
    setEditData({});
  }

  function startEdit() {
    if (!selectedClient) return;
    setEditing(true);
    setEditData({ ...selectedClient });
  }

  function cancelEdit() {
    setEditing(false);
    setEditData({});
  }

  async function saveEdit() {
    if (!selectedClient || !editData) return;
    setSaving(true);
    const merged = { ...selectedClient, ...editData };
    await leadSupabase.crmClients.upsert(merged);
    setClients((prev) => prev.map((c) => (c.sno === merged.sno ? merged : c)));
    setSelectedClient(merged);
    setEditing(false);
    setSaving(false);
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
      setAddForm({ name: '', phone: '', email: '', type: '', budget: '', location: '', status: 'New Lead', source: '', notes: '', client_role: 'Buyer', property_link: '', property_subtype: '', paid_comm: '' });
    } catch (err) {
      setAddError(err?.message || 'Failed to add client');
    } finally {
      setAddSaving(false);
    }
  }

  const filterCounts = useMemo(() => ({
    all: clients.length,
    dated: clients.filter((c) => c.date).length,
    notes: clients.filter((c) => c.notes).length,
    instagram: clients.filter((c) => c.source.toLowerCase() === 'instagram').length,
    buyer: clients.filter((c) => (c.client_role || 'Buyer') === 'Buyer').length,
    seller: clients.filter((c) => c.client_role === 'Seller').length,
  }), [clients]);

  const statusVariant = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('closed') || s.includes('done')) return 'default' as const;
    if (s.includes('negotiation') || s.includes('visit')) return 'secondary' as const;
    return 'outline' as const;
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-['Manrope',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 p-8 pb-16 max-sm:p-4 overflow-y-auto">
        <div className="flex items-start justify-between gap-5 flex-wrap mb-8">
          <div>
            <h1 className="font-['Fraunces',serif] text-[28px] font-semibold tracking-tight m-0">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-[13.5px] mt-1.5">
              {clients.length} active clients on file
            </p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-emerald-200/30 font-['Manrope',sans-serif]">
                <Plus className="w-3.5 h-3.5" />
                Add Client
              </button>
            )}
            <Link
              to="/crm/earnings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-xs font-bold text-muted-foreground bg-card no-underline hover:bg-accent transition-colors font-['Manrope',sans-serif]"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              View Earnings
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link to="/crm" className="no-underline">
            <StatCard
              icon={<Users className="w-5 h-5" strokeWidth={1.5} />}
              label="Total Clients"
              value={String(clients.length)}
              subtext="Active on file"
              iconBg="bg-blue-100 dark:bg-blue-900/30"
              iconColor="text-blue-600 dark:text-blue-400"
            />
          </Link>
          <Link to="/crm/earnings" className="no-underline">
            <StatCard
              icon={<IndianRupee className="w-5 h-5" strokeWidth={1.5} />}
              label="Total Earnings"
              value={`₹${formatIndian(earningsMeta.total)}`}
              subtext={formatLakhText(earningsMeta.total)}
              iconBg="bg-emerald-100 dark:bg-emerald-900/30"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
          </Link>
          <StatCard
            icon={<TrendingUp className="w-5 h-5" strokeWidth={1.5} />}
            label="Commission Clients"
            value={String(earningsMeta.count)}
            subtext={`${earningsMeta.count > 0 ? ((earningsMeta.count / clients.length) * 100).toFixed(0) : 0}% of all clients`}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <StatCard
            icon={<Users className="w-5 h-5" strokeWidth={1.5} />}
            label="Sellers"
            value={String(clients.filter(c => c.client_role === 'Seller').length)}
            subtext="Seller clients on file"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
          />
        </div>

          <div className="relative w-full max-w-[720px] mb-7 sm:mb-7">
            <Search className="absolute left-[18px] top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af] pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name, phone, email, source, budget, location, status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="crm-search w-full bg-white border-2 border-[#e5e7eb] text-[#111827] py-4 pl-[52px] pr-[52px] rounded-xl text-base font-['Manrope',sans-serif] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.05)] box-border transition-[border-color,box-shadow] duration-200"
            />
            <span className="flex items-center justify-center absolute right-[14px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#f5f5f5] border border-[#e5e7eb] text-[#9ca3af] text-xs font-bold pointer-events-none">
              /
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-[#9ca3af] text-sm">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-16 text-[#9ca3af] text-sm">No client data available.</div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                {(['all', 'buyer', 'seller', 'dated', 'notes', 'instagram'] as const).map((f) => {
                  const label = { all: 'All Clients', buyer: 'Buyer', seller: 'Seller', dated: 'With Lead Date', notes: 'Has Notes', instagram: 'Instagram Source' }[f];
                  const count = filterCounts[f];
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setActiveFilter(f)}
                      className={`px-3.5 py-2 rounded-full border text-xs font-bold cursor-pointer flex items-center gap-1.5 font-['Manrope',sans-serif] transition-colors ${
                        activeFilter === f
                          ? 'bg-[rgba(201,169,98,0.12)] border-[rgba(201,169,98,0.4)] text-[#e8d8ae]'
                          : 'bg-white border-[#e5e7eb] text-[#6b7280] hover:bg-[#f5f5f5]'
                      }`}
                    >
                      {label}
                      <span className="bg-[rgba(255,255,255,0.08)] px-[7px] py-px rounded-[10px] text-[10.5px]">{count}</span>
                    </button>
                  );
                })}
                <div className="flex-1" />
                <Select value={sortKey} onValueChange={(v: SortKey) => setSortKey(v)}>
                  <SelectTrigger className="w-[200px] h-9 rounded-full text-xs font-bold text-[#6b7280] border-[#e5e7eb] bg-white">
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

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-[#9ca3af] text-sm">No clients match this filter.</div>
                ) : filtered.map((c) => (
                  <div
                    key={c.sno}
                    onClick={() => openDrawer(c)}
                    className="bg-white border border-[#f0f0f0] rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-[#e0e0e0] transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[13px] font-extrabold text-[#0a0d12] bg-gradient-to-br from-[#e8d8ae] to-[#c9a962]">
                        {initials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-[14px] text-[#111827] truncate">{c.name}</div>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            (c.client_role || 'Buyer') === 'Buyer'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {c.client_role || 'Buyer'}
                          </span>
                        </div>
                        <div className="text-[12.5px] text-[#6b7280] mt-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[#9ca3af]" strokeWidth={1.5} />
                            {c.phone}
                          </div>
                          {c.email && <div className="truncate">{c.email}</div>}
                          {(c.client_role || 'Buyer') === 'Seller' ? (
                            <div>{[c.type, c.property_subtype].filter(Boolean).join(' · ')}</div>
                          ) : (
                            <div>{[c.type, c.location].filter(Boolean).join(' · ')}</div>
                          )}
                          {(c.client_role || 'Buyer') === 'Seller' && c.location && <div>{c.location}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#f0f0f0] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Badge variant={statusVariant(c.status)} className="text-[10.5px] font-bold px-2.5 py-0.5">
                          {c.status}
                        </Badge>
                        <span className="font-['Fraunces',serif] font-semibold text-emerald-600 text-[12.5px]">₹{c.budget}</span>
                        {(c.client_role || 'Buyer') === 'Seller' && c.property_link && (
                          <a href={c.property_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                            <ExternalLink className="w-3 h-3" strokeWidth={2} />
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        {c.total_comm ? (
                          <span className="font-['Fraunces',serif] font-semibold text-emerald-600 text-[11.5px]">₹{toLakhs(parseFloat(String(c.total_comm)) * 100000)}</span>
                        ) : null}
                        {c.date && (
                          <div className="text-[10.5px] text-[#9ca3af] mt-0.5">{formatDate(c.date)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-[#9ca3af] text-[11.5px] mt-8 tracking-[0.3px]">
                VJR Estate Properties &mdash; Confidential Client Register &middot; Data synced from CRM
              </p>
            </>
          )}
        </main>

      <Sheet open={!!selectedClient} onOpenChange={(open) => { if (!open) { setSelectedClient(null); setEditing(false); setEditData({}); } }}>
        <SheetContent className="w-[420px] max-w-[92vw] bg-[#fafafa] border-l border-[#e5e7eb] p-0 overflow-y-auto">
          {selectedClient && (
            <>
              <SheetHeader className="p-7 pb-5 border-b border-[#f0f0f0] bg-gradient-to-b from-[rgba(201,169,98,0.06)] to-transparent relative">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center font-['Fraunces',serif] text-[22px] font-semibold text-[#0a0d12] bg-gradient-to-br from-[#e8d8ae] to-[#c9a962] shadow-[0_0_0_4px_rgba(201,169,98,0.12)] mb-3.5">
                    {initials(selectedClient.name)}
                  </div>
                  <div className="flex gap-1.5">
                    {editing ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button variant="default" size="icon" className="h-8 w-8 bg-[#c9a962] hover:bg-[#b8953f]" onClick={saveEdit} disabled={saving}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </>
                    ) : canEdit ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={startEdit}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <SheetTitle className="font-['Fraunces',serif] text-[22px] font-semibold text-left">{selectedClient.name}</SheetTitle>
                <p className="text-xs text-[#9ca3af] mt-1 mb-3">
                  Client ID #{selectedClient.sno} &middot; {selectedClient.type}
                </p>
                <Badge variant={statusVariant(selectedClient.status)} className="self-start text-[11.5px] font-bold px-3 py-1">
                  {editing ? (
                    <select
                      value={editData.status ?? selectedClient.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="bg-transparent border-none text-inherit font-bold text-[11.5px] outline-none cursor-pointer"
                    >
                      <option>New Lead</option>
                      <option>Site Visit</option>
                      <option>Negotiation</option>
                      <option>Closed</option>
                      <option>Lost</option>
                    </select>
                  ) : (
                    selectedClient.status
                  )}
                </Badge>
              </SheetHeader>

              <div className="p-7 pt-0">
                <div className="flex gap-2 mt-5 mb-2">
                  <a
                    href={`tel:${selectedClient.phone.replace(/\s/g, '')}`}
                    className="flex-1 py-2.5 rounded-xl text-center text-xs font-bold no-underline flex items-center justify-center gap-1.5 cursor-pointer border border-[#c9a962] text-[#0a0d12] bg-[#c9a962] font-['Manrope',sans-serif]"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                  <a
                    href={`https://wa.me/91${selectedClient.phone.replace(/\D/g, '').slice(-10)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl text-center text-xs font-bold no-underline flex items-center justify-center gap-1.5 cursor-pointer border border-[#e5e7eb] text-[#111827] bg-white font-['Manrope',sans-serif]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                </div>

                <div className="text-[10.5px] uppercase tracking-[1.4px] text-[#9ca3af] mt-6 mb-3">Client Overview</div>
                <div className="grid grid-cols-2 gap-3.5">
                  <FieldDisplay label="Phone Number" edit={editing} value={editData.phone ?? selectedClient.phone} onChange={(v) => setEditData({ ...editData, phone: v })}>
                    <a href={`tel:${selectedClient.phone.replace(/\s/g, '')}`} className="text-[#111827] no-underline font-semibold text-sm">{selectedClient.phone}</a>
                  </FieldDisplay>
                  <FieldDisplay label="Email" edit={editing} value={editData.email ?? selectedClient.email} onChange={(v) => setEditData({ ...editData, email: v })}>
                    <span className="font-semibold text-sm">{selectedClient.email || '\u2014'}</span>
                  </FieldDisplay>
                  {(selectedClient.client_role || 'Buyer') === 'Seller' ? (
                    <>
                      <FieldDisplay label="Property Category" edit={editing} value={editData.type ?? selectedClient.type} onChange={(v) => setEditData({ ...editData, type: v })}>
                        <span className="font-semibold text-sm">{selectedClient.type}</span>
                      </FieldDisplay>
                      <FieldDisplay label="Property Sub-type" edit={editing} value={editData.property_subtype ?? selectedClient.property_subtype} onChange={(v) => setEditData({ ...editData, property_subtype: v })}>
                        <span className="font-semibold text-sm">{selectedClient.property_subtype || '\u2014'}</span>
                      </FieldDisplay>
                      <FieldDisplay label="Location" edit={editing} value={editData.location ?? selectedClient.location} onChange={(v) => setEditData({ ...editData, location: v })}>
                        <span className="font-semibold text-sm">{selectedClient.location || '\u2014'}</span>
                      </FieldDisplay>
                    </>
                  ) : (
                    <>
                      <FieldDisplay label="Property Type" edit={editing} value={editData.type ?? selectedClient.type} onChange={(v) => setEditData({ ...editData, type: v })}>
                        <span className="font-semibold text-sm">{selectedClient.type}</span>
                      </FieldDisplay>
                      <FieldDisplay label="Preferred Location" edit={editing} value={editData.location ?? selectedClient.location} onChange={(v) => setEditData({ ...editData, location: v })}>
                        <span className="font-semibold text-sm">{selectedClient.location || '\u2014'}</span>
                      </FieldDisplay>
                    </>
                  )}
                  <div className="bg-white border border-[#f0f0f0] rounded-xl p-3.5">
                    <div>
                      <div className="text-[10.5px] uppercase tracking-[1px] text-[#9ca3af] mb-1">Role</div>
                      {canEdit ? (
                        <select value={selectedClient.client_role || 'Buyer'} onChange={async (e) => {
                          const updated = { ...selectedClient, client_role: e.target.value };
                          setSelectedClient(updated);
                          setClients(prev => prev.map(c => c.sno === updated.sno ? updated : c));
                          await leadSupabase.crmClients.upsert(updated);
                        }}
                          className={`w-full h-9 px-3 rounded-xl border text-sm font-bold outline-none transition-colors ${
                            (selectedClient.client_role || 'Buyer') === 'Buyer'
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-blue-300 bg-blue-50 text-blue-700'
                          }`}>
                          <option value="Buyer" className="text-amber-700 bg-white">Buyer</option>
                          <option value="Seller" className="text-blue-700 bg-white">Seller</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-3 py-1.5 rounded-xl text-sm font-bold ${
                          (selectedClient.client_role || 'Buyer') === 'Buyer'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>{selectedClient.client_role || 'Buyer'}</span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 bg-white border border-[#f0f0f0] rounded-xl p-3.5">
                    <div className="text-[10.5px] uppercase tracking-[1px] text-[#9ca3af] mb-1">{(selectedClient.client_role || 'Buyer') === 'Seller' ? 'Price' : 'Budget Range'}</div>
                    {editing ? (
                      <input
                        value={editData.budget ?? selectedClient.budget}
                        onChange={(e) => setEditData({ ...editData, budget: e.target.value })}
                        className="w-full bg-transparent border-b border-[#c9a962] text-sm font-semibold text-emerald-600 outline-none font-['Fraunces',serif]"
                      />
                    ) : (
                      <strong className="font-['Fraunces',serif] font-semibold text-emerald-600 text-sm">
                        ₹{selectedClient.budget}
                      </strong>
                    )}
                  </div>
                  <FieldDisplay label="Lead Source" edit={editing} value={editData.source ?? selectedClient.source} onChange={(v) => setEditData({ ...editData, source: v })}>
                    <span className="font-semibold text-sm">{selectedClient.source || 'Direct'}</span>
                  </FieldDisplay>
                  <FieldDisplay label="Lead Date Logged" edit={editing} value={editData.date ?? selectedClient.date ?? ''} onChange={(v) => setEditData({ ...editData, date: v })}>
                    <span className="font-semibold text-sm">
                      {selectedClient.date
                        ? new Date(selectedClient.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                        : 'Not yet logged'}
                    </span>
                  </FieldDisplay>
                  <FieldDisplay label="Closing Timeline" edit={editing} value={editData.closing_timeline ?? selectedClient.closing_timeline} onChange={(v) => setEditData({ ...editData, closing_timeline: v })}>
                    <span className="font-semibold text-sm">{selectedClient.closing_timeline || '\u2014'}</span>
                  </FieldDisplay>
                  <div className="col-span-2 bg-white border border-[#f0f0f0] rounded-xl p-3.5">
                    <div className="text-[10.5px] uppercase tracking-[1px] text-[#9ca3af] mb-1">Special Requirements</div>
                    {editing ? (
                      <textarea
                        value={editData.requirements ?? selectedClient.requirements}
                        onChange={(e) => setEditData({ ...editData, requirements: e.target.value })}
                        className="w-full bg-transparent border-b border-[#c9a962] text-sm outline-none resize-none font-['Manrope',sans-serif]"
                        rows={2}
                      />
                    ) : (
                      <span className="font-semibold text-sm">{selectedClient.requirements || '\u2014'}</span>
                    )}
                  </div>
                  {selectedClient.property_link && (
                    <div className="col-span-2 bg-white border border-[#f0f0f0] rounded-xl p-3.5">
                      <div className="text-[10.5px] uppercase tracking-[1px] text-[#9ca3af] mb-1">Property Link</div>
                      {editing ? (
                        <input value={editData.property_link ?? selectedClient.property_link} onChange={e => setEditData({ ...editData, property_link: e.target.value })}
                          className="w-full bg-transparent border-b border-[#c9a962] text-sm outline-none font-['Manrope',sans-serif]" type="url" />
                      ) : (
                        <a href={selectedClient.property_link} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-600 hover:underline break-all">{selectedClient.property_link}</a>
                      )}
                    </div>
                  )}
                </div>

                <Separator className="my-5" />

                <div className="text-[10.5px] uppercase tracking-[1.4px] text-[#9ca3af] mb-3">Deal Pipeline</div>
                <div className="flex items-center gap-0 mb-5">
                  {['New Lead', 'Site Visit', 'Negotiation', 'Closed'].map((step, i) => {
                    const steps = ['New Lead', 'Site Visit', 'Negotiation', 'Closed'];
                    const curIdx = steps.indexOf(selectedClient.status);
                    const isActive = i <= curIdx;
                    return (
                      <div key={step} className="flex-1 text-center relative">
                        <div className={`h-1 rounded mb-2 transition-colors ${isActive ? 'bg-[#c9a962]' : 'bg-[#e5e7eb]'}`} />
                        {canEdit ? (
                          <button type="button" onClick={async () => {
                            if (step === selectedClient.status) return;
                            const updated = { ...selectedClient, status: step };
                            setSelectedClient(updated);
                            setClients((prev) => prev.map((c) => (c.sno === updated.sno ? updated : c)));
                            await leadSupabase.crmClients.upsert(updated);
                          }}
                            className="text-[11px] font-medium transition-colors cursor-pointer group border-none bg-transparent p-0 hover:opacity-80"
                          >
                            {step}
                          </button>
                        ) : (
                          <span className={`text-[11px] font-medium ${isActive ? 'text-[#c9a962]' : 'text-[#6b7280]'}`}>{step}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200/60 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                      <IndianRupee className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-[1.2px]">Earnings</div>
                      <div className="text-[10px] text-emerald-500/70">Total Commission</div>
                    </div>
                  </div>
                  <div className="font-['Fraunces',serif] text-2xl font-bold text-emerald-600">
                    {selectedClient.total_comm ? (() => {
                      const v = parseFloat(String(selectedClient.total_comm)) * 100000;
                      return <span>₹{formatIndian(v)}<span className="text-sm font-normal text-emerald-400 ml-1.5">{formatLakhText(v)}</span></span>;
                    })() : '\u2014'}
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="text-[10.5px] uppercase tracking-[1.4px] text-[#9ca3af] mb-3">
                  {(selectedClient.client_role || 'Buyer') === 'Seller' ? 'Commission (Seller)' : 'Commission (Buyer)'}
                </div>
                <div className="space-y-3">
                  <div className="bg-white border border-[#f0f0f0] rounded-xl p-3.5">
                    <div className="text-[10.5px] uppercase tracking-[1px] text-[#9ca3af] mb-1">Total Commission</div>
                    {editing ? (
                      <input
                        value={editData.total_comm ?? selectedClient.total_comm ?? ''}
                        onChange={(e) => setEditData({ ...editData, total_comm: e.target.value })}
                        onBlur={(e) => {
                          const val = e.target.value;
                          const converted = parseToLakhs(val);
                          if (converted !== val) {
                            setEditData((prev) => ({ ...prev, total_comm: converted }));
                          }
                        }}
                        className="w-full bg-transparent border-b border-[#c9a962] text-sm font-semibold text-emerald-600 outline-none font-['Fraunces',serif]"
                        placeholder="e.g. 50000 (₹)"
                      />
                    ) : (() => {
                      const tv = parseFloat(String(selectedClient.total_comm || '0')) * 100000;
                      return tv > 0 ? (
                        <div>
                          <span className="font-['Fraunces',serif] font-semibold text-emerald-600 text-sm">₹{formatIndian(tv)}</span>
                          <span className="text-[10.5px] text-emerald-400 ml-1.5">{formatLakhText(tv)}</span>
                        </div>
                      ) : <span className="font-semibold text-sm text-muted-foreground">\u2014</span>;
                    })()}
                  </div>
                  {(selectedClient.client_role || 'Buyer') === 'Seller' ? (
                    <div className="bg-white border border-[#f0f0f0] rounded-xl p-3.5">
                      <div className="text-[10.5px] uppercase tracking-[1px] text-[#9ca3af] mb-1">Seller Commission (%)</div>
                      {editing ? (
                        <input value={editData.seller_comm_pct ?? selectedClient.seller_comm_pct} onChange={e => setEditData({ ...editData, seller_comm_pct: e.target.value })}
                          className="w-full bg-transparent border-b border-[#c9a962] text-sm outline-none font-['Manrope',sans-serif]" />
                      ) : (
                        <span className="font-semibold text-sm">{selectedClient.seller_comm_pct || '\u2014'}</span>
                      )}
                    </div>
                  ) : null}
                  <div className="bg-white border border-[#f0f0f0] rounded-xl p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10.5px] uppercase tracking-[1px] text-[#9ca3af] mb-1">Commission Status</div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          (selectedClient.comm_status || 'Pending') === 'Received'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {selectedClient.comm_status || 'Pending'}
                        </span>
                      </div>
                      {canEdit && parseFloat(String(selectedClient.total_comm || '0')) > 0 && (
                        <button
                          onClick={async () => {
                            const newStatus = (selectedClient.comm_status || 'Pending') === 'Pending' ? 'Received' : 'Pending';
                            const updated = { ...selectedClient, comm_status: newStatus };
                            setSelectedClient(updated);
                            setClients(prev => prev.map(c => c.sno === updated.sno ? updated : c));
                            await leadSupabase.crmClients.upsert(updated);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            (selectedClient.comm_status || 'Pending') === 'Received'
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          {(selectedClient.comm_status || 'Pending') === 'Received' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                          Mark as {(selectedClient.comm_status || 'Pending') === 'Pending' ? 'Received' : 'Pending'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-white border border-[#f0f0f0] rounded-xl p-3.5">
                    <div className="text-[10.5px] uppercase tracking-[1px] text-[#9ca3af] mb-1">Received Date</div>
                    {editing ? (
                      <input value={editData.comm_date ?? selectedClient.comm_date ?? ''} onChange={e => setEditData({ ...editData, comm_date: e.target.value })}
                        className="w-full bg-transparent border-b border-[#c9a962] text-sm outline-none font-['Manrope',sans-serif]" type="date" />
                    ) : (
                      <span className="font-semibold text-sm">
                        {selectedClient.comm_date ? new Date(selectedClient.comm_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '\u2014'}
                      </span>
                    )}
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="text-[10.5px] uppercase tracking-[1.4px] text-[#9ca3af] mb-3">Notes</div>
                {editing ? (
                  <textarea
                    value={editData.notes ?? selectedClient.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    className="w-full bg-white border border-[#f0f0f0] border-l-[3px] border-l-[#c9a962] rounded-xl p-4 text-sm text-[#6b7280] leading-relaxed italic outline-none resize-none font-['Manrope',sans-serif]"
                    rows={4}
                    placeholder="Add notes about this client..."
                  />
                ) : selectedClient.notes ? (
                  <div className="bg-white border border-[#f0f0f0] border-l-[3px] border-l-[#c9a962] rounded-xl p-4 text-sm text-[#6b7280] leading-relaxed italic">
                    &ldquo;{selectedClient.notes}&rdquo;
                  </div>
                ) : (
                  <div className="text-center text-[#9ca3af] text-[12.5px] py-3.5">
                    No notes added for this client yet.
                  </div>
                )}

                {canEdit && !editing && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <button onClick={async () => {
                      if (!confirm('Delete this client permanently?')) return;
                      try {
                        await leadSupabase.crmClients.delete(selectedClient.sno);
                        setClients(prev => prev.filter(c => c.sno !== selectedClient.sno));
                        setSelectedClient(null);
                      } catch (e: any) {
                        alert(e?.message || 'Failed to delete');
                      }
                    }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete Client
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddError(''); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-['Fraunces',serif] text-xl">Add Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            {addError && <p className="text-xs text-red-500">{addError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Name *</label>
                <input value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} placeholder="Client name"
                  className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Phone</label>
                <input value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} placeholder="Phone number" type="tel"
                  className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-2">Role</label>
              <select value={addForm.client_role} onChange={e => setAddForm({...addForm, client_role: e.target.value})}
                className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors">
                <option value="Buyer">Buyer</option>
                <option value="Seller">Seller</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Email</label>
                <input value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} placeholder="email@example.com" type="email"
                  className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
              </div>
              {addForm.client_role === 'Seller' ? (
                <div>
                  <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Property Category</label>
                  <select value={addForm.type} onChange={e => setAddForm({...addForm, type: e.target.value, property_subtype: ''})}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors">
                    <option value="">Select</option>
                    <option value="Land">Land</option>
                    <option value="PG Building">PG Building</option>
                    <option value="Residential Building">Residential Building</option>
                    <option value="Commercial Building">Commercial Building</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Property Type</label>
                  <input value={addForm.type} onChange={e => setAddForm({...addForm, type: e.target.value})} placeholder="e.g. Villa, Plot, Apt"
                    className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
                </div>
              )}
            </div>
            {addForm.client_role === 'Seller' && addForm.type === 'Land' && (
              <div>
                <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Property Sub-type</label>
                <select value={addForm.property_subtype} onChange={e => setAddForm({...addForm, property_subtype: e.target.value})}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors">
                  <option value="">Select</option>
                  <option value="Agriculture Land">Agriculture Land</option>
                  <option value="Residential Plot">Residential Plot</option>
                  <option value="Commercial Plot">Commercial Plot</option>
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">{addForm.client_role === 'Seller' ? 'Price' : 'Budget'}</label>
                <input value={addForm.budget} onChange={e => setAddForm({...addForm, budget: e.target.value})} placeholder={addForm.client_role === 'Seller' ? 'e.g. 1.5 Cr' : 'e.g. 1.5 Cr'}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Location</label>
                <input value={addForm.location} onChange={e => setAddForm({...addForm, location: e.target.value})} placeholder="Preferred area"
                  className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Source</label>
                <input value={addForm.source} onChange={e => setAddForm({...addForm, source: e.target.value})} placeholder="e.g. Instagram, Referral"
                  className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Status</label>
                <select value={addForm.status} onChange={e => setAddForm({...addForm, status: e.target.value})}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors">
                  <option>New Lead</option>
                  <option>Site Visit</option>
                  <option>Negotiation</option>
                  <option>Closed</option>
                  <option>Lost</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Notes</label>
              <textarea value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} placeholder="Any notes about the client..."
                className="w-full h-16 px-3 py-2 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors resize-none" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[1px] font-bold text-muted-foreground block mb-1">Property Link</label>
              <input value={addForm.property_link} onChange={e => setAddForm({...addForm, property_link: e.target.value})} placeholder="https://example.com/property" type="url"
                className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-emerald-400 transition-colors" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAddOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground bg-card hover:bg-accent transition-colors">Cancel</button>
              <button onClick={handleAddClient} disabled={addSaving || !addForm.name.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 transition-all disabled:opacity-50">
                {addSaving ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .crm-search:focus { border-color: #c9a962 !important; box-shadow: 0 0 0 4px rgba(201,169,98,0.12) !important; }
        @media (max-width: 640px) { .crm-search { font-size: 15px !important; } }
      `}</style>
    </div>
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
    <div className="bg-white border border-[#f0f0f0] rounded-xl p-3.5">
      <div className="text-[10.5px] uppercase tracking-[1px] text-[#9ca3af] mb-1">{label}</div>
      {edit ? (
        inputFor(label, value, onChange)
      ) : (
        <div className="font-semibold text-sm">{children}</div>
      )}
    </div>
  );
}

function inputFor(label: string, value: string, onChange: (v: string) => void) {
  const base = 'w-full bg-transparent border-b border-[#c9a962] text-sm outline-none font-[\'Manrope\',sans-serif]';
  if (label.toLowerCase().includes('phone')) {
    return <input value={value} onChange={(e) => onChange(e.target.value)} className={base} type="tel" />;
  }
  if (label.toLowerCase().includes('date')) {
    return <input value={value} onChange={(e) => onChange(e.target.value)} className={base} type="date" />;
  }
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={base} />;
}
