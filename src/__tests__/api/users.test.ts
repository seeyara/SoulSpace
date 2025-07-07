import { POST } from '@/app/api/users/route'
import { NextRequest } from 'next/server'

// Set up jest mock for supabase
const mockUpdate = jest.fn();
const mockFrom = jest.fn(() => ({ update: mockUpdate }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import { supabase as mockSupabase } from '@/lib/supabase'

describe('Users API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/users', () => {
    it('should update user name successfully', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        data: { id: 'user-123', name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-123', name: 'John Doe' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'John Doe' })
    })

    it('should handle missing userId parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'John Doe' }), // Missing userId
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required parameters')
    })

    it('should handle missing name parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-123' }), // Missing name
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required parameters')
    })

    it('should handle Supabase errors', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-123', name: 'John Doe' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update user')
    })

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update user')
    })

    it('should handle empty name', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-123', name: '' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name cannot be empty')
    })

    it('should handle whitespace-only name', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-123', name: '   ' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name cannot be empty')
    })

    it('should trim whitespace from name', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        data: { id: 'user-123', name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-123', name: '  John Doe  ' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'John Doe' })
    })
  })
}) 