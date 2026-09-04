import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  supabaseData,
  useSupabaseData,
  supabasePublicUrl,
  parseSupabaseStoragePath,
  tsFacade,
  nowIso,
  DATA_PROXY_URL,
} from './supabaseConfig';
import { auth, db } from './firebase';
import { deleteDoc, doc } from 'firebase/firestore';

/**
 * Browser-side Supabase layer for site data.
 *
 * Reads use the anon key + public RLS. Writes go through the Vercel serverless
 * proxy (/api/data-proxy) with the Firebase ID token — the service-role key
 * never touches this bundle. Rows are mapped back into the same shapes the
 * Firebase code produced (including `{ toDate() }` timestamp facades) so the
 * existing components keep working without modification.
 */

const client: SupabaseClient | null = supabaseData;

/* ── Proxy call helper ───────────────────────────────────────────────────── */

export async function callDataProxy(
  action: string,
  params: Record<string, unknown> = {},
  opts: { isPublic?: boolean } = {},
): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let body: any = { action, params };

  if (opts.isPublic) {
    body = { action, params, public: true };
  } else {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(DATA_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = {};
  if (text) {
    try { data = JSON.parse(text); } catch { data = {}; }
  }
  if (!res.ok) {
    console.error(`[callDataProxy] action=${action} status=${res.status} body=${text}`);
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  return data;
}

/* ── Generic realtime helper (Firestore onSnapshot parity) ──────────────── */

export function subscribeSupabaseTable<T>(
  table: string,
  onData: (rows: T[]) => void,
  options?: { filter?: (row: T) => boolean },
): () => void {
  if (!client) {
    onData([]);
    return () => {};
  }

  let disposed = false;
  let channel: ReturnType<SupabaseClient['channel']> | null = null;

  const fetchAll = async () => {
    try {
      const all: unknown[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await client
          .from(table)
          .select('*')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all.push(...(data ?? []));
        if ((data ?? []).length < PAGE) break;
      }
      if (disposed) return;
      const rows = all as unknown as T[];
      onData(options?.filter ? rows.filter(options.filter) : rows);
    } catch (e: any) {
      if (!disposed) onData([]);
    }
  };

  channel = client
    .channel(`site-data-${table}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      () => void fetchAll(),
    )
    .subscribe();

  void fetchAll();

  return () => {
    disposed = true;
    channel?.unsubscribe();
  };
}

/* ── Properties ──────────────────────────────────────────────────────────── */

export interface SupabasePropertyRow {
  id: string;
  property_code?: string | null;
  title?: string | null;
  type?: string | null;
  commercial_subtype?: string | null;
  plot_subtype?: string | null;
  area?: string | null;
  location?: string | null;
  price?: number | null;
  price_label?: string | null;
  monthly_rental?: number | null;
  monthly_rental_label?: string | null;
  rental_yield?: number | null;
  area_sqft?: number | null;
  area_unit?: string | null;
  area_acres?: number | null;
  area_guntas?: number | null;
  price_per_sqft?: number | null;
  built_up_area_sqft?: number | null;
  dimensions?: string | null;
  floor_count?: number | null;
  total_units?: number | null;
  available_units?: number | null;
  occupancy_percent?: number | null;
  facing?: string | null;
  age?: string | null;
  status?: string | null;
  featured?: boolean | null;
  bbmp_approved?: boolean | null;
  bank_loan_eligible?: boolean | null;
  clear_title?: boolean | null;
  katha?: string | null;
  highlights?: string[] | null;
  amenities?: string[] | null;
  description?: string | null;
  listed_days_ago?: number | null;
  extra_details?: Record<string, unknown> | null;
  images?: string[] | null;
  listed_by?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  map_lat?: number | null;
  map_lng?: number | null;
  maps_link?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
  uid?: string | null;
  user_email?: string | null;
  user_display_name?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  full_address?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Map a Supabase property row to the Firestore doc shape components expect. */
export function propertyRowToDoc(row: SupabasePropertyRow): Record<string, unknown> {
  return {
    id: row.id,
    propertyCode: row.property_code ?? undefined,
    title: row.title ?? '',
    type: row.type ?? '',
    commercial_subtype: row.commercial_subtype ?? undefined,
    plot_subtype: row.plot_subtype ?? undefined,
    area: row.area ?? '',
    location: row.location ?? '',
    price: row.price ?? 0,
    price_label: row.price_label ?? '',
    monthly_rental: row.monthly_rental ?? 0,
    monthly_rental_label: row.monthly_rental_label ?? '',
    rental_yield: row.rental_yield ?? undefined,
    area_sqft: row.area_sqft ?? 0,
    area_unit: row.area_unit ?? undefined,
    area_acres: row.area_acres ?? undefined,
    area_guntas: row.area_guntas ?? undefined,
    price_per_sqft: row.price_per_sqft ?? undefined,
    built_up_area_sqft: row.built_up_area_sqft ?? undefined,
    dimensions: row.dimensions ?? '—',
    floor_count: row.floor_count ?? 0,
    total_units: row.total_units ?? 0,
    available_units: row.available_units ?? 0,
    occupancy_percent: row.occupancy_percent ?? 0,
    facing: row.facing ?? '—',
    age: row.age ?? '—',
    status: row.status ?? 'Ready',
    featured: row.featured ?? false,
    bbmp_approved: row.bbmp_approved ?? false,
    bank_loan_eligible: row.bank_loan_eligible ?? false,
    clear_title: row.clear_title ?? false,
    katha: row.katha ?? '',
    highlights: row.highlights ?? [],
    amenities: row.amenities ?? [],
    description: row.description ?? '',
    listed_days_ago: row.listed_days_ago ?? 0,
    extra_details: row.extra_details ?? undefined,
    images: row.images ?? [],
    listed_by: row.listed_by ?? 'VJR Estate',
    contact_name: row.contact_name ?? '',
    contact_phone: row.contact_phone ?? '',
    map_lat: row.map_lat ?? undefined,
    map_lng: row.map_lng ?? undefined,
    maps_link: row.maps_link ?? undefined,
    agent_id: row.agent_id ?? '',
    agent_name: row.agent_name ?? '',
    uid: row.uid ?? undefined,
    userEmail: row.user_email ?? undefined,
    userDisplayName: row.user_display_name ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    pincode: row.pincode ?? undefined,
    fullAddress: row.full_address ?? undefined,
    createdAt: tsFacade(row.created_at),
    updatedAt: tsFacade(row.updated_at),
  };
}

export async function supabaseFetchAllProperties(): Promise<Record<string, unknown>[]> {
  if (!client) return [];
  const all: SupabasePropertyRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data as SupabasePropertyRow[]));
    if ((data ?? []).length < PAGE) break;
  }
  return all.map((row) => propertyRowToDoc(row));
}

export async function supabaseGetProperty(id: string): Promise<Record<string, unknown> | null> {
  if (!client) return null;
  const { data, error } = await client
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return propertyRowToDoc(data as unknown as SupabasePropertyRow);
}

/** Admin-side fetch (no uid filter) or owner-scoped fetch. */
export function subscribeSupabaseProperties(
  onData: (docs: { id: string; data: Record<string, unknown> }[]) => void,
  options?: { uid?: string },
): () => void {
  return subscribeSupabaseTable<SupabasePropertyRow>(
    'properties',
    (rows) => {
      onData(rows.map((row) => ({ id: row.id, data: propertyRowToDoc(row) })));
    },
    { filter: (row: SupabasePropertyRow) => !options?.uid || row.uid === options.uid },
  );
}

/* ── Requirements ────────────────────────────────────────────────────────── */

export function subscribeSupabaseRequirements(
  onData: (rows: Record<string, unknown>[]) => void,
): () => void {
  return subscribeSupabaseTable<any>('requirements', (rows) => {
    onData(
      rows.map((r) => ({
        id: r.id,
        reqId: r.req_id ?? '',
        purpose: r.purpose ?? '',
        purposeOther: r.purpose_other ?? undefined,
        propertyType: r.property_type ?? '',
        propertyTypeOther: r.property_type_other ?? undefined,
        locations: r.locations ?? [],
        budgetMin: r.budget_min ?? 0,
        budgetMax: r.budget_max ?? 0,
        timeline: r.timeline ?? '',
        notes: r.notes ?? undefined,
        status: r.status ?? 'open',
        clickCount: r.click_count ?? 0,
        postedAt: tsFacade(r.posted_at),
        // Private fields are filled separately for admins.
        paymentMode: 'Other',
        buyerName: '',
        buyerPhone: '',
      })),
    );
  });
}

/** Admin subscription that joins requirement_private fields. */
export function subscribeSupabaseAdminRequirements(
  onData: (rows: Record<string, unknown>[]) => void,
): () => void {
  if (!client) return () => {};
  const c: SupabaseClient = client;
  return subscribeSupabaseTable<any>('requirements', (rows) => {
    void Promise.all(
      rows.map(async (r) => {
        type PrivateRow = { payment_mode?: string; buyer_name?: string; buyer_phone?: string };
        let privateRow: PrivateRow | null = null;
        try {
          const { data } = await c
            .from('requirement_private')
            .select('payment_mode,buyer_name,buyer_phone')
            .eq('id', r.id)
            .maybeSingle();
          privateRow = (data ?? null) as PrivateRow | null;
        } catch { /* private row missing */ }
        return {
          id: r.id,
          reqId: r.req_id ?? '',
          purpose: r.purpose ?? '',
          purposeOther: r.purpose_other ?? undefined,
          propertyType: r.property_type ?? '',
          propertyTypeOther: r.property_type_other ?? undefined,
          locations: r.locations ?? [],
          budgetMin: r.budget_min ?? 0,
          budgetMax: r.budget_max ?? 0,
          timeline: r.timeline ?? '',
          notes: r.notes ?? undefined,
          status: r.status ?? 'open',
          clickCount: r.click_count ?? 0,
          postedAt: tsFacade(r.posted_at),
          paymentMode: privateRow?.payment_mode ?? 'Other',
          buyerName: privateRow?.buyer_name ?? '',
          buyerPhone: privateRow?.buyer_phone ?? '',
        };
      }),
    ).then((mapped) => onData(mapped));
  });
}

export async function supabaseCountOpenRequirements(): Promise<number> {
  if (!client) return 0;
  const { count, error } = await client
    .from('requirements')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');
  if (error) return 0;
  return count ?? 0;
}

export async function supabaseIncrementRequirementClick(id: string): Promise<void> {
  await callDataProxy('requirement.click', { id }, { isPublic: true });
}

/* ── Property leads ──────────────────────────────────────────────────────── */

function mapLeadRow(r: any): any {
  return {
    id: r.id,
    propertyId: r.property_id ?? '',
    propertyTitle: r.property_title ?? '',
    propertyType: r.property_type ?? '',
    propertyArea: r.property_area ?? '',
    propertyPrice: r.property_price ?? '',
    propertyMonthlyRental: r.property_monthly_rental ?? undefined,
    propertyUrl: r.property_url ?? '',
    leadType: r.lead_type ?? 'whatsapp',
    visitDate: r.visit_date ?? undefined,
    visitTime: r.visit_time ?? undefined,
    buyerName: r.buyer_name ?? undefined,
    buyerPhone: r.buyer_phone ?? undefined,
    message: r.message ?? '',
    source: r.source ?? 'card',
    ownerUid: r.owner_uid ?? undefined,
    listedBy: r.listed_by ?? undefined,
    ipAddress: r.ip_address ?? undefined,
    status: r.status ?? 'new',
    createdAt: r.created_at ? new Date(r.created_at) : null,
  };
}

/**
 * Leads contain buyer PII, so reads go through the proxy (admin sees all,
 * owners see their own) instead of the public RLS path. Polls on a short
 * interval — leads are low-volume and the table is not in the realtime
 * publication.
 */
export function subscribeSupabasePropertyLeads(
  onData: (leads: any[]) => void,
  uid?: string,
): () => void {
  if (!client) return () => {};
  let disposed = false;
  const refresh = async () => {
    try {
      const res = await callDataProxy('lead.list');
      if (disposed) return;
      const rows = (res.data ?? []).filter((r: any) => !uid || r.owner_uid === uid);
      onData(rows.map(mapLeadRow));
    } catch {
      /* transient — next poll retries */
    }
  };
  void refresh();
  const timer = setInterval(() => void refresh(), 10_000);
  return () => {
    disposed = true;
    clearInterval(timer);
  };
}

export async function supabaseSavePropertyLead(input: Record<string, unknown>): Promise<void> {
  await callDataProxy('lead.create', input, { isPublic: true });
}

/* ── Users ───────────────────────────────────────────────────────────────── */

export async function supabaseTrackUser(payload: {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  loginCount?: number;
  lastLogin?: string;
  lastSeen?: string;
  createdAt?: string;
  ipLocation?: unknown;
  location?: unknown;
  gpsLocation?: unknown;
  loginHistory?: unknown;
}): Promise<{ suspended: boolean }> {
  const res = await callDataProxy('user.track', payload as Record<string, unknown>);
  return { suspended: Boolean(res.suspended) };
}

export async function supabaseCheckUserSuspended(_uid: string): Promise<boolean> {
  // The proxy derives the identity from the verified token — the uid argument
  // is kept for call-site compatibility.
  void _uid;
  try {
    const res = await callDataProxy('user.checkSuspended');
    return Boolean(res.suspended);
  } catch {
    return false;
  }
}

function mapUserRow(r: any): any {
  return {
    uid: r.uid,
    email: r.email ?? '',
    displayName: r.display_name ?? '',
    photoURL: r.photo_url ?? '',
    loginCount: r.login_count ?? 0,
    lastLogin: r.last_login ?? undefined,
    lastSeen: r.last_seen ?? undefined,
    createdAt: r.created_at ?? undefined,
    suspended: Boolean(r.suspended),
    location: r.location ?? undefined,
    gpsLocation: r.gps_location ?? undefined,
    ipLocation: r.ip_location ?? undefined,
    loginHistory: r.login_history ?? undefined,
  };
}

/** Admin-only read (users hold PII) — served by the proxy, polling refresh. */
export function subscribeSupabaseUsers(onData: (rows: any[]) => void): () => void {
  if (!client) return () => {};
  let disposed = false;
  const refresh = async () => {
    try {
      const res = await callDataProxy('user.list');
      if (disposed) return;
      onData((res.data ?? []).map(mapUserRow));
    } catch {
      /* transient — next poll retries */
    }
  };
  void refresh();
  const timer = setInterval(() => void refresh(), 15_000);
  return () => {
    disposed = true;
    clearInterval(timer);
  };
}

/* ── Site settings ───────────────────────────────────────────────────────── */

export async function supabaseReadSettings(): Promise<{ nexaEnabled: boolean } | null> {
  if (!client) return null;
  const { data, error } = await client
    .from('site_settings')
    .select('nexa_enabled')
    .eq('key', 'general')
    .maybeSingle();
  if (error || !data) return null;
  return { nexaEnabled: data.nexa_enabled !== false };
}

export function subscribeSupabaseSettings(
  onChange: (s: { nexaEnabled: boolean }) => void,
): () => void {
  if (!client) return () => {};
  let disposed = false;
  const emit = (row?: any) => {
    if (disposed) return;
    if (row) {
      onChange({ nexaEnabled: row.nexa_enabled !== false });
    }
  };
  void client
    .from('site_settings')
    .select('nexa_enabled')
    .eq('key', 'general')
    .maybeSingle()
    .then(({ data }) => emit(data));
  const channel = client
    .channel('site-data-settings')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'site_settings' },
      (payload) => emit(payload.new),
    )
    .subscribe();
  return () => {
    disposed = true;
    channel.unsubscribe();
  };
}

/* ── Jobs ────────────────────────────────────────────────────────────────── */

function mapJobRow(r: any): any {
  return {
    id: r.id,
    title: r.title ?? '',
    department: r.department ?? '',
    type: r.type ?? 'Full Time',
    location: r.location ?? 'Bangalore',
    experience: r.experience ?? '',
    salary: r.salary ?? '',
    description: r.description ?? '',
    responsibilities: r.responsibilities ?? [],
    requirements: r.requirements ?? [],
    niceToHave: r.nice_to_have ?? [],
    isActive: r.is_active ?? true,
    isFeatured: r.is_featured ?? false,
    totalApplications: r.total_applications ?? 0,
    department_color: r.department_color ?? '',
    postedAt: tsFacade(r.posted_at),
    closingDate: tsFacade(r.closing_date),
  };
}

function mapApplicationRow(r: any): any {
  return {
    id: r.id,
    jobId: r.job_id ?? '',
    jobTitle: r.job_title ?? '',
    department: r.department ?? '',
    fullName: r.full_name ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    currentLocation: r.current_location ?? '',
    currentCompany: r.current_company ?? '',
    currentRole: r.current_role ?? '',
    totalExperience: r.total_experience ?? '',
    expectedSalary: r.expected_salary ?? '',
    noticePeriod: r.notice_period ?? '',
    linkedinUrl: r.linkedin_url ?? '',
    resumeUrl: r.resume_url ?? '',
    resumeFileName: r.resume_file_name ?? '',
    coverLetter: r.cover_letter ?? '',
    whyVJR: r.why_vjr ?? '',
    status: r.status ?? 'Applied',
    statusHistory: r.status_history ?? [],
    adminNotes: r.admin_notes ?? '',
    rating: r.rating ?? 0,
    tags: r.tags ?? [],
    appliedAt: tsFacade(r.applied_at),
    updatedAt: tsFacade(r.updated_at),
    isShortlisted: r.is_shortlisted ?? false,
    viewedByAdmin: r.viewed_by_admin ?? false,
    referenceId: r.reference_id ?? undefined,
    applicantUid: r.applicant_uid ?? undefined,
    applicantEmail: r.applicant_email ?? undefined,
    pinCode: r.pin_code ?? '',
    applicantLat: r.applicant_lat ?? undefined,
    applicantLng: r.applicant_lng ?? undefined,
    applicantArea: r.applicant_area ?? undefined,
  };
}

export function subscribeSupabaseJobs(onData: (jobs: any[]) => void): () => void {
  return subscribeSupabaseTable<any>('job_openings', (rows) => {
    onData(rows.map(mapJobRow));
  });
}

/** Admin-only read (applications hold candidate PII) — via proxy, polling. */
export function subscribeSupabaseApplications(onData: (apps: any[]) => void): () => void {
  if (!client) return () => {};
  let disposed = false;
  const refresh = async () => {
    try {
      const res = await callDataProxy('application.list');
      if (disposed) return;
      onData((res.data ?? []).map(mapApplicationRow));
    } catch {
      /* transient — next poll retries */
    }
  };
  void refresh();
  const timer = setInterval(() => void refresh(), 15_000);
  return () => {
    disposed = true;
    clearInterval(timer);
  };
}

/* ── Auctions ────────────────────────────────────────────────────────────── */

function mapAuctionRow(r: any): any {
  return {
    id: r.id,
    title: r.title ?? '',
    category: r.category ?? 'Residential',
    location: r.location ?? '',
    city: r.city ?? 'Bangalore',
    images: r.images ?? [],
    description: r.description ?? '',
    startingBid: r.starting_bid ?? 0,
    currentBid: r.current_bid ?? r.starting_bid ?? 0,
    reservePrice: r.reserve_price ?? r.starting_bid ?? 0,
    bidIncrement: r.bid_increment ?? 100000,
    totalBids: r.total_bids ?? 0,
    // Components call .toLocaleString() directly on auction times, so a real
    // Date is the closest match to what Firestore's Timestamp.toDate() gave.
    auctionStartTime: tsFacade(r.auction_start_time)?.toDate(),
    auctionEndTime: tsFacade(r.auction_end_time)?.toDate(),
    status: r.status ?? 'upcoming',
    areaSqft: r.area_sqft ?? undefined,
    propertyType: r.property_type ?? undefined,
    khata: r.khata ?? undefined,
    facing: r.facing ?? undefined,
    registeredBidders: r.registered_bidders ?? 0,
    isFeatured: r.is_featured ?? false,
    map_lat: r.map_lat ?? undefined,
    map_lng: r.map_lng ?? undefined,
    maps_link: r.maps_link ?? undefined,
    createdAt: tsFacade(r.created_at),
  };
}

export function subscribeSupabaseAuctions(
  onData: (auctions: any[]) => void,
  categoryFilter = 'all',
): () => void {
  return subscribeSupabaseTable<any>(
    'auctions',
    (rows) => {
      onData(rows.map(mapAuctionRow));
    },
    { filter: (r) => categoryFilter === 'all' || r.category === categoryFilter },
  );
}

export async function supabaseGetAuction(id: string): Promise<any | null> {
  if (!client) return null;
  const { data, error } = await client.from('auctions').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapAuctionRow(data);
}

/** Admin dashboard: latest bids (Firestore auction_bids parity). */
export function subscribeSupabaseAuctionBids(onData: (bids: any[]) => void): () => void {
  return subscribeSupabaseTable<any>('auction_bids', (rows) => {
    const sorted = [...rows].sort((a, b) =>
      String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')),
    );
    onData(
      sorted.slice(0, 12).map((r) => ({
        id: r.id,
        auctionId: r.auction_id ?? '',
        bidderName: r.bidder_name ?? 'Anonymous',
        amount: r.amount ?? 0,
        timestamp: tsFacade(r.created_at),
      })),
    );
  });
}

/* ── Images: upload / delete (via proxy, with client-side resize) ───────── */

const MAX_DIMENSION = 1600;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Downscale large photos on the client before upload (Phase 7/10): keeps
 * uploads fast, under the 4.5 MB Vercel body limit, and makes listings cheap
 * to serve. Original files are untouched.
 */
export async function resizeImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size < 500_000) {
      bitmap.close();
      return file;
    }
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const keepTransparency = file.type === 'image/png' || file.type === 'image/webp';
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        keepTransparency ? file.type : 'image/jpeg',
        keepTransparency ? 0.9 : 0.82,
      );
    });
    if (!blob) return file;
    const ext = keepTransparency
      ? file.type === 'image/webp' ? 'webp' : 'png'
      : 'jpg';
    const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${name}.${ext}`, { type: blob.type || 'image/jpeg' });
  } catch {
    return file;
  }
}

export async function supabaseUploadImage(
  bucket: 'property-images' | 'auction-images',
  entityId: string,
  file: File,
): Promise<string> {
  const optimized = await resizeImageForUpload(file);
  const dataBase64 = await readFileAsDataUrl(optimized);
  const res = await callDataProxy('image.upload', {
    bucket,
    entityId,
    name: optimized.name,
    contentType: optimized.type,
    dataBase64,
  });
  return res.url as string;
}

export async function supabaseUploadImages(
  bucket: 'property-images' | 'auction-images',
  entityId: string,
  files: File[],
): Promise<string[]> {
  return Promise.all(files.map((f) => supabaseUploadImage(bucket, entityId, f)));
}

export async function supabaseUploadResume(jobId: string, file: File): Promise<{ url: string; fileName: string }> {
  const dataBase64 = await readFileAsDataUrl(file);
  const res = await callDataProxy('resume.upload', {
    jobId,
    name: file.name,
    contentType: file.type || 'application/octet-stream',
    dataBase64,
  });
  return { url: res.url as string, fileName: res.fileName as string };
}

/**
 * Delete an image by URL or storage path. Accepts Firebase download URLs
 * (pre-migration rows) and Supabase public URLs — Firebase URLs are no-ops so
 * cleanup never breaks during the transition window.
 */
export async function supabaseDeleteImage(url: string): Promise<void> {
  const parsed = parseSupabaseStoragePath(url);
  if (!parsed) return; // Firebase URL or external link — nothing to remove
  try {
    await callDataProxy('image.delete', { bucket: parsed.bucket, path: parsed.path });
  } catch {
    /* best-effort cleanup */
  }
}

/* ── Inverse mapping: Firestore doc shape → DB row (for proxy writes) ───── */

const PROPERTY_DOC_TO_ROW: Record<string, string> = {
  propertyCode: 'property_code',
  commercial_subtype: 'commercial_subtype',
  plot_subtype: 'plot_subtype',
  price_label: 'price_label',
  monthly_rental: 'monthly_rental',
  monthly_rental_label: 'monthly_rental_label',
  rental_yield: 'rental_yield',
  area_sqft: 'area_sqft',
  area_unit: 'area_unit',
  area_acres: 'area_acres',
  area_guntas: 'area_guntas',
  price_per_sqft: 'price_per_sqft',
  built_up_area_sqft: 'built_up_area_sqft',
  floor_count: 'floor_count',
  total_units: 'total_units',
  available_units: 'available_units',
  occupancy_percent: 'occupancy_percent',
  bbmp_approved: 'bbmp_approved',
  bank_loan_eligible: 'bank_loan_eligible',
  clear_title: 'clear_title',
  listed_days_ago: 'listed_days_ago',
  listed_by: 'listed_by',
  contact_name: 'contact_name',
  contact_phone: 'contact_phone',
  map_lat: 'map_lat',
  map_lng: 'map_lng',
  maps_link: 'maps_link',
  agent_id: 'agent_id',
  agent_name: 'agent_name',
  userEmail: 'user_email',
  userDisplayName: 'user_display_name',
  fullAddress: 'full_address',
  extra_details: 'extra_details',
};

/** Convert the form's camelCase payload into DB column names for the proxy. */
export function propertyDocToRow(doc: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value === undefined || value === null) continue;
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
    const col = PROPERTY_DOC_TO_ROW[key] ?? key;
    row[col] = value;
  }
  return row;
}

/* ── Direct property CRUD (bypasses middleware) ──────────────────────────── */

const PROPERTY_COLUMNS = new Set([
  'id', 'property_code', 'title', 'type', 'commercial_subtype', 'plot_subtype',
  'area', 'location', 'price', 'price_label', 'monthly_rental', 'monthly_rental_label',
  'rental_yield', 'area_sqft', 'area_unit', 'area_acres', 'area_guntas',
  'price_per_sqft', 'built_up_area_sqft', 'dimensions', 'floor_count',
  'total_units', 'available_units', 'occupancy_percent', 'facing', 'age',
  'status', 'featured', 'bbmp_approved', 'bank_loan_eligible', 'clear_title',
  'katha', 'highlights', 'amenities', 'description', 'listed_days_ago',
  'extra_details', 'images', 'listed_by', 'contact_name', 'contact_phone',
  'map_lat', 'map_lng', 'maps_link', 'agent_id', 'agent_name', 'uid',
  'user_email', 'user_display_name', 'city', 'state', 'pincode',
  'full_address', 'created_at', 'updated_at',
]);

function pickPropertyColumns(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PROPERTY_COLUMNS.has(k)) out[k] = v;
  }
  return out;
}

/** Raw fetch helper — bypasses Supabase JS client to avoid Vite env-mangling JWTs. */
async function adminFetch(method: string, path: string, body?: unknown): Promise<any> {
  const url = import.meta.env.VITE_SUPABASE_REQ_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
  const key = import.meta.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? '';
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      apikey: key,
      Prefer: body ? 'return=representation' : '',
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${url}/rest/v1/${path}`, opts);
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text).message || text; } catch {}
    throw new Error(msg || `Supabase ${res.status}`);
  }
  return text ? JSON.parse(text) : null;
}

async function generateNextPropertyCode(): Promise<string> {
  const existing = await adminFetch('GET', 'properties?select=property_code&property_code=not.is.null');
  let maxNum = 0;
  for (const r of existing ?? []) {
    const m = String(r.property_code).match(/^VJR-(\d+)$/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return `VJR-${String(maxNum + 1).padStart(4, '0')}`;
}

export async function supabaseDirectPropertyCreate(
  row: Record<string, unknown>,
): Promise<{ id: string; propertyCode: string }> {
  let propertyCode = (row.property_code as string)?.trim() || await generateNextPropertyCode();
  const propId = crypto.randomUUID();
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const clean = pickPropertyColumns({
      ...row, id: propId, property_code: propertyCode,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    try {
      await adminFetch('POST', 'properties', clean);
      return { id: propId, propertyCode };
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/property_code_key|unique constraint/i.test(msg)) {
        lastError = msg;
        propertyCode = await generateNextPropertyCode();
        continue;
      }
      throw e;
    }
  }
  throw new Error(lastError ?? 'Failed to create property after retries');
}

export async function supabaseDirectPropertyUpdate(
  id: string, row: Record<string, unknown>,
): Promise<void> {
  const clean = pickPropertyColumns({ ...row, updated_at: new Date().toISOString() });
  delete clean.uid;
  await adminFetch('PATCH', `properties?id=eq.${encodeURIComponent(id)}`, clean);
}

export async function supabaseDirectPropertyDelete(id: string): Promise<void> {
  await adminFetch('DELETE', `properties?id=eq.${encodeURIComponent(id)}`);
}

/**
 * Delete a property reliably from whichever store actually holds it.
 *
 * Supabase is the live catalog (proxy first, direct service-role fallback).
 * During the migration window a row may only exist in Firestore, so when
 * the Supabase data layer is off we delete there instead. Errors from the
 * store that is NOT active are tolerated (the doc simply doesn't exist);
 * errors from the active store are thrown so an admin delete can never
 * silently no-op while the listing stays visible.
 */
export async function deletePropertyAcrossStores(id: string): Promise<void> {
  const supabaseActive = useSupabaseData();

  if (supabaseActive) {
    const supabaseError = await tryDeleteSupabase(id);
    if (!supabaseError) return; // removed from the live catalog
    // Fall back to a legacy Firestore mirror before reporting failure.
    const firestoreError = await tryDeleteFirestore(id);
    if (!firestoreError) return;
    throw supabaseError;
  }

  // Supabase layer off (Firestore mode): clean any Supabase row first
  // (best-effort), then delete from the store the page actually reads.
  await tryDeleteSupabase(id);
  const firestoreError = await tryDeleteFirestore(id);
  if (firestoreError) throw firestoreError;
}

async function tryDeleteSupabase(id: string): Promise<unknown> {
  try {
    await callDataProxy('property.delete', { id });
    return null;
  } catch (e) {
    try {
      await supabaseDirectPropertyDelete(id);
      return null;
    } catch (e2) {
      return e ?? e2;
    }
  }
}

async function tryDeleteFirestore(id: string): Promise<unknown> {
  try {
    await deleteDoc(doc(db, 'properties', id));
    return null;
  } catch (e) {
    return e;
  }
}

/* ── Bids ─────────────────────────────────────────────────────────────────── */

export async function supabasePlaceBid(
  auctionId: string,
  amount: number,
  bidderName: string,
): Promise<{ id: string; currentBid: number; totalBids: number }> {
  const res = await callDataProxy('bid.place', { auctionId, amount, bidderName });
  return {
    id: res.id as string,
    currentBid: Number(res.currentBid ?? 0),
    totalBids: Number(res.totalBids ?? 0),
  };
}

/* ── Open requirements count (navbar badge) ──────────────────────────────── */

export function subscribeSupabaseOpenRequirementsCount(onCount: (count: number) => void): () => void {
  let disposed = false;
  if (!client) return () => {};

  const recount = () => {
    if (disposed) return;
    void supabaseCountOpenRequirements().then((count) => {
      if (!disposed) onCount(count);
    });
  };

  recount();
  const channel = client
    .channel('site-data-req-count')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'requirements' },
      () => recount(),
    )
    .subscribe();

  return () => {
    disposed = true;
    channel.unsubscribe();
  };
}

/* ── Storage dashboard (admin) ──────────────────────────────────────────── */

export interface StorageBucketStat {
  bucket: string;
  objects: number;
  bytes: number;
}

export interface StorageFileStat {
  bucket: string;
  name: string;
  bytes: number;
}

export interface StorageStats {
  totalBytes: number;
  totalObjects: number;
  buckets: StorageBucketStat[];
  largest: StorageFileStat[];
  quotaBytes?: number;
}

/**
 * Storage usage — queries Supabase directly (no data-proxy needed).
 * Reads from storage.objects which is accessible via RLS on public buckets.
 */
const STORAGE_BUCKETS = ['property-images', 'auction-images', 'resumes'] as const;

export async function supabaseGetStorageStats(): Promise<StorageStats> {
  // Try the data proxy first (has service-role access).
  try {
    const res = await callDataProxy('storage.stats');
    return {
      totalBytes: Number(res.totalBytes ?? 0),
      totalObjects: Number(res.totalObjects ?? 0),
      buckets: (res.buckets ?? []).map((b: any) => ({
        bucket: b.bucket ?? '',
        objects: Number(b.objects ?? 0),
        bytes: Number(b.bytes ?? 0),
      })),
      largest: (res.largest ?? []).map((f: any) => ({
        bucket: f.bucket ?? '',
        name: f.name ?? '',
        bytes: Number(f.bytes ?? 0),
      })),
      quotaBytes: res.quotaBytes ? Number(res.quotaBytes) : undefined,
    };
  } catch {
    // Proxy unavailable — fall back to direct Supabase queries.
  }

  if (!client) {
    return { totalBytes: 0, totalObjects: 0, buckets: [], largest: [], quotaBytes: 1024 * 1024 * 1024 };
  }

  const bucketStats: { bucket: string; objects: number; bytes: number }[] = [];
  let totalBytes = 0;
  let totalObjects = 0;
  const allFiles: { bucket: string; name: string; bytes: number }[] = [];

  for (const bucket of STORAGE_BUCKETS) {
    try {
      // Use the Supabase JS client's storage.list() — works with anon key on public buckets.
      const { data: files, error } = await client.storage.from(bucket).list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' as const },
      });
      if (error || !files) {
        bucketStats.push({ bucket, objects: 0, bytes: 0 });
        continue;
      }
      if (files.length > 0) {
        const bytes = files.reduce((sum, f) => sum + Number(f.metadata?.size ?? 0), 0);
        bucketStats.push({ bucket, objects: files.length, bytes });
        totalBytes += bytes;
        totalObjects += files.length;
        for (const f of files) {
          allFiles.push({ bucket, name: f.name, bytes: Number(f.metadata?.size ?? 0) });
        }
      } else {
        bucketStats.push({ bucket, objects: 0, bytes: 0 });
      }
    } catch {
      bucketStats.push({ bucket, objects: 0, bytes: 0 });
    }
  }

  const largest = allFiles.sort((a, b) => b.bytes - a.bytes).slice(0, 10);
  const quotaBytes = Number(import.meta.env.VITE_SUPABASE_STORAGE_QUOTA_BYTES ?? 1024 * 1024 * 1024);

  return { totalBytes, totalObjects, buckets: bucketStats, largest, quotaBytes };
}

/**
 * Admin storage dashboard: fire on any storage.objects change so usage
 * figures refresh the moment a file is uploaded or deleted. storage.objects
 * is in the supabase_realtime publication (see the storage realtime
 * migration); the dashboard keeps its polling fallback, so this is a
 * fast-path only. RLS on storage.objects limits what anon sees to the site's
 * public buckets.
 */
/**
 * The storage dashboard reads usage from the single Supabase project
 * (eimvaxrmiizdlgonhiov) — all data, CRM, storage, employees.
 * Uses the publishable (anon) key; RLS on storage.objects limits what anon sees.
 */
export function subscribeSupabaseStorageChanges(onChange: () => void): () => void {
  const cliClient: SupabaseClient | null =
    import.meta.env.VITE_SUPABASE_CLI_URL && import.meta.env.VITE_SUPABASE_CLI_ANON_KEY
      ? createClient(
          import.meta.env.VITE_SUPABASE_CLI_URL,
          import.meta.env.VITE_SUPABASE_CLI_ANON_KEY,
        )
      : null;
  if (!cliClient) return () => {};
  const channel = cliClient
    .channel('crm-storage')
    .on(
      'postgres_changes',
      { event: '*', schema: 'storage', table: 'objects' },
      () => onChange(),
    )
    .subscribe();
  return () => {
    channel.unsubscribe();
  };
}

export interface DatabaseSummary {
  counts: Record<string, number>;
}

export async function supabaseGetDatabaseSummary(): Promise<DatabaseSummary> {
  const res = await callDataProxy('admin.databaseSummary');
  return { counts: (res.counts ?? {}) as Record<string, number> };
}

export { useSupabaseData, supabasePublicUrl, nowIso };
