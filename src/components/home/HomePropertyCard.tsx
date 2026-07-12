import { useState, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  ShareNetwork,
  WhatsappLogo,
  MapPin,
  ArrowRight,
  Buildings,
  HouseLine,
  Storefront,
  Tree,
  type Icon,
} from '@phosphor-icons/react';
import LazyImage from '@/components/common/LazyImage';
import { useShortlist } from '@/context/ShortlistContext';
import {
  getCardSaleTitle,
  getCardCityName,
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

const HomePropertyCard = memo(function HomePropertyCard({ property: doc, index = 0 }: HomePropertyCardProps) {
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

  const [imgError, setImgError] = useState(false);
  const prevId = useRef(property.id);
  if (prevId.current !== property.id) {
    prevId.current = property.id;
    setImgError(false);
  }
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

  const submitWhatsAppEnquiry = async ({ name, phone, lat, lng }: { name: string; phone: string; lat?: number; lng?: number }) => {
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
          contact_phone: property.contact_phone,
          contact_name: property.contact_name,
        },
        { source: 'card', leadType: 'whatsapp', buyerName: name, buyerPhone: phone, buyerLat: lat, buyerLng: lng },
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

  return (
    <>
      <motion.article
        className="group flex flex-col w-full overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
      >
        <button
          type="button"
          onClick={goToDetail}
          className="relative w-full text-left cursor-pointer"
        >
          <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#F3F4F6]">
            {/* Skeleton shimmer — shows behind LazyImage while loading */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
            {coverImage && !imgError ? (
              <LazyImage
                src={coverImage}
                alt={saleTitle}
                priority={index === 0}
                onError={() => setImgError(true)}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <TypeIcon size={40} weight="thin" className="text-gray-300" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

            {isFeatured && (
              <span className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-sm text-[10px] font-semibold text-[#4F46E5] px-2.5 py-1 rounded-full shadow-sm">
                Featured
              </span>
            )}

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(property.id) }}
              className="absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-sm transition-all hover:bg-white active:scale-90"
              aria-label={saved ? 'Remove from shortlist' : 'Save property'}
            >
              <Heart
                size={15}
                weight={saved ? 'fill' : 'regular'}
                className={saved ? 'text-[#EF4444]' : 'text-gray-400'}
              />
            </button>

            {imageCount > 0 && (
              <span className="absolute bottom-2.5 right-2.5 z-10 bg-black/50 backdrop-blur-sm text-white text-[9px] font-medium px-2 py-0.5 rounded">
                {imageCount} photos
              </span>
            )}
          </div>

          <div className="p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
              <MapPin size={11} weight="regular" className="text-gray-400" />
              <span className="truncate">{cityName}</span>
            </div>

            <h3
              className="text-sm font-semibold leading-snug text-gray-900 line-clamp-2"
              style={{ fontFamily: DM_SANS }}
            >
              {saleTitle}
            </h3>

            <div className="mt-3 pt-3 border-t border-gray-50">
              <p
                className="font-numeric text-xl font-bold leading-none text-gray-900 tracking-tight"
              >
                {priceDisplay}
              </p>
              {subline && (
                <p
                  className="mt-1 text-[11px] text-gray-500"
                  style={{ fontFamily: DM_SANS }}
                >
                  {subline}
                </p>
              )}
            </div>
          </div>
        </button>

        <div className="border-t border-gray-50 px-3.5 pb-3.5 pt-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-1.5 flex-1 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 text-[10px] font-medium uppercase tracking-wide transition-colors hover:bg-gray-50 active:scale-[0.98]"
            >
              <ShareNetwork size={13} weight="duotone" />
              {shareFeedback || 'Share'}
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setContactOpen(true) }}
              disabled={waLoading}
              className="inline-flex items-center justify-center gap-1.5 flex-1 h-9 rounded-lg bg-gray-900 text-white text-[10px] font-medium uppercase tracking-wide transition-colors hover:bg-gray-800 active:scale-[0.98]"
            >
              <WhatsappLogo size={14} weight="fill" />
              {waLoading ? '...' : 'WhatsApp'}
            </button>

            <button
              type="button"
              onClick={goToDetail}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 active:scale-[0.98]"
            >
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      </motion.article>

      <PropertyEnquiryContactModal
        open={contactOpen}
        title="WhatsApp Enquiry"
        subtitle={`Share your details for ${saleTitle}`}
        listedBy={property.listed_by}
        onClose={() => setContactOpen(false)}
        onSubmit={submitWhatsAppEnquiry}
      />
    </>
  );
});

export default HomePropertyCard;
