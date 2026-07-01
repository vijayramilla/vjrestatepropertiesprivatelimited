import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ShareNetwork,
  WhatsappLogo,
  MapPin,
  ArrowUpRight,
  Buildings,
  HouseLine,
  Storefront,
  Tree,
  type Icon,
} from '@phosphor-icons/react';
import { useShortlist } from '@/context/ShortlistContext';
import {
  getCardSaleTitle,
  getCardCityName,
  getTypeBadgeLabel,
  isPlotLandListing,
  type ListingProperty,
} from '@/data/listingProperties';
import { formatINRCompact, formatCardPricePerSqft } from '@/lib/formatPrice';
import { formatArea } from '@/lib/plotLandForm';
import { shareProperty } from '@/utils/shareProperty';
import { openWhatsAppPropertyEnquiry } from '@/utils/whatsappProperty';
import PropertyEnquiryContactModal from '@/components/PropertyEnquiryContactModal';
import { useLocationPermission } from '@/hooks/useLocationPermission';
import {
  mapFirestoreToListing,
  type FirestorePropertyDoc,
} from '@/lib/firestoreProperties';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

function getTypeIcon(type: string): Icon {
  if (type === 'PG Building') return Buildings;
  if (type === 'Residential Rental') return HouseLine;
  if (type === 'Commercial') return Storefront;
  return Tree;
}

interface HomePropertyCardProps {
  property: FirestorePropertyDoc & { id: string };
  index?: number;
}

/** Home-only luxury card — UI from @21st-dev/magic MCP, wired to VJR data & actions */
export default function HomePropertyCard({ property: doc, index = 0 }: HomePropertyCardProps) {
  const navigate = useNavigate();
  const { showLocationModal } = useLocationPermission();
  const { isShortlisted, toggle } = useShortlist();
  const property: ListingProperty = mapFirestoreToListing(doc.id, doc);
  const saved = isShortlisted(property.id);
  const TypeIcon = getTypeIcon(property.type);
  const coverImage = property.images?.[0];
  const imageCount = property.images?.length ?? 0;
  const saleTitle = getCardSaleTitle(property);
  const cityName = getCardCityName(property);
  const isPlotOrLand = isPlotLandListing(property);
  const isFeatured = doc.featured === true;

  const [contactOpen, setContactOpen] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  const priceDisplay = isPlotOrLand ? formatINRCompact(property.price) : property.price_label;

  const areaDisplay = formatArea(
    property.area_unit,
    property.area_sqft,
    property.area_acres,
    property.area_guntas,
  );

  const subline = isPlotOrLand
    ? areaDisplay !== '—'
      ? areaDisplay
      : (property.price_per_sqft ?? 0) > 0
        ? formatCardPricePerSqft(property.price_per_sqft)
        : null
    : property.monthly_rental && property.monthly_rental !== '—'
      ? `${property.monthly_rental}/mo rental`
      : null;

  const goToDetail = () => {
    showLocationModal(() => navigate(`/properties/${property.id}`));
  };

  const submitWhatsAppEnquiry = async ({ name, phone }: { name: string; phone: string }) => {
    setWaLoading(true);
    try {
      await openWhatsAppPropertyEnquiry(
        {
          id: property.id,
          title: saleTitle,
          type: property.type,
          area: property.area,
          price_label: property.price_label,
          monthly_rental_label: property.monthly_rental,
        },
        { source: 'card', leadType: 'whatsapp', buyerName: name, buyerPhone: phone },
      );
      setContactOpen(false);
    } finally {
      setWaLoading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await shareProperty({
      id: property.id,
      title: saleTitle,
      type: property.type,
      area: property.area,
      price_label: property.price_label,
      monthly_rental_label: property.monthly_rental,
    });
    if (result === 'copied') {
      setShareFeedback('Link copied');
      window.setTimeout(() => setShareFeedback(''), 2000);
    }
  };

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <>
      <motion.article
        className="group relative h-[560px] w-full overflow-hidden bg-black sm:h-[580px] lg:h-[600px]"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -4 }}
      >
        {/* Image + gradient */}
        <div className="absolute inset-0">
          {coverImage ? (
            <motion.img
              src={coverImage}
              alt={saleTitle}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={index === 0 ? 'high' : undefined}
              className="h-full w-full object-cover"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.8, ease: [0.16, 0.84, 0.34, 1] }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a2a2a] to-[#111]">
              <TypeIcon size={56} weight="thin" color="#555" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/10" />
        </div>

        {/* Top badges */}
        <div className="absolute left-5 top-5 z-10 flex flex-wrap items-center gap-2 sm:left-6 sm:top-6">
          {isFeatured && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm"
            >
              <span
                className="text-[10px] font-medium uppercase tracking-[0.2em] text-white"
                style={{ fontFamily: DM_SANS }}
              >
                Featured
              </span>
            </motion.div>
          )}
          {imageCount > 0 && (
            <span
              className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-white/80 backdrop-blur-sm"
              style={{ fontFamily: DM_SANS }}
            >
              {imageCount} Photos
            </span>
          )}
        </div>

        {/* Save */}
        <motion.button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(property.id);
          }}
          className="absolute right-5 top-5 z-10 rounded-full border border-white/20 bg-white/10 p-3 backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-6 sm:top-6"
          whileTap={{ scale: 0.92 }}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          aria-label={saved ? 'Remove from shortlist' : 'Save property'}
        >
          <motion.div
            animate={{ scale: saved ? [1, 1.28, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart size={20} weight={saved ? 'fill' : 'regular'} color="#fff" />
          </motion.div>
        </motion.button>

        {/* Bottom content overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-5 sm:p-6 md:p-8">
          <motion.p
            {...fadeUp(0.2)}
            className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/50"
            style={{ fontFamily: DM_SANS }}
          >
            {getTypeBadgeLabel(property.type)}
          </motion.p>

          <motion.div {...fadeUp(0.28)} className="mb-3 flex items-center gap-2">
            <MapPin size={14} weight="regular" color="rgba(255,255,255,0.55)" />
            <span
              className="truncate text-[11px] font-light uppercase tracking-[0.16em] text-white/55"
              style={{ fontFamily: DM_SANS }}
            >
              {cityName}
            </span>
          </motion.div>

          <motion.h3
            {...fadeUp(0.36)}
            className="font-display mb-4 line-clamp-2 text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl md:text-[2rem]"
          >
            {saleTitle}
          </motion.h3>

          <motion.div
            {...fadeUp(0.44)}
            className="mb-4 h-px w-12 bg-white/30"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.48, duration: 0.4 }}
          />

          <motion.div {...fadeUp(0.52)}>
            <p className="font-display text-2xl font-light text-white sm:text-[1.75rem]">
              {priceDisplay}
            </p>
            {subline && (
              <p
                className="mt-1.5 text-xs font-light text-white/55"
                style={{ fontFamily: DM_SANS }}
              >
                {subline}
              </p>
            )}
          </motion.div>

          <motion.div
            {...fadeUp(0.62)}
            className="mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3"
          >
            <button
              type="button"
              onClick={goToDetail}
              className="inline-flex items-center gap-2 border border-white/30 px-5 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-white transition-all hover:border-white hover:bg-white/10 sm:text-[11px]"
              style={{ fontFamily: DM_SANS }}
            >
              <ArrowUpRight size={15} weight="bold" />
              View Property
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Share property"
              className="inline-flex items-center gap-2 border border-white/30 px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-white transition-all hover:border-white hover:bg-white/10 sm:text-[11px]"
              style={{ fontFamily: DM_SANS }}
            >
              <ShareNetwork size={15} weight="regular" />
              Share
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContactOpen(true);
              }}
              disabled={waLoading}
              aria-label="WhatsApp enquiry"
              className="inline-flex items-center gap-2 border border-[#25D366]/60 bg-[#25D366]/90 px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-white transition-all hover:bg-[#25D366] disabled:opacity-60 sm:text-[11px]"
              style={{ fontFamily: DM_SANS }}
            >
              <WhatsappLogo size={16} weight="fill" color="#fff" />
              WhatsApp
            </button>
          </motion.div>

          <AnimatePresence>
            {shareFeedback && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-[10px] text-white/50"
                style={{ fontFamily: DM_SANS }}
              >
                {shareFeedback}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.article>

      <PropertyEnquiryContactModal
        open={contactOpen}
        title="WhatsApp Enquiry"
        subtitle={`Share your details for ${saleTitle}`}
        onClose={() => setContactOpen(false)}
        onSubmit={submitWhatsAppEnquiry}
      />
    </>
  );
}
