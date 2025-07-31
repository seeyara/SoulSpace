// Access control utilities for the journal application

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

    const email = localStorage.getItem('soulspace_user_email');

    return {
      hasAccess: !!email,
      email
    };
  },

  // Grant access to user with email
  grantAccess: (email: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('soulspace_user_email', email);
  },

  // Clear all access data
  clearAll: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('soulspace_user_email');
  },

  // Check if user needs to show the access modal
  shouldShowAccessModal: (): boolean => {
    const { hasAccess } = accessControl.checkAccess();
    return !hasAccess;
  }
};