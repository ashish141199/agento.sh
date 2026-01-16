import { api } from '@/lib/api'
import type { User } from '@/stores/auth.store'

/**
 * Auth response type
 */
interface AuthResponse {
  user: User
  accessToken: string
  isNewUser: boolean
}

/**
 * Auth service for authentication operations
 */
export const authService = {
  /**
   * Request OTP for email
   * @param email - User email address
   */
  requestOtp: (email: string) =>
    api.post<void>('/auth/otp/request', { email }),

  /**
   * Verify OTP code
   * @param email - User email address
   * @param code - OTP code
   */
  verifyOtp: (email: string, code: string) =>
    api.post<AuthResponse>('/auth/otp/verify', { email, code }),

  /**
   * Get Google OAuth URL
   */
  getGoogleAuthUrl: () =>
    api.get<{ url: string }>('/auth/google'),

  /**
   * Handle Google OAuth callback
   * @param code - Authorization code
   */
  googleCallback: (code: string) =>
    api.post<AuthResponse>('/auth/google/callback', { code }),

  /**
   * Complete signup with full name
   * @param fullName - User's full name
   * @param token - Access token
   */
  completeSignup: (fullName: string, token: string) =>
    api.post<{ user: User }>('/auth/complete-signup', { fullName }, token),

  /**
   * Refresh access token
   */
  refreshToken: () =>
    api.post<{ accessToken: string }>('/auth/refresh'),

  /**
   * Get current user
   * @param token - Access token
   */
  getMe: (token: string) =>
    api.get<{ user: User }>('/auth/me', token),

  /**
   * Logout
   */
  logout: () =>
    api.post<void>('/auth/logout'),
}
