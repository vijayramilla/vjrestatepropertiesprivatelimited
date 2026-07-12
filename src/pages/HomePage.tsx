import { useState, useCallback, Suspense, lazy } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlobeHemisphereWest, ArrowRight } from '@phosphor-icons/react';
import HomeHero from '../components/home/HomeHero';
import HomeListingsSection from '../components/home/HomeListingsSection';
import { MAX_LOCALITY_SELECTIONS } from '../data/properties';
import { toggleLocalitySelection } from '@/lib/localitySelection';
import { useSiteSettings } from '@/context/SiteSettingsContext';

const HomeScrollShowcase = lazy(() => import('../components/home/HomeScrollShowcase'));
const HomeGlobalInvestors = lazy(() => import('../components/home/HomeGlobalInvestors'));
const HomeCircularReveal = lazy(() => import('../components/home/HomeCircularReveal'));
const HomeVjrSparkles = lazy(() => import('../components/home/HomeVjrSparkles'));
import HomepageDashboard from '../components/home/HomepageDashboard';

function SectionFallback({ minHeight = '16rem' }: { minHeight?: string }) {
  return (
    <div
      className="animate-pulse bg-gray-100"
      style={{ minHeight }}
      aria-hidden
    />
  );
}

const TAB_TO_TYPE_PARAM: Record<string, string | undefined> = {
  All: undefined,
  'PG Buildings': 'PG Buildings',
  Residential: 'Residential Rental Income',
  Commercial: 'Commercial Properties',
  Plot: 'Residential Plot,Commercial Plot',
  'JD Land': 'JD Land',
};

function buildSearchParams(propertyType: string, localities: string[]) {
  const params = new URLSearchParams();
  const typeVal = TAB_TO_TYPE_PARAM[propertyType];
  if (typeVal) params.set('type', typeVal);
  localities.forEach((loc) => params.append('area', loc));
  return params;
}

export default function HomePage() {
  const { mapOnly } = useSiteSettings();
  const navigate = useNavigate();
  const [propertyType, setPropertyType] = useState('All');
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>([]);
  const [localityNotice, setLocalityNotice] = useState('');

  const toggleLocality = useCallback((area: string) => {
    setSelectedLocalities((prev) => {
      const { next, limited } = toggleLocalitySelection(prev, area);
      if (limited) {
        setLocalityNotice(`You can select up to ${MAX_LOCALITY_SELECTIONS} localities`);
        window.setTimeout(() => setLocalityNotice(''), 2800);
      } else {
        setLocalityNotice('');
      }
      return next;
    });
  }, []);

  const goToProperties = useCallback(() => {
    const params = buildSearchParams(propertyType, selectedLocalities);
    const query = params.toString();
    navigate(query ? `/properties?${query}` : '/properties');
  }, [navigate, propertyType, selectedLocalities]);

  const handleTrendingClick = (area: string) => {
    const params = buildSearchParams(propertyType, [area]);
    navigate(`/properties?${params.toString()}`);
  };

  if (mapOnly) {
    return <Navigate to="/map" replace />;
  }

  return (
    <div className="bg-white">
      <HomeHero
        propertyType={propertyType}
        setPropertyType={setPropertyType}
        selectedLocalities={selectedLocalities}
        onToggleLocality={toggleLocality}
        localityNotice={localityNotice}
        onSearch={goToProperties}
        onTrendingClick={handleTrendingClick}
      />

      <HomepageDashboard />

      <HomeListingsSection />

      <Suspense fallback={<SectionFallback minHeight="60rem" />}>
        <HomeScrollShowcase />
      </Suspense>

      <Suspense fallback={<SectionFallback minHeight="24rem" />}>
        <HomeGlobalInvestors />
      </Suspense>

      <Suspense fallback={<SectionFallback minHeight="28rem" />}>
        <HomeCircularReveal />
      </Suspense>

      <section className="bg-black py-10 md:py-16 lg:py-24">
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 text-center">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-display text-white text-2xl md:text-3xl lg:text-4xl leading-tight">Ready to Build Wealth Through Rental Income?</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="text-gray-300 text-sm md:text-base mt-4 md:mt-6">Browse rental income properties exclusively in Bangalore.</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-8 md:mt-12 flex flex-col md:flex-row items-center justify-center gap-3">
            <Link to="/properties" className="hoverable inline-flex w-full md:w-auto items-center justify-center px-8 py-4 md:py-5 bg-white text-black text-xs md:text-sm uppercase tracking-[0.1em] font-medium transition-all duration-200 hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]">
              Explore All Properties <ArrowRight size={16} className="ml-2" />
            </Link>
            <Link to="/map" className="hoverable group inline-flex w-full md:w-auto items-center justify-center gap-2 px-8 py-4 md:py-5 border border-white/20 text-white text-xs md:text-sm uppercase tracking-[0.1em] font-medium transition-all duration-200 hover:bg-white/10 hover:border-white/40 hover:scale-[1.02] active:scale-[0.98]">
              <GlobeHemisphereWest size={16} weight="regular" className="transition-transform duration-200 group-hover:rotate-12" />
              Explore Land Map
            </Link>
          </motion.div>
        </div>
      </section>

      <Suspense fallback={<SectionFallback minHeight="32rem" />}>
        <HomeVjrSparkles />
      </Suspense>
    </div>
  );
}
