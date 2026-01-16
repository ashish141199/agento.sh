'use client'

import { useAuthGuard } from '@/hooks/use-auth-guard'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/auth.service'
import { useRouter } from 'next/navigation'

/**
 * Main page component
 * Protected route - requires authentication
 */
export default function HomePage() {
  const { isLoading, user } = useAuthGuard()
  const { clearAuth } = useAuthStore()
  const router = useRouter()

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // Ignore logout errors
    }
    clearAuth()
    router.push('/get-started')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50">
      <h1 className="text-4xl font-bold text-neutral-900 mb-4">
        Welcome to Agentoo
      </h1>
      {user && (
        <p className="text-neutral-600 mb-8">
          Hello, {user.fullName || user.email}
        </p>
      )}
      <Button variant="outline" onClick={handleLogout}>
        Sign Out
      </Button>
    </div>
  )
}
