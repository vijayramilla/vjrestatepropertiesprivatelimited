-- ============================================================================
-- VJR Estate — publish storage.objects to Realtime
--
-- The admin Storage dashboard shows live usage (total bytes / files / per
-- bucket) from the get_storage_stats RPC, which aggregates storage.objects.
-- Adding storage.objects to the realtime publication lets the dashboard
-- refetch the moment a file is uploaded or deleted, instead of waiting for
-- its 30-second polling fallback.
--
-- Realtime broadcasts honour the existing RLS policy (storage_public_read),
-- so anonymous subscribers only ever see rows for the site's public buckets
-- (property-images, auction-images, resumes). File contents are never
-- broadcast — only object metadata that public readers can already SELECT.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'storage'
       AND tablename = 'objects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE storage.objects;
  END IF;
END
$$;
