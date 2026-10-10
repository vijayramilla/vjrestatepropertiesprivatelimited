import type { BlogPost } from '../src/data/blogPosts';
import { blogPosts as fallbackPosts } from '../src/data/blogPosts';

/**
 * Blog RSS feed (`/api/blog-feed`).
 *
 * This is how Google News, Feedly, and other readers discover and subscribe
 * to the blog — alongside /sitemap.xml and the BlogPosting JSON-LD on each
 * article. Serves published posts from Strapi when it is reachable, and falls
 * back to the same static roster the public blog pages use, so the feed is
 * never empty.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.VITE_STRAPI_URL || 'http://localhost:1337';

interface FeedPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
}

function fromStrapiPost(post: any): FeedPost {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    author: post.author ?? 'VJR Estate Team',
    category: post.category ?? '',
  };
}

async function getPosts(): Promise<FeedPost[]> {
  try {
    const res = await fetch(`${STRAPI_URL}/api/blog-posts?sort=date:desc`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const json = await res.json();
      const posts = (json.data || []).map(fromStrapiPost).filter((p: FeedPost) => p.slug && p.title);
      if (posts.length > 0) return posts;
    }
  } catch {
    /* fall through to the static roster */
  }
  return fallbackPosts.map((p: BlogPost) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    date: p.date,
    author: p.author,
    category: p.category,
  }));
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RFC 822 date used by RSS (pubDate). */
function rfc822(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toUTCString();
}

export default async function handler(req: any, res: any) {
  const proto = req.headers?.['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = req.headers?.['x-forwarded-host'] ?? req.headers?.host ?? 'vjrestate.com';
  const origin = `${proto}://${host}`;

  const posts = await getPosts();
  const newest = posts
    .map((p) => new Date(p.date).getTime() || 0)
    .reduce((a, b) => Math.max(a, b), 0);

  const items = posts
    .map((p) => {
      const link = `${origin}/blog/${encodeURIComponent(p.slug)}`;
      const lines = [
        `    <item>`,
        `      <title>${escapeXml(p.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${rfc822(p.date)}</pubDate>`,
        `      <description>${escapeXml(p.excerpt)}</description>`,
        p.author ? `      <dc:creator>${escapeXml(p.author)}</dc:creator>` : '',
        p.category ? `      <category>${escapeXml(p.category)}</category>` : '',
        `    </item>`,
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>VJR Estate Blog — Bangalore Rental Income Property Insights</title>
    <link>${escapeXml(origin)}${'/blog'}</link>
    <description>Guides and market intel on buying and letting rental income properties in Bangalore — PG buildings, BBMP approval, rental yields and more.</description>
    <language>en-in</language>
    <lastBuildDate>${new Date(newest || Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(origin)}${'/api/blog-feed'}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  // Feed readers poll; the edge cache absorbs the traffic and revalidates hourly.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
