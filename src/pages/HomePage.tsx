import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import HomeHero from '../components/home/HomeHero';
import HomeListingsSection from '../components/home/HomeListingsSection';
import HomeScrollShowcase from '../components/home/HomeScrollShowcase';
import HomeGlobalInvestors from '../components/home/HomeGlobalInvestors';
import HomeCircularReveal from '../components/home/HomeCircularReveal';
import HomeVjrSparkles from '../components/home/HomeVjrSparkles';
import { AnimatedStatNumber } from '@/components/ui/animated-blur-number';
import { MAX_LOCALITY_SELECTIONS } from '../data/properties';
import { toggleLocalitySelection } from '@/lib/localitySelection';

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

      <HomeScrollShowcase />

      <HomeGlobalInvestors />

      <HomeCircularReveal />

      <section ref={counterRef} className="bg-black py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-display text-white text-center mb-[89px]" style={{ fontSize: 'clamp(42px, 6vw, 68px)', lineHeight: '1.1' }}>Why Investors Choose VJR Estate</motion.h2>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-[34px] lg:gap-0">
            {stats.map((stat, index) => (
              <div key={stat.label} className="flex items-center">
                <div className="text-center px-[55px]">
                  <AnimatedStatNumber
                    value={stat.number}
                    suffix={stat.suffix}
                    active={counterStarted}
                    className="text-white font-numeric text-[68px] font-semibold leading-none tracking-tight"
                    duration={400}
                    blur={14}
                  />
                  <p className="text-gray-400 text-[13px] uppercase tracking-[0.15em] mt-[13px]">{stat.label}</p>
                </div>
                {index < stats.length - 1 && <div className="stat-divider hidden lg:block" />}
              </div>
            ))}
          </div>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-gray-300 text-[18px] text-center max-w-[560px] mx-auto mt-[55px] leading-relaxed">
            Every property on VJR Estate is reviewed by our team for legal clarity, rental income accuracy, and investment potential.
          </motion.p>
        </div>
      </section>

      <section className="bg-black py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-display text-white" style={{ fontSize: 'clamp(42px, 6vw, 68px)', lineHeight: '1.1' }}>Ready to Build Wealth Through Rental Income?</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="text-gray-300 text-[18px] mt-[21px]">Browse rental income properties exclusively in Bangalore.</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-[55px]">
            <Link to="/properties" className="hoverable inline-flex items-center justify-center px-10 py-5 bg-white text-black text-[13px] uppercase tracking-[0.1em] font-medium transition-colors hover:bg-gray-100">
              Explore All Properties <ArrowRight size={16} className="ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>

      <HomeVjrSparkles />
    </div>
  );
}
