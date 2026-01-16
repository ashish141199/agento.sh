import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { verifyAccessToken } from '../services/auth.service'
import { findAgentByIdWithModel, agentBelongsToUser } from '../db/modules/agent/agent.db'
import {
  findMessagesByAgentId,
  createMessage,
  deleteMessagesByAgentId,
} from '../db/modules/message/message.db'

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
 * Register chat routes
 * @param fastify - Fastify instance
 */
export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || '',
  })

  /**
   * Get chat history for an agent
   * GET /agents/:agentId/chat/messages
   */
  fastify.get('/agents/:agentId/chat/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { agentId } = request.params as { agentId: string }

    const belongsToUser = await agentBelongsToUser(agentId, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const messages = await findMessagesByAgentId(agentId)

    return reply.send({
      success: true,
      message: 'Messages retrieved',
      data: { messages },
    })
  })

  /**
   * Chat with an agent (streaming)
   * POST /agents/:agentId/chat
   */
  fastify.post('/agents/:agentId/chat', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { agentId } = request.params as { agentId: string }
    const { messages } = request.body as { messages: UIMessage[] }

    // Get agent with model
    const agent = await findAgentByIdWithModel(agentId)
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

    // Get the model ID from agent's model, default to openrouter/auto
    const modelId = agent.model?.modelId || 'openrouter/auto'

    // Save the user's message to database
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage && lastUserMessage.role === 'user') {
      const textPart = lastUserMessage.parts?.find(p => p.type === 'text')
      if (textPart && 'text' in textPart) {
        await createMessage({
          agentId,
          content: textPart.text,
          isAgent: false,
        })
      }
    }

    // Set CORS headers manually since we're using raw response
    const origin = request.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000'
    reply.raw.setHeader('Access-Control-Allow-Origin', origin)
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')

    // Stream the response
    const result = streamText({
      model: openrouter.chat(modelId),
      system: agent.systemPrompt || `You are ${agent.name}.`,
      messages: await convertToModelMessages(messages),
      onFinish: async ({ text }) => {
        // Save the agent's response to database
        if (text) {
          await createMessage({
            agentId,
            content: text,
            isAgent: true,
          })
        }
      },
    })

    // Pipe the UI message stream to the response
    result.pipeUIMessageStreamToResponse(reply.raw)
  })

  /**
   * Clear chat history for an agent
   * DELETE /agents/:agentId/chat/messages
   */
  fastify.delete('/agents/:agentId/chat/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { agentId } = request.params as { agentId: string }

    const belongsToUser = await agentBelongsToUser(agentId, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    await deleteMessagesByAgentId(agentId)

    return reply.send({
      success: true,
      message: 'Chat history cleared',
    })
  })
}
