import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { AppleCalendarPicker, type DateTimeSelection } from '@/components/ui/apple-calendar-picker';
import { Button } from '@/components/ui/button';
import { openWhatsAppPropertyEnquiry } from '@/utils/whatsappProperty';

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
  const [visit, setVisit] = useState<DateTimeSelection>({
    date: new Date(),
    time: '10:00 AM',
  });
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [contactError, setContactError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, []);

  const handleConfirm = async () => {
    if (!visit) return;
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
      const visitDate = format(visit.date, 'PPP');
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
          visitTime: visit.time,
          source,
          leadType: 'book_visit',
          buyerName: buyerName.trim(),
          buyerPhone: digits,
          buyerLat: coords.lat,
          buyerLng: coords.lng,
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
          Select date & time
        </p>
      </div>
      <div className="flex justify-center px-2 pb-2">
        <AppleCalendarPicker
          initialDate={visit.date}
          minDate={new Date()}
          onDateTimeSelect={setVisit}
        />
      </div>

      {/* Selection summary */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between border border-[#e8e8e8] px-3 py-2.5">
          <div>
            <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-[#888]">
              Visit scheduled
            </p>
            <p className="mt-0.5 font-sans text-[13px] font-medium text-black">
              {format(visit.date, 'EEEE, d MMM yyyy')}
            </p>
          </div>
          <p className="font-numeric text-[13px] font-semibold text-[#C9A84C]">{visit.time}</p>
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
          disabled={!visit || !buyerName.trim() || buyerPhone.length < 10 || submitting}
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
