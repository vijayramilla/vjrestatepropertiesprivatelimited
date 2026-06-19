import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { GlobeAnalytics } from '@/components/ui/cobe-globe-analytics';

export default function HomeGlobalInvestors() {
  return (
    <section className="bg-white py-[89px] lg:py-[120px] border-t border-[#ebebeb] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#888] mb-4">
              Global Reach
            </p>
            <h2
              className="font-serif text-black font-normal leading-tight mb-6"
              style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}
            >
              Investors from around the world choose Bangalore
            </h2>
            <p className="font-sans text-[16px] text-[#555] leading-relaxed max-w-lg mb-4">
              From the United States and United Kingdom to the UAE, Singapore, Australia, and
              beyond — international investors are building wealth through Bangalore&apos;s rental
              income real estate market.
            </p>
            <p className="font-sans text-[16px] text-[#555] leading-relaxed max-w-lg mb-8">
              VJR Estate helps global buyers discover income-generating PG buildings, residential
              blocks, commercial assets, and plots across India&apos;s fastest-growing rental hub.
            </p>
            <Link
              to="/properties"
              className="inline-flex items-center gap-2 font-sans text-[13px] uppercase tracking-[0.1em] text-black border border-black px-7 py-3.5 hover:bg-black hover:text-white transition-colors"
            >
              Explore Bangalore Properties
              <ArrowRight size={16} />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="order-1 lg:order-2 w-full max-w-md mx-auto lg:max-w-none"
          >
            <GlobeAnalytics className="w-full max-w-[480px] mx-auto" />
            <p className="font-sans text-[11px] text-[#aaa] text-center mt-4 tracking-[0.08em] uppercase">
              Drag to explore · Arcs flow toward Bangalore
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
