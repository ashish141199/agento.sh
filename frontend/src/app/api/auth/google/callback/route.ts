import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/**
 * Handle Google OAuth callback
 * Exchanges code for tokens and redirects to app
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/get-started?error=google_auth_failed', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/get-started?error=no_code', request.url))
  }

  try {
    const response = await fetch(`${API_URL}/auth/google/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    const data = await response.json()

    if (!data.success) {
      return NextResponse.redirect(new URL('/get-started?error=auth_failed', request.url))
    }

    const redirectUrl = new URL('/auth/callback', request.url)
    redirectUrl.searchParams.set('accessToken', data.data.accessToken)
    redirectUrl.searchParams.set('user', JSON.stringify(data.data.user))
    redirectUrl.searchParams.set('isNewUser', data.data.isNewUser.toString())

    return NextResponse.redirect(redirectUrl)
  } catch {
    return NextResponse.redirect(new URL('/get-started?error=auth_failed', request.url))
  }
}
