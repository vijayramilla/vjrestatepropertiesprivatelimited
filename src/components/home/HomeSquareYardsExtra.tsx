import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  House,
  SignOut,
  Buildings,
  MapTrifold,
  ChartBar,
  ArrowRight,
  Warehouse,
  Tree,
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
    label: 'Buy Property',
    desc: 'Premium PG, residential & commercial assets',
    cta: 'Explore Properties',
    icon: House,
    href: '/properties',
  },
  {
    label: 'Sell / List Property',
    desc: 'List free and reach serious buyers fast',
    cta: 'List For Free',
    icon: SignOut,
    href: '/list-property',
  },
  {
    label: 'PG Buildings',
    desc: 'Income-generating rental assets',
    cta: 'View PG Buildings',
    icon: Buildings,
    href: '/properties?type=PG Buildings',
  },
  {
    label: 'Land Map',
    desc: 'Explore plots on the interactive Bangalore map',
    cta: 'Open Map',
    icon: MapTrifold,
    href: '/map',
  },
  {
    label: 'Property Valuation',
    desc: 'AI-powered premium valuation report',
    cta: 'Valuate Now',
    icon: ChartBar,
    href: '/property-valuation',
  },
];

const propertyTypes = [
  {
    label: 'PG Buildings',
    desc: 'for Investment in Bangalore',
    icon: <Buildings size={28} weight="duotone" />,
    slug: '/properties?type=PG Buildings',
  },
  {
    label: 'Apartments',
    desc: 'for Sale in Bangalore',
    icon: <House size={28} weight="duotone" />,
    slug: '/properties?type=Residential Rental Income',
  },
  {
    label: 'Commercial Spaces',
    desc: 'for Sale in Bangalore',
    icon: <Warehouse size={28} weight="duotone" />,
    slug: '/properties?type=Commercial Properties',
  },
  {
    label: 'Plots / Land',
    desc: 'for Sale in Bangalore',
    icon: <Tree size={28} weight="duotone" />,
    slug: '/properties?type=Residential Plot,Commercial Plot,JD Land',
  },
  {
    label: 'Villas',
    desc: 'for Sale in Bangalore',
    icon: <House size={28} weight="duotone" />,
    slug: '/properties',
  },
];

const gradients = [
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
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
              From buying and selling to valuation and the Bangalore land map — VJR Estate covers
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

      {/* Discover More tiles */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
                <span className="inline-block h-px w-8 bg-[#C9A84C]" />
                Discover More
              </p>
              <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
                Real Estate Properties in Bangalore
              </h2>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
            {propertyTypes.map((pt, i) => (
              <Link
                key={pt.label}
                to={pt.slug}
                className={`group relative flex h-44 w-52 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[i]} p-5 text-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}
              >
                <span className="absolute right-3 top-3 text-white/20 transition-all duration-300 group-hover:scale-110 group-hover:text-white/30">
                  {pt.icon}
                </span>
                <div className="relative z-10">
                  <strong className="block text-base font-bold">{pt.label}</strong>
                  <span className="mt-1 block text-xs font-medium text-white/70">{pt.desc}</span>
                </div>
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
