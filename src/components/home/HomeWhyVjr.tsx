import { motion } from 'framer-motion';
import { TrendUp, ShieldCheck, Users, Buildings, ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { siteContact } from '@/data/siteContact';

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const PILLARS = [
  {
    icon: TrendUp,
    title: 'Income-First Curation',
    desc: 'Every listing is presented with its rent roll and occupancy — not just photos.',
  },
  {
    icon: ShieldCheck,
    title: 'Clear Documentation Trail',
    desc: 'Complete documents shared before you decide, so you can review at your own pace.',
  },
  {
    icon: Users,
    title: 'Dedicated Advisor',
    desc: 'One specialist from shortlist to registration — no call-centre runarounds.',
  },
  {
    icon: Buildings,
    title: 'Off-Market Access',
    desc: 'PG buildings and income assets that never reach public portals.',
  },
];

export default function HomeWhyVjr() {
  return (
    <section className="relative overflow-hidden bg-[#0A1628] py-12 md:py-20">
      {/* Gold radial glow, boardroom-premium */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[720px] -translate-x-1/2 rounded-full bg-[#C9A84C]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-10 text-center"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
            The VJR Estate Standard
          </p>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Why Serious Investors Choose VJR Estate
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/55">
            The discipline of an institutional desk, applied to Bangalore&rsquo;s rental
            income property market.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:bg-white/[0.07]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A84C]/15 text-[#C9A84C] transition-colors duration-300 group-hover:bg-[#C9A84C] group-hover:text-[#0A1628]">
                <pillar.icon size={24} weight="duotone" />
              </span>
              <h3 className="mt-4 text-sm font-bold text-white">{pillar.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/55">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.45, delay: 0.2, ease: EASE }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            to="/submit-requirement"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-8 text-sm font-bold text-[#0A1628] shadow-lg shadow-[#C9A84C]/25 transition-all hover:-translate-y-0.5 hover:bg-[#E8C76A] hover:shadow-xl hover:shadow-[#C9A84C]/35"
          >
            Book a Free Consultation
            <ArrowRight size={16} weight="bold" />
          </Link>
          <a
            href={siteContact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/20 px-8 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:border-[#C9A84C] hover:text-[#C9A84C]"
          >
            Talk to an Advisor
          </a>
        </motion.div>
      </div>
    </section>
  );
}
