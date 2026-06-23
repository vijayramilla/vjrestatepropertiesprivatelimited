import { useEffect, useState, useRef, useCallback, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import HomeHero from '../components/home/HomeHero';
import HomeListingsSection from '../components/home/HomeListingsSection';
import { AnimatedStatNumber } from '@/components/ui/animated-blur-number';
import { MAX_LOCALITY_SELECTIONS } from '../data/properties';
import { toggleLocalitySelection } from '@/lib/localitySelection';

const HomeScrollShowcase = lazy(() => import('../components/home/HomeScrollShowcase'));
const HomeGlobalInvestors = lazy(() => import('../components/home/HomeGlobalInvestors'));
const HomeCircularReveal = lazy(() => import('../components/home/HomeCircularReveal'));
const HomeVjrSparkles = lazy(() => import('../components/home/HomeVjrSparkles'));

function SectionFallback({ minHeight = '16rem' }: { minHeight?: string }) {
  return (
    <div
      className="animate-pulse bg-gray-100"
      style={{ minHeight }}
      aria-hidden
    />
  );
}

const stats = [
  { number: 200, label: 'Properties Sold', suffix: '+' },
  { number: 100, label: 'Bangalore Focus', suffix: '%' },
  { number: 4, label: 'Years Experience', suffix: '' },
  { number: 2025, label: 'Established', suffix: '' },
];

const TAB_TO_TYPE_PARAM: Record<string, string | undefined> = {
  All: undefined,
  'PG Building': 'PG Building',
  Residential: 'Residential Rental Income',
  Commercial: 'Commercial Properties',
  Plot: 'Residential Plot,Commercial Plot',
  Agriculture: 'Agriculture Land',
};

function buildSearchParams(propertyType: string, localities: string[]) {
  const params = new URLSearchParams();
  const typeVal = TAB_TO_TYPE_PARAM[propertyType];
  if (typeVal) params.set('type', typeVal);
  localities.forEach((loc) => params.append('area', loc));
  return params;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [propertyType, setPropertyType] = useState('All');
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>([]);
  const [localityNotice, setLocalityNotice] = useState('');

  const [counterStarted, setCounterStarted] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !counterStarted) setCounterStarted(true);
    }, { threshold: 0.3 });
    if (counterRef.current) observer.observe(counterRef.current);
    return () => observer.disconnect();
  }, [counterStarted]);

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

      <section ref={counterRef} className="bg-black py-10 md:py-16 lg:py-24">
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-display text-white text-center mb-10 md:mb-16 text-2xl md:text-3xl lg:text-4xl leading-tight">Why Investors Choose VJR Estate</motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center py-6 md:py-10">
                <AnimatedStatNumber
                  value={stat.number}
                  suffix={stat.suffix}
                  active={counterStarted}
                  className="text-white font-numeric text-3xl md:text-4xl lg:text-5xl font-bold leading-none tracking-tight"
                  duration={400}
                  blur={14}
                />
                <p className="text-gray-400 text-xs md:text-sm uppercase tracking-[0.15em] mt-3 md:mt-4">{stat.label}</p>
              </div>
            ))}
          </div>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-gray-300 text-sm md:text-base text-center max-w-xl mx-auto mt-10 md:mt-14 leading-relaxed">
            Every property on VJR Estate is reviewed by our team for legal clarity, rental income accuracy, and investment potential.
          </motion.p>
        </div>
      </section>

      <section className="bg-black py-10 md:py-16 lg:py-24">
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 text-center">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-display text-white text-2xl md:text-3xl lg:text-4xl leading-tight">Ready to Build Wealth Through Rental Income?</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="text-gray-300 text-sm md:text-base mt-4 md:mt-6">Browse rental income properties exclusively in Bangalore.</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-8 md:mt-12">
            <Link to="/properties" className="hoverable inline-flex w-full md:w-auto items-center justify-center px-8 py-4 md:py-5 bg-white text-black text-xs md:text-sm uppercase tracking-[0.1em] font-medium transition-all duration-200 hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]">
              Explore All Properties <ArrowRight size={16} className="ml-2" />
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
