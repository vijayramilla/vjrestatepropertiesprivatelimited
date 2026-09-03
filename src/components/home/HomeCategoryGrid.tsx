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
    desc: 'Rental income assets',
    icon: Buildings,
    to: '/properties?type=PG Buildings',
    gradient: 'from-[#0A1628] to-[#1E3852]',
  },
  {
    label: 'Residential',
    desc: 'Apartments & houses',
    icon: House,
    to: '/properties?type=Residential Rental Income',
    gradient: 'from-[#1E3852] to-[#2C5282]',
  },
  {
    label: 'Commercial',
    desc: 'Offices & retail spaces',
    icon: Warehouse,
    to: '/properties?type=Commercial Properties',
    gradient: 'from-[#14324B] to-[#0F4C3A]',
  },


];

export default function HomeCategoryGrid() {
  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-6 flex items-end justify-between gap-4"
        >
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
              <span className="inline-block h-px w-8 bg-[#C9A84C]" />
              Explore
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
              Find Your Property Type
            </h2>
          </div>
          <Link
            to="/properties"
            className="hidden shrink-0 items-center gap-1 border-b border-black pb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-black transition hover:text-[#C9A84C] hover:border-[#C9A84C] sm:inline-flex"
          >
            View all properties
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:gap-4">
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
                className={`group relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${cat.gradient} p-4 text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl lg:h-52`}
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5 transition-transform duration-300 group-hover:scale-150" />
                <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition-colors group-hover:bg-[#C9A84C] group-hover:text-[#0A1628]">
                  <cat.icon size={22} weight="duotone" />
                </span>
                <div className="relative z-10">
                  <strong className="block font-display text-[15px] font-bold leading-tight">
                    {cat.label}
                  </strong>
                  <span className="mt-1 block text-[11px] font-medium text-white/60">
                    {cat.desc}
                  </span>
                  <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9A84C] opacity-0 transition-all duration-300 group-hover:opacity-100">
                    Explore <ArrowRight size={11} weight="bold" />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-[#C9A84C] transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
