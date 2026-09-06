import { motion } from 'framer-motion';
import { Crown, TrendUp, MapPin, Handshake, ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const POINTS = [
  {
    icon: TrendUp,
    title: 'Income-first, always',
    desc: 'Every property is presented with its rent roll and occupancy picture — you see what the asset earns before you see anything else.',
  },
  {
    icon: MapPin,
    title: 'One city, total depth',
    desc: 'We work only in Bangalore, across every corridor from the city core to the emerging outskirts. Local depth is our edge.',
  },
  {
    icon: Handshake,
    title: 'Guided end to end',
    desc: 'One specialist stays with you from first shortlist to registration — evaluation, negotiation, documentation and handover.',
  },
];

export default function HomeAboutVjr() {
  return (
    <section className="relative overflow-hidden bg-white py-14 md:py-20">
      <div className="pointer-events-none absolute -right-32 top-0 h-80 w-80 rounded-full bg-[#C9A84C]/[0.06] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.42fr_0.58fr] lg:gap-16">
          {/* Left — positioning statement */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
              <Crown size={13} weight="fill" />
              About VJR Estate
            </p>
            <h2 className="font-display mt-4 text-2xl font-bold leading-snug tracking-tight text-[#0A1628] md:text-[34px] md:leading-[1.2]">
              Bangalore&rsquo;s dedicated
              <span className="block text-[#A98C3B]">rental income specialists.</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-gray-500 md:text-base">
              VJR Estate is a property advisory built around one idea: real estate should
              work for you every month, not just on paper. We help investors buy
              income-generating property — PG buildings, residential rental blocks and
              commercial assets — across Bangalore.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-500 md:text-base">
              Instead of listing everything, we curate. Every asset we show has been walked,
              checked and priced against what it can actually earn. You get the numbers in
              hand, a specialist by your side, and a process that runs from first visit to
              final registration.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                to="/about"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#0A1628] px-6 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#1E3852]"
              >
                Know More About Us
                <ArrowRight size={15} weight="bold" />
              </Link>
              <Link
                to="/properties"
                className="inline-flex min-h-[46px] items-center rounded-xl border border-[#0A1628]/15 px-6 text-sm font-bold text-[#0A1628] transition-all hover:-translate-y-0.5 hover:border-[#C9A84C] hover:text-[#A98C3B]"
              >
                Browse Properties
              </Link>
            </div>
          </motion.div>

          {/* Right — what makes us different */}
          <div className="space-y-4">
            {POINTS.map((point, i) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.09, ease: EASE }}
                className="group flex gap-5 rounded-2xl border border-[#EBEBEB] bg-[#F8F9FA] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:bg-white hover:shadow-[0_16px_40px_rgba(10,22,40,0.08)] md:p-6"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0A1628] text-[#C9A84C] transition-colors duration-300 group-hover:bg-[#C9A84C] group-hover:text-[#0A1628]">
                  <point.icon size={22} weight="duotone" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-[#0A1628]">{point.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
                    {point.desc}
                  </p>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: 0.28, ease: EASE }}
              className="flex items-center gap-5 rounded-2xl bg-[#0A1628] p-5 md:p-6"
            >
              <p className="font-display text-3xl font-bold leading-none text-[#C9A84C]">
                1<span className="text-lg">st</span>
              </p>
              <p className="text-[13px] leading-relaxed text-white/70">
                advisory in Bangalore focused exclusively on rental income property — it&rsquo;s
                not one of our services, it&rsquo;s the only thing we do.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
