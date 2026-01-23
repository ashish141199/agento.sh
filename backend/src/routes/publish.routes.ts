import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../services/auth.service'
import { agentBelongsToUser, findAgentByIdWithModel } from '../db/modules/agent/agent.db'
import {
  publishAgent,
  unpublishAgent,
  getPublishStatus,
  updateEmbedConfig,
  findAgentByIdOrSlug,
} from '../db/modules/agent/publish.db'
import { findToolsByAgentId } from '../db/modules/tool/tool.db'
import { findModelById } from '../db/modules/model/model.db'
import { updateEmbedConfigSchema } from '../schemas/publish.schema'
import { DEFAULT_EMBED_CONFIG } from '../config/defaults'

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
 * Register publish routes
 * @param fastify - Fastify instance
 */
export async function publishRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get publish status for an agent
   * GET /agents/:id/publish-status
   */
  fastify.get('/agents/:id/publish-status', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { id } = request.params as { id: string }

    const belongsToUser = await agentBelongsToUser(id, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const status = await getPublishStatus(id)
    if (!status) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    // Get additional info for the publish modal
    const agent = await findAgentByIdWithModel(id)
    const tools = await findToolsByAgentId(id)
    const enabledToolsCount = tools.filter(t => t.agentEnabled !== false).length

    return reply.send({
      success: true,
      message: 'Publish status retrieved',
      data: {
        isPublished: status.isPublished,
        hasChanges: status.hasChanges,
        slug: status.slug,
        publishedAt: status.publishedAt,
        toolsCount: enabledToolsCount,
        modelName: agent?.model?.name || null,
        embedConfig: agent?.embedConfig || DEFAULT_EMBED_CONFIG,
      },
    })
  })

  /**
   * Publish an agent
   * POST /agents/:id/publish
   */
  fastify.post('/agents/:id/publish', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { id } = request.params as { id: string }

    const belongsToUser = await agentBelongsToUser(id, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const agent = await publishAgent(id)
    if (!agent) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    return reply.send({
      success: true,
      message: 'Agent published',
      data: {
        slug: agent.slug,
        publishedAt: agent.publishedAt,
      },
    })
  })

  /**
   * Unpublish an agent
   * POST /agents/:id/unpublish
   */
  fastify.post('/agents/:id/unpublish', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { id } = request.params as { id: string }

    const belongsToUser = await agentBelongsToUser(id, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const agent = await unpublishAgent(id)
    if (!agent) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    return reply.send({
      success: true,
      message: 'Agent unpublished',
    })
  })

  /**
   * Update embed config for an agent
   * PATCH /agents/:id/embed-config
   */
  fastify.patch('/agents/:id/embed-config', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { id } = request.params as { id: string }

    const belongsToUser = await agentBelongsToUser(id, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const result = updateEmbedConfigSchema.safeParse(request.body)
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    const agent = await updateEmbedConfig(id, result.data)
    if (!agent) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    return reply.send({
      success: true,
      message: 'Embed config updated',
      data: {
        embedConfig: agent.embedConfig,
      },
    })
  })

  /**
   * Get a published agent by ID or slug (PUBLIC - no auth required)
   * GET /chat/:identifier
   * Accepts either an agent UUID or a slug
   */
  fastify.get('/chat/:slug', async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug: identifier } = request.params as { slug: string }

    const agent = await findAgentByIdOrSlug(identifier)

    if (!agent) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    if (!agent.isPublished) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    // Get model info if available
    let modelName = null
    if (agent.modelId) {
      const model = await findModelById(agent.modelId)
      modelName = model?.name || null
    }

    return reply.send({
      success: true,
      message: 'Agent retrieved',
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          slug: agent.slug,
          modelName,
        },
      },
    })
  })
}
