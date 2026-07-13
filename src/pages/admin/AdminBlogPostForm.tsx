import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminPageShell } from '@/components/admin/AdminUi';
import { getAdminBlogPost, createAdminBlogPost, updateAdminBlogPost } from '@/lib/strapiAdmin';

const CATEGORIES = ['Investment', 'Local Guide', 'Market Intel', 'Sell Smart'];

export default function AdminBlogPostForm() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const isEdit = !!documentId;

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    author: 'VJR Estate Team',
    category: 'Local Guide',
    image: '',
    readTime: '5 min read',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (!documentId) return;
    getAdminBlogPost(documentId)
      .then((post) => {
        setForm({
          title: post.title || '',
          slug: post.slug || '',
          excerpt: post.excerpt || '',
          content: post.content || '',
          date: post.date || '',
          author: post.author || 'VJR Estate Team',
          category: post.category || 'Local Guide',
          image: post.image || '',
          readTime: post.readTime || '5 min read',
        });
      })
      .catch(() => {
        setFetchError('Could not load this post. Ensure the Strapi server is running on port 1337.');
      })
      .finally(() => setLoading(false));
  }, [documentId]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'title' && !isEdit) {
        next.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await updateAdminBlogPost(documentId!, form);
      } else {
        await createAdminBlogPost(form);
      }
      navigate('/admin/blog');
    } catch {
      alert('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Edit Blog Post">
        <AdminPageShell>
          <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
        </AdminPageShell>
      </AdminLayout>
    );
  }

  if (fetchError) {
    return (
      <AdminLayout title="Edit Blog Post">
        <AdminPageShell>
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="text-sm font-medium text-red-800">{fetchError}</p>
            <button type="button" onClick={() => navigate('/admin/blog')} className="mt-3 text-xs text-red-600 underline underline-offset-2 hover:text-red-800">Back to posts</button>
          </div>
        </AdminPageShell>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isEdit ? 'Edit Blog Post' : 'New Blog Post'}>
      <AdminPageShell>
        <button
          type="button"
          onClick={() => navigate('/admin/blog')}
          className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 transition-colors hover:text-black"
        >
          <ArrowLeft size={14} /> Back to Blog Posts
        </button>

        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-black"
              placeholder="Blog post title"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-black"
              placeholder="blog-post-slug"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-black"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Category</label>
              <select
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-black"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Author</label>
              <input
                type="text"
                value={form.author}
                onChange={(e) => handleChange('author', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-black"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Read Time</label>
              <input
                type="text"
                value={form.readTime}
                onChange={(e) => handleChange('readTime', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-black"
                placeholder="5 min read"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Image URL</label>
            <input
              type="url"
              value={form.image}
              onChange={(e) => handleChange('image', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-black"
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Excerpt</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-black"
              placeholder="Short summary of the post"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Content (HTML)</label>
            <textarea
              value={form.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={16}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 font-mono text-sm text-black outline-none transition-all focus:border-black"
              placeholder="Blog post content with HTML tags..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="admin-btn-primary flex h-10 items-center gap-2 px-5 text-sm disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : isEdit ? 'Update Post' : 'Create Post'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/blog')}
              className="h-10 rounded-lg border border-gray-200 px-5 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:text-black"
            >
              Cancel
            </button>
          </div>
        </form>
      </AdminPageShell>
    </AdminLayout>
  );
}
