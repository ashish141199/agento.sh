import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../services/auth.service'

/**
 * Extend FastifyRequest to include userId
 */
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
  }
}

/**
 * Authentication middleware
 * Verifies the access token and adds userId to the request
 * Returns 401 if token is missing or invalid
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      message: 'Unauthorized: Missing or invalid authorization header',
    })
  }

  const token = authHeader.substring(7)
  const payload = verifyAccessToken(token)

  if (!payload) {
    return reply.status(401).send({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
    })
  }

  // Attach userId to request for use in route handlers
  request.userId = payload.userId
}
