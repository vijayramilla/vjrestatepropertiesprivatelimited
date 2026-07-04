import { TrendUp, TrendDown } from '@phosphor-icons/react'

interface LocalityPriceRowProps {
  rank: number
  locality: string
  pricePerSqft: number
  count: number
}

export default function LocalityPriceRow({ rank, locality, pricePerSqft }: LocalityPriceRowProps) {
  const isUp = rank <= 4

  return (
    <div className="flex items-center justify-between h-11 border-b border-[#F9FAFB] last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[13px] font-bold text-[#9CA3AF] w-7 shrink-0">#{rank}</span>
        <span className="text-sm font-semibold text-[#111827] truncate">{locality}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-base font-bold text-[#111827] leading-none">
          ₹{pricePerSqft.toLocaleString('en-IN')}
        </span>
        <span className="text-xs text-[#6B7280]">/sq.ft</span>
        {isUp ? (
          <TrendUp size={16} weight="fill" className="text-green-500" />
        ) : (
          <TrendDown size={16} weight="fill" className="text-[#F87171]" />
        )}
      </div>
    </div>
  )
}
