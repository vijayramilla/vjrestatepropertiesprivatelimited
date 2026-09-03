import { useEffect, useState, useMemo } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import { getCrmClients, type SheetClient } from '@/data/crmClientsData';
import { IndianRupee, Clock, CheckCircle2, Calendar } from 'lucide-react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmStatCard, CrmStatGrid, CrmChip, CrmCard, MotionReveal } from '@/components/crm/CrmUi';

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

function parseDateSafe(d: string | null | undefined): Date | null {
  if (!d) return null;
  const dt = new Date(d + 'T00:00:00');
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDisplayDate(d: string | null | undefined): string {
  const dt = parseDateSafe(d);
  if (!dt) return '\u2014';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CrmEarnings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [clients, setClients] = useState<SheetClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Received'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

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
      setClients(getCrmClients());
      setLoading(false);
    })();
  }, []);

  const earningsData = useMemo(() => {
    const withComm = clients
      .filter((c) => c.total_comm && parseFloat(String(c.total_comm)) > 0)
      .map((c) => ({ ...c, commVal: parseFloat(String(c.total_comm)) * 100000, comm_date: c.comm_date || c.date }))
      .sort((a, b) => {
        const da = parseDateSafe(a.comm_date);
        const db = parseDateSafe(b.comm_date);
        if (da && db) return db.getTime() - da.getTime();
        if (da) return -1;
        if (db) return 1;
        return b.commVal - a.commVal;
      });
    const total = withComm.reduce((sum, c) => sum + c.commVal, 0);
    const pending = withComm.filter((c) => (c.comm_status || 'Pending') === 'Pending');
    const received = withComm.filter((c) => c.comm_status === 'Received');
    const pendingTotal = pending.reduce((sum, c) => sum + c.commVal, 0);
    const receivedTotal = received.reduce((sum, c) => sum + c.commVal, 0);

    const years = new Set<string>();
    withComm.forEach((c) => {
      const dt = parseDateSafe(c.comm_date);
      if (dt) years.add(String(dt.getFullYear()));
    });
    years.add(new Date().getFullYear().toString());
    const yearOptions = ['all', ...Array.from(years).sort().reverse()];

    return { clients: withComm, total, pending, received, pendingTotal, receivedTotal, yearOptions };
  }, [clients]);

  const filtered = useMemo(() => {
    let list = earningsData.clients;
    if (statusFilter === 'Pending') list = earningsData.pending;
    if (statusFilter === 'Received') list = earningsData.received;
    if (yearFilter !== 'all') {
      list = list.filter((c) => {
        const dt = parseDateSafe(c.comm_date);
        return dt && String(dt.getFullYear()) === yearFilter;
      });
    }
    return list;
  }, [earningsData, statusFilter, yearFilter]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
        <CrmPageHeader
          eyebrow="Revenue"
          title="Earnings"
          description={`${earningsData.clients.length} clients with commission`}
        />

        <CrmStatGrid>
          <MotionReveal delay={0}>
            <CrmStatCard icon={<IndianRupee className="h-5 w-5" strokeWidth={1.6} />} label="Total Commission" value={`₹${formatIndian(earningsData.total)}`} subtext={formatLakhText(earningsData.total)} tone="emerald" />
          </MotionReveal>
          <MotionReveal delay={0.05}>
            <CrmStatCard icon={<Clock className="h-5 w-5" strokeWidth={1.6} />} label="Pending Amount" value={`₹${formatIndian(earningsData.pendingTotal)}`} subtext={`${earningsData.pending.length} clients`} tone="amber" />
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <CrmStatCard icon={<CheckCircle2 className="h-5 w-5" strokeWidth={1.6} />} label="Amount Received" value={`₹${formatIndian(earningsData.receivedTotal)}`} subtext={`${earningsData.received.length} clients`} tone="emerald" />
          </MotionReveal>
          <MotionReveal delay={0.15}>
            <CrmCard className="flex flex-col justify-center p-4 sm:p-5">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[1px] text-[#6b7280]">Year Filter</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-[#9ca3af]" />
                <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                  className="h-9 w-full flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm text-[#0A1628] outline-none focus:border-[#C9A84C]/70">
                  <option value="all">All Years</option>
                  {earningsData.yearOptions.filter(y => y !== 'all').map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </CrmCard>
          </MotionReveal>
        </CrmStatGrid>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(['all', 'Pending', 'Received'] as const).map((f) => (
            <CrmChip key={f} active={statusFilter === f} onClick={() => setStatusFilter(f)}>
              {f === 'all' ? 'All' : f}
              <span className="opacity-60">{f === 'all' ? earningsData.clients.length : f === 'Pending' ? earningsData.pending.length : earningsData.received.length}</span>
            </CrmChip>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Loading earnings...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No {statusFilter !== 'all' ? statusFilter.toLowerCase() + ' ' : ''}commissions found {yearFilter !== 'all' ? `for ${yearFilter}` : ''}.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
            {filtered.map((c, idx) => (
              <div key={c.sno}
                className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border hover:bg-accent/50 transition-colors">
                <span className="text-[11px] font-bold text-muted-foreground w-5 shrink-0 text-right">#{idx + 1}</span>
                <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12.5px] font-extrabold text-[#0a0d12] bg-gradient-to-br from-[#e8d8ae] to-[#c9a962]">
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[13.5px] text-foreground truncate">{c.name}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">{c.status}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      (c.comm_status || 'Pending') === 'Received'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {c.comm_status || 'Pending'}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/60">
                      <Calendar className="w-2.5 h-2.5 inline mr-0.5" strokeWidth={1.5} />
                      {formatDisplayDate(c.comm_date)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-['Inter',sans-serif] text-base font-semibold text-emerald-600">
                    ₹{formatIndian(c.commVal)}
                  </div>
                  <div className="text-[10px] text-emerald-400 leading-tight">
                    {formatLakhText(c.commVal)}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-accent/30">
              <span className="text-sm font-bold text-foreground">
                {statusFilter === 'all' ? 'Total' : statusFilter === 'Pending' ? 'Pending Total' : 'Received Total'}
                {yearFilter !== 'all' ? ` (${yearFilter})` : ''}
              </span>
              <div className="text-right">
                <div className="font-['Inter',sans-serif] text-xl font-bold text-emerald-600">
                  ₹{formatIndian(filtered.reduce((sum, c) => sum + c.commVal, 0))}
                </div>
                <div className="text-[10px] text-emerald-400 leading-tight">
                  {formatLakhText(filtered.reduce((sum, c) => sum + c.commVal, 0))}
                </div>
              </div>
            </div>
          </div>
        )}
        </CrmPageBody>
      </main>
    </div>
  );
}
