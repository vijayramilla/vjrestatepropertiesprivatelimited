import { useCountdownTimer } from '@/hooks/useCountdownTimer'
import type { AuctionStatus } from '@/data/auctionCategories'

interface AuctionTimerProps {
  endTime: Date | null | undefined
  status: AuctionStatus
  compact?: boolean
}

export default function AuctionTimer({
  endTime,
  status,
  compact = false,
}: AuctionTimerProps) {
  const { days, hours, minutes, seconds, isExpired, isEndingSoon } =
    useCountdownTimer(endTime)

  if (status === 'upcoming') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6]">
        <span aria-hidden className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3B82F6] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3B82F6]" />
        </span>
        Starts in {days > 0 ? `${days}d ` : ''}
        {hours}h {minutes}m
      </div>
    )
  }

  if (isExpired || status === 'closed' || status === 'sold') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280]">
        <span aria-hidden>⏹</span> Auction Ended
      </div>
    )
  }

  const timeColor = isEndingSoon ? '#EF4444' : '#C9A84C'

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 text-xs font-bold tabular-nums"
        style={{ color: timeColor }}
      >
        <span aria-hidden>⏱</span>
        {days > 0 ? `${days}d ` : ''}
        {String(hours).padStart(2, '0')}:
        {String(minutes).padStart(2, '0')}:
        {String(seconds).padStart(2, '0')}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {days > 0 && <TimeBox value={days} label="Days" color={timeColor} />}
      <TimeBox value={hours} label="Hrs" color={timeColor} />
      <TimeBox value={minutes} label="Min" color={timeColor} />
      <TimeBox value={seconds} label="Sec" color={timeColor} />
    </div>
  )
}

function TimeBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center min-w-[44px]">
      <div
        className="rounded-md border px-2 py-1 text-lg font-extrabold tabular-nums"
        style={{
          backgroundColor: '#0A1628',
          borderColor: `${color}44`,
          color,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          minWidth: '44px',
          textAlign: 'center',
        }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className="mt-1 text-[9px] uppercase tracking-[0.08em] text-[#6B7280]">
        {label}
      </span>
    </div>
  )
}
