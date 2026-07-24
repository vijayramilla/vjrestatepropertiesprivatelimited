import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import CrmSidebar from '@/components/crm/CrmSidebar';
import StatCard from '@/components/crm/StatCard';
import {
  Database,
  HardDrive,
  Activity,
  Wifi,
  Shield,
  Lock,
  Server,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface TableInfo {
  name: string;
  row_count: number;
  size: number;
}

interface DbStats {
  database_size: number;
  tables: TableInfo[];
  active_connections: number;
  total_tables: number;
}

interface BucketInfo {
  name: string;
  file_count: number;
  is_public: boolean;
}

const PLAN_CAPACITIES: Record<string, number> = {
  free: 500 * 1024 * 1024,
  pro: 8 * 1024 * 1024 * 1024,
  team: 16 * 1024 * 1024 * 1024,
  enterprise: 100 * 1024 * 1024 * 1024,
};
const MANAGEMENT_KEY = import.meta.env.VITE_SUPABASE_MANAGEMENT_KEY ?? '';
const PROJECT_REF = 'qrlkicsxnhaplwkotnyd';

function fmtBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}

function fmtRows(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const DONUT_COLORS = ['#10b981', '#e4e4e7'];
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#ec4899'];

export default function CrmData() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 640);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [projectName, setProjectName] = useState('');
  const [planTier, setPlanTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rpcError, setRpcError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchProjectInfo = useCallback(async () => {
    if (!MANAGEMENT_KEY) return;
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}`, {
        headers: { Authorization: `Bearer ${MANAGEMENT_KEY}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setProjectName(data.name ?? '');
      setPlanTier(data.plan ?? 'free');
    } catch {
      // fallback
    }
  }, []);

  const SQL = `CREATE OR REPLACE FUNCTION public.get_db_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE db_size bigint; result json;
BEGIN
  db_size := pg_database_size(current_database());
  SELECT json_build_object(
    'database_size', db_size,
    'tables', COALESCE((SELECT json_agg(json_build_object('name',t.relname,'row_count',COALESCE(t.n_live_tup,0),'size',pg_total_relation_size(t.relid)) ORDER BY pg_total_relation_size(t.relid) DESC) FROM pg_stat_user_tables t WHERE t.schemaname='public'),'[]'::json),
    'active_connections',(SELECT count(*) FROM pg_stat_activity WHERE state='active'),
    'total_tables',(SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')
  ) INTO result;
  RETURN result;
END;$$;`;

  const ensureFunction = useCallback(async () => {
    if (!MANAGEMENT_KEY) return;
    await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MANAGEMENT_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SQL }),
    });
  }, []);

  const fetchDbStats = useCallback(async () => {
    try { await ensureFunction(); } catch {}
    try {
      const client = supabase;
      const { data, error: rpcErr } = await client.rpc('get_db_stats');
      if (rpcErr) {
        setRpcError(rpcErr.message);
        return;
      }
      setRpcError('');
      if (data) setDbStats(data as DbStats);
    } catch (e) {
      setRpcError(e instanceof Error ? e.message : 'Failed to fetch database stats');
    }
  }, [ensureFunction]);

  const fetchBuckets = useCallback(async () => {
    try {
      const { data: bucketList, error: listErr } = await supabase.storage.listBuckets();
      if (listErr) throw listErr;
      if (!bucketList) return;

      const results: BucketInfo[] = [];
      for (const bucket of bucketList) {
        const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 1000 });
        results.push({
          name: bucket.name,
          file_count: files?.length ?? 0,
          is_public: bucket.public,
        });
      }
      setBuckets(results);
    } catch {
      // fallback
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProjectInfo(), fetchDbStats(), fetchBuckets()]);
    setLastRefreshed(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [fetchProjectInfo, fetchDbStats, fetchBuckets]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const capacity = PLAN_CAPACITIES[planTier] ?? 500 * 1024 * 1024;
  const dbSize = dbStats?.database_size ?? 0;

  const available = Math.max(0, capacity - dbSize);
  const usedPercent = capacity > 0 ? (dbSize / capacity) * 100 : 0;
  const totalBucketFiles = buckets.reduce((s, b) => s + b.file_count, 0);

  const donutData = [
    { name: 'Used', value: Math.max(dbSize, 1) },
    { name: 'Available', value: Math.max(available, 1) },
  ];

  const tableChartData = (dbStats?.tables ?? []).slice(0, 8).map((t) => ({
    name: t.name.length > 20 ? t.name.slice(0, 20) + '…' : t.name,
    size: Math.round(t.size / 1024 / 1024),
    rows: t.row_count,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground font-['Manrope',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 p-8 pb-16 max-sm:p-4 overflow-y-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-200/30 shrink-0">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-['Fraunces',serif] text-[22px] sm:text-[28px] font-semibold tracking-tight m-0 truncate">
                  {projectName || 'Database'} Data & Security
                </h1>
                <p className="text-muted-foreground text-[12px] sm:text-[13.5px] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{planTier.charAt(0).toUpperCase() + planTier.slice(1)} plan &middot; {fmtBytes(capacity)} capacity</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:inline-block" />
                  <span className="flex items-center gap-1 text-[11px] sm:text-[13.5px]">
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                    {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Loading…'}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 sm:px-4 sm:py-2.5 rounded-full border border-border text-xs font-bold text-muted-foreground bg-card hover:bg-accent active:bg-accent/80 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-24 text-muted-foreground text-sm">Loading database metrics…</div>
        ) : rpcError && !dbStats ? (
          <div className="text-center py-24 text-red-500 text-sm max-w-md mx-auto">
            <p className="font-bold mb-2">Failed to load database stats</p>
            <p className="text-xs text-red-400/80 font-mono bg-red-500/10 rounded-lg p-3">{rpcError}</p>
            <p className="text-xs text-muted-foreground mt-4">
              Make sure the <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">get_db_stats</code> Postgres function exists.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Database className="w-5 h-5" strokeWidth={1.5} />}
                label="Database Size"
                value={fmtBytes(dbSize)}
                subtext={`${usedPercent.toFixed(1)}% of ${fmtBytes(capacity)} used`}
                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                iconColor="text-emerald-600 dark:text-emerald-400"
                trend={usedPercent > 80 ? { direction: 'up', value: `${usedPercent.toFixed(0)}%` } : undefined}
              />
              <StatCard
                icon={<HardDrive className="w-5 h-5" strokeWidth={1.5} />}
                label="Storage Buckets"
                value={String(buckets.length)}
                subtext={`${totalBucketFiles} total files`}
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                iconColor="text-blue-600 dark:text-blue-400"
              />
              <StatCard
                icon={<Activity className="w-5 h-5" strokeWidth={1.5} />}
                label="Available Space"
                value={fmtBytes(available)}
                subtext={usedPercent > 80 ? 'Running low — upgrade recommended' : 'Healthy'}
                iconBg={usedPercent > 80 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}
                iconColor={usedPercent > 80 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
              />
              <StatCard
                icon={<Wifi className="w-5 h-5" strokeWidth={1.5} />}
                label="Active Connections"
                value={String(dbStats?.active_connections ?? '—')}
                subtext={`${dbStats?.total_tables ?? '—'} tables in database`}
                iconBg="bg-purple-100 dark:bg-purple-900/30"
                iconColor="text-purple-600 dark:text-purple-400"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
              <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-6">
                <h2 className="font-['Fraunces',serif] text-lg font-semibold mb-4">Storage Usage</h2>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="font-['Fraunces',serif] text-2xl font-bold text-foreground">{usedPercent.toFixed(0)}%</div>
                      <div className="text-[10px] text-muted-foreground">used</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Used: {fmtBytes(dbSize)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                    <span>Free: {fmtBytes(available)}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 bg-card border border-border/60 rounded-xl p-6">
                <h2 className="font-['Fraunces',serif] text-lg font-semibold mb-4">Table Sizes (MB)</h2>
                {tableChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={tableChartData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value) => [`${value} MB`, 'Size']}
                      />
                      <Bar dataKey="size" radius={[0, 4, 4, 0]}>
                        {tableChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">No table data available</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-card border border-border/60 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-['Fraunces',serif] text-lg font-semibold">Table Breakdown</h2>
                  <span className="text-[11px] text-muted-foreground">{dbStats?.tables.length ?? 0} tables</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-[10.5px] uppercase tracking-[1px] text-muted-foreground pb-2 font-bold">Table</th>
                        <th className="text-right text-[10.5px] uppercase tracking-[1px] text-muted-foreground pb-2 font-bold">Rows</th>
                        <th className="text-right text-[10.5px] uppercase tracking-[1px] text-muted-foreground pb-2 font-bold">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dbStats?.tables ?? []).map((t) => (
                        <tr key={t.name} className="border-b border-border/40 hover:bg-accent/30 transition-colors">
                          <td className="py-2.5 text-[13px] font-medium text-foreground">{t.name}</td>
                          <td className="py-2.5 text-[13px] text-right text-muted-foreground">{fmtRows(t.row_count)}</td>
                          <td className="py-2.5 text-[13px] text-right text-emerald-600 font-medium">{fmtBytes(t.size)}</td>
                        </tr>
                      ))}
                      {(dbStats?.tables ?? []).length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-muted-foreground text-sm">No tables found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-card border border-border/60 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-['Fraunces',serif] text-lg font-semibold">Storage Buckets</h2>
                  <span className="text-[11px] text-muted-foreground">{buckets.length} buckets</span>
                </div>
                {buckets.length > 0 ? (
                  <div className="space-y-2.5">
                    {buckets.map((b) => (
                      <div key={b.name} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/40">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <FolderOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-foreground">{b.name}</div>
                            <div className="text-[11px] text-muted-foreground">{b.file_count} file{b.file_count !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.is_public ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                          {b.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No storage buckets found</div>
                )}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="font-['Fraunces',serif] text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                Security & Protection
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border/60 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Shield className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">Row Level Security</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Enabled</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    All tables protected with RLS policies to restrict data access per user role.
                  </p>
                </div>
                <div className="bg-card border border-border/60 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Lock className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">Encryption at Rest</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    AES-256 encryption for all data stored on disk. TLS 1.3 for data in transit.
                  </p>
                </div>
                <div className="bg-card border border-border/60 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Server className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">Daily Backups</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Automated daily snapshots with 7-day retention{planTier === 'free' ? ' (upgrade to Pro for longer)' : ''}.
                  </p>
                </div>
                <div className="bg-card border border-border/60 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <RefreshCw className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">Point-in-Time Recovery</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {planTier === 'free' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-muted-foreground/30" />
                            <span className="text-[10px] text-muted-foreground/40 font-medium">Not Available</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Available</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    PITR{planTier === 'free' ? ' not available on Free plan (upgrade to Pro)' : ' enabled. Restore to any point in the last 7 days'}.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-muted-foreground/50 text-[11px] tracking-[0.3px]">
              VJR Estate &middot; Supabase {planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan &middot; Data refreshes every 30 seconds
            </p>
          </>
        )}
      </main>
    </div>
  );
}
