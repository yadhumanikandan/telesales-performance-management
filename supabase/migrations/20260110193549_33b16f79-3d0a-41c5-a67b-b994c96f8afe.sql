-- Allow supervisors to update upload status (for approval workflow)
CREATE POLICY "Supervisors can update uploads" 
ON public.call_sheet_uploads 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  OR has_role(auth.uid(), 'operations_head'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);