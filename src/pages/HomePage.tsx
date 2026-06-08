import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { properties, BANGALORE_AREAS, PROPERTY_TYPES } from '../data/properties';

const categories = [
  { numeral: 'I', name: 'PG Building', desc: 'Co-living spaces with consistent tenant demand' },
  { numeral: 'II', name: 'Residential Rental Income', desc: 'Apartment buildings with stable monthly returns' },
  { numeral: 'III', name: 'Commercial Properties', desc: 'Retail and office spaces with high yield' },
  { numeral: 'IV', name: 'Plot / Agriculture Land', desc: 'Land parcels with development potential' },
];

const stats = [
  { number: 200, label: 'Properties Sold', suffix: '+' },
  { number: 100, label: 'Verified Only', suffix: '%' },
  { number: 4, label: 'Years Experience', suffix: '' },
  { number: 2025, label: 'Established', suffix: '' },
];

const processSteps = [
  { number: '01', title: 'Discover', desc: 'Browse verified properties with transparent rental income data.' },
  { number: '02', title: 'Verify', desc: 'Our team provides complete documentation and legal verification.' },
  { number: '03', title: 'Invest', desc: 'Own income-generating property with proven returns.' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const [searchForm, setSearchForm] = useState({ type: '', location: '', priceRange: '' });
  const [counters, setCounters] = useState(stats.map(() => 0));
  const [counterStarted, setCounterStarted] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !counterStarted) setCounterStarted(true);
    }, { threshold: 0.3 });
    if (counterRef.current) observer.observe(counterRef.current);
    return () => observer.disconnect();
  }, [counterStarted]);

  useEffect(() => {
    if (!counterStarted) return;
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    const targetCounts = stats.map((s) => s.number);
    const intervalId = setInterval(() => {
      setCounters((prev) => {
        const newCounters = [...prev];
        let allDone = true;
        newCounters.forEach((_, i) => {
          const progress = Math.min(prev[i] + (targetCounts[i] / steps), targetCounts[i]);
          newCounters[i] = Math.floor(progress * 10) / 10;
          if (newCounters[i] < targetCounts[i]) allDone = false;
        });
        if (allDone) clearInterval(intervalId);
        return newCounters;
      });
    }, interval);
    return () => clearInterval(intervalId);
  }, [counterStarted]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchForm.type) params.set('type', searchForm.type);
    if (searchForm.location) params.set('location', searchForm.location);
    navigate(`/properties?${params.toString()}`);
  };

  const featuredProperties = properties.filter((p) => p.featured);
  const headlineWords = "Verified Rental Income Properties".split(' ');

  return (
    <div className="bg-white">
      <section ref={heroRef} className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <motion.div className="absolute inset-0 hero-pattern" style={{ y: heroY }} />
        <div className="relative z-10 max-w-7xl mx-auto px-8 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-gray-400 text-[11px] uppercase tracking-[0.2em] mb-8">BANGALORE · EST. 2025</motion.p>
          <div className="max-w-[900px] mx-auto">
            <h1 className="font-display text-white overflow-hidden">
              {headlineWords.map((word, i) => (
                <motion.span key={i} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: 'easeOut' }} className="inline-block mr-[0.3em]" style={{ fontSize: 'clamp(48px, 8vw, 110px)', lineHeight: '1.1', letterSpacing: '-0.03em' }}>
                  {word}
                </motion.span>
              ))}
            </h1>
          </div>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="text-gray-300 text-[18px] max-w-[560px] mx-auto mt-[34px] leading-relaxed">
            We connect serious investors with verified rental-income buildings, PG properties and commercial assets across Bangalore.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1 }} className="flex flex-col sm:flex-row items-center justify-center gap-[21px] mt-[55px]">
            <Link to="/properties" className="hoverable inline-flex items-center justify-center px-8 py-4 bg-white text-black text-[13px] uppercase tracking-[0.1em] font-medium transition-all duration-300 hover:bg-gray-100">Explore Properties</Link>
            <Link to="/submit-requirement" className="hoverable inline-flex items-center justify-center px-8 py-4 border border-white text-white text-[13px] uppercase tracking-[0.1em] transition-all duration-300 hover:bg-white hover:text-black">Submit Requirement</Link>
          </motion.div>
          <div className="absolute bottom-0 left-0 right-0">
            <div className="border-t border-gray-800 py-8">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-gray-400 text-[12px] uppercase tracking-[0.15em]">
                <span>200+ Properties Sold</span>
                <span className="hidden sm:inline">|</span>
                <span>Verified Only</span>
                <span className="hidden sm:inline">|</span>
                <span>Bangalore Focused</span>
              </div>
            </div>
            <motion.div className="flex justify-center pb-8" animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
              <ChevronDown size={24} className="text-gray-400" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row items-center gap-4">
            <select value={searchForm.type} onChange={(e) => setSearchForm({ ...searchForm, type: e.target.value })} className="w-full lg:w-auto lg:flex-1 px-0 py-3 border-0 border-b border-black bg-transparent text-sm focus:ring-0 focus:outline-none">
              <option value="">Property Type</option>
              {PROPERTY_TYPES.map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
            <select value={searchForm.location} onChange={(e) => setSearchForm({ ...searchForm, location: e.target.value })} className="w-full lg:w-auto lg:flex-1 px-0 py-3 border-0 border-b border-black bg-transparent text-sm focus:ring-0 focus:outline-none">
              <option value="">Location/Area</option>
              {BANGALORE_AREAS.map((area) => (<option key={area} value={area}>{area}</option>))}
            </select>
            <button type="submit" className="hoverable w-full lg:w-auto px-8 py-3 bg-black text-white text-[13px] uppercase tracking-[0.1em] transition-colors hover:bg-gray-900">Search Properties</button>
          </form>
        </div>
      </section>

      <section className="bg-white py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-[55px]">
            <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em] mb-3">WHAT WE OFFER</p>
            <h2 className="font-display text-black" style={{ fontSize: 'clamp(42px, 6vw, 68px)', lineHeight: '1.1' }}>Property Categories</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[21px]">
            {categories.map((cat, index) => (
              <motion.div key={cat.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }}>
                <Link to={`/properties?type=${encodeURIComponent(cat.name)}`} className="group block bg-black p-[55px]_[34px] border border-gray-800 hover:border-white transition-all duration-300 hoverable">
                  <span className="font-display text-gray-800 block" style={{ fontSize: '68px', lineHeight: '1' }}>{cat.numeral}</span>
                  <h3 className="font-display text-white mt-[21px]" style={{ fontSize: '26px' }}>{cat.name}</h3>
                  <p className="text-gray-400 text-[13px] mt-[13px] leading-relaxed">{cat.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-[55px]">
            <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em] mb-3">INVESTMENT OPPORTUNITIES</p>
            <h2 className="font-display text-black" style={{ fontSize: 'clamp(42px, 6vw, 68px)', lineHeight: '1.1' }}>Featured Properties</h2>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[34px]">
            {featuredProperties.map((property) => (<PropertyCard key={property.id} property={property} />))}
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mt-[55px]">
            <Link to="/properties" className="hoverable inline-flex items-center justify-center px-8 py-4 bg-black text-white text-[13px] uppercase tracking-[0.1em] transition-colors hover:bg-gray-900">
              View All Properties <ArrowRight size={16} className="ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>

      <section ref={counterRef} className="bg-black py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-display text-white text-center mb-[89px]" style={{ fontSize: 'clamp(42px, 6vw, 68px)', lineHeight: '1.1' }}>Why Investors Choose VJR Estate</motion.h2>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-[34px] lg:gap-0">
            {stats.map((stat, index) => (
              <div key={stat.label} className="flex items-center">
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }} className="text-center px-[55px]">
                  <p className="text-white" style={{ fontSize: '68px', lineHeight: '1', fontFamily: 'Playfair Display, serif' }}>{counters[index]}{stat.suffix}</p>
                  <p className="text-gray-400 text-[13px] uppercase tracking-[0.15em] mt-[13px]">{stat.label}</p>
                </motion.div>
                {index < stats.length - 1 && <div className="stat-divider hidden lg:block" />}
              </div>
            ))}
          </div>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-gray-300 text-[18px] text-center max-w-[560px] mx-auto mt-[55px] leading-relaxed">
            Every property on VJR Estate is personally verified by our team for legal clarity, rental income accuracy, and investment potential.
          </motion.p>
        </div>
      </section>

      <section className="bg-white py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-[89px]">
            <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em] mb-3">HOW IT WORKS</p>
            <h2 className="font-display text-black" style={{ fontSize: 'clamp(42px, 6vw, 68px)', lineHeight: '1.1' }}>Simple. Transparent. Trusted.</h2>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[55px]">
            {processSteps.map((step, index) => (
              <motion.div key={step.number} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.2 }} className="relative text-center">
                <span className="font-display text-gray-100 block" style={{ fontSize: '110px', lineHeight: '1' }}>{step.number}</span>
                <h3 className="font-display text-black mt-[21px]" style={{ fontSize: '26px' }}>{step.title}</h3>
                <p className="text-gray-600 text-[16px] mt-[13px] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-display text-white" style={{ fontSize: 'clamp(42px, 6vw, 68px)', lineHeight: '1.1' }}>Ready to Build Wealth Through Rental Income?</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="text-gray-300 text-[18px] mt-[21px]">Browse verified properties exclusively in Bangalore.</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-[55px]">
            <Link to="/properties" className="hoverable inline-flex items-center justify-center px-10 py-5 bg-white text-black text-[13px] uppercase tracking-[0.1em] font-medium transition-colors hover:bg-gray-100">
              Explore All Properties <ArrowRight size={16} className="ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
