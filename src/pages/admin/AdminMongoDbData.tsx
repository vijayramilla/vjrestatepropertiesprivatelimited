import { useEffect, useState, useCallback } from 'react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import StatCard from '@/components/crm/StatCard';
import {
  Database,
  HardDrive,
  Server,
  FileText,
  RefreshCw,
  Table2,
  FolderOpen,
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
import { leadSupabase } from '@/services/leadSupabase';

interface TableInfo {
  name: string;
  count: number;
  avgObjSize: number;
  estimatedSize: number;
  totalSize: number;
}

interface DbInfo {
  name: string;
  collections: number;
  objects: number;
  dataSize: number;
  storageSize: number;
  indexSize: number;
  totalSize: number;
  avgObjSize: number;
}

const FREE_TIER_LIMIT = 500 * 1024 * 1024;
const DONUT_COLORS = ['#10b981', '#e4e4e7'];
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#ec4899'];

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

export default function AdminMongoDbData() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [db, setDb] = useState<DbInfo | null>(null);
  const [collections, setCollections] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [tableRes, dbRes] = await Promise.all([
        leadSupabase.getTableStats(),
        leadSupabase.getDbStats(),
      ]);

      const tables: TableInfo[] = (tableRes.data ?? []).map((t: any) => ({
        name: t.name,
        count: Number(t.count),
        avgObjSize: Number(t.avg_size),
        estimatedSize: Number(t.estimated_size),
        totalSize: Number(t.total_size),
      }));

      const totalDocs = tables.reduce((s: number, t: TableInfo) => s + t.count, 0);
      const totalSize = tables.reduce((s: number, t: TableInfo) => s + t.totalSize, 0);
      const dataSize = tables.reduce((s: number, t: TableInfo) => s + t.estimatedSize, 0);
      const avgSize = totalDocs > 0 ? Math.round(dataSize / totalDocs) : 0;
      const dbTotal = dbRes.data?.[0]?.total_size ?? totalSize;

      setDb({
        name: 'PostgreSQL (Supabase)',
        collections: tables.length,
        objects: totalDocs,
        dataSize,
        storageSize: dbTotal,
        indexSize: dbTotal - totalSize,
        totalSize,
        avgObjSize: avgSize,
      });
      setCollections(tables);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats().then(() => setLastRefreshed(new Date()));
  }, [fetchStats]);

  useEffect(() => {
    fetchStats().then(() => setLastRefreshed(new Date()));
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const usedPercent = db ? (db.storageSize / FREE_TIER_LIMIT) * 100 : 0;
  const available = db ? Math.max(0, FREE_TIER_LIMIT - db.storageSize) : FREE_TIER_LIMIT;

  const donutData = [
    { name: 'Used', value: Math.max(db?.storageSize ?? 1, 1) },
    { name: 'Available', value: Math.max(available, 1) },
  ];

  const chartData = collections.slice(0, 8).map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + '\u2026' : c.name,
    size: Math.round(c.estimatedSize / 1024),
    docs: c.count,
  }));

  const nonEmpty = collections.filter((c) => c.count > 0);

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
                  Supabase Database
                </h1>
                <p className="text-muted-foreground text-[12px] sm:text-[13.5px] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>eimvaxrmiizdlgonhiov &middot; {db?.name ?? '\u2014'}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:inline-block" />
                  <span>{db?.collections ?? '\u2014'} tables &middot; {fmtRows(db?.objects ?? 0)} rows</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:inline-block" />
                  <span className="flex items-center gap-1 text-[11px] sm:text-[13.5px]">
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                    {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Loading\u2026'}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 sm:px-4 sm:py-2.5 rounded-full border border-border text-xs font-bold text-muted-foreground bg-card hover:bg-accent active:bg-accent/80 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing\u2026' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-24 text-muted-foreground text-sm">Loading database metrics\u2026</div>
        ) : error ? (
          <div className="text-center py-24 text-red-500 text-sm max-w-md mx-auto">
            <p className="font-bold mb-2">Failed to load database stats</p>
            <p className="text-xs text-red-400/80 font-mono bg-red-500/10 rounded-lg p-3">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Database className="w-5 h-5" strokeWidth={1.5} />}
                label="Storage Used"
                value={fmtBytes(db?.storageSize ?? 0)}
                subtext={`+ ${fmtBytes(db?.indexSize ?? 0)} indexes`}
                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                iconColor="text-emerald-600 dark:text-emerald-400"
                trend={usedPercent > 60 ? { direction: 'up' as const, value: `${usedPercent.toFixed(0)}%` } : undefined}
              />
              <StatCard
                icon={<FileText className="w-5 h-5" strokeWidth={1.5} />}
                label="Total Rows"
                value={fmtRows(db?.objects ?? 0)}
                subtext={`Avg ${fmtBytes(db?.avgObjSize ?? 0)} per row`}
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                iconColor="text-blue-600 dark:text-blue-400"
              />
              <StatCard
                icon={<HardDrive className="w-5 h-5" strokeWidth={1.5} />}
                label="Available Space"
                value={fmtBytes(available)}
                subtext={usedPercent > 80 ? 'Running low \u2014 upgrade recommended' : usedPercent > 50 ? 'Moderate usage' : 'Healthy'}
                iconBg={usedPercent > 80 ? 'bg-amber-100 dark:bg-amber-900/30' : usedPercent > 50 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}
                iconColor={usedPercent > 80 ? 'text-amber-600 dark:text-amber-400' : usedPercent > 50 ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}
              />
              <StatCard
                icon={<Table2 className="w-5 h-5" strokeWidth={1.5} />}
                label="Data Size"
                value={fmtBytes(db?.dataSize ?? 0)}
                subtext={`${fmtBytes(db?.totalSize ?? 0)} total with indexes`}
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
                      <div className="font-['Fraunces',serif] text-2xl font-bold text-foreground">{usedPercent.toFixed(1)}%</div>
                      <div className="text-[10px] text-muted-foreground">of 500 MB used</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Used: {fmtBytes(db?.storageSize ?? 0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                    <span>Free: {fmtBytes(available)}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 bg-card border border-border/60 rounded-xl p-6">
                <h2 className="font-['Fraunces',serif] text-lg font-semibold mb-4">Table Data Size (KB)</h2>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        width={130}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number | string, name: string) => {
                          if (name === 'size') return [`${value} KB`, 'Data Size'];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="size" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, i) => (
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
                  <span className="text-[11px] text-muted-foreground">{collections.length} tables</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-[10.5px] uppercase tracking-[1px] text-muted-foreground pb-2 font-bold">Table</th>
                        <th className="text-right text-[10.5px] uppercase tracking-[1px] text-muted-foreground pb-2 font-bold">Rows</th>
                        <th className="text-right text-[10.5px] uppercase tracking-[1px] text-muted-foreground pb-2 font-bold">Avg Size</th>
                        <th className="text-right text-[10.5px] uppercase tracking-[1px] text-muted-foreground pb-2 font-bold">Est. Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collections.map((c) => (
                        <tr key={c.name} className="border-b border-border/40 hover:bg-accent/30 transition-colors">
                          <td className="py-2.5 text-[13px] font-medium text-foreground">{c.name}</td>
                          <td className="py-2.5 text-[13px] text-right text-muted-foreground">{fmtRows(c.count)}</td>
                          <td className="py-2.5 text-[13px] text-right text-muted-foreground">{fmtBytes(c.avgObjSize)}</td>
                          <td className="py-2.5 text-[13px] text-right text-emerald-600 font-medium">{fmtBytes(c.estimatedSize)}</td>
                        </tr>
                      ))}
                      {collections.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">No tables found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-card border border-border/60 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-['Fraunces',serif] text-lg font-semibold">Database Info</h2>
                  <span className="text-[11px] text-muted-foreground">{nonEmpty.length} active tables</span>
                </div>
                {nonEmpty.length > 0 ? (
                  <div className="space-y-2.5">
                    {nonEmpty.map((c) => (
                      <div key={c.name} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/40">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <FolderOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-foreground">{c.name}</div>
                            <div className="text-[11px] text-muted-foreground">{fmtRows(c.count)} row{c.count !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{fmtBytes(c.estimatedSize)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No tables with data</div>
                )}
              </div>
            </div>

            <p className="text-center text-muted-foreground/50 text-[11px] tracking-[0.3px]">
              VJR Estate &middot; Supabase PostgreSQL Free Tier (500 MB limit) &middot; Data refreshes every 30 seconds
            </p>
          </>
        )}
      </main>
    </div>
  );
}
