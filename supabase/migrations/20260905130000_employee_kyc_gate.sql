-- VJR Estate CRM — KYC gate policy
-- When kyc_required is true (default) an employee must complete KYC onboarding
-- (Aadhaar + PAN documents verified by an admin) before the My Clients
-- workspace unlocks. Admins can switch this off per employee in the CRM to let
-- someone proceed without KYC.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS kyc_required BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS bookings_visible BOOLEAN NOT NULL DEFAULT TRUE;
