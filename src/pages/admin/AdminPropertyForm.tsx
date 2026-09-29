import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { leadSupabase } from '@/services/leadSupabase';
import { useAuth } from '@/context/AuthContext';
import { usePropertyAccess } from '@/lib/propertyAccess';
import { isAuthorizedAdmin as isAuthorizedAdminEmail } from '@/lib/adminAuth';
import GrantedUserAdminLayout from '@/components/GrantedUserAdminLayout';
import AdminLayout from '@/components/admin/AdminLayout';
import SupabaseImage from '@/components/common/SupabaseImage';
import { restructureDescription } from '@/utils/aiDescription';
import { formatPrice, formatRental, formatYield, formatINR, formatINRPerSqft } from '@/lib/formatPrice';
import {
  PLOT_LAND_TYPES,
  type AreaUnit,
  computePlotLandAreaSqft,
  sqftToAcresGuntas,
  GUNTA_SQFT,
} from '@/lib/plotLandForm';
import { sanitizeForFirestore } from '@/lib/firestoreHelpers';
import { uploadPropertyImages, deletePropertyImageByUrl } from '@/lib/propertyImages';
import {
  isSupabaseDataEnabled,
  supabaseGetProperty,
  propertyDocToRow,
  callDataProxy,
} from '@/lib/supabaseData';
import { AnimatePresence, motion } from 'framer-motion';
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
  ArrowsOut,
  RocketLaunch,
} from '@phosphor-icons/react';
import {
  KARNATAKA_KATHA_GROUPS,
  KARNATAKA_KATHA_CUSTOM_VALUE,
  KARNATAKA_KATHA_PORTALS,
  findKathaOption,
  getKathaSelectValue,
  getSuggestedKathaGroupId,
} from '@/data/karnatakaKathas';
import LandMapLocationPicker from '@/components/admin/LandMapLocationPicker';
import AreaLocalityPicker from '@/components/admin/AreaLocalityPicker';
import type { LandLocationValue } from '@/lib/mapGeocoding';
import {
  canonicalPropertyType,
  extractLocalityFromText,
  normalizeLocalityInput,
  normalizePropertyLocationFields,
} from '@/lib/propertyFilters';

interface FormData {
  propertyCode: string;
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
  built_up_area_sqft: number;
  area_unit?: AreaUnit;
  price_per_sqft?: number;
  dimensions: string;
  floor_count: number;
  total_units: number;
  available_units: number;
  occupancy_percent: number;
  facing: string;
  age: string;
  status: string;
  featured: boolean;
  bank_loan_eligible: boolean;
  highlights: string[];
  amenities: string[];
  description: string;
  listed_days_ago: number;
  katha?: string;
  images?: string[];
  land_acres?: number;
  land_guntas?: number;
  survey_number?: string;
  water_source?: string;
  dc_conversion_done?: boolean;
  extra_details?: Record<string, string | number>;
  map_lat?: number;
  map_lng?: number;
  maps_link?: string;
  listed_by?: string;
  contact_name?: string;
  contact_phone?: string;
  agent_id?: string;
  agent_name?: string;
}

const OWNER_API_URL = import.meta.env.VITE_OWNER_API_URL ?? 'http://localhost:5000';

const BUILDING_TYPES = ['PG Buildings', 'Residential Rental Income', 'Commercial Properties'];
const PLOT_TYPES: string[] = [];

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

const PLOT_SUBTYPES: string[] = [];

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

/** Housing.com-style guided flow: one decision per screen. */
const FORM_STEPS = [
  { label: 'Basics', hint: 'What are you listing?', icon: Buildings },
  { label: 'Location', hint: 'Where is it?', icon: MapPin },
  { label: 'Pricing & Rental Income', hint: 'Set the right price', icon: CurrencyInr },
  { label: 'Details', hint: 'Size & specifications', icon: Ruler },
  { label: 'Media', hint: 'Photos, story & perks', icon: ImageIcon },
  { label: 'Publish', hint: 'Review & post', icon: RocketLaunch },
] as const;

const TYPE_CARDS: { value: string; icon: typeof Buildings }[] = [
  { value: 'PG Buildings', icon: Buildings },
  { value: 'Residential Rental Income', icon: HouseLine },
  { value: 'Commercial Properties', icon: Storefront },
];

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
  'Rainwater Harvesting',
  'Solar Power',
  'Swimming Pool',
  'Gym',
  'Laundry',
];

export default function AdminPropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { canAdd: canAddProperty } = usePropertyAccess();
  const isEditMode = !!id;
  // Granted users (can_add_property) get the same form but scoped: no
  // featured flag, no agent selection, and every listing is stamped with
  // their uid so it lands in the granted-user listings view.
  const isGrantedUser = !!user?.email
    && !isAuthorizedAdminEmail(user)
    && canAddProperty;
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  // Post pipeline feedback: which step the save is on, plus image progress
  // (uploaded/total) so long uploads give visible progress instead of a dead
  // 'Saving...' button.
  const [postPhase, setPostPhase] = useState<'idle' | 'saving' | 'uploading' | 'done'>('idle');
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [toast, setToast] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customHighlight, setCustomHighlight] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiDescError, setAiDescError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    propertyCode: '',
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
    built_up_area_sqft: 0,
    area_unit: 'sqft',
    price_per_sqft: 0,
    dimensions: '',
    floor_count: 0,
    total_units: 0,
    available_units: 0,
    occupancy_percent: 0,
    facing: 'East',
    age: 'New',
    status: 'Ready',
    featured: false,
    bank_loan_eligible: false,
    highlights: [],
    amenities: [],
    description: '',
    listed_days_ago: 0,
    katha: '',
    images: [],
    land_acres: 0,
    land_guntas: 0,
    survey_number: '',
    water_source: '',
    dc_conversion_done: false,
    map_lat: 0,
    map_lng: 0,
    maps_link: '',
    listed_by: isGrantedUser ? 'Owner' : 'Agent',
    contact_name: '',
    contact_phone: '',
    agent_id: '',
    agent_name: '',
  });
  const lastPriceEdited = useRef<'total' | 'perSqft' | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  // Wizard position + slide direction for the step transitions.
  const [step, setStep] = useState(0);
  const [stepDir, setStepDir] = useState(1);
  // Timestamp for when the Publish step became visible. The footer's
  // Continue button swaps in place for the Post Property button — without
  // this arm-delay, a double-click on Continue lands on Post Property and
  // posts the listing before the user has seen the review screen.
  const publishArmedAt = useRef(0);
  // Devendra is a fixed listing agent — always available in the agent picker
  // even if he's not in the CRM agents table.
  const DEVENDRA_AGENT = { key: 'agent:devendra', source: 'agent' as const, id: 'devendra', name: 'Devendra', email: '', phone: '', active: true };
  const agentsWithDevendra = useMemo(
    () => (agents.some((a) => String(a.id) === 'devendra') ? agents : [DEVENDRA_AGENT, ...agents]),
    [agents],
  );

  useEffect(() => {
    let cancelled = false;
    // Granted users can't call the CRM-gated endpoints (agents.list /
    // employees.list are admin+employee only), so they use the publicList
    // proxy action instead. It returns the same merged list: active CRM
    // agents plus active agent-designation employees.
    if (isGrantedUser) {
      callDataProxy('agents.publicList', {}, { isPublic: false })
        .then((res) => {
          if (cancelled) return;
          setAgents(
            (res.data ?? []).map((a: any) => ({
              key: `agent:${a.id}`,
              source: a.source ?? 'agent',
              id: a.id,
              name: a.name,
              email: '',
              phone: '',
              active: true,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) setAgents([]);
        })
        .finally(() => {
          if (!cancelled) setAgentsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
    // Merge both agent sources so the dropdown is never empty: CRM agents
    // (added via the Agents section) plus Channel Partner employees. Falls
    // back to all active employees if the designation filter comes up empty.
    const loadAgents = async () => {
      try {
        const [agRes, empRes] = await Promise.all([
          leadSupabase.agents.list().catch(() => ({ data: [] as any[] })),
          leadSupabase.employees.list({ status: 'Active', limit: 500 }).catch(() => ({ data: [] as any[] })),
        ]);
        if (cancelled) return;
        const crmAgents: any[] = (agRes.data ?? []).map((a: any) => ({
          key: `agent:${a._id}`,
          source: 'agent' as const,
          id: a._id,
          name: a.name,
          email: a.email ?? '',
          phone: a.phone ?? '',
          active: a.active ?? true,
        }));
        const employees: any[] = (empRes.data ?? []).map((e: any) => ({
          key: `employee:${e.id}`,
          source: 'employee' as const,
          id: e.employee_id ?? e.id,
          name: e.name,
          email: e.email ?? '',
          phone: e.phone ?? '',
          active: (e.status ?? 'Active') === 'Active',
          designation: e.designation ?? '',
        }));
        // Anyone with an agent-style designation can be attached to a
        // listing: Telecaller Agent, Field Sales Executive, Channel Partner…
        const partnerList = employees.filter((e) => /agent|sales|channel/i.test(e.designation));
        setAgents([
          ...crmAgents.filter((a) => a.active),
          ...(partnerList.length > 0 ? partnerList : employees),
        ]);
      } catch {
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setAgentsLoading(false);
      }
    };
    void loadAgents();
    return () => { cancelled = true; };
  }, [isGrantedUser]);

  useEffect(() => {
    const state = location.state as { defaultType?: string } | null;
    if (!isEditMode && state?.defaultType) {
      setFormData((prev) => ({ ...prev, type: state.defaultType! }));
    }
  }, [isEditMode, location.state]);

  useEffect(() => {
    if (isEditMode && id) {
      const fetchProperty = async () => {
        try {
          let data: (FormData & { extra_details?: Record<string, string | number> }) | null = null;
          if (isSupabaseDataEnabled()) {
            const doc = await supabaseGetProperty(id);
            if (doc) data = doc as unknown as FormData & { extra_details?: Record<string, string | number> };
          } else {
            const docSnap = await getDoc(doc(db, 'properties', id));
            if (docSnap.exists()) data = docSnap.data() as FormData & { extra_details?: Record<string, string | number> };
          }
          if (data) {
            const extra = data.extra_details ?? {};
            const { area, location } = normalizePropertyLocationFields(
              data.area ?? '',
              data.location ?? '',
            );
            const landAcres =
              Number((data as { area_acres?: number }).area_acres) ||
              Number(extra['Area in Acres']) ||
              0;
            const landGuntas =
              Number((data as { area_guntas?: number }).area_guntas) ||
              Number(extra['Area in Guntas']) ||
              0;
            const loadedAreaUnit =
              ((data as { area_unit?: AreaUnit }).area_unit as AreaUnit | undefined) ?? 'sqft';
            setFormData({
              ...data,
              type: canonicalPropertyType(data.type ?? ''),
              area,
              location,
              area_unit: loadedAreaUnit,
              price_per_sqft: (data as { price_per_sqft?: number }).price_per_sqft ?? 0,
              built_up_area_sqft: Number((data as { built_up_area_sqft?: number }).built_up_area_sqft) || 0,
              land_acres:
                landAcres ||
                (data.area_sqft && loadedAreaUnit === 'acres'
                  ? Math.floor((data.area_sqft ?? 0) / 43560)
                  : 0),
              land_guntas:
                landGuntas ||
                (data.area_sqft && loadedAreaUnit === 'acres' && !landAcres
                  ? Math.round(((data.area_sqft ?? 0) % 43560) / GUNTA_SQFT)
                  : 0),
              survey_number: String(extra['Survey No.'] ?? ''),
              water_source: String(extra['Water Source'] ?? ''),
              dc_conversion_done: extra['DC Conversion Done'] === 'Yes',
              extra_details: data.extra_details ?? {},
              map_lat: Number((data as { map_lat?: number }).map_lat) || 0,
              map_lng: Number((data as { map_lng?: number }).map_lng) || 0,
              maps_link: String((data as { maps_link?: string }).maps_link ?? ''),
            });
            setImageUrls(data.images ?? []);
            if (id) {
              const ownerRes = await fetch(`${OWNER_API_URL}/api/owner-contact/${id}`);
              const ownerData = await ownerRes.json();
              if (ownerData.contact_name || ownerData.contact_phone) {
                setFormData((prev) => ({
                  ...prev,
                  contact_name: ownerData.contact_name ?? '',
                  contact_phone: ownerData.contact_phone ?? '',
                }));
              }
              if (ownerData.agent_id || ownerData.agent_name) {
                setFormData((prev) => ({
                  ...prev,
                  agent_id: ownerData.agent_id ?? '',
                  agent_name: ownerData.agent_name ?? '',
                }));
              }
            }
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
    const plotOrLand = PLOT_LAND_TYPES.includes(
      formData.type as (typeof PLOT_LAND_TYPES)[number],
    );

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    const resolvedArea =
      formData.area.trim() ||
      extractLocalityFromText(formData.location) ||
      extractLocalityFromText(formData.title);
    if (!resolvedArea) {
      newErrors.area = 'Area is required';
    } else if (
      plotOrLand &&
      (!formData.map_lat || !formData.map_lng)
    ) {
      newErrors.area =
        'Select area via Google Search or paste a Maps link to set the pin';
    }
    if (!formData.price) newErrors.price = 'Price is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double-guard: only the final Publish step may post. Earlier submits
    // (Enter key, browser autofill quirks) get routed to the wizard's
    // Continue flow instead of creating a listing.
    if (step < FORM_STEPS.length - 1) {
      handleContinue();
      return;
    }
    // Stray-click guard: Post Property replaces Continue in the same footer
    // slot, so a fast double-click on Continue lands here. Ignore submits
    // within a moment of the Publish step appearing — a real publish needs
    // the review screen to have been on screen.
    if (Date.now() - publishArmedAt.current < 600) return;

    if (!validateForm()) return;

    setSaving(true);
    setPostPhase('saving');
    setUploadProgress({ done: 0, total: 0 });

    try {
      const inferredArea =
        formData.area.trim() ||
        extractLocalityFromText(formData.location) ||
        extractLocalityFromText(formData.title);
      const { area, location } = normalizePropertyLocationFields(
        inferredArea,
        formData.location || formData.title,
      );

      const isPlotOrLand = PLOT_LAND_TYPES.includes(
        formData.type as (typeof PLOT_LAND_TYPES)[number],
      );

      let acres = formData.land_acres ?? 0;
      let guntas = formData.land_guntas ?? 0;
      let area_sqft = formData.area_sqft;

      if (isPlotOrLand) {
        area_sqft = computePlotLandAreaSqft(
          formData.area_unit ?? 'sqft',
          formData.area_sqft,
          acres,
          guntas,
        );
        if ((formData.area_unit ?? 'sqft') === 'sqft' && area_sqft > 0) {
          const converted = sqftToAcresGuntas(area_sqft);
          acres = converted.acres;
          guntas = converted.guntas;
        }
      }

      const mergedExtraDetails = formData.extra_details;

      // Keys deliberately stripped from the persisted payload: plot/land
      // inputs were already folded into area fields above, and propertyCode
      // is assigned server-side / re-added below when present.
      const {
        land_acres: _land_acres,
        land_guntas: _land_guntas,
        area_unit: _areaUnit,
        price_per_sqft: _pps,
        extra_details: _extra,
        propertyCode: _propertyCode,
        ...restForm
      } = formData;

      const payload = sanitizeForFirestore({
        ...restForm,
        ...(formData.propertyCode ? { propertyCode: formData.propertyCode } : {}),
        type: canonicalPropertyType(formData.type),
        area,
        location,
        area_sqft,
        // Granted users always own their listings — the proxy's non-admin
        // path requires params.uid === auth.uid, and property.update/delete
        // scoping keys off this uid too.
        uid: isGrantedUser ? user!.uid : undefined,
        userEmail: isGrantedUser ? (user!.email ?? '') : undefined,
        userDisplayName: isGrantedUser ? (user!.displayName || user!.email?.split('@')[0] || 'User') : undefined,
        featured: isGrantedUser ? false : formData.featured,
        listed_by: formData.listed_by ?? (isGrantedUser ? 'Owner' : 'Agent'),
        agent_id: formData.agent_id ?? '',
        agent_name: formData.agent_name ?? '',
        ...(isPlotOrLand
          ? {
              area_unit: 'sqft',
              area_acres: acres,
              area_guntas: guntas,
              price_per_sqft: 0,
              ...(formData.map_lat && formData.map_lng
                ? {
                    map_lat: formData.map_lat,
                    map_lng: formData.map_lng,
                    ...(formData.maps_link?.trim()
                      ? { maps_link: formData.maps_link.trim() }
                      : {}),
                  }
                : {}),
            }
          : {}),
        images: imageUrls,
        ...(mergedExtraDetails && Object.keys(mergedExtraDetails).length > 0
          ? { extra_details: mergedExtraDetails }
          : {}),
      });

      let propertyId: string | undefined;
      if (isEditMode && id) {
        propertyId = id;
        let finalImages = [...imageUrls];
        if (pendingFiles.length > 0) {
          setUploadingImages(true);
          setPostPhase('uploading');
          setUploadProgress({ done: 0, total: pendingFiles.length });
          const uploaded = await uploadPropertyImages(
            pendingFiles,
            propertyId,
            auth.currentUser?.uid || 'admin',
            (done, total) => setUploadProgress({ done, total }),
          );
          finalImages = [...finalImages, ...uploaded];
        }
        if (isSupabaseDataEnabled()) {
          await callDataProxy('property.update', {
            id: propertyId,
            ...propertyDocToRow({ ...payload, images: finalImages }),
          });
        } else {
          await updateDoc(doc(db, 'properties', propertyId), {
            ...payload,
            images: finalImages,
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        if (isSupabaseDataEnabled()) {
          const created = await callDataProxy('property.create', propertyDocToRow(payload)) as { id: string; propertyCode: string };
          propertyId = created.id as string;
          if (created.propertyCode) {
            setFormData(prev => ({ ...prev, propertyCode: created.propertyCode }));
          }
        } else {
          const allDocs = await getDocs(query(collection(db, 'properties')));
          let maxNum = 0;
          allDocs.forEach(d => {
            const code = d.data().propertyCode as string | undefined;
            if (code) {
              const m = code.match(/^VJR-(\d+)$/);
              if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
            }
          });
          const propertyCode = `VJR-${String(maxNum + 1).padStart(4, '0')}`;
          payload.propertyCode = propertyCode;
          setFormData(prev => ({ ...prev, propertyCode }));

          const ref = await addDoc(collection(db, 'properties'), {
            ...payload,
            images: [],
            createdAt: serverTimestamp(),
          });
          propertyId = ref.id;
        }
        if (pendingFiles.length > 0) {
          setUploadingImages(true);
          setPostPhase('uploading');
          setUploadProgress({ done: 0, total: pendingFiles.length });
          const uploaded = await uploadPropertyImages(
            pendingFiles,
            propertyId,
            auth.currentUser?.uid || 'admin',
            (done, total) => setUploadProgress({ done, total }),
          );
          if (isSupabaseDataEnabled()) {
            await callDataProxy('property.update', { id: propertyId, images: uploaded });
          } else {
            await updateDoc(doc(db, 'properties', propertyId), sanitizeForFirestore({ images: uploaded }));
          }
        }
      }

      if (propertyId && (formData.contact_name || formData.contact_phone || formData.agent_id)) {
        fetch(`${OWNER_API_URL}/api/owner-contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId,
            contact_name: formData.contact_name ?? '',
            contact_phone: formData.contact_phone ?? '',
            type: canonicalPropertyType(formData.type),
            listed_by: formData.listed_by ?? '',
            agent_id: formData.agent_id ?? '',
            agent_name: formData.agent_name ?? '',
          }),
        }).catch(() => {});
      }

      pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
      setPendingFiles([]);
      setPendingPreviews([]);
      removedImageUrls.forEach((url) => {
        deletePropertyImageByUrl(url).catch(() => {});
      });
      setRemovedImageUrls([]);
      setPostPhase('done');
      setToast(isEditMode ? 'Changes saved successfully' : 'Property posted successfully');
      setTimeout(() => navigate('/admin/properties'), 1500);
    } catch (error) {
      console.error('Save error:', error);
      setToast(`Error posting property: ${error instanceof Error ? error.message : String(error)}`);
      setPostPhase('idle');
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

  const removeExistingImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
    if (isEditMode) setRemovedImageUrls((prev) => [...prev, url]);
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

  const handleAIDescription = async () => {
    if (!formData.description.trim() || aiDescLoading) return;
    setAiDescLoading(true);
    setAiDescError('');
    try {
      const result = await restructureDescription(formData.description);
      updateFormData('description', result.slice(0, 1200));
    } catch (err: any) {
      setAiDescError(err?.message || 'AI restructuring failed. Check console.');
      console.error('AI description error:', err);
    } finally {
      setAiDescLoading(false);
    }
  };

  // ── Wizard navigation ────────────────────────────────────────────
  // Per-step validation so Continue blocks on just the fields on screen;
  // the full validateForm still guards the final Post.
  const stepErrors = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    const plotOrLand = PLOT_LAND_TYPES.includes(
      formData.type as (typeof PLOT_LAND_TYPES)[number],
    );
    if (s === 0 && !formData.title.trim()) e.title = 'Title is required';
    if (s === 1) {
      const resolvedArea =
        formData.area.trim() ||
        extractLocalityFromText(formData.location) ||
        extractLocalityFromText(formData.title);
      if (!resolvedArea) e.area = 'Area is required';
      else if (plotOrLand && (!formData.map_lat || !formData.map_lng)) {
        e.area = 'Select area via Google Search or paste a Maps link to set the pin';
      }
    }
    if (s === 2 && !formData.price) e.price = 'Price is required';
    return e;
  };
  // Steps 3 (Details) onwards have no hard-required fields — the full
  // validateForm still guards the final Post.

  const handleContinue = () => {
    const e = stepErrors(step);
    if (Object.keys(e).length > 0) {
      setErrors((prev) => ({ ...prev, ...e }));
      return;
    }
    setErrors({});
    setStepDir(1);
    const next = Math.min(step + 1, FORM_STEPS.length - 1);
    if (next === FORM_STEPS.length - 1) publishArmedAt.current = Date.now();
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStepDir(-1);
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (target: number) => {
    if (target === step) return;
    // Forward jumps re-validate every intermediate step.
    if (target > step) {
      for (let s = step; s < target; s++) {
        if (Object.keys(stepErrors(s)).length > 0) {
          setErrors(stepErrors(s));
          setStepDir(1);
          setStep(s);
          return;
        }
      }
    }
    setStepDir(target > step ? 1 : -1);
    if (target === FORM_STEPS.length - 1) publishArmedAt.current = Date.now();
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const FormChrome = isGrantedUser ? GrantedUserAdminLayout : AdminLayout;

  if (loading) {
    return (
      <FormChrome title={isEditMode ? 'Edit Property' : 'Add Property'}>
        <div className="flex h-96 items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#0A1628] border-t-transparent" />
        </div>
      </FormChrome>
    );
  }

  const shouldShowCommercialSubtypeFields =
    formData.type === 'Commercial Properties';
  const shouldShowPlotSubtypeFields = formData.type.includes('Plot') || formData.type === 'JD Land';

  const isBuildingType = BUILDING_TYPES.includes(formData.type);
  const isPlotTypeOnly = PLOT_TYPES.includes(formData.type);

  const isPlotOrLand = PLOT_LAND_TYPES.includes(
    formData.type as (typeof PLOT_LAND_TYPES)[number],
  );

  const getPlotLandAreaSqft = () =>
    computePlotLandAreaSqft(
      formData.area_unit ?? 'sqft',
      formData.area_sqft,
      formData.land_acres ?? 0,
      formData.land_guntas ?? 0,
    );

  const recalcPlotLandPrices = (
    prev: FormData,
    areaSqft: number,
    source: 'area' | 'total' | 'perSqft',
  ): Partial<Pick<FormData, 'price' | 'price_label' | 'price_per_sqft'>> => {
    if (areaSqft <= 0) return {};

    if (source === 'total' || (source === 'area' && lastPriceEdited.current === 'total')) {
      if (prev.price > 0) {
        return { price_per_sqft: Math.round(prev.price / areaSqft) };
      }
    }
    if (source === 'perSqft' || (source === 'area' && lastPriceEdited.current === 'perSqft')) {
      if ((prev.price_per_sqft ?? 0) > 0) {
        const price = Math.round((prev.price_per_sqft ?? 0) * areaSqft);
        return { price, price_label: formatPrice(price) };
      }
    }
    return {};
  };

  const handleAreaUnitChange = (unit: AreaUnit) => {
    setFormData((prev) => {
      if (unit === prev.area_unit) return prev;
      if (unit === 'acres') {
        const { acres, guntas } = sqftToAcresGuntas(prev.area_sqft);
        return { ...prev, area_unit: unit, land_acres: acres, land_guntas: guntas };
      }
      const sqft = computePlotLandAreaSqft(
        'acres',
        0,
        prev.land_acres ?? 0,
        prev.land_guntas ?? 0,
      );
      const next = { ...prev, area_unit: unit, area_sqft: sqft };
      return { ...next, ...recalcPlotLandPrices(next, sqft, 'area') };
    });
  };

  const handlePlotAreaSqftChange = (value: number) => {
    setFormData((prev) => {
      const next = { ...prev, area_sqft: value };
      return { ...next, ...recalcPlotLandPrices(next, value, 'area') };
    });
  };

  const handlePlotAcresChange = (value: number) => {
    setFormData((prev) => {
      const next = { ...prev, land_acres: value };
      const area = computePlotLandAreaSqft('acres', 0, value, prev.land_guntas ?? 0);
      return { ...next, ...recalcPlotLandPrices(next, area, 'area') };
    });
  };

  const handlePlotGuntasChange = (value: number) => {
    setFormData((prev) => {
      const next = { ...prev, land_guntas: value };
      const area = computePlotLandAreaSqft('acres', 0, prev.land_acres ?? 0, value);
      return { ...next, ...recalcPlotLandPrices(next, area, 'area') };
    });
  };

  const handlePlotTotalPriceChange = (value: number) => {
    lastPriceEdited.current = 'total';
    setFormData((prev) => {
      const area = computePlotLandAreaSqft(
        prev.area_unit ?? 'sqft',
        prev.area_sqft,
        prev.land_acres ?? 0,
        prev.land_guntas ?? 0,
      );
      const next = { ...prev, price: value, price_label: formatPrice(value) };
      if (area > 0 && value > 0) {
        next.price_per_sqft = Math.round(value / area);
      }
      return next;
    });
  };

  const handlePlotPricePerSqftChange = (value: number) => {
    lastPriceEdited.current = 'perSqft';
    setFormData((prev) => {
      const area = computePlotLandAreaSqft(
        prev.area_unit ?? 'sqft',
        prev.area_sqft,
        prev.land_acres ?? 0,
        prev.land_guntas ?? 0,
      );
      const next = { ...prev, price_per_sqft: value };
      if (area > 0 && value > 0) {
        next.price = Math.round(value * area);
        next.price_label = formatPrice(next.price);
      }
      return next;
    });
  };

  const plotLandAreaSqft = getPlotLandAreaSqft();
  const plotLandPriceSummary =
    formData.price > 0 && (formData.price_per_sqft ?? 0) > 0
      ? `Price saved as: ${formatINR(formData.price)} total · ₹${(formData.price_per_sqft ?? 0).toLocaleString('en-IN')}/sq.ft`
      : '';

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
    <FormChrome title={isEditMode ? 'Edit Property' : 'Add Property'}>
      <div className="mx-auto max-w-4xl px-3 py-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-8 sm:pb-32">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-xs">
              {isEditMode ? 'Edit' : 'Add new'} property
            </p>
            <h1 className="admin-heading mt-1 text-2xl font-medium leading-tight text-black sm:text-4xl">
              {FORM_STEPS[step].label === 'Publish' ? 'Review & Publish' : `Step ${step + 1} · ${FORM_STEPS[step].label}`}
            </h1>
          </div>
          <span className="shrink-0 rounded-full bg-[#0A1628] px-3.5 py-1.5 text-[11px] font-bold text-[#C9A84C] tabular-nums">
            {step + 1} / {FORM_STEPS.length}
          </span>
        </div>      {/* Wizard progress rail — numbered stepper with chevron connectors.
          Mobile: compact dot rail (active step number + label only) so five
          steps never squeeze or truncate on a 360px screen. */}
      <div className="admin-section !p-3 sm:!p-4">
        {/* Desktop/tablet rail */}
        <ol className="hidden items-center gap-2 sm:flex">
          {FORM_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.label} className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 transition-colors duration-200 ${
                    active
                      ? 'bg-[#0A1628] text-white shadow-[0_6px_18px_-8px_rgba(10,22,40,0.55)]'
                      : done
                        ? 'text-[#0A1628] hover:bg-[#FBF7EC]'
                        : 'text-gray-400 hover:bg-gray-50'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      active
                        ? 'bg-[#C9A84C] text-[#0A1628]'
                        : done
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {done ? <CheckCircle size={14} weight="bold" /> : i + 1}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-xs font-semibold uppercase tracking-[0.08em]">
                      {s.label}
                    </span>
                  </span>
                </button>
                {i < FORM_STEPS.length - 1 && (
                  <span className={`h-px w-4 shrink-0 ${done ? 'bg-[#C9A84C]' : 'bg-gray-200'}`} />
                )}
              </li>
            );
          })}
        </ol>
        {/* Mobile dot rail — active step number + label, dots for the rest */}
        <div className="flex items-center justify-between sm:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C9A84C] text-xs font-bold text-[#0A1628]">
              {step + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-[#0A1628]">
                {FORM_STEPS[step].label}
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {FORM_STEPS.map((s, i) => (
              <span
                key={s.label}
                className={`rounded-full transition-all duration-200 ${
                  i === step
                    ? 'h-2 w-5 bg-[#C9A84C]'
                    : i < step
                      ? 'h-2 w-2 bg-emerald-400'
                      : 'h-2 w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

        {/* FORM */}
        <form id="admin-property-form" onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                  onChange={(e) => {
                    updateFormData('title', e.target.value);
                    if (errors.title) {
                      setErrors((prev) => {
                        const nextErrors = { ...prev };
                        delete nextErrors.title;
                        return nextErrors;
                      });
                    }
                  }}
                  className={`admin-input-ghost ${errors.title ? 'border-red-300 focus:border-red-400' : ''}`}
                />
                {errors.title && (
                  <p className="mt-2 text-xs text-red-600">{errors.title}</p>
                )}
                {formData.propertyCode && (
                  <p className="mt-1 text-[11px] text-gray-500">
                    Property ID: <span className="font-mono font-semibold text-black">{formData.propertyCode}</span>
                  </p>
                )}
              </div>

              {/* Property Type — visual selection cards */}
              <div>
                <label className="admin-label">Property Type *</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {TYPE_CARDS.map(({ value, icon: TypeIcon }) => {
                    const activeType = formData.type === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateFormData('type', value)}
                        className={`cursor-pointer rounded-2xl border p-4 text-left transition-all duration-200 ${
                          activeType
                            ? 'border-[#0A1628] bg-[#0A1628] text-white shadow-[0_10px_28px_-12px_rgba(10,22,40,0.6)]'
                            : 'border-[#e7e4dc] bg-white text-[#10192b] hover:border-[#C9A84C] hover:bg-[#FBF7EC]'
                        }`}
                        aria-pressed={activeType}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            activeType ? 'bg-[#C9A84C] text-[#0A1628]' : 'bg-gray-100 text-[#0A1628]'
                          }`}
                        >
                          <TypeIcon size={20} weight={activeType ? 'fill' : 'regular'} />
                        </span>
                        <span className="mt-3 block text-sm font-semibold">{value}</span>
                      </button>
                    );
                  })}
                </div>
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

              {/* Status — buildings only */}
              {!isPlotOrLand && (
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
              )}

              {/* Featured — admin-only flag */}
              {!isGrantedUser && (
                <label className="flex items-center gap-3 font-sans text-sm">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => updateFormData('featured', e.target.checked)}
                    className="w-4 h-4"
                  />
                  Show in Featured Properties on homepage
                </label>
              )}
            </div>
          </div>
          </motion.div>
          )}

          {step === 1 && (
          <motion.div
            key="step-1"
            data-step="location"
            initial={{ opacity: 0, x: 28 * stepDir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 * stepDir }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-4"
          >
          {/* SECTION 2: LOCATION */}
          <div className="admin-section">
            <h2 className="admin-section-title">Location</h2>

            <div className="space-y-6">
              {/* Area / Locality */}
              <div>
                <label className="block font-sans text-xs text-gray-500 mb-2">
                  Area / Locality *
                </label>
                {isPlotOrLand ? (
                  <LandMapLocationPicker
                    value={
                      formData.area
                        ? {
                            area: formData.area,
                            location: formData.location,
                            map_lat: formData.map_lat ?? 0,
                            map_lng: formData.map_lng ?? 0,
                            maps_link: formData.maps_link,
                          }
                        : null
                    }
                    onChange={(next: LandLocationValue | null) => {
                      if (!next) {
                        updateFormData('area', '');
                        updateFormData('location', '');
                        updateFormData('map_lat', 0);
                        updateFormData('map_lng', 0);
                        updateFormData('maps_link', '');
                        return;
                      }
                      setFormData((prev) => ({
                        ...prev,
                        area: next.area,
                        location: next.location,
                        map_lat: next.map_lat,
                        map_lng: next.map_lng,
                        maps_link: next.maps_link ?? '',
                      }));
                      if (errors.area) {
                        setErrors((prev) => {
                          const nextErrors = { ...prev };
                          delete nextErrors.area;
                          return nextErrors;
                        });
                      }
                    }}
                    error={errors.area}
                  />
                ) : (
                  <AreaLocalityPicker
                    value={formData.area}
                    onChange={(area) => {
                      updateFormData('area', area);
                      if (errors.area) {
                        setErrors((prev) => {
                          const nextErrors = { ...prev };
                          delete nextErrors.area;
                          return nextErrors;
                        });
                      }
                    }}
                    error={errors.area}
                  />
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

            </div>
          </div>
          </motion.div>
          )}

          {step === 2 && (
          <motion.div
            key="step-2"
            data-step="pricing"
            initial={{ opacity: 0, x: 28 * stepDir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 * stepDir }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-4"
          >
          {/* SECTION 3: PRICING */}
          <div className="admin-section-muted">
            <h2 className="admin-section-title mb-2">Pricing &amp; Rental Income</h2>
            <p className="text-[11px] text-gray-500">
              These are the two most important fields
            </p>

            <div className="space-y-6 mt-6">
              {isPlotOrLand ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                    <div>
                      <label className="block font-sans text-xs text-gray-500 mb-2">
                        Total Price (₹) *
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.price || ''}
                        onChange={(e) => handlePlotTotalPriceChange(Number(e.target.value))}
                        className="admin-input-ghost"
                      />
                      {formData.price > 0 && (
                        <p className="mt-2 text-[11px] font-medium text-emerald-700">
                          = {formatINR(formData.price)}
                        </p>
                      )}
                      {errors.price && (
                        <p className="mt-2 text-xs text-gray-500">{errors.price}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-sans text-xs text-gray-500 mb-2">
                        Price per sq.ft (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.price_per_sqft || ''}
                        onChange={(e) => handlePlotPricePerSqftChange(Number(e.target.value))}
                        className="admin-input-ghost"
                      />
                      {(formData.price_per_sqft ?? 0) > 0 && (
                        <p className="mt-2 text-[11px] font-medium text-emerald-700">
                          {formatINRPerSqft(formData.price_per_sqft)}
                        </p>
                      )}
                    </div>
                  </div>
                  {plotLandPriceSummary && (
                    <p className="text-[11px] font-medium text-emerald-700">{plotLandPriceSummary}</p>
                  )}
                  {plotLandAreaSqft <= 0 && (formData.price > 0 || (formData.price_per_sqft ?? 0) > 0) && (
                    <p className="text-[11px] text-gray-500">
                      Enter plot size below to auto-calculate price fields.
                    </p>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}

              {/* Monthly Rental */}
              {isBuildingType && (
                <div>
                  <label className="block font-sans text-xs text-gray-500 mb-2">
                    Monthly Income (₹)
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
              {isBuildingType && (
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
          </motion.div>
          )}

          {step === 3 && (
          <motion.div
            key="step-3"
            data-step="details"
            initial={{ opacity: 0, x: 28 * stepDir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 * stepDir }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-4"
          >
          {/* SECTION 4: PROPERTY DETAILS */}
          <div className="admin-section">
            <h2 className="admin-section-title">Property Details</h2>
            <p className="text-[11px] text-gray-500">
              Area, floors, units &amp; document type — builds buyer trust
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              {/* Facing — properties face a direction, plots/land don't */}
              {!isPlotOrLand && (
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
              )}

              {/* Age — buildings only */}
              {isBuildingType && (
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
              )}

              {/* Area — building types */}
              {isBuildingType && (
                <>
                  <div>
                    <label className="block font-sans text-xs text-gray-500 mb-2">Plot Area (sq.ft)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.area_sqft || ''}
                      onChange={(e) => updateFormData('area_sqft', Number(e.target.value))}
                      className="admin-input-ghost"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs text-gray-500 mb-2">Built-up Area (sq.ft)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.built_up_area_sqft || ''}
                      onChange={(e) => updateFormData('built_up_area_sqft', Number(e.target.value))}
                      className="admin-input-ghost"
                    />
                  </div>
                </>
              )}

              {/* Area — plot & land types with unit switcher */}
              {isPlotOrLand && (
                <div className="sm:col-span-2">
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => handleAreaUnitChange('sqft')}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        (formData.area_unit ?? 'sqft') === 'sqft'
                          ? 'bg-[#0A1628] text-white shadow-[0_4px_14px_-6px_rgba(10,22,40,0.5)]'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      sq.ft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAreaUnitChange('acres')}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        formData.area_unit === 'acres'
                          ? 'bg-[#0A1628] text-white shadow-[0_4px_14px_-6px_rgba(10,22,40,0.5)]'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Acres & Guntas
                    </button>
                  </div>

                  {(formData.area_unit ?? 'sqft') === 'sqft' ? (
                    <div>
                      <label className="block font-sans text-xs text-gray-500 mb-2">
                        Plot Size (sq.ft)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.area_sqft || ''}
                          onChange={(e) => handlePlotAreaSqftChange(Number(e.target.value))}
                          className="admin-input-ghost pr-14"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          sq.ft
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block font-sans text-xs text-gray-500 mb-2">
                          Acres
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={formData.land_acres || ''}
                          onChange={(e) => handlePlotAcresChange(Number(e.target.value))}
                          className="admin-input-ghost"
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-xs text-gray-500 mb-2">
                          Guntas
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={formData.land_guntas || ''}
                            onChange={(e) => handlePlotGuntasChange(Number(e.target.value))}
                            className="admin-input-ghost pr-10"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            /40
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.area_unit === 'acres' && (
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                      1 Acre = 40 Guntas = 43,560 sq.ft
                    </p>
                  )}
                  {plotLandAreaSqft > 0 && (
                    <p className="mt-2 text-[11px] text-gray-500">
                      Saved as: {plotLandAreaSqft.toLocaleString('en-IN')} sq.ft
                    </p>
                  )}
                </div>
              )}

              {/* Dimensions — plots only */}
              {isPlotTypeOnly && (
                <div>
                  <label className="block font-sans text-xs text-gray-500 mb-2">
                    Dimensions (e.g. 30×40 ft)
                  </label>
                  <input
                    type="text"
                    placeholder="30×40 ft"
                    value={formData.dimensions}
                    onChange={(e) => updateFormData('dimensions', e.target.value)}
                    className="admin-input-ghost"
                  />
                </div>
              )}

              {/* Total Floors — buildings only */}
              {isBuildingType && (
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

              {/* Rental Units — buildings only */}
              {isBuildingType && (
                <div>
                  <label className="block font-sans text-xs text-gray-500 mb-2">
                    Rental Units
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
          {(isBuildingType || isPlotTypeOnly) && (
          <div className="admin-section">
            <h2 className="admin-section-title flex items-center gap-2">
              <ArrowsOut size={16} weight="bold" className="text-[#C9A84C]" />
              Legal &amp; Loan
            </h2>

            <div className="space-y-4">
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
            </div>
          </div>
          )}

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

          {/* SECTION 7: AMENITIES — buildings only */}
          {isBuildingType && (
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
          )}

          {/* SECTION 8: DESCRIPTION */}
          <div className="admin-section">
            <div className="flex items-center justify-between">
              <h2 className="admin-section-title">Description</h2>
              <button
                type="button"
                onClick={handleAIDescription}
                disabled={aiDescLoading || !formData.description.trim()}
                className="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {aiDescLoading ? 'Restructuring…' : 'AI · Format'}
              </button>
            </div>

            <div className="relative">
              <textarea
                placeholder="Paste raw property details, then click AI · Format to restructure them automatically..."
                value={formData.description}
                onChange={(e) =>
                  updateFormData('description', e.target.value.slice(0, 1200))
                }
                className="admin-textarea"
              />
              <p
                className="mt-2 text-right text-[11px] text-gray-400"
              >
                {formData.description.length} / 1200 characters
              </p>
              {aiDescError && (
                <p className="mt-2 text-xs text-red-600">{aiDescError}</p>
              )}
            </div>
          </div>
          </motion.div>
          )}

          {step === 4 && (
          <motion.div
            key="step-4"
            data-step="media"
            initial={{ opacity: 0, x: 28 * stepDir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 * stepDir }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-4"
          >
          {/* SECTION: PROPERTY PHOTOS */}
          <div className="admin-section">
            <h2 className="admin-section-title mb-2">Property Photos</h2>
            <p className="mb-5 text-xs text-gray-500">
              Upload square-friendly photos. First image is used as the card cover.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {imageUrls.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50">
                  <SupabaseImage preset="admin" src={url} alt="Property" className="h-full w-full object-cover" />
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
                  <SupabaseImage preset="admin" src={url} alt="Pending upload" className="h-full w-full object-cover opacity-90" />
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

          </motion.div>
          )}

          {step === 5 && (
          <motion.div
            key="step-5"
            data-step="publish"
            initial={{ opacity: 0, x: 28 * stepDir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 * stepDir }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-4"
          >
            {/* Review strip */}
            <div className="rounded-2xl bg-gradient-to-br from-[#0A1628] to-[#12294a] p-5 text-white shadow-[0_10px_30px_-12px_rgba(10,22,40,0.55)] sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">
                Ready to publish
              </p>
              <p className="mt-1 truncate text-lg font-semibold">
                {formData.title || 'Untitled property'}
              </p>
              <p className="mt-0.5 text-xs text-white/60">
                {formData.type} · {formData.area || '—'} · {formData.price > 0 ? formData.price_label : 'Price pending'} · {imageUrls.length + pendingFiles.length} photo{imageUrls.length + pendingFiles.length === 1 ? '' : 's'}
              </p>
            </div>

          {/* SECTION 9: LISTING DETAILS */}
          <div className="admin-section">
            <h2 className="admin-section-title">Listing Details</h2>

            <div className="space-y-6">
              <div>
                <label className="block font-sans text-xs text-gray-500 mb-2">
                  Listed By
                </label>
                <select
                  value={isGrantedUser
                    ? ((formData.listed_by === 'Agent' || formData.agent_id) ? 'Agent' : 'Owner')
                    : (formData.listed_by === 'Owner' ? 'Owner' : 'Agent')}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'Agent') {
                      updateFormData('listed_by', 'Agent');
                      updateFormData('agent_id', formData.agent_id ?? '');
                    } else {
                      updateFormData('listed_by', 'Owner');
                      updateFormData('agent_id', '');
                      updateFormData('agent_name', '');
                    }
                  }}
                  className="admin-select"
                >
                  {isGrantedUser ? (
                    <>
                      <option value="Owner">Owner</option>
                      <option value="Agent">Agent</option>
                    </>
                  ) : (
                    <>
                      <option value="Agent">Agent</option>
                      <option value="Owner">Owner</option>
                    </>
                  )}
                </select>
              </div>

              {formData.listed_by === 'Agent' ? (
                <div>
                  <label className="block font-sans text-xs text-gray-500 mb-2">
                    Select Agent
                  </label>
                  <select
                    value={formData.agent_id ?? ''}
                    onChange={(e) => {
                      const agent = agentsWithDevendra.find((a: { id: string | number }) => String(a.id) === e.target.value);
                      updateFormData('agent_id', e.target.value);
                      updateFormData('agent_name', agent?.name ?? '');
                    }}
                    className="admin-select"
                  >
                    <option value="">Select agent</option>
                    {agentsWithDevendra.map((a: { key: string; id: string | number; name: string; source: string }) => (
                      <option key={a.key} value={String(a.id)}>
                        {a.name}
                        {a.source === 'employee' && a.id ? ` (${a.id})` : ''}
                      </option>
                    ))}
                  </select>
                  {agentsLoading && (
                    <p className="mt-1 text-[11px] text-gray-400">Loading agents...</p>
                  )}
                  {!agentsLoading && agentsWithDevendra.length === 0 && (
                    <p className="mt-1 text-[11px] text-gray-400">
                      No agents available right now.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-sans text-xs text-gray-500 mb-2">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      placeholder="Owner Name"
                      value={formData.contact_name ?? ''}
                      onChange={(e) => updateFormData('contact_name', e.target.value)}
                      className="admin-input-ghost"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs text-gray-500 mb-2">
                      Owner Number
                    </label>
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={formData.contact_phone ?? ''}
                      onChange={(e) => updateFormData('contact_phone', e.target.value)}
                      className="admin-input-ghost"
                    />
                  </div>
                </>
              )}

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
          </div>
          </motion.div>
          )}
          </AnimatePresence>
        </form>

        {/* FOOTER BAR (Sticky) — mobile: one row, Back is a compact icon
            button and the primary action fills the remaining width. */}
        <div className="admin-footer-bar">
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
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
                form="admin-property-form"
                disabled={saving || uploadingImages}
                className="admin-btn-primary min-h-[48px] flex-1 disabled:opacity-60 sm:flex-none sm:px-8"
              >
                {postPhase === 'uploading' ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Uploading {uploadProgress.done}/{uploadProgress.total}…
                  </span>
                ) : saving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Publishing…
                  </span>
                ) : (
                  'Publish'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Publish overlay — premium full-screen submission moment */}
      <AnimatePresence>
        {postPhase === 'saving' || postPhase === 'uploading' || postPhase === 'done' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0A1628]/80 backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="mx-4 flex w-full max-w-sm flex-col items-center rounded-3xl bg-white px-8 py-10 text-center shadow-[0_32px_80px_rgba(10,22,40,0.45)]"
            >
              {postPhase === 'done' ? (
                <>
                  {/* Success burst */}
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                    className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_12px_32px_rgba(16,185,129,0.45)]"
                  >
                    <motion.svg
                      viewBox="0 0 24 24"
                      className="h-9 w-9 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.path
                        d="M4 12.5l5 5L20 6.5"
                        variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1 } }}
                        transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
                      />
                    </motion.svg>
                    {/* Gold ring pulse */}
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-[#C9A84C]"
                      initial={{ scale: 1, opacity: 0.9 }}
                      animate={{ scale: 1.7, opacity: 0 }}
                      transition={{ duration: 1, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.3 }}
                    />
                  </motion.span>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 text-xl font-semibold text-[#0A1628]"
                  >
                    {isEditMode ? 'Changes Saved' : 'Property Published!'}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42 }}
                    className="mt-1.5 text-sm text-gray-500"
                  >
                    {formData.propertyCode
                      ? `${isEditMode ? 'Updated' : 'Listing'} ${formData.propertyCode} is live`
                      : 'Your listing is now live'}
                  </motion.p>
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.1, delay: 0.4, ease: 'easeInOut' }}
                    className="mt-6 h-1 overflow-hidden rounded-full bg-gray-100"
                  >
                    <span className="block h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E9CE7C]" />
                  </motion.span>
                </>
              ) : (
                <>
                  {/* In-progress: gold spinner with orbiting comet */}
                  <span className="relative flex h-20 w-20 items-center justify-center">
                    <motion.span
                      className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#C9A84C] border-r-[#C9A84C]/40"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.9, ease: 'linear', repeat: Infinity }}
                    />
                    <motion.span
                      className="absolute inset-2 rounded-full border-2 border-[#0A1628]/10"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 1.6, ease: 'linear', repeat: Infinity }}
                    />
                    {postPhase === 'uploading' ? (
                      <ImageIcon size={24} className="text-[#C9A84C]" weight="duotone" />
                    ) : (
                      <RocketLaunch size={24} className="text-[#C9A84C]" weight="duotone" />
                    )}
                  </span>
                  <p className="mt-6 text-lg font-semibold text-[#0A1628]">
                    {postPhase === 'uploading' ? 'Uploading photos' : 'Publishing your property'}
                  </p>
                  <p className="mt-1.5 text-sm text-gray-500">
                    {postPhase === 'uploading'
                      ? `${uploadProgress.done} of ${uploadProgress.total} photo${uploadProgress.total === 1 ? '' : 's'} uploaded`
                      : 'Saving your listing to VJR Estate'}
                  </p>
                  {postPhase === 'uploading' && uploadProgress.total > 0 && (
                    <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#0A1628] to-[#1E3852]"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* TOAST (errors only — success now has the overlay) */}
      <AnimatePresence>
        {toast && postPhase !== 'done' && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-[calc(7.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-xl bg-black px-5 py-3.5 text-sm text-white shadow-lg shadow-black/30 sm:bottom-auto sm:right-6 sm:top-6 sm:max-w-none sm:translate-x-0"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </FormChrome>
  );
}
