import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { WhatsappLogo } from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';

export interface EnquiryContactDetails {
  name: string;
  phone: string;
  lat?: number;
  lng?: number;
}

interface PropertyEnquiryContactModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  listedBy?: string;
  onClose: () => void;
  onSubmit: (contact: EnquiryContactDetails) => void | Promise<void>;
}

export default function PropertyEnquiryContactModal({
  open,
  title = 'Your contact details',
  subtitle = 'We will connect you on WhatsApp.',
  submitLabel = 'Continue on WhatsApp',
  listedBy,
  onClose,
  onSubmit,
}: PropertyEnquiryContactModalProps) {
  const { user, signInWithGoogle } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [, setLocationDone] = useState(false);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => { if (open) getLocation(); }, [open]);

  const getLocation = (): Promise<void> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationDone(true);
        resolve();
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocating(false);
          setLocationDone(true);
          resolve();
        },
        () => {
          setLocating(false);
          setLocationDone(true);
          resolve();
        },
        { timeout: 10000, enableHighAccuracy: true },
      );
    });
  };

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

  const handleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      setSignedIn(true);
      await getLocation();
    } catch {
      onClose();
    } finally {
      setAuthLoading(false);
    }
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
      await onSubmit({ name: name.trim(), phone: digits, lat: coordsRef.current?.lat, lng: coordsRef.current?.lng });
      reset();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const needsAuth = !user && !signedIn;

  const showLocating = signedIn && locating;

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

            {needsAuth ? (
              <>
                <h3 className="font-display pr-8 text-xl text-gray-900">Sign in to continue</h3>
                <p className="mt-1 text-sm text-gray-500">Please sign in to contact the property {listedBy === 'Agent' ? 'agent' : 'owner'}.</p>
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={authLoading}
                  className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  <svg className="h-5 w-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.87 7.35 2.56 10.56l7.98-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg>
                  {authLoading ? 'Signing in…' : 'Sign in with Google'}
                </button>
              </>
            ) : showLocating ? (
              <>
                <h3 className="font-display pr-8 text-xl text-gray-900">Getting your location</h3>
                <p className="mt-1 text-sm text-gray-500">Please allow location access so we can pin your enquiry on the map.</p>
                <div className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  Locating…
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
