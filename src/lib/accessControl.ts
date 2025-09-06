// Access control utilities for the journal application

import { storage } from "./storage";

export interface AccessStatus {
  hasAccess: boolean;
  email: string | null;
}

export const accessControl = {
  // Check if user has valid access
  checkAccess: (): AccessStatus => {
    if (typeof window === 'undefined') {
      return {
        hasAccess: false,
        email: null
      };
    }

    const email = storage.getEmail();

    return {
      hasAccess: !!email,
      email
    };
  },

  // Grant access to user with email
  grantAccess: (email: string) => {
    if (typeof window === 'undefined') return;
    storage.setEmail(email);
  },

  // Clear all access data
  clearAll: () => {
    if (typeof window === 'undefined') return;
    storage.removeEmail();
    storage.removeUserId();
    storage.removeSessionId();
  },

  // Check if user needs to show the access modal
  shouldShowAccessModal: (): boolean => {
    const { hasAccess } = accessControl.checkAccess();
    return !hasAccess;
  }
};