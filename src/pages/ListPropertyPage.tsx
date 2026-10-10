import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
} from 'framer-motion';
import {
  Buildings,
  HouseLine,
  Storefront,
  XCircle,
  CheckCircle,
  CaretLeft,
  CaretRight,
  ImageIcon,
  MapPin,
  CurrencyInr,
  Ruler,
  RocketLaunch,
  Star,
} from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';
import { formatPrice, formatRental, formatYield, formatINR } from '@/lib/formatPrice';
import { callDataProxy, isSupabaseDataEnabled, propertyDocToRow } from '@/lib/supabaseData';
import { uploadPropertyImages } from '@/lib/propertyImages';
import AreaLocalityPicker from '@/components/admin/AreaLocalityPicker';
import {
  KARNATAKA_KATHA_GROUPS,
  KARNATAKA_KATHA_CUSTOM_VALUE,
  findKathaOption,
  getKathaSelectValue,
  getSuggestedKathaGroupId,
} from '@/data/karnatakaKathas';
import { enhanceDescription } from '@/utils/aiDescription';

/**
 * Partner listing flow (Agents / Builders / Owners).
 *
 * Frontend mirrors the admin Add Property wizard one-to-one (same navy & gold
 * theme, same step structure) — but the backend is a separate pipeline:
 * `partner.property.create` (data-proxy), which requires an active partner
 * registration instead of the invite-only `can_add_property` grant the admin
 * flow uses. Admin add-property stays untouched at /admin/properties/new.
 */

/** Housing.com-style guided flow: one decision per screen. */
const FORM_STEPS = [
  { label: 'Basic Information', short: 'Basics', hint: 'What are you listing?', icon: Buildings },
  { label: 'Location', short: 'Location', hint: 'Where is it?', icon: MapPin },
  { label: 'Pricing & Rental Income', short: 'Pricing', hint: 'Set the right price', icon: CurrencyInr },
  { label: 'Property Details', short: 'Details', hint: 'Specifications, highlights & story', icon: Ruler },
  { label: 'Media — Photos', short: 'Media', hint: 'Upload property photos', icon: ImageIcon },
  { label: 'Review & Publish', short: 'Publish', hint: 'Review & post', icon: RocketLaunch },
] as const;

/** value = stored backend mapping (unchanged); label = visible name. */
const TYPE_CARDS: { value: string; label: string; icon: typeof Buildings }[] = [
  { value: 'PG Buildings', label: 'PG Building', icon: Buildings },
  { value: 'Residential Rental Income', label: 'Residential Building', icon: HouseLine },
  { value: 'Commercial Properties', label: 'Commercial Properties', icon: Storefront },
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

const FACINGS = ['East', 'West', 'North', 'South', 'North-East', 'South-East', 'North-West', 'South-West'];

const AGES = ['New', 'Less than 1 Year', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'];

const HIGHLIGHTS = [
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
];

interface PartnerInfo {
  partnerType: 'Owner' | 'Builder' | 'Agent';
  fullName: string;
  companyName: string;
  commissionPercent: number;
  status: 'pending' | 'active' | 'suspended' | 'terminated' | 'rejected';
  partnerCode: string;
}

interface FormData {
  title: string;
  type: string;
  commercial_subtype: string;
  status: string;
  area: string;
  location: string;
  price: number;
  price_label: string;
  monthly_rental: number;
  monthly_rental_label: string;
  rental_yield: number | null;
  area_sqft: number;
  built_up_area_sqft: number;
  facing: string;
  age: string;
  katha: string;
  highlights: string[];
  amenities: string[];
  description: string;
}

const INITIAL_FORM: FormData = {
  title: '',
  type: 'PG Buildings',
  commercial_subtype: '',
  status: 'Ready',
  area: '',
  location: '',
  price: 0,
  price_label: '',
  monthly_rental: 0,
  monthly_rental_label: '',
  rental_yield: null,
  area_sqft: 0,
  built_up_area_sqft: 0,
  facing: 'East',
  age: 'New',
  katha: '',
  highlights: [],
  amenities: [],
  description: '',
};

type StepErrors = Partial<Record<'title' | 'area' | 'price' | 'photos', string>>;

export default function ListPropertyPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // LOGIN-FIRST: guests are routed to the login experience with their
  // destination preserved, instead of an inline fallback sign-in card.
  useEffect(() => {
    if (!authLoading && !user) navigate('/login?next=%2Flist-property', { replace: true });
  }, [authLoading, user, navigate]);

  // Partner gate state
  const [checking, setChecking] = useState(true);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);

  // Wizard state
  const [step, setStep] = useState(0);
  const [stepDir, setStepDir] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<StepErrors>({});
  const [customHighlight, setCustomHighlight] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [publishError, setPublishError] = useState('');
  const [published, setPublished] = useState<{ propertyCode: string } | null>(null);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiDescError, setAiDescError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Check partner registration whenever a signed-in user lands here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setChecking(false); return; }
      setChecking(true);
      try {
        const result = await callDataProxy('partner.check');
        if (cancelled) return;
        setPartner(
          result.registered
            ? {
                partnerType: result.partner.partnerType,
                fullName: result.partner.fullName,
                companyName: result.partner.companyName,
                commissionPercent: Number(result.partner.commissionPercent ?? 50),
                status: (result.partner.status ?? 'active') as PartnerInfo['status'],
                partnerCode: result.partner.partnerCode ?? '',
              }
            : null,
        );
      } catch {
        if (!cancelled) setPartner(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const updateFormData = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'price') next.price_label = formatPrice(Number(value) || 0);
      if (key === 'monthly_rental') next.monthly_rental_label = formatRental(Number(value) || 0);
      return next;
    });
    setErrors((prev) => {
      if (!prev[key as keyof StepErrors]) return prev;
      const nextErrors = { ...prev };
      delete nextErrors[key as keyof StepErrors];
      return nextErrors;
    });
  };

  const goToStep = (target: number) => {
    setStepDir(target > step ? 1 : -1);
    setStep(Math.max(0, Math.min(target, FORM_STEPS.length - 1)));
  };

  const validateStep = (s: number): StepErrors => {
    const e: StepErrors = {};
    if (s === 0) {
      if (!formData.title.trim()) e.title = 'Property title is required';
      if (!formData.type) e.title = e.title ?? 'Select a property type';
    }
    if (s === 1 && !formData.area.trim()) e.area = 'Select the area / locality';
    if (s === 2 && formData.price <= 0) e.price = 'Asking price is required';
    if (s === 4) {
      if (pendingFiles.length < 2) e.photos = 'Upload at least 2 photos before publishing';
    }
    return e;
  };

  const handleContinue = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    goToStep(step + 1);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    setPendingFiles((prev) => [...prev, ...selected]);
    setPendingPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
    setErrors((prev) => { const n = { ...prev }; delete n.photos; return n; });
  };

  const removePendingImage = (index: number) => {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  /* Media gallery: cover + reorder (first photo is the cover). */
  const makeCoverImage = (index: number) => {
    if (index === 0) return;
    const files = [...pendingFiles];
    const previews = [...pendingPreviews];
    const [f] = files.splice(index, 1);
    const [p] = previews.splice(index, 1);
    files.unshift(f);
    previews.unshift(p);
    setPendingFiles(files);
    setPendingPreviews(previews);
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= pendingFiles.length) return;
    const files = [...pendingFiles];
    const previews = [...pendingPreviews];
    [files[index], files[target]] = [files[target], files[index]];
    [previews[index], previews[target]] = [previews[target], previews[index]];
    setPendingFiles(files);
    setPendingPreviews(previews);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (!dropped.length) return;
    setPendingFiles((prev) => [...prev, ...dropped]);
    setPendingPreviews((prev) => [...prev, ...dropped.map((f) => URL.createObjectURL(f))]);
    setErrors((prev) => { const n = { ...prev }; delete n.photos; return n; });
  };

  const handleAddHighlight = () => {
    const h = customHighlight.trim();
    if (!h || formData.highlights.includes(h)) return;
    updateFormData('highlights', [...formData.highlights, h]);
    setCustomHighlight('');
  };

  const handleSubmit = async () => {
    if (!user || !partner) return;
    // Final pass over every step before publishing.
    for (let s = 0; s < FORM_STEPS.length; s++) {
      const e = validateStep(s);
      if (Object.keys(e).length > 0) {
        setErrors(e);
        goToStep(s);
        return;
      }
    }
    setPublishError('');
    setSaving(true);
    try {
      const docData = {
        title: formData.title.trim(),
        type: formData.type,
        commercial_subtype: formData.commercial_subtype || undefined,
        area: formData.area,
        location: formData.location.trim() || formData.area,
        price: formData.price,
        price_label: formData.price_label || formatPrice(formData.price),
        monthly_rental: formData.monthly_rental || 0,
        monthly_rental_label: formData.monthly_rental_label,
        rental_yield: formData.rental_yield,
        area_sqft: formData.area_sqft || 0,
        built_up_area_sqft: formData.built_up_area_sqft || 0,
        facing: formData.facing,
        age: formData.age,
        status: formData.status,
        katha: formData.katha || undefined,
        highlights: formData.highlights,
        amenities: formData.amenities,
        description: formData.description.trim(),
        listed_days_ago: 0,
        contact_name: partner.fullName,
        contact_phone: '',
        listed_by: partner.partnerType, // server re-stamps from the verified partner record
        featured: false,
        uid: user.uid,
        userEmail: user.email ?? '',
        userDisplayName: user.displayName ?? user.email?.split('@')[0] ?? 'Partner',
        images: [] as string[],
      };

      if (!isSupabaseDataEnabled()) throw new Error('Listings are temporarily unavailable. Please try again shortly.');
      const created = await callDataProxy('partner.property.create', propertyDocToRow(docData));
      const propertyId = String(created.id);
      const propertyCode = String(created.propertyCode ?? '');

      if (pendingFiles.length > 0) {
        setUploadProgress({ done: 0, total: pendingFiles.length });
        const urls = await uploadPropertyImages(pendingFiles, propertyId, user.uid, (done, total) =>
          setUploadProgress({ done, total }),
        );
        await callDataProxy('property.update', { id: propertyId, images: urls });
      }
      previewsCleanup();
      setPublished({ propertyCode });
    } catch (err) {
      console.error('Partner listing failed:', err);
      setPublishError(err instanceof Error ? err.message : 'Error publishing property. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const previewsCleanup = () => {
    pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPendingFiles([]);
    setPendingPreviews([]);
  };

  const kathaSelectValue = getKathaSelectValue(formData.katha ?? '');
  const suggestedKathaGroup = KARNATAKA_KATHA_GROUPS.find((g) => g.id === getSuggestedKathaGroupId(formData.type));
  const selectedKathaOption = findKathaOption(formData.katha ?? '');

  const handleKathaSelectChange = (value: string) => {
    if (value === KARNATAKA_KATHA_CUSTOM_VALUE) {
      updateFormData('katha', KARNATAKA_KATHA_CUSTOM_VALUE);
      return;
    }
    updateFormData('katha', value);
  };

  const handleAIDescription = async () => {
    setAiDescError('');
    setAiDescLoading(true);
    try {
      const enhanced = await enhanceDescription({
        ...formData,
        price_per_sqft: 0,
        area_unit: 'sqft',
        land_acres: 0,
        land_guntas: 0,
        dimensions: '',
        city: 'Bengaluru',
        state: 'Karnataka',
      });
      updateFormData('description', enhanced.slice(0, 1200));
    } catch (err) {
      setAiDescError(err instanceof Error ? err.message : 'Failed to enhance description');
    } finally {
      setAiDescLoading(false);
    }
  };

  const isCommercialType = formData.type === 'Commercial Properties';

  /* ── Gate screens ──────────────────────────────────────────────────────── */

  const gateShell = (children: React.ReactNode) => (
    <div
      className="min-h-[calc(100vh-var(--vjr-header-h))] bg-gradient-to-b from-[#fafafa] to-white"
      style={{ paddingTop: 'var(--vjr-header-h)' }}
    >
      <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">{children}</div>
    </div>
  );

  if (published) {
    return gateShell(
      <div className="admin-theme admin-section p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle size={32} weight="fill" className="text-emerald-600" />
        </div>
        <h1 className="admin-heading mt-6 text-2xl font-medium text-black sm:text-3xl">Property Published!</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
          Your listing is live on vjrestate.com. Buyers can find and contact you directly.
        </p>
        {published.propertyCode && (
          <p className="mt-2 text-[12px] text-gray-500">
            Property ID: <span className="font-mono font-semibold text-black">{published.propertyCode}</span>
          </p>
        )}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => navigate('/properties')} className="admin-btn-primary min-h-[48px] flex-1">
            View Properties
          </button>
          <button
            type="button"
            onClick={() => {
              setPublished(null);
              setFormData(INITIAL_FORM);
              setStep(0);
            }}
            className="admin-btn-secondary min-h-[48px] flex-1 items-center justify-center"
          >
            List Another
          </button>
        </div>
      </div>,
    );
  }

  if (authLoading || (user && checking)) {
    return gateShell(
      <div className="admin-theme flex flex-col items-center py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent" />
        <p className="mt-4 text-xs text-gray-500">{user ? 'Checking your partnership…' : 'Loading…'}</p>
      </div>,
    );
  }

  if (!user) {
    // Redirect above fires; render a spinner so the gated intent is never
    // visually "failed" while the login page loads.
    return gateShell(
      <div className="admin-theme flex flex-col items-center py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent" />
        <p className="mt-4 text-xs text-gray-500">Taking you to sign in…</p>
      </div>,
    );
  }

  if (!partner) {
    return gateShell(
      <div className="admin-theme admin-section p-8 text-center sm:p-10">
        <div className="flex items-center justify-center gap-2.5">
          <img src="/favicon.png" alt="VJR Estate logo" className="h-10 w-10 shrink-0 object-contain" />
          <span className="font-serif text-xl font-bold tracking-tight text-[#0A1628]">VJR Estate</span>
        </div>
        <h1 className="admin-heading mt-6 text-2xl font-medium text-black">Become a VJR Estate Partner</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
          Property listing is available to registered partners only. Register once as an Owner,
          Builder or Agent — then list as many properties as you like.
        </p>
        <Link to="/partner" className="admin-btn-primary no-underline mt-8 min-h-[48px] w-full">
          Become a Partner
        </Link>
      </div>,
    );
  }

  if (partner && partner.status !== 'active') {
    return gateShell(
      <div className="admin-theme admin-section p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
          <CheckCircle size={28} className="text-amber-500" />
        </div>
        <h1 className="admin-heading mt-6 text-2xl font-medium text-black">Partnership under review</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
          {partner.status === 'pending'
            ? 'Thank you for registering as a VJR Estate partner. Your application is being reviewed and verified — you will be able to publish listings as soon as your partnership is approved.'
            : partner.status === 'suspended'
              ? 'Your partnership is currently suspended. Please contact VJR Estate for assistance.'
              : 'This partnership is no longer active. Please contact VJR Estate for assistance.'}
        </p>
        {partner.partnerCode && (
          <p className="mt-2 font-mono text-[12px] text-gray-500">Partner ID: {partner.partnerCode}</p>
        )}
      </div>,
    );
  }

  /* ── Wizard (admin Add Property design, separate backend) ─────────────── */

  return (
    <div
      className="admin-theme min-h-[calc(100vh-var(--vjr-header-h))] bg-gradient-to-b from-[#F7F8FA] to-white"
      style={{ paddingTop: 'var(--vjr-header-h)' }}
    >
      <div className="mx-auto max-w-3xl px-3 py-4 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-6 sm:pb-32">
        {/* Compact premium page header — eyebrow, fixed title, right progress */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a8778]">
              Partner listing · {partner.partnerType}
            </p>
            <h1 className="mt-1 text-[19px] font-semibold leading-tight tracking-tight text-[#0B1729] sm:text-[22px]">
              List Your Property
            </h1>
            <p className="mt-0.5 text-[12.5px] text-gray-500">Share your property details to get started.</p>
          </div>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums tracking-[0.1em] text-[#C9A646]">
            STEP {String(step + 1).padStart(2, '0')} / {String(FORM_STEPS.length).padStart(2, '0')}
          </span>
        </div>

        {/* Compact stepper — thin rail, small numbered dots */}
        <nav aria-label="Listing steps" className="mt-5">
          <ol className="hidden items-center sm:flex">
            {FORM_STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.label} className="flex min-w-0 flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    aria-current={active ? "step" : undefined}
                    className={`group flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-lg py-1 pr-2 text-left transition-opacity duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A646] ${
                      active ? "" : done ? "opacity-80 hover:opacity-100" : "opacity-60 hover:opacity-90"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10.5px] font-bold ${
                        active
                          ? "border-[#0B1729] bg-[#0B1729] text-white"
                          : done
                            ? "border-[#C9A646]/50 bg-[#FBF7EC] text-[#8a6d1f]"
                            : "border-gray-200 bg-white text-gray-400 group-hover:border-[#C9A646]/40"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={`whitespace-nowrap text-[11px] font-semibold ${
                        active ? "text-[#0B1729]" : done ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {s.short}
                    </span>
                    {active && <span className="h-0.5 w-5 rounded-full bg-[#C9A646]" aria-hidden="true" />}
                  </button>
                  {i < FORM_STEPS.length - 1 && (
                    <span className={`mx-1 h-px min-w-3 flex-1 ${done ? "bg-[#C9A646]/45" : "bg-gray-200"}`} aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
          <div className="sm:hidden">
            <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ol className="flex w-max items-center gap-1.5">
                {FORM_STEPS.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <li key={s.label} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => goToStep(i)}
                        aria-current={active ? "step" : undefined}
                        className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition-colors duration-200 ${
                          active
                            ? "border-[#0B1729] bg-[#0B1729] text-white"
                            : done
                              ? "border-[#C9A646]/50 bg-[#FBF7EC] text-[#8a6d1f]"
                              : "border-gray-200 bg-white text-gray-400"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[9.5px] font-bold ${
                            active ? "bg-[#C9A646] text-[#0B1729]" : done ? "bg-[#C9A646]/25 text-[#8a6d1f]" : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        {s.short}
                      </button>
                      {i < FORM_STEPS.length - 1 && (
                        <span className={`h-px w-2 ${done ? "bg-[#C9A646]/45" : "bg-gray-200"}`} aria-hidden="true" />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </nav>

        <form id="partner-property-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="mt-6 space-y-4">
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 28 * stepDir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 * stepDir }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="admin-section">
                  <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0A1628]">Basic Information</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="admin-label">Property title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Commercial Building For Sale in Whitefield"
                        value={formData.title}
                        onChange={(e) => updateFormData('title', e.target.value)}
                        aria-invalid={!!errors.title}
                        className={`admin-input ${errors.title ? 'border-red-300 focus:border-red-400' : ''}`}
                      />
                      {errors.title && <p className="mt-2 text-xs text-red-600">{errors.title}</p>}
                    </div>

                    <div>
                      <label className="admin-label">Property Type *</label>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        {TYPE_CARDS.map(({ value, label, icon: TypeIcon }) => {
                          const activeType = formData.type === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => updateFormData('type', value)}
                              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                                activeType
                                  ? 'border-[#C9A646] bg-[#FBF7EC] shadow-[inset_0_0_0_1px_rgba(201,166,70,0.35)]'
                                  : 'border-[#e7e4dc] bg-white text-[#10192b] hover:border-[#C9A646]/60 hover:bg-[#FBF7EC]/60'
                              }`}
                              aria-pressed={activeType}
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  activeType ? 'bg-[#0B1729] text-[#C9A646]' : 'bg-gray-100 text-[#0B1729]'
                                }`}
                              >
                                <TypeIcon size={16} weight={activeType ? 'fill' : 'regular'} />
                              </span>
                              <span className="min-w-0 text-[12.5px] font-semibold leading-tight">{label}</span>
                              <span
                                className={`ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                  activeType ? 'border-[#C9A646] bg-[#C9A646]' : 'border-gray-300'
                                }`}
                                aria-hidden="true"
                              >
                                {activeType && <CheckCircle size={9} weight="bold" className="text-white" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isCommercialType && (
                      <div>
                        <label className="block font-sans text-xs text-gray-500 mb-2">Commercial Sub-type</label>
                        <select
                          value={formData.commercial_subtype}
                          onChange={(e) => updateFormData('commercial_subtype', e.target.value)}
                          className="admin-select"
                        >
                          <option value="">Select...</option>
                          {COMMERCIAL_SUBTYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="admin-label">Status</label>
                      <div className="flex gap-2">
                        {['Ready', 'New Launch'].map((s) => (
                          <label key={s} className="flex min-h-[40px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-colors duration-200 sm:flex-none sm:min-w-[160px]"
                            style={formData.status === s
                              ? { borderColor: '#C9A646', background: '#FBF7EC', color: '#0B1729' }
                              : { borderColor: '#e7e4dc' }}
                          >
                            <input
                              type="radio"
                              name="status"
                              value={s}
                              checked={formData.status === s}
                              onChange={(e) => updateFormData('status', e.target.value)}
                              className="h-3.5 w-3.5 accent-[#0B1729]"
                            />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 28 * stepDir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 * stepDir }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="admin-section">
                  <h2 className="admin-section-title">Location</h2>
                  <div className="space-y-6">
                    <div>
                      <AreaLocalityPicker
                        value={formData.area}
                        onChange={(area) => updateFormData('area', area)}
                        error={errors.area}
                      />
                    </div>
                    <div>
                      <label className="admin-label">Full address (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. No 42, 3rd Cross, Palm Meadows Road"
                        value={formData.location}
                        onChange={(e) => updateFormData('location', e.target.value)}
                        className="admin-input"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 28 * stepDir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 * stepDir }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="admin-section-muted">
                  <h2 className="admin-section-title mb-2">Pricing &amp; Rental Income</h2>
                  <p className="text-[11px] text-gray-500">These are the two most important fields</p>

                  <div className="mt-6 space-y-6">
                    <div>
                      <label className="block font-sans text-xs text-gray-500 mb-2">Asking Price (₹) *</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.price || 0}
                        onChange={(e) => updateFormData('price', Number(e.target.value))}
                        className="admin-input"
                      />
                      {formData.price > 0 && (
                        <p className="mt-2 text-[11px] text-gray-500">
                          Will display as: <strong>{formatINR(formData.price)}</strong>
                        </p>
                      )}
                      {errors.price && <p className="mt-2 text-xs text-gray-500">{errors.price}</p>}
                    </div>

                    <div>
                      <label className="block font-sans text-xs text-gray-500 mb-2">Monthly Income (₹)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.monthly_rental || 0}
                        onChange={(e) => updateFormData('monthly_rental', Number(e.target.value))}
                        className="admin-input"
                      />
                      {formData.monthly_rental > 0 && (
                        <p className="mt-2 text-[11px] text-gray-500">
                          Will display as: <strong>{formData.monthly_rental_label}</strong>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-sans text-xs text-gray-500 mb-2">Rental Yield (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={formData.rental_yield ?? 0}
                        onChange={(e) => updateFormData('rental_yield', Number(e.target.value))}
                        className="admin-input flex-1"
                      />
                      {formData.price > 0 && formData.monthly_rental > 0 && (
                        <p className="mt-2 text-[11px] text-gray-500">
                          Suggested: {formatYield(formData.price, formData.monthly_rental)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 28 * stepDir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 * stepDir }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="admin-section">
                  <h2 className="admin-section-title">Property Details</h2>
                  <p className="-mt-3 mb-5 text-[11px] text-gray-500">
                    Area, age &amp; document type — builds buyer trust
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                    <div>
                      <label className="block font-sans text-xs text-gray-500 mb-2">Facing</label>
                      <select
                        value={formData.facing}
                        onChange={(e) => updateFormData('facing', e.target.value)}
                        className="admin-select"
                      >
                        {FACINGS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-sans text-xs text-gray-500 mb-2">Age of Property</label>
                      <select
                        value={formData.age}
                        onChange={(e) => updateFormData('age', e.target.value)}
                        className="admin-select"
                      >
                        {AGES.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-sans text-xs text-gray-500 mb-2">Plot Area (sq.ft)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.area_sqft || ''}
                        onChange={(e) => updateFormData('area_sqft', Number(e.target.value))}
                        className="admin-input"
                      />
                    </div>

                    <div>
                      <label className="block font-sans text-xs text-gray-500 mb-2">Built-up Area (sq.ft)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.built_up_area_sqft || ''}
                        onChange={(e) => updateFormData('built_up_area_sqft', Number(e.target.value))}
                        className="admin-input"
                      />
                    </div>

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
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </optgroup>
                        ))}
                        <optgroup label="Other">
                          <option value={KARNATAKA_KATHA_CUSTOM_VALUE}>Other (Specify)</option>
                        </optgroup>
                      </select>

                      {selectedKathaOption?.hint && (
                        <p className="mt-2 text-[11px] leading-relaxed text-gray-600">{selectedKathaOption.hint}</p>
                      )}
                      {!formData.katha?.trim() && suggestedKathaGroup && (
                        <p className="mt-2 text-[11px] text-gray-500">
                          Suggested for <span className="font-medium text-black">{formData.type}</span>: {suggestedKathaGroup.label}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="admin-label">Legal &amp; loan status (shown on listing card)</label>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex min-h-[44px] items-center gap-2.5 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.highlights.includes('Bank Loan Eligible')}
                            onChange={() =>
                              updateFormData(
                                'highlights',
                                formData.highlights.includes('Bank Loan Eligible')
                                  ? formData.highlights.filter((h) => h !== 'Bank Loan Eligible')
                                  : [...formData.highlights, 'Bank Loan Eligible'],
                              )
                            }
                            className="h-4 w-4"
                          />
                          Bank Loan Eligible
                        </label>
                      </div>
                      <p className="mt-1.5 text-[11px] text-gray-400">Ticked only if your bank has actually pre-eligible the property — buyers may ask for proof.</p>
                    </div>
                  </div>
                </div>

                <div className="admin-section">
                  <h2 className="admin-section-title">Highlights</h2>
                  <p className="-mt-3 mb-5 text-[11px] text-gray-500">Tap to select — choose only what genuinely applies</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    {HIGHLIGHTS.map((h) => (
                      <label key={h} className="flex min-h-[44px] items-center gap-3 font-sans text-sm">
                        <input
                          type="checkbox"
                          checked={formData.highlights.includes(h)}
                          onChange={() =>
                            updateFormData(
                              'highlights',
                              formData.highlights.includes(h)
                                ? formData.highlights.filter((x) => x !== h)
                                : [...formData.highlights, h],
                            )
                          }
                          className="h-4 w-4"
                        />
                        {h}
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      placeholder="Add custom highlight"
                      value={customHighlight}
                      onChange={(e) => setCustomHighlight(e.target.value)}
                      className="admin-input min-h-[44px] flex-1 sm:text-sm"
                    />
                    <button type="button" onClick={handleAddHighlight} className="admin-btn-primary min-h-[44px] sm:shrink-0">
                      Add
                    </button>
                  </div>
                  {formData.highlights.some((h) => !HIGHLIGHTS.includes(h)) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {formData.highlights.filter((h) => !HIGHLIGHTS.includes(h)).map((h) => (
                        <div key={h} className="flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1 text-xs text-white">
                          {h}
                          <button
                            type="button"
                            onClick={() => updateFormData('highlights', formData.highlights.filter((x) => x !== h))}
                            className="hover:opacity-70"
                          >
                            <XCircle size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-section">
                  <h2 className="admin-section-title">Amenities</h2>
                  <p className="-mt-3 mb-5 text-[11px] text-gray-500">Present on the premises — leave unchecked anything you can't confirm</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                    {AMENITIES.map((a) => (
                      <label key={a} className="flex min-h-[44px] items-center gap-3 font-sans text-sm">
                        <input
                          type="checkbox"
                          checked={formData.amenities.includes(a)}
                          onChange={() =>
                            updateFormData(
                              'amenities',
                              formData.amenities.includes(a)
                                ? formData.amenities.filter((x) => x !== a)
                                : [...formData.amenities, a],
                            )
                          }
                          className="h-4 w-4"
                        />
                        {a}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="admin-section">
                  <div className="flex items-center justify-between">
                    <h2 className="admin-section-title">Description</h2>
                    <button
                      type="button"
                      onClick={handleAIDescription}
                      disabled={aiDescLoading || !formData.description.trim()}
                      className="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                    >
                      {aiDescLoading ? 'Enhancing…' : 'AI · Enhance'}
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      placeholder="Describe the property — condition, location advantages, rental information, etc. without inventing claims."
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value.slice(0, 1200))}
                      className="admin-textarea"
                    />
                    <p className="mt-2 text-right text-[11px] text-gray-400">{formData.description.length} / 1200 characters</p>
                    {aiDescError && <p className="mt-1 text-xs text-red-600">{aiDescError}</p>}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 28 * stepDir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 * stepDir }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="admin-section">
                  <h2 className="admin-section-title">Photos</h2>
                  <p className="-mt-3 mb-5 text-[11px] text-gray-500">
                    Upload at least 2 in-focus daylight photos — listings with photos get far more enquiry interest.
                  </p>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-8 ${
                      dragActive ? 'border-[#C9A84C] bg-[#FBF7EC]' : 'border-gray-300 bg-[#FAFAFA] hover:border-gray-400'
                    }`}
                  >
                    <div className="pointer-events-none flex flex-col items-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A1628]">
                        <ImageIcon size={22} className="text-[#C9A84C]" weight="regular" />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-[#0A1628]">Drag &amp; drop photos here</p>
                      <p className="mt-1 text-[11.5px] text-gray-500">JPG, PNG or WebP · one click uploads the whole selection</p>
                    </div>
                    <label className="admin-btn-secondary mt-4 inline-flex cursor-pointer min-h-[44px]">
                      Browse files
                      <input type="file" accept="image/*" multiple className="sr-only" onChange={handleImageSelect} />
                    </label>
                  </div>

                  <p className="mt-3 text-[11px] font-semibold text-gray-500">
                    {pendingFiles.length} photo{pendingFiles.length === 1 ? '' : 's'} selected{pendingFiles.length < 2 ? ' · at least 2 required to publish' : ''}
                  </p>
                  {errors.photos && <p className="mt-1 text-xs text-red-600">{errors.photos}</p>}

                  {pendingPreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {pendingPreviews.map((url, index) => (
                        <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                          <img src={url} alt={`Selected photo ${index + 1}`} className="h-full w-full object-cover" />
                          {index === 0 && (
                            <span className="absolute left-1.5 top-1.5 rounded-md bg-[#0A1628] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#C9A84C]">
                              Cover
                            </span>
                          )}
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => makeCoverImage(index)}
                              title="Make cover photo"
                              className="absolute left-1.5 top-1.5 rounded-md bg-white/90 p-1 text-[#0A1628] opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <Star size={12} weight="fill" />
                            </button>
                          )}
                          <div className="absolute right-1.5 top-1.5 flex gap-1">
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => moveImage(index, -1)}
                                title="Move left"
                                className="rounded-md bg-white/90 p-1 text-[#0A1628] opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <CaretLeft size={12} weight="bold" />
                              </button>
                            )}
                            {index < pendingPreviews.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveImage(index, 1)}
                                title="Move right"
                                className="rounded-md bg-white/90 p-1 text-[#0A1628] opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <CaretRight size={12} weight="bold" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removePendingImage(index)}
                              aria-label={`Remove photo ${index + 1}`}
                              className="rounded-md bg-black/80 p-1 text-white"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, x: 28 * stepDir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 * stepDir }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="rounded-2xl bg-gradient-to-br from-[#0A1628] to-[#12294a] p-5 text-white shadow-[0_10px_30px_-12px_rgba(10,22,40,0.55)] sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">
                    Ready to publish
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold">
                    {formData.title || 'Untitled property'}
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">
                    {formData.type} · {formData.area || ''} · {formData.price > 0 ? formData.price_label : 'Price pending'} · {pendingFiles.length} photo{pendingFiles.length === 1 ? '' : 's'}
                  </p>
                </div>

                {[
                  { label: 'Basics', stepNo: 0, rows: [[formData.title || ''], [formData.type, formData.commercial_subtype].filter(Boolean), formData.status] },
                  { label: 'Location', stepNo: 1, rows: [[formData.area || ''], [formData.location].filter(Boolean)] },
                  { label: 'Pricing', stepNo: 2, rows: [[formData.price > 0 ? formData.price_label : 'Price required'], formData.monthly_rental > 0 ? `Monthly income ${formData.monthly_rental_label}` : null, formData.rental_yield ? `Est. yield ${formData.rental_yield}%` : null].filter(Boolean) },
                  { label: 'Details', stepNo: 3, rows: [
                      [
                        formData.area_sqft > 0 ? `Plot ${formData.area_sqft.toLocaleString('en-IN')} sq.ft` : '',
                        formData.built_up_area_sqft > 0 ? `Built-up ${formData.built_up_area_sqft.toLocaleString('en-IN')} sq.ft` : '',
                        formData.facing,
                        formData.age,
                      ].filter(Boolean),
                      [formData.katha || 'No Khata selected'],
                    ] },
                  { label: 'Highlights & amenities', stepNo: 4, rows: [[(formData.highlights.length ? formData.highlights.join(', ') : 'None selected')], [(formData.amenities.length ? formData.amenities.join(', ') : 'None selected')]] },
                  { label: 'Description', stepNo: 4, rows: [[formData.description ? `${formData.description.slice(0, 160)}${formData.description.length > 160 ? '…' : ''}` : 'Not provided']] },
                  { label: 'Media', stepNo: 5, rows: [[`${pendingFiles.length} photo${pendingFiles.length === 1 ? '' : 's'} ready for upload`]] },
                ].map((card) => (
                  <div key={card.label} className="admin-section">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{card.label}</h3>
                      <button
                        type="button"
                        onClick={() => goToStep(Math.min(card.stepNo, 5))}
                        className="text-[11.5px] font-semibold text-[#8a6d1f] transition-colors hover:text-[#0A1628]"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mt-2 space-y-1">
                      {card.rows.flat().filter(Boolean).map((row, i) => (
                        <p key={i} className="text-[13px] text-[#10192b]">{row}</p>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="admin-section space-y-5">
                  <div>
                    <label className="block font-sans text-xs text-gray-500 mb-2">Listed By</label>
                    <div className="flex min-h-[44px] items-center rounded-xl border border-[#e7e4dc] bg-[#FBF9F3] px-3.5 text-sm font-semibold text-[#0A1628]">
                      {partner.partnerType}
                      {partner.companyName ? ` · ${partner.companyName}` : ''}
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      Fixed to your partner registration. To change it, update your partnership.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#0A1628] p-4 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">
                      Service charge
                    </p>
                    <p className="mt-1.5 text-sm font-semibold">
                      {partner.commissionPercent === 1
                        ? '1% brokerage service charge of deal value, only on successful closure'
                        : '50 / 50 partnership share on every successful deal — no other charges'}
                    </p>
                  </div>

                  <div>
                    <label className="block font-sans text-xs text-gray-500 mb-2">Buyer contact</label>
                    <div className="flex min-h-[44px] items-center rounded-xl border border-[#e7e4dc] bg-[#FBF9F3] px-3.5 text-sm font-semibold text-[#0A1628]">
                      {partner.fullName}
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      Buyer enquiries and visit bookings arrive through VJR Estate — your personal number is never published on the listing.
                    </p>
                  </div>
                </div>

                {publishError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    {publishError}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* FOOTER BAR (Sticky) — page-local bar with tight keyboard/safe-area bottom padding */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#C9A84C]/25 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-8"
             style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={handleContinueBack}
                disabled={saving}
                aria-label="Go back to previous step"
                className="admin-btn-secondary min-h-[48px] shrink-0 !px-4 disabled:opacity-60 sm:!px-5"
              >
                <CaretLeft size={16} weight="bold" />
                <span className="hidden sm:inline">Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={saving}
                aria-label="Cancel and go back"
                className="admin-btn-secondary min-h-[48px] shrink-0 !px-4 disabled:opacity-60 sm:!px-5"
              >
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">✕</span>
              </button>
            )}
            {step < FORM_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleContinue}
                disabled={saving}
                className="admin-btn-primary min-h-[48px] flex-1 gap-1.5 disabled:opacity-60 sm:flex-none sm:px-8"
              >
                Next
                <CaretRight size={14} weight="bold" />
              </button>
            ) : (
              <button
                type="submit"
                form="partner-property-form"
                disabled={saving}
                className="admin-btn-primary min-h-[48px] flex-1 disabled:opacity-60 sm:flex-none sm:px-8"
              >
                {saving ? (
                  uploadProgress.total > 0 ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Uploading {uploadProgress.done}/{uploadProgress.total}…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Publishing…
                    </span>
                  )
                ) : (
                  'Publish'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {publishError && step !== 5 && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3.5 text-sm text-white shadow-xl">
          {publishError}
        </div>
      )}
    </div>
  );

  function handleContinueBack() {
    goToStep(step - 1);
  }
}

