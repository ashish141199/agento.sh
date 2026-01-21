/**
 * Builder Routes Module
 * Handles API endpoints for the Agent Builder assistant
 * @module routes/builder
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { streamText, convertToModelMessages, type UIMessage, stepCountIs } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { authMiddleware } from '../middleware/auth.middleware'
import {
  getBuilderMessages,
  saveBuilderConversation,
  type UIMessage as DBUIMessage,
} from '../db/modules/builder/builder.db'
import { findAgentByIdWithModel } from '../db/modules/agent/agent.db'
import { findToolsByAgentId } from '../db/modules/tool/tool.db'
import {
  createBuilderTools,
  generateBuilderSystemPrompt,
  type BuilderToolContext,
} from '../services/builder'

/**
 * Verifies that an agent belongs to a user
 * @param agentId - The agent ID to verify
 * @param userId - The user ID to check against
 * @returns True if agent belongs to user, false otherwise
 */
async function verifyAgentOwnership(agentId: string, userId: string): Promise<boolean> {
  const agent = await findAgentByIdWithModel(agentId)
  return agent !== null && agent !== undefined && agent.userId === userId
}

/**
 * Pipes a Web Response body to a Fastify reply
 * @param webResponse - The Web Response to pipe
 * @param reply - The Fastify reply object
 */
async function pipeWebResponseToFastify(
  webResponse: Response,
  reply: FastifyReply
): Promise<void> {
  // Set headers from the Web Response
  webResponse.headers.forEach((value, key) => {
    reply.raw.setHeader(key, value)
  })
  reply.raw.statusCode = webResponse.status

  // Pipe the body
  if (webResponse.body) {
    const reader = webResponse.body.getReader()
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read()
      if (done) {
        reply.raw.end()
        return
      }
      reply.raw.write(value)
      return pump()
    }
    await pump()
  } else {
    reply.raw.end()
  }
}

/**
 * Sets CORS headers on the reply
 * @param request - The Fastify request
 * @param reply - The Fastify reply
 */
function setCorsHeaders(request: FastifyRequest, reply: FastifyReply): void {
  const origin = request.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000'
  reply.raw.setHeader('Access-Control-Allow-Origin', origin)
  reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')
}

/**
 * Register builder routes
 * @param fastify - Fastify instance
 */
export async function builderRoutes(fastify: FastifyInstance): Promise<void> {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || '',
  })

  /**
   * Get builder messages for an agent or new agent creation
   * GET /builder/messages?agentId=xxx
   */
  fastify.get(
    '/builder/messages',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId } = request.query as { agentId?: string }

      // Verify agent belongs to user if agentId provided
      if (agentId && !(await verifyAgentOwnership(agentId, userId))) {
        return reply.status(403).send({
          success: false,
          message: 'Forbidden',
        })
      }

      const messages = await getBuilderMessages(userId, agentId)

      return reply.send({
        success: true,
        message: 'Messages retrieved',
        data: {
          messages,
          agentId: agentId || null,
        },
      })
    }
  )

  /**
   * Chat with the builder agent (streaming)
   * POST /builder/chat
   */
  fastify.post(
    '/builder/chat',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { messages, agentId } = request.body as {
        messages: UIMessage[]
        agentId?: string | null
      }

      // Create mutable context for tools
      const context: BuilderToolContext = {
        userId,
        currentAgentId: agentId || null,
      }

      // Verify agent belongs to user if agentId provided
      if (context.currentAgentId && !(await verifyAgentOwnership(context.currentAgentId, userId))) {
        return reply.status(403).send({
          success: false,
          message: 'Forbidden',
        })
      }

      // Generate system prompt with current context
      const systemPrompt = await generateBuilderSystemPrompt(context.currentAgentId, userId)

      // Set CORS headers
      setCorsHeaders(request, reply)

      // Create builder tools with context
      const builderTools = createBuilderTools(context)

      // Stream the response
      const result = streamText({
        model: openrouter.chat('anthropic/claude-sonnet-4'),
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
        tools: builderTools,
        stopWhen: stepCountIs(5),
      })

      // Create the UI message stream response with proper message persistence
      const webResponse = result.toUIMessageStreamResponse({
        originalMessages: messages,
        onFinish: async ({ messages: allMessages }) => {
          // Save the complete conversation state
          // This includes all messages with their parts in the correct order
          // and includes tool outputs from client-side tools like askUser
          await saveBuilderConversation(
            userId,
            context.currentAgentId,
            allMessages as DBUIMessage[]
          )
        },
      })

      // Pipe the Web Response to Fastify
      await pipeWebResponseToFastify(webResponse, reply)
    }
  )

  /**
   * Get current agent data for builder context
   * GET /builder/agent?agentId=xxx
   */
  fastify.get(
    '/builder/agent',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId } = request.query as { agentId?: string }

      if (!agentId) {
        return reply.send({
          success: true,
          message: 'No agent specified',
          data: { agent: null },
        })
      }

      if (!(await verifyAgentOwnership(agentId, userId))) {
        return reply.status(403).send({
          success: false,
          message: 'Forbidden',
        })
      }

      const agent = await findAgentByIdWithModel(agentId)
      const tools = await findToolsByAgentId(agentId)

      return reply.send({
        success: true,
        message: 'Agent retrieved',
        data: {
          agent,
          tools,
        },
      })
    }
  )
}
