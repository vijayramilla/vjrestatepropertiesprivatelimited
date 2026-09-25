import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, MapPin } from '@phosphor-icons/react';
import { siteContact } from '@/data/siteContact';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const PILLARS = [
  {
    kicker: 'Focus',
    title: 'One city. One asset class.',
    body: 'VJR Estate works exclusively on Bangalore rental income properties — PG buildings, residential rental blocks and commercial income assets. Depth in one market is what gives our clients an edge breadth cannot.',
  },
  {
    kicker: 'Method',
    title: 'Numbers before emotions.',
    body: 'Every property we present comes with its rent roll, occupancy picture and running costs on the table. Our clients decide with data in hand — the way every serious investment decision should be made.',
  },
  {
    kicker: 'Partnership',
    title: 'One advisor, start to finish.',
    body: 'From the first shortlist to registration, a single specialist stays with you. No handovers, no call-centre runarounds — just accountable, personal guidance through the largest purchase of your life.',
  },
];

export default function AboutPage() {
  const c = siteContact;
  const [founderImgError, setFounderImgError] = useState(false);

  return (
    <div className="min-h-screen bg-white pt-[72px]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0A1628]">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[760px] -translate-x-1/2 rounded-full bg-[#C9A84C]/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="max-w-4xl"
          >
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C9A84C]">
              <Crown size={14} weight="fill" />
              About VJR Estate
            </p>
            <h1 className="font-display mt-6 text-4xl font-bold leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl md:text-6xl">
              Bangalore&rsquo;s dedicated
              <span className="block text-[#E4C877]">rental income specialists.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
              VJR Estate Properties Private Limited exists for one purpose — helping investors
              put capital into income-generating real estate, exclusively within Bangalore.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Who we are ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
                Who We Are
              </p>
              <h2 className="font-display mt-4 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
                A specialist, not a generalist.
              </h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              className="space-y-5 text-[15px] leading-relaxed text-gray-600 md:text-base"
            >
              <p>
                VJR Estate is a Bangalore-headquartered property advisory focused entirely on
                rental income real estate. Our focus spans PG buildings, residential rental
                blocks and commercial income properties — the asset classes where tenant
                demand, location and property quality meet.
              </p>
              <p>
                We identify, evaluate and structure acquisitions for serious buyers, with a
                disciplined approach to documentation and long-term portfolio thinking. As our
                advisory practice grows, we are building dedicated property management
                capability, so investors are supported across the full lifecycle of ownership —
                not just at acquisition.
              </p>
              <p className="border-l-2 border-[#C9A84C] pl-5 font-medium text-[#0A1628]">
                Registered and headquartered in Bangalore, Karnataka — serving clients across
                every corridor of the city.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="border-y border-[#EBEBEB] bg-[#F8F9FA] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-12 text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
              Mission &amp; Vision
            </p>
            <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
              What drives us every day
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: EASE }}
              className="rounded-2xl border border-[#EBEBEB] bg-white p-8 shadow-sm md:p-10"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                Mission
              </p>
              <p className="mt-5 text-lg leading-relaxed text-gray-700 md:text-xl">
                To enable investors to make the right rental income property decisions —
                exclusively in Bangalore, across PG buildings, residential rentals and
                commercial income properties.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              className="rounded-2xl bg-[#0A1628] p-8 shadow-lg md:p-10"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                Vision
              </p>
              <p className="mt-5 text-lg leading-relaxed text-white/85 md:text-xl">
                To become Bangalore&rsquo;s most trusted name in rental income property advisory —
                a single, dependable destination covering every stage of the investment journey,
                from acquisition to long-term portfolio management.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                Because specialization, not scale, is what protects an investor&rsquo;s capital.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How we work ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-12"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
              How We Work
            </p>
            <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
              Three principles behind every VJR Estate deal
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
            {PILLARS.map((pillar, i) => (
              <motion.div
                key={pillar.kicker}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: EASE }}
                className="group rounded-2xl border border-[#EBEBEB] bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:shadow-[0_16px_40px_rgba(10,22,40,0.08)]"
              >
                <span className="font-display text-4xl font-bold text-[#C9A84C]/40 transition-colors group-hover:text-[#C9A84C]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-base font-bold text-[#0A1628]">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{pillar.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founder ── */}
      <section className="relative overflow-hidden bg-[#0A1628] py-16 md:py-24">
        <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-[#C9A84C]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-[#C9A84C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.32fr_0.68fr] lg:gap-14">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, ease: EASE }}
              className="relative mx-auto w-full max-w-[240px]"
            >
              <div className="pointer-events-none absolute -inset-6 rounded-full bg-[#C9A84C]/15 blur-3xl" />
              <div className="relative aspect-square overflow-hidden rounded-full bg-[conic-gradient(from_140deg,#C9A84C,#6d5716,#C9A84C,#f4e9c0,#C9A84C,#6d5716,#C9A84C)] p-[2.5px] shadow-[0_0_40px_-12px_rgba(201,168,76,0.4)]">
                <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#0A1628] bg-[#0A1628]">
                  {founderImgError ? (
                    <span className="flex h-full w-full items-center justify-center font-display text-6xl font-bold text-[#C9A84C]">
                      VJR
                    </span>
                  ) : (
                    <img
                      src="/images/vijay-ram-illa.png"
                      alt="Vijay Ram Illa — Founder & CEO, VJR Estate"
                      className="h-full w-full object-cover"
                      onError={() => setFounderImgError(true)}
                    />
                  )}
                </div>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                <span className="whitespace-nowrap rounded-full border border-[#C9A84C]/40 bg-[#0A1628]/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#E8D48B] shadow-lg backdrop-blur-md">
                  Founder &amp; CEO
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
                The Founder
              </p>
              <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
                Vijay Ram Illa
              </h2>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-white/60 md:text-base">
                <p>
                  Vijay Ram Illa founded VJR Estate on a simple observation: Bangalore&rsquo;s
                  real estate market rewards those who understand it deeply. What began as an
                  independent study of property cycles, rental yields and neighbourhood growth
                  patterns became the foundation of the firm&rsquo;s investment philosophy.
                </p>
                <p>
                  Today he leads asset selection with institutional discipline, governs investor
                  relationships with a long-term partnership mindset, and steers the company&rsquo;s
                  growth across Bangalore&rsquo;s most competitive real estate corridors.
                </p>
              </div>
              <a
                href="https://www.linkedin.com/in/vijay-ram-illa/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[11px] font-medium text-white/70 transition-colors hover:border-[#C9A84C]/50 hover:text-[#E8D48B]"
              >
                Connect on LinkedIn
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Visit us ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex flex-col items-center gap-8 rounded-2xl border border-[#EBEBEB] bg-[#F8F9FA] p-8 text-center md:flex-row md:justify-between md:p-10 md:text-left"
          >
            <div>
              <p className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C] md:justify-start">
                <MapPin size={13} weight="fill" />
                Visit Us
              </p>
              <h2 className="font-display mt-3 text-xl font-bold text-[#0A1628] md:text-2xl">
                {c.addressShort}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {c.address} · {c.hoursLabel}
              </p>
            </div>
            <a
              href={c.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl bg-[#0A1628] px-8 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#1E3852]"
            >
              Open in Maps
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
