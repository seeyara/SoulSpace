import { storage, STORAGE_KEYS } from '@/lib/storage'
import type { UserProfile, OngoingConversation } from '@/lib/storage'
import type { CuddleId } from '@/types/cuddles'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('Storage Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
    mockLocalStorage.removeItem.mockClear()
    mockLocalStorage.clear.mockClear()
  })

  describe('User ID Management', () => {
    it('should set and retrieve user ID', () => {
      const userId = 'test-user-123'
      mockLocalStorage.setItem.mockReturnValue(undefined)
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(userId))

      const setResult = storage.setUserId(userId)
      const getResult = storage.getUserId()

      expect(setResult).toBe(true)
      expect(getResult).toBe(userId)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ID, JSON.stringify(userId))
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ID)
    })

    it('should remove user ID', () => {
      mockLocalStorage.removeItem.mockReturnValue(undefined)

      const result = storage.removeUserId()

      expect(result).toBe(true)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ID)
    })

    it('should return null for non-existent user ID', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const result = storage.getUserId()

      expect(result).toBe(null)
    })
  })

  describe('Cuddle Management', () => {
    it('should set and retrieve cuddle ID', () => {
      const cuddleId: CuddleId = 'ellie-sr'
      mockLocalStorage.setItem.mockReturnValue(undefined)
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cuddleId))

      const setResult = storage.setCuddleId(cuddleId)
      const getResult = storage.getCuddleId()

      expect(setResult).toBe(true)
      expect(getResult).toBe(cuddleId)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.CUDDLE_ID, JSON.stringify(cuddleId))
    })

    it('should set and retrieve cuddle name', () => {
      const cuddleName = 'Ellie'
      mockLocalStorage.setItem.mockReturnValue(undefined)
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cuddleName))

      const setResult = storage.setCuddleName(cuddleName)
      const getResult = storage.getCuddleName()

      expect(setResult).toBe(true)
      expect(getResult).toBe(cuddleName)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.CUDDLE_NAME, JSON.stringify(cuddleName))
    })
  })

  describe('User Profile Management', () => {
    it('should set and retrieve user profile', () => {
      const profile: UserProfile = {
        name: 'John Doe',
        age: 25,
        interests: ['reading', 'writing'],
      }
      mockLocalStorage.setItem.mockReturnValue(undefined)
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(profile))

      const setResult = storage.setUserProfile(profile)
      const getResult = storage.getUserProfile()

      expect(setResult).toBe(true)
      expect(getResult).toEqual(profile)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile))
    })
  })

  describe('Community Invite Management', () => {
    it('should set and retrieve community invite pending status', () => {
      mockLocalStorage.setItem.mockReturnValue(undefined)
      mockLocalStorage.getItem.mockReturnValue('"true"') // JSON stringified

      const setResult = storage.setCommunityInvitePending(true)
      const getResult = storage.getCommunityInvitePending()

      expect(setResult).toBe(true)
      expect(getResult).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.COMMUNITY_INVITE_PENDING, '"true"')
    })

    it('should handle false community invite status', () => {
      mockLocalStorage.getItem.mockReturnValue('"false"') // JSON stringified

      const result = storage.getCommunityInvitePending()

      expect(result).toBe(false)
    })
  })

  describe('Ongoing Conversation Management', () => {
    it('should set and retrieve ongoing conversation', () => {
      const conversation: OngoingConversation = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        cuddle: 'ellie-sr',
      }
      mockLocalStorage.setItem.mockReturnValue(undefined)
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(conversation))

      const setResult = storage.setOngoingConversation(conversation)
      const getResult = storage.getOngoingConversation()

      expect(setResult).toBe(true)
      expect(getResult).toEqual(conversation)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ONGOING_CONVERSATION, JSON.stringify(conversation))
    })
  })

  describe('Backward Compatibility', () => {
    it('should handle plain string values in localStorage', () => {
      const plainString = 'test-string'
      mockLocalStorage.getItem.mockReturnValue(plainString)

      const result = storage.getUserId()

      expect(result).toBe(plainString)
    })

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{invalid json'
      mockLocalStorage.getItem.mockReturnValue(invalidJson)

      const result = storage.getUserId()

      expect(result).toBe(invalidJson)
    })
  })

  describe('Storage Utility Methods', () => {
    it('should clear all storage data', () => {
      mockLocalStorage.removeItem.mockReturnValue(undefined)

      const result = storage.clearAll()

      expect(result).toBe(true)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(Object.keys(STORAGE_KEYS).length)
    })

    it('should check storage availability', () => {
      mockLocalStorage.setItem.mockReturnValue(undefined)
      mockLocalStorage.removeItem.mockReturnValue(undefined)

      const result = storage.isAvailable()

      expect(result).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('__storage_test__', 'test')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('__storage_test__')
    })

    it('should return false when storage is not available', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage not available')
      })

      const result = storage.isAvailable()

      expect(result).toBe(false)
    })
  })

  describe('SSR Safety', () => {
    it('should handle server-side rendering gracefully', () => {
      const originalWindow = global.window
      // @ts-expect-error - Mocking server-side environment by removing window
      global.window = undefined

      const setResult = storage.setUserId('test')
      const getResult = storage.getUserId()
      const clearResult = storage.clearAll()
      const availableResult = storage.isAvailable()

      expect(setResult).toBe(false)
      expect(getResult).toBe(null)
      expect(clearResult).toBe(false)
      expect(availableResult).toBe(false)

      // Restore window
      global.window = originalWindow
    })
  })
}) 