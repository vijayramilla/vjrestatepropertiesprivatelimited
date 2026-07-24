-- Add missing columns to crm_clients to match SheetClient interface
ALTER TABLE public.crm_clients
  ADD COLUMN IF NOT EXISTS paid_comm TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_role TEXT NOT NULL DEFAULT 'Buyer',
  ADD COLUMN IF NOT EXISTS property_link TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS comm_date TEXT,
  ADD COLUMN IF NOT EXISTS property_subtype TEXT NOT NULL DEFAULT '';
