import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { streamText, convertToModelMessages, tool, type UIMessage, type ToolSet, stepCountIs } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware'
import { findAgentBySlug } from '../db/modules/agent/publish.db'
import { findAgentByIdWithModel } from '../db/modules/agent/agent.db'
import { findToolsByAgentId, type ToolWithAssignment } from '../db/modules/tool/tool.db'
import {
  createConversation,
  findConversationById,
  findConversationsByAgentAndUser,
  findMessagesByConversationId,
  createConversationMessage,
  updateConversationMessage,
  conversationBelongsToUser,
  updateConversationTitle,
  deleteConversation,
} from '../db/modules/conversation/conversation.db'
import { createToolCall } from '../db/modules/tool-call/tool-call.db'
import { createAiUsage } from '../db/modules/ai-usage/ai-usage.db'
import type { ApiConnectorConfig, ApiConnectorAuth } from '../db/schema/tools'

/**
 * Build authentication headers for API connector
 */
function buildAuthHeaders(auth?: ApiConnectorAuth): Record<string, string> {
  if (!auth || auth.type === 'none') return {}

  switch (auth.type) {
    case 'bearer':
      return auth.token ? { Authorization: `Bearer ${auth.token}` } : {}
    case 'api_key':
      return auth.apiKey ? { 'X-API-Key': auth.apiKey } : {}
    case 'basic':
      if (auth.username && auth.password) {
        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
        return { Authorization: `Basic ${credentials}` }
      }
      return {}
    default:
      return {}
  }
}

/**
 * Execute an API connector tool
 */
async function executeApiConnector(
  config: ApiConnectorConfig,
  body?: string
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(config.authentication),
  }

  if (config.headers) {
    for (const header of config.headers) {
      headers[header.key] = header.value
    }
  }

  const fetchOptions: RequestInit = {
    method: config.method,
    headers,
  }

  if (['POST', 'PUT', 'PATCH'].includes(config.method)) {
    fetchOptions.body = body || config.body || undefined
  }

  const response = await fetch(config.url, fetchOptions)

  let data: unknown
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  return { status: response.status, data }
}

/**
 * Sanitize tool name to match OpenAI's pattern
 */
function sanitizeToolName(name: string): string {
  return name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .replace(/^[^a-zA-Z]+/, '')
    || 'tool'
}

/**
 * Create a single AI SDK tool from a database tool config
 */
function createApiConnectorTool(config: ApiConnectorConfig, description: string, title: string) {
  return tool({
    description,
    title,
    inputSchema: z.object({
      body: z.string().optional().describe('Optional JSON body to send with the request'),
    }),
    execute: async ({ body }: { body?: string }) => {
      try {
        const result = await executeApiConnector(config, body)
        return result
      } catch (error) {
        return {
          status: 500,
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },
  })
}

/**
 * Build a map from sanitized tool name to original display title
 */
function buildToolTitleMap(dbTools: ToolWithAssignment[]): Record<string, string> {
  const titleMap: Record<string, string> = {}
  for (const dbTool of dbTools) {
    if (!dbTool.enabled || dbTool.agentEnabled === false) continue
    const sanitizedName = sanitizeToolName(dbTool.name)
    titleMap[sanitizedName] = dbTool.name
  }
  return titleMap
}

/**
 * Build AI SDK tools from database tools
 */
function buildAiSdkTools(dbTools: ToolWithAssignment[]): ToolSet {
  const aiTools: ToolSet = {}

  for (const dbTool of dbTools) {
    if (!dbTool.enabled || dbTool.agentEnabled === false) continue

    const config = dbTool.config as ApiConnectorConfig
    const description = dbTool.description || `API call to ${config.url}`
    const toolName = sanitizeToolName(dbTool.name)
    const title = dbTool.name

    aiTools[toolName] = createApiConnectorTool(config, description, title)
  }

  return aiTools
}

/**
 * Generate a title from the first message
 */
function generateTitle(message: string): string {
  // Take first 50 chars and clean up
  const title = message.slice(0, 50).trim()
  return title.length < message.length ? `${title}...` : title
}

/**
 * Register conversation routes for public chat
 */
export async function conversationRoutes(fastify: FastifyInstance): Promise<void> {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || '',
  })

  /**
   * List conversations for a published agent
   * GET /chat/:slug/conversations
   */
  fastify.get('/chat/:slug/conversations', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
    const { slug } = request.params as { slug: string }

    const agent = await findAgentBySlug(slug)
    if (!agent || !agent.isPublished) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const conversationList = await findConversationsByAgentAndUser(agent.id, userId)

    return reply.send({
      success: true,
      message: 'Conversations retrieved',
      data: { conversations: conversationList },
    })
  })

  /**
   * Create a new conversation
   * POST /chat/:slug/conversations
   */
  fastify.post('/chat/:slug/conversations', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
    const { slug } = request.params as { slug: string }

    const agent = await findAgentBySlug(slug)
    if (!agent || !agent.isPublished) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const conversation = await createConversation({
      agentId: agent.id,
      userId,
    })

    return reply.send({
      success: true,
      message: 'Conversation created',
      data: { conversation },
    })
  })

  /**
   * Get messages for a conversation
   * GET /conversations/:conversationId/messages
   */
  fastify.get('/conversations/:conversationId/messages', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
    const { conversationId } = request.params as { conversationId: string }

    const belongsToUser = await conversationBelongsToUser(conversationId, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Conversation not found',
      })
    }

    const messageList = await findMessagesByConversationId(conversationId)

    return reply.send({
      success: true,
      message: 'Messages retrieved',
      data: { messages: messageList },
    })
  })

  /**
   * Delete a conversation
   * DELETE /conversations/:conversationId
   */
  fastify.delete('/conversations/:conversationId', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
    const { conversationId } = request.params as { conversationId: string }

    const belongsToUser = await conversationBelongsToUser(conversationId, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Conversation not found',
      })
    }

    await deleteConversation(conversationId)

    return reply.send({
      success: true,
      message: 'Conversation deleted',
    })
  })

  /**
   * Chat in a conversation (streaming)
   * POST /conversations/:conversationId/chat
   */
  fastify.post('/conversations/:conversationId/chat', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
    const { conversationId } = request.params as { conversationId: string }
    const { messages } = request.body as { messages: UIMessage[] }

    // Check conversation ownership
    const belongsToUser = await conversationBelongsToUser(conversationId, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Conversation not found',
      })
    }

    // Get conversation to find agent
    const conversation = await findConversationById(conversationId)
    if (!conversation) {
      return reply.status(404).send({
        success: false,
        message: 'Conversation not found',
      })
    }

    // Get agent with model
    const agent = await findAgentByIdWithModel(conversation.agentId)
    if (!agent || !agent.isPublished) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const modelId = agent.model?.modelId || 'openrouter/auto'

    // Get the agent's tools
    const dbTools = await findToolsByAgentId(conversation.agentId)
    const agentTools = buildAiSdkTools(dbTools)
    const toolTitleMap = buildToolTitleMap(dbTools)

    // Save the user's message to database
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage && lastUserMessage.role === 'user') {
      const textPart = lastUserMessage.parts?.find(p => p.type === 'text')
      if (textPart && 'text' in textPart) {
        await createConversationMessage({
          agentId: conversation.agentId,
          conversationId,
          userId,
          content: textPart.text,
          isAgent: false,
        })

        // Set title from first message if not set
        if (!conversation.title) {
          await updateConversationTitle(conversationId, generateTitle(textPart.text))
        }
      }
    }

    // Set CORS headers
    const origin = request.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000'
    reply.raw.setHeader('Access-Control-Allow-Origin', origin)
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')

    // Create the assistant message first (with empty content) so we can log usage against it
    // This avoids FK constraint violation when logging usage in onStepFinish
    const assistantMessage = await createConversationMessage({
      agentId: conversation.agentId,
      conversationId,
      content: '', // Will be updated in onFinish
      isAgent: true,
      model: modelId,
    })
    const messageId = assistantMessage!.id

    // Track usage across all steps
    let totalPromptTokens = 0
    let totalCompletionTokens = 0
    let totalCost = 0
    let stepNumber = 0

    // Stream the response
    const result = streamText({
      model: openrouter.chat(modelId),
      system: agent.systemPrompt || `You are ${agent.name}.`,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(25),
      tools: Object.keys(agentTools).length > 0 ? agentTools : undefined,
      onStepFinish: async ({ toolCalls: stepToolCalls, toolResults, usage, providerMetadata }) => {
        stepNumber++

        // Determine step type based on whether there are tool calls
        const stepType = stepToolCalls && stepToolCalls.length > 0 ? 'tool-call' : stepNumber === 1 ? 'initial' : 'continue'

        // Log AI usage for this step
        if (usage) {
          const promptTokens = usage.inputTokens ?? 0
          const completionTokens = usage.outputTokens ?? 0
          // Cost is in providerMetadata.openrouter.usage.cost
          const openrouterMeta = providerMetadata?.openrouter as { usage?: { cost?: number } } | undefined
          const cost = openrouterMeta?.usage?.cost ?? 0
          console.log('[conversation] Step cost from providerMetadata:', cost)

          totalPromptTokens += promptTokens
          totalCompletionTokens += completionTokens
          totalCost += cost

          try {
            await createAiUsage({
              messageId,
              agentId: conversation.agentId,
              conversationId,
              stepNumber,
              stepType,
              model: modelId,
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
              cost,
              cachedTokens: usage.inputTokenDetails?.cacheReadTokens ?? null,
              reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? null,
            })
          } catch (error) {
            console.error('[conversation] Failed to log AI usage:', error)
          }
        }

        // Log tool calls for this step
        if (stepToolCalls && stepToolCalls.length > 0) {
          for (const tc of stepToolCalls) {
            const tcResult = toolResults?.find((r) => r.toolCallId === tc.toolCallId)

            try {
              await createToolCall({
                id: tc.toolCallId,
                messageId,
                agentId: conversation.agentId,
                conversationId,
                stepNumber,
                toolName: tc.toolName,
                toolTitle: toolTitleMap[tc.toolName] || tc.toolName,
                toolCallId: tc.toolCallId,
                input: tc.input as Record<string, unknown>,
                output: tcResult?.output as Record<string, unknown> | undefined,
                status: tcResult ? 'success' : 'pending',
              })
            } catch (error) {
              console.error('[conversation] Failed to log tool call:', error)
            }
          }
        }
      },
      onFinish: async (finishData) => {
        const { text, providerMetadata } = finishData
        // Get total cost from providerMetadata (fallback to accumulated cost)
        const openrouterMeta = providerMetadata?.openrouter as { usage?: { cost?: number } } | undefined
        const finalCost = openrouterMeta?.usage?.cost ?? totalCost
        console.log('[conversation] Final cost from providerMetadata:', finalCost)
        // Update the message with final content and usage totals
        await updateConversationMessage(messageId, {
          content: text || '',
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          totalTokens: totalPromptTokens + totalCompletionTokens,
          cost: finalCost,
        })
      },
    })

    result.pipeUIMessageStreamToResponse(reply.raw)
  })
}
