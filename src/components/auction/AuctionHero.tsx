import { Gavel, Users, BellRinging, Building } from '@phosphor-icons/react'
import { siteContact } from '@/data/siteContact'

interface AuctionHeroProps {
  liveCount: number
  upcomingCount: number
  totalCount: number
  totalBidders: number
}

export default function AuctionHero({
  liveCount,
  upcomingCount,
  totalCount,
  totalBidders,
}: AuctionHeroProps) {
  const stats = [
    { label: 'Live Auctions', value: liveCount, Icon: Gavel },
    { label: 'Upcoming', value: upcomingCount, Icon: BellRinging },
    { label: 'Total Properties', value: totalCount, Icon: Building },
    { label: 'Registered Bidders', value: totalBidders, Icon: Users },
  ]

  return (
    <div className="relative overflow-hidden bg-[#0A1628] pb-12 pt-14 sm:pb-14 sm:pt-16">
      {/* Gold accent lines */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent"
      />
      {/* Ambient glows */}
      <div
        aria-hidden
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#C9A84C]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-[#1E3852]/60 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-[1200px] px-6 sm:px-8">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C9A84C] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C9A84C]" />
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#C9A84C]">
            {liveCount} Live Auction{liveCount === 1 ? '' : 's'} Now
          </span>
        </div>

        <h1 className="mt-5 font-serif text-[clamp(32px,5vw,54px)] font-bold leading-[1.08] tracking-tight text-white">
          Bangalore Property{' '}
          <span className="text-[#C9A84C]">Auctions</span>
        </h1>

        <p className="mt-4 max-w-[560px] text-[17px] leading-relaxed text-white/70">
          Bid on verified properties across Bangalore — residential, commercial,
          plots, villas and more. Transparent bidding, real-time updates.
        </p>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-2 gap-6 sm:flex sm:flex-wrap sm:gap-12">
          {stats.map(({ label, value, Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/10">
                <Icon size={18} color="#C9A84C" />
              </div>
              <div>
                <p className="text-2xl font-extrabold leading-none text-[#C9A84C] tabular-nums">
                  {value}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust strip */}
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-[13px] text-white/60">
          <span className="flex items-center gap-1.5">
            <span aria-hidden>✅</span> Verified properties &amp; clear titles
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden>⚖️</span> Transparent increments
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden>📡</span> Real-time bid updates
          </span>
          <a
            href={siteContact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 font-semibold text-[#C9A84C] transition-colors duration-200 hover:text-[#D6B85D]"
          >
            Questions? WhatsApp us →
          </a>
        </div>
      </div>
    </div>
  )
}
