import { getPropertyShareUrl, getSiteOrigin } from '@/lib/siteUrl';

const SITE_NAME = 'VJR Estate';
const DEFAULT_TITLE = 'VJR Estate | Buy Rental Income Properties in Bangalore';
const DEFAULT_DESCRIPTION =
  "Bangalore's most trusted rental income property company. Curated PG buildings, residential rentals, and commercial assets.";

function setMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function setDefaultSiteMeta() {
  const origin = getSiteOrigin();
  document.title = DEFAULT_TITLE;
  setMeta('description', DEFAULT_DESCRIPTION);
  setMeta('og:title', DEFAULT_TITLE, true);
  setMeta('og:description', DEFAULT_DESCRIPTION, true);
  setMeta('og:site_name', SITE_NAME, true);
  setMeta('og:type', 'website', true);
  setMeta('og:url', `${origin}/`, true);
  setMeta('og:image', `${origin}/og-image.png`, true);
  setMeta('twitter:title', DEFAULT_TITLE);
  setMeta('twitter:description', DEFAULT_DESCRIPTION);
  setMeta('twitter:image', `${origin}/og-image.png`);
}

export function setPropertyShareMeta(property: {
  id: string;
  title: string;
  area: string;
  type: string;
  priceLabel: string;
  imageUrl?: string;
}) {
  const title = `${property.title} — ${SITE_NAME}`;
  const description = `${property.type} in ${property.area}, Bangalore · ${property.priceLabel}`;
  const origin = getSiteOrigin();
  const url = getPropertyShareUrl(property.id);
  const image = property.imageUrl ?? `${origin}/og-image.png`;

  document.title = title;
  setMeta('description', description);
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  setMeta('og:site_name', SITE_NAME, true);
  setMeta('og:type', 'website', true);
  setMeta('og:url', url, true);
  setMeta('og:image', image, true);
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', image);
}
