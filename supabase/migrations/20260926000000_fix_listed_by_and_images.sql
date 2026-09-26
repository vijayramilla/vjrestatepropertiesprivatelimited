-- ============================================================================
-- One-time data repair (run in the Supabase SQL editor for the site project)
--
-- 1. properties.images: rows created after the getPublicUrl regression stored
--    each entry as a stringified JSON object {"publicUrl":"https://..."}.
--    Unwrap them to plain URL strings so the gallery renders again.
-- 2. properties.listed_by: "VJR Estate" was removed from the form — historical
--    VJR-official listings are re-branded to "Devendra".
-- ============================================================================

-- 1. Unwrap stringified {publicUrl} objects in images arrays.
UPDATE public.properties
SET images = sub.fixed
FROM (
  SELECT
    id,
    ARRAY(
      SELECT CASE
        WHEN img ~ '^\{"publicUrl"\s*:' THEN
          substring(img from '"publicUrl"\s*:\s*"([^"]+)"')
        ELSE img
      END
      FROM unnest(images) AS img
      WHERE img IS NOT NULL AND img <> ''
    ) AS fixed
  FROM public.properties
  WHERE images IS NOT NULL AND array_length(images, 1) > 0
) AS sub
WHERE properties.id = sub.id
  AND sub.fixed IS DISTINCT FROM properties.images;

-- 2. Re-brand historical VJR Estate listings.
UPDATE public.properties
SET listed_by = 'Devendra'
WHERE listed_by = 'VJR Estate'
   OR listed_by IS NULL
   OR listed_by = '';

-- Keep the default aligned with the form (new rows omit listed_by? they don't,
-- but future migrations/tools may insert without it).
ALTER TABLE public.properties
  ALTER COLUMN listed_by SET DEFAULT 'Devendra';
