import type { BlogPost } from '@/data/blogPosts';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

interface StrapiPost {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  category: string;
  image: string;
  readTime: string;
  publishedAt: string;
}

function mapStrapiPost(post: StrapiPost): BlogPost {
  return {
    id: String(post.documentId),
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    date: post.date,
    author: post.author,
    category: post.category,
    image: post.image,
    readTime: post.readTime,
  };
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const res = await fetch(`${STRAPI_URL}/api/blog-posts`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Strapi error: ${res.status}`);
  const json = await res.json();
  return (json.data || []).map(mapStrapiPost);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const res = await fetch(
    `${STRAPI_URL}/api/blog-posts?filters[slug][$eq]=${encodeURIComponent(slug)}`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Strapi error: ${res.status}`);
  const json = await res.json();
  if (!json.data || json.data.length === 0) return null;
  return mapStrapiPost(json.data[0]);
}
