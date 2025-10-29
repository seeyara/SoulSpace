// Comprehensive API types for better type safety

export interface APIResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    field?: string;
    timestamp: string;
  };
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
  page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
  page?: number;
  limit?: number;
}

// User Profile Types
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  pronouns: string;
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Legacy fields for compatibility
  cuddleOwnership?: string;
  gender?: string;
  lifeStage?: string;
}

// Chat Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatSession {
  id?: string;
  userId: string;
  cuddleId: CuddleId;
  messages: ChatMessage[];
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

// Companion Types
export type CuddleId = 'ellie-sr' | 'olly-sr' | 'ellie-jr' | 'olly-jr';

export interface Companion {
  id: CuddleId;
  name: string;
  description: string;
  personality: string;
  ageGroup: 'senior' | 'junior';
  imageUrl: string;
}

// Community Types
export interface CommunityQuestion {
  id: string;
  content: string;
  userId: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt?: string;
  likesCount?: number;
  repliesCount?: number;
  isLiked?: boolean;
}

export interface CommunityReply {
  id: string;
  content: string;
  questionId: string;
  userId: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt?: string;
  likesCount?: number;
  isLiked?: boolean;
}

export interface CommunityLike {
  id: string;
  userId: string;
  questionId?: string;
  replyId?: string;
  createdAt: string;
}

// Request/Response Types
export interface ChatCompletionRequest {
  message?: string;
  cuddleId: CuddleId;
  messageHistory: ChatMessage[];
  forceEnd?: boolean;
}

export interface ChatCompletionResponse {
  response: string;
  shouldEnd: boolean;
}

export interface SaveChatRequest {
  messages: ChatMessage[];
  userId: string;
  cuddleId: CuddleId;
  mode?: 'guided' | 'flat';
}

export interface GetChatRequest {
  userId: string;
  date?: string;
  unfinished?: '1' | '0';
}

// Statistics Types
export interface UserChatStats {
  totalChats: number;
  recentActivity: string[];
  favoriteCompanion?: CuddleId;
  totalMessages?: number;
  averageSessionLength?: number;
}

// Error Types
export interface APIError {
  message: string;
  code?: string;
  field?: string;
  statusCode?: number;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  identifier: string;
}

// Environment Configuration Types
export interface ServerConfig {
  openai: {
    apiKey: string;
  };
}

export interface ClientConfig {
  supabase: {
    url: string;
    anonKey: string;
    envPrefix: string;
  };
  analytics: {
    gaTrackingId: string;
  };
  openai: {
    completionModel: string;
  };
}

// Database Types
export interface DatabaseRecord {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatsTable extends DatabaseRecord {
  user_id: string;
  date: string;
  messages: ChatMessage[];
  cuddle_id: CuddleId;
}

export interface UsersTable extends DatabaseRecord {
  email?: string;
  first_name?: string;
  last_name?: string;
  age?: number;
  pronouns?: string;
  onboarding_completed?: boolean;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;