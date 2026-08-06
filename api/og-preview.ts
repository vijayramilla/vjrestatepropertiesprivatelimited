const SITE_NAME = 'VJR Estate';
const FALLBACK_IMAGE = '/og-image.png';

export default async function handler(req: any, res: any) {
  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  const origin = req.headers?.['x-forwarded-proto'] === 'https'
    ? `https://${req.headers['x-forwarded-host'] ?? req.headers.host}`
    : `https://${req.headers.host}`;
  const canonical = id ? `${origin}/properties/${encodeURIComponent(id)}` : origin;

  let meta = {
    title: `${SITE_NAME} — Properties in Bangalore`,
    description: 'Explore residential, commercial and plot properties with VJR Estate.',
    image: `${origin}${FALLBACK_IMAGE}`,
  };

  if (id) {
    try {
      const property = await fetchProperty(id);
      if (property) {
        const facts = [
          property.price ? `Price: ₹${formatPrice(property.price)}` : '',
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
            ? `${origin}/api/og-image?id=${encodeURIComponent(id)}`
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

async function fetchProperty(id: string): Promise<{ title: string; location: string; type: string; price: number; monthlyRental: string; katha: string; image: string } | null> {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('og-preview: VITE_FIREBASE_PROJECT_ID not set');
    return null;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/properties/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const doc = await res.json();
  const fields = doc?.fields ?? {};
  const getString = (key: string) => fields[key]?.stringValue ?? '';
  const getArrayFirst = (key: string) => {
    const values = fields[key]?.arrayValue?.values;
    if (Array.isArray(values) && values.length > 0) return values[0]?.stringValue ?? '';
    return '';
  };
  const getNumber = (key: string) => {
    const v = fields[key];
    if (!v) return 0;
    if (v.integerValue !== undefined) return parseInt(v.integerValue, 10) || 0;
    if (v.doubleValue !== undefined) return v.doubleValue || 0;
    return 0;
  };

  const title = getString('title') || getString('propertyCode') || 'Untitled Property';
  const location = getString('area') || getString('location') || '';
  const type = getString('type') || '';
  const price = getNumber('price');
  const monthlyRental = getString('monthly_rental_label') || '';
  const katha = getString('katha') || '';

  return {
    title: `${title}${location ? ` | ${location}` : ''} — ${SITE_NAME}`,
    location,
    type,
    price,
    monthlyRental,
    katha,
    image: getArrayFirst('images') || getString('cover_image') || '',
  };
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
