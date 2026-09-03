# VJR Estate

Premium rental income property website for Bangalore — listings, locality search, admin panel, and lead capture.

## Stack

- React + Vite + TypeScript
- Firebase Authentication (Google Sign-In — stays the auth layer)
- Supabase (PostgreSQL database + Storage — properties and site data)
- Tailwind CSS

## Setup

```bash
npm install
cp .env.example .env
# Fill VITE_FIREBASE_* values in .env
npm run dev
```

## Build

```bash
npm run build
```

## Environment

Copy `.env.example` to `.env` and set all `VITE_FIREBASE_*` variables. Never commit `.env`.

---

# Supabase site-data migration

The site previously kept properties, requirements, leads, users, settings, jobs, and auctions in Firestore and their images in Firebase Storage. These now live in Supabase (project `eimvaxrmiizdlgonhiov`), while **Firebase Authentication and Google Sign-In are untouched** and remain the identity layer.

```
Google Sign-In → Firebase Auth → Website → Supabase Database
                                          → Supabase Storage (property images)
```

## Architecture

Public reads (properties, requirements, settings, jobs, auctions) go straight from the browser with the Supabase anon key + public RLS policies, mirroring the old Firestore public-read rules. PII tables (`users`, `job_applications`, `property_leads`) have no public RLS read at all — those reads go through `/api/data-proxy` actions (`user.list`, `application.list`, `lead.list`), which verify the Firebase ID token server-side and scope results to admins/owners. All writes — property CRUD, image upload/delete, leads, bids, job applications — also flow through `/api/data-proxy`, which writes with the service-role key. **The service-role key never ships to the browser.**

The whole switchover is gated behind `VITE_USE_SUPABASE_DATA=1`. While it is `0` (default) the app uses Firebase exactly as before. Flipping it to `1` switches the app to Supabase, and flipping back to `0` rolls back instantly — nothing in Firebase is deleted at any point.

## What migrates

| Firestore collection | Supabase table |
| --- | --- |
| `properties` | `properties` |
| `requirements` + `requirement_private` | `requirements` + `requirement_private` |
| `property_leads` | `property_leads` |
| `users` | `users` |
| `settings/general`, `properties/_config_` | `site_settings` |
| `job_openings` | `job_openings` |
| `job_applications` | `job_applications` |
| `auctions`, `auction_bids` | `auctions`, `auction_bids` |
| Storage: `properties/*`, `auctions/*`, `resumes/*` | `property-images`, `auction-images`, `resumes` buckets |

Firestore document IDs are preserved 1:1 as TEXT primary keys, so no reference anywhere in the app needs remapping. Firestore Timestamps migrate to ISO-8601 strings in `TIMESTAMPTZ` columns and the read layer wraps them in a `{ toDate() }` facade so existing components keep working unchanged.

## Cutover steps (do this once, in order)

1. **Create the schema.** Open the Supabase SQL editor for `eimvaxrmiizdlgonhiov` and run the contents of `supabase/migrations/20260811000000_site_data_migration.sql`. This creates all tables, RLS policies, indexes, storage buckets, and the `place_bid` / `increment_requirement_click` / `increment_job_applications` RPCs.

2. **Set environment variables.**
   - Browser (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (leave `VITE_USE_SUPABASE_DATA=0`).
   - Vercel (project settings): `VITE_SUPABASE_REQ_URL`, `VITE_SUPABASE_REQ_SERVICE_KEY`, `VITE_ADMIN_UID` (and `VITE_FIREBASE_API_KEY` if your project's key differs from the default). Redeploy.

   The admin Storage dashboard reads usage from the org's real project (`qrlkicsxnhaplwkotnyd` — the same one that hosts employees and CRM clients) via the data proxy, so it also needs `VITE_SUPABASE_CLI_URL` and `VITE_SUPABASE_CLI_SERVICE_KEY` (service-role key of that project) in both `.env` and Vercel. Its `get_storage_stats` RPC, the `property-images` / `auction-images` / `resumes` buckets, and the `storage.objects` realtime publication are set up by the same migration SQL.

3. **Migrate the database.** Run locally with the Firebase service-account key and the Supabase service-role key:
   ```bash
   FIREBASE_SERVICE_ACCOUNT=/path/to/firebase-sa.json \
   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-firestore.mjs
   ```
   Optional: `--only properties` migrates a single collection. Re-running is safe (upserts on the preserved ID).

4. **Migrate storage.** Copy all Firebase Storage files into Supabase and rewrite the stored URLs:
   ```bash
   FIREBASE_SERVICE_ACCOUNT=/path/to/firebase-sa.json \
   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-storage.mjs
   ```
   Run with `--dry-run` first to preview the plan. This updates `properties.images`, `auctions.images`, and `job_applications.resume_url` to Supabase public URLs and reports counts you can cross-check against the 67 files / ~91 MB in Firebase.

5. **Verify** (both sources remain live):
   - Supabase row counts match Firestore counts per collection (script prints them).
   - Supabase storage file count/size matches Firebase.
   - Spot-check property detail pages, the listings feed, the map, the admin panel, jobs, auctions, and the requirements board.
   - Confirm Google Sign-In still works and admins can log in.

6. **Flip the flag.** Set `VITE_USE_SUPABASE_DATA=1` in `.env` (and Vercel), rebuild, deploy. The site now reads/writes Supabase while Firebase Auth keeps working.

7. **Rollback** at any time: set `VITE_USE_SUPABASE_DATA=0` and redeploy. Firebase still holds all data untouched, so the site returns to its previous behaviour immediately.

## Security notes

- No service-role key in frontend code — only the anon key, and only for genuinely public tables.
- RLS mirrors `firestore.rules`: public SELECT only on public tables; **no anonymous read or write on `users`, `job_applications`, or `property_leads`** (PII) — those are proxy-only.
- The proxy enforces the same guards Firestore rules did: admin-only for admin actions, owner-scoped for user listings/uploads/leads, verified Firebase token on every request.
- Image uploads are validated server-side (type, ≤ 3 MB for images, ≤ 5 MB for resumes — kept under Vercel's 4.5 MB request-body limit) and downscaled client-side before upload.
- The `place_bid` RPC is `SECURITY DEFINER`, runs under `FOR UPDATE` row locking, and is only executable by the service role.

## Remaining Firebase dependencies

Firebase Authentication, Google Analytics, Cloud Functions (`resolveMapUrl`, job-application counter), and the `ar_media` collection (demo content with a local mock fallback) stay on Firebase. Nothing on Firebase is deleted during this migration; a final cleanup pass can be planned after cutover is verified.
