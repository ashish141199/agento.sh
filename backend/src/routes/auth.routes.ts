import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  requestOtp,
  verifyOtp,
  authenticateWithGoogle,
  completeSignup,
  refreshAccessToken,
  logout,
  verifyAccessToken,
} from '../services/auth.service'
import {
  requestOtpSchema,
  verifyOtpSchema,
  completeSignupSchema,
  googleCallbackSchema,
  refreshTokenSchema,
} from '../schemas/auth.schema'
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
} from '../utils/google-oauth'
import { findUserById } from '../db/modules/user/user.db'

/**
 * Register authentication routes
 * @param fastify - Fastify instance
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Request OTP for email authentication
   * POST /auth/otp/request
   */
  fastify.post('/auth/otp/request', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = requestOtpSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    try {
      await requestOtp(result.data.email)
      return reply.send({
        success: true,
        message: 'OTP sent to your email',
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        success: false,
        message: 'Failed to send OTP',
      })
    }
  })

  /**
   * Verify OTP and authenticate
   * POST /auth/otp/verify
   */
  fastify.post('/auth/otp/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = verifyOtpSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    const { email, code } = result.data
    const userAgent = request.headers['user-agent']
    const ipAddress = request.ip

    const authResult = await verifyOtp(email, code, userAgent, ipAddress)

    if (!authResult) {
      return reply.status(401).send({
        success: false,
        message: 'Invalid or expired OTP',
      })
    }

    reply.setCookie('refreshToken', authResult.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return reply.send({
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          fullName: authResult.user.fullName,
          imageUrl: authResult.user.imageUrl,
        },
        accessToken: authResult.tokens.accessToken,
        isNewUser: authResult.isNewUser,
      },
    })
  })

  /**
   * Get Google OAuth URL
   * GET /auth/google
   */
  fastify.get('/auth/google', async (_request: FastifyRequest, reply: FastifyReply) => {
    const url = getGoogleAuthUrl()
    return reply.send({
      success: true,
      message: 'Google auth URL generated',
      data: { url },
    })
  })

  /**
   * Google OAuth callback
   * POST /auth/google/callback
   */
  fastify.post('/auth/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = googleCallbackSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    try {
      const accessToken = await exchangeCodeForTokens(result.data.code)
      const googleUser = await getGoogleUserInfo(accessToken)
      const userAgent = request.headers['user-agent']
      const ipAddress = request.ip

      const authResult = await authenticateWithGoogle(googleUser, userAgent, ipAddress)

      reply.setCookie('refreshToken', authResult.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })

      return reply.send({
        success: true,
        message: 'Authentication successful',
        data: {
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            fullName: authResult.user.fullName,
            imageUrl: authResult.user.imageUrl,
          },
          accessToken: authResult.tokens.accessToken,
          isNewUser: authResult.isNewUser,
        },
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(401).send({
        success: false,
        message: 'Google authentication failed',
      })
    }
  })

  /**
   * Complete signup with additional info
   * POST /auth/complete-signup
   */
  fastify.post('/auth/complete-signup', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)

    if (!payload) {
      return reply.status(401).send({
        success: false,
        message: 'Invalid token',
      })
    }

    const result = completeSignupSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    const user = await completeSignup(payload.userId, result.data.fullName)

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
      })
    }

    return reply.send({
      success: true,
      message: 'Signup completed',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          imageUrl: user.imageUrl,
        },
      },
    })
  })

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  fastify.post('/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken

    if (!refreshToken) {
      return reply.status(401).send({
        success: false,
        message: 'No refresh token',
      })
    }

    const tokens = await refreshAccessToken(refreshToken)

    if (!tokens) {
      reply.clearCookie('refreshToken')
      return reply.status(401).send({
        success: false,
        message: 'Invalid refresh token',
      })
    }

    return reply.send({
      success: true,
      message: 'Token refreshed',
      data: { accessToken: tokens.accessToken },
    })
  })

  /**
   * Get current user
   * GET /auth/me
   */
  fastify.get('/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)

    if (!payload) {
      return reply.status(401).send({
        success: false,
        message: 'Invalid token',
      })
    }

    const user = await findUserById(payload.userId)

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'User not found',
      })
    }

    return reply.send({
      success: true,
      message: 'User retrieved',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          imageUrl: user.imageUrl,
        },
      },
    })
  })

  /**
   * Logout
   * POST /auth/logout
   */
  fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken

    if (refreshToken) {
      await logout(refreshToken)
    }

    reply.clearCookie('refreshToken')

    return reply.send({
      success: true,
      message: 'Logged out successfully',
    })
  })
}
