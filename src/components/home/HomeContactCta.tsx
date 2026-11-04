import { motion } from 'framer-motion';
import { Phone, WhatsappLogo, ArrowRight } from '@phosphor-icons/react';
import { siteContact } from '@/data/siteContact';
import { Link } from 'react-router-dom';

export default function HomeContactCta() {
  return (
    <section className="relative overflow-hidden border-b border-[#e9e5da] bg-[#F1EEE6]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#C9A84C]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#C9A84C]/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left"
        >
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-[#0A1628] md:text-4xl">
              Ready to Invest in
              <span className="text-[#C9A84C]"> Bangalore's Rental Income Properties?</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-500 md:text-base">
              Talk to our property experts today — {siteContact.hoursLabel}. Free guidance on
              rental yields, property selection, and the best income opportunities in Bangalore.
            </p>
          </div>

          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row md:w-auto md:flex-col md:gap-3 lg:flex-row">
            <motion.a
              href={siteContact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 bg-[#0A1628] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1E3852]"
            >
              <WhatsappLogo size={18} weight="fill" />
              Chat on WhatsApp
            </motion.a>
            <motion.a
              href={`tel:${siteContact.phoneTel}`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 border border-[#0A1628]/25 px-6 text-sm font-semibold text-[#0A1628] transition-colors hover:border-[#0A1628]"
            >
              <Phone size={18} weight="fill" />
              Call {siteContact.phoneDisplay}
            </motion.a>
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1"
            >
              <Link
                to="/contact"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 border border-[#0A1628]/25 px-6 text-sm font-semibold text-[#0A1628] transition-colors hover:border-[#0A1628]"
              >
                Visit Office
                <ArrowRight size={16} weight="bold" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}