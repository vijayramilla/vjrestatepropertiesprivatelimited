import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, TrendUp, ChartBar } from '@phosphor-icons/react'
import {
  useFeaturedProperties,
  useTrendingProperties,
  useBangalorePriceSnapshot,
} from '@/hooks/useHomepageData'
import DashboardSectionCard from './DashboardSectionCard'
import PropertyMiniCard from './PropertyMiniCard'
import LocalityPriceRow from './LocalityPriceRow'
function EmptyState({ text, icon }: { text: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <span className="text-4xl mb-2 opacity-50">{icon}</span>
      <p className="text-[#6B7280] text-sm">{text}</p>
    </div>
  )
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
}

export default function HomepageDashboard() {
  const navigate = useNavigate()
  const { properties: featuredProperties, loading: featuredLoading } = useFeaturedProperties()
  const { properties: trendingProperties, loading: trendingLoading } = useTrendingProperties()
  const { localities, loading: priceLoading } = useBangalorePriceSnapshot()
  const hasViewed = typeof window !== 'undefined' && window.localStorage?.getItem('vjr_recently_viewed')

  return (
    <section className="w-full bg-[#F8F9FA]">
      <div className="max-w-[1440px] mx-auto px-4 md:px-10 lg:px-20 py-10 md:py-14">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="mb-8"
        >
          <h2 className="text-[28px] font-bold text-[#111827] leading-tight">
            {hasViewed ? 'Welcome back!' : 'Welcome!'}
          </h2>
          <p className="text-[#6B7280] text-sm md:text-base mt-1">
            Bangalore property insights at a glance
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch"
        >
          <motion.div variants={cardVariants} className="flex flex-col h-full">
            <DashboardSectionCard
              icon={Trophy}
              title="Featured Properties"
              viewAllLink="/properties?featured=true"
              loading={featuredLoading}
              badge="Top Picks"
            >
              {featuredProperties.length > 0 ? (
                <div className="divide-y divide-[#F9FAFB]">
                  {featuredProperties.slice(0, 5).map((p) => (
                    <PropertyMiniCard
                      key={p.id}
                      property={p}
                      onClick={() => navigate(`/properties/${p.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="No featured properties yet" icon="🏠" />
              )}
            </DashboardSectionCard>
          </motion.div>

          <motion.div variants={cardVariants} className="flex flex-col h-full">
            <DashboardSectionCard
              icon={TrendUp}
              title="Trending"
              viewAllLink="/properties"
              loading={trendingLoading}
              badge="Hot"
              badgeColor="bg-[#FEF2F2] text-[#DC2626]"
            >
              {trendingProperties.length > 0 ? (
                <div className="divide-y divide-[#F9FAFB]">
                  {trendingProperties.slice(0, 5).map((p) => (
                    <PropertyMiniCard
                      key={p.id}
                      property={p}
                      badge="🔥 Trending"
                      onClick={() => navigate(`/properties/${p.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="Trending properties loading..." icon="📈" />
              )}
            </DashboardSectionCard>
          </motion.div>

          <motion.div variants={cardVariants} className="flex flex-col h-full">
            <DashboardSectionCard
              icon={ChartBar}
              title="Bangalore Price Snapshot"
              subtitle="Avg. price per sq.ft by locality"
              viewAllLink="/map"
              viewAllText="View on Map"
              loading={priceLoading}
              badge="Live"
              badgeColor="bg-[#ECFDF5] text-[#059669]"
            >
              <div className="divide-y divide-[#F3F4F6]">
                {localities.length > 0 ? (
                  localities.map((loc, i) => (
                    <LocalityPriceRow
                      key={loc.locality}
                      rank={i + 1}
                      locality={loc.locality}
                      pricePerSqft={loc.avgPricePerSqft}
                      count={loc.count}
                    />
                  ))
                ) : (
                  <EmptyState text="Price data loading..." icon="📊" />
                )}
              </div>
              <p className="text-xs text-[#9CA3AF] mt-3 text-center">
                Based on VJR Estate listings
              </p>
            </DashboardSectionCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
