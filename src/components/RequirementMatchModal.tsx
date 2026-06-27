import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import { House, Briefcase, WhatsappLogo } from '@phosphor-icons/react';
import type { PublicRequirement } from '@/lib/requirements';
import {
  formatBudgetRange,
  incrementRequirementClickCount,
} from '@/lib/requirements';
import { formatINR } from '@/lib/formatPrice';
import { siteContact } from '@/data/siteContact';

type Role = 'owner' | 'agent' | null;
type Step = 'role' | 'contact';

interface RequirementMatchModalProps {
  requirement: PublicRequirement | null;
  open: boolean;
  onClose: () => void;
}

const WA_NUMBER = siteContact.phoneTel.replace('+', '');

export default function RequirementMatchModal({
  requirement,
  open,
  onClose,
}: RequirementMatchModalProps) {
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<Role>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setStep('role');
    setRole(null);
    setName('');
    setPhone('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectRole = (r: Role) => {
    setRole(r);
    setStep('contact');
  };

  const buildWhatsAppMessage = () => {
    if (!requirement) return '';
    const budget = formatBudgetRange(requirement.budgetMin, requirement.budgetMax);
    const locations = requirement.locations.join(', ');
    const type =
      requirement.propertyType === 'Other'
        ? requirement.propertyTypeOther || 'Other'
        : requirement.propertyType;

    if (role === 'owner') {
      return `Hi VJR Estate,

I am a *Property Owner*.

My name is ${name}, ${phone}.

I have a property that may match:
*REQ ID: ${requirement.reqId}*
Type: ${type}
Location: ${locations}
Budget: ${formatINR(requirement.budgetMin) || budget} - ${formatINR(requirement.budgetMax) || budget}

Please get in touch with me.`;
    }

    return `Hi VJR Estate,

I am a *Real Estate Agent / Broker*.

My name is ${name}, ${phone}.

I have a listing that may match:
*REQ ID: ${requirement.reqId}*
Type: ${type}
Location: ${locations}
Budget: ${formatINR(requirement.budgetMin)} - ${formatINR(requirement.budgetMax)}

Please get in touch with me.`;
  };

  const handleSendWhatsApp = async () => {
    if (!requirement?.id) return;
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }

    const message = buildWhatsAppMessage();
    window.open(
      `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );

    try {
      await incrementRequirementClickCount(requirement.id);
    } catch {
      // WhatsApp already opened — ignore increment failure
    }

    handleClose();
  };

  if (!requirement) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center"
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

            {step === 'role' && (
              <div className="pt-2">
                <h3 className="font-display text-xl text-gray-900">Who are you?</h3>
                <p className="mt-1 font-mono text-xs text-gray-500">{requirement.reqId}</p>
                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => selectRole('owner')}
                    className="flex w-full items-center gap-4 border border-black p-4 text-left transition hover:bg-gray-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gray-200 bg-gray-50">
                      <House size={20} weight="thin" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Property Owner</p>
                      <p className="text-xs text-gray-500">I own a matching property</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRole('agent')}
                    className="flex w-full items-center gap-4 border border-black bg-black p-4 text-left text-white transition hover:bg-gray-900"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/20 bg-white/10">
                      <Briefcase size={20} weight="thin" className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Agent / Broker</p>
                      <p className="text-xs text-gray-400">I have a client listing</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === 'contact' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep('role')}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.1em] text-gray-500 hover:text-black"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <h3 className="font-display text-xl text-gray-900">Your details</h3>
                <p className="mt-1 text-sm text-gray-500">We&apos;ll connect you via WhatsApp</p>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">
                      Your Phone *
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                    />
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex h-12 w-full items-center justify-center gap-2 bg-[#25D366] text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:opacity-90"
                  >
                    <WhatsappLogo size={18} weight="fill" />
                    Send via WhatsApp
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
