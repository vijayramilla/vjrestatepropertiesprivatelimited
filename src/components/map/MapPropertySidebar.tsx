import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Heart, MapPin, X } from 'lucide-react';
import { WhatsappLogo } from '@phosphor-icons/react';
import { CATEGORY_CONFIG, formatMapINR } from '@/data/mapConfig';
import { useShortlist } from '@/context/ShortlistContext';
import { openWhatsAppPropertyEnquiry } from '@/utils/whatsappProperty';
import PropertyEnquiryContactModal from '@/components/PropertyEnquiryContactModal';
import LazyImage from '@/components/common/LazyImage';

export interface MapSidebarProperty {
  id: string;
  locality: string;
  propertyType: keyof typeof CATEGORY_CONFIG;
  price: number;
  pricePerSqft: number;
  title: string;
  image: string | null;
  areaLabel: string;
  color: string;
  priceLabel: string;
  listed_by?: string;
  contact_phone?: string;
  contact_name?: string;
}

interface MapPropertySidebarProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  properties: MapSidebarProperty[];
  onViewDetails?: (id: string) => void;
}

export default function MapPropertySidebar({
  open,
  onOpen,
  onClose,
  properties,
  onViewDetails,
}: MapPropertySidebarProps) {
  const navigate = useNavigate();
  const { isShortlisted, toggle } = useShortlist();
  const [contactProperty, setContactProperty] = useState<MapSidebarProperty | null>(null);
  const [waLoading, setWaLoading] = useState(false);

  const goToProperty = (id: string) => {
    if (onViewDetails) {
      onViewDetails(id);
    } else {
      navigate(`/properties/${id}`);
    }
  };

  const submitWhatsAppEnquiry = async ({ name, phone, lat, lng }: { name: string; phone: string; lat?: number; lng?: number }) => {
    if (!contactProperty) return;
    setWaLoading(true);
    try {
      const config = CATEGORY_CONFIG[contactProperty.propertyType];
      await openWhatsAppPropertyEnquiry(
        {
          id: contactProperty.id,
          title: contactProperty.title || config.label,
          type: contactProperty.propertyType,
          area: contactProperty.locality,
          price_label: contactProperty.priceLabel,
          contact_phone: contactProperty.contact_phone,
          contact_name: contactProperty.contact_name,
        },
        { source: 'map_list', leadType: 'whatsapp', buyerName: name, buyerPhone: phone, buyerLat: lat, buyerLng: lng },
      );
      setContactProperty(null);
    } finally {
      setWaLoading(false);
    }
  };

  return (
    <>
      <aside
        className={`absolute top-0 bottom-0 left-0 z-30 flex w-[min(100vw,380px)] flex-col border-r border-gray-200/80 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-gray-100 px-4 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
            aria-label="Close list panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {properties.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-sm font-medium text-gray-700">No properties match</p>
              <p className="mt-1 text-xs text-gray-500">Try adjusting filters or search</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {properties.map((property) => {
                const config = CATEGORY_CONFIG[property.propertyType];
                const saved = isShortlisted(property.id);

                return (
                  <li key={property.id}>
                    <div className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => goToProperty(property.id)}
                        className="flex w-full gap-3 text-left transition-opacity hover:opacity-90"
                      >
                        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                          {property.image ? (
                            <LazyImage
                              src={property.image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white"
                              style={{ backgroundColor: property.color }}
                            >
                              {config.label.split(' ')[0]}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span
                            className="mb-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
                            style={{ backgroundColor: property.color }}
                          >
                            {config.label.replace(' Plot', '').replace(' Land', '')}
                          </span>
                          <p className="truncate text-sm font-bold text-gray-900">
                            {property.title || config.label}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
                            <MapPin size={11} className="shrink-0" />
                            {property.locality}
                          </p>
                          <p className="mt-2 text-base font-black text-gray-900">
                            {formatMapINR(property.price)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                            <span>{property.areaLabel}</span>
                            {property.pricePerSqft > 0 && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span>₹{property.pricePerSqft.toLocaleString('en-IN')}/sq.ft</span>
                              </>
                            )}
                          </div>
                          <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-medium text-amber-700">
                            Listed by {property.listed_by || 'VJR Estate'}
                          </span>
                        </div>
                      </button>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(property.id);
                          }}
                          className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                            saved
                              ? 'border-red-200 bg-red-50 text-red-600'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Heart size={14} className={saved ? 'fill-current' : ''} />
                          Shortlist
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContactProperty(property);
                          }}
                          className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white transition-colors hover:bg-[#1da851]"
                          aria-label="WhatsApp enquiry"
                        >
                          <WhatsappLogo size={18} weight="fill" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {!open && (
        <button
          type="button"
          onClick={onOpen}
          className="absolute top-1/2 left-0 z-30 flex -translate-y-1/2 items-center gap-1 rounded-r-xl border border-l-0 border-gray-200 bg-white py-3 pr-3 pl-2 text-xs font-semibold text-gray-700 shadow-lg transition-colors hover:bg-gray-50"
          aria-label="Open property list"
        >
          <ChevronRight size={16} />
          List
        </button>
      )}

      <PropertyEnquiryContactModal
        open={contactProperty !== null}
        onClose={() => setContactProperty(null)}
        title="WhatsApp Enquiry"
        submitLabel={waLoading ? 'Opening…' : 'Continue to WhatsApp'}
        listedBy={contactProperty?.listed_by}
        onSubmit={submitWhatsAppEnquiry}
      />
    </>
  );
}
