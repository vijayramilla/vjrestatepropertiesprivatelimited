import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { WhatsappLogo } from '@phosphor-icons/react';

export interface EnquiryContactDetails {
  name: string;
  phone: string;
}

interface PropertyEnquiryContactModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (contact: EnquiryContactDetails) => void | Promise<void>;
}

export default function PropertyEnquiryContactModal({
  open,
  title = 'Your contact details',
  subtitle = 'We will connect you with VJR Estate on WhatsApp.',
  submitLabel = 'Continue on WhatsApp',
  onClose,
  onSubmit,
}: PropertyEnquiryContactModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setPhone('');
    setError('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), phone: digits });
      reset();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-sm border border-gray-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 p-1 text-gray-400 transition hover:text-black"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <h3 className="font-display pr-8 text-xl text-gray-900">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoComplete="tel"
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                  placeholder="10-digit number"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center gap-2 bg-[#25D366] text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:opacity-90 disabled:opacity-60"
              >
                <WhatsappLogo size={18} weight="fill" />
                {submitting ? 'Opening…' : submitLabel}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
