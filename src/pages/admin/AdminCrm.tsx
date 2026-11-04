import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import { getCrmClients, type SheetClient } from '@/data/crmClientsData';
import { Spinner } from '@/components/ui/spinner';
import { Users, IndianRupee, TrendingUp, ListChecks, Briefcase, HardDrive, ClipboardList, UserCog, Plus, ArrowUpRight } from 'lucide-react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmCard, MotionReveal } from '@/components/crm/CrmUi';

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
  const metrics = [
    { icon: Users, label: 'Total Clients', value: String(clients.length), detail: 'Client records', tone: 'navy', path: '/crm/leads' },
    { icon: IndianRupee, label: 'Total Earnings', value: `₹${formatIndian(earningsMeta.total)}`, detail: formatLakhText(earningsMeta.total), tone: 'emerald', path: '/crm/earnings' },
    { icon: IndianRupee, label: 'Commission Received', value: `₹${formatIndian(commissionSplit.received)}`, detail: `${commissionSplit.receivedCount} deal${commissionSplit.receivedCount === 1 ? '' : 's'} received`, tone: 'emerald', path: '/crm/earnings' },
    { icon: TrendingUp, label: 'Commission Pending', value: `₹${formatIndian(commissionSplit.pending)}`, detail: `${commissionSplit.pendingCount} deal${commissionSplit.pendingCount === 1 ? '' : 's'} pending`, tone: 'amber', path: '/crm/earnings' },
    { icon: TrendingUp, label: 'Commission Clients', value: String(earningsMeta.count), detail: `${earningsMeta.count > 0 && clients.length ? ((earningsMeta.count / clients.length) * 100).toFixed(0) : 0}% of all clients`, tone: 'gold', path: '/crm/earnings' },
    { icon: Users, label: 'Sellers', value: String(clients.filter((c) => c.client_role === 'Seller').length), detail: 'Seller clients on file', tone: 'blue', path: '/crm/leads' },
  ];
  const metricTones: Record<string, { icon: string; accent: string }> = {
    navy: { icon: 'bg-[#0A1628]/[0.06] text-[#0A1628]', accent: 'bg-[#0A1628]' },
    emerald: { icon: 'bg-emerald-50 text-emerald-700', accent: 'bg-emerald-600' },
    amber: { icon: 'bg-amber-50 text-amber-700', accent: 'bg-amber-500' },
    gold: { icon: 'bg-[#C9A84C]/[0.13] text-[#96782A]', accent: 'bg-[#C9A84C]' },
    blue: { icon: 'bg-blue-50 text-blue-700', accent: 'bg-blue-600' },
  };

  return (
    <div className="flex min-h-screen bg-[#F5F3EE] font-['Inter',sans-serif] text-[#0A1628] antialiased">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <CrmPageBody>
          <MotionReveal>
            <section className="relative isolate mb-7 overflow-hidden rounded-[28px] bg-[#0A1628] px-6 py-7 text-white shadow-[0_20px_55px_rgba(10,22,40,0.13)] sm:px-9 sm:py-9 lg:mb-8 lg:flex lg:min-h-[236px] lg:items-center lg:justify-between lg:px-11">
              <div className="pointer-events-none absolute -right-12 -top-32 -z-10 h-80 w-80 rounded-full border border-[#C9A84C]/20 sm:right-12 sm:top-[-190px] sm:h-[460px] sm:w-[460px]" />
              <div className="pointer-events-none absolute -right-4 -top-24 -z-10 h-64 w-64 rounded-full border border-[#C9A84C]/10 sm:right-20 sm:top-[-145px] sm:h-[370px] sm:w-[370px]" />
              <div className="relative max-w-2xl">
                <p className="mb-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.25em] text-[#D6B85D] sm:text-[10px]">
                  <span className="h-px w-6 bg-[#C9A84C]" /> VJR Estate <span className="text-white/35">/</span> Client relations
                </p>
                <h1 className="m-0 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-white sm:text-[40px] lg:text-[46px]">Portfolio overview</h1>
                <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed text-white/60 sm:text-sm">A considered view of your clients, commissions, and active deal pipeline.</p>
                <Link to="/crm/leads" className="mt-6 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-br from-[#E1C76F] to-[#C9A84C] px-4 text-xs font-bold text-[#0A1628] no-underline shadow-[0_4px_16px_rgba(201,168,76,0.2)] transition hover:brightness-105">
                  <Plus className="h-3.5 w-3.5" /> Manage leads <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="relative mt-8 hidden items-center gap-4 border-l border-white/10 py-2 pl-6 pr-3 lg:flex">
                <img src="/favicon.png" alt="VJR Estate" className="h-14 w-14 rounded-2xl object-contain ring-1 ring-[#C9A84C]/30" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">Private client</p>
                  <p className="mt-1 text-[13px] font-medium tracking-wide text-[#F6EDD3]">Management office</p>
                </div>
              </div>
            </section>
          </MotionReveal>

          <section aria-label="Key performance indicators" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              const tone = metricTones[metric.tone];
              return (
                <MotionReveal key={metric.label} delay={index * 0.04}>
                  <Link to={metric.path} className="block h-full no-underline">
                    <CrmCard className="group relative h-full overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(10,22,40,0.08)] sm:p-5">
                      <span className={`absolute inset-x-0 top-0 h-[2px] ${tone.accent} opacity-0 transition-opacity group-hover:opacity-100`} />
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-h-8 text-[10px] font-bold uppercase leading-relaxed tracking-[0.13em] text-[#81858B]">{metric.label}</p>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}><Icon className="h-[17px] w-[17px]" strokeWidth={1.7} /></span>
                      </div>
                      <p className="mt-3 truncate text-[20px] font-semibold leading-none tracking-[-0.035em] text-[#0A1628] tabular-nums sm:text-[23px]">{metric.value}</p>
                      <p className="mt-2 truncate text-[10px] leading-relaxed text-[#92959A]">{metric.detail}</p>
                    </CrmCard>
                  </Link>
                </MotionReveal>
              );
            })}
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-5 xl:gap-6">
            <MotionReveal delay={0.16} className="xl:col-span-3">
              <CrmCard className="h-full p-5 sm:p-6">
                <div className="mb-6 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A3842E]">At a glance</p>
                    <h2 className="mt-1 text-[19px] font-semibold tracking-tight text-[#0A1628]">Deal pipeline</h2>
                  </div>
                  <span className="rounded-full border border-[#E8E4DA] bg-[#FAF9F6] px-3 py-1.5 text-[10px] font-semibold text-[#73777D]">{pipelineStats.total} clients</span>
                </div>
                <div className="space-y-5">
                  {pipelineStats.rows.map((r) => (
                    <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_2fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_3fr_auto] sm:gap-5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${r.color}`} />
                        <span className="truncate text-[11px] font-medium text-[#555B63]">{r.label}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F0EEE9]">
                        <div className={`h-full rounded-full ${r.color} transition-[width] duration-500`} style={{ width: `${pipelineStats.total ? (r.count / pipelineStats.total) * 100 : 0}%` }} />
                      </div>
                      <span className="w-7 text-right text-[12px] font-semibold tabular-nums text-[#0A1628]">{r.count}</span>
                    </div>
                  ))}
                </div>
              </CrmCard>
            </MotionReveal>

            <MotionReveal delay={0.2} className="xl:col-span-2">
              <CrmCard className="h-full p-5 sm:p-6">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A3842E]">Recently added</p>
                    <h2 className="mt-1 text-[19px] font-semibold tracking-tight text-[#0A1628]">Latest leads</h2>
                  </div>
                  <Link to="/crm/leads" className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-[#96782A] no-underline transition hover:text-[#0A1628]">
                    View all <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
                  </Link>
                </div>
                {loading ? (
                  <div className="flex justify-center py-10"><Spinner /></div>
                ) : recent.length === 0 ? (
                  <p className="py-10 text-center text-xs text-[#92959A]">No clients yet.</p>
                ) : (
                  <div className="divide-y divide-[#F0EEE9]">
                    {recent.map((c) => (
                      <Link key={c.sno} to="/crm/leads" className="group flex items-center gap-3 py-3 first:pt-1 last:pb-1 no-underline">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E8E0CC] bg-[#F8F4E9] text-[10px] font-bold text-[#8A702D] transition-colors group-hover:bg-[#EFE5C8]">
                          {initials(c.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11.5px] font-semibold text-[#172438]">{c.name}</p>
                          <p className="mt-0.5 truncate text-[9.5px] text-[#92959A]">#{c.sno} <span className="px-1 text-[#C9A84C]">·</span> {c.location || c.type || '—'}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                          c.status === 'Closed' ? 'bg-emerald-50 text-emerald-700' : c.status === 'Lost' ? 'bg-red-50 text-red-600' : 'bg-[#F4F5F6] text-[#5F6874]'
                        }`}>{c.status}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </CrmCard>
            </MotionReveal>
          </div>

          <section aria-label="CRM shortcuts" className="mt-8">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A3842E]">Workspace</p>
                <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-[#0A1628]">Quick access</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
              {TOOLS.map((t) => (
                <Link key={t.label} to={t.path} className="no-underline">
                  <CrmCard className="group flex h-full items-center gap-3 p-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(10,22,40,0.07)] sm:p-4">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.tone}`}>
                      <t.icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-[#172438]">{t.label}</p>
                      <p className="mt-0.5 truncate text-[9px] text-[#92959A]">{t.desc}</p>
                    </div>
                  </CrmCard>
                </Link>
              ))}
            </div>
          </section>

          <p className="mt-8 text-center text-[10px] tracking-[0.08em] text-[#A0A19F]">
            VJR Estate Properties <span className="px-1.5 text-[#C9A84C]">·</span> Confidential
          </p>
        </CrmPageBody>
      </main>
    </div>
  );
}
