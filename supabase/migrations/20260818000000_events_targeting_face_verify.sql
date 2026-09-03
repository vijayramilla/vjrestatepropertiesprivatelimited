-- VJR Estate CRM — event targeting (departments/designations/employees) + employee face verification
-- Project: qrlkicsxnhaplwkotnyd (CRM/CLI project)

-- Events can target specific departments, designations, and/or individual employees.
-- Empty arrays = visible to everyone.
ALTER TABLE public.employee_events
  ADD COLUMN IF NOT EXISTS target_departments TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_designations TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_employee_ids TEXT[] NOT NULL DEFAULT '{}';

-- Face verification captures: photo + exact location + timestamp per employee.
CREATE TABLE IF NOT EXISTS public.employee_face_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_label TEXT DEFAULT '',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_face_verifications_employee ON public.employee_face_verifications(employee_id, verified_at DESC);

ALTER TABLE public.employee_face_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.employee_face_verifications;
CREATE POLICY "Enable all for all users" ON public.employee_face_verifications FOR ALL USING (true);
