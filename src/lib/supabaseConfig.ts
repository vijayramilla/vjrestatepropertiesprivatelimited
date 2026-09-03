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

export const supabaseData: SupabaseClient | null =
  SUPABASE_DATA_ENABLED && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Admin Supabase client (service-role key) for property CRUD.
 * Used when the data-proxy middleware is unavailable (dev / direct mode).
 * SECURITY: This key bypasses RLS — only use for admin operations.
 */
export function useSupabaseData(): boolean {
  return SUPABASE_DATA_ENABLED && supabaseData !== null;
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
