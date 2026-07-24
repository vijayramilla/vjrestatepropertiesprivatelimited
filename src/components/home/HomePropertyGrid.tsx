import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeProperties } from '@/lib/firestoreHelpers';
import type { FirestorePropertyDoc } from '@/lib/firestoreProperties';
import { formatPrice } from '@/lib/formatPrice';
import { CaretLeft, CaretRight, MapPin, Building } from '@phosphor-icons/react';

type HomeListingDoc = FirestorePropertyDoc & { id: string };

const AREAS = ['All', 'Whitefield', 'Sarjapur Road', 'Electronic City', 'Hebbal', 'Yelahanka', 'JP Nagar', 'Koramangala', 'Marathahalli', 'Bannerghatta Road', 'Kanakapura Road'];

export default function HomePropertyGrid() {
  const [properties, setProperties] = useState<HomeListingDoc[]>([]);
  const [activeArea, setActiveArea] = useState('All');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeProperties((docs) => {
      setProperties(docs.map(({ id, data }) => ({ id, ...data }) as HomeListingDoc));
    });
    return () => unsub();
  }, []);

  const navigate = useNavigate();

  const filtered = activeArea === 'All'
    ? properties.slice(0, 10)
    : properties.filter((p) => {
        const loc = (p.location + ' ' + (p.area || '')).toLowerCase();
        return loc.includes(activeArea.toLowerCase());
      }).slice(0, 10);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (properties.length === 0) return null;

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              Hot Selling Rental Income Properties In Bangalore
            </h2>

          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-700"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-700"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        </div>

          <div className="mb-6 flex gap-2 overflow-x-auto py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setActiveArea(area)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-all shrink-0 ${
                area === activeArea
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-400 hover:text-gray-900'
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
        >
          {filtered.length === 0 ? (
            <p className="py-16 text-sm text-gray-400">No properties found for this city.</p>
          ) : (
            filtered.map((property) => {
              const coverImage = property.images?.[0];
              const priceLabel = property.price_label || formatPrice(property.price || 0);
              const location = [property.location, property.area].filter(Boolean).join(', ');
              const rentalLabel = property.monthly_rental_label;
              const yieldLabel = property.rental_yield != null ? `${property.rental_yield}% yield` : null;

              return (
                <article
                  key={property.id}
                  onClick={() => navigate(`/property/${property.id}`)}
                  className="group relative w-[280px] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Building size={32} className="text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700 shadow-sm backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <MapPin size={10} weight="fill" />
                      {location.split(',')[0]}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold leading-snug text-gray-900 line-clamp-1">
                      {property.title || `Property in ${property.location || 'Bangalore'}`}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400 line-clamp-1">{location}</p>
                    <p className="mt-2 text-base font-bold tracking-tight text-gray-900">{priceLabel}</p>
                    {rentalLabel && (
                      <p className="mt-1.5 text-xs font-semibold text-emerald-600">
                        Rental Income: {rentalLabel}/mo
                        {yieldLabel && <span className="font-normal text-gray-400"> · {yieldLabel}</span>}
                      </p>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
