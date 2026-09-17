-- Per-user "Add Property" access grant.
-- Admins flip this flag from the Users dashboard; the data-proxy enforces it
-- on property.create and the List Property page reads it via user.accessStatus.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS can_add_property BOOLEAN NOT NULL DEFAULT false;
