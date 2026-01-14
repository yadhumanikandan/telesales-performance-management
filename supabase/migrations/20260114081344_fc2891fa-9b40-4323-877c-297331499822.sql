-- Make contact_person_name and trade_license_number nullable
ALTER TABLE public.master_contacts 
  ALTER COLUMN contact_person_name DROP NOT NULL,
  ALTER COLUMN trade_license_number DROP NOT NULL;

-- Set default empty string for contact_person_name if null
ALTER TABLE public.master_contacts 
  ALTER COLUMN contact_person_name SET DEFAULT '';