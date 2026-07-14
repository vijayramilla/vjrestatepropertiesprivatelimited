import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  TrendingUp,
  Calendar,
  PieChart,
  Sparkles,
  Sun,
  Moon,
  BarChart3,
  Table2,
  Repeat,
  Landmark,
  GitCompare,
} from 'lucide-react';
import { setDefaultSiteMeta } from '@/lib/siteMeta';
import { SparklesCore } from '@/components/ui/sparkles';
import { computeSnapshot, formatIndian, formatIndianFull, calcInflationAdjustedEMI } from '@/components/emi/calculations';
import TiltCard from '@/components/emi/TiltCard';
import AnimatedCounter from '@/components/emi/AnimatedCounter';
import ThreeDChart from '@/components/emi/ThreeDChart';
import { StackedBarChart, BalanceLineChart, PaymentComparisonChart } from '@/components/emi/Charts';
import PrepaymentPanel from '@/components/emi/PrepaymentPanel';
import TaxBenefits from '@/components/emi/TaxBenefits';
import ComparisonMode from '@/components/emi/ComparisonMode';
import ReportExport from '@/components/emi/ReportExport';
import VoiceInput from '@/components/emi/VoiceInput';

type Tab = 'charts' | 'table' | '3d' | 'prepayment' | 'tax' | 'compare';

export default function EmiCalculatorPage() {
  useEffect(() => {
    document.title = 'EMI Calculator | VJR Estate';
    return () => setDefaultSiteMeta();
  }, []);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [amount, setAmount] = useState(5000000);
  const [rate, setRate] = useState(9.5);
  const [tenure, setTenure] = useState(15);
  const [activeTab, setActiveTab] = useState<Tab>('charts');

  const tenureMonths = tenure * 12;
  const snapshot = useMemo(() => computeSnapshot(amount, rate, tenureMonths), [amount, rate, tenureMonths]);
  const inflationData = useMemo(() => calcInflationAdjustedEMI(snapshot.emi, tenure, 6), [snapshot.emi, tenure]);
  const bgClass = isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#fafafa] text-black';
  const cardClass = isDark
    ? 'border-white/10 bg-white/5 backdrop-blur-xl'
    : 'border-gray-200/80 bg-white/80 backdrop-blur-xl';
  const textMuted = isDark ? 'text-white/50' : 'text-gray-500';
  const textAccent = isDark ? 'text-white/70' : 'text-gray-500';

  const handleAmountInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    setAmount(v ? Number(v) : 0);
  }, []);

  const handleRateInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setRate(Math.min(24, Math.max(1, v)));
  }, []);

  const handleTenureInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v)) setTenure(Math.min(30, Math.max(1, v)));
  }, []);

  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: 'charts', label: 'Charts', icon: BarChart3 },
    { id: 'table', label: 'Schedule', icon: Table2 },
    { id: '3d', label: '3D View', icon: Repeat },
    { id: 'prepayment', label: 'Prepay', icon: TrendingUp },
    { id: 'tax', label: 'Tax', icon: Landmark },
    { id: 'compare', label: 'Compare', icon: GitCompare },
  ];

  const hasResults = amount > 0 && tenureMonths > 0;

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${bgClass}`}>
      <div className="pointer-events-none fixed inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '40px 40px' }} aria-hidden />
      <button
        onClick={() => setIsDark(!isDark)}
        className={`fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
          isDark ? 'border-white/10 bg-white/5 text-white/70' : 'border-gray-200 bg-white text-gray-600'
        }`}
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <div className="pointer-events-none absolute inset-0 z-0 opacity-30">
        <SparklesCore
          particleColor={isDark ? '#ffffff' : '#000000'}
          particleDensity={25}
          minSize={0.5}
          maxSize={1.5}
          speed={2}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,0,0,0.03),transparent)]" />

      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #000 0%, transparent 70%)' }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #d97706 0%, transparent 70%)' }}
          animate={{ x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-12 lg:py-16">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-[600px] opacity-[0.07]" aria-hidden>
            <div className="h-full w-full rounded-full bg-gradient-to-r from-transparent via-gray-900 to-transparent blur-3xl" />
          </div>
          <motion.div
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] md:h-16 md:w-16 ${
              isDark ? 'bg-gradient-to-br from-white to-gray-300' : 'bg-gradient-to-br from-black to-gray-800'
            }`}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Calculator size={26} className={isDark ? 'text-black' : 'text-white'} />
          </motion.div>

          <h1 className={`font-serif text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl ${
            isDark ? 'text-white' : 'text-black'
          }`}>
            <span className={`bg-gradient-to-r ${isDark ? 'from-white via-gray-300 to-white' : 'from-black via-gray-700 to-black'} bg-clip-text text-transparent`}>
              EMI Calculator
            </span>
          </h1>
          <p className={`mt-2 text-sm ${textMuted} md:text-base`}>
            Advanced loan planning with{' '}
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-black'}`}>real-time amortization</span>
          </p>
          <div className={`mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r ${isDark ? 'from-white via-gray-500 to-white' : 'from-black via-gray-500 to-black'}`}
            style={{ transform: 'scaleX(1)' }}
          />

        <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
          <div className="space-y-5 lg:col-span-3">
            <TiltCard intensity={6}>
              <div className={`rounded-2xl border p-5 shadow-sm md:p-7 ${cardClass} relative before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-b before:from-gray-900/10 before:via-transparent before:to-transparent before:pointer-events-none`}>
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isDark ? 'bg-white/10' : 'bg-black'}`}>
                      <Calculator size={12} className={isDark ? 'text-white' : 'text-white'} />
                    </div>
                    <h2 className={`text-xs font-semibold uppercase tracking-[0.15em] ${textAccent}`}>Loan Details</h2>
                  </div>
                  <VoiceInput onResult={(v) => setAmount(v)} />
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${textAccent}`}>
                        <Calculator size={11} /> Loan Amount
                      </label>
                      <span className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>{formatIndian(amount)}</span>
                    </div>
                    <input type="range" min={100000} max={100000000} step={100000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="premium-slider w-full" />
                    <div className={`mt-1 flex justify-between text-[10px] ${textMuted}`}><span>₹1 L</span><span>₹10 Cr</span></div>
                    <input type="text" value={amount || ''} onChange={handleAmountInput} placeholder="Enter loan amount"
                      className={`mt-2 w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-300 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] ${
                        isDark ? 'border-white/10 bg-white/5 text-white focus:border-white/30 focus:bg-white/10' : 'border-gray-200 bg-gray-50/80 text-gray-700 focus:border-black/60 focus:bg-white'
                      }`} />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${textAccent}`}>
                        <TrendingUp size={11} /> Interest Rate
                      </label>
                      <span className={`flex items-baseline gap-0.5 text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>
                        {rate}<span className={`text-sm font-medium ${textMuted}`}>%</span>
                      </span>
                    </div>
                    <input type="range" min={1} max={24} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="premium-slider w-full" />
                    <div className={`mt-1 flex justify-between text-[10px] ${textMuted}`}><span>1%</span><span>24%</span></div>
                    <input type="text" value={rate} onChange={handleRateInput} placeholder="Rate %"
                      className={`mt-2 w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-300 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] ${
                        isDark ? 'border-white/10 bg-white/5 text-white focus:border-white/30 focus:bg-white/10' : 'border-gray-200 bg-gray-50/80 text-gray-700 focus:border-black/60 focus:bg-white'
                      }`} />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${textAccent}`}>
                        <Calendar size={11} /> Tenure
                      </label>
                      <span className={`flex items-baseline gap-0.5 text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>
                        {tenure}<span className={`text-sm font-medium ${textMuted}`}>{tenure === 1 ? ' Year' : ' Years'}</span>
                      </span>
                    </div>
                    <input type="range" min={1} max={30} step={1} value={tenure} onChange={(e) => setTenure(Number(e.target.value))} className="premium-slider w-full" />
                    <div className={`mt-1 flex justify-between text-[10px] ${textMuted}`}><span>1 Year</span><span>30 Years</span></div>
                    <input type="text" value={tenure} onChange={handleTenureInput} placeholder="Years"
                      className={`mt-2 w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-300 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] ${
                        isDark ? 'border-white/10 bg-white/5 text-white focus:border-white/30 focus:bg-white/10' : 'border-gray-200 bg-gray-50/80 text-gray-700 focus:border-black/60 focus:bg-white'
                      }`} />
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* Tabs */}
            {hasResults && (
              <div className={`rounded-2xl border p-4 shadow-sm ${cardClass} relative before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-b before:from-gray-900/10 before:via-transparent before:to-transparent before:pointer-events-none`}>
                <div className="mb-3 flex flex-wrap gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                        activeTab === tab.id
                          ? isDark ? 'bg-white text-black' : 'bg-black text-white'
                          : isDark ? 'text-white/50 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <tab.icon size={12} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                    {activeTab === 'charts' && (
                      <div className="space-y-4">
                        <div>
                          <p className={`mb-2 text-xs font-medium ${textMuted}`}>Principal vs Interest (Yearly)</p>
                          <StackedBarChart amortization={snapshot.amortization} isDark={isDark} />
                        </div>
                        <div>
                          <p className={`mb-2 text-xs font-medium ${textMuted}`}>Loan Balance Over Time</p>
                          <BalanceLineChart amortization={snapshot.amortization} isDark={isDark} />
                        </div>
                        <div>
                          <p className={`mb-2 text-xs font-medium ${textMuted}`}>Principal vs Interest Trend</p>
                          <PaymentComparisonChart amortization={snapshot.amortization} isDark={isDark} />
                        </div>
                      </div>
                    )}
                    {activeTab === 'table' && (
                      <div className="max-h-80 overflow-y-auto scrollbar-thin">
                        <div className="mb-2 flex items-center justify-between">
                          <p className={`text-xs font-medium ${textMuted}`}>Yearly Amortization Schedule</p>
                          <ReportExport
                            amortization={snapshot.amortization}
                            amount={amount}
                            rate={rate}
                            tenure={tenure}
                            emi={snapshot.emi}
                            totalInterest={snapshot.totalInterest}
                            totalPayment={snapshot.totalPayment}
                          />
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={`border-b text-[11px] ${isDark ? 'border-white/10 text-white/40' : 'border-gray-200/60 text-gray-400'}`}>
                              <th className="py-2 pr-2 text-left font-medium">Year</th>
                              <th className="py-2 px-2 text-right font-medium">Principal</th>
                              <th className="py-2 px-2 text-right font-medium">Interest</th>
                              <th className="py-2 pl-2 text-right font-medium">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snapshot.amortization.map((row, i) => (
                              <motion.tr
                                key={row.year} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.02 }}
                                className={`border-b transition-colors ${
                                  isDark ? 'border-white/5 hover:bg-white/[0.03]' : 'border-gray-100/60 hover:bg-black/[0.02]'
                                }`}
                              >
                                <td className={`py-2.5 pr-2 font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{row.year}</td>
                                <td className={`py-2.5 px-2 text-right font-medium ${isDark ? 'text-white/80' : 'text-gray-800'}`}>{formatIndianFull(row.principalPaid)}</td>
                                <td className={`py-2.5 px-2 text-right ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{formatIndianFull(row.interestPaid)}</td>
                                <td className={`py-2.5 pl-2 text-right ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{formatIndianFull(row.balance)}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {activeTab === '3d' && (
                      <ThreeDChart data={snapshot.amortization} isDark={isDark} />
                    )}
                    {activeTab === 'prepayment' && (
                      <PrepaymentPanel loan={{ amount, rate, tenure }} tenureMonths={tenureMonths} />
                    )}
                    {activeTab === 'tax' && (
                      <TaxBenefits loan={{ amount, rate, tenure }} tenureMonths={tenureMonths} />
                    )}
                    {activeTab === 'compare' && (
                      <ComparisonMode />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2">
            <div className="sticky top-20 space-y-5">
              {hasResults ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <TiltCard intensity={8}>
                    <div className={`relative overflow-hidden rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.2)] md:p-7 ${
                      isDark ? 'bg-gradient-to-br from-white/10 via-white/5 to-white/10' : 'bg-gradient-to-br from-black via-gray-900 to-black'
                    }`}>
                      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-50" aria-hidden />
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.1),transparent)]" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
                      <div className="relative z-10 text-center">
                        <p className="mb-1 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                          <Sparkles size={10} className="text-amber-400" />
                          Monthly EMI
                        </p>
                        <p className={`mt-1 text-3xl font-black tracking-tight md:text-4xl lg:text-5xl ${isDark ? 'text-white' : 'text-white'}`}>
                          <AnimatedCounter value={snapshot.emi} prefix="₹" duration={1} />
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          for {tenureMonths} months @ {rate}% p.a.
                        </p>
                      </div>
                    </div>
                  </TiltCard>

                  <div className="grid gap-3">
                    {[
                      { label: 'Principal Amount', value: amount, color: 'black' },
                      { label: 'Total Interest', value: snapshot.totalInterest, color: 'amber' },
                      { label: 'Total Payment', value: snapshot.totalPayment, color: 'black' },
                    ].map((item, i) => (
                      <TiltCard key={item.label} intensity={5} delay={i * 0.05}>
                        <div className={`rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${cardClass}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${textMuted}`}>{item.label}</span>
                            <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                              <AnimatedCounter value={item.value} prefix="₹" duration={1.2} />
                            </span>
                          </div>
                        </div>
                      </TiltCard>
                    ))}
                  </div>

                  <TiltCard intensity={6}>
                    <div className={`rounded-xl border p-5 shadow-sm ${cardClass}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600">
                          <PieChart size={12} className="text-white" />
                        </div>
                        <h3 className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${textMuted}`}>Breakdown</h3>
                      </div>

                      <div className="relative mx-auto mb-4 flex h-28 w-28 items-center justify-center md:h-32 md:w-32">
                        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke={isDark ? '#ffffff10' : '#f3f4f6'} strokeWidth="3" />
                          <motion.circle
                            cx="18" cy="18" r="15.5" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={`${snapshot.principalPct} ${100 - snapshot.principalPct}`}
                            strokeDashoffset="0"
                            initial={{ strokeDasharray: '0 100' }}
                            animate={{ strokeDasharray: `${snapshot.principalPct} ${100 - snapshot.principalPct}` }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          />
                          <motion.circle
                            cx="18" cy="18" r="15.5" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={`${snapshot.interestPct} ${100 - snapshot.interestPct}`}
                            strokeDashoffset={`-${snapshot.principalPct}`}
                            initial={{ strokeDasharray: '0 100', strokeDashoffset: '0' }}
                            animate={{ strokeDasharray: `${snapshot.interestPct} ${100 - snapshot.interestPct}`, strokeDashoffset: `-${snapshot.principalPct}` }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-black'}`}>
                            {Math.round(snapshot.principalPct)}%
                          </span>
                          <span className={`text-[9px] font-medium uppercase tracking-wider ${textMuted}`}>Principal</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                          <span className="h-2.5 w-2.5 rounded-full bg-black" />
                          <div>
                            <p className={`text-[10px] font-medium ${textMuted}`}>Principal</p>
                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>{snapshot.principalPct.toFixed(0)}%</p>
                          </div>
                        </div>
                        <div className="flex flex-1 items-center gap-2 rounded-lg bg-amber-500/[0.08] px-3 py-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                          <div>
                            <p className="text-[10px] font-medium text-amber-600/80">Interest</p>
                            <p className="text-sm font-bold text-amber-600">{snapshot.interestPct.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TiltCard>

                  {/* Inflation-adjusted */}
                  <TiltCard intensity={4}>
                    <div className={`rounded-xl border p-4 shadow-sm ${cardClass}`}>
                      <p className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] ${textMuted}`}>
                        Inflation-Adjusted EMI @ 6% p.a.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${textMuted}`}>Year 1 (nominal)</span>
                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>{formatIndianFull(inflationData[0]?.nominal ?? 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${textMuted}`}>Year {Math.min(tenure, 10)} real value</span>
                        <span className={`text-sm font-bold text-amber-600`}>{formatIndianFull(inflationData[Math.min(tenure, 10) - 1]?.real ?? 0)}</span>
                      </div>
                      {tenure > 5 && (
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${textMuted}`}>Year {tenure} real value</span>
                          <span className={`text-sm font-bold ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                            {formatIndianFull(inflationData[inflationData.length - 1]?.real ?? 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </TiltCard>
                </motion.div>
              ) : (
                <TiltCard intensity={6}>
                  <div className={`rounded-2xl border p-8 text-center shadow-sm ${cardClass}`}>
                    <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                      <Calculator size={36} className={`mx-auto ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                    </motion.div>
                    <p className={`mt-3 text-sm ${textMuted}`}>Adjust the sliders to see your EMI breakdown</p>
                  </div>
                </TiltCard>
              )}

              <p className={`text-[10px] leading-relaxed ${textMuted} px-1`}>
                *Calculations are for reference only. Actual EMI may vary based on lender terms, processing fees, and applicable interest rate changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
