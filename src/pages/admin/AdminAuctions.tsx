import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSupabaseData, subscribeSupabaseAuctions, subscribeSupabaseAuctionBids, callDataProxy } from '@/lib/supabaseData'
import AdminLayout from '@/components/admin/AdminLayout'
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
  AdminSkeletonList,
  AdminBadge,
} from '@/components/admin/AdminUi'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Trash,
  NotePencil,
  Plus,
  Scales,
  Users,
  Lightning,
  Broadcast,
  Timer,
  MagnifyingGlass,
  FunnelSimple,
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
  AUCTION_STATUS_CONFIG,
  type Auction,
  type AuctionStatus,
} from '@/data/auctionCategories'
import { formatINR } from '@/lib/formatPrice'

const container = {
  animate: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
}

const STATUS_ORDER: AuctionStatus[] = ['live', 'ending_soon', 'upcoming', 'closed', 'sold']

const STATUS_COLORS: Record<AuctionStatus, string> = {
  live: '#EF4444',
  ending_soon: '#F59E0B',
  upcoming: '#3B82F6',
  closed: '#6B7280',
  sold: '#C9A84C',
}

const CATEGORY_COLORS = ['#C9A84C', '#EF4444', '#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B']

interface AuctionBid {
  id: string
  auctionId: string
  bidderName: string
  amount: number
  timestamp?: { toDate?: () => Date }
}

function timeAgo(date?: Date): string {
  if (!date) return '—'
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AdminAuctions() {
  const navigate = useNavigate()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [recentBids, setRecentBids] = useState<AuctionBid[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (useSupabaseData()) {
      const unsub = subscribeSupabaseAuctions((docs) => {
        setAuctions(docs as Auction[])
        setLoading(false)
      })
      return () => unsub()
    }
    const unsub = onSnapshot(collection(db, 'auctions'), (snap) => {
      const docs = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          ...data,
          auctionEndTime:
            data.auctionEndTime && typeof data.auctionEndTime.toDate === 'function'
              ? data.auctionEndTime.toDate()
              : undefined,
        } as Auction
      })
      setAuctions(docs)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Live recent-bids feed
  useEffect(() => {
    if (useSupabaseData()) {
      const unsub = subscribeSupabaseAuctionBids((bids) => setRecentBids(bids))
      return () => unsub()
    }
    const q = query(
      collection(db, 'auction_bids'),
      orderBy('timestamp', 'desc'),
      limit(12),
    )
    const unsub = onSnapshot(q, (snap) => {
      setRecentBids(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            auctionId: data.auctionId ?? '',
            bidderName: data.bidderName ?? 'Anonymous',
            amount: data.amount ?? 0,
            timestamp: data.timestamp,
          } as AuctionBid
        }),
      )
    })
    return () => unsub()
  }, [])

  const filtered = useMemo(() => {
    return auctions
      .filter((a) => {
        const q = search.trim().toLowerCase()
        const matchesSearch =
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
        const matchesStatus = statusFilter === 'All' || a.status === statusFilter
        const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter
        return matchesSearch && matchesStatus && matchesCategory
      })
      .sort((a, b) => {
        const order = (s?: AuctionStatus) =>
          s ? STATUS_ORDER.indexOf(s) : STATUS_ORDER.length
        return order(a.status) - order(b.status)
      })
  }, [auctions, search, statusFilter, categoryFilter])

  const counts = useMemo(() => {
    const byStatus = STATUS_ORDER.map((s) => ({
      key: s,
      label: AUCTION_STATUS_CONFIG[s].label,
      color: STATUS_COLORS[s],
      value: auctions.filter((a) => a.status === s).length,
    }))
    const byCategory = auctions.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1
      return acc
    }, {})
    return { byStatus, byCategory }
  }, [auctions])

  const totalBids = auctions.reduce((s, a) => s + (a.totalBids || 0), 0)
  const totalRegistered = auctions.reduce((s, a) => s + (a.registeredBidders || 0), 0)
  const liveValue = auctions
    .filter((a) => a.status === 'live' || a.status === 'ending_soon')
    .reduce((s, a) => s + (a.currentBid || a.startingBid || 0), 0)

  const bidsByAuction = useMemo(() => {
    return [...auctions]
      .sort((a, b) => (b.totalBids || 0) - (a.totalBids || 0))
      .slice(0, 8)
      .map((a) => ({
        name: a.title.length > 18 ? a.title.slice(0, 18) + '…' : a.title,
        bids: a.totalBids || 0,
      }))
  }, [auctions])

  const bidAuctions = useMemo(() => {
    const map = new Map(auctions.map((a) => [a.id, a]))
    return recentBids.map((b) => ({ ...b, auction: map.get(b.auctionId) }))
  }, [recentBids, auctions])

  const stats = [
    {
      label: 'Total Auctions',
      value: auctions.length,
      icon: Scales,
      sub: `${counts.byStatus.find((s) => s.key === 'upcoming')?.value ?? 0} upcoming`,
      color: '#0A1628',
      bg: '#0A162805',
    },
    {
      label: 'Live Now',
      value: counts.byStatus.find((s) => s.key === 'live')?.value ?? 0,
      icon: Broadcast,
      sub: `${counts.byStatus.find((s) => s.key === 'ending_soon')?.value ?? 0} ending soon`,
      color: '#EF4444',
      bg: '#EF44440F',
    },
    {
      label: 'Total Bids',
      value: totalBids,
      icon: Lightning,
      sub: 'across all auctions',
      color: '#F59E0B',
      bg: '#F59E0B0F',
    },
    {
      label: 'Registered Bidders',
      value: totalRegistered,
      icon: Users,
      sub: 'total participants',
      color: '#3B82F6',
      bg: '#3B82F60F',
    },
    {
      label: 'Live Portfolio Value',
      value: formatINR(liveValue),
      icon: Timer,
      sub: 'current bid value',
      color: '#C9A84C',
      bg: '#C9A84C14',
    },
  ]

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      if (useSupabaseData()) {
        await callDataProxy('auction.delete', { id: deleteId })
      } else {
        await deleteDoc(doc(db, 'auctions', deleteId))
      }
      setDeleteId(null)
    } catch (error) {
      console.error('Delete auction error:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async (id: string, status: AuctionStatus) => {
    try {
      if (useSupabaseData()) {
        await callDataProxy('auction.setStatus', { id, status })
      } else {
        // Status is Firestore-authoritative; no RTDB mirror write needed.
        await updateDoc(doc(db, 'auctions', id), { status })
      }
    } catch (error) {
      console.error('Update status error:', error)
    }
  }

  const statusBadgeVariant = (status: AuctionStatus) =>
    status === 'live' || status === 'ending_soon' ? 'success' : 'muted'

  const categories = useMemo(
    () => ['All', ...Object.keys(counts.byCategory)],
    [counts.byCategory],
  )

  return (
    <AdminLayout title="Auctions Dashboard">
      <AdminPageShell>
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <AdminPageHeader
            eyebrow="Marketplace"
            title="Auctions Dashboard"
            description="Monitor live bidding, portfolio value, and auction status across Bangalore in real time."
          />
          <button
            type="button"
            onClick={() => navigate('/admin/auctions/new')}
            className="admin-btn-primary shrink-0 gap-2 self-start sm:self-auto"
          >
            <Plus size={16} weight="bold" />
            Add Auction
          </button>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="admin-card p-4 sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: stat.bg, color: stat.color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="admin-stat-label truncate">{stat.label}</p>
                    <p className="admin-stat-value mt-0.5 truncate tabular-nums">
                      {stat.value}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-gray-500">{stat.sub}</p>
              </motion.div>
            )
          })}
        </div>

        {/* ── CHARTS ROW ── */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Status donut */}
          <div className="admin-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="admin-section-title !mb-0">Status Breakdown</h2>
              <FunnelSimple size={16} className="text-gray-400" />
            </div>
            {auctions.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                No auctions yet
              </div>
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={counts.byStatus.filter((s) => s.value > 0)}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {counts.byStatus
                        .filter((s) => s.value > 0)
                        .map((s) => (
                          <Cell key={s.key} fill={s.color} />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="admin-stat-value text-xl">{auctions.length}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">
                      Auctions
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {counts.byStatus.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label}
                  </span>
                  <span className="text-[11px] font-bold text-gray-800 tabular-nums">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Category bars */}
          <div className="admin-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="admin-section-title !mb-0">By Category</h2>
              <span className="text-[11px] text-gray-400">{Object.keys(counts.byCategory).length} categories</span>
            </div>
            {Object.keys(counts.byCategory).length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                No auctions yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={Object.entries(counts.byCategory).map(([name, value], i) => ({
                    name,
                    value,
                    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                  }))}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={86}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {Object.entries(counts.byCategory).map(([name], i) => (
                      <Cell key={name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bids by auction */}
          <div className="admin-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="admin-section-title !mb-0">Most Bids</h2>
              <span className="text-[11px] text-gray-400">top 8</span>
            </div>
            {bidsByAuction.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                No bids yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bidsByAuction} margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#9ca3af' }}
                    interval={0}
                    angle={-22}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="bids" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── RECENT BIDS FEED ── */}
        <div className="admin-card mb-6 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="admin-section-title !mb-0">Recent Bids</h2>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
          {recentBids.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No bids placed yet — they'll stream in here live.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {bidAuctions.map((bid) => (
                <div
                  key={bid.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-gray-800">
                      {bid.bidderName}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {bid.auction ? bid.auction.title : 'Unknown lot'} ·{' '}
                      {timeAgo(bid.timestamp?.toDate?.())}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[#0A1628] tabular-nums">
                    {formatINR(bid.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="admin-card mb-4 flex flex-col gap-3 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <MagnifyingGlass
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                placeholder="Search auctions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-input-ghost !pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-select flex-1 sm:flex-none"
                aria-label="Filter by status"
              >
                <option value="All">All Status</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {AUCTION_STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="admin-select flex-1 sm:flex-none"
                aria-label="Filter by category"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">
            Showing {filtered.length} of {auctions.length} auctions
          </p>
        </div>

        {/* ── AUCTION LIST ── */}
        {loading ? (
          <AdminSkeletonList count={5} />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            icon={<Scales size={40} weight="thin" />}
            title="No Auctions Found"
            description={
              auctions.length === 0
                ? 'Create your first auction to start accepting live bids from buyers.'
                : 'Try adjusting your search or filters.'
            }
            action={
              auctions.length === 0 ? (
                <button
                  type="button"
                  onClick={() => navigate('/admin/auctions/new')}
                  className="admin-btn-primary gap-2"
                >
                  <Plus size={16} />
                  Add Auction
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Mobile cards */}
            <motion.div
              variants={container}
              initial="initial"
              animate="animate"
              className="space-y-3 md:hidden"
            >
              {filtered.map((auction) => (
                <motion.article key={auction.id} variants={fadeUp} className="admin-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-mono text-gray-400">
                        LOT #{auction.id.slice(-4).toUpperCase()}
                      </p>
                      <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-black">
                        {auction.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        {auction.category} · {auction.location}
                      </p>
                    </div>
                    <AdminBadge variant={statusBadgeVariant(auction.status)}>
                      {AUCTION_STATUS_CONFIG[auction.status]?.label ?? auction.status}
                    </AdminBadge>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-black tabular-nums">
                        {formatINR(auction.currentBid || auction.startingBid)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {auction.totalBids || 0} bids ·{' '}
                        {auction.auctionEndTime
                          ? auction.auctionEndTime.toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'no end time'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </span>
                      <select
                        value={auction.status}
                        onChange={(e) =>
                          handleStatusChange(auction.id, e.target.value as AuctionStatus)
                        }
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 outline-none"
                        aria-label={`Change status for ${auction.title}`}
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {AUCTION_STATUS_CONFIG[s].label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/auctions/${auction.id}/edit`)}
                        className="admin-btn-secondary min-h-[44px] text-[11px]"
                      >
                        <NotePencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(auction.id)}
                        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-gray-100 text-[11px] font-semibold uppercase tracking-wide text-black transition-colors hover:bg-gray-200"
                      >
                        <Trash size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>

            {/* Tablet/desktop table */}
            <motion.div
              variants={container}
              initial="initial"
              animate="animate"
              className="admin-card hidden overflow-hidden md:block"
            >
              <div className="hidden grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50/50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 lg:grid">
                <p className="col-span-1">Lot</p>
                <p className="col-span-3">Title</p>
                <p className="col-span-1">Category</p>
                <p className="col-span-1">Location</p>
                <p className="col-span-2">Current Bid</p>
                <p className="col-span-1">Bids</p>
                <p className="col-span-1">Ends</p>
                <p className="col-span-1">Status</p>
                <p className="col-span-1">Actions</p>
              </div>

              {filtered.map((auction) => (
                <motion.div
                  key={auction.id}
                  variants={fadeUp}
                  className="grid grid-cols-12 items-center gap-4 border-b border-gray-50 px-5 py-3.5 transition-colors last:border-0 hover:bg-gray-50/40"
                >
                  <p className="col-span-1 truncate text-[11px] font-mono text-gray-500">
                    #{auction.id.slice(-4).toUpperCase()}
                  </p>
                  <p className="col-span-3 truncate text-sm font-medium text-black">
                    {auction.title}
                  </p>
                  <p className="col-span-1 truncate text-xs text-gray-800">
                    {auction.category}
                  </p>
                  <p className="col-span-1 truncate text-xs text-gray-800">
                    {auction.location}
                  </p>
                  <p className="col-span-2 text-sm font-semibold text-black tabular-nums">
                    {formatINR(auction.currentBid || auction.startingBid)}
                  </p>
                  <p className="col-span-1 text-sm tabular-nums text-gray-800">
                    {auction.totalBids || 0}
                  </p>
                  <p className="col-span-1 text-[11px] text-gray-500">
                    {auction.auctionEndTime
                      ? auction.auctionEndTime.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : '—'}
                  </p>
                  <div className="col-span-1">
                    <select
                      value={auction.status}
                      onChange={(e) =>
                        handleStatusChange(auction.id, e.target.value as AuctionStatus)
                      }
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 outline-none transition-colors hover:border-black focus-visible:border-black"
                      aria-label={`Change status for ${auction.title}`}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {AUCTION_STATUS_CONFIG[s].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/auctions/${auction.id}/edit`)}
                      className="admin-btn-secondary !min-h-[36px] !px-3 !text-[10px]"
                    >
                      <NotePencil size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(auction.id)}
                      className="flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-1 text-[10px] font-semibold uppercase text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      <Trash size={12} />
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </AdminPageShell>

      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => !deleting && setDeleteId(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <h3 className="admin-heading text-xl font-medium text-black sm:text-2xl">
                Delete Auction?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:mt-4">
                This action cannot be undone. The auction and its live bid mirror
                will be permanently removed.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:mt-8 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="admin-btn-secondary flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 min-h-[44px] rounded-xl bg-black px-5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
