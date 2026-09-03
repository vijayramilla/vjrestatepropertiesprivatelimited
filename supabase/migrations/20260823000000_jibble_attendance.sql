-- VJR Estate — Jibble-style attendance & time tracking
-- Project: qrlkicsxnhaplwkotnyd (CRM/CLI project)
-- Adds: GPS clock-in/out, selfie capture, geofences, break tracking,
--        overtime config, weekly timesheet support.

-- ─── 1. Enhance employee_attendance ───────────────────────────────────────
-- Add GPS and selfie columns to the existing attendance table
ALTER TABLE public.employee_attendance
  ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_location TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS check_in_selfie_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS check_out_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_location TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS check_out_selfie_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS total_break_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'auto' -- 'auto' (from login), 'clock_in' (manual), 'kiosk'
;

-- ─── 2. Break tracking ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  break_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  break_end TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employee_breaks_employee ON public.employee_breaks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_breaks_date ON public.employee_breaks(attendance_date);

-- ─── 3. Geofences ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 200,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read geofences" ON public.geofences;
CREATE POLICY "Public read geofences" ON public.geofences FOR SELECT USING (true);
-- Only service role can write (via proxy)

-- ─── 4. Employee overtime & shift config ──────────────────────────────────
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS overtime_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS daily_work_hours NUMERIC DEFAULT 8,
  ADD COLUMN IF NOT EXISTS max_break_minutes INTEGER DEFAULT 60;

-- ─── 5. Enable RLS on employee_attendance (if not already) ───────────────
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.employee_attendance;
CREATE POLICY "Enable all for all users" ON public.employee_attendance FOR ALL USING (true);

ALTER TABLE public.employee_breaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.employee_breaks;
CREATE POLICY "Enable all for all users" ON public.employee_breaks FOR ALL USING (true);

-- ─── 6. Geofence check RPC (optional, for server-side validation) ─────────
CREATE OR REPLACE FUNCTION public.check_geofence(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
) RETURNS TABLE (
  id UUID,
  name TEXT,
  distance_meters DOUBLE PRECISION,
  is_within BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    ROUND((6371000 * acos(
      cos(radians(p_lat)) * cos(radians(g.latitude)) *
      cos(radians(g.longitude) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(g.latitude))
    ))::NUMERIC, 1)::DOUBLE PRECISION AS distance_meters,
    ((6371000 * acos(
      cos(radians(p_lat)) * cos(radians(g.latitude)) *
      cos(radians(g.longitude) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(g.latitude))
    )) <= g.radius_meters) AS is_within
  FROM public.geofences g
  WHERE g.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE;
