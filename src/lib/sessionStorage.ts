// Session storage utilities for chat state management

export interface ChatSession {
  messages: Array<{
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt?: Date;
  }>;
  userId: string;
  cuddleId: string;
  date: string;
  lastUpdated: Date;
}

const CHAT_SESSION_PREFIX = 'chat-session-';

export const chatSessionManager = {
  // Save chat session
  saveChatSession: (userId: string, cuddleId: string, messages: ChatSession['messages']) => {
    if (typeof window === 'undefined') return;
    
    const date = new Date().toISOString().split('T')[0];
    const key = `${CHAT_SESSION_PREFIX}${userId}-${cuddleId}-${date}`;
    
    const session: ChatSession = {
      messages,
      userId,
      cuddleId,
      date,
      lastUpdated: new Date()
    };
    
    try {
      window.sessionStorage.setItem(key, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  },

  // Load chat session
  loadChatSession: (userId: string, cuddleId: string, date?: string): ChatSession | null => {
    if (typeof window === 'undefined') return null;
    
    const sessionDate = date || new Date().toISOString().split('T')[0];
    const key = `${CHAT_SESSION_PREFIX}${userId}-${cuddleId}-${sessionDate}`;
    
    try {
      const stored = window.sessionStorage.getItem(key);
      if (!stored) return null;
      
      const session = JSON.parse(stored) as ChatSession;
      // Convert date strings back to Date objects
      session.lastUpdated = new Date(session.lastUpdated);
      session.messages = session.messages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined
      }));
      
      return session;
    } catch (error) {
      console.error('Error loading chat session:', error);
      return null;
    }
  },

  // Clear chat session
  clearChatSession: (userId: string, cuddleId: string, date?: string) => {
    if (typeof window === 'undefined') return;
    
    const sessionDate = date || new Date().toISOString().split('T')[0];
    const key = `${CHAT_SESSION_PREFIX}${userId}-${cuddleId}-${sessionDate}`;
    
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing chat session:', error);
    }
  },

  // Get all chat sessions for a user
  getAllChatSessions: (userId: string): ChatSession[] => {
    if (typeof window === 'undefined') return [];
    
    const sessions: ChatSession[] = [];
    
    try {
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(`${CHAT_SESSION_PREFIX}${userId}-`)) {
          const stored = window.sessionStorage.getItem(key);
          if (stored) {
            const session = JSON.parse(stored) as ChatSession;
            session.lastUpdated = new Date(session.lastUpdated);
            sessions.push(session);
          }
        }
      }
    } catch (error) {
      console.error('Error getting all chat sessions:', error);
    }
    
    return sessions.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  },

  // Clear all chat sessions for a user
  clearAllChatSessions: (userId: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(`${CHAT_SESSION_PREFIX}${userId}-`)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => window.sessionStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing all chat sessions:', error);
    }
  },

  // Check if there's an active chat session
  hasActiveChatSession: (userId: string, cuddleId: string, date?: string): boolean => {
    const session = chatSessionManager.loadChatSession(userId, cuddleId, date);
    return session !== null && session.messages.length > 0;
  },

  // Get session storage usage info
  getStorageInfo: () => {
    if (typeof window === 'undefined') return { used: 0, total: 0, available: 0 };
    
    try {
      let used = 0;
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          const value = window.sessionStorage.getItem(key);
          used += key.length + (value ? value.length : 0);
        }
      }
      
      const total = 5 * 1024 * 1024; // Approximate 5MB limit for sessionStorage
      const available = total - used;
      
      return { used, total, available };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { used: 0, total: 0, available: 0 };
    }
  }
};