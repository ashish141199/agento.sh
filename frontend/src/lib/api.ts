const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/**
 * API response type
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
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

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred')
  }

  return data
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
   * DELETE request
   */
  delete: <T>(endpoint: string, token?: string) =>
    apiFetch<T>(endpoint, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
}
