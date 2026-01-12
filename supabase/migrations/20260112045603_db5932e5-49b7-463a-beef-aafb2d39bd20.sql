-- Drop existing SELECT policies on profiles that might allow broader access for team leaders
DROP POLICY IF EXISTS "Team leaders can view their team members" ON public.profiles;
DROP POLICY IF EXISTS "Supervisors can view direct reports and team members" ON public.profiles;

-- Recreate policy: Team leaders can ONLY view members of the team they lead
CREATE POLICY "Team leaders can view their team members"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  team_id = public.get_led_team_id(auth.uid())
  AND public.get_led_team_id(auth.uid()) IS NOT NULL
);

-- Supervisors can view their direct reports (profiles where supervisor_id = current user)
CREATE POLICY "Supervisors can view direct reports"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  supervisor_id = auth.uid()
);