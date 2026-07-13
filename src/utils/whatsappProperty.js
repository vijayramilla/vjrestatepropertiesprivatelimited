import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { savePropertyLead } from '@/lib/propertyLeads';
import { fetchUserLocation } from '@/lib/userTracking';
import { getPropertyShareUrl } from '@/lib/siteUrl';

import { siteContact } from '@/data/siteContact';

const WA_NUMBER = siteContact.phoneTel.replace('+', '');

function getTargetNumber(property) {
  if (property?.contact_phone) {
    const digits = String(property.contact_phone).replace(/\D/g, '');
    if (digits.length >= 10) return digits;
  }
  return WA_NUMBER;
}

function getGreeting(property) {
  if (property?.contact_phone) {
    const name = property?.contact_name || 'the owner';
    return `Hi ${name}, I'm interested in this property:`;
  }
  return "Hi VJR Estate, I'm interested in this property:";
}

export function buildWhatsAppMessage(property, extra = {}) {
  const { visitDate, visitTime, buyerName, buyerPhone } = extra;
  const url = getPropertyShareUrl(property.id);
  const monthlyLabel = property.monthly_rental_label ?? property.monthly_rental;
  const lines = [
    getGreeting(property),
  ];
  if (buyerName) {
    lines.push(`Name: ${buyerName}`);
  }
  if (buyerPhone) {
    lines.push(`Phone: ${buyerPhone}`);
  }
  lines.push(
    property.title,
    `${property.type ?? ''} · ${property.area}, Bangalore`.trim(),
    `Price: ${property.price_label}`,
  );
  if (monthlyLabel && monthlyLabel !== '—') {
    lines.push(`Monthly Income: ${monthlyLabel}`);
  }
  if (visitDate) {
    lines.push(`Preferred visit date: ${visitDate}`);
  }
  if (visitTime) {
    lines.push(`Preferred time: ${visitTime}`);
  }
  lines.push(url);
  return lines.join('\n');
}

export function getWhatsAppPropertyUrl(property, extra = {}) {
  const message = buildWhatsAppMessage(property, extra);
  const number = getTargetNumber(property);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Saves enquiry to admin dashboard, then opens WhatsApp.
 */
export async function openWhatsAppPropertyEnquiry(property, options = {}) {
  const {
    visitDate,
    visitTime,
    buyerName,
    buyerPhone,
    buyerLat,
    buyerLng,
    source = 'card',
    leadType = visitDate ? 'book_visit' : 'whatsapp',
  } = options;

  const message = buildWhatsAppMessage(property, { visitDate, visitTime, buyerName, buyerPhone });
  const propertyUrl = getPropertyShareUrl(property.id);

  let ownerUid, listedBy, ipAddress;
  try {
    const [propSnap, ipData] = await Promise.all([
      getDoc(doc(db, 'properties', String(property.id))),
      fetchUserLocation(),
    ]);
    if (propSnap.exists()) {
      ownerUid = propSnap.data().uid;
      listedBy = propSnap.data().listed_by;
    }
    if (ipData?.ip) ipAddress = ipData.ip;
  } catch {}

  try {
    await savePropertyLead({
      propertyId: String(property.id),
      propertyTitle: property.title,
      propertyType: property.type ?? '',
      propertyArea: property.area ?? '',
      propertyPrice: property.price_label ?? '',
      propertyMonthlyRental:
        property.monthly_rental_label ?? property.monthly_rental ?? undefined,
      propertyUrl,
      leadType,
      visitDate,
      visitTime,
      buyerName,
      buyerPhone,
      buyerLat,
      buyerLng,
      ownerUid,
      listedBy,
      ipAddress,
      source,
      message,
    });
  } catch (err) {
    console.error('Failed to save property lead:', err);
  }

  const url = getWhatsAppPropertyUrl(property, { visitDate, visitTime, buyerName, buyerPhone });
  window.open(url, '_blank', 'noopener,noreferrer');
}
