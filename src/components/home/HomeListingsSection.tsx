import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PremiumPropertyCard from './PremiumPropertyCard';
import { subscribeProperties } from '@/lib/firestoreHelpers';
import type { FirestorePropertyDoc } from '@/lib/firestoreProperties';

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="aspect-[16/10] bg-gray-100 animate-pulse" />
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
        setLatestProperties(
          docs.slice(0, 3).map(({ id, data }) => ({ id, ...data }) as HomeListingDoc),
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
    <section className="border-b border-[#ebebeb] bg-white py-8 md:py-10">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#888]"
              style={{ fontFamily: DM_SANS }}
            >
                Trending Now
              </p>
              <h2 className="font-display mt-1 text-2xl text-black md:text-[28px]">Trending Picks</h2>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1 self-start border-b border-black pb-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-black transition hover:text-[#666] sm:self-auto"
            style={{ fontFamily: DM_SANS }}
          >
            View all properties
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
            : latestProperties.map((property, index) => (
                <PremiumPropertyCard key={property.id} property={property} index={index} />
              ))}
        </div>
      </div>
    </section>
  );
}
