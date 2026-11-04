import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Buildings,
  House,
  Warehouse,
  ArrowRight,
} from '@phosphor-icons/react';

interface Category {
  label: string;
  desc: string;
  icon: React.ElementType;
  to: string;
  gradient: string;
}

const CATEGORIES: Category[] = [
  {
    label: 'PG Buildings',
    desc: 'Managed accommodation buildings',
    icon: Buildings,
    to: '/properties?type=PG Buildings',
    gradient: 'from-[#0A1628] to-[#1E3852]',
  },
  {
    label: 'Residential',
    desc: 'Independent rental-yielding homes & buildings',
    icon: House,
    to: '/properties?type=Residential Rental Income',
    gradient: 'from-[#1E3852] to-[#2C5282]',
  },
  {
    label: 'Commercial',
    desc: 'Retail, office & hospital income assets',
    icon: Warehouse,
    to: '/properties?type=Commercial Properties',
    gradient: 'from-[#14324B] to-[#0F4C3A]',
  },
];

export default function HomeCategoryGrid() {
  return (
    <section className="bg-[#F8F7F3] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10 flex items-end justify-between gap-4 md:mb-14"
        >
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[#0A1628] md:text-4xl">
              Three ways to own rental income
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#687078] md:text-base">
              Every listing is a working income asset — selected for its tenants, its
              location, and the yield it can carry.
            </p>
          </div>
          <Link
            to="/properties"
            className="hidden shrink-0 items-center gap-1 border-b border-black pb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-black transition hover:text-[#C9A84C] hover:border-[#C9A84C] sm:inline-flex"
          >
            Explore all listings
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-5">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: (i % 6) * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Link
                to={cat.to}
                className={`group relative flex min-h-[230px] flex-col justify-between overflow-hidden rounded-sm bg-gradient-to-br ${cat.gradient} p-7 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl lg:min-h-[260px]`}
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5 transition-transform duration-300 group-hover:scale-150" />
                <span className="relative z-10 flex h-12 w-12 items-center justify-center border border-white/25 text-[#E4C877] transition-colors group-hover:border-[#C9A84C]">
                  <cat.icon size={22} weight="duotone" />
                </span>
                <div className="relative z-10">
                  <strong className="block font-display text-xl font-semibold leading-tight">
                    {cat.label}
                  </strong>
                  <span className="mt-2 block text-sm leading-relaxed text-white/70">
                    {cat.desc}
                  </span>
                  <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E4C877]">
                    Explore <ArrowRight size={11} weight="bold" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
