'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { notification } from '@/lib/notifications'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { PromptBox } from '@/components/prompt-box'

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

  const handleSubmit = () => {
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
        <Logo asLink href="/" />
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Link href="/get-started">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Main content - centered (with slight upward offset for optical balance) */}
      <main className="flex-1 flex items-center justify-center px-4 pb-16 md:pb-24">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-semibold text-center text-neutral-900 dark:text-neutral-100 mb-8">
            What do you want your agent to do?
          </h1>

          <PromptBox
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleSubmit}
            showSuggestions
            autoFocus
          />
        </div>
      </main>
    </div>
  )
}
