import type { CuddleId } from '@/types/api';

// Storage keys
export const STORAGE_KEYS = {
  USER_ID: 'soul_journal_user_id',
  EMAIL: 'soul_journal_user_email',
  SESSION_ID: 'soul_journal_session_id',
  CUDDLE_ID: 'soul_journal_cuddle_id',
  CUDDLE_NAME: 'soul_journal_cuddle_name',
  USER_PROFILE: 'user_profile',
  COMMUNITY_INVITE_PENDING: 'soul_community_invite_pending',
  ONGOING_CONVERSATION: 'ongoing_journal_conversation',
} as const;

// Types for stored data
export interface UserProfile {
  name?: string;
  age?: number;
  interests?: string[];
  lifestage?: string;
  lifeStage?: string;
  [key: string]: string | number | string[] | undefined;
}

import type { ChatMessage } from '@/hooks/useChat';
export interface OngoingConversation {
  messages: ChatMessage[];
  cuddle: CuddleId;
}

// Storage utility class
class StorageManager {
  clearOngoingConversation(): boolean {
    return this.removeOngoingConversation();
  }
  private isClient = typeof window !== 'undefined';

  // Generic getter with type safety
  private get<T>(key: string, defaultValue?: T): T | null {
    if (!this.isClient) return defaultValue ?? null;
    
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue ?? null;
      
      try {
        return JSON.parse(item);
      } catch {
        // If not valid JSON, return as string (for backward compatibility)
        return item as unknown as T;
      }
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue ?? null;
    }
  }

  // Generic setter with error handling
  private set<T>(key: string, value: T): boolean {
    if (!this.isClient) return false;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  }

  // Generic remover
  private remove(key: string): boolean {
    if (!this.isClient) return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  }

  // User ID methods
  getUserId(): string | null {
    return this.get<string>(STORAGE_KEYS.USER_ID);
  }

  setUserId(userId: string): boolean {
    return this.set(STORAGE_KEYS.USER_ID, userId);
  }

  removeUserId(): boolean {
    return this.remove(STORAGE_KEYS.USER_ID);
  }
  
  // User ID methods
  getEmail(): string | null {
    return this.get<string>(STORAGE_KEYS.EMAIL);
  }

  setEmail(email: string): boolean {
    return this.set(STORAGE_KEYS.EMAIL, email);
  }

  removeEmail(): boolean {
    return this.remove(STORAGE_KEYS.EMAIL);
  }

    // Session ID methods
  getSessionId(): string | null {
    return this.get<string>(STORAGE_KEYS.SESSION_ID);
  }

  setSessionId(sessionId: string): boolean {
    return this.set(STORAGE_KEYS.SESSION_ID, sessionId);
  }

  removeSessionId(): boolean {
    return this.remove(STORAGE_KEYS.SESSION_ID);
  }

  // Cuddle methods
  getCuddleId(): CuddleId | null {
    return this.get<CuddleId>(STORAGE_KEYS.CUDDLE_ID);
  }

  setCuddleId(cuddleId: CuddleId): boolean {
    return this.set(STORAGE_KEYS.CUDDLE_ID, cuddleId);
  }

  removeCuddleId(): boolean {
    return this.remove(STORAGE_KEYS.CUDDLE_ID);
  }

  getCuddleName(): string | null {
    return this.get<string>(STORAGE_KEYS.CUDDLE_NAME);
  }

  setCuddleName(name: string): boolean {
    return this.set(STORAGE_KEYS.CUDDLE_NAME, name);
  }

  removeCuddleName(): boolean {
    return this.remove(STORAGE_KEYS.CUDDLE_NAME);
  }

  // User profile methods
  getUserProfile(): UserProfile | null {
    const profile = this.get<UserProfile>(STORAGE_KEYS.USER_PROFILE);
    if (!profile) return null;
    // Ensure lifestage is always present
    if (!('lifestage' in profile)) {
      profile.lifestage = '';
    }
    if (!('lifeStage' in profile) && typeof profile.lifestage === 'string') {
      profile.lifeStage = profile.lifestage;
    }
    return profile;
  }

  setUserProfile(profile: UserProfile): boolean {
    return this.set(STORAGE_KEYS.USER_PROFILE, profile);
  }

  removeUserProfile(): boolean {
    return this.remove(STORAGE_KEYS.USER_PROFILE);
  }

  // Community invite methods
  getCommunityInvitePending(): boolean {
    return this.get<string>(STORAGE_KEYS.COMMUNITY_INVITE_PENDING) === 'true';
  }

  setCommunityInvitePending(pending: boolean): boolean {
    return this.set(STORAGE_KEYS.COMMUNITY_INVITE_PENDING, pending.toString());
  }

  removeCommunityInvitePending(): boolean {
    return this.remove(STORAGE_KEYS.COMMUNITY_INVITE_PENDING);
  }

  // Ongoing conversation methods
  getOngoingConversation(): OngoingConversation | null {
    return this.get<OngoingConversation>(STORAGE_KEYS.ONGOING_CONVERSATION);
  }

  setOngoingConversation(conversation: OngoingConversation): boolean {
    return this.set(STORAGE_KEYS.ONGOING_CONVERSATION, conversation);
  }

  removeOngoingConversation(): boolean {
    return this.remove(STORAGE_KEYS.ONGOING_CONVERSATION);
  }

  // Utility methods
  clearAll(): boolean {
    if (!this.isClient) return false;
    
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  // Check if storage is available
  isAvailable(): boolean {
    if (!this.isClient) return false;
    
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  // Get storage usage info
  getStorageInfo(): { used: number; available: number; total: number } | null {
    if (!this.isClient) return null;
    
    try {
      let used = 0;
      Object.values(STORAGE_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          used += new Blob([item]).size;
        }
      });
      
      // Estimate available space (localStorage is typically 5-10MB)
      const total = 5 * 1024 * 1024; // 5MB estimate
      const available = total - used;
      
      return { used, available, total };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const storage = new StorageManager();

// Export convenience functions for backward compatibility
export const getUserId = () => storage.getUserId();
export const setUserId = (userId: string) => storage.setUserId(userId);
export const getCuddleId = () => storage.getCuddleId();
export const setCuddleId = (cuddleId: CuddleId) => storage.setCuddleId(cuddleId);
export const getCuddleName = () => storage.getCuddleName();
export const setCuddleName = (name: string) => storage.setCuddleName(name);
export const getUserProfile = () => storage.getUserProfile();
export const setUserProfile = (profile: UserProfile) => storage.setUserProfile(profile);
export const getOngoingConversation = () => storage.getOngoingConversation();
export const setOngoingConversation = (conversation: OngoingConversation) => storage.setOngoingConversation(conversation); 
export const getSessionId = () => storage.getSessionId();
export const setSessionId = (sessionId: string) => storage.setSessionId(sessionId);
export const removeSessionId = () => storage.removeSessionId();
