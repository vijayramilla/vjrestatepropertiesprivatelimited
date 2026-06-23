import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatPrice, formatRental, formatYield } from '@/lib/formatPrice';
import { sanitizeForFirestore } from '@/lib/firestoreHelpers';
import { uploadPropertyImages, deletePropertyImageByUrl } from '@/lib/propertyImages';
import { AnimatePresence, motion } from 'framer-motion';
import { XCircle } from 'phosphor-react';
import {
  KARNATAKA_KATHA_GROUPS,
  KARNATAKA_KATHA_CUSTOM_VALUE,
  KARNATAKA_KATHA_PORTALS,
  findKathaOption,
  getKathaSelectValue,
  getSuggestedKathaGroupId,
} from '@/data/karnatakaKathas';
import { BANGALORE_AREAS } from '@/data/properties';
import {
  canonicalPropertyType,
  extractLocalityFromText,
  normalizeLocalityInput,
  normalizePropertyLocationFields,
} from '@/lib/propertyFilters';

interface FormData {
  title: string;
  type: string;
  commercial_subtype?: string;
  plot_subtype?: string;
  area: string;
  location: string;
  price: number;
  price_label: string;
  monthly_rental: number;
  monthly_rental_label: string;
  rental_yield: number | null;
  area_sqft: number;
  dimensions: string;
  floor_count: number;
  total_units: number;
  available_units: number;
  occupancy_percent: number;
  facing: string;
  age: string;
  status: string;
  featured: boolean;
  bbmp_approved: boolean;
  bank_loan_eligible: boolean;
  clear_title: boolean;
  highlights: string[];
  amenities: string[];
  description: string;
  listed_days_ago: number;
  katha?: string;
  images?: string[];
}

const PROPERTY_TYPES = [
  'PG Buildings',
  'Residential Rental Income',
  'Commercial Properties',
  'Residential Plot',
  'Commercial Plot',
  'Agriculture Land',
];

const COMMERCIAL_SUBTYPES = [
  'Office Space',
  'Mall / Retail',
  'Hospital / Clinic',
  'Warehouse / Industrial',
  'Showroom',
  'Hotel / Hospitality',
  'Factory / Manufacturing',
  'Mixed Use',
  'Flex Space',
];

const PLOT_SUBTYPES = ['Residential Plot', 'Commercial Plot', 'Agriculture Land'];

const AREAS = [...BANGALORE_AREAS];

const FACINGS = [
  'East',
  'West',
  'North',
  'South',
  'North-East',
  'South-East',
  'North-West',
  'South-West',
];

const AGES = [
  'New',
  'Less than 1 Year',
  '1-3 Years',
  '3-5 Years',
  '5-10 Years',
  '10+ Years',
];

const HIGHLIGHTS = [
  'BBMP Approved',
  'Clear Title',
  'Bank Loan Eligible',
  'Corner Plot',
  'Fully Tenanted',
  'High Yield Zone',
  'Prime Location',
  'Near IT Park',
  'Metro Connectivity',
  'Gated Community',
  'Power Backup',
  '24/7 Security',
];

const AMENITIES = [
  'Power Backup',
  'Car Parking',
  'Water Supply',
  'Lift',
  '24/7 Security',
  'Fire Safety',
  'Generator',
  'CCTV',
  'Wi-Fi',
  'Intercom',
  'Rainwater Harvesting',
  'Solar Power',
  'Swimming Pool',
  'Gym',
  'Laundry',
];

export default function AdminPropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customHighlight, setCustomHighlight] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    type: 'PG Buildings',
    area: '',
    location: '',
    price: 0,
    price_label: '',
    monthly_rental: 0,
    monthly_rental_label: '',
    rental_yield: null,
    area_sqft: 0,
    dimensions: '',
    floor_count: 0,
    total_units: 0,
    available_units: 0,
    occupancy_percent: 0,
    facing: 'East',
    age: 'New',
    status: 'Ready',
    featured: false,
    bbmp_approved: false,
    bank_loan_eligible: false,
    clear_title: false,
    highlights: [],
    amenities: [],
    description: '',
    listed_days_ago: 0,
    katha: '',
    images: [],
  });

  useEffect(() => {
    if (isEditMode && id) {
      const fetchProperty = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'properties', id));
          if (docSnap.exists()) {
            const data = docSnap.data() as FormData;
            const { area, location } = normalizePropertyLocationFields(
              data.area ?? '',
              data.location ?? '',
            );
            setFormData({
              ...data,
              type: canonicalPropertyType(data.type ?? ''),
              area,
              location,
            });
            setImageUrls(data.images ?? []);
          }
        } catch (error) {
          console.error('Fetch error:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchProperty();
    }
  }, [id, isEditMode]);

  const updateFormData = (key: string, value: unknown) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };

      // Keep area canonical and location searchable when area changes
      if (key === 'area') {
        const normalizedArea = normalizeLocalityInput(String(value));
        updated.area = normalizedArea || String(value).trim();
        if (!updated.location.trim() && updated.area) {
          updated.location = updated.area;
        }
      }

      // Auto-format price label
      if (key === 'price') {
        updated.price_label = formatPrice(value as number | null | undefined);
      }

      // Auto-format rental label
      if (key === 'monthly_rental') {
        updated.monthly_rental_label = formatRental(value as number | null | undefined);
      }

      // Auto-calculate rental yield
      if (key === 'price' || key === 'monthly_rental') {
        const yield_ = formatYield(updated.price, updated.monthly_rental);
        updated.rental_yield = yield_;
      }

      return updated;
    });

    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    const resolvedArea =
      formData.area.trim() ||
      extractLocalityFromText(formData.location) ||
      extractLocalityFromText(formData.title);
    if (!resolvedArea) newErrors.area = 'Area is required';
    if (!formData.price) newErrors.price = 'Price is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      const inferredArea =
        formData.area.trim() ||
        extractLocalityFromText(formData.location) ||
        extractLocalityFromText(formData.title);
      const { area, location } = normalizePropertyLocationFields(
        inferredArea,
        formData.location || formData.title,
      );
      const payload = sanitizeForFirestore({
        ...formData,
        type: canonicalPropertyType(formData.type),
        area,
        location,
        images: imageUrls,
      });

      if (isEditMode && id) {
        let finalImages = [...imageUrls];
        if (pendingFiles.length > 0) {
          setUploadingImages(true);
          const uploaded = await uploadPropertyImages(pendingFiles, id);
          finalImages = [...finalImages, ...uploaded];
        }
        await updateDoc(doc(db, 'properties', id), {
          ...payload,
          images: finalImages,
          updatedAt: serverTimestamp(),
        });
      } else {
        const ref = await addDoc(collection(db, 'properties'), {
          ...payload,
          images: [],
          createdAt: serverTimestamp(),
        });
        if (pendingFiles.length > 0) {
          setUploadingImages(true);
          const uploaded = await uploadPropertyImages(pendingFiles, ref.id);
          await updateDoc(ref, sanitizeForFirestore({ images: uploaded }));
        }
      }

      pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
      setPendingFiles([]);
      setPendingPreviews([]);
      setToast('Property saved successfully');
      setTimeout(() => navigate('/admin/properties'), 1500);
    } catch (error) {
      console.error('Save error:', error);
      setToast('Error saving property');
    } finally {
      setSaving(false);
      setUploadingImages(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPendingFiles((prev) => [...prev, ...files]);
    setPendingPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeExistingImage = async (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
    if (isEditMode) {
      try {
        await deletePropertyImageByUrl(url);
      } catch {
        // ignore storage cleanup errors
      }
    }
  };

  const removePendingImage = (index: number) => {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddHighlight = () => {
    if (customHighlight.trim() && !formData.highlights.includes(customHighlight)) {
      updateFormData('highlights', [...formData.highlights, customHighlight]);
      setCustomHighlight('');
    }
  };

  const handleRemoveHighlight = (highlight: string) => {
    updateFormData(
      'highlights',
      formData.highlights.filter((h) => h !== highlight)
    );
  };

  const handleToggleHighlight = (highlight: string) => {
    if (formData.highlights.includes(highlight)) {
      handleRemoveHighlight(highlight);
    } else {
      updateFormData('highlights', [...formData.highlights, highlight]);
    }
  };

  const handleToggleAmenity = (amenity: string) => {
    if (formData.amenities.includes(amenity)) {
      updateFormData(
        'amenities',
        formData.amenities.filter((a) => a !== amenity)
      );
    } else {
      updateFormData('amenities', [...formData.amenities, amenity]);
    }
  };

  if (loading) {
    return (
      <AdminLayout title={isEditMode ? 'Edit Property' : 'Add Property'}>
        <div className="flex h-96 items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-black border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  const shouldShowCommercialSubtypeFields =
    formData.type === 'Commercial Properties';
  const shouldShowPlotSubtypeFields = formData.type.includes('Plot') || formData.type === 'Agriculture Land';
  const isPlotType = formData.type.includes('Plot') || formData.type === 'Agriculture Land';

  const kathaSelectValue = getKathaSelectValue(formData.katha);
  const selectedKathaOption = findKathaOption(formData.katha ?? '');
  const suggestedKathaGroup = KARNATAKA_KATHA_GROUPS.find(
    (g) => g.id === getSuggestedKathaGroupId(formData.type),
  );

  const handleKathaSelectChange = (value: string) => {
    if (value === '') {
      updateFormData('katha', '');
      return;
    }
    if (value === KARNATAKA_KATHA_CUSTOM_VALUE) {
      updateFormData(
        'katha',
        formData.katha?.trim() && !findKathaOption(formData.katha ?? '') ? formData.katha : '',
      );
      return;
    }
    updateFormData('katha', value);
  };

  return (
    <AdminLayout title={isEditMode ? 'Edit Property' : 'Add Property'}>
      <div className="mx-auto max-w-4xl px-3 py-5 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-8 sm:pb-32">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-xs">
          {isEditMode ? 'Edit' : 'Add new'} property
        </p>
        <h1 className="admin-heading mt-1 text-2xl font-medium leading-tight text-black sm:text-4xl">
          Property Details
        </h1>

        {/* FORM */}
        <form id="admin-property-form" onSubmit={handleSubmit} className="mt-8 space-y-4">
          {/* SECTION 1: BASIC INFO */}
          <div className="admin-section">
            <h2 className="admin-section-title">Basic Information</h2>

            <div className="space-y-6">
              {/* Property Title */}
              <div>
                <input
                  type="text"
                  placeholder="Property Title"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  className="admin-input-ghost"
                />
                {errors.title && (
                  <p className="mt-2 text-xs text-gray-500">{errors.title}</p>
                )}
              </div>

              {/* Property Type */}
              <div>
                <label className="admin-label">Property Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => updateFormData('type', e.target.value)}
                  className="admin-select"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commercial Sub-type */}
              {shouldShowCommercialSubtypeFields && (
                <div>
                  <label className="block font-sans text-xs text-gray-500 mb-2">
                    Commercial Sub-type
                  </label>
                  <select
                    value={formData.commercial_subtype || ''}
                    onChange={(e) => updateFormData('commercial_subtype', e.target.value)}
                    className="admin-select"
                  >
                    <option value="">Select...</option>
                    {COMMERCIAL_SUBTYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Plot Sub-type */}
              {shouldShowPlotSubtypeFields && (
                <div>
                  <label className="block font-sans text-xs text-gray-500 mb-2">
                    Plot Type
                  </label>
                  <div className="space-y-2">
                    {PLOT_SUBTYPES.map((t) => (
                      <label key={t} className="flex items-center gap-3 font-sans text-sm">
                        <input
                          type="radio"
                          name="plot_subtype"
                          value={t}
                          checked={formData.plot_subtype === t}
                          onChange={(e) => updateFormData('plot_subtype', e.target.value)}
                          className="w-4 h-4"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block font-sans text-xs text-gray-500 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-4 sm:gap-6">
                  {['Ready', 'New Launch'].map((s) => (
                    <label key={s} className="flex items-center gap-2 font-sans text-sm">
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={formData.status === s}
                        onChange={(e) => updateFormData('status', e.target.value)}
                        className="w-4 h-4"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              {/* Featured */}
              <label className="flex items-center gap-3 font-sans text-sm">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => updateFormData('featured', e.target.checked)}
                  className="w-4 h-4"
                />
                Show in Featured Properties on homepage
              </label>
            </div>
          </div>

          {/* SECTION 2: LOCATION */}
          <div className="admin-section">
            <h2 className="admin-section-title">Location</h2>

            <div className="space-y-6">
              {/* Area / Locality */}
              <div>
                <label className="block font-sans text-xs text-gray-500 mb-2">
                  Area / Locality *
                </label>
                <select
                  value={formData.area}
                  onChange={(e) => updateFormData('area', e.target.value)}
                  className="admin-select"
                >
                  <option value="">Select area...</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                {errors.area && (
                  <p className="mt-2 text-xs text-gray-500">{errors.area}</p>
                )}
              </div>

              {/* Full Address */}
              <div>
                <input
                  type="text"
                  placeholder="Full Address"
                  value={formData.location}
                  onChange={(e) => updateFormData('location', e.target.value)}
                  className="admin-input-ghost"
                />
              </div>

              {/* Facing */}
              <div>
                <label className="block font-sans text-xs text-gray-500 mb-2">
                  Facing
                </label>
                <select
                  value={formData.facing}
                  onChange={(e) => updateFormData('facing', e.target.value)}
                  className="admin-select"
                >
                  {FACINGS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Age */}
              <div>
                <label className="block font-sans text-xs text-gray-500 mb-2">
                  Age
                </label>
                <select
                  value={formData.age}
                  onChange={(e) => updateFormData('age', e.target.value)}
                  className="admin-select"
                >
                  {AGES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: PRICING */}
          <div className="admin-section-muted">
            <h2 className="admin-section-title mb-2">Pricing</h2>
            <p className="text-[11px] text-gray-500">
              These are the two most important fields
            </p>

            <div className="space-y-6 mt-6">
              {/* Asking Price */}
              <div>
                <label className="block font-sans text-xs text-gray-500 mb-2">
                  Asking Price (₹) *
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.price || ''}
                  onChange={(e) => updateFormData('price', Number(e.target.value))}
                  className="admin-input-ghost"
                />
                {formData.price > 0 && (
                  <p className="mt-2 text-[11px] text-gray-500">
                    Will display as: <strong>{formData.price_label}</strong>
                  </p>
                )}
                {errors.price && (
                  <p className="mt-2 text-xs text-gray-500">{errors.price}</p>
                )}
              </div>

              {/* Monthly Rental */}
              {!isPlotType && (
                <div>
                  <label className="block font-sans text-xs text-gray-500 mb-2">
                    Monthly Rental Income (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.monthly_rental || ''}
                    onChange={(e) =>
                      updateFormData('monthly_rental', Number(e.target.value))
                    }
                    className="admin-input-ghost"
                  />
                  {formData.monthly_rental > 0 && (
                      <p className="mt-2 text-[11px] text-gray-500">
                      Will display as: <strong>{formData.monthly_rental_label}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Rental Yield */}
              {!isPlotType && (
                <div>
                  <label className="block font-sans text-xs text-gray-500 mb-2">
                    Rental Yield (%)
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={formData.rental_yield || ''}
                      onChange={(e) =>
                        updateFormData('rental_yield', Number(e.target.value))
                      }
                      className="admin-input-ghost flex-1"
                    />
                  </div>
                  {formData.price > 0 && formData.monthly_rental > 0 && (
                      <p className="mt-2 text-[11px] text-gray-500">
                      Suggested: {formatYield(formData.price, formData.monthly_rental)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: PROPERTY DETAILS */}
          <div className="admin-section">
            <h2 className="admin-section-title">Property Details</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              {/* Area (sqft) */}
              <div>
                <label className="block font-sans text-xs text-gray-500 mb-2">
                  Area (sq.ft)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.area_sqft || ''}
                  onChange={(e) => updateFormData('area_sqft', Number(e.target.value))}
                  className="admin-input-ghost"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="block font-sans text-xs text-gray-500 mb-2">
                  Dimensions (e.g. 40×60 ft)
                </label>
                <input
                  type="text"
                  placeholder="40×60 ft"
                  value={formData.dimensions}
                  onChange={(e) => updateFormData('dimensions', e.target.value)}
                  className="admin-input-ghost"
                />
              </div>

              {/* Total Floors */}
              {!isPlotType && (
                <div>
                  <label className="block font-sans text-xs text-gray-500 mb-2">
                    Total Floors
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.floor_count || ''}
                    onChange={(e) =>
                      updateFormData('floor_count', Number(e.target.value))
                    }
                    className="admin-input-ghost"
                  />
                </div>
              )}

              {/* Total Units/Rooms */}
              {!isPlotType && (
                <div>
                  <label className="block font-sans text-xs text-gray-500 mb-2">
                    Total {formData.type === 'PG Buildings' ? 'Rooms' : 'Units'}
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.total_units || ''}
                    onChange={(e) =>
                      updateFormData('total_units', Number(e.target.value))
                    }
                    className="admin-input-ghost"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="admin-label">Khata — Karnataka (shown on property card)</label>
                <select
                  value={kathaSelectValue}
                  onChange={(e) => handleKathaSelectChange(e.target.value)}
                  className="admin-select"
                >
                  <option value="">Select Khata type</option>
                  {KARNATAKA_KATHA_GROUPS.map((group) => (
                    <optgroup key={group.id} label={group.label}>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="Other">
                    <option value={KARNATAKA_KATHA_CUSTOM_VALUE}>Other (Specify)</option>
                  </optgroup>
                </select>

                {kathaSelectValue === KARNATAKA_KATHA_CUSTOM_VALUE && (
                  <input
                    type="text"
                    placeholder="Enter custom Khata type"
                    value={formData.katha ?? ''}
                    onChange={(e) => updateFormData('katha', e.target.value)}
                    className="admin-input-ghost mt-3"
                  />
                )}

                {selectedKathaOption?.hint && (
                  <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
                    {selectedKathaOption.hint}
                  </p>
                )}

                {!formData.katha?.trim() && suggestedKathaGroup && (
                  <p className="mt-2 text-[11px] text-gray-500">
                    Suggested for <span className="font-medium text-black">{formData.type}</span>:{' '}
                    {suggestedKathaGroup.label}
                  </p>
                )}

                <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50/40 px-3 py-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-gray-500">
                    Karnataka Khata reference & official portals
                  </summary>
                  <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
                    {KARNATAKA_KATHA_GROUPS.map((group) => (
                      <div key={group.id}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          {group.label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">
                          {group.description}
                        </p>
                      </div>
                    ))}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        Official portals
                      </p>
                      <ul className="mt-1 space-y-1">
                        {KARNATAKA_KATHA_PORTALS.map((portal) => (
                          <li key={portal.url}>
                            <a
                              href={portal.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-gray-800 underline decoration-gray-300 hover:text-black"
                            >
                              {portal.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              </div>

            </div>
          </div>

          {/* SECTION 5: BBMP & LEGAL */}
          <div className="admin-section">
            <h2 className="admin-section-title">BBMP & Legal</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 font-sans text-sm">
                <input
                  type="checkbox"
                  checked={formData.bbmp_approved}
                  onChange={(e) => updateFormData('bbmp_approved', e.target.checked)}
                  className="w-4 h-4"
                />
                BBMP Approved
              </label>
              <label className="flex items-center gap-3 font-sans text-sm">
                <input
                  type="checkbox"
                  checked={formData.bank_loan_eligible}
                  onChange={(e) =>
                    updateFormData('bank_loan_eligible', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                Bank Loan Eligible
              </label>
              <label className="flex items-center gap-3 font-sans text-sm">
                <input
                  type="checkbox"
                  checked={formData.clear_title}
                  onChange={(e) => updateFormData('clear_title', e.target.checked)}
                  className="w-4 h-4"
                />
                Clear Title
              </label>
            </div>
          </div>

          {/* SECTION 6: HIGHLIGHTS */}
          <div className="admin-section">
            <h2 className="admin-section-title">Highlights</h2>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {HIGHLIGHTS.map((h) => (
                <label key={h} className="flex items-center gap-3 font-sans text-sm">
                  <input
                    type="checkbox"
                    checked={formData.highlights.includes(h)}
                    onChange={() => handleToggleHighlight(h)}
                    className="w-4 h-4"
                  />
                  {h}
                </label>
              ))}
            </div>

            {/* Custom Highlight */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Add custom highlight"
                value={customHighlight}
                onChange={(e) => setCustomHighlight(e.target.value)}
                className="admin-input-ghost min-h-[44px] flex-1 sm:text-sm"
              />
              <button
                type="button"
                onClick={handleAddHighlight}
                className="admin-btn-primary min-h-[44px] sm:shrink-0"
              >
                Add
              </button>
            </div>

            {/* Custom Highlights Display */}
            {formData.highlights.some((h) => !HIGHLIGHTS.includes(h)) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {formData.highlights
                  .filter((h) => !HIGHLIGHTS.includes(h))
                  .map((h) => (
                    <div
                      key={h}
                      className="flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1 text-xs text-white"
                    >
                      {h}
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(h)}
                        className="hover:opacity-70"
                      >
                        <XCircle size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* SECTION 7: AMENITIES */}
          <div className="admin-section">
            <h2 className="admin-section-title">Amenities</h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {AMENITIES.map((a) => (
                <label key={a} className="flex items-center gap-3 font-sans text-sm">
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(a)}
                    onChange={() => handleToggleAmenity(a)}
                    className="w-4 h-4"
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          {/* SECTION: PROPERTY PHOTOS */}
          <div className="admin-section">
            <h2 className="admin-section-title mb-2">Property Photos</h2>
            <p className="mb-5 text-xs text-gray-500">
              Upload square-friendly photos. First image is used as the card cover.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {imageUrls.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50">
                  <img src={url} alt="Property" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    className="absolute right-1 top-1 rounded-lg bg-black/80 p-1 text-white"
                    aria-label="Remove image"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
              {pendingPreviews.map((url, index) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50/30">
                  <img src={url} alt="Pending upload" className="h-full w-full object-cover opacity-90" />
                  <button
                    type="button"
                    onClick={() => removePendingImage(index)}
                    className="absolute right-1 top-1 rounded-lg bg-black/80 p-1 text-white"
                    aria-label="Remove pending image"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/30 text-center transition hover:border-gray-500 hover:bg-gray-50">
                <span className="text-2xl text-gray-300">+</span>
                <span className="mt-1 text-[11px] text-gray-500">Add Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleImageSelect}
                />
              </label>
            </div>
          </div>

          {/* SECTION 8: DESCRIPTION */}
          <div className="admin-section">
            <h2 className="admin-section-title">Description</h2>

            <div className="relative">
              <textarea
                placeholder="Write a compelling description of this property..."
                value={formData.description}
                onChange={(e) =>
                  updateFormData('description', e.target.value.slice(0, 500))
                }
                className="admin-textarea"
              />
              <p
                className="mt-2 text-right text-[11px] text-gray-400"
              >
                {formData.description.length} / 500 characters
              </p>
            </div>
          </div>

          {/* SECTION 9: LISTING DETAILS */}
          <div className="admin-section">
            <h2 className="admin-section-title">Listing Details</h2>

            <div>
              <label className="block font-sans text-xs text-gray-500 mb-2">
                Listed Days Ago
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.listed_days_ago}
                onChange={(e) =>
                  updateFormData('listed_days_ago', Number(e.target.value))
                }
                className="admin-input-ghost"
              />
            </div>
          </div>
        </form>

        {/* FOOTER BAR (Sticky) */}
        <div className="admin-footer-bar">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden text-[11px] text-gray-400 sm:block">* Required fields</p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="admin-btn-secondary sm:px-5"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="admin-property-form"
                disabled={saving || uploadingImages}
                className="admin-btn-primary sm:px-6 disabled:opacity-60"
              >
                {saving || uploadingImages ? 'Saving...' : 'Save Property'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-[calc(7.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-black px-5 py-3.5 text-sm text-white shadow-lg shadow-black/30 sm:bottom-auto sm:right-6 sm:top-6 sm:max-w-none sm:translate-x-0"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
