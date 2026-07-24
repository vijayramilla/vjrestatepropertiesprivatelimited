import { useEffect, useState, useMemo } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import { getCrmClients, type SheetClient } from '@/data/crmClientsData';
import { IndianRupee, Clock, CheckCircle2, Calendar } from 'lucide-react';
import CrmSidebar from '@/components/crm/CrmSidebar';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 640);
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
    <div className="min-h-screen bg-background text-foreground font-['Manrope',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 p-8 pb-16 max-sm:p-4 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
            <IndianRupee className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="font-['Fraunces',serif] text-[28px] font-semibold tracking-tight m-0 text-foreground">
              Earnings
            </h1>
            <p className="text-muted-foreground text-[13.5px] mt-0.5">
              {earningsData.clients.length} clients with commission
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="border border-border rounded-xl p-5 bg-card">
            <div className="text-[10.5px] uppercase tracking-[1px] text-muted-foreground mb-1">Total Commission</div>
            <div className="font-['Fraunces',serif] text-3xl font-bold text-emerald-600">
              ₹{formatIndian(earningsData.total)}
            </div>
            <div className="text-xs text-emerald-400 mt-0.5">{formatLakhText(earningsData.total)}</div>
          </div>
          <div className="border border-border rounded-xl p-5 bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10.5px] uppercase tracking-[1px] text-muted-foreground">Pending Amount</span>
            </div>
            <div className="font-['Fraunces',serif] text-3xl font-bold text-amber-600">
              ₹{formatIndian(earningsData.pendingTotal)}
            </div>
            <div className="text-xs text-amber-400 mt-0.5">{earningsData.pending.length} clients</div>
          </div>
          <div className="border border-border rounded-xl p-5 bg-card">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10.5px] uppercase tracking-[1px] text-muted-foreground">Amount Received</span>
            </div>
            <div className="font-['Fraunces',serif] text-3xl font-bold text-emerald-600">
              ₹{formatIndian(earningsData.receivedTotal)}
            </div>
            <div className="text-xs text-emerald-400 mt-0.5">{earningsData.received.length} clients</div>
          </div>
          <div className="border border-border rounded-xl p-5 bg-card flex flex-col justify-center">
            <div className="text-[10.5px] uppercase tracking-[1px] text-muted-foreground mb-1">Year Filter</div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-border bg-card text-sm outline-none text-foreground">
                <option value="all">All Years</option>
                {earningsData.yearOptions.filter(y => y !== 'all').map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(['all', 'Pending', 'Received'] as const).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-2 rounded-full border text-xs font-bold cursor-pointer transition-colors ${
                statusFilter === f
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-card border-border text-muted-foreground hover:bg-accent'
              }`}>
              {f === 'all' ? 'All' : f}
              <span className="ml-1.5 opacity-60">
                {f === 'all' ? earningsData.clients.length : f === 'Pending' ? earningsData.pending.length : earningsData.received.length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Loading earnings...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No {statusFilter !== 'all' ? statusFilter.toLowerCase() + ' ' : ''}commissions found {yearFilter !== 'all' ? `for ${yearFilter}` : ''}.</div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {filtered.map((c, idx) => (
              <div key={c.sno}
                className="flex items-center justify-between px-6 py-4 border-b border-border hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-muted-foreground w-5 text-right">#{idx + 1}</span>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12.5px] font-extrabold text-[#0a0d12] bg-gradient-to-br from-[#e8d8ae] to-[#c9a962]">
                    {initials(c.name)}
                  </div>
                  <div>
                    <div className="font-bold text-[13.5px] text-foreground">{c.name}</div>
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
                </div>
                <div className="text-right">
                  <div className="font-['Fraunces',serif] text-base font-semibold text-emerald-600">
                    ₹{formatIndian(c.commVal)}
                  </div>
                  <div className="text-[10px] text-emerald-400 leading-tight">
                    {formatLakhText(c.commVal)}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-accent/30">
              <span className="text-sm font-bold text-foreground">
                {statusFilter === 'all' ? 'Total' : statusFilter === 'Pending' ? 'Pending Total' : 'Received Total'}
                {yearFilter !== 'all' ? ` (${yearFilter})` : ''}
              </span>
              <div className="text-right">
                <div className="font-['Fraunces',serif] text-xl font-bold text-emerald-600">
                  ₹{formatIndian(filtered.reduce((sum, c) => sum + c.commVal, 0))}
                </div>
                <div className="text-[10px] text-emerald-400 leading-tight">
                  {formatLakhText(filtered.reduce((sum, c) => sum + c.commVal, 0))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
