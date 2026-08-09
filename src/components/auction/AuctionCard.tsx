import { Gavel, MapPin, Camera, Users, Eye } from '@phosphor-icons/react'
import AuctionTimer from './AuctionTimer'
import {
  AUCTION_STATUS_CONFIG,
  type Auction,
} from '@/data/auctionCategories'
import { formatINR } from '@/lib/formatPrice'
import LazyImage from '@/components/common/LazyImage'

interface AuctionCardProps {
  auction: Auction
  onBidClick: (auction: Auction) => void
  onViewClick: (auction: Auction) => void
}

export default function AuctionCard({
  auction,
  onBidClick,
  onViewClick,
}: AuctionCardProps) {
  const statusConfig =
    AUCTION_STATUS_CONFIG[auction.status] || AUCTION_STATUS_CONFIG.upcoming

  const isActive = auction.status === 'live' || auction.status === 'ending_soon'
  const isUpcoming = auction.status === 'upcoming'
  const isClosed = auction.status === 'closed' || auction.status === 'sold'
  const displayBid = auction.currentBid || auction.startingBid

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-200 ease-out hover:-translate-y-1"
      style={{
        boxShadow: isActive
          ? '0 4px 6px rgba(0,0,0,0.04), 0 12px 30px rgba(201,168,76,0.15)'
          : '0 4px 6px rgba(0,0,0,0.04), 0 12px 30px rgba(0,0,0,0.08)',
        border: isActive
          ? '1px solid rgba(201,168,76,0.3)'
          : '1px solid rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = isActive
          ? '0 8px 12px rgba(0,0,0,0.06), 0 20px 48px rgba(201,168,76,0.22)'
          : '0 8px 12px rgba(0,0,0,0.06), 0 20px 40px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = isActive
          ? '0 4px 6px rgba(0,0,0,0.04), 0 12px 30px rgba(201,168,76,0.15)'
          : '0 4px 6px rgba(0,0,0,0.04), 0 12px 30px rgba(0,0,0,0.08)'
      }}
    >
      {/* IMAGE */}
      <div className="relative aspect-video overflow-hidden bg-[#F3F4F6]">
        {auction.images?.[0] ? (
          <LazyImage
            src={auction.images[0]}
            alt={auction.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A1628] to-[#1E3852]">
            <Gavel size={40} weight="thin" color="rgba(201,168,76,0.5)" />
          </div>
        )}

        {/* Dark overlay for closed */}
        {isClosed && <div className="absolute inset-0 bg-black/50" />}

        {/* Status badge */}
        <div
          className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md border px-2.5 py-1 backdrop-blur-md"
          style={{
            backgroundColor: statusConfig.bg,
            borderColor: `${statusConfig.color}44`,
          }}
        >
          {statusConfig.pulse && (
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                style={{ backgroundColor: statusConfig.color }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: statusConfig.color }}
              />
            </span>
          )}
          <span
            className="text-[10px] font-extrabold uppercase tracking-[0.08em]"
            style={{ color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Photo count */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Camera size={12} weight="fill" />
          {auction.images?.length || 1}
        </div>

        {/* Lot / ID */}
        <div className="absolute bottom-3 right-3 rounded-md bg-[#0A1628CC] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#C9A84C] backdrop-blur-sm">
          LOT #{auction.id?.slice(-4).toUpperCase()}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col p-4 sm:p-[18px]">
        {/* Category + Location */}
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#C9A84C]">
            {auction.category}
          </span>
          <span className="flex items-center gap-1 text-xs text-[#6B7280]">
            <MapPin size={12} weight="fill" className="text-[#C9A84C]" />
            {auction.location}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-3 line-clamp-2 text-[17px] font-bold leading-snug text-[#111827]">
          {auction.title}
        </h3>

        {/* Timer + bids */}
        <div className="mb-3.5 flex items-center justify-between rounded-lg border border-[#0A162815] bg-[#0A162808] px-3.5 py-2.5">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
              {isUpcoming ? 'Starts In' : isClosed ? 'Ended' : 'Time Left'}
            </p>
            <AuctionTimer
              endTime={auction.auctionEndTime}
              status={auction.status}
              compact
            />
          </div>
          <div className="text-right">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
              Total Bids
            </p>
            <p className="text-lg font-extrabold tabular-nums text-[#0A1628]">
              {auction.totalBids || 0}
            </p>
          </div>
        </div>

        {/* Bid section */}
        <div className="mb-3.5 grid grid-cols-2 gap-2.5 border-b border-[#F3F4F6] pb-3.5">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
              {isClosed
                ? 'Final Bid'
                : auction.totalBids > 0
                  ? 'Current Bid'
                  : 'Starting Bid'}
            </p>
            <p className="text-[22px] font-extrabold tracking-tight text-[#0A1628] tabular-nums">
              {formatINR(displayBid)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
              Min Increment
            </p>
            <p className="text-base font-bold text-[#374151] tabular-nums">
              {formatINR(auction.bidIncrement || 100000)}
            </p>
          </div>
        </div>

        {/* Area + Registered bidders */}
        <div className="mb-3.5 flex items-center justify-between">
          {auction.areaSqft ? (
            <span className="text-[13px] font-medium text-[#6B7280] tabular-nums">
              {auction.areaSqft.toLocaleString('en-IN')} sq.ft
            </span>
          ) : (
            <span className="text-[13px] font-medium text-[#6B7280]">
              {auction.propertyType || '—'}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full border border-[#F3F4F6] bg-[#F9FAFB] px-2.5 py-0.5 text-xs text-[#6B7280]">
            <Users size={12} />
            {auction.registeredBidders || 0} registered
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-auto flex gap-2.5">
          <button
            type="button"
            onClick={() => onViewClick(auction)}
            className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#374151] transition-colors duration-200 hover:border-[#C9A84C] hover:text-[#0A1628] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
          >
            <Eye size={15} />
            View Details
          </button>

          <button
            type="button"
            onClick={() => !isClosed && onBidClick(auction)}
            disabled={isClosed}
            className="flex h-11 flex-[2] cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none text-[13px] font-extrabold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C] disabled:cursor-not-allowed"
            style={{
              backgroundColor: isClosed
                ? '#9CA3AF'
                : isUpcoming
                  ? '#3B82F6'
                  : '#C9A84C',
              color: isClosed ? 'white' : '#0A1628',
              boxShadow: isClosed
                ? 'none'
                : isUpcoming
                  ? '0 4px 12px rgba(59,130,246,0.3)'
                  : '0 4px 12px rgba(201,168,76,0.4)',
            }}
          >
            {isClosed ? (
              <>Auction Closed</>
            ) : isUpcoming ? (
              <>
                <span aria-hidden>🔔</span> Notify Me
              </>
            ) : (
              <>
                <Gavel size={15} weight="bold" /> Place Bid
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
