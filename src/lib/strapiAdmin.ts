const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;
const ADMIN_EMAIL = import.meta.env.VITE_STRAPI_ADMIN_EMAIL || 'admin@vjrestate.com';
const ADMIN_PASSWORD = import.meta.env.VITE_STRAPI_ADMIN_PASSWORD || 'Admin123!';

let token: string | null = null;

async function login(): Promise<string> {
  if (!STRAPI_URL) throw new Error('Strapi URL not configured');
  const res = await fetch(`${STRAPI_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error('Strapi admin login failed');
  const json = await res.json();
  token = json.data.token;
  return token!;
}

async function authHeaders(): Promise<HeadersInit> {
  if (!token) await login();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface StrapiBlogEntry {
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
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getAdminBlogPosts(): Promise<{ results: StrapiBlogEntry[]; pagination: any }> {
  const headers = await authHeaders();
  const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::blog-post.blog-post`, { headers });
  if (!res.ok) throw new Error('Failed to fetch blog posts');
  return res.json();
}

export async function getAdminBlogPost(documentId: string): Promise<StrapiBlogEntry> {
  const headers = await authHeaders();
  const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::blog-post.blog-post/${documentId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch blog post');
  const json = await res.json();
  return json.data;
}

export async function createAdminBlogPost(data: Record<string, any>): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::blog-post.blog-post`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create blog post');
  return res.json();
}

export async function updateAdminBlogPost(documentId: string, data: Record<string, any>): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::blog-post.blog-post/${documentId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update blog post');
  return res.json();
}

export async function deleteAdminBlogPost(documentId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::blog-post.blog-post/${documentId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete blog post');
}

export async function publishAdminBlogPosts(documentIds: string[]): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::blog-post.blog-post/actions/bulkPublish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ documentIds }),
  });
  if (!res.ok) throw new Error('Failed to publish blog posts');
  return res.json();
}

export async function unpublishAdminBlogPosts(documentIds: string[]): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::blog-post.blog-post/actions/bulkUnpublish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ documentIds }),
  });
  if (!res.ok) throw new Error('Failed to unpublish blog posts');
  return res.json();
}
