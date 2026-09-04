import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

  const isPg = (p: HomeListingDoc) => /\bpg\b/i.test(String(p.type ?? ''));

  // This section sells PG buildings specifically. Prefer PG-tagged rows and
  // fall back to the other rental classes only when the PG catalog is empty.
  const pgPool = properties.filter(isPg);
  const pool = pgPool.length > 0 ? pgPool : properties;

  const filtered = activeArea === 'All'
    ? pool.slice(0, 10)
    : pool.filter((p) => {
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
    <section className="bg-gradient-to-b from-gray-50 to-white py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
              Curated For Investors
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-[#0A1628] md:text-3xl">
              Hot Selling PG Buildings
            </h2>
            <p className="mt-2 max-w-xl text-sm text-gray-500">
              The income-generating PG buildings buyers across Bangalore are asking
              for right now — ready to own.
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-sm transition-all hover:border-[#C9A84C] hover:text-[#C9A84C] hover:shadow-md"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] shadow-sm transition-all hover:border-[#C9A84C] hover:text-[#C9A84C] hover:shadow-md"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        </motion.div>

        <div className="mb-6 flex gap-2 overflow-x-auto py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setActiveArea(area)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all shrink-0 ${
                area === activeArea
                  ? 'bg-[#0A1628] text-white shadow-md'
                  : 'bg-white text-[#6B7280] ring-1 ring-[#E5E7EB] hover:ring-[#C9A84C] hover:text-[#0A1628]'
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
            filtered.map((property, i) => {
              const coverImage = property.images?.[0];
              const priceLabel = property.price_label || formatPrice(property.price || 0);
              const location = [property.location, property.area].filter(Boolean).join(', ');
              const rentalLabel = property.monthly_rental_label;
              const yieldLabel = property.rental_yield != null ? `${property.rental_yield}% yield` : null;

              return (
                <motion.article
                  key={property.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.45, delay: (i % 4) * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                  onClick={() => navigate(`/properties/${property.id}`)}
                  className="group relative w-[280px] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(10,22,40,0.08)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(10,22,40,0.12)] hover:-translate-y-1 ring-1 ring-black/[0.04]"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-[#0A1628] shadow-sm backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <MapPin size={10} weight="fill" className="text-[#C9A84C]" />
                      {location.split(',')[0]}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold leading-snug text-[#0A1628] line-clamp-1">
                      {property.title || `Property in ${property.location || 'Bangalore'}`}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400 line-clamp-1">{location}</p>
                    <p className="mt-2 text-base font-bold tracking-tight text-[#0A1628]">{priceLabel}</p>
                    {rentalLabel && (
                      <p className="mt-1.5 text-xs font-semibold text-emerald-600">
                        Rental Income: {rentalLabel}/mo
                        {yieldLabel && <span className="font-normal text-gray-400"> · {yieldLabel}</span>}
                      </p>
                    )}
                  </div>

                </motion.article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
