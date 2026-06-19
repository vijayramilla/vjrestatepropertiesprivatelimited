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
  document.title = DEFAULT_TITLE;
  setMeta('description', DEFAULT_DESCRIPTION);
  setMeta('og:title', DEFAULT_TITLE, true);
  setMeta('og:description', DEFAULT_DESCRIPTION, true);
  setMeta('og:site_name', SITE_NAME, true);
  setMeta('og:type', 'website', true);
  setMeta('twitter:title', DEFAULT_TITLE);
  setMeta('twitter:description', DEFAULT_DESCRIPTION);
}

export function setPropertyShareMeta(property: {
  title: string;
  area: string;
  type: string;
  priceLabel: string;
  imageUrl?: string;
}) {
  const title = `${property.title} — ${SITE_NAME}`;
  const description = `${property.type} in ${property.area}, Bangalore · ${property.priceLabel}`;
  const url = window.location.href;
  const image = property.imageUrl ?? `${window.location.origin}/og-image.png`;

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
