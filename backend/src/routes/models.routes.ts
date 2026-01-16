import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../services/auth.service'
import { findAllModels } from '../db/modules/model/model.db'

/**
 * Extract user ID from authorization header
 * @param request - Fastify request
 * @returns User ID or null
 */
function getUserId(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.substring(7)
  const payload = verifyAccessToken(token)
  return payload?.userId || null
}

/**
 * Register model routes
 * @param fastify - Fastify instance
 */
export async function modelRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * List all available models
   * GET /models
   */
  fastify.get('/models', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const models = await findAllModels()

    return reply.send({
      success: true,
      message: 'Models retrieved',
      data: { models },
    })
  })
}
