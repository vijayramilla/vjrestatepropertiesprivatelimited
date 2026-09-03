import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import {
  AdminPageHeader,
  AdminPageShell,
  AdminStatGrid,
} from '@/components/admin/AdminUi'
import { motion } from 'framer-motion'
import {
  Database,
  HardDrive,
  Files,
  FolderOpen,
  ArrowsClockwise,
  FileImage,
  FileText,
  CloudArrowDown,
} from 'phosphor-react'
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
} from 'recharts'
import {
  supabaseGetStorageStats,
  subscribeSupabaseStorageChanges,
  supabaseGetDatabaseSummary,
  type StorageStats,
  type DatabaseSummary,
} from '@/lib/supabaseData'

const TOOLTIP_STYLE = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '12px',
}

const BUCKET_META: Record<string, { label: string; color: string; icon: typeof FolderOpen }> = {
  'property-images': { label: 'Property Images', color: '#0A1628', icon: FileImage },
  'auction-images': { label: 'Auction Images', color: '#C9A84C', icon: FileImage },
  resumes: { label: 'Resumes', color: '#3B82F6', icon: FileText },
}

const FALLBACK_COLOR = '#6B7280'

function fmtBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let val = bytes
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024
    i += 1
  }
  return `${val >= 100 ? val.toFixed(0) : val.toFixed(1)} ${units[i]}`
}

function shortName(name: string): string {
  if (name.length <= 46) return name
  return `${name.slice(0, 20)}…${name.slice(-20)}`
}

export default function AdminStorage() {
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [dbSummary, setDbSummary] = useState<DatabaseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true)
    setRefreshing(true)
    setError('')
    try {
      const [storageData, dbData] = await Promise.allSettled([
        supabaseGetStorageStats(),
        supabaseGetDatabaseSummary(),
      ])
      if (storageData.status === 'fulfilled') setStats(storageData.value)
      if (dbData.status === 'fulfilled') setDbSummary(dbData.value)
      setLastRefreshed(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load storage stats')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(true), 30_000)
    // Live fast-path: refetch the instant a file is uploaded or deleted.
    const unsub = subscribeSupabaseStorageChanges(() => void load(true))
    return () => {
      clearInterval(timer)
      unsub()
    }
  }, [load])

  const quota = stats?.quotaBytes ?? 1024 * 1024 * 1024 // free plan default: 1 GB
  const used = stats?.totalBytes ?? 0
  const available = Math.max(0, quota - used)
  const usedPercent = quota > 0 ? (used / quota) * 100 : 0

  const donutData = useMemo(
    () => [
      { name: 'Used', value: Math.max(used, 1) },
      { name: 'Available', value: Math.max(available, 1) },
    ],
    [used, available],
  )

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
  )

  const totalFiles = stats?.totalObjects ?? 0
  const bucketCount = stats?.buckets?.length ?? 0

  const statsCards = [
    { label: 'Storage Used', value: fmtBytes(used), icon: Database, sub: `${usedPercent.toFixed(1)}% of ${fmtBytes(quota)}` },
    { label: 'Available', value: fmtBytes(available), icon: CloudArrowDown, sub: usedPercent > 80 ? 'Running low — upgrade recommended' : 'Healthy' },
    { label: 'Total Files', value: String(totalFiles), icon: Files, sub: 'across all buckets' },
    { label: 'Buckets', value: String(bucketCount), icon: FolderOpen, sub: 'public storage buckets' },
  ]

  return (
    <AdminLayout title="Storage">
      <AdminPageShell>
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <AdminPageHeader
            eyebrow="Infrastructure"
            title="Storage Dashboard"
            description="Live usage of your Supabase storage — how much is occupied, what's available, and where the files live."
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="admin-btn-secondary shrink-0 gap-2 self-start sm:self-auto disabled:opacity-50"
          >
            <ArrowsClockwise size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading && !stats ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="admin-card h-28 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : error && !stats ? (
          <div className="admin-card p-8 text-center">
            <p className="text-sm font-semibold text-red-600">Failed to load storage stats</p>
            <p className="mx-auto mt-2 max-w-md break-words rounded-lg bg-red-50 px-4 py-3 font-mono text-xs text-red-700">
              {error}
            </p>
            <p className="mt-3 text-xs text-gray-500">
              The storage aggregate function may not be installed yet — re-run the
              SQL migration in the Supabase console.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {error && stats && (
              <div className="admin-card mb-4 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Refresh failed — showing last known data. {error}
              </div>
            )}
            {/* ── SUPABASE ACCOUNT INFO ── */}
            <div className="admin-card mb-6 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Database size={18} />
                </div>
                <div>
                  <h2 className="admin-section-title !mb-0">Supabase Connection</h2>
                  <p className="text-[11px] text-gray-500">Project and account details for the active Supabase instance</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Project URL</p>
                  <p className="mt-1 truncate font-mono text-[12px] text-gray-800">
                    {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Project Ref</p>
                  <p className="mt-1 font-mono text-[12px] text-gray-800">
                    {(import.meta.env.VITE_SUPABASE_URL ?? '').match(/https?:\/\/([^.]+)/)?.[1] ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Data Mode</p>
                  <p className="mt-1 flex items-center gap-2 text-[12px]">
                    <span className={`inline-block h-2 w-2 rounded-full ${import.meta.env.VITE_USE_SUPABASE_DATA === '1' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="font-medium text-gray-800">
                      {import.meta.env.VITE_USE_SUPABASE_DATA === '1' ? 'Supabase (active)' : 'Firebase (fallback)'}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Storage Quota</p>
                  <p className="mt-1 text-[12px] font-medium text-gray-800">
                    {fmtBytes(stats?.quotaBytes ?? 1024 * 1024 * 1024)} (Free plan)
                  </p>
                </div>
              </div>

            </div>

            {/* ── DATABASE SUMMARY ── */}
            {dbSummary && (
              <div className="admin-card mb-6 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Files size={18} />
                  </div>
                  <div>
                    <h2 className="admin-section-title !mb-0">Database Tables</h2>
                    <p className="text-[11px] text-gray-500">Row counts across all tables storing site data</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {Object.entries(dbSummary.counts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([table, count]) => (
                      <div key={table} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          {table.replace(/_/g, ' ')}
                        </p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">
                          {count.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          row{count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ── KPI CARDS ── */}
            <AdminStatGrid>
              {statsCards.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="admin-card p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 text-black">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="admin-stat-label truncate">{stat.label}</p>
                        <p className="admin-stat-value mt-0.5 truncate tabular-nums">{stat.value}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">{stat.sub}</p>
                  </div>
                )
              })}
            </AdminStatGrid>

            {/* ── QUOTA BAR ── */}
            <div className="admin-card mb-6 p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="admin-section-title !mb-0">Plan Quota</h2>
                <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <HardDrive size={13} />
                  Free plan · {fmtBytes(quota)} capacity
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    usedPercent > 80 ? 'bg-red-500' : usedPercent > 55 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, usedPercent)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                <span>
                  {fmtBytes(used)} used · {fmtBytes(available)} free
                </span>
                <span className="tabular-nums">{usedPercent.toFixed(1)}%</span>
              </div>
            </div>

            {/* ── CHARTS ROW ── */}
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="admin-card p-5">
                <h2 className="admin-section-title !mb-3">Usage</h2>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={82}
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                      >
                        <Cell key="used" fill="#0A1628" />
                        <Cell key="available" fill="#e5e7eb" />
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => [fmtBytes(Number(value ?? 0)), 'Size']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="admin-stat-value text-xl">{usedPercent.toFixed(0)}%</div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">used</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-center gap-5 text-[11px] text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#0A1628]" />
                    Used · {fmtBytes(used)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-gray-200" />
                    Free · {fmtBytes(available)}
                  </span>
                </div>
              </div>

              <div className="admin-card p-5 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="admin-section-title !mb-0">Size by Bucket (MB)</h2>
                  <span className="text-[11px] text-gray-400">{bucketCount} buckets</span>
                </div>
                {bucketChartData.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                    No files stored yet — uploads will appear here.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={bucketChartData} margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => [`${Number(value ?? 0).toFixed(1)} MB`, 'Size']}
                      />
                      <Bar dataKey="mb" radius={[4, 4, 0, 0]}>
                        {bucketChartData.map((b) => (
                          <Cell
                            key={b.bucket}
                            fill={BUCKET_META[b.bucket]?.color ?? FALLBACK_COLOR}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── BUCKET BREAKDOWN ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="admin-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="admin-section-title !mb-0">Bucket Breakdown</h2>
                  <span className="text-[11px] text-gray-400">{bucketCount} buckets</span>
                </div>
                {bucketChartData.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">No buckets with files yet</div>
                ) : (
                  <div className="space-y-2.5">
                    {bucketChartData.map((b) => {
                      const Icon = BUCKET_META[b.bucket]?.icon ?? FolderOpen
                      const color = BUCKET_META[b.bucket]?.color ?? FALLBACK_COLOR
                      const share = used > 0 ? ((b.mb * 1024 * 1024) / used) * 100 : 0
                      return (
                        <div
                          key={b.bucket}
                          className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 transition-colors hover:bg-gray-100/70"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                style={{ backgroundColor: `${color}14`, color }}
                              >
                                <Icon size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-gray-800">
                                  {BUCKET_META[b.bucket]?.label ?? b.bucket}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  {b.files} file{b.files !== 1 ? 's' : ''} · {b.mb.toFixed(1)} MB
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 text-[11px] font-bold text-gray-700 tabular-nums">
                              {share.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200/70">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, share)}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── LARGEST FILES ── */}
              <div className="admin-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="admin-section-title !mb-0">Largest Files</h2>
                  <span className="text-[11px] text-gray-400">top {stats?.largest?.length ?? 0}</span>
                </div>
                {!stats?.largest || stats.largest.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">No files stored yet</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {stats.largest.map((f) => {
                      const color = BUCKET_META[f.bucket]?.color ?? FALLBACK_COLOR
                      return (
                        <div key={`${f.bucket}/${f.name}`} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                            <div className="min-w-0">
                              <p className="truncate font-mono text-[12px] text-gray-800">
                                {shortName(f.name)}
                              </p>
                              <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                {BUCKET_META[f.bucket]?.label ?? f.bucket}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-[12px] font-semibold text-gray-700 tabular-nums">
                            {fmtBytes(f.bytes)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] text-gray-400">
              Live from Supabase · {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Loading…'} · realtime + 30s fallback refresh
            </p>
          </motion.div>
        )}
      </AdminPageShell>
    </AdminLayout>
  )
}
