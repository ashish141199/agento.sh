import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Public routes that don't require authentication
 */
const publicRoutes = ['/get-started', '/auth/callback', '/api/auth']

/**
 * Middleware to handle authentication
 * Redirects unauthenticated users to /get-started
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route)
  )

  if (isPublicRoute) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
