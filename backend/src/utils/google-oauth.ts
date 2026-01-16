const GOOGLE_CLIENT_ID = process.env.GOOGLE_AUTH_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_AUTH_CLIENT_SECRET!
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

/**
 * Google user info structure
 */
export interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture?: string
}

/**
 * Google token response structure
 */
interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  refresh_token?: string
}

/**
 * Google user info response structure
 */
interface GoogleUserInfoResponse {
  id: string
  email: string
  name: string
  picture?: string
}

/**
 * Get Google OAuth authorization URL
 * @returns Authorization URL
 */
export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${FRONTEND_URL}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from Google
 * @returns Access token
 */
export async function exchangeCodeForTokens(code: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${FRONTEND_URL}/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens')
  }

  const data = (await response.json()) as GoogleTokenResponse
  return data.access_token
}

/**
 * Get Google user info from access token
 * @param accessToken - Google access token
 * @returns User info
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Failed to get Google user info')
  }

  const data = (await response.json()) as GoogleUserInfoResponse
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
  }
}
