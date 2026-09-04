import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShareNetwork, MapPin, ArrowRight } from '@phosphor-icons/react';
import SupabaseImage from '@/components/common/SupabaseImage';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const PremiumPropertyCard = memo(function PremiumPropertyCard({
  property: doc,
  index = 0,
}: {
  property: FirestorePropertyDoc & { id: string };
  index?: number;
}) {
  const navigate = useNavigate();
  const { showLocationModal } = useLocationPermission();
  const { isShortlisted, toggle } = useShortlist();
  const property: ListingProperty = mapFirestoreToListing(doc.id, doc);
  const saved = isShortlisted(property.id);
  const coverImage = property.images?.[0];
  const saleTitle = property.title || getCardSaleTitle(property);
  const cityName = getCardCityName(property);
  const isPlotOrLand = isPlotLandListing(property);
  const [imgError, setImgError] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [waLoading, setWaLoading] = useState(false);

  const areaDisplay = formatArea(
    property.area_unit,
    property.area_sqft,
    property.area_acres,
    property.area_guntas,
  );
  const pricePerSqftLabel =
    (property.price_per_sqft ?? 0) > 0
      ? formatCardPricePerSqft(property.price_per_sqft) : null;
  const monthlyRental =
    !isPlotOrLand && property.monthly_rental && property.monthly_rental !== '—'
      ? property.monthly_rental : null;

  // Yield is always derived from real figures — stored yield when available,
  // otherwise annualised monthly rent ÷ asking price.
  const yieldLabel = (() => {
    if (isPlotOrLand) return null;
    const stored = property.rental_yield ?? null;
    if (stored != null && stored > 0 && stored <= 50) {
      return `${Number(stored.toFixed(1))}%`;
    }
    const monthlyNum = Number(property.monthly_rental
      ? String(property.monthly_rental).replace(/[^\d.]/g, '')
      : 0);
    const price = Number(property.price ?? 0);
    if (monthlyNum > 0 && price > 0) {
      const computed = (monthlyNum * 12 * 100) / price;
      if (computed > 0 && computed <= 50) {
        return `${computed >= 10 ? Math.round(computed) : computed.toFixed(1)}%`;
      }
    }
    return null;
  })();

  const goToDetail = () => {
    showLocationModal(() => navigate(`/properties/${property.id}`));
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await shareProperty({
      id: property.id, title: saleTitle, type: property.type,
      area: property.area, price_label: property.price_label,
      monthly_rental_label: property.monthly_rental,
    });
    if (result === 'copied') {
      setShareFeedback('Copied!');
      setTimeout(() => setShareFeedback(''), 2000);
    }
  };

  const submitWhatsAppEnquiry = async ({ name, phone, lat, lng }: {
    name: string; phone: string; lat?: number; lng?: number;
  }) => {
    setWaLoading(true);
    try {
      await openWhatsAppPropertyEnquiry(
        { id: property.id, title: saleTitle, type: property.type, area: property.area,
          price_label: property.price_label, monthly_rental_label: property.monthly_rental,
          contact_phone: property.contact_phone, contact_name: property.contact_name },
        { source: 'card', leadType: 'whatsapp', buyerName: name, buyerPhone: phone, buyerLat: lat, buyerLng: lng },
      );
      setContactOpen(false);
    } finally { setWaLoading(false); }
  };

  const detailChips = [
    areaDisplay !== '—' ? { label: 'Area', value: areaDisplay } : null,
    monthlyRental ? { label: 'Monthly Rental Income', value: monthlyRental } : null,
    yieldLabel ? { label: 'Rental Yield', value: yieldLabel } : null,
    pricePerSqftLabel ? { label: 'Rate', value: pricePerSqftLabel } : null,
    property.status !== 'Ready to Move' ? { label: 'Status', value: property.status } : null,
    property.katha && property.katha !== '—' ? { label: 'Katha', value: property.katha } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.35, delay: index * 0.07 }}
      >
        <Card className="group overflow-hidden border-gray-100 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div
            role="button"
            tabIndex={0}
            onClick={goToDetail}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToDetail();
              }
            }}
            className="w-full cursor-pointer text-left"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
              {coverImage && !imgError ? (
                <SupabaseImage src={coverImage} alt={saleTitle} priority={index === 0}
                  onError={() => setImgError(true)}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                  <MapPin size={32} className="text-gray-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

              {doc.featured && (
                <Badge variant="secondary"
                  className="absolute left-2.5 top-2.5 z-10 bg-white/90 text-gray-800 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm border-0 backdrop-blur-sm">
                  Featured
                </Badge>
              )}

              <button type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(property.id); }}
                className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:bg-white active:scale-90"
                aria-label={saved ? 'Remove from shortlist' : 'Save property'}>
                <Heart size={12} weight={saved ? 'fill' : 'regular'}
                  className={saved ? 'text-red-500' : 'text-gray-400'} />
              </button>
            </div>

            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-0.5">
                <MapPin size={10} weight="fill" className="text-gray-300 shrink-0" />
                <span className="truncate">{cityName}</span>
              </div>

              <h3 className="text-[13px] font-semibold leading-snug text-gray-900 line-clamp-2 mb-1.5">
                {saleTitle}
              </h3>

              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-gray-400 mb-0.5">
                Asking Price
              </p>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-base font-bold text-gray-900 tracking-tight">
                  {isPlotOrLand ? formatINRCompact(property.price) : property.price_label}
                </span>
              </div>

              {detailChips.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {detailChips.map((chip) => (
                    <span key={chip.label}
                      className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-inset ring-gray-200/80">
                      {chip.value}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </div>

          <CardFooter className="border-t border-gray-100 p-3 pt-2.5">
            <div className="flex items-center gap-1.5 w-full">
              <Button variant="outline" size="sm" onClick={handleShare}
                className="flex-1 h-8 text-[10px] font-medium gap-1 rounded-lg px-2 sm:h-7">
                <ShareNetwork size={11} weight="duotone" />
                {shareFeedback || 'Share'}
              </Button>
              <Button size="sm"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setContactOpen(true); }}
                disabled={waLoading}
                className="flex-1 h-8 text-[10px] font-medium gap-1 rounded-lg px-2 bg-gray-900 hover:bg-gray-800 text-white sm:h-7">
                {waLoading ? '...' : 'WhatsApp'}
              </Button>
              <Button variant="outline" size="icon" onClick={goToDetail}
                className="h-8 w-8 shrink-0 rounded-lg sm:h-7 sm:w-7">
                <ArrowRight size={11} weight="bold" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      <PropertyEnquiryContactModal open={contactOpen}
        title="WhatsApp Enquiry"
        subtitle={`Share your details for ${saleTitle}`}
        listedBy={property.listed_by}
        onClose={() => setContactOpen(false)}
        onSubmit={submitWhatsAppEnquiry} />
    </>
  );
});

export default PremiumPropertyCard;
