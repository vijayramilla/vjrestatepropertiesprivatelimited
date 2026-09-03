-- VJR Estate CRM — employee client assignment + login tracking
-- Project: qrlkicsxnhaplwkotnyd (CRM/CLI project)

-- Employees: login counters (used for the "how many times did the employee log in" stats)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- CRM clients: which employee is handling the client (ID Card ID is employees.employee_id)
ALTER TABLE public.crm_clients ADD COLUMN IF NOT EXISTS assigned_employee UUID REFERENCES public.employees(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_crm_clients_assigned_employee ON public.crm_clients(assigned_employee);

-- One row per employee login per day (UNIQUE makes re-recording idempotent)
CREATE TABLE IF NOT EXISTS public.employee_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_agent TEXT DEFAULT '',
  UNIQUE(employee_id, login_date)
);
CREATE INDEX IF NOT EXISTS idx_employee_logins_employee ON public.employee_logins(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_logins_date ON public.employee_logins(login_date);

-- Full audit trail of every client status change / note by an employee or admin
CREATE TABLE IF NOT EXISTS public.crm_client_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_sno BIGINT NOT NULL REFERENCES public.crm_clients(sno) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT '',
  note TEXT DEFAULT '',
  performed_by TEXT DEFAULT '',
  performed_by_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_client_activity_client ON public.crm_client_activity(client_sno);
CREATE INDEX IF NOT EXISTS idx_crm_client_activity_created ON public.crm_client_activity(created_at);

-- Same permissive access model as crm_clients (proxy/anon reads only — writes go through the proxy)
ALTER TABLE public.employee_logins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.employee_logins;
CREATE POLICY "Enable all for all users" ON public.employee_logins FOR ALL USING (true);

ALTER TABLE public.crm_client_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.crm_client_activity;
CREATE POLICY "Enable all for all users" ON public.crm_client_activity FOR ALL USING (true);
