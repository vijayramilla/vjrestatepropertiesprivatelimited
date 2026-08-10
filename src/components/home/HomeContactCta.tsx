import { motion } from 'framer-motion';
import { Phone, WhatsappLogo, ArrowRight } from '@phosphor-icons/react';
import { siteContact } from '@/data/siteContact';
import { Link } from 'react-router-dom';

export default function HomeContactCta() {
  return (
    <section className="relative overflow-hidden bg-[#0A1628]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#C9A84C]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#C9A84C]/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left"
        >
          <div className="max-w-2xl">
            <p className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C] md:justify-start">
              <span className="inline-block h-px w-8 bg-[#C9A84C]" />
              Get Started Today
            </p>
            <h2 className="font-display mt-3 text-2xl font-bold leading-tight text-white md:text-4xl">
              Ready to Buy, Sell or Invest in
              <span className="text-[#C9A84C]"> Bangalore Real Estate?</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 md:text-base">
              Talk to our property experts today — {siteContact.hoursLabel}. Free guidance on
              valuations, rental yields, and the best investment opportunities.
            </p>
          </div>

          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row md:w-auto md:flex-col md:gap-3 lg:flex-row">
            <a
              href={siteContact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-bold text-[#0A1628] shadow-lg shadow-[#25D366]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#25D366]/30"
            >
              <WhatsappLogo size={18} weight="fill" />
              Chat on WhatsApp
            </a>
            <a
              href={`tel:${siteContact.phoneTel}`}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-6 text-sm font-bold text-[#0A1628] shadow-lg shadow-[#C9A84C]/20 transition-all hover:-translate-y-0.5 hover:bg-[#E8C76A] hover:shadow-xl hover:shadow-[#C9A84C]/30"
            >
              <Phone size={18} weight="fill" />
              Call {siteContact.phoneDisplay}
            </a>
            <Link
              to="/contact"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#C9A84C] hover:text-[#C9A84C]"
            >
              Visit Office
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
