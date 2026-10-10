import { getBlogPostUrl, getJobShareUrl, getPropertyShareUrl, getSiteOrigin } from '@/lib/siteUrl';

const SITE_NAME = 'VJR Estate';
const DEFAULT_TITLE =
  'VJR Estate | Buy Rental Income Properties in Bangalore — PG Buildings & Commercial Assets';
const DEFAULT_DESCRIPTION =
  "VJR Estate is Bangalore's only dedicated rental income property platform. Buy curated PG buildings, residential rental blocks and commercial income properties with monthly income data. Rental income specialists for Bangalore.";

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
  setMeta('og:image', `${origin}/og-image-v2.png`, true);
  setMeta('twitter:title', DEFAULT_TITLE);
  setMeta('twitter:description', DEFAULT_DESCRIPTION);
  setMeta('twitter:image', `${origin}/og-image-v2.png`);
}

// Keep in sync with OG_IMAGE_VERSION in api/og-preview.ts — bumping it forces
// WhatsApp/social scrapers to re-crawl the preview instead of using a stale one.
const OG_IMAGE_VERSION = 'v3';

/** Set a fixed page title + description (non-shareable pages). */
export function setPageMeta(title: string, description: string) {
  document.title = title;
  setMeta('description', description);
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  setMeta('og:site_name', SITE_NAME, true);
  setMeta('og:type', 'website', true);
  setMeta('og:url', `${getSiteOrigin()}/`, true);
  setMeta('og:image', `${getSiteOrigin()}/og-image-v2.png`, true);
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', `${getSiteOrigin()}/og-image-v2.png`);
}

export function setPropertyShareMeta(property: {
  id: string;
  title: string;
  area: string;
  type: string;
  priceLabel: string;
  /** Any image URL; only used as a "has image" check (the sized card is always served). */
  imageUrl?: string;
}) {
  const title = `${property.title} — ${SITE_NAME}`;
  const description = `${property.type} in ${property.area}, Bangalore · ${property.priceLabel}`;
  const origin = getSiteOrigin();
  const url = getPropertyShareUrl(property.id);
  // For properties with photos serve the sized card; otherwise the static fallback
  // (the card endpoint returns 404 for image-less properties).
  const image = property.imageUrl
    ? `${origin}/api/og-image?id=${encodeURIComponent(property.id)}&v=${OG_IMAGE_VERSION}`
    : `${origin}/og-image-v2.png`;

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

// Keep in sync with OG_JOB_IMAGE_VERSION in api/og-job-preview.ts.
const OG_JOB_IMAGE_VERSION = 'v1';

export function setBlogPageMeta() {
  const origin = getSiteOrigin();
  const url = `${origin}/blog`;
  const title = 'Property Investment Blog | VJR Estate';
  const description =
    "Guides and market insights on buying rental income properties in Bangalore — PG buildings, BBMP approval, rental yields and more from VJR Estate specialists.";

  document.title = title;
  setMeta('description', description);
  setCanonical(url);
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  setMeta('og:type', 'website', true);
  setMeta('og:url', url, true);
  setMeta('og:image', `${origin}/og-image-v2.png`, true);
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', `${origin}/og-image-v2.png`);
}

export function setBlogPostShareMeta(post: {
  slug: string;
  title: string;
  excerpt: string;
  image?: string;
  date?: string;
  author?: string;
}) {
  const origin = getSiteOrigin();
  const url = getBlogPostUrl(post.slug);
  const image = post.image || `${origin}/og-image-v2.png`;

  document.title = `${post.title} | VJR Estate`;
  setMeta('description', post.excerpt);
  setCanonical(url);
  setMeta('og:title', post.title, true);
  setMeta('og:description', post.excerpt, true);
  setMeta('og:type', 'article', true);
  setMeta('og:url', url, true);
  setMeta('og:image', image, true);
  if (post.date) setMeta('article:published_time', new Date(post.date).toISOString(), true);
  if (post.author) setMeta('article:author', post.author, true);
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', post.title);
  setMeta('twitter:description', post.excerpt);
  setMeta('twitter:image', image);
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

function setJsonLd(data: Record<string, unknown> | Array<Record<string, unknown>>) {
  const id = 'jsonld-blog';
  document.getElementById(id)?.remove();
  const el = document.createElement('script');
  el.id = id;
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(data);
  document.head.appendChild(el);
}

/** BlogPosting structured data so Google can show author/date on the result. */
export function setBlogPostJsonLd(post: { slug: string; title: string; excerpt?: string; image?: string; date?: string; author?: string; readTime?: string }) {
  const origin = getSiteOrigin();
  const url = getBlogPostUrl(post.slug);
  setJsonLd([
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      image: post.image ? [post.image] : undefined,
      datePublished: post.date,
      dateModified: post.date,
      author: { '@type': 'Organization', name: post.author || 'VJR Estate' },
      publisher: {
        '@type': 'Organization',
        name: 'VJR Estate',
        logo: { '@type': 'ImageObject', url: `${origin}/og-image-v2.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      url,
      inLanguage: 'en-IN',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${origin}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ]);
}

/** Blog index structured data, injected on /blog. */
export function setBlogIndexJsonLd() {
  const origin = getSiteOrigin();
  setJsonLd([
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'VJR Estate Blog',
      url: `${origin}/blog`,
      inLanguage: 'en-IN',
      description:
        'Guides and market insights on buying rental income properties in Bangalore — PG buildings, BBMP approval, rental yields and more.',
      publisher: { '@type': 'Organization', name: 'VJR Estate' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${origin}/blog` },
      ],
    },
  ]);
}

export function setJobShareMeta(job: {
  id: string;
  title: string;
  department: string;
  salary: string;
  location: string;
  type: string;
  experience: string;
}) {
  const title = `Hiring: ${job.title} — ${SITE_NAME}`;
  const description = [
    job.department,
    job.location,
    job.type,
    job.experience ? `${job.experience} exp` : '',
    job.salary ? `Salary ${job.salary}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const origin = getSiteOrigin();
  const url = getJobShareUrl(job.id);
  const image = `${origin}/api/og-job-image?id=${encodeURIComponent(job.id)}&v=${OG_JOB_IMAGE_VERSION}`;

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
