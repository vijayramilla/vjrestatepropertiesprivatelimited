import type { ReactNode, ElementType } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'

interface DashboardSectionCardProps {
  icon: ElementType
  title: string
  subtitle?: string
  viewAllLink?: string
  viewAllText?: string
  loading?: boolean
  badge?: string
  badgeColor?: string
  children: ReactNode
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-2.5 p-2">
      <div className="w-10 h-10 bg-[#F3F4F6] rounded-lg animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-[#F3F4F6] rounded animate-pulse w-3/4" />
        <div className="h-3 bg-[#F3F4F6] rounded animate-pulse w-1/2" />
        <div className="h-3 bg-[#F3F4F6] rounded animate-pulse w-1/3" />
      </div>
    </div>
  )
}

export default function DashboardSectionCard({
  icon: Icon,
  title,
  subtitle,
  viewAllLink,
  viewAllText = 'View All',
  loading,
  badge,
  badgeColor = 'bg-[#EEF2FF] text-[#4F46E5]',
  children,
}: DashboardSectionCardProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#F0F0F0] shadow-[0px_2px_12px_rgba(0,0,0,0.06)] p-4 flex flex-col h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0px_8px_24px_rgba(0,0,0,0.10)]"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0 mt-0.5">
            <Icon size={16} weight="duotone" className="text-[#4F46E5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-[#111827] leading-tight">{title}</h3>
              {badge && (
                <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${badgeColor} leading-none shrink-0`}>
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-[#6B7280] mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="group text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors shrink-0 whitespace-nowrap"
          >
            <span className="inline-flex items-center gap-0.5">
              {viewAllText}
              <ArrowRight size={11} weight="bold" className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="space-y-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
