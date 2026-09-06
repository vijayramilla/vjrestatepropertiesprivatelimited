import { motion } from 'framer-motion';
import { Quotes, Star } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

const TESTIMONIALS = [
  {
    quote:
      'VJR showed me the rent roll, occupancy and running costs before I even visited. I closed a PG building in Whitefield that pays me every month — the numbers were exactly as presented.',
    name: 'Ramesh K.',
    role: 'PG Building Investor, Whitefield',
    rating: 5,
  },
  {
    quote:
      'I compared four brokers in Bangalore. Only VJR came with actual income data per property. Their legal check saved me from a B-Khata trap on my second purchase.',
    name: 'Sunita M.',
    role: 'Residential Rental Investor, HSR Layout',
    rating: 5,
  },
  {
    quote:
      'From shortlisting to registration took under six weeks. Everything — negotiation, documents, khata transfer — was handled while I just reviewed and signed.',
    name: 'Arvind S.',
    role: 'Commercial Asset Buyer, Electronic City',
    rating: 5,
  },
];

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

export default function HomeTestimonials() {
  return (
    <section className="relative overflow-hidden bg-[#F8F9FA] py-12 md:py-20">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[#C9A84C]/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#C9A84C]/[0.06] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-10 text-center"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
            Investor Stories
          </p>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
            Trusted by Bangalore&rsquo;s Income Investors
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500">
            First-time buyers and seasoned investors alike — here&rsquo;s what they say after
            acquiring rental assets with VJR Estate.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.45, delay: i * 0.09, ease: EASE }}
              className="relative flex h-full flex-col rounded-2xl border border-[#EBEBEB] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:shadow-[0_16px_40px_rgba(10,22,40,0.08)]"
            >
              <Quotes size={28} weight="fill" className="text-[#C9A84C]/25" />

              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, s) => (
                  <Star key={s} size={13} weight="fill" className="text-[#C9A84C]" />
                ))}
              </div>

              <blockquote className="mt-3 flex-1 text-[13px] leading-relaxed text-gray-600">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <figcaption className="mt-5 flex items-center gap-3 border-t border-[#F0F0F0] pt-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A1628] text-xs font-bold text-[#C9A84C]">
                  {t.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold text-[#0A1628]">{t.name}</span>
                  <span className="block truncate text-[11px] text-gray-400">{t.role}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// Re-exported as a small helper section for the CTA area below testimonials.
export function HomeTestimonialsFooterNote() {
  return (
    <Link
      to="/about"
      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C9A84C] transition-colors hover:text-[#0A1628]"
    >
      Know more about VJR Estate
    </Link>
  );
}
