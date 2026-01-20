import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useActivitySessionStatus } from '@/hooks/useActivitySessionStatus';
import { AppSidebar } from './AppSidebar';
import { Loader2, ShieldAlert, Clock } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { PerformanceCoachChat } from '@/components/coach/PerformanceCoachChat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Pages that don't require an active session
const EXEMPT_PAGES = ['/activity-monitor', '/settings'];

export const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { hasPageAccess, getUnauthorizedRedirect } = usePermissions();
  const { hasStarted, isLoading: sessionLoading } = useActivitySessionStatus();
  
  // Initialize browser notifications subscription
  useBrowserNotifications();

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentPath = location.pathname;

  // MANDATORY: Redirect to Activity Monitor if session not started
  // Exception: Allow access to activity-monitor itself and settings
  const isExemptPage = EXEMPT_PAGES.some(p => currentPath.startsWith(p));
  
  if (!hasStarted && !isExemptPage) {
    // User has not pressed START WORK - redirect to Activity Monitor
    return <Navigate to="/activity-monitor" replace />;
  }

  // Check if user has access to the current route
  const hasAccess = hasPageAccess(currentPath);

  // If no access, redirect to appropriate page
  if (!hasAccess) {
    const redirectPath = getUnauthorizedRedirect(currentPath);
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
      <PerformanceCoachChat />
    </div>
  );
};
