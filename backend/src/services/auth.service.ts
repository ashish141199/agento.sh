import jwt, { type SignOptions } from 'jsonwebtoken'
import {
  findUserByEmail,
  findUserByGoogleId,
  createUser,
  updateUser,
} from '../db/modules/user/user.db'
import {
  createOtpCode,
  findValidOtpCode,
  markOtpAsUsed,
  incrementOtpAttempts,
  deleteAllOtpCodesForEmail,
} from '../db/modules/otp/otp.db'
import {
  createSession,
  findSessionByRefreshToken,
  deleteSessionByRefreshToken,
  deleteAllSessionsForUser,
} from '../db/modules/session/session.db'
import { sendOtpEmail, generateOtpCode } from '../utils/email'
import type { User } from '../db/schema'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * Token payload structure
 */
interface TokenPayload {
  userId: string
  email: string
}

/**
 * Auth tokens structure
 */
interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Request OTP for email authentication
 * @param email - User email address
 */
export async function requestOtp(email: string): Promise<void> {
  const code = generateOtpCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await createOtpCode({
    email: email.toLowerCase(),
    code,
    expiresAt,
  })

  await sendOtpEmail(email, code)
}

/**
 * Verify OTP and authenticate user
 * @param email - User email address
 * @param code - OTP code
 * @param userAgent - Client user agent
 * @param ipAddress - Client IP address
 * @returns User and auth tokens, or null if invalid
 */
export async function verifyOtp(
  email: string,
  code: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ user: User; tokens: AuthTokens; isNewUser: boolean } | null> {
  const otpCode = await findValidOtpCode(email, code)

  if (!otpCode) {
    return null
  }

  if (otpCode.attempts >= 5) {
    return null
  }

  await incrementOtpAttempts(otpCode.id)

  if (otpCode.code !== code) {
    return null
  }

  await markOtpAsUsed(otpCode.id)
  await deleteAllOtpCodesForEmail(email)

  let user = await findUserByEmail(email)
  let isNewUser = false

  if (!user) {
    user = await createUser({
      email: email.toLowerCase(),
      authProvider: 'email',
      emailVerified: true,
    })
    isNewUser = true
  } else if (!user.emailVerified) {
    user = (await updateUser(user.id, { emailVerified: true }))!
  }

  const tokens = await generateTokens(user, userAgent, ipAddress)

  return { user, tokens, isNewUser }
}

/**
 * Authenticate with Google OAuth
 * @param googleUser - Google user data
 * @param userAgent - Client user agent
 * @param ipAddress - Client IP address
 * @returns User and auth tokens
 */
export async function authenticateWithGoogle(
  googleUser: {
    id: string
    email: string
    name: string
    picture?: string
  },
  userAgent?: string,
  ipAddress?: string
): Promise<{ user: User; tokens: AuthTokens; isNewUser: boolean }> {
  let user = await findUserByGoogleId(googleUser.id)
  let isNewUser = false

  if (!user) {
    const existingUser = await findUserByEmail(googleUser.email)

    if (existingUser) {
      user = (await updateUser(existingUser.id, {
        googleId: googleUser.id,
        fullName: existingUser.fullName || googleUser.name,
        imageUrl: existingUser.imageUrl || googleUser.picture,
        emailVerified: true,
      }))!
    } else {
      user = await createUser({
        email: googleUser.email.toLowerCase(),
        fullName: googleUser.name,
        googleId: googleUser.id,
        imageUrl: googleUser.picture,
        authProvider: 'google',
        emailVerified: true,
      })
      isNewUser = true
    }
  }

  const tokens = await generateTokens(user, userAgent, ipAddress)

  return { user, tokens, isNewUser }
}

/**
 * Complete user signup with additional info
 * @param userId - User ID
 * @param fullName - User's full name
 * @returns Updated user
 */
export async function completeSignup(
  userId: string,
  fullName: string
): Promise<User | null> {
  const user = await updateUser(userId, { fullName })
  return user || null
}

/**
 * Refresh access token
 * @param refreshToken - Refresh token
 * @returns New auth tokens or null if invalid
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthTokens | null> {
  const session = await findSessionByRefreshToken(refreshToken)

  if (!session) {
    return null
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as TokenPayload

    const accessToken = jwt.sign(
      { userId: payload.userId, email: payload.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    )

    return { accessToken, refreshToken }
  } catch {
    await deleteSessionByRefreshToken(refreshToken)
    return null
  }
}

/**
 * Logout user by invalidating session
 * @param refreshToken - Refresh token to invalidate
 */
export async function logout(refreshToken: string): Promise<void> {
  await deleteSessionByRefreshToken(refreshToken)
}

/**
 * Logout from all devices
 * @param userId - User ID
 */
export async function logoutAllDevices(userId: string): Promise<void> {
  await deleteAllSessionsForUser(userId)
}

/**
 * Generate access and refresh tokens
 * @param user - User to generate tokens for
 * @param userAgent - Client user agent
 * @param ipAddress - Client IP address
 * @returns Auth tokens
 */
async function generateTokens(
  user: User,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthTokens> {
  const payload: TokenPayload = { userId: user.id, email: user.email }

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' } as SignOptions)
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions)

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await createSession({
    userId: user.id,
    refreshToken,
    userAgent,
    ipAddress,
    expiresAt,
  })

  return { accessToken, refreshToken }
}

/**
 * Verify access token
 * @param token - Access token to verify
 * @returns Token payload or null if invalid
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}
