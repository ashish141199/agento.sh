import { useAuthStore } from '@/stores/auth.store'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * API response type
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
}

/**
 * Flag to prevent multiple simultaneous refresh attempts
 */
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

/**
 * Attempt to refresh the access token
 * @returns New access token or null if refresh failed
 */
async function refreshAccessToken(): Promise<string | null> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      const newAccessToken = data.data?.accessToken

      if (newAccessToken) {
        // Update the auth store with new token
        useAuthStore.getState().setAccessToken(newAccessToken)
        return newAccessToken
      }

      return null
    } catch {
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Clear auth state and redirect to login
 */
function handleAuthFailure(): void {
  // Clear auth store
  useAuthStore.getState().clearAuth()

  // Clear localStorage completely for auth-related data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('agentoo-auth')

    // Redirect to login page
    window.location.href = '/get-started'
  }
}

/**
 * Fetch wrapper with authentication and automatic token refresh
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @param isRetry - Whether this is a retry after token refresh
 * @returns API response
 */
async function apiFetchWithRetry<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })

  // Handle 401 Unauthorized
  if (response.status === 401 && !isRetry) {
    // Don't try to refresh if this is already the refresh endpoint
    if (endpoint === '/auth/refresh') {
      handleAuthFailure()
      throw new Error('Session expired. Please log in again.')
    }

    // Try to refresh the token
    const newToken = await refreshAccessToken()

    if (newToken) {
      // Retry the original request with the new token
      const retryHeaders: HeadersInit = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      }

      return apiFetchWithRetry<T>(
        endpoint,
        { ...options, headers: retryHeaders },
        true
      )
    } else {
      // Refresh failed, clear auth and redirect
      handleAuthFailure()
      throw new Error('Session expired. Please log in again.')
    }
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred')
  }

  return data
}

/**
 * Fetch wrapper with authentication
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns API response
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  return apiFetchWithRetry<T>(endpoint, options, false)
}

/**
 * API client with authentication
 */
export const api = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, token?: string) =>
    apiFetch<T>(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  /**
   * POST request
   */
  post: <T>(endpoint: string, body?: unknown, token?: string) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  /**
   * PUT request
   */
  put: <T>(endpoint: string, body?: unknown, token?: string) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, body?: unknown, token?: string) =>
    apiFetch<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, token?: string) =>
    apiFetch<T>(endpoint, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
}
