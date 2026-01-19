
-- Create a function to find contact by phone number (bypasses RLS for duplicate checking)
CREATE OR REPLACE FUNCTION public.find_contact_by_phone(phone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact_id uuid;
BEGIN
  SELECT id INTO contact_id
  FROM master_contacts
  WHERE phone_number = phone
  LIMIT 1;
  
  RETURN contact_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.find_contact_by_phone(text) TO authenticated;
