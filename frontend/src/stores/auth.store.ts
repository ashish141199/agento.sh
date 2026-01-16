import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * User type
 */
export interface User {
  id: string
  email: string
  fullName: string | null
  imageUrl: string | null
}

/**
 * Auth store state
 */
interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isNewUser: boolean
  setAuth: (user: User, accessToken: string, isNewUser: boolean) => void
  setUser: (user: User) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
}

/**
 * Auth store for managing authentication state
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isNewUser: false,

      setAuth: (user, accessToken, isNewUser) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isNewUser,
        }),

      setUser: (user) =>
        set({ user, isNewUser: false }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isNewUser: false,
        }),
    }),
    {
      name: 'agentoo-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
