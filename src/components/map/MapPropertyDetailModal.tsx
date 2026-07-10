import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { mapFirestoreToProperty } from '@/lib/firestoreProperties';
import { formatCardTotalPrice, formatCardPricePerSqft } from '@/lib/formatPrice';
import { formatArea } from '@/lib/plotLandForm';
import { isPlotProperty, isLandOrPlotProperty } from '@/data/properties';
import type { Property } from '@/data/properties';
import { openWhatsAppPropertyEnquiry } from '@/utils/whatsappProperty';
import { shareProperty } from '@/utils/shareProperty';
import { siteContact } from '@/data/siteContact';
import { useShortlist } from '@/context/ShortlistContext';
import { useAuth } from '@/context/AuthContext';
import LazyImage from '@/components/common/LazyImage';
import { MapPin, Heart, WhatsappLogo, ShareNetwork, X, CheckCircle, ArrowLeft, ArrowRight, CalendarBlank } from '@phosphor-icons/react';

interface MapPropertyDetailModalProps {
  propertyId: string;
  onClose: () => void;
}

function MapPropertyDetailModal({ propertyId, onClose }: MapPropertyDetailModalProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [waLoading, setWaLoading] = useState(false);
  const { toggle, isShortlisted } = useShortlist();
  const saved = isShortlisted(propertyId);

  useEffect(() => {
    let cancelled = false;
    const fetchProperty = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'properties', propertyId));
        if (!cancelled) {
          if (docSnap.exists()) {
            setProperty(mapFirestoreToProperty(docSnap.id, docSnap.data()));
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProperty();
    return () => { cancelled = true; };
  }, [propertyId]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const galleryImages = property?.images?.filter(Boolean) ?? [];
  const allImages = galleryImages.length > 0
    ? galleryImages
    : (property?.image ? [property.image] : []);
  const currentImage = allImages[photoIndex] ?? null;

  const isLandOrPlot = property ? isLandOrPlotProperty(property) : false;
  const isPlot = property ? isPlotProperty(property.type) : false;

  const plotAreaDisplay = property
    ? formatArea(property.area_acres, property.area_guntas, property.area_sqft, property.area_unit)
    : '—';

  const handleWhatsApp = async () => {
    setWaLoading(true);
    await openWhatsAppPropertyEnquiry(propertyId, property?.name ?? '');
    setWaLoading(false);
  };

  const handleShare = () => {
    shareProperty({
      id: propertyId,
      title: property?.title ?? '',
      url: `${siteContact.siteUrl}/properties/${propertyId}`,
    });
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="detail-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm py-4"
        onClick={handleBackgroundClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-colors"
          >
            <X size={18} weight="bold" />
          </button>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
            </div>
          ) : !property ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500">
              Property not found.
            </div>
          ) : (
            <>
              <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-gray-100 overflow-hidden">
                {currentImage ? (
                  <LazyImage
                    src={currentImage}
                    alt={property.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <span className="text-4xl text-gray-300">No Image</span>
                  </div>
                )}

                {allImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((photoIndex - 1 + allImages.length) % allImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-colors"
                    >
                      <ArrowLeft size={16} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((photoIndex + 1) % allImages.length)}
                      className="absolute right-14 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-colors"
                    >
                      <ArrowRight size={16} weight="bold" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allImages.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 rounded-full transition-all duration-200 ${
                            i === photoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => toggle(propertyId)}
                  className="absolute top-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-colors"
                >
                  <Heart
                    size={16}
                    weight={saved ? 'fill' : 'regular'}
                    className={saved ? 'text-red-500' : 'text-gray-600'}
                  />
                </button>

                <span className="absolute bottom-3 left-3 z-10 rounded-full bg-black/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {property.type}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-2 text-gray-500 mb-1">
                  <MapPin size={14} weight="thin" className="mt-0.5 shrink-0" />
                  <span className="text-sm">{property.location || property.area}, Bangalore</span>
                </div>

                <h2 className="text-xl font-bold text-gray-900 leading-tight mb-4">
                  {property.title}
                </h2>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-5">
                  <p className="text-3xl font-bold text-gray-900 tracking-tight">
                    {formatCardTotalPrice(property.price)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-gray-500">
                    {(property.price_per_sqft ?? 0) > 0 && (
                      <span>{formatCardPricePerSqft(property.price_per_sqft)}</span>
                    )}
                    {plotAreaDisplay !== '—' && (
                      <>
                        {((property.price_per_sqft ?? 0) > 0) && <span>·</span>}
                        <span>{plotAreaDisplay}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Dimensions</p>
                    <p className="text-sm font-semibold text-gray-900">{property.dimensions && property.dimensions !== '—' ? property.dimensions : '—'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Facing</p>
                    <p className="text-sm font-semibold text-gray-900">{property.facing && property.facing !== '—' ? property.facing : '—'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Khata</p>
                    <p className="text-sm font-semibold text-gray-900">{(property as any).katha && (property as any).katha !== '—' ? (property as any).katha : '—'}</p>
                  </div>
                  {property.bbmpApproved ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-green-500 mb-0.5">Approved</p>
                      <p className="text-sm font-semibold text-green-700">BBMP</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Area</p>
                      <p className="text-sm font-semibold text-gray-900">{plotAreaDisplay}</p>
                    </div>
                  )}
                </div>

                {(property.highlights ?? []).length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
                      Highlights
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {property.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 border border-gray-100 rounded-lg px-3 py-2.5">
                          <CheckCircle size={13} weight="regular" className="shrink-0 text-gray-800" />
                          <span className="text-xs text-gray-700">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {property.description && (
                  <div className="mb-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                      About This Property
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {property.description}
                    </p>
                  </div>
                )}

                {!isLandOrPlot && (property.amenities ?? []).length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
                      Amenities
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((a, i) => (
                        <span key={i} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    disabled={waLoading}
                    className="flex h-11 flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white hover:bg-[#1da851] transition-colors disabled:opacity-70"
                  >
                    <WhatsappLogo size={18} weight="fill" />
                    {waLoading ? 'Opening...' : 'WhatsApp'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex h-11 flex-1 min-w-[100px] items-center justify-center gap-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ShareNetwork size={16} weight="regular" />
                    Share
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export default MapPropertyDetailModal;
