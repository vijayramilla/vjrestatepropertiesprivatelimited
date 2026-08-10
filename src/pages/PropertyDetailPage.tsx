import { useState, type CSSProperties, type ReactNode, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatCardTotalPrice, formatCardPricePerSqft, formatPrice } from '@/lib/formatPrice';
import { formatArea } from '@/lib/plotLandForm';
import { mapFirestoreToProperty } from '@/lib/firestoreProperties';
import { siteContact } from '@/data/siteContact';
import { shareProperty } from '@/utils/shareProperty';
import { setPropertyShareMeta, setDefaultSiteMeta } from '@/lib/siteMeta';
import { openWhatsAppPropertyEnquiry } from '@/utils/whatsappProperty';
import BookVisitCalendar from '../components/BookVisitCalendar';
import VJRAIButton from '../components/ai/VJRAIButton';
import PropertyEnquiryContactModal from '@/components/PropertyEnquiryContactModal';
import PropertyDetailsPanel, { PropertyAtAGlance } from '../components/PropertyDetailsPanel';

import {
  Buildings,
  HouseLine,
  Storefront,
  Blueprint,
  Warehouse,
  FirstAid,
  ShoppingBag,
  Factory,
  ArrowLeft,
  Heart,
  ShareNetwork,
  WhatsappLogo,
  CheckCircle,
  CalendarBlank,
  Shield,
  Lightning,
  Car,
  Drop,
  Fire,
  Camera,
  ArrowUp,
  WifiHigh,
  MapPin,
  CaretDown,
  ArrowRight,
  X,
  FilePdf,
  type Icon,
} from '@phosphor-icons/react';
import { useShortlist } from '../context/ShortlistContext';
import LazyImage from '@/components/common/LazyImage';
import {
  isPlotProperty,
  isLandOrPlotProperty,
  showsRentalIncome,
  isCommercialProperty,
  getPlotSubtype,
  type Property,
} from '../data/properties';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel';

const fontHeading: CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const fontUI: CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" };
const fontPrice: CSSProperties = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontVariantNumeric: 'tabular-nums',
};
function truncate(str: string, len: number) {
  return str.length > len ? `${str.slice(0, len)}…` : str;
}

function getTopLabel(property: Property): string {
  if (isCommercialProperty(property.type) && property.commercial_subtype) {
    return `${property.commercial_subtype.toUpperCase()} FOR SALE`;
  }
  const plotSub = getPlotSubtype(property);
  if (isPlotProperty(property.type) && plotSub) {
    return `${plotSub.toUpperCase()} FOR SALE`;
  }
  return `${property.type.toUpperCase()} FOR SALE`;
}

function getImageBadge(property: Property): string {
  if (isCommercialProperty(property.type) && property.commercial_subtype) {
    return property.commercial_subtype.toUpperCase();
  }
  const plotSub = getPlotSubtype(property);
  if (isPlotProperty(property.type) && plotSub) {
    return plotSub.toUpperCase();
  }
  return property.type.toUpperCase();
}

function getCategoryIcon(property: Property): Icon {
  if (property.type === 'PG Building') return Buildings;
  if (property.type === 'Residential Rental Income') return HouseLine;
  if (isCommercialProperty(property.type)) {
    const sub = property.commercial_subtype ?? '';
    if (sub.includes('Office')) return Buildings;
    if (sub.includes('Mall') || sub.includes('Retail')) return ShoppingBag;
    if (sub.includes('Hospital') || sub.includes('Clinic')) return FirstAid;
    if (sub.includes('Warehouse')) return Warehouse;
    if (sub.includes('Showroom')) return Storefront;
    if (sub.includes('Hotel') || sub.includes('Hospitality')) return Buildings;
    if (sub.includes('Factory') || sub.includes('Manufacturing')) return Factory;
    if (sub.includes('Mixed') || sub.includes('Flex')) return Blueprint;
    return Storefront;
  }
  const plotSub = getPlotSubtype(property);
  if (plotSub === 'Commercial Plot') return Storefront;
  return Blueprint;
}

function getAmenityIcon(name: string): Icon {
  const map: Record<string, Icon> = {
    'Power Backup': Lightning,
    'Car Parking': Car,
    'Water Supply': Drop,
    Lift: ArrowUp,
    '24/7 Security': Shield,
    'Fire Safety': Fire,
    Generator: Lightning,
    CCTV: Camera,
    'Wi-Fi': WifiHigh,
  };
  return map[name] ?? Shield;
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-4 w-1 shrink-0 rounded-full bg-[#C9A84C]" />
      <h2
        className="text-[17px] font-bold tracking-tight text-[#111] sm:text-[18px]"
        style={fontUI}
      >
        {children}
      </h2>
    </div>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null | undefined>(undefined);
  const [loading, setLoading] = useState(!!id);
  const { isShortlisted, toggle } = useShortlist();
  const [showBooking, setShowBooking] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [waLoading, setWaLoading] = useState(false);
  const [waContactOpen, setWaContactOpen] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [descExpanded, setDescExpanded] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [pdfState, setPdfState] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    if (!id) return;

    const fetchProperty = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'properties', id));
        if (docSnap.exists()) {
          setProperty(mapFirestoreToProperty(docSnap.id, docSnap.data()));
        } else {
          setProperty(null);
        }
      } catch (error) {
        console.error('Error fetching property:', error);
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  const recentlyViewedId = id;
  useEffect(() => {
    if (!recentlyViewedId) return;
    try {
      const key = 'vjr_recently_viewed'
      const stored = localStorage.getItem(key)
      const ids: string[] = stored ? JSON.parse(stored) : []
      const updated = [recentlyViewedId, ...ids.filter((i) => i !== recentlyViewedId)].slice(0, 10)
      localStorage.setItem(key, JSON.stringify(updated))
    } catch (e) {
      console.error('Recently viewed save error:', e)
    }
  }, [recentlyViewedId]);

  useEffect(() => {
    if (!property) return;
    setPropertyShareMeta({
      id: property.id,
      title: property.title,
      area: property.area,
      type: property.type,
      priceLabel: formatPrice(property.price),
      imageUrl: property.images?.[0],
    });
    return () => setDefaultSiteMeta();
  }, [property]);

  useEffect(() => {
    document.body.style.overflow = viewerIndex !== null ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewerIndex]);

  useEffect(() => {
    if (viewerIndex === null || !property) return;
    const count = (property.images ?? []).length;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerIndex(null);
      else if (e.key === 'ArrowRight') setViewerIndex((i) => (i === null ? i : (i + 1) % count));
      else if (e.key === 'ArrowLeft') setViewerIndex((i) => (i === null ? i : (i - 1 + count) % count));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [viewerIndex, property]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div
        className="min-h-screen bg-[#fff] flex items-center justify-center"
      >
        <div className="text-center px-6">
          <h1 className="text-3xl text-[#000] mb-4" style={fontHeading}>
            Property not found
          </h1>
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="text-[13px] text-[#444] border border-[#000] px-6 py-2.5 hover:bg-[#000] hover:text-[#fff] transition-colors duration-200"
            style={fontUI}
          >
            ← Back to Properties
          </button>
        </div>
      </div>
    );
  }

  const propertyId = property.id;
  const saved = isShortlisted(propertyId);
  const isLandOrPlot = isLandOrPlotProperty(property);
  const showRental = showsRentalIncome(property);
  const TypeIcon = getCategoryIcon(property);
  const plotAreaDisplay = formatArea(
    property.area_unit,
    property.area_sqft,
    property.area_acres,
    property.area_guntas,
  );
  const galleryImages = property.images ?? [];
  const handleHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(propertyId);
  };

  const handleShare = async () => {
    try {
      const result = await shareProperty({
        id: property.id,
        title: property.title,
        type: property.type,
        area: property.area,
        price_label: formatPrice(property.price),
        monthly_rental_label: property.monthly_rental ?? undefined,
      });
      if (result === 'copied') setShareFeedback('Link Copied! ✓');
      else if (result === 'shared') setShareFeedback('Shared!');
      else if (result === 'whatsapp') setShareFeedback('Opening WhatsApp…');
      else if (result === 'failed') setShareFeedback('Could not share — try again');
      else return;
      window.setTimeout(() => setShareFeedback(''), 2500);
    } catch {
      setShareFeedback('Could not share — try again');
      window.setTimeout(() => setShareFeedback(''), 2500);
    }
  };

  const handleWhatsApp = () => {
    if (waLoading) return;
    setWaContactOpen(true);
  };

  const handleDownloadPdf = async () => {
    if (pdfState === 'loading' || !property) return;
    setPdfState('loading');
    try {
      const res = await fetch(`/api/property-pdf/${encodeURIComponent(property.id)}`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error(`PDF request failed: ${res.status}`);
      // Never save a non-PDF response (e.g. the SPA shell or an error page) as a .pdf file.
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/pdf')) {
        throw new Error(`PDF endpoint returned ${contentType || 'unknown content type'}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Property-${property.propertyCode || property.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPdfState('idle');
    } catch {
      setPdfState('error');
      window.setTimeout(() => setPdfState('idle'), 4000);
    }
  };

  const submitWhatsAppEnquiry = async ({ name, phone, lat, lng }: { name: string; phone: string; lat?: number; lng?: number }) => {
    if (!property) return;
    setWaLoading(true);
    try {
      await openWhatsAppPropertyEnquiry(
        {
          id: property.id,
          title: property.title,
          type: property.type,
          area: property.area,
          price_label: formatPrice(property.price),
          monthly_rental_label: property.monthly_rental ?? undefined,
          contact_phone: property.contact_phone,
          contact_name: property.contact_name,
        },
        { source: 'detail', leadType: 'whatsapp', buyerName: name, buyerPhone: phone, buyerLat: lat, buyerLng: lng },
      );
      setWaContactOpen(false);
    } finally {
      setWaLoading(false);
    }
  };

  const bookProperty = {
    id: property.id,
    title: property.title,
    type: property.type,
    area: property.area,
    price_label: formatPrice(property.price),
    monthly_rental_label: property.monthly_rental,
    contact_phone: property.contact_phone,
    contact_name: property.contact_name,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-[#f7f8fa] min-h-screen pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
    >
      {/* Top nav */}
      <nav
        className="sticky top-0 z-40 bg-[#fff] border-b border-[#e8e8e8] h-12 lg:h-[52px] flex items-center"
      >
        <div className="w-full px-4 lg:px-12 xl:px-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[13px] text-[#444] hover:text-[#000] transition-colors duration-200"
            style={fontUI}
          >
            <ArrowLeft size={15} weight="regular" color="#444" />
            Back to Properties
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="lg:hidden gap-1.5 text-[12px]"
            style={fontUI}
          >
            <ShareNetwork size={14} weight="duotone" color="#444" />
            Share
          </Button>
          <p className="hidden text-[12px] text-[#bbb] lg:block" style={fontUI}>
            Home / Properties / {truncate(property.title, 28)}
          </p>
        </div>
      </nav>

      <div className="w-full px-4 lg:px-12 xl:px-16 pt-8 lg:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-10 lg:gap-12">
          {/* Left column */}
          <div>
            {/* Image carousel */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="overflow-hidden rounded-2xl border border-[#e8e8ea] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <Carousel setApi={setCarouselApi} className="w-full bg-[#f2f2f2]">
                <CarouselContent>
                  {(galleryImages.length > 0 ? galleryImages : [null]).map((img, i) => (
                    <CarouselItem key={i} className="relative aspect-[4/3] lg:aspect-[16/9]">
                      {img ? (
                        <button
                          type="button"
                          onClick={() => setViewerIndex(i)}
                          className="absolute inset-0 block w-full h-full cursor-zoom-in"
                          aria-label="View image full screen"
                        >
                          <LazyImage
                            src={img}
                            alt={`${property.title} ${i + 1}`}
                            priority={i === 0}
                            className="absolute inset-0 w-full h-full object-cover object-center"
                          />
                        </button>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f2f2f2] to-[#e8e8e8]">
                          <TypeIcon size={72} weight="thin" color="#d0d0d0" />
                        </div>
                      )}
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {galleryImages.length > 1 && (
                  <>
                    <CarouselPrevious className="left-3 h-9 w-9 rounded-full bg-white/90 border-0 shadow-md hover:bg-white" />
                    <CarouselNext className="right-3 h-9 w-9 rounded-full bg-white/90 border-0 shadow-md hover:bg-white" />
                  </>
                )}
                <span
                  className="absolute top-0 left-0 z-10 bg-[#C9A84C] text-[#0A1628] uppercase text-[10px] font-bold tracking-[0.14em] px-3 py-[5px] rounded-br-lg"
                  style={fontUI}
                >
                  {getImageBadge(property)}
                </span>
                <motion.button
                  type="button"
                  onClick={handleHeart}
                  whileTap={{ scale: 0.88 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-[rgba(255,255,255,0.96)] rounded-full shadow-md"
                  aria-label="Toggle shortlist"
                >
                  <Heart
                    size={16}
                    weight={saved ? 'fill' : 'regular'}
                    color={saved ? '#C9A84C' : '#aaa'}
                  />
                </motion.button>
                {galleryImages.length > 1 && (
                  <span
                    className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-[#0A1628] px-4 py-2 text-[12px] font-semibold text-white shadow-lg"
                    style={fontUI}
                  >
                    <Camera size={13} weight="fill" />
                    +{galleryImages.length} Photos
                  </span>
                )}
              </Carousel>
            </motion.div>

            {galleryImages.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => carouselApi?.scrollTo(i)}
                    className="shrink-0 w-[52px] h-[52px] rounded-lg overflow-hidden border-2 border-transparent hover:border-[#C9A84C] focus:border-[#C9A84C] transition-colors duration-200"
                  >
                    <LazyImage src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Property header — location, title, id */}
            <div className="mt-8">
              <div className="flex items-center gap-[5px]">
                <MapPin size={13} weight="fill" color="#C9A84C" />
                <span className="text-[12px] text-[#666]" style={fontUI}>
                  {property.area}, Bangalore
                </span>
              </div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="mt-2.5 text-[24px] font-bold leading-[1.12] tracking-[-0.01em] text-[#111] lg:text-[32px]"
                style={fontUI}
              >
                {getTopLabel(property)}
              </motion.h1>
              {property.propertyCode && (
                <Badge variant="outline" className="mt-3 bg-white text-[11px] font-mono tracking-wide">
                  ID: {property.propertyCode}
                </Badge>
              )}
            </div>

            {/* At-a-glance key specs */}
            <div className="mt-6">
              <PropertyAtAGlance property={property} />
            </div>

            {(property.facing || property.katha || property.dimensions) && (
              <div className="flex flex-wrap items-center gap-2 mt-6 mb-1">
                {property.facing && (
                  <span className="inline-block bg-white border border-[#e8e8ea] text-[11px] text-[#333] px-3 py-1.5 rounded-full tracking-wide" style={fontUI}>{property.facing} Facing</span>
                )}
                {property.katha && (
                  <span className="inline-block bg-white border border-[#e8e8ea] text-[11px] text-[#333] px-3 py-1.5 rounded-full tracking-wide" style={fontUI}>{property.katha} Katha</span>
                )}
                {property.dimensions && (
                  <span className="inline-block bg-white border border-[#e8e8ea] text-[11px] text-[#333] px-3 py-1.5 rounded-full tracking-wide" style={fontUI}>{property.dimensions}</span>
                )}
              </div>
            )}

            {/* Property details */}
            <div className="mt-10">
              <PropertyDetailsPanel property={property} />
            </div>

            {/* Property highlights */}
            <div className="mt-10 rounded-2xl border border-[#e8e8ea] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
              <SectionHeader>Property Highlights</SectionHeader>
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {(property.highlights ?? []).map((h, i) => (
                  <motion.div
                    key={h}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }}
                    className="flex items-center gap-3"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22C26E]/15">
                      <CheckCircle size={12} weight="bold" className="text-[#22C26E]" />
                    </span>
                    <span className="text-[13.5px] text-[#333]" style={fontUI}>
                      {h}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {!isLandOrPlot && (property.amenities ?? []).length > 0 && (
              <div className="mt-10 rounded-2xl border border-[#e8e8ea] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
                <SectionHeader>Amenities &amp; Features</SectionHeader>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                  {(property.amenities ?? []).map((amenity, i) => {
                    const AmenityIcon = getAmenityIcon(amenity);
                    return (
                      <motion.div
                        key={amenity}
                        initial={{ opacity: 0, scale: 0.93 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.035, duration: 0.35, ease: 'easeOut' }}
                        className="flex items-center gap-3 rounded-xl border border-[#f0f1f3] px-3.5 py-3 hover:border-[#C9A84C]/50 hover:bg-[#FBF7EC] transition-colors duration-200"
                      >
                        <AmenityIcon size={19} weight="regular" className="shrink-0 text-[#C9A84C]" />
                        <span className="text-[12.5px] text-[#333]" style={fontUI}>
                          {amenity}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* About */}
            <div className="mt-10 rounded-2xl border border-[#e8e8ea] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
              <SectionHeader>About This Property</SectionHeader>
              <div className="relative mt-4">
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`text-[14.5px] lg:text-[15px] text-[#333] leading-[1.75] tracking-[0.005em] ${
                    !descExpanded ? 'line-clamp-4' : ''
                  }`}
                  style={fontUI}
                >
                  {property.description}
                </motion.p>
                {property.description.length > 220 && (
                  <>
                    {!descExpanded && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                    )}
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-2 flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0A1628] hover:opacity-70 transition-opacity"
                      style={fontUI}
                    >
                      {descExpanded ? 'Read Less' : 'Read More'}
                      <CaretDown
                        size={13}
                        weight="bold"
                        className={`transition-transform duration-200 ${descExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Nearby landmarks */}
            <div className="mt-10 rounded-2xl border border-[#e8e8ea] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6">
              <SectionHeader>Nearby Landmarks</SectionHeader>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Hospitals', detail: 'Within 5 km radius' },
                  { label: 'Schools', detail: 'Within 3 km radius' },
                  { label: 'Connectivity', detail: 'Well-connected via roads' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-[#f0f1f3] bg-[#fafbfc] px-4 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8f98]" style={fontUI}>{item.label}</p>
                    <p className="mt-1.5 text-[13px] font-medium text-[#111]" style={fontUI}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right column — sticky contact card (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-[72px] overflow-hidden rounded-2xl border border-[#e8e8ea] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              {/* Price */}
              <div className="border-b border-[#eef0f2] px-6 py-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8f98]" style={fontUI}>
                  Asking Price
                </p>
                <p
                  className="mt-1.5 text-[40px] font-bold leading-none tracking-tight text-[#111]"
                  style={fontPrice}
                >
                  {formatCardTotalPrice(property.price)}
                </p>
                <p className="mt-2.5 text-[12.5px] text-[#666]" style={fontUI}>
                  {showRental ? (
                    <>
                      Monthly Income ·{' '}
                      <span className="font-semibold text-[#22C26E]">{property.monthly_rental ?? '—'}</span>
                    </>
                  ) : (
                    <>
                      {(property.price_per_sqft ?? 0) > 0 && (
                        <span className="font-semibold text-[#A98C3B]">
                          {formatCardPricePerSqft(property.price_per_sqft)}
                        </span>
                      )}
                      {(property.price_per_sqft ?? 0) > 0 && plotAreaDisplay !== '—' && ' · '}
                      {plotAreaDisplay !== '—' && (
                        <span className="text-[#333]">{plotAreaDisplay}</span>
                      )}
                    </>
                  )}
                </p>
              </div>

              <div className="px-6 py-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={pdfState === 'loading'}
                  className="flex h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#e0e2e5] bg-white text-[12px] font-semibold text-[#444] hover:border-[#C9A84C]/60 hover:text-[#0A1628] transition-colors duration-200 disabled:opacity-70"
                  style={fontUI}
                >
                  <FilePdf size={15} weight="fill" color="#C9A84C" />
                  {pdfState === 'loading' ? 'Generating PDF...' : 'Download PDF'}
                </button>
                {pdfState === 'error' && (
                  <p className="text-[11.5px] text-[#c0392b] text-center" style={fontUI}>
                    Unable to generate the PDF. Please try again.
                  </p>
                )}
                <motion.button
                  type="button"
                  onClick={() => setShowBooking((open) => !open)}
                  whileHover={{ backgroundColor: '#1E3852' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#0A1628] text-[13px] font-semibold uppercase tracking-[0.08em] text-[#fff] shadow-[0_8px_20px_rgba(10,22,40,0.28)]"
                  style={fontUI}
                >
                  <CalendarBlank size={15} weight="regular" color="#fff" />
                  Book Now
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleWhatsApp}
                  disabled={waLoading}
                  whileTap={{ scale: 0.97 }}
                  className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[12px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_8px_20px_rgba(37,211,102,0.28)] disabled:opacity-70"
                  style={fontUI}
                >
                  <WhatsappLogo size={16} weight="fill" color="#fff" />
                  {waLoading ? 'Opening...' : 'WhatsApp Enquiry'}
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleHeart}
                  whileTap={{ scale: 0.94 }}
                  className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-[#e0e2e5] bg-white text-[12.5px] font-semibold text-[#444] hover:border-[#C9A84C]/60 hover:text-[#0A1628] transition-colors duration-200"
                  style={fontUI}
                >
                  <Heart
                    size={13}
                    weight={saved ? 'fill' : 'regular'}
                    color={saved ? '#C9A84C' : '#999'}
                  />
                  {saved ? 'Saved ✓' : 'Save to Shortlist'}
                </motion.button>

                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="w-full h-11 text-[12.5px] font-semibold gap-2 rounded-xl border-[#e0e2e5]"
                  style={fontUI}
                >
                  <ShareNetwork size={16} weight="duotone" color="#C9A84C" />
                  {shareFeedback || 'Share This Property'}
                </Button>
              </div>

              <AnimatePresence>
                {showBooking && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="hidden lg:block overflow-hidden border-t border-[#ebebeb]"
                  >
                    <BookVisitCalendar
                      property={bookProperty}
                      source="detail"
                      onClose={() => setShowBooking(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="px-6 py-4 border-t border-[#f0f1f3]" >
                <p className="text-[11px] text-[#999] text-center" style={fontUI}>
                  VJR Estate Properties Pvt. Ltd. · {siteContact.addressShort}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky bottom bar — safe-area aware, full-width grid */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e8e8e8] bg-white/95 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-stretch gap-2 px-3 py-2.5 lg:px-12 xl:px-16">
          <div className="flex min-h-[48px] min-w-0 flex-col justify-center pr-1">
            <p
              className="truncate text-[20px] font-medium leading-none tracking-tight text-[#000] sm:text-[22px]"
              style={fontPrice}
            >
              {formatCardTotalPrice(property.price)}
            </p>
            <p className="mt-1 truncate text-[10px] leading-tight text-[#888] sm:text-[11px]" style={fontUI}>
              {showRental
                ? `Monthly · ${property.monthly_rental ?? '—'}`
                : (property.price_per_sqft ?? 0) > 0
                  ? formatCardPricePerSqft(property.price_per_sqft)
                  : plotAreaDisplay}
            </p>
          </div>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share property"
            className="flex min-h-[48px] min-w-[72px] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-[#0A1628] bg-white px-3 active:scale-[0.98] sm:min-w-[80px]"
          >
            <ShareNetwork size={18} weight="duotone" color="#0A1628" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#0A1628]" style={fontUI}>
              Share
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfState === 'loading'}
            aria-label="Download property PDF"
            className="flex min-h-[48px] min-w-[72px] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-[#C9A84C] bg-white px-3 active:scale-[0.98] disabled:opacity-70 sm:min-w-[80px]"
          >
            <FilePdf size={18} weight="fill" color="#C9A84C" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#0A1628]" style={fontUI}>
              {pdfState === 'loading' ? 'PDF...' : 'PDF'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowBooking(true)}
            className="flex min-h-[48px] min-w-[96px] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl bg-[#0A1628] px-4 active:scale-[0.98] sm:min-w-[108px]"
            style={fontUI}
          >
            <CalendarBlank size={18} weight="regular" color="#fff" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
              Book Now
            </span>
          </button>
        </div>
      </div>

      {shareFeedback && (
        <div
          className="fixed left-1/2 z-[55] -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-[12px] text-white lg:hidden"
          style={{
            ...fontUI,
            bottom: 'calc(5.75rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {shareFeedback}
        </div>
      )}

      {/* Mobile booking calendar sheet */}
      <AnimatePresence>
        {showBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-[60]"
          >
            <button
              type="button"
              aria-label="Close booking calendar"
              className="absolute inset-0 bg-[#000]/40"
              onClick={() => setShowBooking(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-x-0 overflow-y-auto overscroll-contain bg-[#fff] border-t border-[#e8e8e8]"
              style={{
                bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
                maxHeight: 'calc(100dvh - 4.5rem - env(safe-area-inset-bottom, 0px))',
              }}
            >
              <BookVisitCalendar
                property={bookProperty}
                source="detail"
                onClose={() => setShowBooking(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PropertyEnquiryContactModal
        open={waContactOpen}
        title="WhatsApp Enquiry"
        subtitle={`Share your details for ${property.title}`}
        listedBy={property.listed_by}
        onClose={() => setWaContactOpen(false)}
        onSubmit={submitWhatsAppEnquiry}
      />

      <AnimatePresence>
        {viewerIndex !== null && galleryImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex flex-col bg-black/95"
            onClick={() => setViewerIndex(null)}
          >
            <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
              <p className="text-[12px] tracking-wide text-white/70" style={fontUI}>
                {viewerIndex + 1} / {galleryImages.length}
              </p>
              <button
                type="button"
                onClick={() => setViewerIndex(null)}
                aria-label="Close image viewer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
              {galleryImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex((viewerIndex - 1 + galleryImages.length) % galleryImages.length);
                  }}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
                >
                  <ArrowLeft size={22} weight="bold" />
                </button>
              )}
              <LazyImage
                src={galleryImages[viewerIndex]}
                alt={`${property.title} ${viewerIndex + 1}`}
                className="max-h-full max-w-full object-contain"
              />
              {galleryImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex((viewerIndex + 1) % galleryImages.length);
                  }}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
                >
                  <ArrowRight size={22} weight="bold" />
                </button>
              )}
            </div>

            <div className="shrink-0 overflow-x-auto px-4 py-4 sm:px-6">
              <div className="flex justify-center gap-2.5">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerIndex(i);
                    }}
                    aria-label={`View image ${i + 1}`}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === viewerIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <LazyImage src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <VJRAIButton userRole="public" />
    </motion.div>
  );
}
