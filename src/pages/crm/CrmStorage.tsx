import { useCallback, useEffect, useMemo, useState } from 'react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmStatCard, CrmStatGrid, CrmBtn, CrmCard, MotionReveal } from '@/components/crm/CrmUi';
import { Database, HardDrive, Files, FolderOpen, RefreshCw, FileImage, FileText, Gauge } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { supabaseGetStorageStats, subscribeSupabaseStorageChanges, type StorageStats } from '@/lib/supabaseData';

const TOOLTIP_STYLE = {
  background: '#fff',
  border: '1px solid rgba(10,22,40,0.08)',
  borderRadius: '10px',
  fontSize: '12px',
  boxShadow: '0 8px 24px rgba(10,22,40,0.1)',
};

const BUCKET_META: Record<string, { label: string; color: string; icon: typeof FolderOpen }> = {
  'property-images': { label: 'Property Images', color: '#0A1628', icon: FileImage },
  'auction-images': { label: 'Auction Images', color: '#C9A84C', icon: FileImage },
  resumes: { label: 'Resumes', color: '#3B82F6', icon: FileText },
};

const FALLBACK_COLOR = '#6B7280';

function fmtBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i += 1; }
  return `${val >= 100 ? val.toFixed(0) : val.toFixed(1)} ${units[i]}`;
}

function shortName(name: string): string {
  if (name.length <= 46) return name;
  return `${name.slice(0, 20)}…${name.slice(-20)}`;
}

export default function CrmStorage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setRefreshing(true);
    setError('');
    try {
      const data = await supabaseGetStorageStats();
      setStats(data);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load storage stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(true), 30_000);
    const unsub = subscribeSupabaseStorageChanges(() => void load(true));
    return () => { clearInterval(timer); unsub(); };
  }, [load]);

  const quota = stats?.quotaBytes ?? 1024 * 1024 * 1024;
  const used = stats?.totalBytes ?? 0;
  const available = Math.max(0, quota - used);
  const usedPercent = quota > 0 ? (used / quota) * 100 : 0;

  const donutData = useMemo(
    () => [
      { name: 'Used', value: Math.max(used, 1) },
      { name: 'Available', value: Math.max(available, 1) },
    ],
    [used, available],
  );

  const bucketChartData = useMemo(
    () =>
      (stats?.buckets ?? [])
        .slice()
        .sort((a, b) => b.bytes - a.bytes)
        .map((b) => ({
          name: (BUCKET_META[b.bucket]?.label ?? b.bucket).length > 18
            ? (BUCKET_META[b.bucket]?.label ?? b.bucket).slice(0, 18) + '…'
            : (BUCKET_META[b.bucket]?.label ?? b.bucket),
          bucket: b.bucket,
          mb: Math.round((b.bytes / 1024 / 1024) * 10) / 10,
          files: b.objects,
        })),
    [stats],
  );

  const totalFiles = stats?.totalObjects ?? 0;
  const bucketCount = stats?.buckets?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Infrastructure"
            title="Storage"
            description="Live usage of your Supabase storage — how much is occupied, what's available, and where the files live."
            actions={
              <CrmBtn variant="ghost" onClick={() => void load()} disabled={refreshing}>
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </CrmBtn>
            }
          />

          {loading && !stats ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />)}
            </div>
          ) : error && !stats ? (
            <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center">
              <p className="text-sm font-semibold text-red-600">Failed to load storage stats</p>
              <p className="mx-auto mt-2 max-w-md break-words rounded-lg bg-red-50 px-4 py-3 font-mono text-xs text-red-700">{error}</p>
            </div>
          ) : (
            <MotionReveal>
              {error && stats && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Refresh failed — showing last known data. {error}
                </div>
              )}

              <CrmStatGrid>
                <CrmStatCard icon={<Database className="h-5 w-5" strokeWidth={1.6} />} label="Storage Used" value={fmtBytes(used)} subtext={`${usedPercent.toFixed(1)}% of ${fmtBytes(quota)}`} tone="navy" />
                <CrmStatCard icon={<Gauge className="h-5 w-5" strokeWidth={1.6} />} label="Available" value={fmtBytes(available)} subtext={usedPercent > 80 ? 'Running low — upgrade recommended' : 'Healthy'} tone={usedPercent > 80 ? 'red' : 'emerald'} />
                <CrmStatCard icon={<Files className="h-5 w-5" strokeWidth={1.6} />} label="Total Files" value={String(totalFiles)} subtext="across all buckets" tone="gold" />
                <CrmStatCard icon={<FolderOpen className="h-5 w-5" strokeWidth={1.6} />} label="Buckets" value={String(bucketCount)} subtext="public storage buckets" tone="blue" />
              </CrmStatGrid>

              {/* Quota bar */}
              <CrmCard className="mb-6 p-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="m-0 font-['Inter',sans-serif] text-base font-semibold text-[#0A1628]">Plan Quota</h2>
                  <span className="flex items-center gap-1.5 text-[11px] text-[#9ca3af]">
                    <HardDrive className="h-3 w-3" /> Free plan · {fmtBytes(quota)} capacity
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${usedPercent > 80 ? 'bg-red-500' : usedPercent > 55 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, usedPercent)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#6b7280]">
                  <span>{fmtBytes(used)} used · {fmtBytes(available)} free</span>
                  <span className="tabular-nums">{usedPercent.toFixed(1)}%</span>
                </div>
              </CrmCard>

              {/* Charts */}
              <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <CrmCard className="p-5">
                  <h2 className="mb-3 font-['Inter',sans-serif] text-base font-semibold text-[#0A1628]">Usage</h2>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} startAngle={90} endAngle={-270} strokeWidth={0}>
                          <Cell key="used" fill="#0A1628" />
                          <Cell key="available" fill="#e5e7eb" />
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [fmtBytes(Number(value ?? 0)), 'Size']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="font-['Inter',sans-serif] text-xl font-bold text-[#0A1628]">{usedPercent.toFixed(0)}%</div>
                        <div className="text-[10px] uppercase tracking-wide text-[#9ca3af]">used</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-center gap-5 text-[11px] text-[#6b7280]">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#0A1628]" />Used · {fmtBytes(used)}</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-200" />Free · {fmtBytes(available)}</span>
                  </div>
                </CrmCard>

                <CrmCard className="p-5 lg:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="m-0 font-['Inter',sans-serif] text-base font-semibold text-[#0A1628]">Size by Bucket (MB)</h2>
                    <span className="text-[11px] text-[#9ca3af]">{bucketCount} buckets</span>
                  </div>
                  {bucketChartData.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center text-sm text-[#9ca3af]">No files stored yet — uploads will appear here.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={bucketChartData} margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${Number(value ?? 0).toFixed(1)} MB`, 'Size']} />
                        <Bar dataKey="mb" radius={[4, 4, 0, 0]}>
                          {bucketChartData.map((b) => (
                            <Cell key={b.bucket} fill={BUCKET_META[b.bucket]?.color ?? FALLBACK_COLOR} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CrmCard>
              </div>

              {/* Bucket breakdown + largest files */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <CrmCard className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="m-0 font-['Inter',sans-serif] text-base font-semibold text-[#0A1628]">Bucket Breakdown</h2>
                    <span className="text-[11px] text-[#9ca3af]">{bucketCount} buckets</span>
                  </div>
                  {bucketChartData.length === 0 ? (
                    <div className="py-10 text-center text-sm text-[#9ca3af]">No buckets with files yet</div>
                  ) : (
                    <div className="space-y-2.5">
                      {bucketChartData.map((b) => {
                        const Icon = BUCKET_META[b.bucket]?.icon ?? FolderOpen;
                        const color = BUCKET_META[b.bucket]?.color ?? FALLBACK_COLOR;
                        const share = used > 0 ? ((b.mb * 1024 * 1024) / used) * 100 : 0;
                        return (
                          <div key={b.bucket} className="rounded-xl border border-black/[0.05] bg-[#fafafa] p-3.5 transition-colors hover:bg-black/[0.03]">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}14`, color }}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] font-semibold text-[#1f2937]">{BUCKET_META[b.bucket]?.label ?? b.bucket}</p>
                                  <p className="text-[11px] text-[#6b7280]">{b.files} file{b.files !== 1 ? 's' : ''} · {b.mb.toFixed(1)} MB</p>
                                </div>
                              </div>
                              <span className="shrink-0 text-[11px] font-bold tabular-nums text-[#374151]">{share.toFixed(1)}%</span>
                            </div>
                            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, share)}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CrmCard>

                <CrmCard className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="m-0 font-['Inter',sans-serif] text-base font-semibold text-[#0A1628]">Largest Files</h2>
                    <span className="text-[11px] text-[#9ca3af]">top {stats?.largest?.length ?? 0}</span>
                  </div>
                  {!stats?.largest || stats.largest.length === 0 ? (
                    <div className="py-10 text-center text-sm text-[#9ca3af]">No files stored yet</div>
                  ) : (
                    <div className="divide-y divide-black/[0.04]">
                      {stats.largest.map((f) => {
                        const color = BUCKET_META[f.bucket]?.color ?? FALLBACK_COLOR;
                        return (
                          <div key={`${f.bucket}/${f.name}`} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                              <div className="min-w-0">
                                <p className="truncate font-mono text-[12px] text-[#1f2937]">{shortName(f.name)}</p>
                                <p className="text-[10px] uppercase tracking-wide text-[#9ca3af]">{BUCKET_META[f.bucket]?.label ?? f.bucket}</p>
                              </div>
                            </div>
                            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#374151]">{fmtBytes(f.bytes)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CrmCard>
              </div>

              <p className="mt-6 text-center text-[11px] text-[#9ca3af]">
                Live from Supabase · {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Loading…'} · realtime + 30s fallback refresh
              </p>
            </MotionReveal>
          )}
        </CrmPageBody>
      </main>
    </div>
  );
}
