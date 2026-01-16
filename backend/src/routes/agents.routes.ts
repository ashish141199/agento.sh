import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../services/auth.service'
import {
  findAgentsByUserId,
  findAgentById,
  findAgentByIdWithModel,
  createAgent,
  updateAgent,
  deleteAgent,
  agentBelongsToUser,
  generateSystemPrompt,
} from '../db/modules/agent/agent.db'
import {
  createAgentSchema,
  updateAgentSchema,
  listAgentsSchema,
} from '../schemas/agent.schema'

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
 * Register agent routes
 * @param fastify - Fastify instance
 */
export async function agentRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * List all agents for the current user
   * GET /agents
   */
  fastify.get('/agents', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const query = request.query as Record<string, string>
    const result = listAgentsSchema.safeParse(query)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    const agents = await findAgentsByUserId(userId, result.data)

    return reply.send({
      success: true,
      message: 'Agents retrieved',
      data: { agents },
    })
  })

  /**
   * Get a specific agent
   * GET /agents/:id
   */
  fastify.get('/agents/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { id } = request.params as { id: string }

    const agent = await findAgentByIdWithModel(id)

    if (!agent) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    if (agent.userId !== userId) {
      return reply.status(403).send({
        success: false,
        message: 'Forbidden',
      })
    }

    return reply.send({
      success: true,
      message: 'Agent retrieved',
      data: { agent },
    })
  })

  /**
   * Create a new agent
   * POST /agents
   */
  fastify.post('/agents', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const result = createAgentSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    const agent = await createAgent({
      ...result.data,
      userId,
    })

    return reply.status(201).send({
      success: true,
      message: 'Agent created',
      data: { agent },
    })
  })

  /**
   * Update an agent
   * PATCH /agents/:id
   */
  fastify.patch('/agents/:id', async (request: FastifyRequest, reply: FastifyReply) => {
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

    const result = updateAgentSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    // If instructionsConfig is provided, regenerate the system prompt
    const updateData: Record<string, unknown> = { ...result.data }
    if (result.data.instructionsConfig || result.data.name || result.data.description !== undefined) {
      const existingAgent = await findAgentById(id)
      if (existingAgent) {
        const name = result.data.name || existingAgent.name
        const description = result.data.description !== undefined ? result.data.description : existingAgent.description
        const instructionsConfig = result.data.instructionsConfig || existingAgent.instructionsConfig
        updateData.systemPrompt = generateSystemPrompt(name, description, instructionsConfig)
      }
    }

    const agent = await updateAgent(id, updateData)

    // Return agent with model details
    const agentWithModel = await findAgentByIdWithModel(id)

    return reply.send({
      success: true,
      message: 'Agent updated',
      data: { agent: agentWithModel || agent },
    })
  })

  /**
   * Delete an agent
   * DELETE /agents/:id
   */
  fastify.delete('/agents/:id', async (request: FastifyRequest, reply: FastifyReply) => {
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

    await deleteAgent(id)

    return reply.send({
      success: true,
      message: 'Agent deleted',
    })
  })
}
