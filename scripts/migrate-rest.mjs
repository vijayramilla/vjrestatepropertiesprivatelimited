#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VJR Estate — Firebase → Supabase migration via public REST access
 *
 * Reads Firestore through the public REST API (the app's firestore.rules allow
 * public reads on properties, requirements, settings, auctions, job_openings)
 * and Firebase Storage through the download URLs stored in the documents
 * (storage.rules allow public reads on properties/* and auctions/*).
 *
 * No Firebase service account is required — only the web API key, which is
 * public in the browser bundle.
 *
 * Database rows are upserted into Supabase with the service-role key; images
 * are downloaded from Firebase and uploaded to Supabase Storage with the
 * stored filename preserved, then the row's image URLs are rewritten.
 *
 * RE-RUN SAFE: rows upsert on the preserved ID; image uploads upsert on path,
 * so a second run only fills in what failed before.
 *
 * USAGE:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-rest.mjs
 *
 * ENV:
 *   SUPABASE_SERVICE_ROLE_KEY  (required)
 *   SUPABASE_URL               default https://eimvaxrmiizdlgonhiov.supabase.co
 *   FIREBASE_PROJECT_ID        default vjr-estate-df034
 *   FIREBASE_WEB_API_KEY       default the key from the app bundle
 *   FIREBASE_STORAGE_BUCKET    default vjr-estate-df034.firebasestorage.app
 *   FIREBASE_STORAGE_BASE      default https://firebasestorage.googleapis.com/v0/b/{bucket}/o
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createClient } from '@supabase/supabase-js';

const PROJECT = process.env.FIREBASE_PROJECT_ID ?? 'vjr-estate-df034';
const API_KEY = process.env.FIREBASE_WEB_API_KEY ?? '';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET ?? 'vjr-estate-df034.firebasestorage.app';
const STORAGE_BASE =
  process.env.FIREBASE_STORAGE_BASE ?? `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o`;
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Firestore REST ───────────────────────────────────────────────────────────

function convertValue(v) {
  if (v === null || v === undefined) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return parseFloat(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue; // RFC3339 → ISO, matches TIMESTAMPTZ
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(convertValue);
  if ('mapValue' in v) return convertFields(v.mapValue.fields ?? {});
  if ('referenceValue' in v) return v.referenceValue;
  if ('bytesValue' in v) return v.bytesValue;
  return null;
}

function convertFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = convertValue(v);
  return out;
}

async function listDocs(collectionPath) {
  const docs = [];
  let pageToken = '';
  for (;;) {
    const url =
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collectionPath}` +
      `?pageSize=300&key=${API_KEY}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore ${collectionPath}: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    for (const d of data.documents ?? []) {
      docs.push({ id: d.name.split('/').pop(), data: convertFields(d.fields ?? {}) });
    }
    pageToken = data.nextPageToken ?? '';
    if (!pageToken) break;
  }
  return docs;
}

async function getDoc(docPath) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${docPath}?key=${API_KEY}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore ${docPath}: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  return { id: d.name.split('/').pop(), data: convertFields(d.fields ?? {}) };
}

// ── Column maps (must match the SQL migration) ───────────────────────────────

const PROPERTY_COLUMNS = {
  propertyCode: 'property_code', commercial_subtype: 'commercial_subtype',
  plot_subtype: 'plot_subtype', price_label: 'price_label',
  monthly_rental: 'monthly_rental', monthly_rental_label: 'monthly_rental_label',
  rental_yield: 'rental_yield', area_sqft: 'area_sqft', area_unit: 'area_unit',
  area_acres: 'area_acres', area_guntas: 'area_guntas',
  price_per_sqft: 'price_per_sqft', built_up_area_sqft: 'built_up_area_sqft',
  floor_count: 'floor_count', total_units: 'total_units',
  available_units: 'available_units', occupancy_percent: 'occupancy_percent',
  bbmp_approved: 'bbmp_approved', bank_loan_eligible: 'bank_loan_eligible',
  clear_title: 'clear_title', listed_days_ago: 'listed_days_ago',
  listed_by: 'listed_by', contact_name: 'contact_name', contact_phone: 'contact_phone',
  map_lat: 'map_lat', map_lng: 'map_lng', maps_link: 'maps_link',
  agent_id: 'agent_id', agent_name: 'agent_name', userEmail: 'user_email',
  userDisplayName: 'user_display_name', fullAddress: 'full_address',
  extra_details: 'extra_details', images: 'images', title: 'title', type: 'type',
  area: 'area', location: 'location', price: 'price', dimensions: 'dimensions',
  facing: 'facing', age: 'age', status: 'status', featured: 'featured',
  katha: 'katha', highlights: 'highlights', amenities: 'amenities',
  description: 'description', uid: 'uid', user_email: 'user_email',
  user_display_name: 'user_display_name', full_address: 'full_address',
  city: 'city', state: 'state', pincode: 'pincode',
  createdAt: 'created_at', updatedAt: 'updated_at',
};

const REQUIREMENT_COLUMNS = {
  reqId: 'req_id', purpose: 'purpose', purposeOther: 'purpose_other',
  propertyType: 'property_type', propertyTypeOther: 'property_type_other',
  locations: 'locations', budgetMin: 'budget_min', budgetMax: 'budget_max',
  timeline: 'timeline', notes: 'notes', status: 'status',
  clickCount: 'click_count', postedAt: 'posted_at',
};

const AUCTION_COLUMNS = {
  title: 'title', category: 'category', location: 'location', city: 'city',
  images: 'images', description: 'description', startingBid: 'starting_bid',
  currentBid: 'current_bid', reservePrice: 'reserve_price',
  bidIncrement: 'bid_increment', totalBids: 'total_bids',
  auctionStartTime: 'auction_start_time', auctionEndTime: 'auction_end_time',
  status: 'status', areaSqft: 'area_sqft', propertyType: 'property_type',
  khata: 'khata', facing: 'facing', registeredBidders: 'registered_bidders',
  isFeatured: 'is_featured', map_lat: 'map_lat', map_lng: 'map_lng',
  maps_link: 'maps_link', createdAt: 'created_at',
};

const JOB_COLUMNS = {
  title: 'title', department: 'department', type: 'type', location: 'location',
  experience: 'experience', salary: 'salary', description: 'description',
  responsibilities: 'responsibilities', requirements: 'requirements',
  niceToHave: 'nice_to_have', isActive: 'is_active', isFeatured: 'is_featured',
  totalApplications: 'total_applications', department_color: 'department_color',
  postedAt: 'posted_at', closingDate: 'closing_date',
};

function mapDoc(data, columns) {
  const row = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const column = columns[key];
    if (!column) continue; // unknown fields are skipped (matching migrate-firestore.mjs)
    row[column] = value;
  }
  return row;
}

/** Firestore can store numbers as strings or floats; coerce to fit the DB types. */
function coerceNumbers(row, intCols, floatCols) {
  for (const col of intCols) {
    if (row[col] === undefined || row[col] === null) continue;
    row[col] = Math.round(Number(row[col]) || 0);
  }
  for (const col of floatCols) {
    if (row[col] === undefined || row[col] === null) continue;
    const n = Number(row[col]);
    row[col] = Number.isFinite(n) ? n : null;
  }
  return row;
}

const PROP_INT = ['floor_count', 'total_units', 'available_units', 'listed_days_ago'];
const PROP_FLOAT = ['price', 'monthly_rental', 'rental_yield', 'area_sqft', 'area_acres', 'area_guntas', 'price_per_sqft', 'built_up_area_sqft', 'occupancy_percent', 'map_lat', 'map_lng'];
const REQ_INT = ['click_count'];
const REQ_FLOAT = ['budget_min', 'budget_max'];
const AUCTION_INT = ['total_bids', 'registered_bidders'];
const AUCTION_FLOAT = ['starting_bid', 'current_bid', 'reserve_price', 'bid_increment', 'area_sqft', 'map_lat', 'map_lng'];
const JOB_INT = ['total_applications'];
const JOB_FLOAT = [];

/** Make every row carry the same keys (PostgREST sets absent keys to NULL when
 *  the columns list includes them from another row). */
function withDefaults(row, defaults) {
  for (const [k, v] of Object.entries(defaults)) {
    if (row[k] === undefined || row[k] === null) row[k] = v;
  }
  return row;
}

const PROPERTY_DEFAULTS = {
  title: '', type: '', area: '', location: '', price: 0, price_label: '',
  monthly_rental: 0, monthly_rental_label: '', rental_yield: null,
  dimensions: '', floor_count: 0, total_units: 0, available_units: 0,
  occupancy_percent: 0, facing: '', age: '', status: 'Ready', featured: false,
  bbmp_approved: false, bank_loan_eligible: false, clear_title: false,
  katha: '', highlights: [], amenities: [], description: '',
  listed_days_ago: 0, images: [], listed_by: 'VJR Estate',
  contact_name: '', contact_phone: '', agent_id: '', agent_name: '',
};

const REQUIREMENT_DEFAULTS = {
  req_id: '', purpose: '', property_type: '', timeline: '',
  locations: [], budget_min: 0, budget_max: 0, status: 'open', click_count: 0,
};

const AUCTION_DEFAULTS = {
  title: '', category: 'Residential', location: '', city: 'Bangalore',
  images: [], description: '', starting_bid: 0, current_bid: 0, reserve_price: 0,
  bid_increment: 100000, total_bids: 0, status: 'upcoming',
  registered_bidders: 0, is_featured: false,
};

const JOB_DEFAULTS = {
  title: '', department: '', type: 'Full Time', location: 'Bangalore',
  experience: '', salary: '', description: '', responsibilities: [],
  requirements: [], nice_to_have: [], is_active: true, is_featured: false,
  total_applications: 0, department_color: '',
};

async function upsertRows(table, rows) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`${table}: ${error.message}`);
    inserted += chunk.length;
  }
  return inserted;
}

// ── Storage helpers ──────────────────────────────────────────────────────────

/** Extract the object path from a firebasestorage.googleapis.com URL. */
function firebasePathFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== 'firebasestorage.googleapis.com') return null;
    const m = u.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

/** Keep {entityId}/{filename} from the Firebase object path. */
function lastTwoSegments(path) {
  const parts = path.split('/').filter(Boolean);
  const tail = parts.slice(-2);
  return tail.length === 2 ? tail.join('/') : null;
}

async function downloadFirebaseObject(path) {
  const encoded = encodeURIComponent(path);
  const tokenUrl = `${STORAGE_BASE}/${encoded}?alt=media`;
  // Rules allow public read; try the plain URL first, then the token variant.
  const attempts = [tokenUrl];
  const match = tokenUrl.match(/&token=([^&]+)/);
  if (match) {
    attempts.unshift(tokenUrl.replace(`&token=${match[1]}`, ''));
  }
  for (const url of attempts) {
    const res = await fetch(url);
    if (!res.ok) continue;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) continue;
    return { buffer, contentType: res.headers.get('content-type') ?? 'application/octet-stream' };
  }
  const last = await fetch(attempts[attempts.length - 1]);
  throw new Error(`download failed HTTP ${last.status}`);
}

/** Upload one image to Supabase; returns the new public URL. */
async function migrateImage(bucket, entityId, firebaseUrl) {
  const path = firebasePathFromUrl(firebaseUrl);
  if (!path) return { url: firebaseUrl, moved: false }; // not a Firebase URL — keep as-is
  const key = lastTwoSegments(path);
  if (!key) return { url: firebaseUrl, moved: false };
  const { buffer, contentType } = await downloadFirebaseObject(path);
  const { error } = await supabase.storage.from(bucket).upload(key, buffer, {
    contentType,
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return { url: data.publicUrl, moved: true };
}

/** Rewrite a row's image URLs; returns { row, moved, failed }. */
async function migrateImagesForRow(table, bucket, entityId, urls) {
  if (!Array.isArray(urls) || urls.length === 0) return { moved: 0, failed: 0 };
  const next = [];
  let moved = 0;
  let failed = 0;
  for (const url of urls) {
    try {
      const r = await migrateImage(bucket, entityId, url);
      next.push(r.url);
      if (r.moved) moved += 1;
    } catch (e) {
      failed += 1;
      next.push(url); // keep the original (Firebase) URL until billing is fixed
      console.log(`    ⚠ ${entityId}: ${e.message} — will retry on next run`);
    }
  }
  if (moved > 0 || failed > 0) {
    const { error } = await supabase.from(table).update({ images: next }).eq('id', entityId);
    if (error) throw new Error(`${table} ${entityId}: ${error.message}`);
  }
  return { moved, failed };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Migrating Firebase (${PROJECT}) → Supabase (${SUPABASE_URL})…\n`);

  // 1) Properties (+ images)
  const props = await listDocs('properties');
  console.log(`properties: ${props.length} document(s) read from Firestore.`);
  const now = new Date().toISOString();
  let propRows = props.map((d) => {
    const row = withDefaults(coerceNumbers({ id: d.id, ...mapDoc(d.data, PROPERTY_COLUMNS) }, PROP_INT, PROP_FLOAT), PROPERTY_DEFAULTS);
    if (!row.created_at) row.created_at = now; // NOT NULL columns need explicit values
    if (!row.updated_at) row.updated_at = now;
    return row;
  });
  propRows = propRows.filter((r) => r.id !== '_config_'); // settings doc, handled below
  const propCount = await upsertRows('properties', propRows);
  console.log(`  ✔ ${propCount} properties upserted to Supabase.`);

  let imgMoved = 0;
  let imgFailed = 0;
  for (const row of propRows) {
    if (!Array.isArray(row.images) || row.images.length === 0) continue;
    const r = await migrateImagesForRow('properties', 'property-images', row.id, row.images);
    imgMoved += r.moved;
    imgFailed += r.failed;
  }
  console.log(`  images: ${imgMoved} copied, ${imgFailed} pending (Firebase Storage blocked → retry after billing fix).\n`);

  // 2) Requirements (public fields only)
  const reqs = await listDocs('requirements');
  const reqRows = reqs.map((d) => {
    const row = withDefaults(coerceNumbers({ id: d.id, ...mapDoc(d.data, REQUIREMENT_COLUMNS) }, REQ_INT, REQ_FLOAT), REQUIREMENT_DEFAULTS);
    if (!row.req_id) row.req_id = d.id; // Firestore docs without reqId → use doc id
    if (!row.posted_at) row.posted_at = now;
    return row;
  });
  const reqCount = await upsertRows('requirements', reqRows);
  console.log(`requirements: ✔ ${reqCount} upserted.\n`);

  // 3) Settings (settings/general + properties/_config_ merged)
  const settingsDoc = await getDoc('settings/general');
  const configDoc = await getDoc('properties/_config_');
  const merged = { key: 'general' };
  for (const doc of [settingsDoc, configDoc]) {
    if (!doc) continue;
    if (typeof doc.data.mapOnly === 'boolean') merged.map_only = doc.data.mapOnly;
    if (typeof doc.data.nexaEnabled === 'boolean') merged.nexa_enabled = doc.data.nexaEnabled;
  }
  merged.updated_at = new Date().toISOString();
  const { error: settingsError } = await supabase
    .from('site_settings')
    .upsert(merged, { onConflict: 'key' });
  if (settingsError) throw new Error(`site_settings: ${settingsError.message}`);
  console.log('site_settings: ✔ 1 row (merged settings/general + properties/_config_).\n');

  // 4) Auctions (+ images)
  const auctions = await listDocs('auctions');
  const auctionRows = auctions.map((d) => {
    const row = withDefaults(coerceNumbers({ id: d.id, ...mapDoc(d.data, AUCTION_COLUMNS) }, AUCTION_INT, AUCTION_FLOAT), AUCTION_DEFAULTS);
    if (!row.created_at) row.created_at = now;
    return row;
  });
  const auctionCount = await upsertRows('auctions', auctionRows);
  console.log(`auctions: ✔ ${auctionCount} upserted.`);
  let aucMoved = 0;
  let aucFailed = 0;
  for (const row of auctionRows) {
    if (!Array.isArray(row.images) || row.images.length === 0) continue;
    const r = await migrateImagesForRow('auctions', 'auction-images', row.id, row.images);
    aucMoved += r.moved;
    aucFailed += r.failed;
  }
  console.log(`  auction images: ${aucMoved} copied, ${aucFailed} pending.\n`);

  // 5) Job openings
  const jobs = await listDocs('job_openings');
  const jobRows = jobs.map((d) => {
    const row = withDefaults(coerceNumbers({ id: d.id, ...mapDoc(d.data, JOB_COLUMNS) }, JOB_INT, JOB_FLOAT), JOB_DEFAULTS);
    if (!row.posted_at) row.posted_at = now;
    return row;
  });
  const jobCount = await upsertRows('job_openings', jobRows);
  console.log(`job_openings: ✔ ${jobCount} upserted.\n`);

  console.log('── Summary ─────────────────────────────────────────────');
  console.log(`  properties:      ${propCount}`);
  console.log(`  requirements:    ${reqCount}`);
  console.log(`  site_settings:   1`);
  console.log(`  auctions:        ${auctionCount}`);
  console.log(`  job_openings:    ${jobCount}`);
  console.log(`  images copied:   ${imgMoved + aucMoved}`);
  console.log(`  images pending:  ${imgFailed + aucFailed}`);
  if (imgFailed + aucFailed > 0) {
    console.log('\nFirebase Storage is blocked (Google Cloud billing delinquent). Fix billing, then re-run this script — only the pending images will be copied.');
  }
}

main();
