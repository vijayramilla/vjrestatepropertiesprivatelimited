import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import HomeListingsSection from '../components/home/HomeListingsSection';
import HomePropertyGrid from '../components/home/HomePropertyGrid';
import HomeSearchBar from '../components/home/HomeSearchBar';
import HomeCategoryGrid from '../components/home/HomeCategoryGrid';
import HomeHowItWorks from '../components/home/HomeHowItWorks';
import HomeContactCta from '../components/home/HomeContactCta';
import VJRAIButton from '../components/ai/VJRAIButton';

/**
 * Editorial display font (loaded in index.html) — used for the refined
 * italic accent lines throughout the page.
 */
const SERIF = "'Instrument Serif', Georgia, serif";

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=2200&auto=format&fit=crop&q=80';

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Kicker({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-[11px] ${
          light ? 'text-[#E4C877]' : 'text-[#8a7438]'
        }`}
      >
        {children}
      </p>
  );
}

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-[#0A1628]">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Rental income property in Bengaluru"
            className="h-full w-full object-cover object-center"
            decoding="async"
          />
        </div>

        {/* Cinematic grade: keeps the photograph rich while text stays legible */}
        <div className="absolute inset-0 bg-[linear-gradient(96deg,rgba(6,13,24,0.97)_0%,rgba(10,22,40,0.86)_40%,rgba(10,22,40,0.38)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0A1628] to-transparent" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-10 pt-32 sm:px-8 md:px-12 lg:px-16 lg:pt-36">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeOut }}
          >
            <Kicker light>Bangalore&rsquo;s Rental Income Specialists</Kicker>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: easeOut }}
            className="mt-6 max-w-4xl font-display text-[42px] font-bold leading-[1.04] tracking-[-0.02em] text-white sm:text-6xl md:text-7xl"
          >
            Rental Income Properties
            <span
              className="mt-2 block text-[#E4C877] italic"
              style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.005em' }}
            >
              Let the rent do the rest.
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: easeOut }}
            className="mt-9 w-full max-w-4xl"
          >
            <HomeSearchBar />
          </motion.div>
        </div>
      </section>

      {/* ── Asset classes ────────────────────────────────────────────────── */}
      <HomeCategoryGrid />
      <HomePropertyGrid />
      <HomeListingsSection />
      <HomeHowItWorks />
      <HomeContactCta />

      <VJRAIButton userRole="public" />
    </div>
  );
}
