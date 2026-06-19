import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropertyCard from '../PropertyCard';
import { subscribeProperties } from '@/lib/firestoreHelpers';
import type { FirestorePropertyDoc } from '@/lib/firestoreProperties';

type HomeListingDoc = FirestorePropertyDoc & { id: string };

export default function HomeListingsSection() {
  const [latestProperties, setLatestProperties] = useState<HomeListingDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeProperties(
      (docs) => {
        const featured = docs
          .filter(({ data }) => data.featured === true)
          .slice(0, 3)
          .map(({ id, data }) => ({ id, ...data } as HomeListingDoc));

        const fallback = docs
          .slice(0, 3)
          .map(({ id, data }) => ({ id, ...data } as HomeListingDoc));

        setLatestProperties(featured.length > 0 ? featured : fallback);
        setLoading(false);
      },
      () => {
        setLoading(false);
        setLatestProperties([]);
      },
    );

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <section className="border-b border-[#ebebeb] bg-gray-50 py-8 pb-6">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex flex-col gap-2 max-sm:gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
            <div>
              <p className="font-sans text-[10px] sm:text-[11px] font-medium text-[#888] uppercase tracking-[0.18em]">
                New Listings
              </p>
              <h2 className="font-serif text-[26px] sm:text-[28px] text-black font-normal tracking-[0.01em] mt-1">
                Latest Properties
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl border border-[#ebebeb] overflow-hidden animate-pulse">
                <div className="aspect-square bg-[#f0f0f0]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[#f0f0f0] rounded w-3/4" />
                  <div className="h-3 bg-[#f0f0f0] rounded w-1/2" />
                  <div className="h-6 bg-[#f0f0f0] rounded w-1/3" />
                </div>
              </div>
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
    <section className="border-b border-[#ebebeb] bg-gray-50 py-8 pb-6">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col gap-2 max-sm:gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <p className="font-sans text-[10px] sm:text-[11px] font-medium text-[#888] uppercase tracking-[0.18em]">
              New Listings
            </p>
            <h2 className="font-serif text-[26px] sm:text-[28px] text-black font-normal tracking-[0.01em] mt-1">
              Latest Properties
            </h2>
          </div>
          <Link
            to="/properties"
            className="font-sans text-xs sm:text-[13px] font-normal text-[#888] hover:text-black transition-colors self-start sm:self-auto"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {latestProperties.map((property, index) => (
            <PropertyCard key={property.id} property={property} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
