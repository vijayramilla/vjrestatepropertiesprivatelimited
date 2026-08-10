import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const GOLD = '#C9A84C';
const GOLD_LIGHT = '#D6B85D';

export default async function handler(req: any, res: any) {
  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  if (!id) {
    res.status(400).end('missing id');
    return;
  }

  try {
    const job = await fetchJob(id);
    if (!job) {
      res.status(404).end('not found');
      return;
    }

    const svg = buildJobSvg(job);
    const jpeg = await sharp(Buffer.from(svg))
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).end(jpeg);
  } catch (e) {
    console.error('og-job-image error:', e);
    res.status(500).end('error');
  }
}

function escapeSvg(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** Wrap a title into at most 2 lines (Arial bold ~58px, usable width 1104px). */
function wrapTitle(title: string): string[] {
  const MAX_PER_LINE = 32;
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > MAX_PER_LINE && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= 1) return [truncate(lines[0] ?? title, MAX_PER_LINE)];
  return [truncate(lines[0], MAX_PER_LINE), truncate(lines[1], MAX_PER_LINE)];
}

function buildJobSvg(job: OgJob): string {
  const dept = escapeSvg(truncate(job.department.toUpperCase(), 22));
  const deptColor = /^#[0-9a-fA-F]{6}$/.test(job.departmentColor) ? job.departmentColor : GOLD;

  const [titleLine1, titleLine2] = wrapTitle(job.title);
  const title1 = escapeSvg(titleLine1);
  const title2 = titleLine2 ? escapeSvg(titleLine2) : '';

  const salaryLine = escapeSvg(truncate(job.salary, 40));
  const location = escapeSvg(truncate(job.location, 24));
  const type = escapeSvg(truncate(job.type, 18));
  const experience = escapeSvg(truncate(job.experience, 20));
  const metaLine = `${location}   ·   ${type}   ·   ${experience}`;

  // "WE ARE HIRING" pill (right aligned)
  const pillW = 250;
  const pillX = WIDTH - 48 - pillW;

  // "APPLY NOW" CTA pill (bottom right)
  const ctaText = 'APPLY NOW →';
  const ctaW = 250;
  const ctaX = WIDTH - 48 - ctaW;

  const titleBlock = title2
    ? `
    <text x="48" y="340" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" letter-spacing="-1" fill="#ffffff">${title1}</text>
    <text x="48" y="412" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" letter-spacing="-1" fill="#ffffff">${title2}</text>`
    : `
    <text x="48" y="360" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="800" letter-spacing="-1" fill="#ffffff">${title1}</text>`;

  return `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0A1628"/>
        <stop offset="0.55" stop-color="#12283f"/>
        <stop offset="1" stop-color="#1a2f4e"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.88" cy="0.06" r="0.8">
        <stop offset="0" stop-color="rgba(201,168,76,0.4)"/>
        <stop offset="1" stop-color="rgba(201,168,76,0)"/>
      </radialGradient>
      <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
        <path d="M56 0H0V56" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      </pattern>
    </defs>

    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
    <rect width="${WIDTH}" height="6" fill="${GOLD}"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>

    <!-- Brand -->
    <rect x="48" y="44" width="10" height="34" fill="${GOLD}"/>
    <text x="70" y="70" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" letter-spacing="3" fill="#ffffff">VJR ESTATE</text>

    <!-- Hiring pill -->
    <rect x="${pillX}" y="44" width="${pillW}" height="44" rx="22" fill="rgba(0,0,0,0.35)" stroke="rgba(201,168,76,0.55)" stroke-width="1.5"/>
    <circle cx="${pillX + 26}" cy="66" r="5" fill="${GOLD}"/>
    <text x="${pillX + 42}" y="71" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" letter-spacing="1.5" fill="${GOLD_LIGHT}">WE ARE HIRING</text>

    <!-- Department -->
    <circle cx="50" cy="258" r="8" fill="${deptColor}"/>
    <text x="72" y="266" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600" letter-spacing="2" fill="rgba(255,255,255,0.85)">${dept}</text>

    <!-- Title -->
    ${titleBlock}

    <!-- Meta -->
    <text x="48" y="478" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="400" fill="rgba(255,255,255,0.78)">${metaLine}</text>

    <!-- Salary -->
    <text x="48" y="550" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="800" letter-spacing="-0.5" fill="${GOLD}">${salaryLine}</text>

    <!-- Footer: URL + CTA -->
    <text x="48" y="604" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="600" letter-spacing="1.5" fill="rgba(255,255,255,0.55)">vjrestate.com/careers</text>
    <rect x="${ctaX}" y="566" width="${ctaW}" height="58" rx="29" fill="${GOLD}"/>
    <text x="${ctaX + ctaW / 2}" y="603" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="800" letter-spacing="1.5" fill="#0A1628">${ctaText}</text>
  </svg>`;
}

interface OgJob {
  title: string;
  department: string;
  type: string;
  location: string;
  experience: string;
  salary: string;
  departmentColor: string;
}

/** Convert a legacy "₹8-15 LPA" string to monthly at display time. */
function formatSalary(salary: string): string {
  const m = salary.match(/₹?\s*([\d.]+)\s*-\s*([\d.]+)\s*LPA/i);
  if (!m) return salary;
  const toMonthly = (lpa: number): string => {
    const monthly = (lpa * 100000) / 12;
    if (monthly >= 100000) {
      const lakhs = monthly / 100000;
      return `₹${lakhs.toFixed(2).replace(/\.?0+$/, '')}L`;
    }
    return `₹${Math.round(monthly / 1000)}K`;
  };
  const start = m.index ?? 0;
  const prefix = salary.slice(0, start).trim();
  const suffix = salary.slice(start + m[0].length).trim();
  const base = `${toMonthly(parseFloat(m[1]))}-${toMonthly(parseFloat(m[2]))} per month`;
  return [prefix, base, suffix].filter(Boolean).join(' ');
}

async function fetchJob(id: string): Promise<OgJob | null> {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/job_openings/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const doc = await res.json();
  const fields = doc?.fields ?? {};
  const getString = (key: string) => fields[key]?.stringValue ?? '';

  const title = getString('title') || 'Open Position';
  const department = getString('department') || 'VJR Estate';
  const type = getString('type') || 'Full Time';
  const location = getString('location') || 'Bangalore';
  const experience = getString('experience') || '';
  const salary = formatSalary(getString('salary') || '');
  const departmentColor = getString('department_color') || '#C9A84C';

  return { title, department, type, location, experience, salary, departmentColor };
}
