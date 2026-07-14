import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Handshake,
  UsersThree,
  Eye,
  Lightbulb,
  UserCircle,
  Rocket,
  CurrencyCircleDollar,
  TrendUp,
  Gift,
  ArrowsClockwise,
  Globe,
  ShieldCheck,
  Heartbeat,
  Buildings,
  type Icon,
} from '@phosphor-icons/react';
import '@/styles/about-page.css';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import Navbar from '@/components/Navbar';

const fontHeading = { fontFamily: "'Libre Baskerville', Georgia, serif" };

const slideUp = {
  hidden: { opacity: 0, y: 56 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
};

function SectionLabel({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <p
      className={`text-[10px] font-medium uppercase tracking-[0.22em] ${
        dark ? 'text-[#666]' : 'text-[#aaa]'
      }`}
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

const ethosValues = [
  { icon: Handshake, title: 'Integrity', desc: 'Integrity is like a GPS for success, ensuring you always end up at the doorstep of excellence, with no detours allowed.' },
  { icon: UsersThree, title: 'Team Work', desc: 'Teamwork isn\'t just a bonus feature; it\'s the foundation for constructing dreams together.' },
  { icon: Eye, title: 'Transparency', desc: 'Transparency is a window, the key that unlocks customer trust and a brighter future.' },
  { icon: Lightbulb, title: 'Innovativeness', desc: 'With today\'s imagination, we build tomorrow\'s real estate solutions, one innovative brick at a time.' },
  { icon: UserCircle, title: 'User Centric', desc: 'For us, the customer reigns supreme and their importance will endure indefinitely.' },
  { icon: ArrowsClockwise, title: 'Dynamic', desc: 'In the dynamic world of real estate, life isn\'t just a journey; it\'s a vibrant adventure waiting to unfold.' },
];

const benefits = [
  { icon: CurrencyCircleDollar, title: 'Highly Competitive Compensation' },
  { icon: TrendUp, title: 'Supersonic Growth' },
  { icon: Gift, title: 'Best Incentive Structure' },
  { icon: ArrowsClockwise, title: 'Bi-Annual Appraisals for Sales' },
  { icon: Globe, title: 'Global Movement Opportunities' },
  { icon: ShieldCheck, title: 'Employee Stock Options' },
  { icon: Heartbeat, title: 'Healthcare & Insurance' },
  { icon: UsersThree, title: 'Fun, Dynamic Environment' },
];

const departments = [
  { name: 'Sales', icon: TrendUp },
  { name: 'Technology', icon: Lightbulb },
  { name: 'Marketing', icon: Rocket },
  { name: 'Customer Relations', icon: UserCircle },
  { name: 'Human Resources', icon: UsersThree },
  { name: 'Operations', icon: Buildings },
];

export default function CareersPage() {
  return (
    <div className="about-scroll-page bg-white min-h-screen">
      <Navbar />
      <HeroGeometric
        compact
        badge="Bangalore · Real Estate Investment Advisory"
        title1="CAREERS"
        title2="AT VJR ESTATE"
        className="pt-[72px]"
      />

      {/* Meet Our Team */}
      <SlideSection className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="flex items-start gap-5">
            <PremiumIcon icon={UsersThree} size="lg" />
            <div className="min-w-0 flex-1">
              <SectionLabel>Meet Our Team</SectionLabel>
              <h2
                className="mt-4 text-black"
                style={{
                  ...fontHeading,
                  fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                  lineHeight: 1.12,
                  letterSpacing: '-0.02em',
                }}
              >
                Meet Our Team
              </h2>
              <div className="mt-6 space-y-6 text-[16px] leading-[1.75] text-[#333] sm:text-[17px]">
                <p>
                  Welcome to VJR Estate! Surrounded by the vibrant energy of Bangalore, we proudly boast a team of dedicated professionals fuelled by an unwavering commitment to steering success consistently.
                </p>
                <p>
                  Enthusiasm in the team is ignited by a strong sense of belonging and nurtured within our culture of transparency and openness. Embracing the profound truth that it is our people who form the very soul of our business, we empower our team to infuse work with emotional dedication, whether crafting innovative solutions or fashioning remarkable products.
                </p>
                <p className="border-l-2 border-black pl-5 font-medium text-black">
                  Here at VJR Estate, our pursuit goes beyond the ordinary; we seek that pivotal moment for a continuous and unwavering journey of growth and progress.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SlideSection>

      {/* Life at VJR Estate */}
      <section className="about-snap-section border-y border-[#ebebeb] bg-[#fafafa] py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 text-center lg:mb-16"
          >
            <SectionLabel>Life at VJR Estate</SectionLabel>
            <h2
              className="mt-4 text-black"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Life at VJR Estate
            </h2>
          </motion.div>

          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[16px] leading-[1.75] text-[#444] sm:text-[17px]">
              At VJR Estate, we consider the support and well-being of our employees as the fundamental pillar of our business ethos. We wholeheartedly endorse a holistic approach to individuals and the team, putting great emphasis on granting absolute autonomy at every level. We also celebrate the journey towards achieving both personal and collective goals.
            </p>
            <p className="mt-6 text-[16px] leading-[1.75] text-[#444] sm:text-[17px]">
              Our source of pride lies in the nurturing embrace of our inclusive and supportive culture, which encourages unleashing creative potential within our workforce. Amidst the vibrant bustle of Bangalore, we passionately advocate for our team's well-being by actively encouraging their engagement in rejuvenating and revitalizing activities.
            </p>
          </div>
        </div>
      </section>

      {/* Our Ethos */}
      <SlideSection className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 text-center lg:mb-16"
          >
            <SectionLabel>Our Ethos</SectionLabel>
            <h2
              className="mt-4 text-black"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Our Ethos
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ethosValues.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-8% 0px' }}
                transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="about-slide-panel rounded-2xl border border-[#e8e8e8] bg-white p-6 sm:p-8"
              >
                <PremiumIcon icon={value.icon} />
                <h3 className="mt-5 text-[18px] text-black sm:text-[20px]" style={fontHeading}>
                  {value.title}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.7] text-[#555] sm:text-[15px]">
                  {value.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </SlideSection>

      {/* Advantages & Perquisites */}
      <section className="about-snap-section bg-black py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 text-center lg:mb-16"
          >
            <SectionLabel dark>Advantages & Perquisites</SectionLabel>
            <h2
              className="mt-4 text-white"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Advantages & Perquisites
            </h2>
            <p className="mt-4 text-[15px] text-[#999] max-w-2xl mx-auto">
              We firmly believe that our employees are the driving force behind our success and expansion. As a result, we spare no effort in expressing our gratitude and recognition for their contributions.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-8% 0px' }}
                transition={{ duration: 0.5, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="about-slide-panel flex flex-col items-center rounded-2xl border border-[#222] bg-[#0a0a0a] p-6 text-center sm:p-8"
              >
                <PremiumIcon icon={benefit.icon} dark />
                <h3 className="mt-4 text-[14px] font-medium text-white sm:text-[15px]">
                  {benefit.title}
                </h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <SlideSection className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 text-center"
          >
            <SectionLabel>Open Positions</SectionLabel>
            <h2
              className="mt-4 text-black"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Open Positions
            </h2>
            <p className="mt-4 text-[15px] text-[#666] max-w-xl mx-auto">
              Join our growing team. Explore opportunities across departments.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {departments.map((dept, index) => (
              <motion.div
                key={dept.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-8% 0px' }}
                transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="about-slide-panel flex cursor-pointer flex-col items-center rounded-xl border border-[#e8e8e8] bg-white p-5 text-center transition-colors hover:border-black sm:p-6"
              >
                <PremiumIcon icon={dept.icon} />
                <h3 className="mt-3 text-[13px] font-medium text-black sm:text-[14px]">
                  {dept.name}
                </h3>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 text-center"
          >
            <p className="text-[14px] text-[#888]">
              No open positions right now? Send your resume to{' '}
              <a href="mailto:careers@vjrestate.com" className="text-black underline underline-offset-2 hover:text-[#555]">
                careers@vjrestate.com
              </a>
            </p>
          </motion.div>
        </div>
      </SlideSection>
    </div>
  );
}
