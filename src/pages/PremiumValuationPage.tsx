import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { setDefaultSiteMeta } from '@/lib/siteMeta';
import { SparklesCore } from '@/components/ui/sparkles';
import { AnimatedStatNumber } from '@/components/ui/animated-blur-number';
import GlassCard from '@/components/ui/glass-card';
import ValuationForm from '@/components/valuation/ValuationForm';
import FaqSection from '@/components/valuation/FaqSection';
import { getPropertyValuation, type ValuationInput, type ValuationResult } from '@/utils/aiValuation';

const STEPS = [
  {
    num: '01',
    title: 'Enter Property Details',
    desc: 'Select type, locality, size, age, and other key parameters. Our form guides you step-by-step.',
  },
  {
    num: '02',
    title: 'AI Market Analysis',
    desc: 'Our AI cross-references 30+ market signals including recent sales, circle rates, and locality trends across Bangalore.',
  },
  {
    num: '03',
    title: 'Get Your Valuation',
    desc: 'Receive a comprehensive report with market value, price per sq.ft, rental yield, and confidence score.',
  },
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

export default function PremiumValuationPage() {
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    document.title = 'AI Property Valuation | VJR Estate';
    return () => setDefaultSiteMeta();
  }, []);

  const handleValuate = useCallback(async (input: ValuationInput) => {
    setLoading(true);
    setError('');
    setResult(null);
    setShowResults(false);

    const data = await getPropertyValuation(input);

    if (!data) {
      setError('Could not get valuation. Please try again or check your API key.');
      setLoading(false);
      return;
    }

    setResult(data);
    setLoading(false);
    setTimeout(() => setShowResults(true), 100);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#fafafa] overflow-hidden">
      {/* Sparkles background */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20">
        <SparklesCore particleColor="#000000" particleDensity={20} minSize={0.5} maxSize={1.5} speed={2} />
      </div>

      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #000 0%, transparent 70%)' }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #000 0%, transparent 70%)' }}
          animate={{ x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 md:pt-32 lg:px-8">
        {/* === HERO === */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 text-center"
        >
          <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl">
            <span className="bg-gradient-to-r from-gray-900 via-gray-600 to-gray-900 bg-clip-text text-transparent">
              AI Property Valuation
            </span>
          </h1>
          <p className="mt-3 text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
            Get an instant, AI-powered market estimate for any property in Bangalore.
            Backed by real-time market data and comparable sales analysis.
          </p>
        </motion.div>

        {/* === FORM + RESULTS === */}
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
          <div className="lg:col-span-3">
            <ValuationForm onValuate={handleValuate} loading={loading} />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl bg-red-50 px-5 py-3 text-sm text-red-700 font-mono"
              >
                {error}
              </motion.p>
            )}
          </div>

          {/* Results sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <p className="text-sm font-medium text-gray-500">Analyzing market data...</p>
                    <p className="text-xs text-gray-400 mt-1">Cross-referencing comparable sales</p>
                  </motion.div>
                ) : result && showResults ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    {/* Main valuation */}
                    <GlassCard glow className="!p-6 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                        Estimated Market Value
                      </p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
                        <AnimatedStatNumber
                          value={result.marketValue}
                          locale="en-IN"
                          format={{ style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0 }}
                          countDuration={2000}
                        />
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        ₹{formatIndian(result.pricePerSqft)} / sq.ft
                      </p>
                    </GlassCard>

                    {/* Metric cards grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <GlassCard compact>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Rental Yield</p>
                        <p className="mt-1 text-lg font-bold text-gray-900">
                          <AnimatedStatNumber value={result.rentalYield} locale="en-IN" format={{ style: 'currency', currency: 'INR', maximumFractionDigits: 0 }} countDuration={1500} />
                          <span className="text-xs font-medium text-gray-400 ml-0.5">/mo</span>
                        </p>
                      </GlassCard>

                      <GlassCard compact>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Circle Rate</p>
                        <p className="mt-1 text-lg font-bold text-gray-900">
                          <AnimatedStatNumber value={result.circleRate} locale="en-IN" format={{ style: 'currency', currency: 'INR', maximumFractionDigits: 0 }} countDuration={1500} />
                        </p>
                      </GlassCard>

                      <GlassCard compact className="col-span-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Confidence</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">
                              <AnimatedStatNumber value={result.confidenceScore} locale="en-IN" format={{ maximumFractionDigits: 0 }} countDuration={1200} />
                              <span className="text-sm font-medium text-gray-400">%</span>
                            </p>
                          </div>
                          <div className="h-10 w-32 self-end">
                            <div className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                              <motion.div
                                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gray-600 to-gray-900"
                                initial={{ width: 0 }}
                                animate={{ width: `${result.confidenceScore}%` }}
                                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                              />
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </div>

                    {/* Trend indicator */}
                    <GlassCard compact>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Market Trend</p>
                        <div className="flex items-center gap-2">
                          <span className={result.trend === 'up' ? 'text-emerald-600' : result.trend === 'down' ? 'text-red-600' : 'text-gray-600'}>
                            {result.trend === 'up' ? '↑' : result.trend === 'down' ? '↓' : '→'}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {result.trendPercentage > 0 ? '+' : ''}{result.trendPercentage}%
                          </span>
                        </div>
                      </div>
                    </GlassCard>

                    {/* AI explanation */}
                    {result.explanation && (
                      <GlassCard>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">AI Analysis</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{result.explanation}</p>
                      </GlassCard>
                    )}

                    {/* Comparable localities */}
                    {result.comparableLocalities && result.comparableLocalities.length > 0 && (
                      <GlassCard>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Comparable Localities</p>
                        <div className="flex flex-wrap gap-2">
                          {result.comparableLocalities.map((loc) => (
                            <span key={loc} className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                              {loc}
                            </span>
                          ))}
                        </div>
                      </GlassCard>
                    )}

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setResult(null);
                          setShowResults(false);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        ← New Valuation
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-lg mb-4">
                      <span className="text-2xl font-bold text-white">₹</span>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Your valuation appears here</p>
                    <p className="text-xs text-gray-400 mt-1">Fill in the form and click "Get Valuation"</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* === HOW IT WORKS === */}
        <section className="mt-24 mb-16">
          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">How It Works</h2>
            <p className="mt-2 text-sm text-gray-500">Three simple steps to your property valuation</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <GlassCard interactive className="text-center !p-8">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white text-sm font-bold">
                    {step.num}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* === MARKET STATS === */}
        <section className="mb-16">
          <GlassCard className="!p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {MARKET_STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl md:text-3xl font-black text-gray-900">
                    <AnimatedStatNumber value={stat.value} locale="en-IN" format={{ maximumFractionDigits: 0 }} countDuration={2000} />
                    <span className="text-gray-900">{stat.suffix}</span>
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-gray-400 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        {/* === FAQ === */}
        <section className="mb-8">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">Frequently Asked Questions</h2>
          </div>
          <FaqSection />
        </section>
      </div>
    </div>
  );
}
