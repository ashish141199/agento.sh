'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { notification } from '@/lib/notifications'
import { ArrowUp } from 'lucide-react'
import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/mode-toggle'

/**
 * Public landing page
 * Shows centered prompt box for non-authenticated users
 * Redirects to dashboard for authenticated users
 */
export default function LandingPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [prompt, setPrompt] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)

  // Handle hydration to avoid flash
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isHydrated, isAuthenticated, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    // Store prompt in session storage for after login
    sessionStorage.setItem('agentoo-builder-prompt', prompt.trim())

    // Show notification and redirect to login
    notification.info('Sign in to start building your agent')
    router.push('/get-started')
  }

  // Show nothing while checking auth state
  if (!isHydrated || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-neutral-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0">
        <Logo />
        <ModeToggle />
      </header>

      {/* Main content - centered */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-semibold text-center text-neutral-900 dark:text-neutral-100 mb-8">
            What do you want your agent to do?
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type a message or click a suggestion..."
                rows={3}
                className="w-full px-4 py-4 pr-14 text-base bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="absolute right-3 bottom-3 p-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
