import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadPropertyImages } from '@/lib/propertyImages';
import { sanitizeForFirestore } from '@/lib/firestoreHelpers';
import { formatPrice, formatINR, formatINRPerSqft } from '@/lib/formatPrice';
import { computePlotLandAreaSqft, sqftToAcresGuntas } from '@/lib/plotLandForm';
import type { AreaUnit } from '@/lib/plotLandForm';
import { KARNATAKA_KATHA_GROUPS, KARNATAKA_KATHA_CUSTOM_VALUE, findKathaOption } from '@/data/karnatakaKathas';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useGoogleMapsLoader } from '@/context/GoogleMapsContext';
import LandMapLocationPicker from '@/components/admin/LandMapLocationPicker';
import type { LandLocationValue } from '@/lib/mapGeocoding';
import { enhanceDescription } from '@/utils/aiDescription';

const PLOT_TYPES = ['Residential Plot', 'Commercial Plot', 'JD Land'] as const;
const FACINGS = ['East', 'West', 'North', 'South', 'North-East', 'South-East', 'North-West', 'South-West'];
const LISTED_BY_OPTIONS = ['Agent', 'Owner'];

interface FormState {
  title: string;
  type: string;
  area: string;
  location: string;
  price: number;
  price_per_sqft: number;
  area_sqft: number;
  area_unit: AreaUnit;
  land_acres: number;
  land_guntas: number;
  dimensions: string;
  facing: string;
  katha: string;
  description: string;
  contact_name: string;
  contact_phone: string;
  listed_by: string;
  map_lat: number;
  map_lng: number;
  maps_link: string;
  city: string;
  state: string;
  pincode: string;
  fullAddress: string;
}

export default function ListPropertyPage() {
  const navigate = useNavigate();
  const lastPriceEdited = useRef<'total' | 'perSqft' | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [descError, setDescError] = useState('');
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { isLoaded: mapsLoaded } = useGoogleMapsLoader();
  const [showSignIn, setShowSignIn] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: '',
    type: 'Residential Plot',
    area: '',
    location: '',
    price: 0,
    price_per_sqft: 0,
    area_sqft: 0,
    area_unit: 'sqft',
    land_acres: 0,
    land_guntas: 0,
    dimensions: '',
    facing: 'East',
    katha: '',
    description: '',
    contact_name: '',
    contact_phone: '',
    listed_by: 'Owner',
    map_lat: 0,
    map_lng: 0,
    maps_link: '',
    city: '',
    state: '',
    pincode: '',
    fullAddress: '',
  });

  const update = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const plotLandAreaSqft = computePlotLandAreaSqft(form.area_unit, form.area_sqft, form.land_acres, form.land_guntas);

  const recalcPrices = (prev: FormState, area: number, source: 'area' | 'total' | 'perSqft') => {
    if (area <= 0) return {};
    if (source === 'total' || (source === 'area' && lastPriceEdited.current === 'total')) {
      if (prev.price > 0) return { price_per_sqft: Math.round(prev.price / area) };
    }
    if (source === 'perSqft' || (source === 'area' && lastPriceEdited.current === 'perSqft')) {
      if ((prev.price_per_sqft ?? 0) > 0) {
        const price = Math.round((prev.price_per_sqft ?? 0) * area);
        return { price };
      }
    }
    return {};
  };

  const handleAreaUnitChange = (unit: AreaUnit) => {
    setForm((prev) => {
      if (unit === prev.area_unit) return prev;
      if (unit === 'acres') {
        const { acres, guntas } = sqftToAcresGuntas(prev.area_sqft);
        return { ...prev, area_unit: unit, land_acres: acres, land_guntas: guntas };
      }
      const sqft = computePlotLandAreaSqft('acres', 0, prev.land_acres, prev.land_guntas);
      const next = { ...prev, area_unit: unit, area_sqft: sqft };
      return { ...next, ...recalcPrices(next, sqft, 'area') };
    });
  };

  const handlePlotAreaSqftChange = (value: number) => {
    setForm((prev) => {
      const next = { ...prev, area_sqft: value };
      return { ...next, ...recalcPrices(next, value, 'area') };
    });
  };

  const handleAcresChange = (value: number) => {
    setForm((prev) => {
      const next = { ...prev, land_acres: value };
      const area = computePlotLandAreaSqft('acres', 0, value, prev.land_guntas);
      return { ...next, ...recalcPrices(next, area, 'area') };
    });
  };

  const handleTotalPriceChange = (value: number) => {
    lastPriceEdited.current = 'total';
    setForm((prev) => {
      const area = computePlotLandAreaSqft(prev.area_unit, prev.area_sqft, prev.land_acres, prev.land_guntas);
      const next = { ...prev, price: value };
      if (area > 0 && value > 0) next.price_per_sqft = Math.round(value / area);
      return next;
    });
  };

  const handlePricePerSqftChange = (value: number) => {
    lastPriceEdited.current = 'perSqft';
    setForm((prev) => {
      const area = computePlotLandAreaSqft(prev.area_unit, prev.area_sqft, prev.land_acres, prev.land_guntas);
      const next = { ...prev, price_per_sqft: value };
      if (area > 0 && value > 0) next.price = Math.round(value * area);
      return next;
    });
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setShowSignIn(true); return; }
    
    // Validation
    const errors: string[] = [];
    if (!form.title.trim()) errors.push('Title is required');
    if (!form.area.trim()) errors.push('Area is required');
    if (form.map_lat === 0 || form.map_lng === 0) errors.push('Please set location pin on map');
    if (!form.price) errors.push('Price is required');
    if (form.contact_phone.trim().length < 10) errors.push('Phone number must be at least 10 digits');
    if (files.length < 2) errors.push('Upload at least 2 photos');
    if (!privacyAccepted) errors.push('Accept the privacy policy to continue');
    
    if (errors.length > 0) {
      setToast(errors[0]);
      return;
    }
    
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, 'properties'), sanitizeForFirestore({
        title: form.title.trim(),
        type: form.type,
        area: form.area.trim(),
        location: form.location.trim() || form.area.trim(),
        price: form.price,
        price_label: formatPrice(form.price),
        price_per_sqft: form.price_per_sqft || 0,
        area_sqft: plotLandAreaSqft,
        area_unit: form.area_unit,
        area_acres: form.land_acres,
        dimensions: form.dimensions || '—',
        facing: form.facing,
        katha: form.katha || '—',
        description: form.description.trim(),
        contact_name: form.contact_name.trim() || 'Not provided',
        contact_phone: form.contact_phone.trim(),
        listed_by: form.listed_by,
        status: 'Ready',
        featured: false,
        uid: user!.uid,
        userEmail: user!.email || '',
        userDisplayName: user!.displayName || user!.email?.split('@')[0] || 'User',
        map_lat: form.map_lat,
        map_lng: form.map_lng,
        maps_link: form.maps_link,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        fullAddress: form.fullAddress,
        images: [],
        createdAt: serverTimestamp(),
      }));
      if (files.length > 0) {
        const urls = await uploadPropertyImages(files, ref.id, user.uid);
        await updateDoc(ref, { images: urls });
      }
      setSubmitted(true);
    } catch (err) {
      console.error('Property save failed:', err);
      setToast(err instanceof Error ? err.message : 'Error saving property. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const kathaSelectValue =
    form.katha && findKathaOption(form.katha)
      ? form.katha
      : '';

  const plotLandPriceSummary =
    form.price > 0 && form.price_per_sqft > 0
      ? `Price saved as: ${formatINR(form.price)} total · ${formatINRPerSqft(form.price_per_sqft)}`
      : '';

  // Form validation
  const isFormValid = form.title.trim() && form.area.trim() && form.price && form.map_lat !== 0 && form.map_lng !== 0 && form.contact_phone.trim().length >= 10 && files.length >= 2 && privacyAccepted;
  const getValidationMessage = () => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.area.trim()) return 'Location is required';
    if (form.map_lat === 0 || form.map_lng === 0) return 'Set pin on map';
    if (!form.price) return 'Price is required';
    if (form.contact_phone.trim().length < 10) return 'Phone number must be at least 10 digits';
    if (files.length < 2) return 'Upload at least 2 photos';
    if (!privacyAccepted) return 'Accept the privacy policy to continue';
    return '';
  };

  type KathaGroup = typeof KARNATAKA_KATHA_GROUPS[number];

  const plotKathaGroups: KathaGroup[] = KARNATAKA_KATHA_GROUPS.filter((g) =>
    ['revenue', 'status', 'panchayat', 'bda'].includes(g.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white">
      <Navbar />
      <div className="pt-14 md:pt-16">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          {submitted ? (
            <div className="mt-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200/50 ring-4 ring-emerald-50">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Property Submitted Successfully!</h2>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">Your listing has been posted and is now live on the map. Buyers can find and contact you directly.</p>
              <div className="mt-8 flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/map')}
                  className="rounded-xl bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/25 transition-all hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-900/30 active:scale-[0.97]"
                >
                  View on Map
                </button>
                <button
                  type="button"
                  onClick={() => {
                    previews.forEach(URL.revokeObjectURL);
                    setSubmitted(false);
                    setForm({
                      title: '', type: 'Residential Plot', area: '', location: '', price: 0,
                      price_per_sqft: 0, area_sqft: 0, area_unit: 'sqft', land_acres: 0,
                      land_guntas: 0, dimensions: '', facing: 'East', katha: '', description: '',
                      contact_name: '', contact_phone: '', listed_by: 'Owner', map_lat: 0,
                      map_lng: 0, maps_link: '', city: '', state: '', pincode: '', fullAddress: '',
                    });
                    setFiles([]);
                    setPreviews([]);
                    setPrivacyAccepted(false);
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97]"
                >
                  Submit Another
                </button>
              </div>
            </div>
          ) : (
            <>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              List your property
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">List Your Plot / Land</h1>
            <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto leading-relaxed">Reach thousands of buyers — list your plot or land for free. No commissions, no fees.</p>
          </div>
          {showSignIn && (
            <div className="mb-6 rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">Sign in to list your property</p>
              <p className="mt-1.5 text-xs text-gray-500">You need a Google account to submit a listing.</p>
              <button
                type="button"
                onClick={async () => { try { await signInWithGoogle(); setShowSignIn(false); } catch {} }}
                disabled={authLoading}
                className="mt-6 inline-flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-7 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97] disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {authLoading ? 'Signing in...' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={() => setShowSignIn(false)}
                className="mt-3 text-xs text-gray-400 underline-offset-2 transition-colors hover:text-gray-600 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div className="rounded-2xl border border-gray-200/70 bg-white shadow-sm p-7 sm:p-8 space-y-7">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-[10px] font-bold text-white">1</div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Property Details</h2>
                  <p className="text-[11px] text-gray-400">Tell buyers about your property</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Property Title *</label>
                <input
                  type="text"
                  placeholder="e.g. 30×40 Residential Plot in Whitefield"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2.5">Property Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLOT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update('type', t)}
                      className={`rounded-xl px-3 py-3 text-xs font-semibold tracking-wide transition-all duration-200 ${
                        form.type === t
                          ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20 ring-1 ring-gray-900'
                          : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2.5">Google Maps Location *</label>
                {!mapsLoaded ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm text-gray-400">
                    Loading Google Maps search…
                  </div>
                ) : (
                  <LandMapLocationPicker
                    value={
                      form.area
                        ? {
                            area: form.area,
                            location: form.location,
                            map_lat: form.map_lat,
                            map_lng: form.map_lng,
                            maps_link: form.maps_link,
                          }
                        : null
                    }
                    onChange={(next: LandLocationValue | null) => {
                      if (!next) {
                        setForm(prev => ({
                          ...prev,
                          area: '',
                          location: '',
                          map_lat: 0,
                          map_lng: 0,
                          maps_link: '',
                        }));
                        return;
                      }
                      setForm(prev => ({
                        ...prev,
                        area: next.area,
                        location: next.location,
                        map_lat: next.map_lat,
                        map_lng: next.map_lng,
                        maps_link: next.maps_link ?? '',
                        city: next.city || prev.city,
                        state: next.state || prev.state,
                        pincode: next.pincode || prev.pincode,
                        fullAddress: next.fullAddress || prev.fullAddress,
                      }));
                    }}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2.5">Pricing</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
                      <input
                        type="number"
                        placeholder="Total Price *"
                        value={form.price || ''}
                        onChange={(e) => handleTotalPriceChange(Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-8 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300"
                      />
                    </div>
                    {form.price > 0 && (
                      <p className="mt-1.5 text-xs font-semibold text-emerald-600">{formatINR(form.price)}</p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
                      <input
                        type="number"
                        placeholder="Per sq.ft"
                        value={form.price_per_sqft || ''}
                        onChange={(e) => handlePricePerSqftChange(Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-8 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300"
                      />
                    </div>
                    {form.price_per_sqft > 0 && (
                      <p className="mt-1.5 text-xs font-semibold text-emerald-600">{formatINRPerSqft(form.price_per_sqft)}</p>
                    )}
                  </div>
                </div>
                {plotLandPriceSummary && (
                  <div className="mt-3 rounded-xl bg-emerald-50/80 border border-emerald-100/80 px-4 py-3">
                    <p className="text-xs font-medium text-emerald-700">{plotLandPriceSummary}</p>
                  </div>
                )}
                {plotLandAreaSqft <= 0 && (form.price > 0 || form.price_per_sqft > 0) && (
                  <p className="mt-2 text-xs text-gray-400">Enter land area below to auto-calculate.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2.5">Land Area</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handleAreaUnitChange('sqft')}
                    className={`rounded-xl px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                      form.area_unit === 'sqft'
                        ? 'bg-gray-900 text-white shadow-sm ring-1 ring-gray-900'
                        : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    sq.ft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAreaUnitChange('acres')}
                    className={`rounded-xl px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                      form.area_unit === 'acres'
                        ? 'bg-gray-900 text-white shadow-sm ring-1 ring-gray-900'
                        : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Acres
                  </button>
                </div>

                {form.area_unit === 'sqft' ? (
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={form.area_sqft || ''}
                      onChange={(e) => handlePlotAreaSqftChange(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-16 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">sq.ft</span>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={form.land_acres || ''}
                      onChange={(e) => handleAcresChange(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-16 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">Acres</span>
                  </div>
                )}
              </div>
              {plotLandAreaSqft > 0 && (
                <div className="rounded-xl bg-gray-50/80 border border-gray-100/80 px-4 py-3">
                  <p className="text-xs text-gray-500">
                    Saved as: <span className="font-semibold text-gray-700">{plotLandAreaSqft.toLocaleString('en-IN')} sq.ft</span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Dimensions</label>
                  <input
                    type="text"
                    placeholder="e.g. 30×40"
                    value={form.dimensions}
                    onChange={(e) => update('dimensions', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Facing</label>
                  <select
                    value={form.facing}
                    onChange={(e) => update('facing', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5"
                  >
                    {FACINGS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Khata Type</label>
                <select
                  value={kathaSelectValue}
                  onChange={(e) => update('katha', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5"
                >
                  <option value="">Select Khata type</option>
                  {plotKathaGroups.map((group) => (
                    <optgroup key={group.id} label={group.label}>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                    value={form.katha}
                    onChange={(e) => update('katha', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 mt-3 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300"
                  />
                )}
                {findKathaOption(form.katha)?.hint && (
                  <p className="mt-2 text-xs text-gray-400">{findKathaOption(form.katha)!.hint}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  placeholder="Describe your property — location highlights, nearby landmarks, road access, etc."
                  value={form.description}
                  onChange={(e) => { update('description', e.target.value.slice(0, 500)); setDescError(''); }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300 resize-none"
                  rows={3}
                />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!form.title.trim() || !form.area.trim()) {
                        setDescError('Add a title and location first');
                        return;
                      }
                      setDescError('');
                      setEnhancing(true);
                      try {
                        const enhanced = await enhanceDescription(form);
                        update('description', enhanced);
                      } catch (err) {
                        setDescError(err instanceof Error ? err.message : 'Failed to enhance description');
                      } finally {
                        setEnhancing(false);
                      }
                    }}
                    disabled={enhancing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97] disabled:opacity-50"
                  >
                    {enhancing ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2l2.4 7.2L22 9l-6 4.8L17.6 22 12 17l-5.6 5L8 13.8 2 9l7.6-.2L12 2z"/></svg>
                    )}
                    {enhancing ? 'Enhancing…' : 'AI Enhance'}
                  </button>
                  <span className="text-[10px] font-medium text-gray-400">{form.description.length}/500</span>
                </div>
                {descError && <p className="mt-1.5 text-[11px] text-red-500">{descError}</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white shadow-sm p-7 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-[10px] font-bold text-white">2</div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Contact &amp; Listing Info</h2>
                  <p className="text-[11px] text-gray-400">How buyers can reach you</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Name *</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.contact_name}
                    onChange={(e) => update('contact_name', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    value={form.contact_phone}
                    onChange={(e) => update('contact_phone', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300"
                  />
                  <p className="mt-1.5 text-[11px] text-gray-400">This number will be used for connecting the buyers directly</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2.5">Listed By</label>
                <div className="flex gap-2">
                  {LISTED_BY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('listed_by', opt)}
                      className={`rounded-xl px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                        form.listed_by === opt
                          ? 'bg-gray-900 text-white shadow-sm ring-1 ring-gray-900'
                          : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white shadow-sm p-7 sm:p-8 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-[10px] font-bold text-white">3</div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Photos</h2>
                  <p className="text-[11px] text-gray-400">Add at least 2 photos to showcase your property</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {previews.map((url, i) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200/50 group">
                    <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                    <button type="button" onClick={() => removeFile(i)} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-[10px] text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-black/70">✕</button>
                  </div>
                ))}
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white transition-all hover:border-gray-400 hover:bg-gray-50/50">
                  <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  <span className="mt-1.5 text-[10px] font-medium text-gray-400">{files.length}/5 · Add photos</span>
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={handleFiles} />
                </label>
              </div>
            </div>

            <label className="flex items-start gap-3 pt-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-gray-900 focus:ring-gray-900/30"
              />
              <span className="text-xs leading-relaxed text-gray-500 group-hover:text-gray-700 transition-colors">
                I accept the{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer"
                   className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700">
                  Privacy Policy & Terms
                </a>{' '}
                and agree that VJR Estate is a platform only and is not involved in any transaction. I am solely
                responsible for my property listing and all commitments made to buyers.
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !isFormValid}
                title={!isFormValid ? getValidationMessage() : 'Submit property listing'}
                className={`flex-1 rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-[0.97] ${
                  isFormValid
                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/25 hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-900/30 disabled:opacity-50 disabled:shadow-none'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting...
                  </span>
                ) : 'Submit Listing'}
              </button>
            </div>
            {!isFormValid && (
              <div className="text-center text-xs text-amber-700 bg-amber-50/80 rounded-xl p-3.5 border border-amber-200/80">
                {getValidationMessage()}
              </div>
            )}
          </form>
          </>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-xl flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
          {toast}
        </div>
      )}
    </div>
  );
}
