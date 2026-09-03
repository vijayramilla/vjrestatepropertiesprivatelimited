import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import { getCrmClients, type SheetClient } from '@/data/crmClientsData';
import { Spinner } from '@/components/ui/spinner';
import { Users, IndianRupee, TrendingUp, ListChecks, Briefcase, HardDrive, ClipboardList, UserCog, Plus, ArrowUpRight } from 'lucide-react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmStatCard, CrmCard, MotionReveal } from '@/components/crm/CrmUi';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
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

const TOOLS = [
  { icon: ListChecks, label: 'Leads', desc: 'Manage all clients', path: '/crm/leads', tone: 'bg-[#C9A84C]/[0.14] text-[#96782A]' },
  { icon: IndianRupee, label: 'Earnings', desc: 'Commissions & payouts', path: '/crm/earnings', tone: 'bg-emerald-50 text-emerald-600' },
  { icon: ClipboardList, label: 'Requirements', desc: 'Client requirements board', path: '/crm/requirements', tone: 'bg-blue-50 text-blue-600' },
  { icon: UserCog, label: 'Agents', desc: 'Field agents & partners', path: '/crm/agents', tone: 'bg-purple-50 text-purple-600' },
  { icon: Briefcase, label: 'Employees', desc: 'Team, clients & logins', path: '/crm/employees', tone: 'bg-amber-50 text-amber-600' },
  { icon: HardDrive, label: 'Storage', desc: 'Files & usage', path: '/crm/storage', tone: 'bg-red-50 text-red-500' },
];

export default function AdminCrm() {
  const [clients, setClients] = useState<SheetClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: supabaseData } = await leadSupabase.crmClients.list();
        if (supabaseData.length > 0) {
          setClients(supabaseData);
          setLoading(false);
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
    })();
  }, []);

  const earningsMeta = useMemo(() => {
    const withComm = clients.filter((c) => c.total_comm && parseFloat(String(c.total_comm)) > 0);
    const total = withComm.reduce((sum, c) => sum + parseFloat(String(c.total_comm)) * 100000, 0);
    return { count: withComm.length, total };
  }, [clients]);

  const commissionSplit = useMemo(() => {
    const withComm = clients.filter((c) => parseFloat(String(c.total_comm || '0')) > 0);
    const received = withComm.filter((c) => (c.comm_status || 'Pending') === 'Received');
    const pending = withComm.filter((c) => (c.comm_status || 'Pending') !== 'Received');
    const sum = (list: SheetClient[]) => list.reduce((s, c) => s + parseFloat(String(c.total_comm)) * 100000, 0);
    return {
      received: sum(received),
      pending: sum(pending),
      receivedCount: received.length,
      pendingCount: pending.length,
    };
  }, [clients]);

  const pipelineStats = useMemo(() => {
    const order = ['New Lead', 'Site Visit', 'Negotiation', 'Closed', 'Lost'];
    const colors: Record<string, string> = { 'New Lead': 'bg-blue-500', 'Site Visit': 'bg-amber-500', Negotiation: 'bg-orange-500', Closed: 'bg-emerald-500', Lost: 'bg-red-500' };
    const counts: Record<string, number> = {};
    for (const c of clients) counts[c.status] = (counts[c.status] || 0) + 1;
    return { rows: order.map((s) => ({ label: s, count: counts[s] || 0, color: colors[s] })), total: clients.length };
  }, [clients]);

  const recent = useMemo(() => [...clients].sort((a, b) => b.sno - a.sno).slice(0, 6), [clients]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Command Center"
            title="Dashboard"
            description={`${clients.length} clients on file · VJR Estate CRM · all data in Supabase`}
            actions={
              <Link to="/crm/leads" className="no-underline">
                <span className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#D6B85D] to-[#C9A84C] px-4 py-2.5 text-xs font-bold text-[#0A1628] shadow-[0_2px_8px_rgba(201,168,76,0.35)] transition-all hover:brightness-[1.05]">
                  <Plus className="h-3.5 w-3.5" /> Manage Leads
                </span>
              </Link>
            }
          />

          {/* Tools on top */}
          <MotionReveal delay={0}>
            <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {TOOLS.map((t) => (
                <Link key={t.label} to={t.path} className="no-underline">
                  <CrmCard className="group h-full p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.tone}`}>
                      <t.icon className="h-5 w-5" strokeWidth={1.6} />
                    </div>
                    <p className="mt-3 text-[13px] font-bold text-[#0A1628]">{t.label}</p>
                    <p className="mt-0.5 text-[10.5px] text-[#9ca3af]">{t.desc}</p>
                  </CrmCard>
                </Link>
              ))}
            </div>
          </MotionReveal>

          <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
            <MotionReveal delay={0}>
              <Link to="/crm/leads" className="block h-full no-underline">
                <CrmStatCard icon={<Users className="h-5 w-5" strokeWidth={1.6} />} label="Total Clients" value={String(clients.length)} subtext="Active on file" tone="navy" />
              </Link>
            </MotionReveal>
            <MotionReveal delay={0.05}>
              <Link to="/crm/earnings" className="block h-full no-underline">
                <CrmStatCard icon={<IndianRupee className="h-5 w-5" strokeWidth={1.6} />} label="Total Earnings" value={`₹${formatIndian(earningsMeta.total)}`} subtext={formatLakhText(earningsMeta.total)} tone="emerald" />
              </Link>
            </MotionReveal>
            <MotionReveal delay={0.1}>
              <CrmStatCard icon={<IndianRupee className="h-5 w-5" strokeWidth={1.6} />} label="Commission Received" value={`₹${formatIndian(commissionSplit.received)}`} subtext={`${commissionSplit.receivedCount} deal${commissionSplit.receivedCount === 1 ? '' : 's'} received`} tone="emerald" />
            </MotionReveal>
            <MotionReveal delay={0.15}>
              <CrmStatCard icon={<TrendingUp className="h-5 w-5" strokeWidth={1.6} />} label="Commission Pending" value={`₹${formatIndian(commissionSplit.pending)}`} subtext={`${commissionSplit.pendingCount} deal${commissionSplit.pendingCount === 1 ? '' : 's'} pending`} tone="amber" />
            </MotionReveal>
            <MotionReveal delay={0.2}>
              <CrmStatCard icon={<TrendingUp className="h-5 w-5" strokeWidth={1.6} />} label="Commission Clients" value={String(earningsMeta.count)} subtext={`${earningsMeta.count > 0 ? ((earningsMeta.count / clients.length) * 100).toFixed(0) : 0}% of all clients`} tone="gold" />
            </MotionReveal>
            <MotionReveal delay={0.25}>
              <CrmStatCard icon={<Users className="h-5 w-5" strokeWidth={1.6} />} label="Sellers" value={String(clients.filter(c => c.client_role === 'Seller').length)} subtext="Seller clients on file" tone="blue" />
            </MotionReveal>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <MotionReveal delay={0.2} className="xl:col-span-3">
              <CrmCard className="h-full p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">Deal Pipeline</p>
                  <span className="text-[11px] font-semibold text-[#6b7280]">{pipelineStats.total} clients</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
                  {pipelineStats.rows.map((r) => (
                    <div key={r.label} className="rounded-xl border border-black/[0.05] bg-[#fafafa] p-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${r.color}`} />
                        <span className="truncate text-[10.5px] font-semibold text-[#6b7280]">{r.label}</span>
                      </div>
                      <p className="mt-1.5 font-['Inter',sans-serif] text-xl font-bold text-[#0A1628] tabular-nums">{r.count}</p>
                    </div>
                  ))}
                </div>
              </CrmCard>
            </MotionReveal>

            <MotionReveal delay={0.25} className="xl:col-span-2">
              <CrmCard className="h-full p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">Recent Leads</p>
                  <Link to="/crm/leads" className="flex items-center gap-1 text-[11px] font-bold text-[#96782A] no-underline hover:text-[#0A1628]">
                    View all <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
                  </Link>
                </div>
                {loading ? (
                  <div className="flex justify-center py-10"><Spinner /></div>
                ) : recent.length === 0 ? (
                  <p className="py-10 text-center text-xs text-[#9ca3af]">No clients yet.</p>
                ) : (
                  <div className="space-y-2">
                    {recent.map((c) => (
                      <Link key={c.sno} to="/crm/leads" className="block no-underline">
                        <div className="flex items-center gap-3 rounded-xl border border-black/[0.05] bg-[#fafafa] p-2.5 transition-colors hover:bg-[#C9A84C]/[0.06]">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e8d8ae] to-[#c9a962] text-[11px] font-extrabold text-[#0a0d12]">
                            {initials(c.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-bold text-[#0A1628]">{c.name}</p>
                            <p className="truncate text-[10.5px] text-[#9ca3af]">#{c.sno} · {c.location || c.type || '—'}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                            c.status === 'Closed' ? 'bg-emerald-50 text-emerald-700' : c.status === 'Lost' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
                          }`}>{c.status}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CrmCard>
            </MotionReveal>
          </div>

          <p className="text-center text-[#9ca3af] text-[11.5px] mt-8 tracking-[0.3px]">
            VJR Estate Properties &mdash; Confidential &middot; Data synced from Supabase
          </p>
        </CrmPageBody>
      </main>
    </div>
  );
}
