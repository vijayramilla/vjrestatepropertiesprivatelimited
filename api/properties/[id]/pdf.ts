import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import QRCode from 'qrcode';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

// Allow enough time + memory for the headless Chromium cold start on Vercel.
export const config = {
  maxDuration: 60,
  memory: 1536,
};

type FsValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  arrayValue?: { values?: FsValue[] };
  mapValue?: { fields?: Record<string, FsValue> };
  nullValue?: null;
};

type Fields = Record<string, FsValue>;

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  if (!id) {
    res.status(400).json({ error: 'Missing property id' });
    return;
  }

  let browser: any = null;
  try {
    const fields = await fetchPropertyDoc(id);
    if (!fields) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    const origin = buildOrigin(req);
    const propertyUrl = origin ? `${origin}/properties/${encodeURIComponent(id)}` : '';

    let qrDataUrl = '';
    if (propertyUrl) {
      try {
        qrDataUrl = await QRCode.toDataURL(propertyUrl, {
          width: 220,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
      } catch (e) {
        console.error('QR generation failed:', e);
      }
    }

    const html = buildPdfHtml(fields, qrDataUrl);
    const filename = buildFilename(getString(fields, 'title') || 'Property', id);

    const { executablePath, args, headless } = await resolveChromium();
    // puppeteer-core v25's defaultArgs() is async — awaiting it here is
    // REQUIRED, otherwise launch() receives a Promise as `args` and crashes.
    const launchArgs = await puppeteer.defaultArgs({ args, headless });
    browser = await puppeteer.launch({
      args: launchArgs,
      defaultViewport: { width: 1240, height: 1754, deviceScaleFactor: 1 },
      executablePath,
      headless,
    });

    const page = await browser.newPage();
    // networkidle0 waits for all images; fall back to DOM ready if an image hangs.
    try {
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 25000 });
    } catch {
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).end(pdf);
  } catch (err) {
    console.error('property-pdf error:', err);
    res.status(500).json({ error: 'Unable to generate the PDF. Please try again.' });
  } finally {
    if (browser) {
      try {
        const pages = await browser.pages();
        await Promise.all(pages.map((p) => p.close().catch(() => {})));
      } catch {}
      await browser.close().catch(() => {});
    }
  }
}

/* ------------------------------------------------------------------ */
/* Chromium resolution                                                 */
/* ------------------------------------------------------------------ */

/**
 * On Linux (Vercel/AWS Lambda) use the bundled @sparticuz/chromium binary.
 * Elsewhere (local dev on Windows/macOS) fall back to an installed Chrome,
 * since the bundled binary is a Linux-only build.
 */
async function resolveChromium(): Promise<{
  executablePath: string;
  args: string[];
  headless: boolean | 'shell';
}> {
  if (process.platform === 'linux') {
    try {
      return { executablePath: await chromium.executablePath(), args: chromium.args, headless: 'shell' };
    } catch (e) {
      console.error('property-pdf: bundled chromium failed to inflate:', e);
    }
  }
  const candidates = systemChromeCandidates();
  for (const p of candidates) {
    if (existsSync(p)) {
      console.log('property-pdf: using system Chrome at', p);
      return { executablePath: p, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], headless: true };
    }
  }
  // Last resort — only valid on Linux.
  return { executablePath: await chromium.executablePath(), args: chromium.args, headless: 'shell' };
}

function systemChromeCandidates(): string[] {
  const home = homedir();
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  if (process.platform === 'win32') {
    candidates.push(
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      `${home}/AppData/Local/Google/Chrome/Application/chrome.exe`,
      `${home}/AppData/Local/Chromium/Application/chrome.exe`,
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  return candidates;
}

/* ------------------------------------------------------------------ */
/* Firestore REST fetch (same pattern as api/og-image.ts)              */
/* ------------------------------------------------------------------ */

async function fetchPropertyDoc(id: string): Promise<Fields | null> {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('property-pdf: VITE_FIREBASE_PROJECT_ID not set');
    return null;
  }
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/properties/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const doc = await res.json();
  return doc?.fields ?? null;
}

/* ------------------------------------------------------------------ */
/* Field helpers                                                       */
/* ------------------------------------------------------------------ */

function getString(fields: Fields, key: string): string {
  const v = fields[key];
  if (!v || typeof v.stringValue !== 'string') return '';
  const raw = v.stringValue.trim();
  // '—' and 'Not Available' are the site's missing-value sentinels — omit the field.
  if (!raw || raw === '—' || raw === 'Not Available' || raw === 'N/A') return '';
  return v.stringValue;
}

function getNumber(fields: Fields, key: string): number | null {
  const v = fields[key];
  if (!v) return null;
  if (v.integerValue !== undefined) {
    const n = parseInt(v.integerValue, 10);
    return Number.isFinite(n) ? n : null;
  }
  if (v.doubleValue !== undefined && Number.isFinite(v.doubleValue)) return v.doubleValue;
  return null;
}

function getBool(fields: Fields, key: string): boolean | null {
  const v = fields[key];
  if (!v || v.booleanValue === undefined) return null;
  return v.booleanValue;
}

function getStringArray(fields: Fields, key: string): string[] {
  const values = fields[key]?.arrayValue?.values;
  if (!Array.isArray(values)) return [];
  return values
    .map((x) => x.stringValue)
    .filter((s): s is string => !!s && s.trim() !== '' && s.trim() !== '—');
}

function getMap(fields: Fields, key: string): Record<string, string> {
  const f = fields[key]?.mapValue?.fields;
  if (!f) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(f)) {
    if (val.stringValue !== undefined && val.stringValue.trim() !== '') out[k] = val.stringValue;
    else if (val.integerValue !== undefined) out[k] = parseInt(val.integerValue, 10).toLocaleString('en-IN');
    else if (val.doubleValue !== undefined && Number.isFinite(val.doubleValue)) out[k] = String(val.doubleValue);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

function trimZeros(n: string): string {
  return n.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function formatPrice(n: number): string {
  if (n >= 10000000) return `Rs. ${trimZeros((n / 10000000).toFixed(2))} Cr`;
  if (n >= 100000) return `Rs. ${trimZeros((n / 100000).toFixed(2))} L`;
  return `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
}

function formatMonthly(n: number): string {
  if (n >= 100000) return `Rs. ${trimZeros((n / 100000).toFixed(2))} L / month`;
  return `Rs. ${Math.round(n).toLocaleString('en-IN')} / month`;
}

function formatAreaSize(areaSqft: number | null, areaUnit: string, areaAcres: number | null, areaGuntas: number | null): string {
  if (areaUnit === 'acres' || (areaAcres && areaAcres > 0)) {
    const parts: string[] = [];
    if (areaAcres && areaAcres > 0) parts.push(`${areaAcres} acre${areaAcres > 1 ? 's' : ''}`);
    if (areaGuntas && areaGuntas > 0) parts.push(`${areaGuntas} gunta${areaGuntas > 1 ? 's' : ''}`);
    if (parts.length) return parts.join(' ');
  }
  if (areaSqft && areaSqft > 0) return `${areaSqft.toLocaleString('en-IN')} sq.ft`;
  return '';
}

/** Escape HTML and neutralise characters Open Sans cannot render. */
function cleanText(s: string): string {
  return s
    .replace(/₹/g, 'Rs.')
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F]/gu, '')
    .replace(/\u200D|\u20E3/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildFilename(title: string, id: string): string {
  const clean = title
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 80);
  return `${clean || 'Property'}-${id}.pdf`.replace(/[\\/]/g, '_');
}

function buildOrigin(req: any): string {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : '';
}

/* ------------------------------------------------------------------ */
/* PDF HTML template — neutral property document, no branding          */
/* ------------------------------------------------------------------ */

const PDF_CSS = `
  @page { size: A4; margin: 13mm 13mm 15mm 13mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Open Sans', 'Helvetica Neue', Arial, sans-serif;
    color: #1f2833; font-size: 10.5pt; line-height: 1.55; background: #fff;
  }
  .top-rule { height: 3px; background: #b3903f; margin-bottom: 18px; border-radius: 2px; }
  .type-chip {
    display: inline-block; font-size: 8.5pt; font-weight: 700; letter-spacing: 2.2px;
    text-transform: uppercase; color: #7a6426; border: 1px solid #d9c894;
    border-radius: 999px; padding: 3px 12px;
  }
  h1.title { font-size: 21pt; font-weight: 700; margin: 12px 0 4px; color: #111a24; line-height: 1.2; }
  .meta-line { font-size: 9pt; color: #8a939c; margin-bottom: 10px; }
  .location { font-size: 10.5pt; color: #4a5560; margin-bottom: 4px; }
  .hero-img-wrap { margin: 16px 0 4px; background: #f2f4f6; border-radius: 8px; overflow: hidden; }
  .hero-img-wrap img { display: block; width: 100%; max-height: 90mm; object-fit: contain; }
  .price-block { margin: 14px 0 6px; padding: 14px 16px; background: #f7f8f9; border: 1px solid #e6e9ec; border-radius: 8px; }
  .price-label { font-size: 8pt; letter-spacing: 1.8px; text-transform: uppercase; color: #8a939c; font-weight: 700; }
  .price { font-size: 20pt; font-weight: 700; color: #111a24; margin: 2px 0 4px; }
  .price-sub { font-size: 9.5pt; color: #4a5560; }
  section { margin-top: 18px; break-inside: avoid; }
  .sec-title {
    font-size: 10pt; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase;
    color: #b3903f; border-bottom: 1.5px solid #e8e4d6; padding-bottom: 5px; margin-bottom: 10px;
  }
  .facts { width: 100%; border-collapse: collapse; }
  .facts td { padding: 6px 8px; border-bottom: 1px solid #eef0f2; font-size: 10pt; vertical-align: top; }
  .facts td.k { color: #6b7680; width: 38%; padding-left: 0; }
  .facts td.v { color: #1f2833; font-weight: 600; text-align: right; }
  ul.list { margin: 0; padding: 0; list-style: none; }
  ul.list li { position: relative; padding: 5px 0 5px 18px; font-size: 10pt; color: #1f2833; }
  ul.list li::before {
    content: ''; position: absolute; left: 2px; top: 10px; width: 7px; height: 7px;
    border-radius: 2px; background: #b3903f;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    font-size: 9pt; color: #33404c; background: #f4f6f8; border: 1px solid #e2e6ea;
    border-radius: 999px; padding: 3px 10px;
  }
  .desc p { margin: 0 0 8px; font-size: 10pt; color: #2a3540; }
  .gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .gallery-item { break-inside: avoid; background: #f2f4f6; border-radius: 6px; overflow: hidden; }
  .gallery-item img { display: block; width: 100%; max-height: 62mm; object-fit: contain; }
  .qr-row { margin-top: 22px; display: flex; justify-content: flex-end; }
  .qr-box { text-align: center; padding: 10px 12px; border: 1px solid #e6e9ec; border-radius: 8px; background: #fbfbfc; }
  .qr-box img { width: 96px; height: 96px; display: block; }
  .qr-label { margin-top: 6px; font-size: 8.5pt; font-weight: 700; letter-spacing: 1.2px; color: #4a5560; }
`;

function section(title: string, body: string): string {
  return `<section><div class="sec-title">${title}</div>${body}</section>`;
}

function factsTable(rows: { k: string; v: string }[]): string {
  if (!rows.length) return '';
  const trs = rows.map((r) => `<tr><td class="k">${r.k}</td><td class="v">${r.v}</td></tr>`).join('');
  return `<table class="facts">${trs}</table>`;
}

export function buildPdfHtml(fields: Fields, qrDataUrl: string): string {
  const title = cleanText(getString(fields, 'title'));
  const type = cleanText(getString(fields, 'type'));
  const subtype = cleanText(getString(fields, 'commercial_subtype') || getString(fields, 'plot_subtype'));
  const propertyCode = cleanText(getString(fields, 'propertyCode'));
  const areaText = cleanText(getString(fields, 'area'));
  const locationText = cleanText(getString(fields, 'location'));

  const priceNum = getNumber(fields, 'price');
  const priceLabelRaw = getString(fields, 'price_label');
  const monthlyNum = getNumber(fields, 'monthly_rental');
  const monthlyLabelRaw = getString(fields, 'monthly_rental_label');
  const yieldNum = getNumber(fields, 'rental_yield');
  const ppsfNum = getNumber(fields, 'price_per_sqft');
  const areaSqft = getNumber(fields, 'area_sqft');
  const builtUp = getNumber(fields, 'built_up_area_sqft');
  const areaUnit = getString(fields, 'area_unit');
  const areaAcres = getNumber(fields, 'area_acres');
  const areaGuntas = getNumber(fields, 'area_guntas');
  const floorCount = getNumber(fields, 'floor_count');
  const totalUnits = getNumber(fields, 'total_units');
  const availableUnits = getNumber(fields, 'available_units');
  const occupancy = getNumber(fields, 'occupancy_percent');

  const images = (fields.images?.arrayValue?.values ?? [])
    .map((x) => x.stringValue)
    .filter((s): s is string => !!s && isValidImageUrl(s));
  const heroImage = images[0] ?? '';
  const galleryImages = images.slice(1);

  // ---- Price line -------------------------------------------------
  const price = priceNum && priceNum > 0 ? formatPrice(priceNum) : cleanText(priceLabelRaw);
  const monthly = monthlyNum && monthlyNum > 0 ? formatMonthly(monthlyNum) : cleanText(monthlyLabelRaw);
  const priceSub: string[] = [];
  if (monthly) priceSub.push(`Monthly income · ${monthly}`);
  if (yieldNum && yieldNum > 0) priceSub.push(`Rental yield · ${yieldNum}%`);
  if (ppsfNum && ppsfNum > 0) priceSub.push(`Rs. ${Math.round(ppsfNum).toLocaleString('en-IN')} / sq.ft`);

  // ---- Key facts ---------------------------------------------------
  const keyFacts: { k: string; v: string }[] = [];
  if (type) keyFacts.push({ k: 'Property type', v: subtype ? `${type} · ${subtype}` : type });
  if (price) keyFacts.push({ k: 'Price', v: price });
  if (monthly) keyFacts.push({ k: 'Monthly income', v: monthly });
  if (yieldNum && yieldNum > 0) keyFacts.push({ k: 'Rental yield', v: `${yieldNum}%` });
  const areaSize = formatAreaSize(areaSqft, areaUnit, areaAcres, areaGuntas);
  if (areaSize) keyFacts.push({ k: 'Area', v: areaSize });
  if (builtUp && builtUp > 0) keyFacts.push({ k: 'Built-up area', v: `${builtUp.toLocaleString('en-IN')} sq.ft` });
  if (ppsfNum && ppsfNum > 0) keyFacts.push({ k: 'Price / sq.ft', v: `Rs. ${Math.round(ppsfNum).toLocaleString('en-IN')}` });
  if (floorCount && floorCount > 0) keyFacts.push({ k: 'Floors', v: String(floorCount) });
  if (totalUnits && totalUnits > 0) keyFacts.push({ k: 'Total units', v: String(totalUnits) });
  if (availableUnits && availableUnits > 0) keyFacts.push({ k: 'Available units', v: String(availableUnits) });
  if (occupancy && occupancy > 0) keyFacts.push({ k: 'Occupancy', v: `${occupancy}%` });

  const facing = cleanText(getString(fields, 'facing'));
  const age = cleanText(getString(fields, 'age'));
  const katha = cleanText(getString(fields, 'katha'));
  const statusRaw = getString(fields, 'status');
  const status = statusRaw === 'Ready' ? 'Ready to Move' : statusRaw ? cleanText(statusRaw) : '';
  const dimensions = cleanText(getString(fields, 'dimensions'));
  if (dimensions) keyFacts.push({ k: 'Dimensions', v: dimensions });
  if (facing) keyFacts.push({ k: 'Facing', v: facing });
  if (age) keyFacts.push({ k: 'Age', v: age });
  if (katha && katha !== 'Not Available' && katha !== '—') keyFacts.push({ k: 'Katha', v: katha });
  if (status) keyFacts.push({ k: 'Status', v: status });

  const bbmp = getBool(fields, 'bbmp_approved');
  const loanEligible = getBool(fields, 'bank_loan_eligible');
  const clearTitle = getBool(fields, 'clear_title');
  if (bbmp !== null) keyFacts.push({ k: 'BBMP approved', v: bbmp ? 'Yes' : 'No' });
  if (loanEligible !== null) keyFacts.push({ k: 'Bank loan eligible', v: loanEligible ? 'Yes' : 'No' });
  if (clearTitle !== null) keyFacts.push({ k: 'Clear title', v: clearTitle ? 'Yes' : 'No' });

  // ---- Highlights / amenities / description ------------------------
  const highlights = getStringArray(fields, 'highlights').map(cleanText);
  const amenities = getStringArray(fields, 'amenities').map(cleanText);
  const descriptionRaw = getString(fields, 'description');

  // ---- Extra details map (property-specific stored extras) ---------
  const extra = getMap(fields, 'extra_details');
  const locationKey = Object.keys(extra).find((k) => /lat|long|coordinate|map link/i.test(k));
  const extraRows: { k: string; v: string }[] = [];
  for (const [k, v] of Object.entries(extra)) {
    if (k === locationKey) continue;
    const cleanK = cleanText(k);
    const cleanV = cleanText(v);
    if (cleanK && cleanV && cleanV !== '—') extraRows.push({ k: cleanK, v: cleanV });
  }

  // ---- Assemble sections --------------------------------------------
  const parts: string[] = [];

  parts.push(`<div class="top-rule"></div>`);
  parts.push(`${type ? `<div class="type-chip">${type}</div>` : ''}`);
  parts.push(`<h1 class="title">${title}</h1>`);
  const metaBits: string[] = [];
  if (propertyCode) metaBits.push(`ID: ${propertyCode}`);
  parts.push(`<div class="meta-line">${metaBits.join(' · ')}</div>`);
  const locationBits = [areaText, locationText].filter(Boolean);
  if (locationBits.length) parts.push(`<div class="location">${locationBits.join(', ')}</div>`);

  if (heroImage) {
    parts.push(`<div class="hero-img-wrap"><img src="${heroImage}" alt="" onerror="this.style.display='none'" /></div>`);
  }

  if (price || priceSub.length) {
    parts.push(
      `<div class="price-block">` +
        `<div class="price-label">Asking price</div>` +
        (price ? `<div class="price">${price}</div>` : '') +
        (priceSub.length ? `<div class="price-sub">${priceSub.join(' · ')}</div>` : '') +
        `</div>`,
    );
  }

  if (keyFacts.length) parts.push(section('Property details', factsTable(keyFacts)));
  if (highlights.length) {
    parts.push(section('Highlights', `<ul class="list">${highlights.map((h) => `<li>${h}</li>`).join('')}</ul>`));
  }
  if (amenities.length) {
    parts.push(section('Amenities', `<div class="chips">${amenities.map((a) => `<span class="chip">${a}</span>`).join('')}</div>`));
  }
  if (descriptionRaw) {
    const paras = descriptionRaw
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${cleanText(p)}</p>`)
      .join('');
    if (paras) parts.push(section('Description', `<div class="desc">${paras}</div>`));
  }
  if (extraRows.length) parts.push(section('Additional details', factsTable(extraRows)));

  if (galleryImages.length) {
    const items = galleryImages
      .map((img) => `<div class="gallery-item"><img src="${img}" alt="" onerror="this.style.display='none'" /></div>`)
      .join('');
    parts.push(section('Photo gallery', `<div class="gallery">${items}</div>`));
  }

  if (qrDataUrl) {
    parts.push(
      `<div class="qr-row"><div class="qr-box">` +
        `<img src="${qrDataUrl}" alt="" />` +
        `<div class="qr-label">View Property</div>` +
        `</div></div>`,
    );
  }

  return `<!doctype html><html><head><meta charset="utf-8" /><style>${PDF_CSS}</style></head><body>${parts.join('')}</body></html>`;
}
