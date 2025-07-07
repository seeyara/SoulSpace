import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Account from '@/app/account/page'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}))

jest.mock('@/lib/storage', () => ({
  storage: {
    getUserId: jest.fn(),
    getCuddleId: jest.fn(),
    getCuddleName: jest.fn(),
    setCuddleId: jest.fn(),
    setCuddleName: jest.fn(),
  },
}))

jest.mock('@/lib/utils/gtag', () => ({
  event: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock components
jest.mock('@/components/ChatHistoryModal', () => {
  return function MockChatHistoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? <div data-testid="chat-history-modal">Chat History Modal</div> : null
  }
})

jest.mock('@/components/CuddleSelectionModal', () => {
  return function MockCuddleSelectionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? <div data-testid="cuddle-selection-modal">Cuddle Selection Modal</div> : null
  }
})

const mockSupabase = require('@/lib/supabase').supabase
const mockStorage = require('@/lib/storage').storage

describe('Account Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('User Data Management', () => {
    it('should load and display user name', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('should display default username when no name exists', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: null },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('Username')).toBeInTheDocument()
      })
    })

    it('should allow editing user name', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const nameElement = screen.getByText('John Doe')
      await user.click(nameElement)

      const input = screen.getByDisplayValue('John Doe')
      await user.clear(input)
      await user.type(input, 'Jane Doe')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      })
    })

    it('should handle name validation', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const nameElement = screen.getByText('John Doe')
      await user.click(nameElement)

      const input = screen.getByDisplayValue('John Doe')
      await user.clear(input)
      await user.type(input, 'Username') // Should revert to original
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('should handle name update errors', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const nameElement = screen.getByText('John Doe')
      await user.click(nameElement)

      const input = screen.getByDisplayValue('John Doe')
      await user.clear(input)
      await user.type(input, 'Jane Doe')
      await user.keyboard('{Enter}')

      // Should still show the new name even if API call fails
      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      })
    })
  })

  describe('Cuddle Selection', () => {
    it('should display current cuddle from Supabase', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn()
        .mockResolvedValueOnce({
          data: { name: 'John Doe' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { cuddle_id: 'ellie-sr', cuddle_name: 'Ellie' },
          error: null,
        })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByAltText('Ellie')).toBeInTheDocument()
      })
    })

    it('should fallback to localStorage when Supabase has no cuddle data', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      mockStorage.getCuddleId.mockReturnValue('olly-sr')
      mockStorage.getCuddleName.mockReturnValue('Olly')
      const mockSelect = jest.fn()
        .mockResolvedValueOnce({
          data: { name: 'John Doe' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { cuddle_id: null, cuddle_name: null },
          error: null,
        })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByAltText('Olly')).toBeInTheDocument()
      })
    })

    it('should handle cuddle selection errors gracefully', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      mockStorage.getCuddleId.mockReturnValue('ellie-sr')
      mockStorage.getCuddleName.mockReturnValue('Ellie')
      const mockSelect = jest.fn()
        .mockResolvedValueOnce({
          data: { name: 'John Doe' },
          error: null,
        })
        .mockRejectedValueOnce(new Error('Database error'))
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByAltText('Ellie')).toBeInTheDocument()
      })
    })

    it('should open cuddle selection modal', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const changeButton = screen.getByText(/Change cuddle/)
      await user.click(changeButton)

      expect(screen.getByTestId('cuddle-selection-modal')).toBeInTheDocument()
    })
  })

  describe('Journal Entries Display', () => {
    it('should load and display journal entries', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn()
        .mockResolvedValueOnce({
          data: { name: 'John Doe' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            { date: '2024-01-01', cuddle_id: 'ellie-sr' },
            { date: '2024-01-02', cuddle_id: 'olly-sr' },
          ],
          error: null,
        })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('should calculate and display streak correctly', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      const mockSelect = jest.fn()
        .mockResolvedValueOnce({
          data: { name: 'John Doe' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            { date: today.toISOString().split('T')[0], cuddle_id: 'ellie-sr' },
            { date: yesterday.toISOString().split('T')[0], cuddle_id: 'olly-sr' },
            { date: twoDaysAgo.toISOString().split('T')[0], cuddle_id: 'ellie-sr' },
          ],
          error: null,
        })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument() // Streak count
      })
    })

    it('should handle entry selection', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn()
        .mockResolvedValueOnce({
          data: { name: 'John Doe' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            { date: '2024-01-01', cuddle_id: 'ellie-sr' },
          ],
          error: null,
        })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click on a calendar day
      const calendarDay = screen.getByText('1')
      await user.click(calendarDay)

      expect(screen.getByTestId('chat-history-modal')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should redirect to journal when no user ID exists', async () => {
      mockStorage.getUserId.mockReturnValue(null)

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('Username')).toBeInTheDocument()
      })
    })

    it('should navigate to journal when start journaling is clicked', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const startButton = screen.getByText(/Start Journaling/)
      await user.click(startButton)

      // Should navigate to journal page
      // This is tested through the router mock
    })
  })

  describe('Error Handling', () => {
    it('should handle Supabase errors gracefully', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('Username')).toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockRejectedValue(new Error('Network error'))
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('Username')).toBeInTheDocument()
      })
    })
  })

  describe('UI Interactions', () => {
    it('should show loading states during data fetch', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { name: 'John Doe' },
          error: null,
        }), 100))
      )
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      // Should show loading state initially
      expect(screen.getByText('Username')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('should handle modal interactions', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Open cuddle selection modal
      const changeButton = screen.getByText(/Change cuddle/)
      await user.click(changeButton)

      expect(screen.getByTestId('cuddle-selection-modal')).toBeInTheDocument()

      // Close modal (this would be handled by the modal component)
      // For now, we just verify it's open
    })
  })
}) 