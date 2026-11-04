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
    title: 'Share your income goal',
    desc: 'Budget, locality, target monthly rent — tell us what you want the asset to earn, in two minutes.',
  },
  {
    icon: MagnifyingGlass,
    step: '02',
    title: 'We curate & verify',
    desc: 'We shortlist PG buildings and rental assets that fit your goal, with legal checks done upfront.',
  },
  {
    icon: MapPin,
    step: '03',
    title: 'Visit with numbers in hand',
    desc: 'Tour the property with its occupancy, rent roll and running costs on the table.',
  },
  {
    icon: Handshake,
    step: '04',
    title: 'Acquire with support',
    desc: 'Negotiation, documentation and registration — guided end to end.',
  },
];

export default function HomeHowItWorks() {
  return (
    <section className="bg-[#F8F7F3] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10 text-center"
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[#0A1628] md:text-4xl">
            How You Buy Your First Income Asset
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500">
            A disciplined path from your first conversation to ownership — guided by
            Bengaluru rental-property specialists at every step.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative flex flex-col items-start border-t border-[#C9A84C]/60 px-1 pb-4 pt-8 text-left"
            >
              <span className="absolute right-0 top-8 font-display text-2xl font-semibold text-[#C9A84C]/50">
                {step.step}
              </span>
              <span className="mb-6 flex h-12 w-12 items-center justify-center border border-[#DCD5C4] text-[#A98C3B]">
                <step.icon size={26} weight="duotone" />
              </span>
              <h3 className="font-display text-lg font-semibold text-[#0A1628]">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">{step.desc}</p>
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
