import { z } from 'zod';
import { ValidationError } from './errors';

// Chat message schema
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message content cannot be empty').max(10000, 'Message content too long')
});

// Chat completion request schema
export const ChatCompletionRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long').optional(),
  cuddleId: z.enum(['ellie-sr', 'olly-sr', 'ellie-jr', 'olly-jr'], {
    errorMap: () => ({ message: 'Invalid cuddle ID' })
  }),
  messageHistory: z.array(ChatMessageSchema).max(100, 'Message history too long'),
  forceEnd: z.boolean().optional()
}).refine(
  (data) => data.message || data.forceEnd || data.message === "_finish_entry_",
  {
    message: 'Message is required unless forcing end',
    path: ['message']
  }
);

export const CompleteJournalRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  cuddleId: z.enum(['ellie-sr', 'olly-sr', 'ellie-jr', 'olly-jr'], {
    errorMap: () => ({ message: 'Invalid cuddle ID' })
  }),
  messages: z.array(ChatMessageSchema).min(1, 'At least one message is required').max(200, 'Too many messages'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

// Save chat request schema
export const SaveChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, 'At least one message is required').max(200, 'Too many messages'),
  userId: z.string().uuid('Invalid user ID format'),
  cuddleId: z.enum(['ellie-sr', 'olly-sr', 'ellie-jr', 'olly-jr'], {
    errorMap: () => ({ message: 'Invalid cuddle ID' })
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional()
});

// Get chat request schema (query params)
export const GetChatRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  unfinished: z.enum(['1', '0']).optional()
}).refine(
  (data) => data.date || data.unfinished === '1',
  {
    message: 'Date is required unless requesting unfinished entries',
    path: ['date']
  }
);

// User profile schema
export const UserProfileSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  age: z.number().int().min(13, 'Must be at least 13 years old').max(120, 'Invalid age'),
  pronouns: z.string().min(1, 'Pronouns are required').max(20, 'Pronouns too long'),
  onboardingCompleted: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

// Community question schema
export const CommunityQuestionSchema = z.object({
  content: z.string().min(1, 'Question content is required').max(2000, 'Question too long'),
  userId: z.string().uuid('Invalid user ID format'),
  isAnonymous: z.boolean().optional().default(false)
});

// Community reply schema
export const CommunityReplySchema = z.object({
  content: z.string().min(1, 'Reply content is required').max(1000, 'Reply too long'),
  questionId: z.string().uuid('Invalid question ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  isAnonymous: z.boolean().optional().default(false)
});

// Community like schema
export const CommunityLikeSchema = z.object({
  questionId: z.string().uuid('Invalid question ID format').optional(),
  replyId: z.string().uuid('Invalid reply ID format').optional(),
  userId: z.string().uuid('Invalid user ID format')
}).refine(
  (data) => data.questionId || data.replyId,
  {
    message: 'Either questionId or replyId must be provided',
    path: ['questionId']
  }
);

// Validation middleware
export function validateRequestBody<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new ValidationError(
          firstError.message,
          firstError.path.join('.')
        );
      }
      throw new ValidationError('Invalid request data');
    }
  };
}

// Query params validation
export function validateQueryParams<T>(schema: z.ZodSchema<T>) {
  return (searchParams: URLSearchParams): T => {
    const data = Object.fromEntries(searchParams.entries());
    
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new ValidationError(
          firstError.message,
          firstError.path.join('.')
        );
      }
      throw new ValidationError('Invalid query parameters');
    }
  };
}

// Export types
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
export type SaveChatRequest = z.infer<typeof SaveChatRequestSchema>;
export type CompleteJournalRequest = z.infer<typeof CompleteJournalRequestSchema>;
export type GetChatRequest = z.infer<typeof GetChatRequestSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CommunityQuestion = z.infer<typeof CommunityQuestionSchema>;
export type CommunityReply = z.infer<typeof CommunityReplySchema>;
export type CommunityLike = z.infer<typeof CommunityLikeSchema>;