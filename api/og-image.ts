import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const GOLD = '#C9A84C';
const GREEN = '#4ADE80';

export default async function handler(req: any, res: any) {
  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  if (!id) {
    res.status(400).end('missing id');
    return;
  }

  try {
    const property = await fetchProperty(id);
    if (!property?.image) {
      res.status(404).end('no image');
      return;
    }

    const imgRes = await fetch(property.image);
    if (!imgRes.ok) throw new Error(`image fetch failed: ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());

    // Full-bleed photo — the whole 1200x630 card is the property image,
    // like housing.com previews. Text sits on top of a dark gradient.
    const photo = await sharp(buf)
      .resize(WIDTH, HEIGHT, { fit: 'cover' })
      .toBuffer();

    const svg = buildOverlaySvg(property);

    const jpeg = await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 3,
        background: '#0b0f19',
      },
    })
      .composite([
        { input: photo, top: 0, left: 0 },
        { input: Buffer.from(svg), top: 0, left: 0 },
      ])
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).end(jpeg);
  } catch (e) {
    console.error('og-image error:', e);
    res.status(500).end('error');
  }
}

function escapeSvg(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

function buildOverlaySvg(p: OgProperty): string {
  const typeText = escapeSvg(truncate(`${p.type.toUpperCase()} · FOR SALE`, 30));
  // Rough glyph width at 19px + 1.5 letter-spacing, sized to the pill.
  const typePillW = Math.min(470, Math.max(200, typeText.length * 11 + 70));
  const typePillX = WIDTH - 48 - typePillW;
  const locationLine = escapeSvg(
    truncate(p.address ? `${p.address}, Bangalore` : 'Bangalore', 66),
  );
  const priceLine = escapeSvg(p.priceLabel);

  const extras: { text: string; green: boolean }[] = [];
  if (p.monthlyRental) extras.push({ text: `Rental Income ${escapeSvg(p.monthlyRental)}`, green: true });
  if (p.katha && p.katha !== '—' && p.katha !== 'Not Available') {
    extras.push({ text: `Katha ${escapeSvg(p.katha)}`, green: false });
  }
  const extrasTspans = extras
    .map((e, i) => {
      const sep = i > 0 ? '   ·   ' : '';
      const fill = e.green ? GREEN : 'rgba(255,255,255,0.72)';
      return `<tspan fill="${fill}">${sep}${e.text}</tspan>`;
    })
    .join('');

  return `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(0,0,0,0.62)"/>
        <stop offset="1" stop-color="rgba(0,0,0,0)"/>
      </linearGradient>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(0,0,0,0)"/>
        <stop offset="0.55" stop-color="rgba(0,0,0,0.55)"/>
        <stop offset="1" stop-color="rgba(0,0,0,0.92)"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${WIDTH}" height="150" fill="url(#topFade)"/>
    <rect x="0" y="190" width="${WIDTH}" height="440" fill="url(#bottomFade)"/>

    <!-- Brand chip -->
    <rect x="48" y="40" width="10" height="34" fill="${GOLD}"/>
    <text x="70" y="66" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" letter-spacing="3" fill="#ffffff">VJR ESTATE</text>

    <!-- Type chip -->
    <rect x="${typePillX}" y="40" width="${typePillW}" height="44" rx="22" fill="rgba(0,0,0,0.55)"/>
    <text x="${WIDTH - 48 - 20}" y="69" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="600" letter-spacing="1.5" fill="#ffffff">${typeText}</text>

    <!-- Price -->
    <text x="48" y="466" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" letter-spacing="-1" fill="#ffffff">${priceLine}</text>

    <!-- Location -->
    <text x="48" y="526" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="400" fill="rgba(255,255,255,0.9)">${locationLine}</text>

    <!-- Extras (rental income in green) -->
    <text x="48" y="580" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="500">${extrasTspans}</text>
  </svg>`;
}

interface OgProperty {
  type: string;
  priceLabel: string;
  address: string;
  monthlyRental: string;
  katha: string;
  image: string;
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

async function fetchProperty(id: string): Promise<OgProperty | null> {
  if (!SUPABASE_SERVICE_KEY) return null;
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

  return {
    type: row.type || 'Property',
    priceLabel: formatPrice(Number(row.price) || 0),
    address: row.area || row.location || '',
    monthlyRental: row.monthly_rental_label || formatRental(Number(row.monthly_rental) || 0),
    katha: row.katha || '',
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

function formatRental(n: number): string {
  if (n <= 0) return '';
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L/month`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}K/month`;
  return `₹${n.toLocaleString('en-IN')}/month`;
}
