import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock } from '@phosphor-icons/react';
import { blogPosts } from '@/data/blogPosts';
import LazyImage from '@/components/common/LazyImage';

const POSTS = blogPosts.slice(0, 3);

export default function HomeInsights() {
  return (
    <section className="bg-white py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
              <span className="inline-block h-px w-8 bg-[#C9A84C]" />
              Insights & Guides
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
              Latest From Our Blog
            </h2>
          </div>
          <Link
            to="/blog"
            className="hidden shrink-0 items-center gap-1 border-b border-black pb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-black transition hover:border-[#C9A84C] hover:text-[#C9A84C] sm:inline-flex"
          >
            View all articles
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {POSTS.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Link
                to={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:shadow-[0_16px_40px_rgba(10,22,40,0.1)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                  <LazyImage
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0A1628] backdrop-blur-sm">
                    {post.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-sm font-bold leading-snug text-[#0A1628] line-clamp-2 transition-colors group-hover:text-[#C9A84C]">
                    {post.title}
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-gray-500 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Clock size={12} weight="fill" />
                      {post.readTime}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#C9A84C]">
                      Read
                      <ArrowRight size={12} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
