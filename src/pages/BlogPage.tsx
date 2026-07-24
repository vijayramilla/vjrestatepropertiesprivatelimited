import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Loader2 } from 'lucide-react';
import { blogPosts as fallbackPosts } from '@/data/blogPosts';
import { getBlogPosts } from '@/lib/strapi';
import type { BlogPost } from '@/data/blogPosts';

const hotTopics = ['All', 'Investment', 'Local Guide', 'Market Intel', 'Sell Smart'];

const container = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function BlogPage() {
  const [active, setActive] = useState('All');
  const [posts, setPosts] = useState<BlogPost[]>(fallbackPosts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogPosts()
      .then(setPosts)
      .catch(() => { /* uses fallback */ })
      .finally(() => setLoading(false));
  }, []);

  const filtered = active === 'All'
    ? posts
    : posts.filter((p) => p.category === active);

  const featured = filtered[0];

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        <div className="mb-10 mt-10">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Namma Bengaluru</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {hotTopics.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActive(cat)}
                className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-all ${
                  active === cat
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {featured && active === 'All' && (
          <section className="mb-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-black">Editor's Pick</h2>
              <Link to="/blog" className="text-[12px] font-medium text-gray-400 hover:text-black transition-colors">
                View All →
              </Link>
            </div>
            <Link to={`/blog/${featured.slug}`}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="group grid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-500 hover:shadow-lg sm:grid-cols-5"
              >
                <div className="h-56 sm:col-span-3 sm:h-auto">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex flex-col justify-center p-6 sm:col-span-2 sm:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    {featured.category}
                  </p>
                  <h3 className="mt-3 font-serif text-xl font-bold leading-snug text-black sm:text-2xl">
                    {featured.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {featured.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-[12px] text-gray-400">
                    <span>{new Date(featured.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="text-gray-300">·</span>
                    <Clock size={12} />
                    <span>{featured.readTime}</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          </section>
        )}

        <motion.div
          variants={container}
          initial="initial"
          animate="animate"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((post) => (
            <motion.div key={post.slug} variants={fadeUp}>
              <Link to={`/blog/${post.slug}`}>
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-500 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute left-3 top-3">
                      <span className="rounded-md bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-700 shadow-sm backdrop-blur-sm">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-serif text-[16px] font-bold leading-snug text-black">
                      {post.title}
                    </h3>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-gray-500">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Clock size={11} />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            </motion.div>
          ))}
        </motion.div>

          {filtered.length === 0 && !loading && (
            <div className="py-24 text-center">
              <p className="text-sm text-gray-400">No posts in this category yet.</p>
            </div>
          )}
        </div>
        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
      </div>
    );
}
