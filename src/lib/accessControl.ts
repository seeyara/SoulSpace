// Access control utilities for the journal application

export interface AccessStatus {
  hasAccess: boolean;
  email: string | null;
  accessTimestamp: string | null;
  isExpired: boolean;
  hasValidToken: boolean;
  needsEmailVerification: boolean;
}

export const accessControl = {
  // Check if user has valid access
  checkAccess: (): AccessStatus => {
    if (typeof window === 'undefined') {
      return {
        hasAccess: false,
        email: null,
        accessTimestamp: null,
        isExpired: false,
        hasValidToken: false,
        needsEmailVerification: true
      };
    }

    const accessGranted = localStorage.getItem('soulspace_access_granted');
    const email = localStorage.getItem('soulspace_user_email');
    const accessTimestamp = localStorage.getItem('soulspace_access_timestamp');
    const accessToken = localStorage.getItem('soulspace_access_token');

    // Check if email is provided
    const needsEmailVerification = !email;
    
    // Check if we have a valid access token
    const hasValidToken = accessToken !== null && accessToken !== '';

    if (!accessGranted || accessGranted !== 'true' || !email || !hasValidToken) {
      return {
        hasAccess: false,
        email,
        accessTimestamp,
        isExpired: false,
        hasValidToken,
        needsEmailVerification
      };
    }

    // Check if access has expired (optional - you can set an expiration period)
    let isExpired = false;
    if (accessTimestamp) {
      const accessDate = new Date(accessTimestamp);
      const now = new Date();
      const daysDiff = (now.getTime() - accessDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Access expires after 30 days (adjust as needed)
      isExpired = daysDiff > 30;
    }

    return {
      hasAccess: !isExpired && hasValidToken,
      email,
      accessTimestamp,
      isExpired,
      hasValidToken,
      needsEmailVerification
    };
  },

  // Grant access to user with email and token
  grantAccess: (email: string, accessToken?: string) => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('soulspace_access_granted', 'true');
    localStorage.setItem('soulspace_user_email', email);
    localStorage.setItem('soulspace_access_timestamp', new Date().toISOString());
    
    // Store access token if provided
    if (accessToken) {
      localStorage.setItem('soulspace_access_token', accessToken);
    }
  },

  // Verify access token (you can implement your verification logic here)
  verifyAccessToken: async (token: string): Promise<boolean> => {
    try {
      // Add your token verification logic here
      // This could be an API call to verify the token
      // For now, let's assume any non-empty token is valid
      return token.length > 0;
    } catch (error) {
      console.error('Error verifying access token:', error);
      return false;
    }
  },

  // Set access token
  setAccessToken: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('soulspace_access_token', token);
  },

  // Get access token
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('soulspace_access_token');
  },

  // Revoke access
  revokeAccess: () => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('soulspace_access_granted');
    localStorage.removeItem('soulspace_access_timestamp');
    localStorage.removeItem('soulspace_access_token');
    // Keep email for potential re-access
  },

  // Clear all access data
  clearAll: () => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('soulspace_access_granted');
    localStorage.removeItem('soulspace_user_email');
    localStorage.removeItem('soulspace_access_timestamp');
    localStorage.removeItem('soulspace_access_token');
  },

  // Check if user needs to show the access modal
  shouldShowAccessModal: (): boolean => {
    const { hasAccess } = accessControl.checkAccess();
    return !hasAccess;
  }
};