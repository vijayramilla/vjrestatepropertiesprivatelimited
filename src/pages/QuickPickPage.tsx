import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HandSwipeRight } from '@phosphor-icons/react';
import { subscribeProperties } from '@/lib/firestoreHelpers';
import { mapFirestoreToListing, type FirestorePropertyDoc } from '@/lib/firestoreProperties';
import { formatPrice, formatRental } from '@/lib/formatPrice';
import { getCardKathaValue } from '@/components/PropertyKeyStats';
import { useShortlist } from '@/context/ShortlistContext';
import { setDefaultSiteMeta } from '@/lib/siteMeta';
import SwipeCards, { type SwipeCardItem } from '@/components/ui/image-stack-carousel';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Category = 'All' | 'PG Buildings' | 'Residential' | 'Commercial';

const CATEGORIES: { label: Category; match: RegExp }[] = [
  { label: 'All', match: /.*/ },
  { label: 'PG Buildings', match: /\bpg\b/i },
  { label: 'Residential', match: /residential/i },
  { label: 'Commercial', match: /commercial/i },
];

const MAX_DECK = 24;

type HomeListingDoc = FirestorePropertyDoc & { id: string };

function toCardItem(p: HomeListingDoc): SwipeCardItem {
  const listing = mapFirestoreToListing(p.id, p);
  const location = [listing.location, listing.area].filter(Boolean).join(', ') || 'Bangalore';
  return {
    id: p.id,
    img: listing.images?.[0] ?? '',
    title: listing.title || 'Property in Bangalore',
    location,
    price: listing.price_label || formatPrice(listing.price),
    // Raw numeric rental from Firestore (normalizePropertyRecord guarantees a
    // number) — parsing the formatted label would break on values like ₹1.2L.
    rentalIncome: formatRental(Number(p.monthly_rental) || null),
    khata: getCardKathaValue(listing),
    photoCount: listing.images?.length ?? 0,
  };
}

export default function QuickPickPage() {
  useEffect(() => {
    document.title = 'Quick Pick | VJR Estate';
    return () => setDefaultSiteMeta();
  }, []);

  const navigate = useNavigate();
  const { isShortlisted, toggle } = useShortlist();
  // Swiping only cycles the deck; the heart button is the single way to
  // shortlist, so a stray swipe can never save a property.
  const handleToggleSave = (id: string) => toggle(id);
  const [docs, setDocs] = useState<HomeListingDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState<Category>('All');

  useEffect(() => {
    const unsub = subscribeProperties((list) => {
      setDocs(list.map(({ id, data }) => ({ id, ...data }) as HomeListingDoc));
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const deck = useMemo<SwipeCardItem[]>(() => {
    const cat = CATEGORIES.find((c) => c.label === category) ?? CATEGORIES[0];
    return docs
      .filter((p) => cat.match.test(String(p.type ?? '')))
      .slice(0, MAX_DECK)
      .map(toCardItem);
  }, [docs, category]);

  const savedCount = useMemo(
    () => deck.filter((c) => isShortlisted(c.id)).length,
    [deck, isShortlisted],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A1628]">
      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-[-20%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-[#C9A84C]/[0.07] blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-4 pb-16 pt-[calc(3rem+env(safe-area-inset-top,0px))] sm:px-6 md:pt-20">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex flex-col items-center text-center"
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]"
            style={{ fontFamily: DM_SANS }}
          >
            Swipe. Shortlist. Site Visit.
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Quick Pick
          </h1>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/60" style={{ fontFamily: DM_SANS }}>
            One card at a time. Swipe or tap × to move to the next property,
            tap the heart to save it to your shortlist, or tap the card to open
            the full details.
          </p>
        </motion.header>

        {/* Category chips */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setCategory(c.label)}
              className={`inline-flex min-h-[38px] items-center rounded-full border px-4 text-[10.5px] font-bold uppercase tracking-[0.14em] transition-all ${
                category === c.label
                  ? 'border-transparent bg-[#C9A84C] text-[#0A1628] shadow-[0_8px_24px_rgba(201,168,76,0.35)]'
                  : 'border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30 hover:text-white'
              }`}
              style={{ fontFamily: DM_SANS }}
            >
              {c.label}
            </button>
          ))}
        </motion.div>

        {/* Deck */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          className="mt-6 flex flex-1 items-start justify-center"
        >
          {loaded && docs.length === 0 ? (
            <div
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-12 text-center"
              style={{ fontFamily: DM_SANS }}
            >
              <HandSwipeRight size={34} weight="thin" className="mx-auto text-white/20" />
              <p className="mt-4 text-[15px] font-bold text-white">No listings yet</p>
              <p className="mx-auto mt-1 max-w-[34ch] text-[12.5px] leading-relaxed text-white/50">
                New properties go live here the moment they are added. Check back shortly.
              </p>
            </div>
          ) : (
            <SwipeCards
              cards={deck}
              onDetails={(id) => navigate(`/properties/${id}`)}
              onToggleSave={handleToggleSave}
              isSaved={isShortlisted}
              emptyTitle="That is every pick"
              emptySubtitle="You have gone through the whole deck. Start over or view your shortlist."
            />
          )}
        </motion.div>

        {/* Deck meta row */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/40" style={{ fontFamily: DM_SANS }}>
            {deck.length > 0 ? `${deck.length} picks in the deck` : ''}
          </p>
          {savedCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/shortlist')}
              className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#E4C877] transition-colors hover:text-white"
              style={{ fontFamily: DM_SANS }}
            >
              {savedCount} saved — view shortlist
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
