-- Fix the infinite recursion in profiles RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Supervisors can view team profiles" ON public.profiles;

-- Recreate without recursive subquery - use only has_role function
CREATE POLICY "Supervisors can view team profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'supervisor'::app_role) 
  OR has_role(auth.uid(), 'operations_head'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Also simplify "Users can view own profile" policy to avoid conflict
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;