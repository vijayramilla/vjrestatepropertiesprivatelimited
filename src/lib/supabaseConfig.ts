import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared Supabase configuration for the site-data migration.
 *
 * The whole site-data layer is gated behind VITE_USE_SUPABASE_DATA=1.
 * While the flag is OFF (default) the app uses Firebase exactly as before —
 * this file is inert. Flip the flag only after the migration scripts have
 * copied Firestore + Storage into Supabase (see README "Supabase migration").
 */

export const SUPABASE_DATA_ENABLED =
  import.meta.env.VITE_USE_SUPABASE_DATA === '1';

/** Default to the project chosen for this migration (env can override). */
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://eimvaxrmiizdlgonhiov.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabaseDataUrl = supabaseUrl;

/**
 * True when the value is empty or an unconfigured template placeholder such
 * as "YOUR_SUPABASE_ANON_KEY". These can slip in when example env files are
 * copied verbatim into a host (e.g. Vercel) — a real Supabase key always
 * starts with "eyJ". Treating them as missing keeps the app from
 * constructing a Supabase client that fails every read with HTTP 401 (empty
 * property feed, empty admin lists, saved listings appearing "missing").
 */
function isUnconfiguredKey(value: string): boolean {
  const v = value.trim();
  return v === '' || !v.startsWith('eyJ');
}

const dataLayerUsable =
  SUPABASE_DATA_ENABLED &&
  Boolean(supabaseUrl.trim()) &&
  !isUnconfiguredKey(supabaseAnonKey);

if (SUPABASE_DATA_ENABLED && !dataLayerUsable) {
  console.error(
    '[supabase] VITE_USE_SUPABASE_DATA=1 but the Supabase credentials are missing or ' +
      'still placeholders (VITE_SUPABASE_ANON_KEY must be the real anon key, starting ' +
      'with "eyJ"). Every browser-side read (property feed, admin lists, map) will ' +
      'fail with 401 until the real key is configured and the app is rebuilt. ' +
      'Falling back to the Firebase data path for now.',
  );
}

export const supabaseData: SupabaseClient | null = dataLayerUsable
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Whether the app should use the Supabase data layer for site data.
 * False when the flag is off OR the anon key is missing/placeholder — the
 * existing Firebase paths then stay in use (they are the fallback that keeps
 * the site functional instead of showing empty pages).
 */
export function useSupabaseData(): boolean {
  return dataLayerUsable;
}

/** Base URL for the Vercel serverless write proxy (same host as crm-proxy). */
const configuredApiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const DATA_PROXY_URL = configuredApiUrl
  ? `${configuredApiUrl}/data-proxy`
  : '/api/data-proxy';

/** Public URL for an object in a public Supabase storage bucket. */
export function supabasePublicUrl(bucket: string, path: string): string {
  const cleanPath = path.replace(/^\//, '');
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

/**
 * Extract the `{bucket}/{path}` from a Supabase public storage URL so callers
 * can delete by URL (same API shape as Firebase's getDownloadURL flow).
 */
export function parseSupabaseStoragePath(url: string): {
  bucket: string;
  path: string;
} | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(
      /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/,
    );
    if (!match) return null;
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

/**
 * Convert a Supabase TIMESTAMPTZ value into the `{ toDate() }` shape that
 * Firestore Timestamps exposed, so existing mapping code
 * (mapFirestoreToProperty, sortDocsByNewest, formatRequirementPostedAt, …)
 * keeps working unchanged.
 */
export function tsFacade(value: string | null | undefined): { toDate: () => Date } | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return { toDate: () => date };
}

/** Human-friendly ISO string helper used by write paths. */
export function nowIso(): string {
  return new Date().toISOString();
}
