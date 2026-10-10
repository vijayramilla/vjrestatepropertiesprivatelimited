import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { HouseLine, ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';
import { callDataProxy, isSupabaseDataEnabled } from '@/lib/supabaseData';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * "List Your Property FREE" — Housing.com-style listing CTA anchored at
 * the bottom of the home hero. New visitors route into the partnership
 * how-it-works page; a signed-in registered partner (pending or active)
 * goes straight to the listing form — never back to the explainer.
 */
export default function HomeListPropertyCta() {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  // Existing partner? The backend decides from the verified session; the
  // default stays /partner until confirmed, so non-partners never skip
  // the explainer.
  const [partnerTarget, setPartnerTarget] = useState('/partner');
  useEffect(() => {
    if (!user || !isSupabaseDataEnabled()) return;
    let cancelled = false;
    void callDataProxy('partner.check', {}, {})
      .then((res) => {
        if (!cancelled && res?.registered) setPartnerTarget('/list-property');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
      className="relative z-10 w-full max-w-4xl"
    >
      <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link
          to={partnerTarget}
          className="group inline-flex h-11 items-center gap-2.5 self-start rounded-full bg-white pl-1.5 pr-5 text-[#0A1628] shadow-[0_14px_34px_rgba(3,8,16,0.4)] no-underline transition-[background-color,transform,box-shadow] duration-300 hover:-translate-y-[2px] hover:bg-[#FDFBF5] hover:shadow-[0_18px_42px_rgba(3,8,16,0.52)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4C877]"
        >
          <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E4C877] to-[#C9A84C] transition-shadow duration-300 group-hover:shadow-[0_4px_14px_rgba(201,168,76,0.5)]">
            <HouseLine size={15} weight="duotone" className="text-[#0A1628]" aria-hidden="true" />
          </span>
          <span className="whitespace-nowrap text-[13.5px] font-semibold tracking-[0.01em]">
            List Your Property
          </span>
          <span className="rounded-full bg-[#C9A84C]/15 px-1.5 py-[2px] text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#96782A]">
            Free
          </span>
          <ArrowRight
            size={14}
            weight="bold"
            aria-hidden="true"
            className="opacity-70 transition-transform duration-300 group-hover:translate-x-1 group-hover:opacity-100"
          />
        </Link>
        <span className="text-[10px] font-medium tracking-wide text-white/60 sm:border-l sm:border-white/20 sm:pl-4">
          Zero listing fee &middot; Owners, Builders &amp; Agents
        </span>
      </div>
    </motion.div>
  );
}
