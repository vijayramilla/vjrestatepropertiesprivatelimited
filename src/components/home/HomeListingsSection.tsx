import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PremiumPropertyCard from './PremiumPropertyCard';
import { subscribeProperties } from '@/lib/firestoreHelpers';
import type { FirestorePropertyDoc } from '@/lib/firestoreProperties';

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="aspect-[16/9] bg-gray-100 animate-pulse" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-3 w-1/3 rounded bg-gray-100 animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
        <div className="h-5 w-1/2 rounded bg-gray-100 animate-pulse" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded-md bg-gray-100 animate-pulse" />
          <div className="h-5 w-20 rounded-md bg-gray-100 animate-pulse" />
        </div>
      </div>
      <div className="border-t border-gray-100 p-3.5 pt-3">
        <div className="flex gap-2">
          <div className="h-8 flex-1 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-8 flex-1 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

type HomeListingDoc = FirestorePropertyDoc & { id: string };

const DM_SANS = "'DM Sans', system-ui, sans-serif";

export default function HomeListingsSection() {
  const [latestProperties, setLatestProperties] = useState<HomeListingDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeProperties(
      (docs) => {
        if (cancelled) return;
        // PG buildings first (the specialty), then any other rental classes.
        const docsTyped = docs.map(({ id, data }) => ({ id, ...data }) as HomeListingDoc);
        const isPg = (p: HomeListingDoc) => /\bpg\b/i.test(String(p.type ?? ''));
        setLatestProperties(
          [...docsTyped.filter(isPg), ...docsTyped.filter((p) => !isPg(p))].slice(0, 4),
        );
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  if (!loading && latestProperties.length === 0) return null;

  return (
    <section className="bg-[#F8F7F3] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between md:mb-14">
          <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[#0A1628] md:text-4xl">Freshly Listed Opportunities</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#687078] md:text-base">
                New PG buildings and rental income assets as they come to market.
              </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              to="/properties"
              className="inline-flex items-center gap-1 self-start border-b border-black pb-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-black transition hover:text-[#666] sm:self-auto"
              style={{ fontFamily: DM_SANS }}
            >
              View all properties
            </Link>
          </motion.div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
            : latestProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{
                    duration: 0.45,
                    delay: (index % 4) * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <PremiumPropertyCard property={property} index={index} />
                </motion.div>
              ))}
        </div>
      </div>
    </section>
  );
}
