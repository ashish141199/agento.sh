'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore, type User } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authService } from '@/services/auth.service'

/**
 * Auth callback page
 * Handles OAuth callback and completes signup if needed
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth, setUser } = useAuthStore()

  const [needsName, setNeedsName] = useState(false)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accessToken, setAccessToken] = useState('')

  useEffect(() => {
    const token = searchParams.get('accessToken')
    const userStr = searchParams.get('user')
    const isNewUser = searchParams.get('isNewUser') === 'true'

    if (!token || !userStr) {
      router.push('/get-started')
      return
    }

    try {
      const user = JSON.parse(userStr) as User
      setAccessToken(token)

      if (isNewUser && !user.fullName) {
        setNeedsName(true)
      } else {
        setAuth(user, token, false)
        router.push('/')
      }
    } catch {
      router.push('/get-started')
    }
  }, [searchParams, router, setAuth])

  /**
   * Handle name submission
   */
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authService.completeSignup(fullName, accessToken)

      if (response.data) {
        setAuth(response.data.user, accessToken, false)
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete signup')
    } finally {
      setLoading(false)
    }
  }

  if (!needsName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Completing sign in...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Agentoo</CardTitle>
          <CardDescription>What should we call you?</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || fullName.length < 2}>
              {loading ? 'Completing...' : 'Get Started'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
