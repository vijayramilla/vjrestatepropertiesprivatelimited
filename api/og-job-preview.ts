const SITE_NAME = 'VJR Estate';
const FALLBACK_IMAGE = '/og-image.png';
// Bump when the job OG card design changes so WhatsApp/social scrapers re-fetch.
const OG_JOB_IMAGE_VERSION = 'v1';

export default async function handler(req: any, res: any) {
  const jobId = typeof req.query?.job === 'string' ? req.query.job : '';
  const origin =
    req.headers?.['x-forwarded-proto'] === 'https'
      ? `https://${req.headers['x-forwarded-host'] ?? req.headers.host}`
      : `https://${req.headers.host}`;
  const canonical = jobId
    ? `${origin}/careers?job=${encodeURIComponent(jobId)}`
    : `${origin}/careers`;

  let meta = {
    title: `${SITE_NAME} — Careers`,
    description:
      'Join Bangalore\u2019s fastest-growing real estate platform. Explore open roles across sales, technology, marketing and more.',
    image: `${origin}${FALLBACK_IMAGE}`,
  };

  if (jobId) {
    try {
      const job = await fetchJob(jobId);
      if (job) {
        meta = {
          title: `Hiring: ${job.title} — ${SITE_NAME}`,
          description: [
            job.department,
            job.location,
            job.type,
            job.experience ? `${job.experience} exp` : '',
            job.salary ? `Salary ${job.salary}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
          image: `${origin}/api/og-job-image?id=${encodeURIComponent(jobId)}&v=${OG_JOB_IMAGE_VERSION}`,
        };
      }
    } catch (e) {
      console.error('og-job-preview fetch error:', e);
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
  const injected = jobId ? replaceSocialMeta(html, tags) : injectMeta(html, tags);

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
    console.error('og-job-preview app shell fetch error:', e);
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

async function fetchJob(jobId: string): Promise<{
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  salary: string;
} | null> {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('og-job-preview: VITE_FIREBASE_PROJECT_ID not set');
    return null;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/job_openings/${encodeURIComponent(jobId)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const doc = await res.json();
  const fields = doc?.fields ?? {};
  const getString = (key: string) => fields[key]?.stringValue ?? '';

  const title = getString('title') || 'Open Position';
  const department = getString('department') || 'VJR Estate';
  const location = getString('location') || 'Bangalore';
  const type = getString('type') || 'Full Time';
  const experience = getString('experience') || '';
  const salary = formatSalary(getString('salary') || '');

  return { title, department, location, type, experience, salary };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
