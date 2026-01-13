-- Drop and recreate profiles_public view (non-sensitive data only)
DROP VIEW IF EXISTS profiles_public;
CREATE VIEW profiles_public AS
SELECT 
  id,
  username,
  full_name,
  avatar_url,
  team_id,
  supervisor_id,
  is_active,
  login_streak_current,
  login_streak_longest,
  last_login_date,
  created_at,
  updated_at
FROM profiles;

-- Drop and recreate profiles_secure view (includes sensitive data)
DROP VIEW IF EXISTS profiles_secure;
CREATE VIEW profiles_secure 
WITH (security_invoker = true)
AS
SELECT 
  id,
  username,
  full_name,
  avatar_url,
  email,
  phone_number,
  whatsapp_number,
  team_id,
  supervisor_id,
  is_active,
  login_streak_current,
  login_streak_longest,
  last_login_date,
  last_login,
  created_at,
  updated_at
FROM profiles;

-- Grant permissions on the views
GRANT SELECT ON profiles_public TO authenticated;
GRANT SELECT ON profiles_secure TO authenticated;

-- Create a function to check if user can access sensitive profile data
CREATE OR REPLACE FUNCTION public.can_access_sensitive_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User can access their own profile
    auth.uid() = profile_id
    -- Or user is admin/super_admin
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
$$;