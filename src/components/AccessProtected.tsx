'use client';

import { useEffect, useState } from 'react';
import { accessControl } from '@/lib/accessControl';
import GlobalAccessModal from '@/components/GlobalAccessModal';

interface AccessProtectedProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AccessProtected({ 
  children, 
  fallback
}: AccessProtectedProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUserAccess = () => {
      const accessStatus = accessControl.checkAccess();
      
      if (accessStatus.hasAccess) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    };

    // Check access on mount
    checkUserAccess();

    // Listen for storage changes (in case user completes access in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'soul_journal_user_id') {
        checkUserAccess();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  // Loading state
  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-primary/60">Checking access...</p>
        </div>
      </div>
    );
  }

  // No access - show modal or fallback
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">Access Required</h1>
            <p className="text-gray-600">Please complete the access verification to continue.</p>
          </div>
        </div>
        <GlobalAccessModal />
      </>
    );
  }

  // Has access - render protected content  
  return <>{children}</>;
}

// Hook version for easier use in components
export function useAccessControl() {
  const [accessStatus, setAccessStatus] = useState(() => accessControl.checkAccess());

  useEffect(() => {
    const checkAccess = () => {
      setAccessStatus(accessControl.checkAccess());
    };

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'soul_journal_user_id') {
        checkAccess();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    ...accessStatus,
    checkAccess: () => {
      const newStatus = accessControl.checkAccess();
      setAccessStatus(newStatus);
      return newStatus;
    },
    grantAccess: accessControl.grantAccess,
    clearAll: accessControl.clearAll
  };
}