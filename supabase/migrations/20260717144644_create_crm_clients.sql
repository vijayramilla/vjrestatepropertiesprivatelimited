CREATE TABLE IF NOT EXISTS public.crm_clients (
  id BIGSERIAL PRIMARY KEY,
  sno BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  budget_val DOUBLE PRECISION NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  closed_price TEXT NOT NULL DEFAULT '',
  closing_timeline TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  buyer_comm_pct TEXT NOT NULL DEFAULT '',
  buyer_comm_val TEXT NOT NULL DEFAULT '',
  seller_comm_pct TEXT NOT NULL DEFAULT '',
  seller_comm_val TEXT NOT NULL DEFAULT '',
  total_comm TEXT NOT NULL DEFAULT '',
  comm_status TEXT NOT NULL DEFAULT '',
  my_share TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  updated_date TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for all users" ON public.crm_clients;
CREATE POLICY "Enable all for all users" ON public.crm_clients
  FOR ALL USING (true);
