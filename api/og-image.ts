import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;

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

    const jpeg = await sharp(buf)
      .resize(WIDTH, HEIGHT, { fit: 'cover' })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).end(jpeg);
  } catch (e) {
    console.error('og-image error:', e);
    res.status(500).end('error');
  }
}

async function fetchProperty(id: string): Promise<{ image: string } | null> {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/properties/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const doc = await res.json();
  const fields = doc?.fields ?? {};
  const getArrayFirst = (key: string) => {
    const values = fields[key]?.arrayValue?.values;
    if (Array.isArray(values) && values.length > 0) return values[0]?.stringValue ?? '';
    return '';
  };

  const image = getArrayFirst('images') || (fields['cover_image']?.stringValue ?? '');
  return { image };
}
