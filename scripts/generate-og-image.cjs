/**
 * VJR Estate — premium static OG image generator.
 *
 * Generates public/og-image-v2.png (1200x630) used for the main website share
 * preview. Design matches the site brand: ink navy #0A1628, gold #C9A84C,
 * serif wordmark, circular logo badge from public/favicon.png.
 *
 * Run: node scripts/generate-og-image.cjs
 * Requires: sharp (already a dependency) + local system fonts (Garamond / Arial).
 */
const sharp = require('sharp');
const path = require('path');

const W = 1200;
const H = 630;

// Brand palette (same values used across the site UI)
const NAVY = '#0A1628';
const NAVY_LIGHT = '#1E3852';
const GOLD = '#C9A84C';
const GOLD_LIGHT = '#E8C76A';

/** Circular white badge holding the black circular logo mark. */
async function buildLogoBadge() {
  const LOGO_SIZE = 150;
  const disc = Buffer.from(`
    <svg width="${LOGO_SIZE}" height="${LOGO_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="disc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#F3EFE4"/>
        </linearGradient>
      </defs>
      <circle cx="75" cy="75" r="74" fill="url(#disc)"/>
    </svg>`);

  const logoBuf = await sharp(path.join(__dirname, '..', 'public', 'favicon.png'))
    .resize(LOGO_SIZE - 26, LOGO_SIZE - 26, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp(disc)
    .composite([{ input: logoBuf, top: 13, left: 13 }])
    .png()
    .toBuffer();
}

async function main() {
  const logoBadge = await buildLogoBadge();

  // ── Background card ──
  const svg = `
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${NAVY}"/>
        <stop offset="0.55" stop-color="#0E1E36"/>
        <stop offset="1" stop-color="${NAVY_LIGHT}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.42" r="0.75">
        <stop offset="0" stop-color="rgba(201,168,76,0.14)"/>
        <stop offset="1" stop-color="rgba(201,168,76,0)"/>
      </radialGradient>
      <linearGradient id="goldLockup" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(201,168,76,0)"/>
        <stop offset="0.5" stop-color="${GOLD}"/>
        <stop offset="1" stop-color="rgba(201,168,76,0)"/>
      </linearGradient>
    </defs>

    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>

    <!-- gold hairline frame -->
    <rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none" stroke="rgba(201,168,76,0.35)" stroke-width="2"/>
    <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="rgba(201,168,76,0.12)" stroke-width="1"/>

    <!-- skyline silhouette strip along the bottom -->
    <g fill="rgba(255,255,255,0.045)">
      <rect x="60"  y="470" width="70"  height="102"/>
      <rect x="140" y="430" width="90"  height="142"/>
      <rect x="240" y="490" width="60"  height="82"/>
      <rect x="310" y="410" width="80"  height="162"/>
      <rect x="400" y="455" width="70"  height="117"/>
      <rect x="480" y="440" width="95"  height="132"/>
      <rect x="585" y="475" width="65"  height="97"/>
      <rect x="660" y="415" width="85"  height="157"/>
      <rect x="755" y="465" width="70"  height="107"/>
      <rect x="835" y="430" width="90"  height="142"/>
      <rect x="935" y="480" width="60"  height="92"/>
      <rect x="1005" y="445" width="75" height="127"/>
      <rect x="1090" y="495" width="55" height="77"/>
    </g>

    <!-- ── Header: gold halo ring behind logo (badge composited in code) ── -->
    <circle cx="128" cy="124" r="84" fill="rgba(201,168,76,0.10)"/>
    <circle cx="128" cy="124" r="84" fill="none" stroke="rgba(201,168,76,0.45)" stroke-width="2"/>

    <!-- brand lockup text beside the logo -->
    <text x="272" y="118" font-family="Garamond" font-size="52" fill="#ffffff" letter-spacing="3">VJR Estate</text>
    <text x="274" y="158" font-family="Arial" font-size="19" fill="${GOLD_LIGHT}" letter-spacing="8">RENTAL INCOME PROPERTIES</text>

    <!-- vertical gold rule forming the brand lockup beside the logo -->
    <rect x="244" y="76" width="2" height="96" fill="url(#goldLockup)"/>

    <!-- ── Center statement ── -->
    <text x="600" y="310" text-anchor="middle" font-family="Garamond" font-size="88" fill="#ffffff" letter-spacing="1">Buy Rental Income Properties</text>
    <text x="600" y="378" text-anchor="middle" font-family="Garamond" font-size="36" fill="${GOLD_LIGHT}" letter-spacing="4">PG Buildings · Residential Blocks · Commercial Assets</text>

    <!-- ── Footer strip ── -->
    <text x="600" y="470" text-anchor="middle" font-family="Arial" font-size="23" fill="rgba(255,255,255,0.78)" letter-spacing="8">BANGALORE</text>
    <text x="600" y="552" text-anchor="middle" font-family="Arial" font-size="22" font-weight="bold" fill="${GOLD}" letter-spacing="6">VJRESTATE.COM</text>
  </svg>`;

  const background = await sharp(Buffer.from(svg)).png().toBuffer();

  await sharp(background)
    .composite([{ input: logoBadge, top: 49, left: 53 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(__dirname, '..', 'public', 'og-image-v2.png'));

  console.log('✓ wrote public/og-image-v2.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
