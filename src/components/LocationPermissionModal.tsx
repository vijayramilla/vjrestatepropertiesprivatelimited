import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from '@phosphor-icons/react';

interface LocationPermissionModalProps {
  open: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

export default function LocationPermissionModal({
  open,
  onAllow,
  onSkip,
}: LocationPermissionModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const content = (
    <>
      <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-black shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
        <MapPin size={32} weight="duotone" className="text-white" />
      </div>
      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
        Personalise
      </p>
      <h2 className="font-serif text-center text-[26px] font-normal leading-tight text-gray-900 md:text-[28px]">
        Find Near Me
      </h2>
      <div className="mx-auto mt-4 mb-8 h-px w-12 bg-gray-200" />
      <button
        type="button"
        onClick={onAllow}
        className="w-full rounded-2xl bg-black py-4 text-[15px] font-semibold tracking-wide text-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-neutral-900 hover:shadow-[0_6px_28px_rgba(0,0,0,0.28)] active:scale-[0.98]"
      >
        Use My Location
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="mt-5 block w-full cursor-pointer text-center text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-gray-700"
      >
        Skip for now
      </button>
    </>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {isMobile ? (
            <div className="fixed inset-0 z-[100]">
              <motion.button
                type="button"
                aria-label="Dismiss"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                onClick={onSkip}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="location-modal-title"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="fixed bottom-0 left-0 right-0 rounded-t-[28px] border-t border-gray-100 bg-white px-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
              >
                <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-gray-200" />
                <div id="location-modal-title">{content}</div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="location-modal-title-desktop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-6 backdrop-blur-sm"
            >
              <button
                type="button"
                aria-label="Dismiss"
                className="absolute inset-0"
                onClick={onSkip}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-[340px] overflow-hidden rounded-[24px] border border-gray-100 bg-white px-10 py-11 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-black to-transparent opacity-80" />
                <div id="location-modal-title-desktop">{content}</div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
