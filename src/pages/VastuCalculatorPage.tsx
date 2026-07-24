import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence, type Variants } from 'framer-motion';
import {
  Check,
  Compass,
  Eye,
  Globe,
  House,
  Plus,
  ShieldCheck,
  Sparkle,
  Sun,
  Timer,
  Upload,
  Wind,
  X,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import VastuCompass3D from '@/components/vastu/VastuCompass3D';
import FileUploader from '@/components/ui/file-uploader';
import VastuScoreGauge from '@/components/vastu/VastuScoreGauge';
import { vastuZones, roomAnalyses, vastuFAQs } from '@/lib/vastuData';

const fontHeading = { fontFamily: "'Poppins', system-ui, sans-serif" };
const fontBody = { fontFamily: "'Inter', system-ui, sans-serif" };

const slideUp: Variants = {
  hidden: { opacity: 0, y: 56 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
};

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="block h-0.5 w-12 rounded-full bg-[#EA580C]" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#EA580C]" style={fontBody}>
        {children}
      </p>
    </div>
  );
}

function FadeInSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-8% 0px -8% 0px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={slideUp}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function DarkIconBox({ icon: IconComponent }: { icon: any }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EA580C]/10 shadow-sm">
      <IconComponent size={24} weight="duotone" className="text-[#EA580C]" />
    </div>
  );
}

const statusConfig = {
  compliant: { label: 'Compliant', color: 'text-emerald-600', bg: 'bg-emerald-100 border-emerald-300' },
  partial: { label: 'Needs Improvement', color: 'text-orange-600', bg: 'bg-orange-100 border-orange-300' },
  'needs-attention': { label: 'Needs Attention', color: 'text-red-600', bg: 'bg-red-100 border-red-300' },
};



export default function VastuCalculatorPage() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  return (
    <div className="bg-white text-gray-900 min-h-screen overflow-hidden">

      {/* ── HERO ── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-5 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EA580C]/5 via-transparent to-transparent pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-4xl"
        >
          <span className="inline-block rounded-full border border-[#EA580C]/20 bg-[#EA580C]/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#EA580C] shadow-sm">
            Vastu Calculator
          </span>
          <h1
            className="mt-8 text-gray-900"
            style={{
              ...fontHeading,
              fontSize: 'clamp(2.8rem, 8vw, 6rem)',
              lineHeight: 1.06,
              letterSpacing: '-0.04em',
              fontWeight: 700,
            }}
          >
            Verify Your Home's{' '}
            <span style={{ color: '#EA580C' }}>Vastu Compliance</span> Instantly
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-gray-500 sm:text-[16px]" style={fontBody}>
            Instant, expert-validated Vastu insights for your home through our sophisticated analysis system.
          </p>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mt-16 flex flex-wrap justify-center gap-8 sm:gap-14"
        >
          {[
            { stat: '4000+', label: 'Projects Analyzed' },
            { stat: '500+', label: 'Clients Served' },
            { stat: '6+', label: 'International Patents' },
          ].map((item) => (
            <div key={item.label} className="text-center px-6 py-4 rounded-xl bg-white border border-gray-100 shadow-sm">
            <p className="text-[1.75rem] font-bold text-[#EA580C] sm:text-[2rem]">{item.stat}</p>
            <p className="mt-1 text-[12px] text-gray-400">{item.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── FEATURES STRIP ── */}
      <FadeInSection className="border-y border-gray-100 bg-amber-50 py-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: ShieldCheck, label: 'Vastu Expert\nApproved' },
              { icon: House, label: 'Join 50,000+\nHappy Homeowners' },
              { icon: ShieldCheck, label: 'Secure\nUpload' },
              { icon: Timer, label: 'Results In\n60 seconds' },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-6 text-center shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EA580C]/10">
                  <f.icon size={20} weight="duotone" className="text-[#EA580C]" />
                </div>
                <span className="text-xs font-semibold text-gray-500 whitespace-pre-line leading-snug">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── UPLOAD SECTION ── */}
      <FadeInSection className="py-24 sm:py-36" id="upload">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
          <SectionLabel>Get Started</SectionLabel>
          <h2
            className="mt-3 text-gray-900"
            style={{
              ...fontHeading,
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              lineHeight: 1.12,
              letterSpacing: '-0.02em',
            }}
          >
            Upload Your Floor Plan & Get Instant Analysis
          </h2>
          <p className="mx-auto mt-3 mb-10 max-w-xl text-sm text-gray-500" style={fontBody}>
            Drop your floor plan below and our AI will analyze the Vastu compliance of every room.
          </p>
          <FileUploader />
        </div>
      </FadeInSection>

      {/* ── HOW IT WORKS ── */}
      <FadeInSection className="border-y border-gray-100 bg-orange-50 py-24 sm:py-36">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <SectionLabel>How It Works</SectionLabel>
            <h2
              className="mt-3 text-gray-900"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                fontWeight: 700,
              }}
            >
              Simple Steps to Verify Your Home's Vastu
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Upload, step: '01', title: 'Upload Floor Plan', desc: 'Upload your home\'s floor plan in JPG, PNG, or PDF. Our system supports all standard architectural drawings.' },
              { icon: Compass, step: '02', title: 'Set Orientation', desc: 'Set up your floor plan\'s directional orientation and center point for precise Vastu evaluation.' },
              { icon: Globe, step: '03', title: 'Get Results', desc: 'Receive a detailed report with Vastu compliance score, room analysis, and specific recommendations.' },
            ].map((s) => (
              <div key={s.step} className="text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm transition-shadow hover:shadow-md">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#EA580C]/10 text-[20px] font-bold text-[#EA580C] shadow-sm">
                  {s.step}
                </span>
                <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EA580C]/10">
                  <s.icon size={24} weight="duotone" className="text-[#EA580C]" />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-500" style={fontBody}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── KEY PRINCIPLES ── */}
      <FadeInSection className="py-24 sm:py-36">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <SectionLabel>Key Vastu Principles</SectionLabel>
            <h2
              className="mt-3 text-gray-900"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                fontWeight: 700,
              }}
            >
              Understanding the Fundamental Elements
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Compass, title: 'Direction Alignment', desc: 'Proper orientation of rooms based on cardinal directions for optimal energy flow.' },
              { icon: Sun, title: 'Natural Light & Ventilation', desc: 'Maximizing sunlight exposure through strategic window placement and layouts.' },
              { icon: House, title: 'Room Placement', desc: 'Strategic positioning of rooms according to their functions and energy requirements.' },
              { icon: Wind, title: 'Energy Zones', desc: 'Balancing the five elements through proper space allocation and design.' },
            ].map((p) => (
              <div key={p.title} className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm transition-all hover:shadow-md hover:border-[#EA580C]/30">
                <DarkIconBox icon={p.icon} />
                <h3 className="mt-5 text-[16px] font-semibold text-gray-900">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-500" style={fontBody}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── VASTU COMPASS ── */}
      <FadeInSection className="border-y border-gray-100 bg-orange-50 py-24 sm:py-36">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <SectionLabel>Vastu Compass</SectionLabel>
            <h2
              className="mt-3 text-gray-900"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                fontWeight: 700,
              }}
            >
              Interactive Zone Map
            </h2>
            <p className="mt-3 text-sm text-gray-500" style={fontBody}>
              Hover or click on a zone to see its Vastu details
            </p>
          </div>
          <div className="h-[400px] sm:h-[500px] flex justify-center">
            <VastuCompass3D />
          </div>
        </div>
      </FadeInSection>

      {/* ── ROOM ANALYSIS ── */}
      <FadeInSection className="py-24 sm:py-36">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <SectionLabel>Room Analysis</SectionLabel>
            <h2
              className="mt-3 text-gray-900"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                fontWeight: 700,
              }}
            >
              Room-by-Room Vastu Compliance
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {roomAnalyses.map((room) => {
              const status = statusConfig[room.status];
              return (
                <div
                  key={room.id}
                  className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-[#EA580C]/30"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-100">
                      <Eye size={20} weight="duotone" className="text-gray-500" />
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-gray-900">{room.name}</h3>
                  <p className="mt-1 text-xs text-gray-400">Ideal: {room.idealZone}</p>
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-500">Compliance</span>
                      <span className="font-semibold text-gray-900">{room.compliance}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${room.compliance}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: room.compliance >= 80 ? '#059669' : room.compliance >= 60 ? '#EA580C' : '#DC2626',
                        }}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-gray-500">{room.tip}</p>
                </div>
              );
            })}
          </div>
        </div>
      </FadeInSection>

      {/* ── SCORE OVERVIEW ── */}
      <FadeInSection className="border-y border-gray-100 bg-orange-50 py-24 sm:py-36">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <SectionLabel>Your Vastu Score</SectionLabel>
            <h2
              className="mt-3 text-gray-900"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                fontWeight: 700,
              }}
            >
              Overall Vastu Compliance
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-10 sm:gap-16">
            {[
              { score: 82, label: 'Overall Compliance' },
              { score: 78, label: 'Energy Flow' },
              { score: 88, label: 'Element Balance' },
              { score: 72, label: 'Room Placement' },
            ].map((g) => (
              <VastuScoreGauge key={g.label} score={g.score} label={g.label} />
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── ZONE REMEDIES ── */}
      <FadeInSection className="py-24 sm:py-36">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <SectionLabel>Vastu Tips</SectionLabel>
            <h2
              className="mt-3 text-gray-900"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                fontWeight: 700,
              }}
            >
              Zone-wise Remedies & Tips
            </h2>
          </div>
          <div className="space-y-3">
            {vastuZones.map((zone) => (
              <motion.details
                key={zone.id}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md [&[open]]:border-[#EA580C]/40 [&[open]]:shadow-lg"
              >
                <summary className="flex items-center gap-4 px-6 py-4">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: zone.color + '22' }}
                  >
                    <span className="text-xs font-bold" style={{ color: zone.color }}>{zone.direction}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-900">{zone.name}</span>
                    <span className="ml-2 text-xs text-gray-400">({zone.sanskrit})</span>
                  </div>
                  <span className="text-xs text-gray-400">{zone.element}</span>
                  <Plus size={16} className="shrink-0 text-gray-400 transition-transform group-open:rotate-45" />
                </summary>
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium text-green-400">Ideal For</p>
                      <ul className="space-y-1">
                        {zone.goodAspects.map((a) => (
                          <li key={a} className="flex items-center gap-2 text-xs text-gray-500">
                            <Check size={10} className="text-green-400" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-red-400">Avoid</p>
                      <ul className="space-y-1">
                        {zone.badAspects.map((a) => (
                          <li key={a} className="flex items-center gap-2 text-xs text-gray-500">
                            <X size={10} className="text-red-400" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <p className="mb-2 text-xs font-medium text-[#EA580C]">Remedies</p>
                    <ul className="space-y-1">
                      {zone.remedies.map((r) => (
                          <li key={r} className="flex items-center gap-2 text-xs text-gray-500">
                            <Sparkle size={10} className="text-[#EA580C]" />
                            {r}
                          </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.details>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── FAQ ── */}
      <FadeInSection className="border-y border-gray-100 bg-orange-50 py-24 sm:py-36">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <SectionLabel>FAQ</SectionLabel>
            <h2
              className="mt-3 text-gray-900"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                fontWeight: 700,
              }}
            >
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-3">
            {vastuFAQs.map((faq, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
              >
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-medium text-gray-900 pr-4">{faq.question}</span>
                  <Plus
                    size={16}
                    className={`shrink-0 text-gray-400 transition-transform duration-300 ${
                      expandedFAQ === i ? 'rotate-45' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {expandedFAQ === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                <div className="border-t border-gray-200 px-6 py-4">
                        <p className="text-sm leading-relaxed text-gray-500" style={fontBody}>{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── CTA ── */}
      <section className="relative py-32 sm:py-44 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#EA580C]/5 to-[#EA580C]/10 pointer-events-none" />
        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <SectionLabel>Get Started</SectionLabel>
            <h2
              className="mt-4 text-gray-900"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2.2rem, 5.5vw, 3.75rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                fontWeight: 700,
              }}
            >
              Ready to Check Your Home's Vastu?
            </h2>
            <p
               className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-gray-500 sm:text-[16px]"
              style={fontBody}
            >
              From a quick compliance check to a full Vastu consultation, our experts are here to help you create a harmonious living space.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                asChild
                className="h-auto rounded-xl bg-gradient-to-r from-[#EA580C] to-[#d97706] px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
              >
                <Link to="/contact">Get Expert Consultation</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
