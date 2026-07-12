import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { openWhatsAppPropertyEnquiry } from '@/utils/whatsappProperty';

export const VISIT_TIME_SLOTS = [
  '10:00 AM – 12:00 PM',
  '2:00 PM – 4:00 PM',
  '5:00 PM – 7:00 PM',
] as const;

export interface BookVisitProperty {
  id: string;
  title: string;
  type: string;
  area: string;
  price_label: string;
  monthly_rental_label?: string | null;
  contact_phone?: string;
  contact_name?: string;
}

interface BookVisitCalendarProps {
  property: BookVisitProperty;
  source?: 'detail' | 'card';
  onClose: () => void;
}

export default function BookVisitCalendar({
  property,
  source = 'detail',
  onClose,
}: BookVisitCalendarProps) {
  const [date, setDate] = useState<Date | undefined>();
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [contactError, setContactError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!date || !timeSlot) return;
    if (!buyerName.trim()) {
      setContactError('Please enter your name');
      return;
    }
    const digits = buyerPhone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setContactError('Please enter a valid 10-digit mobile number');
      return;
    }
    setContactError('');
    setSubmitting(true);
    try {
      const visitDate = format(date, 'PPP');
      await openWhatsAppPropertyEnquiry(
        {
          id: property.id,
          title: property.title,
          type: property.type,
          area: property.area,
          price_label: property.price_label,
          monthly_rental_label: property.monthly_rental_label,
          contact_phone: property.contact_phone,
          contact_name: property.contact_name,
        },
        {
          visitDate,
          visitTime: timeSlot,
          source,
          leadType: 'book_visit',
          buyerName: buyerName.trim(),
          buyerPhone: digits,
        },
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="bg-white"
    >
      <div className="border-b border-[#f0f0f0] px-4 py-4">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[#888]">
          Book a site visit
        </p>
        <p className="mt-1 line-clamp-2 font-sans text-[14px] font-medium text-black">
          {property.title}
        </p>
        <p className="mt-0.5 font-sans text-[12px] text-[#888]">
          {property.area} · {property.price_label}
        </p>
      </div>

      <div className="px-4 pt-4 pb-2">
        <p className="mb-2 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[#888]">
          Select date
        </p>
      </div>
      <div className="flex justify-center px-2">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={{ before: new Date() }}
          className="rounded-lg border border-[#e8e8e8]"
        />
      </div>

      <div className="px-4 pt-4 pb-2">
        <p className="mb-2 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[#888]">
          Select time slot
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {VISIT_TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setTimeSlot(slot)}
              className={`h-10 border font-sans text-[11px] transition-colors ${
                timeSlot === slot
                  ? 'border-black bg-black text-white'
                  : 'border-[#e8e8e8] bg-white text-[#444] hover:border-[#ccc]'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[#f0f0f0] px-4 pt-4 pb-2">
        <p className="mb-3 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[#888]">
          Your contact details
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-[#888]">
              Full Name *
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="h-10 w-full border border-[#e8e8e8] px-3 font-sans text-[13px] focus:border-black focus:outline-none"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-[#888]">
              Mobile Number *
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="h-10 w-full border border-[#e8e8e8] px-3 font-sans text-[13px] focus:border-black focus:outline-none"
              placeholder="10-digit number"
            />
          </div>
        </div>
        {contactError && <p className="mt-2 font-sans text-[11px] text-red-600">{contactError}</p>}
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4 pt-3">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!date || !timeSlot || !buyerName.trim() || buyerPhone.length < 10 || submitting}
          className="h-[46px] w-full rounded-lg bg-black text-[12px] uppercase tracking-[0.1em] text-white hover:bg-[#222]"
        >
          {submitting ? 'Confirming...' : 'Confirm & Continue on WhatsApp'}
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-full font-sans text-[12px] text-[#888] hover:text-black"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
