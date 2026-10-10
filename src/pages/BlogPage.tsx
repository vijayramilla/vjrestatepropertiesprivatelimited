import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Loader2, Rss } from 'lucide-react';
import { blogPosts as fallbackPosts } from '@/data/blogPosts';
import { getBlogPosts } from '@/lib/strapi';
import { setBlogPageMeta, setBlogIndexJsonLd } from '@/lib/siteMeta';
import type { BlogPost } from '@/data/blogPosts';
import SupabaseImage from '@/components/common/SupabaseImage';

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
    setBlogPageMeta();
    setBlogIndexJsonLd();
    return () => {
      document.getElementById('jsonld-blog')?.remove();
    };
  }, []);

  useEffect(() => {
    getBlogPosts()
      .then(setPosts)
      .catch(() => { /* uses fallback */ })
      .finally(() => setLoading(false));
  }, []);

  const filtered = active === 'All'
    ? posts
    : posts.filter((p) => p.category === active);

  // Editorial layout: first post is the hero story, grid shows the rest.
  const [featured, ...rest] = filtered;

  return (
    <div className="bg-white">
      {/* Page header — matches other public pages, strong SEO anchor */}
      <header className="border-b border-gray-100 bg-gray-50/50 px-4 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Namma Bengaluru</p>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Property Investment Blog
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500 sm:text-[15px]">
            Guides and market intel on buying and letting rental income properties in Bangalore —
            written by the VJR Estate team.
          </p>
          <nav aria-label="Blog categories" className="mt-6 flex flex-wrap gap-2">
            {hotTopics.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActive(cat)}
                aria-pressed={active === cat}
                className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-all ${
                  active === cat
                    ? 'bg-[#0A1628] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
          <a
            href="/api/blog-feed"
            className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400 transition-colors hover:text-black"
            title="Subscribe to the VJR Estate blog feed"
          >
            <Rss size={12} /> RSS Feed
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && featured && active === 'All' && (
          <section aria-labelledby="editor-pick" className="mb-12 pt-10">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="editor-pick" className="text-base font-semibold text-black">Editor's Pick</h2>
            </div>
            <Link to={`/blog/${featured.slug}`}>
              <motion.article
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="group grid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-500 hover:shadow-lg sm:grid-cols-5"
              >
                <div className="h-56 sm:col-span-3 sm:h-auto">
                  <SupabaseImage
                    src={featured.image}
                    alt={featured.title}
                    preset="hero"
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
              </motion.article>
            </Link>
          </section>
        )}

        {!loading && rest.length > 0 && (
          <section aria-label="All articles">
            <motion.div
              variants={container}
              initial="initial"
              animate="animate"
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {rest.map((post) => (
                <motion.div key={post.slug} variants={fadeUp}>
                  <Link to={`/blog/${post.slug}`}>
                    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-500 hover:shadow-lg hover:-translate-y-0.5">
                      <div className="relative h-48 overflow-hidden">
                        <SupabaseImage
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
                        <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
                          <span>{new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className="text-gray-300">·</span>
                          <Clock size={11} />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-sm text-gray-400">No posts in this category yet.</p>
          </div>
        )}

        {/* Newsletter/CTA block — the conversion point every big blog has */}
        <section className="mt-20 rounded-2xl bg-[#0A1628] px-6 py-12 text-center sm:px-12">
          <h2 className="font-serif text-xl font-bold text-white sm:text-2xl">
            Looking to buy a rental income property?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">
            Browse verified PG buildings and rental blocks in Bangalore with live monthly income
            data, or talk to our team for a curated shortlist.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/properties"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[13px] font-semibold text-[#0A1628] transition-transform hover:scale-[1.02]"
            >
              Browse Properties <ArrowRight size={14} />
            </Link>
            <Link
              to="/contact"
              className="rounded-full border border-white/20 px-6 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              Talk to Us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
