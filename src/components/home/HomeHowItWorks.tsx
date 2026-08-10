import { motion } from 'framer-motion';
import {
  ClipboardText,
  MagnifyingGlass,
  MapPin,
  Handshake,
  ArrowRight,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    icon: ClipboardText,
    step: '01',
    title: 'Share Your Requirement',
    desc: 'Tell us what you are looking for — budget, locality, and property type — in two minutes.',
  },
  {
    icon: MagnifyingGlass,
    step: '02',
    title: 'We Match & Verify',
    desc: 'Our experts shortlist verified properties that fit your needs, with legal checks done.',
  },
  {
    icon: MapPin,
    step: '03',
    title: 'Visit & Decide',
    desc: 'Book site visits at your convenience and compare options side by side.',
  },
  {
    icon: Handshake,
    step: '04',
    title: 'Deal & Documents',
    desc: 'We guide you through negotiation, paperwork, and a smooth handover.',
  },
];

export default function HomeHowItWorks() {
  return (
    <section className="bg-[#F8F9FA] py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10 text-center"
        >
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
            <span className="inline-block h-px w-8 bg-[#C9A84C]" />
            Simple & Transparent
            <span className="inline-block h-px w-8 bg-[#C9A84C]" />
          </p>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
            How VJR Estate Works
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500">
            A hassle-free journey from your first search to the final handover — guided by
            Bangalore property experts at every step.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent lg:block" />
          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative flex flex-col items-center rounded-2xl border border-[#EBEBEB] bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:shadow-[0_16px_40px_rgba(10,22,40,0.08)]"
            >
              <span className="absolute left-4 top-4 text-[11px] font-bold tracking-[0.2em] text-gray-300">
                {step.step}
              </span>
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A1628] text-[#C9A84C] shadow-[0_8px_24px_rgba(10,22,40,0.25)]">
                <step.icon size={26} weight="duotone" />
              </span>
              <h3 className="text-sm font-bold text-[#0A1628]">{step.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.4 }}
          className="mt-10 text-center"
        >
          <Link
            to="/submit-requirement"
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-8 text-sm font-bold text-[#0A1628] shadow-lg shadow-[#C9A84C]/25 transition-all hover:-translate-y-0.5 hover:bg-[#E8C76A] hover:shadow-xl hover:shadow-[#C9A84C]/35"
          >
            Post Your Requirement
            <ArrowRight size={16} weight="bold" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
