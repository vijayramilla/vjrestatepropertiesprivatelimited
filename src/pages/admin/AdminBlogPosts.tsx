import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pencil, Trash, Plus, Check, X as XIcon, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminPageShell, AdminPageHeader, AdminSkeletonList, AdminEmptyState } from '@/components/admin/AdminUi';
import { getAdminBlogPosts, deleteAdminBlogPost, publishAdminBlogPosts, unpublishAdminBlogPosts, type StrapiBlogEntry } from '@/lib/strapiAdmin';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminBlogPosts() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<StrapiBlogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminBlogPosts();
      setPosts(data.results || []);
    } catch {
      setError('Could not connect to Strapi — ensure the server is running on port 1337.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (documentId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await deleteAdminBlogPost(documentId);
      setPosts((p) => p.filter((x) => x.documentId !== documentId));
    } catch {
      alert('Failed to delete');
    }
  };

  const togglePublish = async (documentId: string, currentlyPublished: boolean) => {
    try {
      if (currentlyPublished) {
        await unpublishAdminBlogPosts([documentId]);
      } else {
        await publishAdminBlogPosts([documentId]);
      }
      setPosts((p) =>
        p.map((x) =>
          x.documentId === documentId
            ? { ...x, publishedAt: currentlyPublished ? null : new Date().toISOString() }
            : x
        )
      );
    } catch {
      alert('Failed to toggle publish');
    }
  };

  const container = {
    animate: { transition: { staggerChildren: 0.06 } },
  };

  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
  };

  return (
    <AdminLayout title="Blog Posts">
      <AdminPageShell>
        <div className="flex items-center justify-between gap-3">
          <AdminPageHeader title="Blog Posts" eyebrow="Content" />
          <button
            type="button"
            onClick={() => navigate('/admin/blog/new')}
            className="admin-btn-primary flex h-10 shrink-0 items-center gap-2 px-4 text-sm"
          >
            <Plus size={16} />
            New Post
          </button>
        </div>

        {loading ? (
          <AdminSkeletonList count={5} />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button type="button" onClick={fetchPosts} className="mt-3 text-xs text-red-600 underline underline-offset-2 hover:text-red-800">Retry</button>
          </div>
        ) : posts.length === 0 ? (
          <AdminEmptyState
            title="No blog posts yet"
            description="Create your first blog post to get started."
            action={
              <button
                type="button"
                onClick={() => navigate('/admin/blog/new')}
                className="admin-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Plus size={16} />
                New Post
              </button>
            }
          />
        ) : (
          <motion.div variants={container} initial="initial" animate="animate" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <motion.div key={post.documentId} variants={fadeUp}>
                <Card className="group h-full overflow-hidden border-gray-200 shadow-sm transition-all duration-500 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="relative h-44 overflow-hidden">
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100">
                        <span className="text-xs text-gray-400">No image</span>
                      </div>
                    )}
                    <div className="absolute left-3 top-3">
                      <Badge className="bg-white/90 text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-700 shadow-sm backdrop-blur-sm hover:bg-white/90">
                        {post.category}
                      </Badge>
                    </div>
                    <div className="absolute right-3 top-3 flex gap-1">
                      <button
                        type="button"
                        onClick={() => togglePublish(post.documentId, !!post.publishedAt)}
                        className="rounded-lg bg-white/80 p-1.5 text-gray-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-black"
                        title={post.publishedAt ? 'Unpublish' : 'Publish'}
                      >
                        {post.publishedAt ? <Check size={14} className="text-green-600" /> : <XIcon size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/blog/${post.documentId}/edit`)}
                        className="rounded-lg bg-white/80 p-1.5 text-gray-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-black"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.documentId)}
                        className="rounded-lg bg-white/80 p-1.5 text-gray-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-red-600"
                        title="Delete"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <p className="font-serif text-sm font-bold leading-snug text-black line-clamp-2">
                      {post.title}
                    </p>
                    {post.excerpt && (
                      <p className="line-clamp-2 text-[13px] leading-relaxed text-gray-500">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
                      <span>{formatDate(post.date)}</span>
                      <span className="text-gray-300">·</span>
                      <Clock size={11} />
                      <span>{post.readTime}</span>
                      <span className="ml-auto">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                          post.publishedAt ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {post.publishedAt ? 'Published' : 'Draft'}
                        </span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AdminPageShell>
    </AdminLayout>
  );
}
