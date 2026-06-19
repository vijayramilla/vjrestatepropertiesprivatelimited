import { savePropertyLead } from '@/lib/propertyLeads';

import { siteContact } from '@/data/siteContact';

const WA_NUMBER = siteContact.phoneTel.replace('+', '');

export function buildWhatsAppMessage(property, extra = {}) {
  const { visitDate, visitTime } = extra;
  const url = `${window.location.origin}/properties/${property.id}`;
  const monthlyLabel = property.monthly_rental_label ?? property.monthly_rental;
  const lines = [
    "Hi VJR Estate, I'm interested in this property:",
    property.title,
    `${property.type ?? ''} · ${property.area}, Bangalore`.trim(),
    `Price: ${property.price_label}`,
  ];
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
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Saves enquiry to admin dashboard, then opens WhatsApp.
 */
export async function openWhatsAppPropertyEnquiry(property, options = {}) {
  const {
    visitDate,
    visitTime,
    source = 'card',
    leadType = visitDate ? 'book_visit' : 'whatsapp',
  } = options;

  const message = buildWhatsAppMessage(property, { visitDate, visitTime });
  const propertyUrl = `${window.location.origin}/properties/${property.id}`;

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
      message,
      source,
    });
  } catch (err) {
    console.error('Failed to save property lead:', err);
  }

  const url = getWhatsAppPropertyUrl(property, { visitDate, visitTime });
  window.open(url, '_blank', 'noopener,noreferrer');
}
