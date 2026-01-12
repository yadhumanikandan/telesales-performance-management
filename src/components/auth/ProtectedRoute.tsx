import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessPage, getDefaultRedirectPath } from '@/config/rolePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requiresTeamLeader?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiresTeamLeader = false,
}) => {
  const { user, userRole, ledTeamId, loading } = useAuth();
  const location = useLocation();
  const isTeamLeader = !!ledTeamId;

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  let hasAccess = true;

  if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = allowedRoles.includes(userRole as AppRole);
  } else {
    // Use the centralized permissions if no specific roles provided
    hasAccess = canAccessPage(userRole as AppRole, location.pathname, isTeamLeader);
  }

  // Check team leader requirement
  if (requiresTeamLeader && !isTeamLeader) {
    hasAccess = false;
  }

  // Show access denied if user doesn't have permission
  if (!hasAccess) {
    const redirectPath = getDefaultRedirectPath(userRole as AppRole);
    
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <Button onClick={() => window.location.href = redirectPath}>
              Go to {userRole === 'agent' ? 'My Profile' : 'Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
