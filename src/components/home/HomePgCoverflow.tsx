import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { subscribeProperties } from '@/lib/firestoreHelpers';
import type { FirestorePropertyDoc } from '@/lib/firestoreProperties';
import { formatPrice } from '@/lib/formatPrice';
import { useShortlist } from '@/context/ShortlistContext';
import { ArrowRight } from '@phosphor-icons/react';
import { CoverflowCarousel, type CoverflowSlide } from '@/components/ui/coverflow-carousel';
import { optimizeSupabaseUrl } from '@/utils/supabaseImageLoader';

type HomeListingDoc = FirestorePropertyDoc & { id: string };

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Fallback photo used when a PG building has no uploaded image yet. */
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=640&h=640&fit=crop&q=70&auto=format',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=640&h=640&fit=crop&q=70&auto=format',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=640&h=640&fit=crop&q=70&auto=format',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=640&h=640&fit=crop&q=70&auto=format',
  'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=640&h=640&fit=crop&q=70&auto=format',
  'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=640&h=640&fit=crop&q=70&auto=format',
];

export default function HomePgCoverflow() {
  const [properties, setProperties] = useState<HomeListingDoc[]>([]);
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const { isShortlisted, toggle } = useShortlist();
  // Guards against a stale callback firing navigate for a slide the user has
  // already moved off (drag past a card and release).
  const selectedRef = useRef(0);
  selectedRef.current = selected;

  useEffect(() => {
    const unsub = subscribeProperties((docs) => {
      setProperties(docs.map(({ id, data }) => ({ id, ...data }) as HomeListingDoc));
    });
    return () => unsub();
  }, []);

  // This section sells PG buildings specifically. Prefer PG-tagged rows and
  // fall back to the other rental classes only when the PG catalog is empty.
  const pool = useMemo(() => {
    const isPg = (p: HomeListingDoc) => /\bpg\b/i.test(String(p.type ?? ''));
    const pgPool = properties.filter(isPg);
    const list = pgPool.length > 0 ? pgPool : properties;
    return list.slice(0, 10);
  }, [properties]);

  const slides: CoverflowSlide[] = useMemo(
    () =>
      pool.map((property, i) => {
        const location = [property.location, property.area].filter(Boolean).join(', ');
        const priceLabel = property.price_label || formatPrice(property.price || 0);
        const rentalLabel = property.monthly_rental_label;
        const yieldLabel =
          property.rental_yield != null ? `${property.rental_yield}% yield` : null;
        const meta: { label: string; value: string }[] = [
          { label: 'Price', value: priceLabel },
        ];
        if (rentalLabel) meta.push({ label: 'Rental Income', value: `${rentalLabel}/mo` });
        if (yieldLabel) meta.push({ label: 'Return', value: yieldLabel });
        if (location) meta.push({ label: 'Location', value: location.split(',')[0] });

        return {
          // Rendered at ~280px square: request a 2x (560px) crop so retina
          // screens stay sharp without downloading the 1600px original.
          src: property.images?.[0]
            ? optimizeSupabaseUrl(property.images[0], 'card', {
                width: 560,
                height: 560,
                quality: 80,
                resize: 'cover',
              })
            : FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
          alt: property.title || `PG building in ${property.location || 'Bangalore'}`,
          title: property.title || `Property in ${property.location || 'Bangalore'}`,
          subtitle: location || 'Bangalore, Karnataka',
          meta,
          savable: true,
          saved: isShortlisted(property.id),
          onToggleSave: () => toggle(property.id),
        };
      }),
    [pool],
  );

  if (properties.length === 0) return null;

  const openSelected = () => {
    const property = pool[selectedRef.current];
    if (property) navigate(`/properties/${property.id}`);
  };

  return (
    <section className="overflow-hidden bg-gradient-to-b from-[#0A1628] via-[#0d1c33] to-[#0A1628] py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-4 flex flex-col items-center text-center"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
            Curated For Investors
          </p>
          <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Hot Selling PG Buildings
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/60">
            The income-generating PG buildings buyers across Bangalore are asking
            for right now — drag to explore, click to view.
          </p>
        </motion.div>

        {slides.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          >
            <CoverflowCarousel
              slides={slides}
              showCaption
              showNavigation
              showPagination
              onSelectChange={setSelected}
              label="Hot selling PG buildings"
              className="[--cf-card:clamp(190px,24vw,280px)] [&_p]:text-white [&_.text-foreground]:text-white [&_.text-muted-foreground]:text-white/60 [&_dd]:text-[#E4C877] [&_dt]:text-white/60 [&_button[aria-label='Go to slide 1']]:bg-[#C9A84C] [&_button[aria-label^='Go to slide']]:bg-[#C9A84C]"
              cardClassName="ring-1 ring-[#C9A84C]/25 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]"
            />
          </motion.div>
        )}

        <div className="mt-4 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={openSelected}
            className="group inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#C9A84C] px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0A1628] shadow-[0_8px_24px_rgba(201,168,76,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#D6B85D] active:scale-[0.98]"
          >
            View This Property
            <ArrowRight
              size={15}
              weight="bold"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </button>
          <button
            type="button"
            onClick={() => navigate('/properties?type=PG Buildings')}
            className="inline-flex min-h-[40px] items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55 transition-colors hover:text-[#E4C877]"
          >
            Browse All PG Buildings
            <ArrowRight size={12} weight="bold" />
          </button>
        </div>
      </div>
    </section>
  );
}
