import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion';
import HomeListingsSection from '../components/home/HomeListingsSection';
import HomePgCoverflow from '../components/home/HomePgCoverflow';
// Temporarily disabled — restore along with the <HarmonicWave /> usage below.
// import HarmonicWave from '../components/ui/harmonic-wave';
import HomeSearchBar from '../components/home/HomeSearchBar';
import HomeListPropertyCta from '../components/home/HomeListPropertyCta';
import HomeCategoryGrid from '../components/home/HomeCategoryGrid';
import HomeHowItWorks from '../components/home/HomeHowItWorks';
import HomeAboutVjr from '../components/home/HomeAboutVjr';
import HomeWhyVjr from '../components/home/HomeWhyVjr';
import HomeTestimonials from '../components/home/HomeTestimonials';
import HomeInsights from '../components/home/HomeInsights';
import VJRAIButton from '../components/ai/VJRAIButton';
import HomeContactCta from '../components/home/HomeContactCta';

// Hero photo — also preloaded from index.html on the home route so the LCP
// fetch starts while the JS bundle is still downloading. Keep the URLs in
// sync with the preload script there.
const HERO_BASE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00';
const HERO_SRC = `${HERO_BASE}?w=1600&auto=format&fit=crop&q=75`;
const HERO_SRCSET = [
  `${HERO_BASE}?w=640&auto=format&fit=crop&q=70 640w`,
  `${HERO_BASE}?w=1080&auto=format&fit=crop&q=70 1080w`,
  `${HERO_BASE}?w=1600&auto=format&fit=crop&q=75 1600w`,
  `${HERO_BASE}?w=2200&auto=format&fit=crop&q=75 2200w`,
].join(', ');

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  // Scroll-linked gold progress hairline — transform-only, compositor-safe.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <div className="bg-[#F8F7F3]">
      {/* Gold reading-progress bar pinned to the very top */}
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[70] h-[2.5px] origin-left bg-gradient-to-r from-[#96782A] via-[#E4C877] to-[#C9A84C]"
        style={{ scaleX: progress }}
      />
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[min(900px,100svh)] w-full flex-col overflow-hidden bg-[#0A1628]">
        <div className="absolute inset-0 overflow-hidden">
          {/* Slow cinematic settle on load (Ken Burns) — skipped for
              reduced-motion users. */}
          <motion.img
            src={HERO_SRC}
            srcSet={HERO_SRCSET}
            sizes="100vw"
            alt="Rental income property in Bengaluru"
            className="h-full w-full object-cover object-center"
            decoding="async"
            loading="eager"
            {...({ fetchpriority: 'high' } as object)}
            initial={reduceMotion ? false : { scale: 1.14 }}
            animate={reduceMotion ? undefined : { scale: 1 }}
            transition={{ duration: 9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        {/* Cinematic grade: keeps the photograph rich while text stays legible */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,13,24,0.94)_0%,rgba(10,22,40,0.78)_48%,rgba(10,22,40,0.25)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0A1628] to-transparent" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-16 pt-32 sm:px-8 md:pb-20 lg:px-8 lg:pt-40">

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: easeOut }}
            className="mt-7 max-w-4xl font-display text-[42px] font-medium leading-[1.05] tracking-[-0.035em] text-white sm:text-6xl md:text-[76px]"
          >
            Rental Income Properties
            <span
              className="mt-2 block text-[#E4C877]"
            >
              Let the rent do the rest.
            </span>
          </motion.h1>

          <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
            Discover carefully selected PG buildings, residential and commercial properties across Bangalore.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: easeOut }}
            className="mt-9 w-full max-w-4xl"
          >
            <HomeSearchBar />
          </motion.div>
          <HomeListPropertyCta />
        </div>
      </section>

      {/* ── Asset classes ────────────────────────────────────────────────── */}
      <HomeCategoryGrid />
      {/* Temporarily disabled — scroll-driven card wave/grid animation.
          Restore by uncommenting: */}
      {/* <HarmonicWave /> */}
      <HomePgCoverflow />
      <HomeListingsSection />
      <HomeAboutVjr />
      <HomeHowItWorks />
      <HomeWhyVjr />
      <HomeTestimonials />
      <HomeInsights />
      <HomeContactCta />

      <VJRAIButton userRole="public" />
    </div>
  );
}
