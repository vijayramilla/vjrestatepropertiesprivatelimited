import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { blogPosts as fallbackPosts } from '@/data/blogPosts';
import type { BlogPost } from '@/data/blogPosts';
import { getBlogPosts, getBlogPostBySlug } from '@/lib/strapi';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const fallback = fallbackPosts.find((p) => p.slug === slug);
  const [post, setPost] = useState<BlogPost | undefined>(fallback);
  const [allPosts, setAllPosts] = useState<BlogPost[]>(fallbackPosts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    getBlogPostBySlug(slug)
      .then((p) => { if (p) setPost(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    getBlogPosts()
      .then(setAllPosts)
      .catch(() => {});
  }, []);

  if (!post && !loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-black">Post not found</p>
          <Link to="/blog" className="mt-3 inline-flex items-center gap-1 text-sm text-gray-500 underline underline-offset-2 hover:text-black">
            <ArrowLeft size={14} /> Back to blog
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white px-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <section className="bg-black px-4 py-16 sm:px-8 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto max-w-3xl"
        >
          <Link
            to="/blog"
            className="mb-6 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} /> Back to Blog
          </Link>

          <Badge className="mb-4 w-fit bg-white/10 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">
            {post.category}
          </Badge>

          <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          <div className="mt-5 flex items-center gap-3 text-sm">
            <Avatar className="h-9 w-9 ring-2 ring-white/10">
              <AvatarFallback className="bg-white/10 text-xs text-white">VE</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white/80">{post.author}</p>
              <div className="flex items-center gap-2 text-[11px] text-white/40">
                <span>{new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span>·</span>
                <Clock size={11} />
                <span>{post.readTime}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="mx-auto -mt-16 max-w-4xl px-4 sm:px-8"
      >
        <div className="overflow-hidden rounded-2xl shadow-xl">
          <img
            src={post.image}
            alt={post.title}
            className="w-full object-cover"
          />
        </div>
      </motion.div>

      <article className="mx-auto max-w-3xl px-4 pb-20 sm:px-8 sm:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-14"
        >
          {post.content.split('\n').map((paragraph, i) => {
            if (paragraph.startsWith('<h3>')) {
              const text = paragraph.replace(/<\/?h3>/g, '');
              return (
                <motion.h3
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="mt-12 mb-5 font-serif text-xl font-bold text-black sm:text-2xl"
                >
                  {text}
                </motion.h3>
              );
            }
            if (paragraph.startsWith('<strong>')) {
              const text = paragraph.replace(/<\/?strong>/g, '');
              return (
                <p key={i} className="mt-8 mb-3 text-sm font-semibold text-black">
                  {text}
                </p>
              );
            }
            if (paragraph.trim()) {
              return (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.03 }}
                  className="mb-5 text-[15px] leading-[1.9] text-gray-600 last:mb-0"
                >
                  {paragraph}
                </motion.p>
              );
            }
            return null;
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-14 rounded-2xl bg-gray-50 p-7 sm:p-9"
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 ring-2 ring-white">
              <AvatarFallback className="bg-gray-900 text-sm text-white">VE</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-black">{post.author}</p>
              <p className="text-xs text-gray-400">VJR Estate Properties Pvt. Ltd.</p>
            </div>
          </div>
        </motion.div>
      </article>

      <section className="border-t border-gray-100 bg-gray-50/50 px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-center font-serif text-2xl font-bold text-black sm:text-3xl">
            More Articles
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allPosts
              .filter((p) => p.slug !== slug)
              .slice(0, 3)
              .map((related) => (
                <Link key={related.slug} to={`/blog/${related.slug}`}>
                  <div className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-0.5">
                    <Badge className="mb-3 w-fit bg-black text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
                      {related.category}
                    </Badge>
                    <h3 className="font-serif text-base font-bold leading-snug text-black">
                      {related.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-gray-400">{related.readTime}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
