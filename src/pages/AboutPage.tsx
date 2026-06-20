import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { Scale, Shield } from 'lucide-react';
import '@/styles/about-page.css';

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
    initials: 'VR',
    name: 'Mr. Vijay Ram Illa',
    role: 'Founder & CEO',
    bio: 'Vijay Ram Illa founded VJR Estate Properties Private Limited while still in his teenage years — driven by an early, independent fascination with Bangalore\'s real estate market. What began as self-directed research into property cycles, rental yields, and investment patterns became the foundation of VJR Estate\'s investment philosophy. As Founder & CEO, Vijay leads the company\'s overall vision, strategy, and direction — shaping VJR Estate\'s approach to asset selection, investor relationships, and long-term growth across Bangalore\'s real estate market.',
  },
  {
    initials: 'DR',
    name: 'Mr. Devendr Reddy',
    role: 'Director',
    bio: 'Devendr Reddy serves as a strategic partner at VJR Estate, contributing deep expertise in property evaluation and client relationship management. He plays a key role in supporting the company\'s real estate operations — from assessing property quality and investment viability, to building lasting relationships with buyers, sellers, and investors. His ground-level understanding of Bangalore\'s property market strengthens every transaction VJR Estate facilitates.',
  },
];

export default function AboutPage() {
  const missionRef = useRef<HTMLDivElement>(null);
  const visionRef = useRef<HTMLDivElement>(null);
  const missionInView = useInView(missionRef, { once: true, margin: '-10% 0px' });
  const visionInView = useInView(visionRef, { once: true, margin: '-10% 0px' });

  const headlineWords = 'ABOUT VJR ESTATE'.split(' ');

  return (
    <div className="about-scroll-page bg-white min-h-screen pt-[72px]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-black py-20 sm:py-28 lg:py-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-6 text-[10px] uppercase tracking-[0.24em] text-[#666]"
            style={fontBody}
          >
            Bangalore · Real Estate Investment Advisory
          </motion.p>
          <h1 className="overflow-hidden text-white" style={fontHeading}>
            {headlineWords.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 48 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.25 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="mr-[0.28em] inline-block last:mr-0"
                style={{
                  fontSize: 'clamp(2.25rem, 7vw, 4.5rem)',
                  lineHeight: 1.08,
                  letterSpacing: '-0.02em',
                }}
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-10 h-px w-16 origin-center bg-white/30"
          />
        </div>
      </section>

      {/* About intro */}
      <SlideSection className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <SectionLabel>About VJR Estate</SectionLabel>
          <div className="mt-8 space-y-6 text-[16px] leading-[1.75] text-[#333] sm:text-[17px]" style={fontBody}>
            <p>
              VJR Estate is Bangalore&apos;s Specialist Real Estate Investment Advisors.
              We exist for one purpose: to help investors allocate capital into the right real estate assets, exclusively within Bangalore. Our focus spans PG buildings, commercial properties, plots, and land — every category of property where capital meets opportunity. We identify, evaluate, and structure transactions for serious buyers and sellers, supported by a disciplined approach to asset quality, due diligence, and long-term portfolio thinking. As our advisory practice matures, we are also building dedicated property management capability, ensuring our investors are supported not only at acquisition, but across the full lifecycle of ownership.
            </p>
            <p className="border-l-2 border-black pl-5 font-medium text-black">
              VJR Estate Properties Private Limited is registered and headquartered in Bangalore, Karnataka.
            </p>
          </div>
        </div>
      </SlideSection>

      {/* Mission & Vision — slide panels */}
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
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-black">
                <Scale size={20} className="text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-[22px] text-black sm:text-[26px]" style={fontHeading}>
                Our Mission
              </h3>
              <p className="mt-5 text-[15px] leading-[1.75] text-[#444] sm:text-[16px]" style={fontBody}>
                To enable investors to make the right real estate investment decisions — exclusively in Bangalore — across both rental-income properties and high-potential land opportunities.
              </p>
            </motion.div>

            <motion.div
              ref={visionRef}
              initial="hidden"
              animate={visionInView ? 'visible' : 'hidden'}
              variants={slideRight}
              className="about-slide-panel rounded-2xl border border-black bg-black p-8 text-white shadow-lg sm:p-10"
            >
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10">
                <Shield size={20} className="text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-[22px] text-white sm:text-[26px]" style={fontHeading}>
                Our Vision
              </h3>
              <div className="mt-5 space-y-5 text-[15px] leading-[1.75] text-[#ccc] sm:text-[16px]" style={fontBody}>
                <p>
                  To become Bangalore&apos;s most trusted name in real estate investment advisory: a single, dependable destination where capital, opportunity, and expertise meet — covering every stage of the investment journey, from acquisition to long-term portfolio management.
                </p>
                <p className="text-[#999]">
                  We believe Bangalore&apos;s real estate market rewards those who understand it deeply. Our vision is built entirely around this city — its neighborhoods, its growth corridors, its tenant demand, and its long-term value drivers — because specialization, not scale, is what protects an investor&apos;s capital.
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
              <div className="mt-8 hidden h-px w-12 bg-black lg:block" />
            </div>
            <div className="space-y-6 text-[15px] leading-[1.78] text-[#444] sm:text-[16px]" style={fontBody}>
              <p>VJR Estate began as a personal pursuit, not a business plan.</p>
              <p>
                While still in college, Vijay Ram Illa became fascinated by Bangalore&apos;s real estate market — how the city was growing, where value was forming, and why so many property decisions were made on instinct rather than insight. What started as curiosity turned into independent study: researching property cycles, rental yields, legal processes, and the patterns behind Bangalore&apos;s most successful real estate investments.
              </p>
              <p>
                That early groundwork became the foundation for VJR Estate — a firm built on the belief that real estate investment in Bangalore deserves the same rigor, structure, and discipline as any serious asset class. From those early years of study and ground-level learning, VJR Estate has grown into a dedicated advisory practice, with a singular focus: helping investors navigate Bangalore&apos;s property market with clarity and confidence.
              </p>
              <p className="border-l-2 border-[#ddd] pl-5 text-[#333]">
                We are still early in that journey. Every property we evaluate, every transaction we structure, and every investor relationship we build is part of the same pursuit that started it all — making Bangalore real estate investment simpler, safer, and smarter.
              </p>
            </div>
          </div>
        </div>
      </SlideSection>

      {/* Founders */}
      <section id="founders" className="about-snap-section bg-black py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 text-center lg:mb-16"
          >
            <SectionLabel dark>Our Founders</SectionLabel>
            <h2
              className="mt-4 text-white"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Our Founders
            </h2>
          </motion.div>

          <div className="space-y-6 lg:space-y-8">
            {founders.map((founder, index) => (
              <motion.article
                key={founder.name}
                initial={{ opacity: 0, x: index % 2 === 0 ? -80 : 80 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-8% 0px' }}
                transition={{ duration: 0.85, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="about-slide-panel grid grid-cols-1 gap-6 rounded-2xl border border-[#222] bg-[#0a0a0a] p-8 sm:p-10 lg:grid-cols-[140px_1fr] lg:gap-10"
              >
                <div className="flex flex-row items-center gap-5 lg:flex-col lg:items-start lg:gap-3">
                  <span
                    className="font-display text-[#333]"
                    style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)', lineHeight: 1 }}
                  >
                    {founder.initials}
                  </span>
                  <div className="lg:mt-2">
                    <h3 className="text-[20px] text-white sm:text-[22px]" style={fontHeading}>
                      {founder.name}
                    </h3>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#666]" style={fontBody}>
                      {founder.role}
                    </p>
                  </div>
                </div>
                <p className="text-[15px] leading-[1.78] text-[#aaa] sm:text-[16px]" style={fontBody}>
                  {founder.bio}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Our Brands */}
      <SlideSection id="brands" className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <SectionLabel>Our Brands</SectionLabel>
          <h2
            className="mt-4 text-black"
            style={{
              ...fontHeading,
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              lineHeight: 1.12,
              letterSpacing: '-0.02em',
            }}
          >
            Our Brands
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="about-slide-panel mt-10 rounded-2xl border border-[#e8e8e8] bg-white p-8 shadow-sm sm:p-10"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#aaa]" style={fontBody}>
              Legal Estate
            </p>
            <p className="mt-4 text-[15px] leading-[1.78] text-[#444] sm:text-[16px]" style={fontBody}>
              VJR Estate&apos;s dedicated legal and title verification arm, supporting every transaction with structured due diligence, documentation review, and compliance-driven execution — ensuring investors acquire real estate with complete legal clarity.
            </p>
          </motion.div>
        </div>
      </SlideSection>
    </div>
  );
}
