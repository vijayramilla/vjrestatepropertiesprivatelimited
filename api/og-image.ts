import sharp from 'sharp';

const WIDTH = 1200;
const PHOTO_HEIGHT = 660;
const PANEL_HEIGHT = 240;
const HEIGHT = PHOTO_HEIGHT + PANEL_HEIGHT;
const BLACK = '#111827';
const GRAY = '#f3f4f6';
const GREEN = '#25D366';

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

    const photo = await sharp(buf)
      .resize(WIDTH, PHOTO_HEIGHT, { fit: 'cover' })
      .toBuffer();

    const svg = buildPanelSvg(property);

    const jpeg = await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 3,
        background: '#ffffff',
      },
    })
      .composite([
        { input: photo, top: 0, left: 0 },
        { input: Buffer.from(svg), top: PHOTO_HEIGHT, left: 0 },
      ])
      .jpeg({ quality: 82, mozjpeg: true })
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

function buildPanelSvg(p: OgProperty): string {
  const typeLine = escapeSvg(`${p.type.toUpperCase()} FOR SALE`);
  const locationLine = escapeSvg(`${p.address || 'Prime Location'}, Bangalore`);
  const priceLine = escapeSvg(p.priceLabel);
  const extras: string[] = [];
  if (p.monthlyRental) extras.push(`Rental Income: ${escapeSvg(p.monthlyRental)}`);
  if (p.katha && p.katha !== '—' && p.katha !== 'Not Available') {
    extras.push(`Katha: ${escapeSvg(p.katha)}`);
  }
  const extrasLine = escapeSvg(extras.join('   ·   '));

  return `
  <svg width="${WIDTH}" height="${PANEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${PANEL_HEIGHT}" fill="white"/>
    <rect x="0" y="0" width="12" height="${PANEL_HEIGHT}" fill="black"/>
    <text x="44" y="58" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="1" fill="#6b7280">${typeLine}</text>
    <text x="44" y="116" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="${BLACK}">${priceLine}</text>
    <text x="44" y="172" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="400" fill="#4b5563">${locationLine}</text>
    <text x="44" y="212" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="400" fill="#9ca3af">${extrasLine}</text>
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