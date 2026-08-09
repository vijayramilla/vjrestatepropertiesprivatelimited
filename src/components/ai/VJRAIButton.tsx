import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, X, Sparkles } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import VJRAIPanel from './VJRAIPanel';
import type { UserRole } from '../../ai/ragEngine';

/**
 * Floating launcher for Nexa — VJR Estate's property intelligence assistant.
 * Sits bottom-right; the panel slides in over the page.
 */
export default function VJRAIButton({
  userRole = 'public',
  className = 'bottom-5 right-5 sm:bottom-6 sm:right-6',
}: {
  userRole?: UserRole;
  /** Tailwind position classes for the fixed container (defaults: bottom-right). */
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const reduceMotion = useReducedMotion();
  const { nexaEnabled } = useSiteSettings();

  // Site-wide toggle: admin can hide the Nexa bot entirely from Settings.
  if (!nexaEnabled) return null;

  return (
    <>
      {/* Panel self-manages mount/unmount + slide animation via its own AnimatePresence. */}
      <VJRAIPanel isOpen={isOpen} onClose={() => setIsOpen(false)} userRole={userRole} />

      {/* Launcher */}
      <div className={`fixed z-[115] flex flex-col items-end gap-2 ${className}`}>
        {/* Tooltip bubble */}
        <AnimatePresence>
          {!isOpen && !dismissed && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative max-w-[210px] rounded-2xl border border-[#C9A84C]/30 bg-[#0A1628] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
            >
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white/30 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                aria-label="Dismiss tip"
              >
                <X size={12} />
              </button>
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-white">
                <Sparkles size={13} className="text-[#C9A84C]" />
                Nexa
              </p>
              <p className="mt-0.5 pr-4 text-[11px] leading-snug text-white/60">
                Ask me anything about Bangalore properties, yields, EMI &amp; auctions
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main button */}
        <motion.button
          type="button"
          onClick={() => {
            setIsOpen((o) => !o);
            setDismissed(true);
          }}
          whileHover={reduceMotion ? undefined : { scale: 1.08 }}
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          aria-label={isOpen ? 'Close Nexa assistant' : 'Open Nexa assistant'}
          aria-expanded={isOpen}
          className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#E8C76A]/60 bg-gradient-to-br from-[#C9A84C] to-[#E8C76A] shadow-[0_6px_24px_rgba(201,168,76,0.5),0_0_0_4px_rgba(201,168,76,0.15)] transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(201,168,76,0.65),0_0_0_6px_rgba(201,168,76,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
        >
          <Bot size={26} className="text-[#0A1628]" fill="currentColor" />
          {!isOpen && !dismissed && (
            <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-[#0A1628] bg-red-500" />
          )}
        </motion.button>
      </div>
    </>
  );
}
