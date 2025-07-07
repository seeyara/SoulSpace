import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JournalPage from '@/app/journal/page'
import Account from '@/app/account/page'

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
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(),
            })),
          })),
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

describe('Journaling Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Complete Guided Journaling Session', () => {
    it('should complete a full guided journaling session', async () => {
      const user = userEvent.setup()
      
      // Setup new user
      mockStorage.getUserId.mockReturnValue(null)
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'new-user-123' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      // Mock chat history as empty (new conversation)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      // Wait for privacy modal to close (simulate user accepting)
      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })

      // Select guided journaling
      const guidedButton = screen.getByText(/Guided Journaling/)
      await user.click(guidedButton)

      // Send first message
      const input = screen.getByPlaceholderText(/Type your message.../)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(input, 'I had a great day today!')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('I had a great day today!')).toBeInTheDocument()
      })

      // Send another message
      await user.type(input, 'I went for a walk in the park.')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('I went for a walk in the park.')).toBeInTheDocument()
      })

      // Verify messages are saved
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('I had a great day today!'),
        })
      )
    })
  })

  describe('Complete Free-form Journaling Session', () => {
    it('should complete a full free-form journaling session', async () => {
      const user = userEvent.setup()
      
      // Setup existing user
      mockStorage.getUserId.mockReturnValue('existing-user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      // Mock chat history as empty
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })

      // Select free-form journaling
      const freeFormButton = screen.getByText(/Free-form Journaling/)
      await user.click(freeFormButton)

      // Write free-form content
      const textarea = screen.getByPlaceholderText(/Write your thoughts.../)
      const submitButton = screen.getByRole('button', { name: /submit/i })

      const journalEntry = `Today was an amazing day! I woke up feeling refreshed and ready to take on the world. 
      I spent time with friends, worked on my projects, and even found time to read a good book. 
      I'm grateful for all the little moments that made today special.`

      await user.type(textarea, journalEntry)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(journalEntry)).toBeInTheDocument()
      })

      // Verify content is saved
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(journalEntry),
        })
      )
    })
  })

  describe('User Journey - New User Onboarding', () => {
    it('should handle new user onboarding flow', async () => {
      const user = userEvent.setup()
      
      // Setup new user
      mockStorage.getUserId.mockReturnValue(null)
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'new-user-123' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      // Mock chat history as empty
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      // Verify privacy modal is shown
      await waitFor(() => {
        expect(screen.getByTestId('privacy-modal')).toBeInTheDocument()
      })

      // Simulate privacy modal close (in real app, user would click accept)
      // For testing, we'll just wait for the intro message
      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })

      // Verify user ID is stored
      expect(mockStorage.setUserId).toHaveBeenCalledWith('new-user-123')
    })
  })

  describe('User Journey - Existing User Return', () => {
    it('should handle existing user return flow', async () => {
      const user = userEvent.setup()
      
      // Setup existing user with previous chat history
      mockStorage.getUserId.mockReturnValue('existing-user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      // Mock existing chat history
      const existingMessages = [
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there! How are you today?' },
      ]
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { messages: existingMessages } }),
      })

      render(<JournalPage />)

      // Verify welcome back message appears
      await waitFor(() => {
        expect(screen.getByText(/Welcome back! Would you like to continue or finish our conversation?/)).toBeInTheDocument()
      })

      // Verify existing messages are loaded
      expect(screen.getByText('Hello!')).toBeInTheDocument()
      expect(screen.getByText('Hi there! How are you today?')).toBeInTheDocument()
    })
  })

  describe('Data Synchronization', () => {
    it('should sync between localStorage and Supabase', async () => {
      const user = userEvent.setup()
      
      // Setup user with cuddle data in localStorage
      mockStorage.getUserId.mockReturnValue('user-123')
      mockStorage.getCuddleId.mockReturnValue('ellie-sr')
      mockStorage.getCuddleName.mockReturnValue('Ellie')
      
      const mockSelect = jest.fn()
        .mockResolvedValueOnce({
          data: { name: 'John Doe' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { cuddle_id: null, cuddle_name: null }, // No data in Supabase
          error: null,
        })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      // Mock chat history
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/Hello! I'm Ellie Sr, your journaling companion./)).toBeInTheDocument()
      })

      // Verify localStorage data is used when Supabase has none
      expect(mockStorage.getCuddleId).toHaveBeenCalled()
      expect(mockStorage.getCuddleName).toHaveBeenCalled()
    })
  })

  describe('Autosave Functionality', () => {
    it('should save data on page unload', async () => {
      const user = userEvent.setup()
      
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })

      // Send a message
      const input = screen.getByPlaceholderText(/Type your message.../)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(input, 'Test message for autosave')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('Test message for autosave')).toBeInTheDocument()
      })

      // Trigger beforeunload event
      fireEvent(window, new Event('beforeunload'))

      // Verify sendBeacon is called for autosave
      await waitFor(() => {
        expect(navigator.sendBeacon).toHaveBeenCalled()
      })
    })
  })

  describe('Error Recovery', () => {
    it('should handle network errors and continue functioning', async () => {
      const user = userEvent.setup()
      
      mockStorage.getUserId.mockReturnValue('user-123')
      const mockSelect = jest.fn().mockResolvedValue({
        data: { name: 'John Doe' },
        error: null,
      })
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      // Mock network error on chat history fetch
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<JournalPage />)

      // Should still show intro message despite network error
      await waitFor(() => {
        expect(screen.getByText(/How would you like to journal today?/)).toBeInTheDocument()
      })

      // Should still allow user interaction
      const guidedButton = screen.getByText(/Guided Journaling/)
      await user.click(guidedButton)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message.../)).toBeInTheDocument()
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

  describe('Cross-Page Data Consistency', () => {
    it('should maintain data consistency between journal and account pages', async () => {
      const user = userEvent.setup()
      
      // Setup user with data
      mockStorage.getUserId.mockReturnValue('user-123')
      mockStorage.getCuddleId.mockReturnValue('ellie-sr')
      mockStorage.getCuddleName.mockReturnValue('Ellie')
      
      const mockSelect = jest.fn()
        .mockResolvedValueOnce({
          data: { name: 'John Doe' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { cuddle_id: 'ellie-sr', cuddle_name: 'Ellie' },
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

      // Mock chat history
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      // Test journal page
      const { unmount } = render(<JournalPage />)

      await waitFor(() => {
        expect(screen.getByText(/Hello! I'm Ellie Sr, your journaling companion./)).toBeInTheDocument()
      })

      unmount()

      // Test account page
      render(<Account />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByAltText('Ellie')).toBeInTheDocument()
      })

      // Verify same user data is used across pages
      expect(mockStorage.getUserId).toHaveBeenCalledTimes(2) // Once for each page
      expect(mockStorage.getCuddleId).toHaveBeenCalled()
      expect(mockStorage.getCuddleName).toHaveBeenCalled()
    })
  })
}) 