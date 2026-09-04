const SITE_NAME = 'VJR Estate';
const FALLBACK_IMAGE = '/og-image.png';
// Bump this whenever the OG card design/dimensions change so WhatsApp
// (which caches link previews by exact URL) re-fetches the new image.
const OG_IMAGE_VERSION = 'v3';

export default async function handler(req: any, res: any) {
  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  const origin = req.headers?.['x-forwarded-proto'] === 'https'
    ? `https://${req.headers['x-forwarded-host'] ?? req.headers.host}`
    : `https://${req.headers.host}`;
  const canonical = id ? `${origin}/properties/${encodeURIComponent(id)}` : origin;

  let meta = {
    title: `${SITE_NAME} — Properties in Bangalore`,
    description: 'Explore residential and commercial rental income properties with VJR Estate.',
    image: `${origin}${FALLBACK_IMAGE}`,
  };

  if (id) {
    try {
      const property = await fetchProperty(id);
      if (property) {
        const facts = [
          property.price ? `Price: ${formatPrice(property.price)}` : '',
          property.monthlyRental ? `Rent: ${property.monthlyRental}` : '',
          property.katha ? `Katha: ${property.katha}` : '',
        ]
          .filter(Boolean)
          .join(' | ');
        const header = [
          property.type ? `${property.type.toUpperCase()} FOR SALE` : 'Property',
          property.location ? `${property.location}, Bangalore` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        meta = {
          title: `${facts ? `${facts} — ` : ''}${property.title}`,
          description: header,
          image: property.image
            ? `${origin}/api/og-image?id=${encodeURIComponent(id)}&v=${OG_IMAGE_VERSION}`
            : meta.image,
        };
      }
    } catch (e) {
      console.error('og-preview fetch error:', e);
    }
  }

  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`,
  ].join('\n    ');

  const html = await fetchAppShell(origin);
  const injected = id ? replaceSocialMeta(html, tags) : injectMeta(html, tags);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.status(200).end(injected);
}

async function fetchAppShell(origin: string): Promise<string> {
  try {
    const res = await fetch(`${origin}/`);
    if (!res.ok) throw new Error(`App shell fetch failed: ${res.status}`);
    return await res.text();
  } catch (e) {
    console.error('og-preview app shell fetch error:', e);
    return '<!doctype html><html><head></head><body></body></html>';
  }
}

function injectMeta(html: string, tags: string): string {
  return html.includes('<head>')
    ? html.replace('<head>', `<head>\n    ${tags}`)
    : `${tags}\n${html}`;
}

function replaceSocialMeta(html: string, tags: string): string {
  const cleaned = html
    .replace(/<title>[^<]*<\/title>/i, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:[^"']*["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:[^"']*["'][^>]*>/gi, '');
  return injectMeta(cleaned, tags);
}

const SUPABASE_URL =
  process.env.SUPABASE_REQ_URL ??
  process.env.VITE_SUPABASE_REQ_URL ??
  'https://eimvaxrmiizdlgonhiov.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_REQ_SERVICE_KEY ??
  process.env.VITE_SUPABASE_REQ_SERVICE_KEY ??
  '';

async function fetchProperty(id: string): Promise<{ title: string; location: string; type: string; price: number; monthlyRental: string; katha: string; image: string } | null> {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('og-preview: Supabase service key not set');
    return null;
  }

  const url = `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(id)}&select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row) return null;

  const title = row.title || row.property_code || 'Untitled Property';
  const location = row.area || row.location || '';
  const type = row.type || '';
  const price = Number(row.price) || 0;
  const monthlyRental = row.monthly_rental_label || '';
  const katha = row.katha || '';

  return {
    title: `${title}${location ? ` | ${location}` : ''} — ${SITE_NAME}`,
    location,
    type,
    price,
    monthlyRental,
    katha,
    image: firstImage(row.images),
  };
}

/** First usable image URL from the Supabase images array — entries may be plain
 *  URLs, JSON strings like {"publicUrl":"..."}, or objects with publicUrl. */
function firstImage(images: unknown): string {
  if (!Array.isArray(images)) return '';
  for (const entry of images) {
    const url = extractImageUrl(entry);
    if (url) return url;
  }
  return '';
}

function extractImageUrl(entry: unknown): string {
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    if (trimmed.startsWith('http')) return trimmed;
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed) as { publicUrl?: unknown };
        if (typeof parsed.publicUrl === 'string') return extractImageUrl(parsed.publicUrl);
      } catch {
        /* not JSON — not a usable URL */
      }
    }
    return '';
  }
  if (entry && typeof entry === 'object') {
    const maybe = (entry as { publicUrl?: unknown }).publicUrl;
    if (typeof maybe === 'string') return extractImageUrl(maybe);
  }
  return '';
}

function formatPrice(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
