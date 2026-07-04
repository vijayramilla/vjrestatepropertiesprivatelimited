import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HomePropertyCard from './HomePropertyCard';
import { subscribeProperties } from '@/lib/firestoreHelpers';
import { usePropertiesCache } from '@/hooks/usePropertiesCache';
import type { FirestorePropertyDoc } from '@/lib/firestoreProperties';

type HomeListingDoc = FirestorePropertyDoc & { id: string };

const DM_SANS = "'DM Sans', system-ui, sans-serif";

function SkeletonCard() {
  return (
    <div className="relative overflow-hidden border border-black/5 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="aspect-[4/5] bg-gray-200 sm:aspect-[5/6]" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-1/3 rounded bg-gray-200" />
        <div className="h-8 w-2/3 rounded bg-gray-200" />
        <div className="h-10 w-full rounded bg-gray-200" />
      </div>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
  );
}

export default function HomeListingsSection() {
  const { getCached, setCache } = usePropertiesCache('home-listings');
  const [latestProperties, setLatestProperties] = useState<HomeListingDoc[]>(() => {
    const cached = getCached('home-listings');
    return (cached ?? []) as unknown as HomeListingDoc[];
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCached('home-listings');
    return !cached;
  });

  useEffect(() => {
    const unsub = subscribeProperties(
      (docs) => {
        const featured = docs
          .filter(({ data }) => data.featured === true)
          .slice(0, 3)
          .map(({ id, data }) => ({ id, ...data }) as HomeListingDoc);

        const fallback = docs
          .slice(0, 3)
          .map(({ id, data }) => ({ id, ...data }) as HomeListingDoc);

        const result = featured.length > 0 ? featured : fallback;
        setCache('home-listings', result as unknown[]);
        setLatestProperties(result);
        setLoading(false);
      },
      () => {
        setLoading(false);
        setLatestProperties([]);
      },
    );

    return () => unsub();
  }, [setCache]);

  if (loading) {
    return (
      <section className="border-b border-[#ebebeb] bg-white py-12 md:py-16">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#888]"
                style={{ fontFamily: DM_SANS }}
              >
                New Listings
              </p>
              <h2 className="font-display mt-2 text-[28px] text-black md:text-[32px]">Latest Properties</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (latestProperties.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-[#ebebeb] bg-white py-12 md:py-16">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#888]"
              style={{ fontFamily: DM_SANS }}
            >
              New Listings
            </p>
            <h2 className="font-display mt-2 text-[28px] text-black md:text-[32px]">Latest Properties</h2>
            <p
              className="mt-2 max-w-lg text-sm leading-relaxed text-[#666]"
              style={{ fontFamily: DM_SANS }}
            >
              Handpicked investment opportunities across Bangalore — rental income, commercial assets, and premium plots.
            </p>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1 self-start border-b border-black pb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-black transition hover:text-[#666] sm:self-auto"
            style={{ fontFamily: DM_SANS }}
          >
            View all properties
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {latestProperties.map((property, index) => (
            <HomePropertyCard key={property.id} property={property} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
