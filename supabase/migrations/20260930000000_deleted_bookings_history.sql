-- ============================================================================
-- 20260930000000_deleted_bookings_history.sql
-- Booking history: deleting a booking from CRM → Bookings moves the row here
-- instead of destroying it. Admins can view history in the Bookings page and
-- permanently delete (purge) entries from there. Access is proxy-only
-- (service role): no anon/authenticated policies.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deleted_bookings (
  id                  TEXT PRIMARY KEY,            -- original property_leads id
  property_id         TEXT NOT NULL DEFAULT '',
  property_title      TEXT NOT NULL DEFAULT '',
  property_type       TEXT NOT NULL DEFAULT '',
  property_area       TEXT NOT NULL DEFAULT '',
  property_price      TEXT NOT NULL DEFAULT '',
  visit_date          TEXT,
  visit_time          TEXT,
  buyer_name          TEXT,
  buyer_phone         TEXT,
  lead_type           TEXT NOT NULL DEFAULT 'book_visit',
  source              TEXT,
  listed_by           TEXT,
  status              TEXT NOT NULL DEFAULT 'new',
  message             TEXT NOT NULL DEFAULT '',
  ip_address          TEXT,
  original_created_at TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deleted_bookings_deleted_at
  ON public.deleted_bookings (deleted_at DESC);

ALTER TABLE public.deleted_bookings ENABLE ROW LEVEL SECURITY;

-- History holds buyer PII — reads/writes go through the data-proxy only.
DROP POLICY IF EXISTS "deleted_bookings_no_read" ON public.deleted_bookings;
CREATE POLICY "deleted_bookings_no_read" ON public.deleted_bookings
  FOR SELECT USING (false);
