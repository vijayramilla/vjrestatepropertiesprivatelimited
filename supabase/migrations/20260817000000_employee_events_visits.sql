-- VJR Estate CRM — employee events (posters/wishings/updates) + client site visits + employee photos
-- Project: qrlkicsxnhaplwkotnyd (CRM/CLI project)

-- Events/announcements the admin publishes; employees see them on their dashboard.
CREATE TABLE IF NOT EXISTS public.employee_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'Update',          -- Event | Wishing | Update | Announcement
  event_date DATE,
  image_url TEXT DEFAULT '',                          -- poster image (public URL)
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employee_events_date ON public.employee_events(event_date DESC NULLS LAST);

-- Site visits scheduled by employees for their assigned clients.
CREATE TABLE IF NOT EXISTS public.client_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  client_sno INTEGER NOT NULL REFERENCES public.crm_clients(sno) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled',           -- Scheduled | Completed | Cancelled
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_visits_employee ON public.client_visits(employee_id);
CREATE INDEX IF NOT EXISTS idx_client_visits_client ON public.client_visits(client_sno);
CREATE INDEX IF NOT EXISTS idx_client_visits_date ON public.client_visits(visit_date);

ALTER TABLE public.employee_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.employee_events;
CREATE POLICY "Enable all for all users" ON public.employee_events FOR ALL USING (true);

ALTER TABLE public.client_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.client_visits;
CREATE POLICY "Enable all for all users" ON public.client_visits FOR ALL USING (true);

-- Employee profile photos (public so <img> tags render, uploaded via the proxy with the service key).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('employee-photos', 'employee-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
