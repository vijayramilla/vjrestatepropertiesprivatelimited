import { motion } from 'framer-motion';
import { Phone, WhatsappLogo, ArrowRight } from '@phosphor-icons/react';
import { siteContact } from '@/data/siteContact';
import { Link } from 'react-router-dom';

export default function HomeContactCta() {
  return (
    <section className="relative overflow-hidden border-b border-[#ebebeb] bg-white">
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
              Get Started Today
            </p>
            <h2 className="font-display mt-3 text-2xl font-bold leading-tight text-[#0A1628] md:text-4xl">
              Ready to Invest in
              <span className="text-[#C9A84C]"> Bangalore's Rental Income Properties?</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-500 md:text-base">
              Talk to our property experts today — {siteContact.hoursLabel}. Free guidance on
              rental yields, property selection, and the best income opportunities in Bangalore.
            </p>
          </div>

          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row md:w-auto md:flex-col md:gap-3 lg:flex-row">
            <a
              href={siteContact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-bold text-white shadow-lg shadow-[#25D366]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#25D366]/30"
            >
              <WhatsappLogo size={18} weight="fill" />
              Chat on WhatsApp
            </a>
            <a
              href={`tel:${siteContact.phoneTel}`}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#0A1628] px-6 text-sm font-bold text-white shadow-lg shadow-[#0A1628]/20 transition-all hover:-translate-y-0.5 hover:bg-[#1E3852] hover:shadow-xl hover:shadow-[#0A1628]/30"
            >
              <Phone size={18} weight="fill" />
              Call {siteContact.phoneDisplay}
            </a>
            <Link
              to="/contact"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#0A1628]/15 bg-white px-6 text-sm font-bold text-[#0A1628] transition-all hover:-translate-y-0.5 hover:border-[#C9A84C] hover:text-[#C9A84C]"
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