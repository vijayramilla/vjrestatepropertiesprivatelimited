import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShareNetwork, WhatsappLogo, MapPin } from '@phosphor-icons/react';
import { Buildings, HouseLine, Storefront, Tree, type Icon } from '@phosphor-icons/react';
import { useShortlist } from '../context/ShortlistContext';
import {
  type ListingProperty,
  getCardSaleTitle,
  getCardCityName,
} from '../data/listingProperties';
import PropertyKeyStats from './PropertyKeyStats';
import { shareProperty } from '@/utils/shareProperty';
import { openWhatsAppPropertyEnquiry } from '@/utils/whatsappProperty';
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
}

export default function PropertyListingCard({ property, index = 0, compact = false }: PropertyListingCardProps) {
  const navigate = useNavigate();
  const { showLocationModal } = useLocationPermission();
  const { isShortlisted, toggle } = useShortlist();
  const saved = isShortlisted(property.id);
  const TypeIcon = getTypeIcon(property.type);
  const coverImage = property.images?.[0];
  const imageCount = property.images?.length ?? 0;
  const saleTitle = getCardSaleTitle(property);
  const cityName = getCardCityName(property);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared' | 'whatsapp' | 'failed'>('idle');
  const [waLoading, setWaLoading] = useState(false);

  const handleWhatsApp = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (waLoading) return;
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
        { source: 'card', leadType: 'whatsapp' },
      );
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
      whileHover={{ y: -2 }}
      className="group flex w-full flex-col overflow-hidden rounded-xl md:rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
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
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 sm:aspect-square md:aspect-[4/3]">
          {coverImage ? (
            <img
              src={coverImage}
              alt={saleTitle}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={index === 0 ? 'high' : undefined}
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <TypeIcon size={compact ? 32 : 40} weight="thin" color="#c4c4c4" />
            </div>
          )}

          {imageCount > 0 && (
            <span
              className="absolute left-2 top-2 z-10 rounded bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ fontFamily: DM_SANS }}
            >
              {imageCount} {imageCount === 1 ? 'Photo' : 'Photos'}
            </span>
          )}

          <button
            type="button"
            onClick={handleHeart}
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm"
            aria-label="Save property"
          >
            <motion.span
              key={saved ? 'saved' : 'unsaved'}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            >
              <Heart
                size={14}
                weight={saved ? 'fill' : 'regular'}
                color={saved ? '#111827' : '#6b7280'}
              />
            </motion.span>
          </button>
        </div>

        {/* Compact content — Squareyards proportions */}
        <div className="px-3.5 pb-3 pt-3 md:p-5">
          <h3
            className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 md:text-xl"
            style={{ fontFamily: DM_SANS }}
          >
            {saleTitle}
          </h3>

          <p
            className="mt-1 flex items-center gap-1 text-[12px] text-gray-500"
            style={{ fontFamily: DM_SANS }}
          >
            <MapPin size={12} weight="regular" color="#9ca3af" className="shrink-0" />
            <span className="truncate">{cityName}</span>
          </p>

          <div className="mt-2.5 border-t border-gray-100 pt-2.5">
            <p
              className="text-[10px] font-medium uppercase tracking-wide text-gray-400"
              style={{ fontFamily: DM_SANS }}
            >
              Price
            </p>
            <p className="mt-0.5 font-numeric text-2xl font-bold leading-none text-gray-900 md:text-3xl lg:text-4xl">
              {property.price_label}
            </p>
          </div>

          <PropertyKeyStats property={property} variant="card" />
        </div>
      </Link>

      <div className="relative mt-auto border-t border-gray-100 px-3.5 pb-3.5 pt-2.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share property"
            className="flex h-10 min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.98]"
          >
            <ShareNetwork size={15} weight="duotone" className="text-gray-600" />
            <span
              className="text-[10px] font-medium uppercase tracking-wide text-gray-700"
              style={{ fontFamily: DM_SANS }}
            >
              {shareLabel}
            </span>
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={waLoading}
            aria-label="WhatsApp enquiry"
            className="flex h-10 min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-1 rounded-lg bg-gray-900 text-white transition-colors hover:bg-gray-800 active:scale-[0.98] disabled:opacity-70"
          >
            <WhatsappLogo size={15} weight="fill" color="#fff" />
            <span
              className="text-[10px] font-medium uppercase tracking-wide text-white"
              style={{ fontFamily: DM_SANS }}
            >
              {waLoading ? '...' : 'WhatsApp'}
            </span>
          </button>
        </div>

        <AnimatePresence>
          {linkCopied && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2.5 py-1 text-[10px] text-white"
              style={{ fontFamily: DM_SANS }}
            >
              Link Copied!
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
