import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Users, Briefcase } from '@phosphor-icons/react';
import { subscribeToTeamPageVisible, TEAM_PAGE_DEFAULT_VISIBLE } from '@/lib/teamVisibility';
import { setPageMeta, setStructuredData } from '@/lib/siteMeta';
import { getSiteOrigin } from '@/lib/siteUrl';

const EASE = [0.22, 1, 0.36, 1] as const;

type Leader = {
  name: string;
  title: string;
  photoUrl?: string;
  focus?: string;
  zoom?: number;
};

const LEADERSHIP: Leader[] = [
  { name: 'Vijay Ram Illa', title: 'Founder', photoUrl: '/images/vijay-ram-illa.png', focus: '50% 50%' },
  { name: 'Ravi Mandagiri', title: 'Managing Director', photoUrl: '/images/ravi-mandagiri.png', focus: '50% 6%', zoom: 1.3 },
  { name: 'Chandra Babu', title: 'Executive Assistant', photoUrl: '/images/chandra-babu.png', focus: '50% 12%' },
  { name: 'Ramesh', title: 'Business Advisor', photoUrl: '/images/Ramesh.png', focus: '50% 12%' },
  { name: 'Pooja Reddy', title: 'Relationship Manager', photoUrl: '/images/pooja-reddy.png', focus: '50% 28%' },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export default function TeamPage() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(TEAM_PAGE_DEFAULT_VISIBLE);

  useEffect(() => {
    const origin = getSiteOrigin();
    const url = `${origin}/team`;
    setPageMeta(
      'VJR Estate Team | Leadership & Professionals in Bangalore',
      'Meet the team behind VJR Estate Properties Pvt. Ltd., working together to deliver real estate opportunities and investment properties across Bangalore.',
      url,
    );
    setStructuredData(
      [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'VJR Estate Properties Private Limited',
          alternateName: 'VJR Estate',
          url: origin,
          logo: `${origin}/og-image-v2.png`,
          employee: LEADERSHIP.map(({ name, title, photoUrl }) => ({
            '@type': 'Person',
            name,
            jobTitle: title,
            ...(photoUrl ? { image: `${origin}${photoUrl}` } : {}),
          })),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
            { '@type': 'ListItem', position: 2, name: 'Our Team', item: url },
          ],
        },
      ],
      'jsonld-team',
    );
  }, []);

  useEffect(
    () => subscribeToTeamPageVisible(setVisible),
    [],
  );

  if (!visible) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C9A84C]/10 text-[#B8953A]">
          <Users size={32} weight="duotone" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[#0A1628] sm:text-3xl" style={{ letterSpacing: '-0.02em' }}>
          Page not available
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#5b6b7c]">
          This page isn&apos;t publicly visible right now. If you believe this is a
          mistake, please contact us.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#0A1628] px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-[#1a2f4e] active:scale-[0.98]"
        >
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── HERO ── */}
      <header className="relative border-b border-[#e8ebef] bg-white">
        <div className="relative mx-auto max-w-4xl px-5 pb-14 pt-32 text-center sm:px-8 sm:pb-16 sm:pt-36 lg:pb-20 lg:pt-40">
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-center justify-center gap-3"
          >
            <span className="h-px w-8 bg-[#C9A84C] sm:w-12" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B8953A]">
              Meet The Team
            </span>
            <span className="h-px w-8 bg-[#C9A84C] sm:w-12" />
          </motion.div>

          <motion.h1
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="font-display mx-auto mt-6 max-w-3xl text-[2.6rem] font-bold leading-[1.05] tracking-tight text-[#0A1628] sm:text-[3.4rem] lg:text-[3.9rem]"
          >
            Our Team
          </motion.h1>

          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.24 }}
            className="mx-auto mt-10 h-px w-24 bg-[#C9A84C]/40"
          />
        </div>
      </header>

      {/* ── LEADERSHIP ── */}
      <section className="bg-[#fafbfc] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-5 lg:gap-x-8">
            {LEADERSHIP.map((leader, i) => (
              <motion.article
                key={leader.name}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-8% 0px' }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: EASE }}
                className="group flex flex-col items-center text-center"
              >
                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-[#C9A84C]/50 ring-offset-4 ring-offset-white transition-transform duration-500 ease-out group-hover:scale-[1.03] sm:h-36 sm:w-36 lg:h-40 lg:w-40">
                  {leader.photoUrl ? (
                    <img
                      src={leader.photoUrl}
                      alt={`${leader.name}, ${leader.title}`}
                      loading={i < 2 ? 'eager' : 'lazy'}
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: leader.focus ?? '50% 50%',
                        transform: leader.zoom ? `scale(${leader.zoom})` : undefined,
                        transformOrigin: leader.zoom ? '50% 20%' : undefined,
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#faf3e0]">
                      <span className="text-3xl font-semibold tracking-tight text-[#B8953A]">
                        {initials(leader.name)}
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="font-display mt-5 text-base font-bold tracking-tight text-[#0A1628] sm:text-lg">
                  {leader.name}
                </h3>
                <p className="mt-1.5 text-[10px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-[#B8953A] sm:text-[11px]">
                  {leader.title}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOIN CTA ── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16"
            style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1a2f4e 100%)' }}
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#C9A84C]/15 blur-[80px]" />
            <h2 className="text-2xl font-semibold text-white sm:text-3xl" style={{ letterSpacing: '-0.02em' }}>
              Want to work alongside this team?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-[#c3cede]">
              We&apos;re always looking for driven people to join Bangalore&apos;s
              fastest-growing real estate platform.
            </p>
            <a
              href="/careers"
              className="mt-8 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0A1628] shadow-[0_10px_30px_rgba(201,168,76,0.35)] transition-all hover:bg-[#D6B85D] active:scale-[0.98]"
            >
              <Briefcase size={15} weight="bold" />
              View Open Positions
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
