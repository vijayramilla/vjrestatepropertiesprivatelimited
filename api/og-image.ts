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

async function fetchProperty(id: string): Promise<OgProperty | null> {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/properties/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const doc = await res.json();
  const fields = doc?.fields ?? {};
  const getString = (key: string) => fields[key]?.stringValue ?? '';
  const getNumber = (key: string) => {
    const v = fields[key];
    if (!v) return 0;
    if (v.integerValue !== undefined) return parseInt(v.integerValue, 10) || 0;
    if (v.doubleValue !== undefined) return v.doubleValue || 0;
    return 0;
  };
  const getArrayFirst = (key: string) => {
    const values = fields[key]?.arrayValue?.values;
    if (Array.isArray(values) && values.length > 0) return values[0]?.stringValue ?? '';
    return '';
  };

  const type = getString('type') || 'Property';
  const price = getNumber('price');
  const monthlyRental = getString('monthly_rental_label') || formatRental(getNumber('monthly_rental'));
  const katha = getString('katha');
  const address = getString('area') || getString('location') || '';

  return {
    type,
    priceLabel: formatPrice(price),
    address,
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

function formatRental(n: number): string {
  if (n <= 0) return '';
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L/month`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}K/month`;
  return `₹${n.toLocaleString('en-IN')}/month`;
}
