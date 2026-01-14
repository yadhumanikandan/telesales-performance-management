-- Create a function to check phone numbers against ALL master_contacts (bypassing RLS)
-- This is needed for upload validation to detect duplicates from any agent's uploads
CREATE OR REPLACE FUNCTION public.check_duplicate_phone_numbers(phone_numbers text[])
RETURNS TABLE(phone_number text, exists_in_db boolean, owner_agent_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnested.phone AS phone_number,
    EXISTS(
      SELECT 1 FROM master_contacts mc 
      WHERE mc.phone_number = unnested.phone
    ) AS exists_in_db,
    (
      SELECT mc.current_owner_agent_id 
      FROM master_contacts mc 
      WHERE mc.phone_number = unnested.phone
      LIMIT 1
    ) AS owner_agent_id
  FROM unnest(phone_numbers) AS unnested(phone);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_duplicate_phone_numbers(text[]) TO authenticated;