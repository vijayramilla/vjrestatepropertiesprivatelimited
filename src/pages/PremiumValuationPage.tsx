import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyhole, Building, MapTrifold, Ruler, Calendar, Compass, Square, Stack, CheckCircle, House } from '@phosphor-icons/react';
import { SparklesCore } from '@/components/ui/sparkles';
import { AnimatedStatNumber } from '@/components/ui/animated-blur-number';
import GlassCard from '@/components/ui/glass-card';
import { getPropertyValuation, type ValuationInput, type ValuationResult } from '@/utils/aiValuation';
import { cn } from '@/lib/utils';
import { BANGALORE_AREAS, filterLocalities } from '@/data/properties';

/* ─── Types ─── */
interface PremiumButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

/* ─── Reusable Premium Button ─── */
function PremiumButton({ onClick, disabled, loading, children, className }: PremiumButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative overflow-hidden rounded-xl px-6 py-3 text-sm font-bold text-white transition-all duration-300',
        'bg-gray-900 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] active:shadow-inner',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none',
        className,
      )}
    >
      <div
        className={cn('pointer-events-none absolute inset-0 transition-opacity duration-300', hovered ? 'opacity-100' : 'opacity-0')}
        style={{ background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.12), transparent 40%)` }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? 'Valuating…' : children}
      </span>
    </button>
  );
}

/* ─── FAQ Section ─── */
function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const FAQs = [
    { q: 'How accurate is the AI valuation?', a: 'Our AI analyzes comparable sales, circle rates, and 30+ market signals across Bangalore. Confidence scores above 80% are highly reliable.' },
    { q: 'What data does the valuation use?', a: 'Property type, locality, area, age, floor, facing, BHK, and construction status. The AI is trained on Bangalore-specific real estate data.' },
    { q: 'Is this a government-approved valuation?', a: 'This is an AI-powered market estimate, not a government-approved valuation. For legal purposes, consult a registered valuer.' },
    { q: 'How often is the market data updated?', a: 'The AI model incorporates the latest available market trends and recent comparable sales in your locality.' },
    { q: 'Can I use this for loan applications?', a: 'Banks require their own approved valuers. Use this estimate as a reference for your property\'s market standing.' },
  ];
  return (
    <section className="w-full max-w-2xl mx-auto space-y-2">
      {FAQs.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur-sm overflow-hidden transition-colors hover:border-slate-300/80">
            <button type="button" onClick={() => setOpenIndex(isOpen ? null : i)} className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-900">
              <span>{faq.q}</span>
              <svg className={cn('shrink-0 text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div key="content" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
                  <div className="px-5 pb-4 text-sm leading-relaxed text-gray-600">{faq.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </section>
  );
}

/* ─── Data ─── */
const STEPS = [
  { num: '01', title: 'Enter Property Details', desc: 'Select type, locality, size, age, and other key parameters. Our form guides you step-by-step.' },
  { num: '02', title: 'AI Market Analysis', desc: 'Our AI cross-references 30+ market signals including recent sales, circle rates, and locality trends across Bangalore.' },
  { num: '03', title: 'Get Your Valuation', desc: 'Receive a comprehensive report with market value, price per sq.ft, rental yield, and confidence score.' },
];

const MARKET_STATS = [
  { label: 'Properties Analyzed', value: 15420, suffix: '+' },
  { label: 'Localities Covered', value: 186, suffix: '' },
  { label: 'Avg. Accuracy', value: 92, suffix: '%' },
  { label: 'Happy Users', value: 8340, suffix: '+' },
];

function formatIndian(num: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);
}

/* ─── Sub-components ─── */

function StepIndicator({ step, steps }: { step: number; steps: any[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all游的colors', i < step ? 'bg-gray-900 text-white' : i === step ? 'bg-black text-white' : 'bg-gray-200 text-gray-400')}>
            {i < step ? '✓' : i + 1}
          </div>
          <span className={cn('hidden sm:inline text-xs font-medium transition-colors', i === step ? 'text-gray-900 font-semibold' : 'text-gray-400')}>{s.label}</span>
          {i < steps.length - 1 && <div className="w-8 h-px bg-gray-200" />}
        </div>
      ))}</div>
  );
}

/* ─── Main Page ─── */
export default function PremiumValuationPage() {
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  /* Form State */
  const [step, setStep] = useState(0);
  const [propertyType, setPropertyType] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [locality, setLocality] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [age, setAge] = useState('');
  const [facing, setFacing] = useState('');
  const [floor, setFloor] = useState('');
  const [bhk, setBhk] = useState('');
  const [status, setStatus] = useState('');
  const [localityQuery, setLocalityQuery] = useState('');
  const [localitySuggestions, setLocalitySuggestions] = useState<string[]>([]);

  const formSteps = [
    { label: 'Type', title: 'Select Property Type' },
    { label: 'Location', title: 'Choose Location' },
    { label: 'Details', title: 'Property Details' },
  ];

  const handleValuate = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setShowResults(false);
    const input: ValuationInput = {
      propertyType: subCategory ? `${propertyType} - ${subCategory}` : propertyType,
      locality,
      areaSqft: Number(areaSqft) || 1000,
      age: age || 'New Construction',
      facing: facing || 'East',
      floor: floor || 'Ground',
      bhk: bhk || '2 BHK',
      status: status || 'Ready to Move',
    };
    const data = await getPropertyValuation(input);
    if (!data) {
      setError('Could not get valuation. Please try again or check your API key.');
      setLoading(false);
      return;
    }
    setResult(data);
    setLoading(false);
    setTimeout(() => setShowResults(true), 100);
  }, [subCategory, propertyType, locality, areaSqft, age, facing, floor, bhk, status]);

  const canProceed = () => {
    if (step === 0) {
      if (!propertyType) return false;
      if ((propertyType === 'Plot / Land' || propertyType === 'Commercial') && !subCategory) return false;
      return true;
    }
    if (step === 1) return !!locality;
    return true;
  };

  const handleLocalitySearch = (q: string) => {
    setLocalityQuery(q);
    if (q.trim().length > 0) setLocalitySuggestions(filterLocalities(q, 6));
    else setLocalitySuggestions([]);
  };

  useEffect(() => {
    document.title = 'AI Property Valuation | VJR Estate';
  }, []);

  return (
    <div className="relative min-h-screen bg-[#fafafa]">
      {/* Premium Ambient Backgrounds */}
      <SparklesCore particleColor="#000000" particleDensity={10} minSize={0.3} maxSize={1.2} speed={1.5} className="pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #000 0%, transparent 70%)' }} animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.05, 1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute -bottom-40 -right-40 h-[700px] w-[700px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #000 0%, transparent 70%)' }} animate={{ x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 md:pt-32 lg:px-8">
        {/* HERO */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="mb-16 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 backdrop-blur-sm">
            <CheckCircle weight="fill" size={14} className="text-emerald-600" />
            AI-Powered Analysis
          </span>
          <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
            <span className="bg-clip-text text-transparent bg-gradient-to-tr from-gray-900 via-gray-700 to-gray-800">
              Property Valuation
            </span>
          </h1>
          <p className="mt-4 text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
            Get an instant, AI-powered market estimate for any property in Bangalore. Backed by real-time market data and comparable sales analysis.
          </p>
        </motion.div>

        {/* FORM + RESULTS */}
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
          <div className="lg:col-span-3">
            <GlassCard className="w-full p-8 sm:p-10">
              <StepIndicator step={step} steps={formSteps} />
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <p className="text-center text-sm font-semibold text-gray-900 mb-6">{formSteps[0].title}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[ 
                        { id: 'Apartment', icon: Building, label: 'Apartment' },
                        { id: 'Independent House', icon: House, label: 'Independent House' },
                        { id: 'Plot / Land', icon: MapTrifold, label: 'Plot / Land' },
                        { id: 'Commercial', icon: Stack, label: 'Commercial' },
                        { id: 'PG Building', icon: Keyhole, label: 'PG Building' },
                      ].map((t) => {
                        const selected = propertyType === t.id;
                        return (
                          <button key={t.id} type="button" onClick={() => { setPropertyType(t.id); setSubCategory(''); }}
                            className={cn('flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all', selected ? 'border-gray-900 bg-gray-50 text-gray-900 shadow-md' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm')}>
                            <t.icon size={28} weight={selected ? 'fill' : 'duotone'} />
                            <span className="text-xs font-bold tracking-wide">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {propertyType && (propertyType === 'Plot / Land' || propertyType === 'Commercial') && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-center text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Select {propertyType === 'Plot / Land' ? 'Land' : 'Commercial'} Type</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {(propertyType === 'Plot / Land' ? ['Residential Plot', 'Commercial Plot', 'Agriculture Land'] : ['Office Space', 'Retail / Showroom', 'Warehouse / Godown', 'Commercial Land']).map((sc) => (
                            <button key={sc} type="button" onClick={() => setSubCategory(sc)}
                              className={cn('rounded-xl border-2 px-4 py-3 text-xs font-bold tracking-wide transition-all', subCategory === sc ? 'border-gray-900 bg-gray-50 text-gray-900 shadow-md' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300')}>
                              {sc}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <p className="text-center text-sm font-semibold text-gray-900 mb-6">{formSteps[1].title}</p>
                    <div className="relative">
                      <input type="text" placeholder="Search Bangalore localities..." value={localityQuery} onChange={(e) => handleLocalitySearch(e.target.value)}
                        className="w-full h-12 pl-4 pr-12 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors" />
                      <button type="button" onClick={() => {
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition(async (pos) => {
                          try {
                            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
                            const data = await res.json();
                            const address = (data.display_name || '').toLowerCase();
                            const match = BANGALORE_AREAS.find((a) => address.includes(a.toLowerCase()));
                            if (match) { setLocality(match); setLocalityQuery(match); }
                          } catch {/* noop */}
                        }, () => { /* noop */ }, { timeout: 5000 });
                      }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors" aria-label="Detect my location">
                        <Compass size={18} weight="duotone" />
                      </button>
                    </div>
                    {localitySuggestions.length > 0 && (
                      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-2 max-h-48 overflow-y-auto shadow-sm">
                        {localitySuggestions.map((s) => (
                          <button key={s} type="button" onClick={() => { setLocality(s); setLocalityQuery(s); setLocalitySuggestions([]); }}
                            className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm transition', locality === s ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50')}>
                            <MapTrifold size={14} className="shrink-0 text-gray-400" />
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <p className="text-center text-sm font-semibold text-gray-900 mb-6">{formSteps[2].title}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Ruler size={14} /> Area (sq.ft)</label>
                        <input type="number" placeholder="e.g. 1500" value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)} className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-gray-900 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Square size={14} /> BHK</label>
                        <select value={bhk} onChange={(e) => setBhk(e.target.value)} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900">
                          <option value="">Select BHK</option>
                          {['1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Calendar size={14} /> Age</label>
                        <select value={age} onChange={(e) => setAge(e.target.value)} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900">
                          <option value="">Select Age</option>
                          {['New Construction', '0-5 Years', '5-10 Years', '10-20 Years', '20+ Years'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Compass size={14} /> Facing</label>
                        <select value={facing} onChange={(e) => setFacing(e.target.value)} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900">
                          <option value="">Select Facing</option>
                          {['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Stack size={14} /> Floor</label>
                        <select value={floor} onChange={(e) => setFloor(e.target.value)} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900">
                          <option value="">Select Floor</option>
                          {['Ground', '1st', '2nd', '3rd', '4th', '5th+', 'Penthouse'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><CheckCircle size={14} /> Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900">
                          <option value="">Select Status</option>
                          {['Ready to Move', 'Under Construction', 'New Launch'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
                {step > 0 ? (
                  <button type="button" onClick={() => setStep(s => Math.max(s - 1, 0))} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg> Back
                  </button>
                ) : <div />}
                {step < 2 ? (
                  <button type="button" onClick={() => setStep(s => Math.min(s + 1, 2))} disabled={!canProceed()} className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
                    Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                ) : (
                  <PremiumButton onClick={handleValuate} disabled={loading} loading={loading} className="min-w-[180px]">
                    Get Valuation
                  </PremiumButton>
                )}
              </div>
            </GlassCard>

            {error && (
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl bg-red-50 px-5 py-3 text-sm text-red-700">
                {error}
              </motion.p>
            )}
          </div>

          {/* Results sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative w-12 h-12 mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                      <div className="absolute inset-0 rounded-full border-4 border-gray-900 border-t-transparent animate-spin" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Analyzing market data...</p>
                    <p className="text-xs text-gray-400 mt-1">Cross-referencing comparable sales</p>
                  </motion.div>
                ) : result && showResults ? (
                  <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                    <GlassCard glow className="!p-8 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Estimated Market Value</p>
                      <p className="mt-2 text-4xl font-black tracking-tight text-gray-900 md:text-5xl">
                        ₹{formatIndian(result.marketValue)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">₹{formatIndian(result.pricePerSqft)} / sq.ft</p>
                    </GlassCard>
                    <div className="grid grid-cols-2 gap-3">
                      <GlassCard compact>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rental Yield</p>
                        <p className="mt-1 text-lg font-bold text-gray-900">₹{formatIndian(result.rentalYield)} <span className="text-xs font-medium text-gray-400">/mo</span></p>
                      </GlassCard>
                      <GlassCard compact>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Circle Rate</p>
                        <p className="mt-1 text-lg font-bold text-gray-900">₹{formatIndian(result.circleRate)}</p>
                      </GlassCard>
                      <GlassCard compact className="col-span-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confidence</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{result.confidenceScore}<span className="text-sm font-medium text-gray-400">%</span></p>
                          </div>
                          <div className="h-10 w-32 self-end">
                            <div className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                              <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gray-900" initial={{ width: 0 }} animate={{ width: `${result.confidenceScore}%` }} transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.5 }} />
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </div>
                    <GlassCard compact>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Market Trend</p>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-bold', result.trend === 'up' ? 'text-emerald-600' : result.trend === 'down' ? 'text-red-600' : 'text-gray-600')}>
                            {result.trend === 'up' ? '↑' : result.trend === 'down' ? '↓' : '→'} {result.trendPercentage > 0 ? '+' : ''}{result.trendPercentage}%
                          </span>
                        </div>
                      </div>
                    </GlassCard>
                    {result.explanation && (
                      <GlassCard className="!p-5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">AI Analysis</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{result.explanation}</p>
                      </GlassCard>
                    )}
                    {result.comparableLocalities && result.comparableLocalities.length > 0 && (
                      <GlassCard className="!p-5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Comparable Localities</p>
                        <div className="flex flex-wrap gap-2">
                          {result.comparableLocalities.map((loc) => (
                            <span key={loc} className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{loc}</span>
                          ))}
                        </div>
                      </GlassCard>
                    )}
                    <div className="text-center pt-2">
                      <button type="button" onClick={() => { setResult(null); setShowResults(false); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg> New Valuation
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-xl mb-5 ring-1 ring-black/5">
                      <span className="text-3xl font-bold text-white">₹</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Your valuation appears here</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Fill in the form and click &quot;Get Valuation&quot; to see your AI-powered estimate.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section className="mt-28 mb-20">
          <div className="text-center mb-12">
            <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Process</span>
            <h2 className="font-serif text-3xl font-bold text-gray-900 md:text-4xl">How It Works</h2>
            <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">Three simple steps to your property valuation.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div key={step.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }}>
                <GlassCard interactive className="text-center !p-8 h-full">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white text-sm font-bold shadow-md">
                    {step.num}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* MARKET STATS */}
        <section className="mb-24">
          <GlassCard className="!p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-900/10 to-transparent" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {MARKET_STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl md:text-4xl font-black text-gray-900">
                    <AnimatedStatNumber value={stat.value} locale="en-IN" format={{ maximumFractionDigits: 0 }} countDuration={2000} />
                    <span className="text-gray-900">{stat.suffix}</span>
                  </p>
                  <p className="mt-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <div className="text-center mb-10">
            <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Support</span>
            <h2 className="font-serif text-3xl font-bold text-gray-900 md:text-4xl">Frequently Asked Questions</h2>
          </div>
          <FaqSection />
        </section>
      </div>
    </div>
  );
}
