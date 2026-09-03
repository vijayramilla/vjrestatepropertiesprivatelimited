#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VJR Estate — Firestore → Supabase database migration (Phase 4)
 *
 * Copies every site-data collection from Firestore into the Supabase tables
 * created by supabase/migrations/20260811000000_site_data_migration.sql.
 * Firestore document IDs are preserved 1:1 (each table uses a TEXT primary
 * key), so no reference anywhere in the app needs remapping.
 *
 * READ-ONLY on the source: Firestore is never written or deleted. Supabase
 * rows are upserted on the preserved ID, so re-running is safe and idempotent.
 *
 * USAGE:
 *   node scripts/migrate-firestore.mjs            # migrate everything
 *   node scripts/migrate-firestore.mjs --only properties
 *
 * ENV:
 *   FIREBASE_SERVICE_ACCOUNT   path to (or inline JSON of) the Firebase
 *                              service-account key. Falls back to
 *                              GOOGLE_APPLICATION_CREDENTIALS / ADC.
 *   SUPABASE_URL               default https://eimvaxrmiizdlgonhiov.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  (or SUPABASE_SERVICE_KEY) the service-role key —
 *                              NEVER put this in frontend code or env files.
 *
 * NOTE: `properties.images`, `auctions.images` and `job_applications.resume_url`
 * are copied as-is (they still point at Firebase Storage). Run
 * scripts/migrate-storage.mjs afterwards to move the files and rewrite URLs.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync, existsSync } from 'node:fs';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

// ── Configuration ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).');
  process.exit(1);
}

let adminApp;
const account = process.env.FIREBASE_SERVICE_ACCOUNT;
if (account) {
  const raw = account.trim().startsWith('{')
    ? account
    : existsSync(account)
      ? readFileSync(account, 'utf8')
      : null;
  if (!raw) {
    console.error(`FIREBASE_SERVICE_ACCOUNT set but not found: ${account}`);
    process.exit(1);
  }
  adminApp = initializeApp({ credential: cert(JSON.parse(raw)) });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  adminApp = initializeApp({ credential: applicationDefault() });
} else {
  console.error(
    'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT (path or JSON) or GOOGLE_APPLICATION_CREDENTIALS.',
  );
  process.exit(1);
}

const firestore = getFirestore(adminApp);
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Field maps: Firestore doc key → Supabase column ─────────────────────────
// Any doc field not listed here is skipped (and counted) — safer than writing
// an unknown column. Column names must match the SQL migration exactly.

const PROPERTY_COLUMNS = {
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
  images: 'images',
  title: 'title',
  type: 'type',
  area: 'area',
  location: 'location',
  price: 'price',
  dimensions: 'dimensions',
  facing: 'facing',
  age: 'age',
  status: 'status',
  featured: 'featured',
  katha: 'katha',
  highlights: 'highlights',
  amenities: 'amenities',
  description: 'description',
  uid: 'uid',
  user_email: 'user_email',
  user_display_name: 'user_display_name',
  full_address: 'full_address',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const REQUIREMENT_COLUMNS = {
  reqId: 'req_id',
  purpose: 'purpose',
  purposeOther: 'purpose_other',
  propertyType: 'property_type',
  propertyTypeOther: 'property_type_other',
  locations: 'locations',
  budgetMin: 'budget_min',
  budgetMax: 'budget_max',
  timeline: 'timeline',
  notes: 'notes',
  status: 'status',
  clickCount: 'click_count',
  postedAt: 'posted_at',
};

const PRIVATE_COLUMNS = {
  paymentMode: 'payment_mode',
  buyerName: 'buyer_name',
  buyerPhone: 'buyer_phone',
};

const LEAD_COLUMNS = {
  propertyId: 'property_id',
  propertyTitle: 'property_title',
  propertyType: 'property_type',
  propertyArea: 'property_area',
  propertyPrice: 'property_price',
  propertyMonthlyRental: 'property_monthly_rental',
  propertyUrl: 'property_url',
  leadType: 'lead_type',
  visitDate: 'visit_date',
  visitTime: 'visit_time',
  buyerName: 'buyer_name',
  buyerPhone: 'buyer_phone',
  buyerLat: 'buyer_lat',
  buyerLng: 'buyer_lng',
  message: 'message',
  source: 'source',
  ownerUid: 'owner_uid',
  listedBy: 'listed_by',
  ipAddress: 'ip_address',
  status: 'status',
  createdAt: 'created_at',
};

const USER_COLUMNS = {
  uid: 'uid',
  email: 'email',
  displayName: 'display_name',
  photoURL: 'photo_url',
  loginCount: 'login_count',
  lastLogin: 'last_login',
  lastSeen: 'last_seen',
  createdAt: 'created_at',
  suspended: 'suspended',
  location: 'location',
  gpsLocation: 'gps_location',
  ipLocation: 'ip_location',
  loginHistory: 'login_history',
};

const JOB_COLUMNS = {
  title: 'title',
  department: 'department',
  type: 'type',
  location: 'location',
  experience: 'experience',
  salary: 'salary',
  description: 'description',
  responsibilities: 'responsibilities',
  requirements: 'requirements',
  niceToHave: 'nice_to_have',
  isActive: 'is_active',
  isFeatured: 'is_featured',
  totalApplications: 'total_applications',
  department_color: 'department_color',
  postedAt: 'posted_at',
  closingDate: 'closing_date',
};

const APPLICATION_COLUMNS = {
  jobId: 'job_id',
  jobTitle: 'job_title',
  department: 'department',
  fullName: 'full_name',
  email: 'email',
  phone: 'phone',
  currentLocation: 'current_location',
  currentCompany: 'current_company',
  currentRole: 'current_role',
  totalExperience: 'total_experience',
  expectedSalary: 'expected_salary',
  noticePeriod: 'notice_period',
  linkedinUrl: 'linkedin_url',
  resumeUrl: 'resume_url',
  resumeFileName: 'resume_file_name',
  coverLetter: 'cover_letter',
  whyVJR: 'why_vjr',
  status: 'status',
  statusHistory: 'status_history',
  adminNotes: 'admin_notes',
  rating: 'rating',
  tags: 'tags',
  isShortlisted: 'is_shortlisted',
  viewedByAdmin: 'viewed_by_admin',
  referenceId: 'reference_id',
  applicantUid: 'applicant_uid',
  applicantEmail: 'applicant_email',
  pinCode: 'pin_code',
  applicantLat: 'applicant_lat',
  applicantLng: 'applicant_lng',
  applicantArea: 'applicant_area',
  appliedAt: 'applied_at',
  updatedAt: 'updated_at',
};

const AUCTION_COLUMNS = {
  title: 'title',
  category: 'category',
  location: 'location',
  city: 'city',
  images: 'images',
  description: 'description',
  startingBid: 'starting_bid',
  currentBid: 'current_bid',
  reservePrice: 'reserve_price',
  bidIncrement: 'bid_increment',
  totalBids: 'total_bids',
  auctionStartTime: 'auction_start_time',
  auctionEndTime: 'auction_end_time',
  status: 'status',
  areaSqft: 'area_sqft',
  propertyType: 'property_type',
  khata: 'khata',
  facing: 'facing',
  registeredBidders: 'registered_bidders',
  isFeatured: 'is_featured',
  map_lat: 'map_lat',
  map_lng: 'map_lng',
  maps_link: 'maps_link',
  createdAt: 'created_at',
};

const BID_COLUMNS = {
  auctionId: 'auction_id',
  bidderId: 'bidder_id',
  bidderName: 'bidder_name',
  amount: 'amount',
  isWinning: 'is_winning',
  createdAt: 'created_at',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert Firestore Timestamps / JS Dates to ISO strings, recursively. */
function normalize(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function' && value.seconds !== undefined) {
      const d = value.toDate();
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    if (Array.isArray(value)) {
      return depth < 12 ? value.map((v) => normalize(v, depth + 1)) : value;
    }
    if (depth < 12) {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        const nv = normalize(v, depth + 1);
        if (nv !== undefined) out[k] = nv;
      }
      return out;
    }
  }
  return value;
}

/** Map a Firestore doc through a column map, skipping unknown fields. */
function mapDoc(data, columns, onSkipped) {
  const row = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const column = columns[key];
    if (!column) {
      onSkipped(key);
      continue;
    }
    row[column] = normalize(value);
  }
  return row;
}

/** Read a whole Firestore collection in pages (safe for any size). */
async function getAllDocs(collectionName) {
  const docs = [];
  let last = null;
  for (;;) {
    let q = firestore.collection(collectionName).orderBy('__name__').limit(500);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) docs.push(d);
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 500) break;
  }
  return docs;
}

/** Upsert rows into a table, splitting into chunks under the URL-size limit. */
async function upsertRows(table, rows, onConflict = 'id') {
  if (rows.length === 0) return 0;
  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    inserted += chunk.length;
  }
  return inserted;
}

// ── Migrations ───────────────────────────────────────────────────────────────

const skippedCounts = {};

function skippedTracker(table) {
  return (key) => {
    skippedCounts[table] = skippedCounts[table] ?? {};
    skippedCounts[table][key] = (skippedCounts[table][key] ?? 0) + 1;
  };
}

async function migrateCollection(
  table,
  collectionName,
  columns,
  options = {},
) {
  const docs = await getAllDocs(collectionName);
  const skipped = skippedTracker(`${table} (${collectionName})`);
  const rows = docs.map((d) => ({ id: d.id, ...mapDoc(d.data(), columns, skipped) }));
  const count = await upsertRows(table, rows);
  console.log(`  ${collectionName.padEnd(18)} → ${table.padEnd(20)} ${count} rows`);
  return count;
}

async function migrateProperties() {
  const docs = await getAllDocs('properties');
  const skipped = skippedTracker('properties');
  const rows = docs.map((d) => ({ id: d.id, ...mapDoc(d.data(), PROPERTY_COLUMNS, skipped) }));
  const count = await upsertRows('properties', rows);
  console.log(`  ${'properties'.padEnd(18)} → ${'properties'.padEnd(20)} ${count} rows`);
  return count;
}

async function migrateRequirements() {
  const docs = await getAllDocs('requirements');
  const skipped = skippedTracker('requirements');
  const rows = docs.map((d) => {
    const data = d.data();
    const row = { id: d.id, ...mapDoc(data, REQUIREMENT_COLUMNS, skipped) };
    // Backfill status/clickCount with the defaults the app relied on.
    if (row.status === undefined) row.status = 'open';
    if (row.click_count === undefined) row.click_count = 0;
    return row;
  });
  const publicCount = await upsertRows('requirements', rows);

  // Split private buyer fields into requirement_private (mirrors Firestore).
  const privateRows = [];
  for (const d of docs) {
    const data = d.data();
    const p = mapDoc(data, PRIVATE_COLUMNS, () => {});
    if (Object.keys(p).length > 0) privateRows.push({ id: d.id, ...p });
  }
  const privateCount = await upsertRows('requirement_private', privateRows);

  console.log(`  ${'requirements'.padEnd(18)} → ${'requirements'.padEnd(20)} ${publicCount} rows`);
  console.log(`  ${'requirement_private'.padEnd(18)} → ${'requirement_private'.padEnd(20)} ${privateCount} rows`);
  return publicCount;
}

async function migrateSettings() {
  // The app reads settings/general and properties/_config_ and merges them.
  const paths = ['settings/general', 'properties/_config_'];
  const merged = {};
  for (const path of paths) {
    const snap = await firestore.doc(path).get();
    if (!snap.exists) continue;
    const data = snap.data() ?? {};
    if (typeof data.mapOnly === 'boolean') merged.map_only = data.mapOnly;
    if (typeof data.nexaEnabled === 'boolean') merged.nexa_enabled = data.nexaEnabled;
  }
  const row = { key: 'general', ...merged, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('site_settings').upsert(row, { onConflict: 'key' });
  if (error) throw new Error(`site_settings: ${error.message}`);
  console.log(`  ${'settings/*'.padEnd(18)} → ${'site_settings'.padEnd(20)} 1 row (merged ${paths.join(', ')})`);
  return 1;
}

const MIGRATIONS = {
  properties: migrateProperties,
  requirements: migrateRequirements,
  settings: migrateSettings,
};

function collectionMigration(table, collectionName, columns) {
  return () => migrateCollection(table, collectionName, columns);
}

MIGRATIONS.property_leads = collectionMigration(
  'property_leads', 'property_leads', LEAD_COLUMNS,
);
MIGRATIONS.users = collectionMigration('users', 'users', USER_COLUMNS);
MIGRATIONS.jobs = collectionMigration('job_openings', 'job_openings', JOB_COLUMNS);
MIGRATIONS.applications = collectionMigration(
  'job_applications', 'job_applications', APPLICATION_COLUMNS,
);
MIGRATIONS.auctions = collectionMigration('auctions', 'auctions', AUCTION_COLUMNS);
MIGRATIONS.bids = collectionMigration('auction_bids', 'auction_bids', BID_COLUMNS);

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1] : null;

  const requested = only ? [only] : Object.keys(MIGRATIONS);
  const unknown = requested.filter((r) => !MIGRATIONS[r]);
  if (unknown.length > 0) {
    console.error(`Unknown collection(s): ${unknown.join(', ')}`);
    console.error(`Available: ${Object.keys(MIGRATIONS).join(', ')}`);
    process.exit(1);
  }

  console.log('Migrating Firestore → Supabase database…');
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log('');

  const totals = {};
  for (const name of requested) {
    try {
      totals[name] = await MIGRATIONS[name]();
    } catch (e) {
      console.error(`\n✖ Failed migrating ${name}: ${e.message}`);
      process.exitCode = 1;
    }
  }

  console.log('');
  console.log('── Summary ─────────────────────────────────────────────');
  for (const [name, count] of Object.entries(totals)) {
    console.log(`  ${name.padEnd(16)} ${count} rows`);
  }
  const skippedTables = Object.entries(skippedCounts).filter(
    ([, keys]) => Object.keys(keys).length > 0,
  );
  if (skippedTables.length > 0) {
    console.log('');
    console.log('  Fields skipped (no matching column — safe to ignore):');
    for (const [table, keys] of skippedTables) {
      console.log(`    ${table}: ${Object.entries(keys).map(([k, n]) => `${k}×${n}`).join(', ')}`);
    }
  }
  console.log('');
  console.log('Next: run `node scripts/migrate-storage.mjs` to move files and rewrite image URLs.');
}

main();
