import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Navigation, Share2, X } from 'lucide-react';
import { WhatsappLogo } from '@phosphor-icons/react';
import { CATEGORY_CONFIG, formatMapINR } from '@/data/mapConfig';
import { siteContact } from '@/data/siteContact';

export interface MapPopupProperty {
  id: string;
  title: string;
  locality: string;
  propertyType: keyof typeof CATEGORY_CONFIG;
  price: number;
  pricePerSqft: number;
  image: string | null;
  images: string[];
  areaLabel: string;
  dimensions: string;
  khata: string;
  facing: string;
  dcConversion?: string;
  color: string;
  lat: number;
  lng: number;
}

interface MapPropertyPopupProps {
  property: MapPopupProperty;
  onClose: () => void;
  sidebarOpen?: boolean;
}

export default function MapPropertyPopup({
  property,
  onClose,
  sidebarOpen = false,
}: MapPropertyPopupProps) {
  const config = CATEGORY_CONFIG[property.propertyType];
  const gallery = property.images.length
    ? property.images
    : property.image
      ? [property.image]
      : [];
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = gallery[photoIndex] ?? null;
  const hasMultiplePhotos = gallery.length > 1;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${property.lat},${property.lng}&travelmode=driving`;
  const shareLocationUrl = `https://www.google.com/maps?q=${property.lat},${property.lng}`;
  const whatsAppText = encodeURIComponent(
    `Hi VJR Estate, I'm interested in the ${property.propertyType} in ${property.locality} (ID: ${property.id})`,
  );

  const handleShareLocation = async () => {
    const shareData = {
      title: property.title || config.label,
      text: `${property.title || config.label} — ${property.locality}`,
      url: shareLocationUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to copy/open
      }
    }
    window.open(shareLocationUrl, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] bg-black/15"
        aria-label="Close property card"
        onClick={onClose}
      />

      <div
        data-sidebar-open={sidebarOpen ? 'true' : 'false'}
        className="map-property-popup fixed z-[210] flex max-h-[min(72vh,480px)] flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:max-h-[min(78vh,520px)] md:max-w-[380px]"
        style={{
          left: 'max(0.75rem, env(safe-area-inset-left))',
          right: 'max(0.75rem, env(safe-area-inset-right))',
          bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          width: 'auto',
          maxWidth: '380px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
        role="dialog"
        aria-label="Property details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0">
          {photo ? (
            <>
              <img
                src={photo}
                alt={property.title}
                className="h-36 w-full object-cover sm:h-40"
                loading="lazy"
              />
              {hasMultiplePhotos && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoIndex((i) => (i === 0 ? gallery.length - 1 : i - 1))
                    }
                    className="absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoIndex((i) => (i === gallery.length - 1 ? 0 : i + 1))
                    }
                    className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
                    aria-label="Next photo"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                    {gallery.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 w-1.5 rounded-full ${
                          idx === photoIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div
              className="flex h-32 items-center justify-center text-sm font-semibold text-white sm:h-36"
              style={{ backgroundColor: property.color }}
            >
              {config.label}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <span
            className="absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
            style={{ backgroundColor: property.color }}
          >
            {config.label}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="line-clamp-2 text-base font-bold text-gray-900 sm:text-lg">
            {property.title || `${config.label} for Sale`}
          </h3>

          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 sm:text-sm">
            <MapPin size={13} className="shrink-0" />
            {property.locality}
          </p>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xl font-black text-gray-900 sm:text-2xl">
                {formatMapINR(property.price)}
              </p>
              {property.pricePerSqft > 0 && (
                <p className="text-xs text-gray-500">
                  ₹{property.pricePerSqft.toLocaleString('en-IN')}/sq.ft
                </p>
              )}
            </div>
            <p className="text-right text-xs font-medium text-gray-600">{property.areaLabel}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {property.dimensions && property.dimensions !== '—' && (
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[10px] tracking-wide text-gray-400 uppercase">Dimensions</p>
                <p className="font-semibold text-gray-900">{property.dimensions}</p>
              </div>
            )}
            {property.facing && property.facing !== '—' && (
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[10px] tracking-wide text-gray-400 uppercase">Facing</p>
                <p className="font-semibold text-gray-900">{property.facing}</p>
              </div>
            )}
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <p className="text-[10px] tracking-wide text-gray-400 uppercase">Khata</p>
              <p className="font-semibold text-gray-900">{property.khata}</p>
            </div>
            {property.propertyType === 'Agriculture Land' && (
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[10px] tracking-wide text-gray-400 uppercase">DC Conversion</p>
                <p className="font-semibold text-gray-900">
                  {property.dcConversion ? 'Done' : 'Pending'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 pb-1">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white transition-colors hover:bg-blue-700"
            >
              <Navigation size={14} />
              Directions
            </a>
            <button
              type="button"
              onClick={handleShareLocation}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-800 transition-colors hover:bg-gray-50"
            >
              <Share2 size={14} />
              Share Location
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 pb-1">
            <Link
              to={`/properties/${property.id}`}
              className="flex items-center justify-center rounded-xl bg-gray-900 py-3 text-center text-xs font-bold text-white transition-colors hover:bg-black"
            >
              View Details
            </Link>
            <a
              href={`${siteContact.whatsappUrl}?text=${whatsAppText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-3 text-xs font-bold text-white transition-colors hover:bg-[#1da851]"
            >
              <WhatsappLogo size={16} weight="fill" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
