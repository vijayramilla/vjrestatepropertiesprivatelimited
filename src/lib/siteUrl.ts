/** Production canonical origin for share links, canonical tags and sitemaps. */
export const PRODUCTION_ORIGIN = 'https://www.vjrestate.com';

/** Canonical site origin for share links, OG tags, and WhatsApp messages. */
export function getSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, '');
  // A stale env value pointing at the bare domain must not leak into
  // canonicals, OG tags or sitemaps — the apex always resolves to www.
  if (fromEnv) return /^https?:\/\/vjrestate\.com$/i.test(fromEnv) ? PRODUCTION_ORIGIN : fromEnv;
  // Local dev keeps its own origin so generated links stay clickable. Every
  // deployed host (production and Vercel previews) resolves to production so a
  // preview URL can never become a page's canonical.
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)) {
    return window.location.origin;
  }
  return PRODUCTION_ORIGIN;
}

export function getPropertyShareUrl(propertyId: string | number): string {
  const origin = getSiteOrigin();
  const id = encodeURIComponent(String(propertyId).trim());
  return `${origin}/properties/${id}`;
}

export function getBlogPostUrl(slug: string): string {
  const origin = getSiteOrigin();
  return `${origin}/blog/${encodeURIComponent(String(slug).trim())}`;
}

export function getJobShareUrl(jobId: string): string {
  const origin = getSiteOrigin();
  const id = encodeURIComponent(String(jobId).trim());
  // Deep link that auto-opens the job's apply modal on the careers page.
  return `${origin}/careers?job=${id}`;
}
