'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Hook to protect routes that require authentication
 * Redirects to /get-started if not authenticated
 * @returns Loading state and authentication status
 */
export function useAuthGuard() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated) {
        router.replace('/get-started')
      } else {
        setIsLoading(false)
      }
    }

    const timeout = setTimeout(checkAuth, 100)

    return () => clearTimeout(timeout)
  }, [isAuthenticated, router])

  return { isLoading, isAuthenticated, user }
}
