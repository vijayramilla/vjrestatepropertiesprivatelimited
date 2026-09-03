import { useMemo, useState } from 'react'
import {
  CaretDown,
  Gavel,
  MapPin,
  Ruler,
  Eye,
  Users,
  Bell,
  HouseLine,
  NotePencil,
  FileText,
  House,
  BuildingOffice,
  Buildings,
  BuildingApartment,
  Factory,
  Scales,
  type Icon,
} from '@phosphor-icons/react'
import { useAuctions } from '@/hooks/useAuctions'
import AuctionCard from '@/components/auction/AuctionCard'
import AuctionHero from '@/components/auction/AuctionHero'
import BidModal from '@/components/auction/BidModal'
import { AUCTION_CATEGORIES, type Auction } from '@/data/auctionCategories'
import { useAuth } from '@/context/AuthContext'
import { formatINR } from '@/lib/formatPrice'
import LazyImage from '@/components/common/LazyImage'

type SortBy = 'ending' | 'bid' | 'new'

const CATEGORY_ICONS: Record<string, Icon> = {
  all: Scales,
  Residential: House,
  Commercial: BuildingOffice,
  'PG Building': Buildings,
  Apartment: BuildingApartment,
  Villa: HouseLine,
  Industrial: Factory,
}

export default function AuctionsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [modalStep, setModalStep] = useState<'bid' | 'notify'>('bid')
  const [detailAuction, setDetailAuction] = useState<Auction | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('ending')

  const { auctions, loading } = useAuctions(activeCategory)
  const { user, signInWithGoogle } = useAuth()

  const sortedAuctions = useMemo(() => {
    return [...auctions].sort((a, b) => {
      if (sortBy === 'ending') {
        return (a.auctionEndTime?.getTime() || 0) - (b.auctionEndTime?.getTime() || 0)
      }
      if (sortBy === 'bid') {
        return (b.currentBid || 0) - (a.currentBid || 0)
      }
      const aTime =
        typeof a.createdAt === 'object' && a.createdAt && 'seconds' in a.createdAt
          ? Number((a.createdAt as { seconds: number }).seconds)
          : 0
      const bTime =
        typeof b.createdAt === 'object' && b.createdAt && 'seconds' in b.createdAt
          ? Number((b.createdAt as { seconds: number }).seconds)
          : 0
      return bTime - aTime
    })
  }, [auctions, sortBy])

  const liveAuctions = sortedAuctions.filter(
    (a) => a.status === 'live' || a.status === 'ending_soon',
  )
  const upcomingAuctions = sortedAuctions.filter((a) => a.status === 'upcoming')
  const closedAuctions = sortedAuctions.filter(
    (a) => a.status === 'closed' || a.status === 'sold',
  )

  const totalBidders = sortedAuctions.reduce(
    (sum, a) => sum + (a.registeredBidders || 0),
    0,
  )

  const openBidModal = (auction: Auction) => {
    setModalStep(auction.status === 'upcoming' ? 'notify' : 'bid')
    setSelectedAuction(auction)
  }

  // Keep the bid modal's auction in sync with live bid updates so the
  // minimum next bid reflects the freshest current bid.
  const selectedId = selectedAuction?.id
  const liveSelected = useMemo(
    () => (selectedId ? auctions.find((a) => a.id === selectedId) ?? null : null),
    [auctions, selectedId],
  )
  const syncedAuction =
    liveSelected && selectedAuction && liveSelected.currentBid !== selectedAuction.currentBid
      ? liveSelected
      : selectedAuction

  return (
    <div className="min-h-screen bg-[#F8F6F0]">
      <AuctionHero
        liveCount={liveAuctions.length}
        upcomingCount={upcomingAuctions.length}
        totalCount={auctions.length}
        totalBidders={totalBidders}
      />

      {/* CATEGORY FILTER */}
      <div className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-1 overflow-x-auto px-4 sm:px-6 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {AUCTION_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-[3px] px-4 py-3.5 text-[13px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C9A84C] ${
                activeCategory === cat.id
                  ? 'border-[#C9A84C] font-bold text-[#0A1628]'
                  : 'border-transparent font-medium text-[#6B7280] hover:text-[#0A1628]'
              }`}
            >
              {(() => {
                const CategoryIcon = CATEGORY_ICONS[cat.id] || Scales
                return (
                  <CategoryIcon
                    aria-hidden
                    size={15}
                    weight={activeCategory === cat.id ? 'fill' : 'regular'}
                    style={{ color: cat.color }}
                  />
                )
              })()}
              {cat.label}
            </button>
          ))}

          {/* Sort by */}
          <div className="ml-auto shrink-0 py-2 pl-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="cursor-pointer appearance-none rounded-lg border-[1.5px] border-[#E5E7EB] bg-white py-2 pl-3 pr-8 text-[13px] font-semibold text-[#374151] outline-none transition-colors duration-200 hover:border-[#C9A84C] focus-visible:border-[#C9A84C]"
                aria-label="Sort auctions"
              >
                <option value="ending">Ending Soon</option>
                <option value="bid">Highest Bid</option>
                <option value="new">Newest First</option>
              </select>
              <CaretDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[480px] animate-pulse overflow-hidden rounded-2xl bg-white"
              >
                <div className="h-[200px] bg-[#F3F4F6]" />
                <div className="space-y-3 p-5">
                  <div className="h-3.5 w-1/3 rounded bg-[#F3F4F6]" />
                  <div className="h-3.5 w-full rounded bg-[#F3F4F6]" />
                  <div className="h-3.5 w-2/3 rounded bg-[#F3F4F6]" />
                  <div className="h-3.5 w-1/2 rounded bg-[#F3F4F6]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* LIVE AUCTIONS */}
            {liveAuctions.length > 0 && (
              <section className="mb-12">
                <div className="mb-6 flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EF4444] opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                  </span>
                  <h2 className="font-serif text-xl font-bold text-[#0A1628] sm:text-2xl">
                    Live Auctions
                  </h2>
                  <span className="rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-bold text-[#EF4444]">
                    {liveAuctions.length} active
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {liveAuctions.map((auction) => (
                    <AuctionCard
                      key={auction.id}
                      auction={auction}
                      onBidClick={openBidModal}
                      onViewClick={setDetailAuction}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* UPCOMING AUCTIONS */}
            {upcomingAuctions.length > 0 && (
              <section className="mb-12">
                <h2 className="mb-6 flex items-center gap-3 font-serif text-xl font-bold text-[#0A1628] sm:text-2xl">
                  <Bell className="text-[#3B82F6]" size={22} weight="fill" />
                  Upcoming Auctions
                  <span className="rounded-full bg-[#DBEAFE] px-2.5 py-0.5 text-xs font-bold text-[#3B82F6]">
                    {upcomingAuctions.length} scheduled
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {upcomingAuctions.map((auction) => (
                    <AuctionCard
                      key={auction.id}
                      auction={auction}
                      onBidClick={openBidModal}
                      onViewClick={setDetailAuction}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* CLOSED AUCTIONS */}
            {closedAuctions.length > 0 && (
              <section>
                <h2 className="mb-6 flex items-center gap-3 font-serif text-xl font-bold text-[#0A1628] opacity-70 sm:text-2xl">
                  <Eye className="text-[#6B7280]" size={22} />
                  Past Auctions
                </h2>
                <div className="grid grid-cols-1 gap-6 opacity-80 md:grid-cols-2 xl:grid-cols-3">
                  {closedAuctions.map((auction) => (
                    <AuctionCard
                      key={auction.id}
                      auction={auction}
                      onBidClick={openBidModal}
                      onViewClick={setDetailAuction}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {auctions.length === 0 && (
              <div className="py-20 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0A1628]">
                  <Gavel size={36} color="#C9A84C" weight="thin" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#0A1628]">
                  No Auctions Yet
                </h3>
                <p className="mt-2 text-[15px] text-[#6B7280]">
                  Auctions will appear here when listed by VJR Estate.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* DETAIL MODAL */}
      {detailAuction && (
        <DetailModal
          auction={detailAuction}
          onClose={() => setDetailAuction(null)}
          onBid={() => {
            setDetailAuction(null)
            openBidModal(detailAuction)
          }}
        />
      )}

      {/* BID MODAL */}
      <BidModal
        auction={syncedAuction}
        currentUser={user}
        initialStep={modalStep}
        onClose={() => setSelectedAuction(null)}
        onRequireLogin={async () => {
          await signInWithGoogle()
        }}
      />
    </div>
  )
}

function DetailModal({
  auction,
  onClose,
  onBid,
}: {
  auction: Auction
  onClose: () => void
  onBid: () => void
}) {
  const isActive = auction.status === 'live' || auction.status === 'ending_soon'
  const isUpcoming = auction.status === 'upcoming'
  const isClosed = auction.status === 'closed' || auction.status === 'sold'

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${auction.title} details`}
    >
      <div
        className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-[#F3F4F6]">
          {auction.images?.[0] ? (
            <LazyImage
              src={auction.images[0]}
              alt={auction.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A1628] to-[#1E3852]">
              <Gavel size={56} weight="thin" color="rgba(201,168,76,0.5)" />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/80"
          >
            ✕
          </button>
          <span
            className={`absolute left-3 top-3 rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] backdrop-blur-md ${
              isActive
                ? 'bg-[#C9A84C]/90 text-[#0A1628]'
                : isUpcoming
                  ? 'bg-[#3B82F6]/90 text-white'
                  : 'bg-black/60 text-white'
            }`}
          >
            {isActive ? '● Live' : isUpcoming ? 'Upcoming' : 'Ended'}
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#C9A84C]">
              {auction.category}
            </span>
            <span className="flex items-center gap-1 text-[13px] text-[#6B7280]">
              <MapPin size={13} weight="fill" className="text-[#C9A84C]" />
              {auction.location}, {auction.city || 'Bangalore'}
            </span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-[#0A1628]">
            {auction.title}
          </h3>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
            Lot #{auction.id?.slice(-4).toUpperCase()}
          </p>

          {/* Price grid */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DetailStat
              label={auction.totalBids > 0 ? 'Current Bid' : 'Starting Bid'}
              value={formatINR(auction.currentBid || auction.startingBid)}
              highlight
            />
            <DetailStat
              label="Reserve Price"
              value={formatINR(auction.reservePrice)}
            />
            <DetailStat
              label="Min Increment"
              value={formatINR(auction.bidIncrement || 100000)}
            />
            <DetailStat label="Total Bids" value={String(auction.totalBids || 0)} />
          </div>

          {/* Property specs */}
          {(auction.areaSqft || auction.propertyType || auction.khata || auction.facing) && (
            <div className="mt-6 rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] p-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">
                Property Details
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                {auction.areaSqft && (
                  <SpecItem
                    Icon={Ruler}
                    label="Area"
                    value={`${auction.areaSqft.toLocaleString('en-IN')} sq.ft`}
                  />
                )}
                {auction.propertyType && (
                  <SpecItem
                    Icon={HouseLine}
                    label="Type"
                    value={auction.propertyType}
                  />
                )}
                {auction.khata && (
                  <SpecItem Icon={NotePencil} label="Khata" value={auction.khata} />
                )}
                {auction.facing && (
                  <SpecItem Icon={Eye} label="Facing" value={auction.facing} />
                )}
              </div>
            </div>
          )}

          {auction.description && (
            <div className="mt-6">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">
                <FileText size={13} /> Description
              </p>
              <p className="text-sm leading-relaxed text-[#4B5563] whitespace-pre-line">
                {auction.description}
              </p>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-[#F3F4F6] pt-5">
            <span className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
              <Users size={15} className="text-[#C9A84C]" />
              {auction.registeredBidders || 0} registered bidders
            </span>
            <button
              type="button"
              onClick={onBid}
              disabled={isClosed}
              className={`flex h-12 cursor-pointer items-center gap-2 rounded-xl px-6 text-sm font-extrabold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C] disabled:cursor-not-allowed ${
                isClosed
                  ? 'bg-[#9CA3AF] text-white'
                  : isUpcoming
                    ? 'bg-[#3B82F6] text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                    : 'bg-[#C9A84C] text-[#0A1628] shadow-[0_4px_12px_rgba(201,168,76,0.4)]'
              }`}
            >
              {isClosed ? (
                'Auction Closed'
              ) : isUpcoming ? (
                <>
                  <Bell size={16} weight="fill" /> Notify Me
                </>
              ) : (
                <>
                  <Gavel size={16} weight="bold" /> Place Bid
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailStat({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-[17px] font-extrabold tabular-nums ${
          highlight ? 'text-[#C9A84C]' : 'text-[#0A1628]'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function SpecItem({
  Icon,
  label,
  value,
}: {
  Icon: typeof MapPin
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A1628]">
        <Icon size={14} color="#C9A84C" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
          {label}
        </p>
        <p className="truncate text-[13px] font-semibold text-[#111827]">{value}</p>
      </div>
    </div>
  )
}
