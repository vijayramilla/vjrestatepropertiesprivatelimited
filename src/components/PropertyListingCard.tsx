import { Link, useNavigate } from 'react-router-dom';
import { useState, memo } from 'react';
import SupabaseImage from './common/SupabaseImage';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShareNetwork, WhatsappLogo, MapPin } from '@phosphor-icons/react';
import { Buildings, HouseLine, Storefront, Tree, type Icon } from '@phosphor-icons/react';
import { useShortlist } from '../context/ShortlistContext';
import {
  type ListingProperty,
  getCardSaleTitle,
  getCardCityName,
  isPlotLandListing,
} from '../data/listingProperties';
import PropertyKeyStats from './PropertyKeyStats';
import PlotLandCardStats from './PlotLandCardStats';
import { formatINRCompact, formatCardPricePerSqft } from '@/lib/formatPrice';
import { getMonthlyRentalValue } from '@/lib/propertyFilters';
import { shareProperty } from '@/utils/shareProperty';
import { openWhatsAppPropertyEnquiry } from '@/utils/whatsappProperty';
import PropertyEnquiryContactModal from '@/components/PropertyEnquiryContactModal';
import { useLocationPermission } from '@/hooks/useLocationPermission';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

function getTypeIcon(type: string): Icon {
  if (type === 'PG Building') return Buildings;
  if (type === 'Residential Rental') return HouseLine;
  if (type === 'Commercial') return Storefront;
  return Tree;
}

interface PropertyListingCardProps {
  property: ListingProperty;
  index?: number;
  compact?: boolean;
  listing?: boolean;
}

const PropertyListingCard = memo(function PropertyListingCard({ property, index = 0, compact = false, listing = false }: PropertyListingCardProps) {
  const navigate = useNavigate();
  const { showLocationModal } = useLocationPermission();
  const { isShortlisted, toggle } = useShortlist();
  const saved = isShortlisted(property.id);
  const TypeIcon = getTypeIcon(property.type);
  const coverImage = property.images?.[0];
  const imageCount = property.images?.length ?? 0;
  const saleTitle = property.title || getCardSaleTitle(property);
  const cityName = getCardCityName(property);
  const isPlotOrLand = isPlotLandListing(property);

  // Rental yield is always derived from real figures — the stored yield when
  // available, otherwise annualised monthly rent ÷ asking price.
  const rentalYieldLabel = (() => {
    if (isPlotOrLand) return null;
    const stored = property.rental_yield ?? null;
    if (stored != null && stored > 0 && stored <= 50) {
      return `${Number(stored.toFixed(1))}% Rental Yield`;
    }
    const monthly = getMonthlyRentalValue(property);
    const price = Number(property.price ?? 0);
    if (monthly > 0 && price > 0) {
      const computed = (monthly * 12 * 100) / price;
      if (computed > 0 && computed <= 50) {
        return `${computed >= 10 ? Math.round(computed) : computed.toFixed(1)}% Rental Yield`;
      }
    }
    return null;
  })();

  const [imgError, setImgError] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared' | 'whatsapp' | 'failed'>('idle');
  const [waLoading, setWaLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContactOpen(true);
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

  const handleHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(property.id);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await shareProperty({
        id: property.id,
        title: saleTitle,
        type: property.type,
        area: property.area,
        price_label: property.price_label,
        monthly_rental_label: property.monthly_rental,
      });
      if (result === 'copied') {
        setShareStatus('copied');
        setLinkCopied(true);
        window.setTimeout(() => {
          setLinkCopied(false);
          setShareStatus('idle');
        }, 2500);
      } else if (result === 'shared') {
        setShareStatus('shared');
        window.setTimeout(() => setShareStatus('idle'), 2000);
      } else if (result === 'whatsapp') {
        setShareStatus('whatsapp');
        window.setTimeout(() => setShareStatus('idle'), 2000);
      } else if (result === 'failed') {
        setShareStatus('failed');
        window.setTimeout(() => setShareStatus('idle'), 3000);
      }
    } catch {
      setShareStatus('failed');
      window.setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const shareLabel =
    shareStatus === 'copied'
      ? 'Copied ✓'
      : shareStatus === 'shared'
        ? 'Shared ✓'
        : shareStatus === 'failed'
          ? 'Try Again'
          : 'Share';

  return (
    <motion.article
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className={`group flex w-full flex-col overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_4px_6px_rgba(0,0,0,0.04),0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_8px_12px_rgba(0,0,0,0.06),0_20px_48px_rgba(0,0,0,0.12)] ${listing ? 'h-full' : ''}`}
    >
      <Link
        to={`/properties/${property.id}`}
        className="block w-full cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          showLocationModal(() => {
            navigate(`/properties/${property.id}`);
          });
        }}
      >
          <div className={`relative w-full overflow-hidden bg-gray-100 ${compact ? 'aspect-[2/1]' : listing ? 'aspect-[16/9]' : 'aspect-[16/9]'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
          {coverImage && !imgError ? (
            <SupabaseImage
              src={coverImage}
              alt={saleTitle}
              priority={listing ? index < 2 : index === 0}
              fetchPriority={listing && index < 2 ? 'high' : undefined}
              onError={() => setImgError(true)}
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-950">
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="relative flex flex-col items-center gap-1.5">
                <TypeIcon size={compact ? 28 : listing ? 32 : 40} weight="thin" className="text-white/15" />
                <span className="text-[8px] font-medium uppercase tracking-[0.18em] text-white/20">Image Coming Soon</span>
              </div>
            </div>
          )}

          {imageCount > 0 && (
            <span className={`absolute z-10 rounded-md bg-black/55 font-semibold text-white backdrop-blur-[4px] ${compact ? 'left-1.5 top-1.5 flex items-center gap-1 px-1.5 py-0.5 text-[8px]' : listing ? 'left-2.5 top-2.5 flex items-center gap-[5px] px-2 py-0.5 text-[11px]' : 'left-3 top-3 flex items-center gap-[5px] px-2.5 py-1 text-[12px]'}`} style={{ fontFamily: DM_SANS }}>
              {imageCount} {imageCount === 1 ? 'Photo' : 'Photos'}
            </span>
          )}

          <button type="button" onClick={handleHeart} className={`absolute z-10 flex items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${compact ? 'right-1.5 top-1.5 h-6 w-6' : listing ? 'right-2.5 top-2.5 h-8 w-8' : 'right-3 top-3 h-9 w-9'}`} aria-label="Save property">
            <motion.span key={saved ? 'saved' : 'unsaved'} initial={{ scale: 1 }} animate={{ scale: [1, 1.25, 1] }} transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}>
              <Heart size={compact ? 10 : listing ? 14 : 16} weight={saved ? 'fill' : 'regular'} color={saved ? '#111827' : '#6b7280'} />
            </motion.span>
          </button>
        </div>

        <div className={compact ? 'px-2 py-1.5' : listing ? 'px-4 pb-3 pt-3' : 'px-[18px] pb-[18px] pt-4'}>
          <h3 className={`line-clamp-2 font-bold leading-snug text-gray-900 ${compact ? 'text-[11px]' : listing ? 'text-[15px]' : 'text-lg md:text-xl'}`} style={{ fontFamily: DM_SANS }}>
            {saleTitle}
          </h3>

          <p className={`flex items-center gap-1 text-gray-500 ${compact ? 'mt-0.5 text-[9px]' : listing ? 'mt-1 text-[12px]' : 'mt-1 text-[13px]'}`} style={{ fontFamily: DM_SANS }}>
            <MapPin size={compact ? 9 : listing ? 11 : 13} weight="regular" color="#9ca3af" className="shrink-0" />
            <span className="truncate">{cityName}</span>
          </p>

          <div className={`border-t border-[#F3F4F6] ${compact ? 'mt-1 pt-1' : listing ? 'mt-2 pt-2' : 'mt-3 pt-3'}`}>
            {!isPlotOrLand && (
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400" style={{ fontFamily: DM_SANS }}>
                Asking Price
              </p>
            )}
            <p className={`font-numeric font-extrabold leading-none tracking-tight text-gray-900 ${compact ? 'text-xs mt-0' : listing ? 'mt-0.5 text-[20px]' : 'mt-0.5 text-[26px]'}`}>
              {isPlotOrLand ? formatINRCompact(property.price) : property.price_label}
            </p>
            {isPlotOrLand && (property.price_per_sqft ?? 0) > 0 && (
              <p className={`font-numeric text-gray-500 ${compact ? 'mt-0 text-[9px]' : listing ? 'mt-0.5 text-[12px]' : 'mt-1 text-[13px]'}`} style={{ fontFamily: DM_SANS }}>
                {formatCardPricePerSqft(property.price_per_sqft)}
              </p>
            )}
            {rentalYieldLabel && (
              <p className={`font-bold text-emerald-600 ${compact ? 'mt-0 text-[9px]' : listing ? 'mt-0.5 text-[12px]' : 'mt-1 text-[13px]'}`} style={{ fontFamily: DM_SANS }}>
                {rentalYieldLabel}
              </p>
            )}
          </div>

          {isPlotOrLand ? (
            <PlotLandCardStats property={property} variant={compact ? 'compact' : listing ? 'listing' : 'card'} />
          ) : (
            <PropertyKeyStats property={property} variant={compact ? 'compact' : listing ? 'listing' : 'card'} />
          )}
        </div>
      </Link>

      <div className={`relative mt-auto border-t border-[#F3F4F6] ${compact ? 'px-2 pb-1.5 pt-0.5' : listing ? 'px-4 pb-3 pt-2.5' : 'px-[18px] pb-[18px] pt-[14px]'}`}>
        <div className={`flex ${compact ? 'gap-0.5' : listing ? 'gap-2' : 'gap-[10px]'}`}>
          <button type="button" onClick={handleShare} aria-label="Share property" className={`flex flex-1 items-center justify-center rounded-xl border-[1.5px] border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.98] ${compact ? 'h-6 min-h-0 gap-0.5 text-[8px]' : listing ? 'h-9 min-h-[36px] gap-1 text-[12px]' : 'h-11 min-h-[44px] gap-[6px] touch-manipulation'}`}>
            <ShareNetwork size={compact ? 9 : listing ? 14 : 16} weight="duotone" className="text-gray-600" />
            <span className={`font-semibold ${compact ? 'text-[8px] uppercase tracking-wide' : listing ? 'text-[12px]' : 'text-[13px]'} text-gray-700`} style={{ fontFamily: DM_SANS }}>
              {shareLabel}
            </span>
          </button>

          <button type="button" onClick={handleWhatsApp} disabled={waLoading} aria-label="WhatsApp enquiry" className={`flex items-center justify-center rounded-xl border-none bg-[#25D366] text-white shadow-[0_4px_12px_rgba(37,211,102,0.3)] transition-colors hover:bg-[#1ebe5b] active:scale-[0.98] disabled:opacity-70 ${compact ? 'h-6 min-h-0 flex-1 gap-0.5 text-[8px]' : listing ? 'h-9 min-h-[36px] flex-[1.5] gap-1 text-[12px]' : 'h-11 min-h-[44px] flex-[1.6] gap-[6px] touch-manipulation'}`}>
            <WhatsappLogo size={compact ? 9 : listing ? 14 : 16} weight="fill" color="#fff" />
            <span className={`font-bold ${compact ? 'text-[8px] uppercase tracking-wide' : listing ? 'text-[12px]' : ''} text-white`} style={{ fontFamily: DM_SANS }}>
              {waLoading ? '...' : 'WhatsApp'}
            </span>
          </button>
        </div>

        <AnimatePresence>
          {linkCopied && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.2 }} className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2.5 py-1 text-[10px] text-white" style={{ fontFamily: DM_SANS }}>
              Link Copied!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <PropertyEnquiryContactModal
        open={contactOpen}
        title="WhatsApp Enquiry"
        subtitle={`Share your details for ${saleTitle}`}
        listedBy={property.listed_by}
        onClose={() => setContactOpen(false)}
        onSubmit={submitWhatsAppEnquiry}
      />
    </motion.article>
  );
});

export default PropertyListingCard;
