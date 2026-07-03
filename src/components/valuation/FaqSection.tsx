import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: 'How accurate is the AI valuation?',
    a: 'Our AI analyzes comparable sales, circle rates, and 30+ market signals across Bangalore. Confidence scores above 80% are highly reliable. We recommend cross-referencing with a local agent for final decisions.',
  },
  {
    q: 'What data does the valuation use?',
    a: 'Property type, locality, area, age, floor, facing, BHK, and construction status. The AI is trained on Bangalore-specific real estate data including recent registrations and market trends.',
  },
  {
    q: 'Is this a government-approved valuation?',
    a: 'This is an AI-powered market estimate, not a government-approved valuation. Use it for price negotiation, investment analysis, and listing guidance. For legal purposes, consult a registered valuer.',
  },
  {
    q: 'How often is the market data updated?',
    a: 'The AI model incorporates the latest available market trends. Individual property valuations reflect current asking prices, circle rates, and recent comparable sales in your locality.',
  },
  {
    q: 'Can I use this for loan applications?',
    a: 'Banks require their own approved valuers for loan processing. Use this estimate as a reference to understand your property\'s market standing before approaching a bank.',
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full max-w-2xl mx-auto space-y-2">
      {FAQS.map((faq, i) => {
        const isOpen = openIndex === i;

        return (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur-sm overflow-hidden transition-colors"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-900"
            >
              <span>{faq.q}</span>
              <CaretDown
                size={14}
                className={cn('shrink-0 text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 text-sm leading-relaxed text-gray-600">{faq.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </section>
  );
}
