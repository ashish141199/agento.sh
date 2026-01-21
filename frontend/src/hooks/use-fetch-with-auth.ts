/**
 * useFetchWithAuth Hook
 * Creates a fetch function with automatic auth token handling
 * @module hooks/use-fetch-with-auth
 */

import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { refreshAccessToken, handleAuthFailure } from '@/lib/api'

/**
 * Creates a fetch function that automatically handles auth tokens and refresh
 * @returns Fetch function that includes auth headers and handles 401 errors
 */
export function useFetchWithAuth() {
  return useCallback(async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const currentToken = useAuthStore.getState().accessToken

    const headers = new Headers(init?.headers)
    headers.set('Authorization', `Bearer ${currentToken}`)

    const response = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    })

    // Handle 401 by refreshing token and retrying
    if (response.status === 401) {
      const newToken = await refreshAccessToken()

      if (newToken) {
        const retryHeaders = new Headers(init?.headers)
        retryHeaders.set('Authorization', `Bearer ${newToken}`)

        return fetch(url, {
          ...init,
          headers: retryHeaders,
          credentials: 'include',
        })
      } else {
        handleAuthFailure()
        throw new Error('Session expired. Please log in again.')
      }
    }

    return response
  }, [])
}
