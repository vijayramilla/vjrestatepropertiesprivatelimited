import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import {
  Buildings,
  BuildingOffice,
  Compass,
  Crown,
  Eye,
  LinkedinLogo,
  MapPin,
  MapTrifold,
  Quotes,
  UserCircle,
  type Icon,
} from '@phosphor-icons/react';
import '@/styles/about-page.css';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import LazyImage from '@/components/common/LazyImage';


const fontHeading = { fontFamily: "'Libre Baskerville', Georgia, serif" };
const fontBody = { fontFamily: "'Inter', system-ui, sans-serif" };

const slideUp: Variants = {
  hidden: { opacity: 0, y: 56 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: -72 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const slideRight: Variants = {
  hidden: { opacity: 0, x: 72 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

function SectionLabel({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <p
      className={`text-[10px] font-medium uppercase tracking-[0.22em] ${
        dark ? 'text-[#666]' : 'text-[#aaa]'
      }`}
      style={fontBody}
    >
      {children}
    </p>
  );
}

function PremiumIcon({
  icon: IconComponent,
  dark = false,
  size = 'md',
}: {
  icon: Icon;
  dark?: boolean;
  size?: 'md' | 'lg';
}) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-12 w-12';
  const iconSize = size === 'lg' ? 28 : 24;

  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center rounded-2xl border ${
        dark
          ? 'border-white/15 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border-[#e8e8e8] bg-[#fafafa] shadow-sm'
      }`}
    >
      <IconComponent size={iconSize} weight="duotone" className={dark ? 'text-white' : 'text-black'} />
    </div>
  );
}

function SlideSection({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-8% 0px -8% 0px' });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={slideUp}
      className={`about-snap-section about-slide-panel ${className}`}
    >
      {children}
    </motion.section>
  );
}

const founders = [
  {
    name: 'Mr. Vijay Ram Illa',
    role: 'Founder & CEO',
    icon: UserCircle,
    image: '/images/vijay-ram-illa.png',
    bio: 'Vijay Ram Illa is the Founder & CEO of VJR Estate Properties Private Limited, leading its rise as one of Bangalore\'s most trusted authorities in real estate investment advisory. His command of Bangalore\'s property cycles, rental yields, and capital appreciation trends, built through independent, rigorous study, forms the foundation of VJR Estate\'s investment philosophy, positioning the company as a market authority that shapes opportunity rather than responding to it. As Founder & CEO, Vijay sets the vision, strategy, and direction across the business, leading asset selection with institutional discipline, governing investor relationships with a long-term partnership mindset, and steering growth across Bangalore\'s most competitive real estate corridors as a decisive force in the market.',
  },
];

export default function AboutPage() {
  const founder = founders[0];
  const missionRef = useRef<HTMLDivElement>(null);
  const visionRef = useRef<HTMLDivElement>(null);
  const missionInView = useInView(missionRef, { once: true, margin: '-10% 0px' });
  const visionInView = useInView(visionRef, { once: true, margin: '-10% 0px' });

  return (
    <div className="about-page about-scroll-page bg-white min-h-screen">
      <HeroGeometric
        compact
        badge="Bangalore · Real Estate Investment Advisory"
        title1="ABOUT"
        title2="VJR ESTATE"
        className="pt-[72px]"
      />

      {/* About intro */}
      <SlideSection className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="flex items-start gap-5">
            <PremiumIcon icon={Buildings} size="lg" />
            <div className="min-w-0 flex-1">
              <SectionLabel>About VJR Estate</SectionLabel>
              <div className="mt-6 space-y-6 text-[16px] leading-[1.75] text-[#333] sm:text-[17px]" style={fontBody}>
                <p>
                  VJR Estate is Bangalore&apos;s Specialist Real Estate Investment Advisors.
                  We exist for one purpose: to help investors allocate capital into the right real estate assets, exclusively within Bangalore. Our focus spans PG buildings, commercial properties, plots, and land, covering every category of property where capital meets opportunity. We identify, evaluate, and structure transactions for serious buyers and sellers, supported by a disciplined approach to asset quality, due diligence, and long-term portfolio thinking. As our advisory practice matures, we are also building dedicated property management capability, ensuring our investors are supported not only at acquisition, but across the full lifecycle of ownership.
                </p>
                <p className="border-l-2 border-black pl-5 font-medium text-black">
                  VJR Estate Properties Private Limited is registered and headquartered in Bangalore, Karnataka.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SlideSection>

      {/* Mission & Vision */}
      <section id="mission-vision" className="about-snap-section border-y border-[#ebebeb] bg-[#fafafa] py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 text-center lg:mb-16"
          >
            <SectionLabel>Mission & Vision</SectionLabel>
            <h2
              className="mt-4 text-black"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Mission & Vision
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <motion.div
              ref={missionRef}
              initial="hidden"
              animate={missionInView ? 'visible' : 'hidden'}
              variants={slideLeft}
              className="about-slide-panel rounded-2xl border border-[#e8e8e8] bg-white p-8 shadow-sm sm:p-10"
            >
              <PremiumIcon icon={Compass} />
              <h3 className="mt-6 text-[22px] text-black sm:text-[26px]" style={fontHeading}>
                Our Mission
              </h3>
              <p className="mt-5 text-[15px] leading-[1.75] text-[#444] sm:text-[16px]" style={fontBody}>
                To enable investors to make the right real estate investment decisions, exclusively in Bangalore, across both rental-income properties and high-potential land opportunities.
              </p>
            </motion.div>

            <motion.div
              ref={visionRef}
              initial="hidden"
              animate={visionInView ? 'visible' : 'hidden'}
              variants={slideRight}
              className="about-slide-panel rounded-2xl border border-[#0A1628] bg-[#0A1628] p-8 text-white shadow-lg sm:p-10"
            >
              <PremiumIcon icon={Eye} dark />
              <h3 className="mt-6 text-[22px] text-white sm:text-[26px]" style={fontHeading}>
                Our Vision
              </h3>
              <div className="mt-5 space-y-5 text-[15px] leading-[1.75] text-[#ccc] sm:text-[16px]" style={fontBody}>
                <p>
                  To become Bangalore&apos;s most trusted name in real estate investment advisory: a single, dependable destination where capital, opportunity, and expertise meet, covering every stage of the investment journey, from acquisition to long-term portfolio management.
                </p>
                <p className="text-[#999]">
                  We believe Bangalore&apos;s real estate market rewards those who understand it deeply. Our vision is built entirely around this city, its neighborhoods, its growth corridors, its tenant demand, and its long-term value drivers, because specialization, not scale, is what protects an investor&apos;s capital.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Journey */}
      <SlideSection id="journey" className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.38fr_0.62fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <PremiumIcon icon={MapTrifold} />
              <SectionLabel>Our Journey</SectionLabel>
              <h2
                className="mt-4 text-black"
                style={{
                  ...fontHeading,
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                Our Journey
              </h2>
              <div className="mt-8 hidden h-px w-12 bg-[#C9A84C] lg:block" />
            </div>
            <div className="space-y-6 text-[15px] leading-[1.78] text-[#444] sm:text-[16px]" style={fontBody}>
              <p>VJR Estate began as a personal pursuit, not a business plan.</p>
              <p>
                While still in college, Vijay Ram Illa became fascinated by Bangalore&apos;s real estate market: how the city was growing, where value was forming, and why so many property decisions were made on instinct rather than insight. What started as curiosity turned into independent study: researching property cycles, rental yields, legal processes, and the patterns behind Bangalore&apos;s most successful real estate investments.
              </p>
              <p>
                That early groundwork became the foundation for VJR Estate, a firm built on the belief that real estate investment in Bangalore deserves the same rigor, structure, and discipline as any serious asset class. From those early years of study and ground-level learning, VJR Estate has grown into a dedicated advisory practice, with a singular focus: helping investors navigate Bangalore&apos;s property market with clarity and confidence.
              </p>
              <p className="border-l-2 border-[#ddd] pl-5 text-[#333]">
                We are still early in that journey. Every property we evaluate, every transaction we structure, and every investor relationship we build is part of the same pursuit that started it all, making Bangalore real estate investment simpler, safer, and smarter.
              </p>
            </div>
          </div>
        </div>
      </SlideSection>

      {/* Founders */}
      <section id="founders" className="about-snap-section relative overflow-hidden bg-[#0A1628] py-14 sm:py-20 lg:py-24">
        {/* Ambient gold glows */}
        <div aria-hidden className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-[#C9A84C]/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-[#C9A84C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10 text-center lg:mb-14"
          >
            <SectionLabel dark>Founder</SectionLabel>
            <h2
              className="mt-4 text-white"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              The Founder
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[13px] text-[#888]" style={fontBody}>
              The vision, values, and discipline behind VJR Estate.
            </p>
            <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              {/* Top gold hairline */}
              <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />
              <CardContent className="p-6 sm:p-8 lg:p-10">
                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.36fr_0.64fr] lg:gap-12">
                  {/* Portrait */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-8% 0px' }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="relative mx-auto w-full max-w-[220px] sm:max-w-[260px]"
                  >
                    {/* Gold glow */}
                    <div aria-hidden className="absolute -inset-6 rounded-full bg-[#C9A84C]/15 blur-3xl" />

                    {/* Gold conic frame around the portrait */}
                    <div className="relative aspect-square rounded-full bg-[conic-gradient(from_140deg,#C9A84C,#6d5716,#C9A84C,#f4e9c0,#C9A84C,#6d5716,#C9A84C)] p-[2.5px] shadow-[0_0_40px_-12px_rgba(201,168,76,0.4)] transition-shadow duration-500 hover:shadow-[0_0_60px_-8px_rgba(201,168,76,0.5)]">
                      <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#0A1628] bg-[#0A1628]">
                        <LazyImage
                          src={founder.image}
                          alt={founder.name}
                          width={260}
                          height={260}
                          priority
                          className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                      </div>
                    </div>

                    {/* Role chip, fixed to the bottom of the portrait */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                      <Badge className="gap-1.5 whitespace-nowrap border border-[#C9A84C]/40 bg-[#0A1628]/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#E8D48B] shadow-lg backdrop-blur-md">
                        <Crown size={12} weight="fill" aria-hidden />
                        {founder.role}
                      </Badge>
                    </div>
                  </motion.div>

                  {/* Content */}
                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-center gap-3"
                    >
                      <div className="h-px w-10 bg-[#C9A84C]" />
                      <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#C9A84C]" style={fontBody}>
                        Founder &amp; CEO
                      </span>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3"
                    >
                      <h3
                        className="text-white"
                        style={{
                          ...fontHeading,
                          fontSize: 'clamp(1.5rem, 2.6vw, 2rem)',
                          lineHeight: 1.2,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {founder.name}
                      </h3>
                      <a
                        href="https://www.linkedin.com/in/vijay-ram-illa/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium text-[#c9c9d2] transition-colors duration-300 hover:border-[#C9A84C]/50 hover:text-[#E8D48B]"
                        style={fontBody}
                      >
                        <LinkedinLogo size={14} weight="fill" aria-hidden />
                        LinkedIn
                      </a>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Separator className="my-5 bg-white/10" />
                      <p className="text-[14px] leading-[1.75] text-[#b9b9c4] sm:text-[15px]" style={fontBody}>
                        {founder.bio}
                      </p>
                    </motion.div>

                    {/* Pull quote */}
                    <motion.blockquote
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
                      className="relative mt-6 border-l-2 border-[#C9A84C] pl-5"
                    >
                      <Quotes
                        className="absolute -top-1 left-4 h-5 w-5 rotate-180 text-[#C9A84C]/30"
                        weight="fill"
                        aria-hidden
                      />
                      <p className="text-[15px] italic leading-[1.7] text-[#E8E6DF] sm:text-[16px]" style={fontHeading}>
                        A market authority that shapes opportunity rather than responding to it.
                      </p>
                    </motion.blockquote>

                    {/* Key facts */}
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      {[
                        { icon: BuildingOffice, value: 'VJR Estate', label: 'Founded' },
                        { icon: MapPin, value: 'Bangalore', label: 'Headquarters' },
                      ].map((fact) => (
                        <div
                          key={fact.label}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition-colors duration-300 hover:border-[#C9A84C]/40"
                        >
                          <fact.icon size={18} weight="duotone" className="text-[#C9A84C]" />
                          <p className="mt-3 text-[13px] font-medium text-white sm:text-[14px]" style={fontHeading}>
                            {fact.value}
                          </p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[#7d7d88]" style={fontBody}>
                            {fact.label}
                          </p>
                        </div>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
