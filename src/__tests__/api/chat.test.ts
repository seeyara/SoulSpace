import { POST, GET } from '@/app/api/chat/route'
import { NextRequest } from 'next/server'

// Set up jest mock for supabase
const mockUpsert = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({ upsert: mockUpsert, select: mockSelect }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

describe('Chat API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/chat', () => {
    it('should save chat messages successfully', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        data: { id: 'chat-123' },
        error: null,
      })
      mockFrom.mockReturnValue({
        upsert: mockUpsert,
      })

      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]
      const userId = 'user-123'
      const cuddleId = 'ellie-sr'

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, userId, cuddleId }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockUpsert).toHaveBeenCalledWith({
        date: expect.any(String),
        user_id: userId,
        messages: messages,
        cuddle_id: cuddleId,
      })
    })

    it('should handle missing required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }), // Missing userId and cuddleId
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to save chat')
    })

    it('should handle Supabase errors', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })
      mockFrom.mockReturnValue({
        upsert: mockUpsert,
      })

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          userId: 'user-123',
          cuddleId: 'ellie-sr',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to save chat')
    })

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to save chat')
    })
  })

  describe('GET /api/chat', () => {
    it('should fetch chat history successfully', async () => {
      const mockMessages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              messages: mockMessages,
              cuddle_id: 'ellie-sr',
            },
            error: null,
          }),
        }),
      })
      mockFrom.mockReturnValue({
        select: mockSelect,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/chat?userId=user-123&date=2024-01-01&page=1'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.messages).toEqual(mockMessages)
      expect(data.data.cuddleId).toBe('ellie-sr')
      expect(data.data.hasMore).toBe(false)
    })

    it('should handle missing userId parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/chat?date=2024-01-01'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required parameters')
    })

    it('should handle missing date parameter for regular chat history', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/chat?userId=user-123'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required parameters')
    })

    it('should handle chat not found', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }, // Not found error
          }),
        }),
      })
      mockFrom.mockReturnValue({
        select: mockSelect,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/chat?userId=user-123&date=2024-01-01'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBe(null)
    })

    it('should handle pagination correctly', async () => {
      const mockMessages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
      }))
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              messages: mockMessages,
              cuddle_id: 'ellie-sr',
            },
            error: null,
          }),
        }),
      })
      mockFrom.mockReturnValue({
        select: mockSelect,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/chat?userId=user-123&date=2024-01-01&page=2'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.messages).toHaveLength(5) // MESSAGES_PER_PAGE
      expect(data.data.hasMore).toBe(true)
    })

    it('should handle unfinished entry detection', async () => {
      const mockMessages = [
        { role: 'assistant', content: 'Hello!' },
        { role: 'user', content: 'Hi there' }, // Last message is from user (unfinished)
      ]
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  messages: mockMessages,
                  cuddle_id: 'ellie-sr',
                },
                error: null,
              }),
            }),
          }),
        }),
      })
      mockFrom.mockReturnValue({
        select: mockSelect,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/chat?userId=user-123&unfinished=1'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.lastUnfinished).toEqual({
        mode: 'guided',
        content: 'Hi there',
      })
    })

    it('should return null when no unfinished entry exists', async () => {
      const mockMessages = [
        { role: 'assistant', content: 'Hello!' },
        { role: 'assistant', content: 'How are you?' }, // Last message is from assistant
      ]
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  messages: mockMessages,
                  cuddle_id: 'ellie-sr',
                },
                error: null,
              }),
            }),
          }),
        }),
      })
      mockFrom.mockReturnValue({
        select: mockSelect,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/chat?userId=user-123&unfinished=1'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBe(null)
    })

    it('should handle database errors gracefully', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })
      mockFrom.mockReturnValue({
        select: mockSelect,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/chat?userId=user-123&date=2024-01-01'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch chat')
    })

    it('should handle unfinished entry fetch errors', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        }),
      })
      mockFrom.mockReturnValue({
        select: mockSelect,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/chat?userId=user-123&unfinished=1'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBe(null)
    })
  })
}) 