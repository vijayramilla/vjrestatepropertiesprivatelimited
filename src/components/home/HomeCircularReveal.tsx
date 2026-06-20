import { motion } from 'framer-motion';
import { CircularRevealHeading } from '@/components/ui/circular-reveal-heading';

const CIRCULAR_ITEMS = [
  { text: 'PG Buildings' },
  { text: 'RESIDENTIAL' },
  { text: 'COMMERCIAL' },
  { text: 'PLOTS' },
];

export default function HomeCircularReveal() {
  return (
    <section className="bg-[#f5f5f5] py-[89px] lg:py-[120px] border-y border-[#ebebeb]">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#888] mb-3">
            What We Offer
          </p>
          <h2
            className="font-serif text-black font-normal leading-tight"
            style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}
          >
            Property Categories
          </h2>
          <p className="font-sans text-[15px] text-[#666] mt-4 max-w-md mx-auto">
            PG Buildings, residential, commercial, and plots — rental income assets across Bangalore.
          </p>
        </motion.div>

        <div className="flex justify-center">
          <CircularRevealHeading
            items={CIRCULAR_ITEMS}
            centerText={
              <div className="font-serif text-xl md:text-2xl font-normal text-[#444444] tracking-[0.06em] text-center leading-tight">
                VJR
                <br />
                ESTATE
              </div>
            }
            size="lg"
            className="max-lg:h-[400px] max-lg:w-[400px] max-sm:h-[300px] max-sm:w-[300px]"
          />
        </div>
      </div>
    </section>
  );
}
