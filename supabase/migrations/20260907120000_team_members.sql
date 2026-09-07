-- ============================================================================
-- VJR Estate — Team page (editable from the admin panel)
--
-- team_members mirrors a Firestore `team_members` collection 1:1 (TEXT PK so
-- doc ids survive a future migration). Public SELECT so the /team page reads
-- directly; writes flow through the data proxy (service-role, admin-gated).
--
-- team-photos is a public-read storage bucket for member photos, written only
-- through the proxy's image.upload action (admin-only for this bucket).
-- Run in the Supabase SQL editor for project: eimvaxrmiizdlgonhiov
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_members (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  title       TEXT NOT NULL DEFAULT '',
  photo_url   TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_sort ON public.team_members (sort_order);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_public_read" ON public.team_members;
CREATE POLICY "team_members_public_read" ON public.team_members
  FOR SELECT USING (true);
-- Writes are only allowed via the service-role proxy (no anon policy).

INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Extend the public-read storage policy to cover team photos (the existing
-- policy lists buckets explicitly, so it must be replaced, not just OR'd).
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('property-images', 'auction-images', 'resumes', 'team-photos')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
