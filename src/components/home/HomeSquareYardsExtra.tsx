import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  House,
  Buildings,
  ArrowRight,
  Warehouse,
} from '@phosphor-icons/react';

interface Service {
  label: string;
  desc: string;
  cta: string;
  icon: React.ElementType;
  href: string;
}

const SERVICES: Service[] = [
  {
    label: 'PG Buildings',
    desc: 'Income-generating rental assets',
    cta: 'View PG Buildings',
    icon: Buildings,
    href: '/properties?type=PG Buildings',
  },
  {
    label: 'Residential Rentals',
    desc: 'Apartments & houses with rental income',
    cta: 'Explore Residential',
    icon: House,
    href: '/properties?type=Residential Rental Income',
  },
  {
    label: 'Commercial Properties',
    desc: 'Offices, retail & warehouses',
    cta: 'Explore Commercial',
    icon: Warehouse,
    href: '/properties?type=Commercial Properties',
  },
];

export default function HomeSquareYardsExtra() {
  return (
    <>
      {/* Services with CTA buttons */}
      <section className="bg-[#F8F9FA] py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-8"
          >
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
              <span className="inline-block h-px w-8 bg-[#C9A84C]" />
              Our Services
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
              Everything You Need at One Place
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              From buying and selling to rental advisory — VJR Estate covers
              your entire property journey in Bangalore.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {SERVICES.map((service, i) => (
              <motion.div
                key={service.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.4, delay: (i % 5) * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="group flex flex-col rounded-2xl border border-[#EBEBEB] bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:shadow-[0_16px_40px_rgba(10,22,40,0.08)]"
              >
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A1628] text-[#C9A84C] transition-all duration-300 group-hover:bg-[#C9A84C] group-hover:text-[#0A1628]">
                  <service.icon size={22} weight="duotone" />
                </span>
                <h3 className="text-sm font-bold text-[#0A1628]">{service.label}</h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-500">{service.desc}</p>
                <Link
                  to={service.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#C9A84C] transition-colors hover:text-[#0A1628]"
                >
                  {service.cta}
                  <ArrowRight size={12} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


    </>
  );
}
