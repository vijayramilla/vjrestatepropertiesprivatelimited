import { useRef, useState } from 'react'
import { Heart, MapPin } from '@phosphor-icons/react'
import { useShortlist } from '@/context/ShortlistContext'
import { formatCardTotalPrice } from '@/lib/formatPrice'

interface PropertyMiniCardProps {
  property: {
    id: string
    title: string
    type?: string
    location?: string
    area?: string
    price?: number
    price_label?: string
    area_sqft?: number
    area_unit?: string
    area_acres?: number
    area_guntas?: number
    monthly_rental?: string
    images?: string[]
    image?: string
  }
  badge?: string
  onClick?: () => void
}

export default function PropertyMiniCard({ property, badge, onClick }: PropertyMiniCardProps) {
  const { isShortlisted, toggle } = useShortlist()
  const saved = isShortlisted(property.id)
  const imgSrc = property.image || property.images?.[0]
  const shortLocation = property.location?.split(',')[0]?.trim() || property.area?.split(',')[0]?.trim() || 'Bangalore'
  const btnRef = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
    onClick?.()
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      className="group relative flex items-center gap-2.5 w-full text-left py-2 px-1.5 transition-all duration-150 hover:bg-[#F9FAFB] active:scale-[0.99] overflow-hidden rounded-lg"
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute pointer-events-none rounded-full bg-black/5 animate-ripple"
          style={{ left: r.x - 6, top: r.y - 6, width: 12, height: 12 }}
        />
      ))}
      {badge && (
        <span className="absolute -top-0.5 left-1.5 text-[9px] font-semibold bg-[#FFF3E0] text-[#EA6C00] px-1.5 py-0.5 rounded z-10 leading-none shadow-sm">
          {badge}
        </span>
      )}

      <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-[#F3F4F6] ring-1 ring-black/[0.04] group-hover:ring-black/[0.08] transition-all">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#D1D5DB] text-2xl">🏠</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="text-[13px] font-semibold text-[#111827] leading-snug truncate">{property.title}</h4>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin size={9} weight="fill" className="text-[#9CA3AF] shrink-0" />
          <span className="text-[11px] text-[#6B7280] truncate">{shortLocation}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-[#111827] leading-none tracking-tight">
            {formatCardTotalPrice(property.price)}
          </span>
          {property.area_sqft ? (
            <span className="text-[10px] text-[#9CA3AF] font-medium">
              {property.area_sqft.toLocaleString()} sqft
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggle(property.id) }}
        className="shrink-0 p-1 rounded-md hover:bg-gray-100 transition-all duration-150 hover:scale-110"
      >
        <Heart
          size={16}
          weight={saved ? 'fill' : 'regular'}
          className={`transition-colors duration-150 ${saved ? 'text-[#EF4444]' : 'text-[#D1D5DB] hover:text-[#EF4444]'}`}
        />
      </button>
    </button>
  )
}
