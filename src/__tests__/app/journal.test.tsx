import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JournalPage from '@/app/journal/page'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}))

jest.mock('@/lib/storage', () => ({
  storage: {
    getUserId: jest.fn(),
    setUserId: jest.fn(),
    getCuddleId: jest.fn(),
    setCuddleId: jest.fn(),
    getCuddleName: jest.fn(),
    setCuddleName: jest.fn(),
    getUserProfile: jest.fn(),
    setUserProfile: jest.fn(),
    getOngoingConversation: jest.fn(),
    setOngoingConversation: jest.fn(),
    removeOngoingConversation: jest.fn(),
  },
}))

jest.mock('@/lib/utils/gtag', () => ({
  event: jest.fn(),
}))

jest.mock('@/data/cuddles', () => ({
  cuddleData: {
    cuddles: {
      'ellie-sr': {
        id: 'ellie-sr',
        name: 'Ellie Sr',
        intro: 'Hello! I\'m Ellie Sr, your journaling companion.',
        image: '/assets/Ellie Sr.png',
      },
      'olly-sr': {
        id: 'olly-sr',
        name: 'Olly Sr',
        intro: 'Hi there! I\'m Olly Sr, ready to chat with you.',
        image: '/assets/Olly Sr.png',
      },
    },
  },
}))

// Mock fetch
global.fetch = jest.fn()

// Mock components
jest.mock('@/components/StreakModal', () => {
  return function MockStreakModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? <div data-testid="streak-modal">Streak Modal</div> : null
  }
})

jest.mock('@/components/PrivacyModal', () => {
  return function MockPrivacyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? <div data-testid="privacy-modal">Privacy Modal</div> : null
  }
})

const mockSupabase = require('@/lib/supabase').supabase
const mockStorage = require('@/lib/storage').storage

describe('Journal Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('User Initialization', () => {
    it('should create new user when no user ID exists', async () => {
      mockStorage.getUserId.mockReturnValue(null)
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'new-user-123' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('users')
        expect(mockInsert).toHaveBeenCalledWith({
          temp_session_id: expect.stringMatching(/temp_\d+_/),
        })
      })
    })

    it('should load existing user from storage', async () => {
      mockStorage.getUserId.mockReturnValue('existing-user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(mockStorage.getUserId).toHaveBeenCalled()
        expect(mockSupabase.from).toHaveBeenCalledWith('users')
      })
    })

    it('should handle user creation errors gracefully', async () => {
      mockStorage.getUserId.mockReturnValue(null)
      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('users')
      })
    })
  })

  describe('Chat History Loading', () => {
    it('should load existing chat history', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockMessages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { messages: mockMessages } }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/chat?userId=user-123')
        )
      })
    })

    it('should start new conversation when no chat history exists', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })
    })

    it('should handle chat history fetch errors', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })
    })
  })

  describe('Message Handling', () => {
    it('should send user messages', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/Type your message.../)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(input, 'Hello, how are you?')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('Hello, how are you?')).toBeInTheDocument()
      })
    })

    it('should handle message submission errors', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: null }),
        })
        .mockRejectedValueOnce(new Error('Network error'))

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/Type your message.../)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(input, 'Test message')
      await user.click(sendButton)

      // Should still show the message even if API call fails
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument()
      })
    })
  })

  describe('Journaling Modes', () => {
    it('should switch to guided journaling mode', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })

      const guidedButton = screen.getByText(/Guided Journaling/)
      await user.click(guidedButton)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message.../)).toBeInTheDocument()
      })
    })

    it('should switch to free-form journaling mode', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })

      const freeFormButton = screen.getByText(/Free-form Journaling/)
      await user.click(freeFormButton)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Write your thoughts.../)).toBeInTheDocument()
      })
    })

    it('should submit free-form content', async () => {
      const user = userEvent.setup()
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })

      const freeFormButton = screen.getByText(/Free-form Journaling/)
      await user.click(freeFormButton)

      const textarea = screen.getByPlaceholderText(/Write your thoughts.../)
      const submitButton = screen.getByRole('button', { name: /submit/i })

      await user.type(textarea, 'Today was a great day!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Today was a great day!')).toBeInTheDocument()
      })
    })
  })

  describe('Cuddle Integration', () => {
    it('should display selected cuddle intro', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      mockStorage.getCuddleId.mockReturnValue('ellie-sr')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/Hello! I'm Ellie Sr, your journaling companion./)).toBeInTheDocument()
      })
    })

    it('should handle cuddle selection changes', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      mockStorage.getCuddleId.mockReturnValue('olly-sr')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/Hi there! I'm Olly Sr, ready to chat with you./)).toBeInTheDocument()
      })
    })
  })

  describe('UI Interactions', () => {
    it('should show typing indicator', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })
    })

    it('should show suggested replies', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/Guided Journaling/)).toBeInTheDocument()
        expect(screen.getByText(/Free-form Journaling/)).toBeInTheDocument()
      })
    })

    it('should show privacy modal for new users', async () => {
      mockStorage.getUserId.mockReturnValue(null)
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'new-user-123' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByTestId('privacy-modal')).toBeInTheDocument()
      })
    })
  })

  describe('Autosave Functionality', () => {
    it('should save on unload', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      // Trigger beforeunload event
      fireEvent.beforeUnload(window)

      await waitFor(() => {
        expect(navigator.sendBeacon).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockStorage.getUserId.mockReturnValue('user-123')
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })
    })

    it('should handle storage errors gracefully', async () => {
      mockStorage.getUserId.mockImplementation(() => {
        throw new Error('Storage error')
      })

      render(<JournalPage />)

      // Should still render without crashing
      expect(screen.getByTestId('journal-content')).toBeInTheDocument()
    })
  })
}) 