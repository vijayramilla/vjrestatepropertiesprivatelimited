-- VJR Estate CRM — employee sessions, work timings, auto-logout
-- Project: qrlkicsxnhaplwkotnyd (CRM/CLI project)

-- Work timings: when the day starts and when the dashboard auto-logs out (IST)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '09:30';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS auto_logout_time TIME DEFAULT '21:00';

-- One row per employee browser login. Duration is filled on logout; the daily
-- attendance record is derived from the first login (check-in) and last logout.
CREATE TABLE IF NOT EXISTS public.employee_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_employee ON public.employee_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_login ON public.employee_sessions(login_at);

ALTER TABLE public.employee_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.employee_sessions;
CREATE POLICY "Enable all for all users" ON public.employee_sessions FOR ALL USING (true);
