import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HandCoins,
  ChartBar,
  Scales,
  TrendUp,
  SignOut,
  SuitcaseSimple,
  House,
  Building,
  Key,
  ArrowsLeftRight,
  Buildings,
  Warehouse,
  Tree,
} from '@phosphor-icons/react';

interface Service {
  label: string;
  icon: React.ReactNode;
  href: string;
}

const services: Record<string, Service[]> = {
  buyers: [
    { label: 'Home Loan', icon: <HandCoins size={24} weight="duotone" />, href: '/properties' },
    { label: 'Property Valuation', icon: <ChartBar size={24} weight="duotone" />, href: '/map' },
    { label: 'Legal Clarity Check', icon: <Scales size={24} weight="duotone" />, href: '/map' },
    { label: 'Rental Income Analysis', icon: <TrendUp size={24} weight="duotone" />, href: '/map' },
    { label: 'Sell', icon: <SignOut size={24} weight="duotone" />, href: '/properties' },
    { label: 'Investment Advisory', icon: <SuitcaseSimple size={24} weight="duotone" />, href: '/map' },
  ],
  tenants: [
    { label: 'Rental Listings', icon: <House size={24} weight="duotone" />, href: '/properties' },
    { label: 'PG Buildings', icon: <Building size={24} weight="duotone" />, href: '/properties' },
    { label: 'Property Management', icon: <Key size={24} weight="duotone" />, href: '/map' },
  ],
};

const tabs = [
  { key: 'buyers', label: 'For Buyers / Owners' },
  { key: 'tenants', label: 'For Tenants' },
];

const propertyTypes = [
  { label: 'PG Buildings', desc: 'for Investment in Bangalore', icon: <Buildings size={28} weight="duotone" />, slug: '/properties' },
  { label: 'Apartments', desc: 'for Sale in Bangalore', icon: <Building size={28} weight="duotone" />, slug: '/properties' },
  { label: 'Commercial Spaces', desc: 'for Sale in Bangalore', icon: <Warehouse size={28} weight="duotone" />, slug: '/map' },
  { label: 'Plots / Land', desc: 'for Sale in Bangalore', icon: <Tree size={28} weight="duotone" />, slug: '/map' },
  { label: 'Villas', desc: 'for Sale in Bangalore', icon: <House size={28} weight="duotone" />, slug: '/properties' },
];

const gradients = [
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

export default function HomeSquareYardsExtra() {
  const [activeTab, setActiveTab] = useState('buyers');

  const currentServices = services[activeTab] || [];

  return (
    <>
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              Everything you Need at One Place
            </h2>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                  t.key === activeTab
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-400 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {currentServices.map((s) => (
              <Link
                key={s.label}
                to={s.href}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-700 transition-colors group-hover:bg-gray-100 group-hover:text-gray-900">
                  {s.icon}
                </span>
                <span className="text-xs font-semibold leading-tight text-gray-700 group-hover:text-gray-900">
                  {s.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              Discover More Real Estate Properties in Bangalore
            </h2>
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
