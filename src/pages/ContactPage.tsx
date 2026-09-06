import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Phone, Envelope, MapPin, Clock, WhatsappLogo, ArrowUpRight, ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { siteContact } from '@/data/siteContact';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const CHANNELS = [
  {
    icon: Phone,
    title: 'Call Us',
    content: siteContact.phoneDisplay,
    note: siteContact.hoursLabel,
    href: `tel:${siteContact.phoneTel}`,
    external: false,
  },
  {
    icon: WhatsappLogo,
    title: 'WhatsApp',
    content: siteContact.phoneDisplay,
    note: 'Fastest response — typically within minutes',
    href: siteContact.whatsappUrl,
    external: true,
  },
  {
    icon: Envelope,
    title: 'Email Us',
    content: siteContact.email,
    note: 'For detailed enquiries & documentation',
    href: `mailto:${siteContact.email}`,
    external: false,
  },
  {
    icon: Clock,
    title: 'Office Hours',
    content: siteContact.hoursLabel,
    note: 'Walk-ins welcome at our HSR Layout office',
    href: '',
    external: false,
  },
];

export default function ContactPage() {
  const c = siteContact;
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.55], [0, 80]);

  return (
    <div className="min-h-screen bg-white pt-[72px]">
      {/* ── Hero ── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative flex min-h-[70svh] items-center justify-center overflow-hidden bg-[#0A1628] px-5 text-center"
      >
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[760px] -translate-x-1/2 rounded-full bg-[#C9A84C]/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />

        <div className="relative mx-auto max-w-4xl">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: EASE }}
            className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#C9A84C]"
          >
            VJR Estate · Get In Touch
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.75, ease: EASE }}
            className="font-display mt-6 text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-white sm:text-5xl md:text-7xl"
          >
            Let&rsquo;s talk about
            <span className="block text-[#E4C877]">your next asset.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.75, ease: EASE }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg"
          >
            Rental income properties, PG buildings and commercial assets across Bangalore —
            our team responds to every enquiry, fast.
          </motion.p>
        </div>
      </motion.section>

      {/* ── Channels ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-12 text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
              Reach Us
            </p>
            <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
              Choose the channel that suits you
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {CHANNELS.map((ch, i) => {
              const inner = (
                <>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A1628] text-[#C9A84C] transition-colors duration-300 group-hover:bg-[#C9A84C] group-hover:text-[#0A1628]">
                    <ch.icon size={22} weight="duotone" />
                  </span>
                  <h3 className="mt-5 text-sm font-bold text-[#0A1628]">{ch.title}</h3>
                  <p className="mt-1.5 break-words text-[15px] font-semibold text-gray-700">
                    {ch.content}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">{ch.note}</p>
                  {ch.href && (
                    <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9A84C]">
                      {ch.external ? 'Open' : 'Contact'} <ArrowRight size={11} weight="bold" />
                    </span>
                  )}
                </>
              );
              const cls =
                'group flex h-full flex-col rounded-2xl border border-[#EBEBEB] bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:shadow-[0_16px_40px_rgba(10,22,40,0.08)]';
              return (
                <motion.div
                  key={ch.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
                >
                  {ch.href ? (
                    <a
                      href={ch.href}
                      target={ch.external ? '_blank' : undefined}
                      rel={ch.external ? 'noopener noreferrer' : undefined}
                      className={cls}
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Visit the office ── */}
      <section className="border-y border-[#EBEBEB] bg-[#F8F9FA] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
                Visit Our Office
              </p>
              <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
                Sit with us over the numbers
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-gray-500 md:text-base">
                The best property decisions happen face to face. Walk into our HSR Layout
                office and review rent rolls, occupancy and pricing with a specialist — no
                obligation, no pressure.
              </p>
              <p className="mt-6 flex items-start gap-2 text-[15px] font-medium text-[#0A1628]">
                <MapPin size={16} weight="fill" className="mt-0.5 shrink-0 text-[#C9A84C]" />
                {c.address}
              </p>
              <a
                href={c.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#0A1628] px-8 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#1E3852]"
              >
                Open in Maps
                <ArrowUpRight size={15} weight="bold" />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.65, delay: 0.1, ease: EASE }}
              className="relative overflow-hidden rounded-2xl bg-[#0A1628] p-8 md:p-10"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#C9A84C]/15 blur-3xl" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                Selling a Property?
              </p>
              <p className="mt-4 text-xl leading-snug text-white md:text-2xl" style={{ letterSpacing: '-0.01em' }}>
                We connect sellers with serious, pre-qualified buyers across Bangalore —
                income assets move fast on our books.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/list-property"
                  className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-6 text-sm font-bold text-[#0A1628] transition-all hover:-translate-y-0.5 hover:bg-[#E8C76A]"
                >
                  List Your Property
                  <ArrowRight size={15} weight="bold" />
                </Link>
                <Link
                  to="/submit-requirement"
                  className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-bold text-white transition-all hover:border-[#C9A84C] hover:text-[#C9A84C]"
                >
                  Post a Requirement
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#0A1628] md:text-5xl">
              Ready to begin?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-500 md:text-lg">
              Talk to a VJR Estate specialist today — free guidance on rental yields,
              property selection and the best income opportunities in Bangalore.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={`tel:${c.phoneTel}`}
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#0A1628] px-9 text-sm font-bold text-white shadow-lg shadow-[#0A1628]/20 transition-all hover:-translate-y-0.5 hover:bg-[#1E3852]"
              >
                <Phone size={17} weight="fill" />
                Call {c.phoneDisplay}
              </a>
              <a
                href={c.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-9 text-sm font-bold text-white shadow-lg shadow-[#25D366]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                <WhatsappLogo size={17} weight="fill" />
                WhatsApp Us
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
