import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadPropertyImages } from '@/lib/propertyImages';
import { sanitizeForFirestore } from '@/lib/firestoreHelpers';
import { formatPrice, formatINR, formatINRPerSqft } from '@/lib/formatPrice';
import { computePlotLandAreaSqft, sqftToAcresGuntas } from '@/lib/plotLandForm';
import type { AreaUnit } from '@/lib/plotLandForm';
import { resolveLocationTextInput, reverseGeocodeLandLocation } from '@/lib/mapGeocoding';
import { isGoogleMapsUrl, isWithinBangalore } from '@/lib/googleMapsLinkParser';
import { KARNATAKA_KATHA_GROUPS, KARNATAKA_KATHA_CUSTOM_VALUE, findKathaOption } from '@/data/karnatakaKathas';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';

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
}

export default function ListPropertyPage() {
  const navigate = useNavigate();
  const lastPriceEdited = useRef<'total' | 'perSqft' | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');
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

  const handleFetchPin = async () => {
    const text = linkInput.trim();
    if (!text) { setLinkError('Paste a Google Maps link or address'); return; }
    setLinkLoading(true);
    setLinkError('');
    try {
      const resolved = await resolveLocationTextInput(text);
      if (!resolved) { setLinkError('Could not find this location'); return; }
      if (!isWithinBangalore(resolved.lat, resolved.lng)) { setLinkError('Location must be within Bangalore'); return; }
      const next = await reverseGeocodeLandLocation(resolved.lat, resolved.lng, isGoogleMapsUrl(text) ? text : undefined);
      update('area', next.area);
      update('location', next.location);
      update('map_lat', next.map_lat);
      update('map_lng', next.map_lng);
      update('maps_link', next.maps_link ?? '');
      setLinkInput('');
      setLinkError('');
    } catch {
      setLinkError('Failed to fetch location');
    } finally {
      setLinkLoading(false);
    }
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
    if (!form.title.trim() || !form.area.trim() || !form.price) {
      setToast('Title, Area, and Price are required');
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
        images: [],
        createdAt: serverTimestamp(),
      }));
      if (files.length > 0) {
        const urls = await uploadPropertyImages(files, ref.id);
        await updateDoc(ref, { images: urls });
      }
      setToast('Property listed successfully!');
      setTimeout(() => navigate('/map'), 1500);
    } catch {
      setToast('Error saving property');
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

  type KathaGroup = typeof KARNATAKA_KATHA_GROUPS[number];

  const plotKathaGroups: KathaGroup[] = KARNATAKA_KATHA_GROUPS.filter((g) =>
    ['revenue', 'status', 'panchayat', 'bda'].includes(g.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      <Navbar />
      <div className="pt-14 md:pt-16">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              List your property
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">List Your Plot / Land</h1>
            <p className="mt-2 text-sm text-gray-500">For agents and owners — list your plot or land for free</p>
          </div>

          {showSignIn && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-amber-800">Sign in to list your property</p>
              <p className="mt-1 text-xs text-amber-600">You need a Google account to submit a listing.</p>
              <button
                type="button"
                onClick={async () => { try { await signInWithGoogle(); setShowSignIn(false); } catch {} }}
                disabled={authLoading}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-50 active:scale-[0.97] disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {authLoading ? 'Signing in...' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={() => setShowSignIn(false)}
                className="mt-3 text-xs text-amber-600 underline hover:text-amber-800"
              >
                Cancel
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-10 space-y-8">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm shadow-gray-200/50 space-y-6">
              <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
                <div className="h-6 w-0.5 rounded-full bg-gray-900" />
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-900">Property Details</h2>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Property Title *"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  className="w-full border-b border-gray-200 pb-2.5 text-base outline-none focus:border-gray-900 transition-colors placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 mb-3">Property Type</label>
                <div className="flex flex-wrap gap-2">
                  {PLOT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update('type', t)}
                      className={`rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                        form.type === t
                          ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20 scale-[1.02]'
                          : 'bg-gray-100/80 text-gray-500 hover:bg-gray-200/80 hover:text-gray-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 mb-3">Google Maps Location *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Paste Google Maps link, address, or coordinates…"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchPin(); } }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900/10 transition-all placeholder:text-gray-300"
                  />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleFetchPin}
                    disabled={linkLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-gray-900/20 transition-all hover:bg-gray-800 active:scale-[0.97] disabled:opacity-50 disabled:shadow-none"
                  >
                    {linkLoading ? (
                      <><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Fetching…</>
                    ) : (
                      'Fetch Pin Location'
                    )}
                  </button>
                  {form.map_lat !== 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Pin set
                    </span>
                  )}
                </div>
                {linkError && <p className="mt-2 text-xs text-red-500">{linkError}</p>}
                {form.map_lat !== 0 && (
                  <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">Location fetched</span>
                    </div>
                    <p className="text-[11px] text-emerald-600/70 font-mono">
                      {form.map_lat.toFixed(6)}, {form.map_lng.toFixed(6)}
                    </p>
                    {form.area && (
                      <p className="text-sm font-bold text-emerald-900">
                        {form.area}
                      </p>
                    )}
                    <p className="text-[10px] text-emerald-600/60">This area will be displayed on the listing card</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 mb-3">Pricing</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="relative">
                      <span className="absolute left-0 top-3 text-sm text-gray-400">₹</span>
                      <input
                        type="number"
                        placeholder="Total Price *"
                        value={form.price || ''}
                        onChange={(e) => handleTotalPriceChange(Number(e.target.value))}
                        className="w-full border-b border-gray-200 pb-2.5 pl-4 text-base outline-none focus:border-gray-900 transition-colors placeholder:text-gray-300"
                      />
                    </div>
                    {form.price > 0 && (
                      <p className="mt-1.5 text-[11px] font-semibold text-emerald-600">{formatINR(form.price)}</p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <span className="absolute left-0 top-3 text-sm text-gray-400">₹</span>
                      <input
                        type="number"
                        placeholder="Per sq.ft"
                        value={form.price_per_sqft || ''}
                        onChange={(e) => handlePricePerSqftChange(Number(e.target.value))}
                        className="w-full border-b border-gray-200 pb-2.5 pl-4 text-base outline-none focus:border-gray-900 transition-colors placeholder:text-gray-300"
                      />
                    </div>
                    {form.price_per_sqft > 0 && (
                      <p className="mt-1.5 text-[11px] font-semibold text-emerald-600">{formatINRPerSqft(form.price_per_sqft)}</p>
                    )}
                  </div>
                </div>
                {plotLandPriceSummary && (
                  <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
                    <p className="text-[11px] font-medium text-emerald-700">{plotLandPriceSummary}</p>
                  </div>
                )}
                {plotLandAreaSqft <= 0 && (form.price > 0 || form.price_per_sqft > 0) && (
                  <p className="mt-2 text-[11px] text-gray-400">Enter land area below to auto-calculate.</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 mb-3">Land Area</label>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => handleAreaUnitChange('sqft')}
                    className={`rounded-xl px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                      form.area_unit === 'sqft'
                        ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20 scale-[1.02]'
                        : 'bg-gray-100/80 text-gray-500 hover:bg-gray-200/80'
                    }`}
                  >
                    sq.ft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAreaUnitChange('acres')}
                    className={`rounded-xl px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                      form.area_unit === 'acres'
                        ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20 scale-[1.02]'
                        : 'bg-gray-100/80 text-gray-500 hover:bg-gray-200/80'
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
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 pr-16 text-base outline-none focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900/10 transition-all placeholder:text-gray-300"
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
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 pr-16 text-base outline-none focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900/10 transition-all placeholder:text-gray-300"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">Acres</span>
                  </div>
                )}
              </div>
              {plotLandAreaSqft > 0 && (
                <div className="rounded-xl bg-gray-50 px-4 py-2.5">
                  <p className="text-[11px] text-gray-500">
                    Saved as: <span className="font-semibold text-gray-700">{plotLandAreaSqft.toLocaleString('en-IN')} sq.ft</span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 mb-3">Dimensions</label>
                  <input
                    type="text"
                    placeholder="e.g. 30×40 ft"
                    value={form.dimensions}
                    onChange={(e) => update('dimensions', e.target.value)}
                    className="w-full border-b border-gray-200 pb-2.5 text-base outline-none focus:border-gray-900 transition-colors placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 mb-3">Facing</label>
                  <select
                    value={form.facing}
                    onChange={(e) => update('facing', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-gray-900 focus:bg-white transition-all"
                  >
                    {FACINGS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 mb-3">Khata Type</label>
                <select
                  value={kathaSelectValue}
                  onChange={(e) => update('katha', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-gray-900 focus:bg-white transition-all"
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
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 mt-3 text-sm outline-none focus:border-gray-900 focus:bg-white transition-all placeholder:text-gray-300"
                  />
                )}
                {findKathaOption(form.katha)?.hint && (
                  <p className="mt-2 text-[11px] text-gray-400">{findKathaOption(form.katha)!.hint}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 mb-3">Description</label>
                <textarea
                  placeholder="Describe your property..."
                  value={form.description}
                  onChange={(e) => update('description', e.target.value.slice(0, 500))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-base outline-none focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900/10 transition-all placeholder:text-gray-300 resize-none"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <span className="text-[10px] font-medium text-gray-400">{form.description.length}/500</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm shadow-gray-200/50 space-y-5">
              <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
                <div className="h-6 w-0.5 rounded-full bg-gray-900" />
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-900">Contact &amp; Listing Info</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your Name *"
                  value={form.contact_name}
                  onChange={(e) => update('contact_name', e.target.value)}
                  className="border-b border-gray-200 pb-2.5 text-base outline-none focus:border-gray-900 transition-colors placeholder:text-gray-300"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={form.contact_phone}
                  onChange={(e) => update('contact_phone', e.target.value)}
                  className="border-b border-gray-200 pb-2.5 text-base outline-none focus:border-gray-900 transition-colors placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 mb-3">Listed By</label>
                <div className="flex gap-2">
                  {LISTED_BY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('listed_by', opt)}
                      className={`rounded-xl px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                        form.listed_by === opt
                          ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20 scale-[1.02]'
                          : 'bg-gray-100/80 text-gray-500 hover:bg-gray-200/80 hover:text-gray-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-semibold tracking-wide text-gray-900">Photos</h2>
              <div className="grid grid-cols-3 gap-2.5">
                {previews.map((url, i) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 group">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeFile(i)} className="absolute right-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 transition-colors hover:border-gray-400">
                  <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  <span className="mt-1 text-[10px] font-medium text-gray-400">Add</span>
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={handleFiles} />
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/25 transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              >
                {saving ? 'Listing...' : 'List Property'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
