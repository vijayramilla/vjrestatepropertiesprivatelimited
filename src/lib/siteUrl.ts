import { siteContact } from '@/data/siteContact';

/** Canonical site origin for share links, OG tags, and WhatsApp messages. */
export function getSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return window.location.origin;
  return siteContact.siteUrl;
}

export function getPropertyShareUrl(propertyId: string | number): string {
  const origin = getSiteOrigin();
  const id = encodeURIComponent(String(propertyId).trim());
  return `${origin}/properties/${id}`;
}
