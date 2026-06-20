import { useState, type CSSProperties, type ReactNode, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPrice } from '@/lib/formatPrice';
import { mapFirestoreToProperty } from '@/lib/firestoreProperties';
import { siteContact } from '@/data/siteContact';
import { shareProperty } from '@/utils/shareProperty';
import { setPropertyShareMeta, setDefaultSiteMeta } from '@/lib/siteMeta';
import { openWhatsAppPropertyEnquiry } from '@/utils/whatsappProperty';
import BookVisitCalendar from '../components/BookVisitCalendar';
import PgBuildingDetailsCard from '../components/PgBuildingDetailsCard';
import {
  Buildings,
  HouseLine,
  Storefront,
  Tree,
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
  type Icon,
} from '@phosphor-icons/react';
import { useShortlist } from '../context/ShortlistContext';
import {
  isPlotProperty,
  isLandOrPlotProperty,
  showsRentalIncome,
  isCommercialProperty,
  getPlotSubtype,
  type Property,
} from '../data/properties';

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
  if (plotSub === 'Agriculture Land') return Tree;
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

type DetailRow = { label: string; value: string };

function str(extra: Record<string, string | number> | undefined, key: string, fallback = '—'): string {
  const v = extra?.[key];
  return v !== undefined && v !== '' ? String(v) : fallback;
}

function buildDetailRows(property: Property): DetailRow[] {
  const extra = property.extraDetails ?? {};
  const plotSub = getPlotSubtype(property);

  if (property.type === 'PG Building') {
    return [
      { label: 'Total Area', value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
      { label: 'Built-up Area', value: `${property.builtUpAreaSqFt.toLocaleString('en-IN')} sq.ft` },
      { label: 'Plot Dimensions', value: property.dimensions },
      { label: 'Total Floors', value: String(property.floor_count) },
      { label: 'Total Rooms', value: String(property.total_units) },
      { label: 'Monthly Income', value: property.monthly_rental ?? '—' },
      { label: 'Annual Income', value: property.annual_income ?? '—' },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
      { label: 'Facing', value: property.facing },
      { label: 'Age', value: property.age },
      { label: 'Amenities', value: property.amenities.join(', ') || '—' },
    ];
  }

  if (property.type === 'Residential Rental Income') {
    return [
      { label: 'Total Area', value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
      { label: 'Built-up Area', value: `${property.builtUpAreaSqFt.toLocaleString('en-IN')} sq.ft` },
      { label: 'Plot Dimensions', value: property.dimensions },
      { label: 'Total Floors', value: String(property.floor_count) },
      { label: 'Total Units', value: String(property.total_units) },
      { label: 'Available Units', value: String(property.available_units) },
      { label: 'Occupancy %', value: `${property.occupancy_percent}%` },
      { label: 'Monthly Income', value: property.monthly_rental ?? '—' },
      { label: 'Annual Income', value: property.annual_income ?? '—' },
      { label: 'Rental Yield', value: property.rental_yield ? `${property.rental_yield}%` : '—' },
      { label: 'Facing', value: property.facing },
      { label: 'Age', value: property.age },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
      { label: 'Loan Eligible', value: str(extra, 'Loan Eligible', 'Yes') },
    ];
  }

  if (isCommercialProperty(property.type)) {
    const sub = property.commercial_subtype ?? 'Office Space';
    const base: DetailRow[] = [
      { label: 'Monthly Income', value: property.monthly_rental ?? '—' },
      { label: 'Annual Income', value: property.annual_income ?? '—' },
      { label: 'Total Area', value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
      { label: 'Total Floors', value: String(property.floor_count) },
      { label: 'Occupancy %', value: `${property.occupancy_percent}%` },
      { label: 'Facing', value: property.facing },
      { label: 'Age', value: property.age },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
    ];

    const subtypeRows: Record<string, DetailRow[]> = {
      'Office Space': [
        { label: 'Cabins', value: str(extra, 'Cabins') },
        { label: 'Meeting Rooms', value: str(extra, 'Meeting Rooms') },
        { label: 'Car Parking', value: str(extra, 'Car Parking') },
        { label: 'Power Backup', value: str(extra, 'Power Backup') },
      ],
      'Mall / Retail': [
        { label: 'Total Shops', value: str(extra, 'Shops') },
        { label: 'Anchor Tenant', value: str(extra, 'Anchor Tenant') },
        { label: 'Daily Footfall', value: str(extra, 'Footfall/Day') },
        { label: 'Parking', value: str(extra, 'Parking') },
      ],
      'Warehouse / Industrial': [
        { label: 'Floor Height', value: str(extra, 'Floor Height (ft)', '24 ft') },
        { label: 'Dock Doors', value: str(extra, 'Dock Doors') },
        { label: 'Power Load (KVA)', value: str(extra, 'Power Load (KVA)') },
        { label: 'Water Supply', value: str(extra, 'Water Supply', 'Yes') },
      ],
      'Hospital / Clinic': [
        { label: 'Total Beds', value: str(extra, 'Beds') },
        { label: 'OPD Rooms', value: str(extra, 'OPD Rooms') },
        { label: 'ICU', value: str(extra, 'ICU') },
        { label: 'Parking', value: str(extra, 'Parking') },
      ],
      'Hotel / Hospitality': [
        { label: 'Total Rooms', value: str(extra, 'Rooms') },
        { label: 'Restaurant', value: str(extra, 'Restaurant') },
        { label: 'Banquet Hall', value: str(extra, 'Banquet') },
        { label: 'Occupancy', value: `${property.occupancy_percent}%` },
      ],
      'Factory / Manufacturing': [
        { label: 'Floor Space', value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
        { label: 'Power Load', value: str(extra, 'Power Load') },
        { label: 'Water Supply', value: str(extra, 'Water Supply', 'Yes') },
        { label: 'Road Access', value: str(extra, 'Road Access', 'Yes') },
      ],
      Showroom: [
        { label: 'Ground Floor Area', value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
        { label: 'Frontage (ft)', value: str(extra, 'Frontage (ft)') },
        { label: 'Height (ft)', value: str(extra, 'Height (ft)') },
        { label: 'Parking', value: str(extra, 'Parking') },
      ],
      'Mixed Use': [
        { label: 'Commercial Area', value: str(extra, 'Commercial Area') },
        { label: 'Residential Area', value: str(extra, 'Residential Area') },
        { label: 'Total Floors', value: String(property.floor_count) },
      ],
      'Flex Space': [
        { label: 'Commercial Area', value: str(extra, 'Commercial Area') },
        { label: 'Residential Area', value: str(extra, 'Residential Area') },
        { label: 'Total Floors', value: String(property.floor_count) },
      ],
    };

    return [...base, ...(subtypeRows[sub] ?? subtypeRows['Office Space'])];
  }

  if (plotSub === 'Residential Plot') {
    return [
      { label: 'Total Area (sq.ft)', value: property.area_sqft.toLocaleString('en-IN') },
      { label: 'Dimensions', value: property.dimensions },
      { label: 'Facing', value: property.facing },
      { label: 'Road Width', value: str(extra, 'Road Width') },
      { label: 'Zone', value: str(extra, 'Zone') },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
      { label: 'Electricity', value: str(extra, 'Electricity') },
      { label: 'Water Source', value: str(extra, 'Water Source') },
      { label: 'Soil Type', value: str(extra, 'Soil Type') },
      { label: 'Nearest Landmark', value: str(extra, 'Nearest Landmark') },
    ];
  }

  if (plotSub === 'Commercial Plot') {
    return [
      { label: 'Total Area (sq.ft)', value: property.area_sqft.toLocaleString('en-IN') },
      { label: 'Dimensions', value: property.dimensions },
      { label: 'Facing', value: property.facing },
      { label: 'Road Width', value: str(extra, 'Road Width') },
      { label: 'Zone', value: str(extra, 'Zone') },
      { label: 'FSI / FAR', value: str(extra, 'FSI') },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
      { label: 'Electricity', value: str(extra, 'Electricity') },
      { label: 'Road Access', value: str(extra, 'Road Access') },
      { label: 'Nearest Landmark', value: str(extra, 'Nearest Landmark') },
    ];
  }

  if (plotSub === 'Agriculture Land') {
    return [
      { label: 'Total Area (acres)', value: `${(property.plotSizeSqFt / 43560).toFixed(2)} acres` },
      { label: 'Survey Number', value: str(extra, 'Survey No.') },
      { label: 'Facing', value: property.facing },
      { label: 'Road Access', value: str(extra, 'Road Access') },
      { label: 'Water Source', value: str(extra, 'Water Source') },
      { label: 'Soil Type', value: str(extra, 'Soil Type') },
      { label: 'Crop Suitability', value: str(extra, 'Crop Suitability') },
      { label: 'Electricity', value: str(extra, 'Electricity') },
      { label: 'Distance from City', value: str(extra, 'Distance from City') },
      { label: 'Legal Status', value: str(extra, 'Legal Status', 'Clear Title') },
    ];
  }

  return [];
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="uppercase text-[#aaa] text-[10px] tracking-[0.16em]"
      style={fontUI}
    >
      {children}
    </p>
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
  const detailRows = buildDetailRows(property);
  const galleryImages = property.images ?? [];
  const activeImage = galleryImages[0];
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

  const handleWhatsApp = async () => {
    if (waLoading) return;
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
        },
        { source: 'detail', leadType: 'whatsapp' },
      );
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
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-[#fff] min-h-screen pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
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
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-[12px] text-gray-700 transition hover:bg-gray-50 lg:hidden"
            style={fontUI}
          >
            <ShareNetwork size={14} weight="duotone" color="#444" />
            Share
          </button>
          <p className="hidden text-[12px] text-[#bbb] lg:block" style={fontUI}>
            Home / Properties / {truncate(property.title, 28)}
          </p>
        </div>
      </nav>

      <div className="w-full px-4 lg:px-12 xl:px-16 pt-8 lg:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-[61.8fr_38.2fr] gap-10 lg:gap-14">
          {/* Left column */}
          <div >
            {/* Image placeholder */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative w-full overflow-hidden bg-[#f2f2f2] aspect-square lg:aspect-[4/3]"
            >
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={property.title}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f2f2f2] to-[#e8e8e8]">
                  <TypeIcon size={72} weight="thin" color="#d0d0d0" />
                </div>
              )}
              <span
                className="absolute top-0 left-0 bg-[#000] text-[#fff] uppercase text-[10px] tracking-[0.14em] px-3 py-[5px]"
                style={fontUI}
              >
                {getImageBadge(property)}
              </span>
              <motion.button
                type="button"
                onClick={handleHeart}
                whileTap={{ scale: 0.88 }}
                transition={{ duration: 0.15 }}
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-[rgba(255,255,255,0.96)]"
                aria-label="Toggle shortlist"
              >
                <Heart
                  size={16}
                  weight={saved ? 'fill' : 'regular'}
                  color={saved ? '#000' : '#aaa'}
                />
              </motion.button>
              <p
                className="absolute bottom-0 right-0 text-[11px] text-[#aaa] italic p-3 bg-[rgba(255,255,255,0.85)]"
                style={fontUI}
              >
                {galleryImages.length > 1 ? `${galleryImages.length} photos` : 'Property photo'}
              </p>
            </motion.div>

            {/* Property header — area row, then type-for-sale title, then meta */}
            <div className="mt-8">
              <div className="flex items-center gap-[5px]">
                <MapPin size={12} weight="thin" color="#aaa" />
                <span className="text-[12px] text-[#aaa]" style={fontUI}>
                  {property.area}, Bangalore
                </span>
              </div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="uppercase text-[34px] lg:text-[56px] text-[#000] font-normal leading-[1.1] tracking-[-0.01em] mt-3"
                style={fontHeading}
              >
                {getTopLabel(property)}
              </motion.h1>
              <p className="text-[12px] text-[#aaa] mt-2" style={fontUI}>
                Listed {property.listed_days_ago} days ago
              </p>
            </div>

            {/* Investment highlights */}
            <div className="mt-8" >
              <SectionLabel>Investment Highlights</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3.5">
                {(property.highlights ?? []).map((h, i) => (
                  <motion.div
                    key={h}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }}
                    className="group flex items-center gap-2.5 border border-[#e8e8e8] px-4 py-[11px] hover:bg-[#000] hover:border-[#000] transition-all duration-200 ease-out"
                  >
                    <CheckCircle
                      size={13}
                      weight="regular"
                      className="text-[#000] group-hover:text-[#fff] shrink-0"
                    />
                    <span
                      className="text-[13px] text-[#000] group-hover:text-[#fff]"
                      style={fontUI}
                    >
                      {h}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Property details */}
            <div className="mt-9">
              <SectionLabel>Property Details</SectionLabel>
              {property.type === 'PG Building' ? (
                <PgBuildingDetailsCard property={property} />
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
                  <div className="divide-y divide-[#f2f2f2]">
                    {detailRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex min-h-[52px] flex-col justify-center gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                      >
                        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#aaa]" style={fontUI}>
                          {row.label}
                        </span>
                        <span
                          className="text-[14px] font-medium leading-snug text-[#000] sm:max-w-[58%] sm:text-right"
                          style={fontUI}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Amenities */}
            {!isLandOrPlot && (property.amenities ?? []).length > 0 && (
              <div className="mt-9" >
                <SectionLabel>Amenities &amp; Features</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3.5">
                  {(property.amenities ?? []).map((amenity, i) => {
                    const AmenityIcon = getAmenityIcon(amenity);
                    return (
                      <motion.div
                        key={amenity}
                        initial={{ opacity: 0, scale: 0.93 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.035, duration: 0.35, ease: 'easeOut' }}
                        className="group flex flex-col items-center gap-2.5 border border-[#ebebeb] px-2.5 py-4 text-center hover:bg-[#000] transition-colors duration-200"
                      >
                        <AmenityIcon
                          size={22}
                          weight="thin"
                          className="text-[#000] group-hover:text-[#fff]"
                        />
                        <span
                          className="text-[11px] text-[#444] group-hover:text-[#fff]"
                          style={fontUI}
                        >
                          {amenity}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* About */}
            <div className="mt-9" >
              <SectionLabel>About This Property</SectionLabel>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-[19px] text-[#333] leading-[1.72] tracking-[0.01em] mt-3.5"
                style={fontHeading}
              >
                {property.description}
              </motion.p>
            </div>

            {/* Rental income snapshot */}
            {showRental && (
              <div className="mt-9" >
                <SectionLabel>Rental Income Snapshot</SectionLabel>
                <div className="mt-3.5 overflow-hidden rounded-xl border border-[#ebebeb] bg-[#f9f9f9]">
                  <div className="grid grid-cols-1 gap-px bg-[#e0e0e0] sm:grid-cols-3">
                    <div className="bg-[#f9f9f9] px-4 py-5 sm:border-r sm:border-[#e0e0e0]">
                      <p className="uppercase text-[9px] text-[#aaa] tracking-[0.12em]" style={fontUI}>
                        Monthly
                      </p>
                      <p className="mt-2 font-numeric text-[28px] font-medium leading-none text-[#000] sm:text-[34px]" style={fontPrice}>
                        {property.monthly_rental ?? '—'}
                      </p>
                    </div>
                    <div className="bg-[#f9f9f9] px-4 py-5 sm:border-r sm:border-[#e0e0e0]">
                      <p className="uppercase text-[9px] text-[#aaa] tracking-[0.12em]" style={fontUI}>
                        Annual
                      </p>
                      <p className="mt-2 font-numeric text-[28px] font-medium leading-none text-[#000] sm:text-[34px]" style={fontPrice}>
                        {property.annual_income ?? '—'}
                      </p>
                    </div>
                    <div className="bg-white px-4 py-5">
                      <p className="uppercase text-[9px] text-[#aaa] tracking-[0.12em]" style={fontUI}>
                        Est. Yield
                      </p>
                      <p className="mt-2 font-numeric text-[28px] font-medium leading-none text-[#000] sm:text-[34px]" style={fontPrice}>
                        {property.rental_yield ? `${property.rental_yield}%` : '—'}
                      </p>
                    </div>
                  </div>
                  <p className="border-t border-[#ebebeb] px-4 py-3 text-[11px] text-[#bbb]" style={fontUI}>
                    Based on current occupancy. Actual returns may vary.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Right column — sticky panel (desktop) */}
          <aside className="hidden lg:block" >
            <div className="sticky top-[72px] border border-[#e8e8e8] bg-[#fff]" >
              <div className="bg-[#000] px-[26px] py-6" >
                <p className="uppercase text-[9px] text-[#666] tracking-[0.16em]" style={fontUI}>
                  Asking Price
                </p>
                <p
                  className="text-[44px] text-[#fff] font-medium leading-none mt-1 tracking-tight"
                  style={fontPrice}
                >
                  {formatPrice(property.price)}
                </p>
                <p className="text-[13px] text-[#888] mt-2" style={fontUI}>
                  {showRental ? (
                    <>
                      Monthly Income ·{' '}
                      <span className="text-[#ccc]">{property.monthly_rental ?? '—'}</span>
                    </>
                  ) : (
                    <>
                      Total Area ·{' '}
                      <span className="text-[#ccc]">
                        {property.area_sqft.toLocaleString('en-IN')} sq.ft
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="px-[26px] py-[22px] flex flex-col gap-2.5" >
                <motion.button
                  type="button"
                  onClick={() => setShowBooking((open) => !open)}
                  whileHover={{ backgroundColor: '#222' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-[50px] w-full items-center justify-center gap-2.5 bg-[#000] text-[13px] font-semibold uppercase tracking-[0.1em] text-[#fff]"
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
                  className="flex h-[46px] w-full items-center justify-center gap-2 border border-[#25D366] bg-[#25D366] text-[12px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-70"
                  style={fontUI}
                >
                  <WhatsappLogo size={16} weight="fill" color="#fff" />
                  {waLoading ? 'Opening...' : 'WhatsApp Enquiry'}
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleHeart}
                  whileTap={{ scale: 0.94 }}
                  className="w-full h-9 flex items-center justify-center gap-2 text-[12px] text-[#888] bg-transparent border-0"
                  style={fontUI}
                >
                  <Heart
                    size={13}
                    weight={saved ? 'fill' : 'regular'}
                    color={saved ? '#000' : '#bbb'}
                  />
                  {saved ? 'Saved ✓' : 'Save to Shortlist'}
                </motion.button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-11 w-full min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-lg border-2 border-gray-900 bg-white text-[12px] font-semibold text-gray-900 transition hover:bg-gray-50 active:scale-[0.98]"
                  style={fontUI}
                >
                  <ShareNetwork size={16} weight="duotone" color="#111" />
                  {shareFeedback || 'Share This Property'}
                </button>
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

              <div className="px-[26px] py-4 border-t border-[#f0f0f0]" >
                <p className="text-[11px] text-[#bbb] text-center" style={fontUI}>
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
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-stretch gap-2 px-3 py-2.5 lg:px-12 xl:px-16">
          <div className="flex min-h-[48px] min-w-0 flex-col justify-center pr-1">
            <p
              className="truncate text-[20px] font-medium leading-none tracking-tight text-[#000] sm:text-[22px]"
              style={fontPrice}
            >
              {formatPrice(property.price)}
            </p>
            <p className="mt-1 truncate text-[10px] leading-tight text-[#888] sm:text-[11px]" style={fontUI}>
              {showRental
                ? `Monthly · ${property.monthly_rental ?? '—'}`
                : `${property.area_sqft.toLocaleString('en-IN')} sq.ft`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share property"
            className="flex min-h-[48px] min-w-[72px] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-gray-900 bg-white px-3 active:scale-[0.98] sm:min-w-[80px]"
          >
            <ShareNetwork size={18} weight="duotone" color="#111" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-900" style={fontUI}>
              Share
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowBooking(true)}
            className="flex min-h-[48px] min-w-[96px] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl bg-[#000] px-4 active:scale-[0.98] sm:min-w-[108px]"
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
    </motion.div>
  );
}
