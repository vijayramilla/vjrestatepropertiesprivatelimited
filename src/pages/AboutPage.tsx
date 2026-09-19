import { useState } from 'react';
import { Crown, MapPin } from '@phosphor-icons/react';
import { siteContact } from '@/data/siteContact';
import FlowArt, { FlowSection } from '@/components/ui/story-scroll';

const PILLARS = [
  {
    kicker: 'Focus',
    title: 'One city. One asset class.',
    body: 'VJR Estate works exclusively on Bangalore rental income properties: PG buildings, residential rental blocks and commercial income assets. Depth in one market is what gives our clients an edge breadth cannot.',
  },
  {
    kicker: 'Method',
    title: 'Numbers before emotions.',
    body: 'Every property we present comes with its rent roll, occupancy picture and running costs on the table. Our clients decide with data in hand, the way every serious investment decision should be made.',
  },
  {
    kicker: 'Partnership',
    title: 'One advisor, start to finish.',
    body: 'From the first shortlist to registration, a single specialist stays with you. No handovers, no call-centre runarounds. Just accountable, personal guidance through the largest purchase of your life.',
  },
];

const SECTION_DARK = { backgroundColor: '#0A1628', color: '#fff' } as const;
const SECTION_LIGHT = { backgroundColor: '#F8F9FA', color: '#0A1628' } as const;

export default function AboutPage() {
  const c = siteContact;
  const [founderImgError, setFounderImgError] = useState(false);

  return (
    <div className="min-h-screen bg-white pt-[72px]">
      <FlowArt aria-label="About VJR Estate">
        {/* ── Hero ── */}
        <FlowSection aria-label="About VJR Estate" style={SECTION_DARK}>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C9A84C]">
            <Crown size={14} weight="fill" />
            About VJR Estate
          </p>
          <hr className="border-t border-white/30" />
          <div>
            <h1 className="font-display text-[clamp(2.25rem,5.5vw,4.25rem)] font-bold leading-[1.06] tracking-[-0.02em] text-white">
              Bangalore&rsquo;s dedicated
              <span className="block text-[#E4C877]">rental income specialists.</span>
            </h1>
          </div>
          <hr className="border-t border-white/30" />
          <p className="mt-auto max-w-[52ch] text-[clamp(0.95rem,1.2vw,1.2rem)] leading-relaxed text-white/60">
            VJR Estate Properties Private Limited exists for one purpose: helping investors
            put capital into income-generating real estate, exclusively within Bangalore.
          </p>
        </FlowSection>

        {/* ── Who we are ── */}
        <FlowSection aria-label="Who We Are" style={SECTION_LIGHT}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
            Who We Are
          </p>
          <hr className="border-t border-black/20" />
          <div>
            <h2 className="font-display text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.08] tracking-[-0.02em] text-[#0A1628]">
              A specialist, not a generalist.
            </h2>
          </div>
          <hr className="border-t border-black/20" />
          <div className="mt-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
            <div className="space-y-4 text-[clamp(0.9rem,1vw,1.05rem)] leading-relaxed text-gray-600">
              <p>
                VJR Estate is a Bangalore-headquartered property advisory focused entirely on
                rental income real estate. Our focus spans PG buildings, residential rental
                blocks and commercial income properties, the asset classes where tenant
                demand, location and property quality meet.
              </p>
              <p>
                We identify, evaluate and structure acquisitions for serious buyers, with a
                disciplined approach to documentation and long-term portfolio thinking. As our
                advisory practice grows, we are building dedicated property management
                capability, so investors are supported across the full lifecycle of ownership,
                not just at acquisition.
              </p>
            </div>
            <p className="self-end border-l-2 border-[#C9A84C] pl-5 text-[clamp(0.95rem,1.15vw,1.15rem)] font-medium leading-relaxed text-[#0A1628]">
              Registered and headquartered in Bangalore, Karnataka, serving clients across
              every corridor of the city.
            </p>
          </div>
        </FlowSection>

        {/* ── Mission & Vision ── */}
        <FlowSection aria-label="Mission and Vision" style={SECTION_DARK}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
            Mission &amp; Vision
          </p>
          <hr className="border-t border-white/30" />
          <div>
            <h2 className="font-display text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.08] tracking-[-0.02em] text-white">
              What drives us every day
            </h2>
          </div>
          <hr className="border-t border-white/30" />
          <div className="mt-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            <div className="rounded-2xl border border-[#EBEBEB] bg-white p-6 shadow-sm md:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                Mission
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-700 md:text-lg">
                To enable investors to make the right rental income property decisions:
                exclusively in Bangalore, across PG buildings, residential rentals and
                commercial income properties.
              </p>
            </div>
            <div className="rounded-2xl bg-[#0A1628] p-6 shadow-lg ring-1 ring-white/15 md:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                Vision
              </p>
              <p className="mt-4 text-base leading-relaxed text-white/85 md:text-lg">
                To become Bangalore&rsquo;s most trusted name in rental income property advisory,
                a single, dependable destination covering every stage of the investment journey,
                from acquisition to long-term portfolio management.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                Because specialization, not scale, is what protects an investor&rsquo;s capital.
              </p>
            </div>
          </div>
        </FlowSection>

        {/* ── How we work ── */}
        <FlowSection aria-label="How We Work" style={SECTION_LIGHT}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
            How We Work
          </p>
          <hr className="border-t border-black/20" />
          <div>
            <h2 className="font-display text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.08] tracking-[-0.02em] text-[#0A1628]">
              Three principles behind every VJR Estate deal
            </h2>
          </div>
          <hr className="border-t border-black/20" />
          <div className="mt-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
            {PILLARS.map((pillar, i) => (
              <div
                key={pillar.kicker}
                className="rounded-2xl border border-[#EBEBEB] bg-white p-6 shadow-sm md:p-7"
              >
                <span className="font-display text-3xl font-bold text-[#C9A84C]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-base font-bold text-[#0A1628]">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{pillar.body}</p>
              </div>
            ))}
          </div>
        </FlowSection>

        {/* ── Founder ── */}
        <FlowSection aria-label="The Founder" style={SECTION_DARK}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
            The Founder
          </p>
          <hr className="border-t border-white/30" />
          <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[0.32fr_0.68fr] lg:gap-14">
            <div className="relative mx-auto w-full max-w-[200px]">
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
                      alt="Vijay Ram Illa, Founder & CEO, VJR Estate"
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
            </div>
            <div>
              <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.02em] text-white">
                Vijay Ram Illa
              </h2>
              <div className="mt-6 space-y-4 text-[clamp(0.9rem,1.05vw,1.05rem)] leading-relaxed text-white/60">
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
            </div>
          </div>
        </FlowSection>

        {/* ── Visit us ── */}
        <FlowSection aria-label="Visit Us" style={SECTION_LIGHT}>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
            <MapPin size={13} weight="fill" />
            Visit Us
          </p>
          <hr className="border-t border-black/20" />
          <div>
            <h2 className="font-display text-[clamp(1.5rem,3vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[#0A1628]">
              {c.addressShort}
            </h2>
          </div>
          <hr className="border-t border-black/20" />
          <div className="mt-auto flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[52ch] text-[clamp(0.9rem,1.1vw,1.1rem)] leading-relaxed text-gray-500">
              {c.address} · {c.hoursLabel}
            </p>
            <a
              href={c.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl bg-[#0A1628] px-8 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#1E3852]"
            >
              Open in Maps
            </a>
          </div>
        </FlowSection>
      </FlowArt>
    </div>
  );
}
