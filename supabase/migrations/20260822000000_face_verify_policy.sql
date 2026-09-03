-- VJR Estate CRM — face verification policy per employee
-- Project: qrlkicsxnhaplwkotnyd (CRM/CLI project)

-- When true, the employee's dashboard auto-prompts a face verification
-- (photo + exact location + timestamp) at the chosen frequency.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS face_verify_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS face_verify_frequency TEXT NOT NULL DEFAULT 'daily';
