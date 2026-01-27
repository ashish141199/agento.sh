/**
 * Builder Routes Module
 * Handles API endpoints for the Agent Builder assistant
 * @module routes/builder
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { streamText, stepCountIs, type ModelMessage } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { authMiddleware } from '../middleware/auth.middleware'
import {
  getBuilderMessages,
  getMessageHistoryForAI,
  saveUserMessage,
  saveAssistantMessage,
  saveToolResultMessage,
  type MessagePart,
} from '../db/modules/builder/builder.db'
import { builderChatRequestSchema } from '../schemas/builder.schema'
import { createBuilderUsage } from '../db/modules/builder-usage/builder-usage.db'
import { findAgentByIdWithModel } from '../db/modules/agent/agent.db'
import { findToolsByAgentId } from '../db/modules/tool/tool.db'
import {
  createBuilderTools,
  generateBuilderSystemPrompt,
  type BuilderToolContext,
} from '../services/builder'
import type { UIMessage } from '../db/modules/builder/builder.db'

/**
 * Custom conversion of our stored UIMessages to ModelMessages
 * The AI SDK's convertToModelMessages doesn't handle our stored format correctly
 *
 * AI SDK ModelMessage expects:
 * - ToolCallPart: { type: 'tool-call', toolCallId, toolName, input }
 * - ToolResultPart: { type: 'tool-result', toolCallId, toolName, output: { type: 'json', value } }
 */
function convertStoredMessagesToModelMessages(messages: UIMessage[]): ModelMessage[] {
  const modelMessages: ModelMessage[] = []

  for (const msg of messages) {
    if (msg.role === 'user') {
      // Check if this is a tool result message (no text content, has tool-result parts)
      const toolResultParts = msg.parts?.filter(p => p.type === 'tool-result') || []
      const textParts = msg.parts?.filter(p => p.type === 'text') || []

      if (toolResultParts.length > 0) {
        // This is a tool result message - convert to 'tool' role messages
        for (const part of toolResultParts) {
          const toolPart = part as { toolCallId?: string; toolName?: string; result?: unknown }
          if (toolPart.toolCallId) {
            // AI SDK expects output to be { type: 'json'|'text', value: ... }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            modelMessages.push({
              role: 'tool',
              content: [{
                type: 'tool-result',
                toolCallId: toolPart.toolCallId,
                toolName: toolPart.toolName || 'unknown',
                output: {
                  type: 'json',
                  value: toolPart.result,
                },
              }],
            } as any)
          }
        }
      } else if (textParts.length > 0 || msg.content) {
        // Regular user text message
        const textContent = textParts.length > 0
          ? textParts.map(p => ({ type: 'text' as const, text: (p as { text?: string }).text || '' }))
          : [{ type: 'text' as const, text: msg.content || '' }]
        modelMessages.push({
          role: 'user',
          content: textContent,
        })
      }
    } else if (msg.role === 'assistant') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content: any[] = []

      if (msg.parts) {
        for (const part of msg.parts) {
          if (part.type === 'text') {
            const textPart = part as { text?: string }
            if (textPart.text) {
              content.push({ type: 'text', text: textPart.text })
            }
          } else if (part.type === 'tool-invocation') {
            // Convert tool-invocation to tool-call format
            // AI SDK expects 'input' not 'args' for tool-call parts
            const toolPart = part as { toolCallId?: string; toolName?: string; args?: unknown }
            if (toolPart.toolCallId && toolPart.toolName) {
              content.push({
                type: 'tool-call',
                toolCallId: toolPart.toolCallId,
                toolName: toolPart.toolName,
                input: toolPart.args || {},
              })
            }
          }
        }
      }

      // Only add if there's content
      if (content.length > 0) {
        modelMessages.push({
          role: 'assistant',
          content,
        })
      }
    }
  }

  return modelMessages
}

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
 * Checks if a model ID is an Anthropic/Claude model
 */
function isAnthropicModelId(modelId: string): boolean {
  return modelId.includes('anthropic') || modelId.includes('claude')
}

/**
 * Adds cache control to messages for Anthropic prompt caching via OpenRouter
 * Caches the system prompt and the last 3 messages before the final user message
 * @param messages - The model messages
 * @param modelId - The model ID string
 * @returns Messages with cache control applied
 */
function addCacheControlToMessages({
  messages,
  modelId,
}: {
  messages: ModelMessage[]
  modelId: string
}): ModelMessage[] {
  if (messages.length === 0) return messages
  if (!isAnthropicModelId(modelId)) return messages

  const cacheControl = {
    openrouter: { cacheControl: { type: 'ephemeral' } },
  }

  return messages.map((message, index) => {
    // Cache system messages (system prompt)
    if (message.role === 'system') {
      return {
        ...message,
        providerOptions: {
          ...message.providerOptions,
          ...cacheControl,
        },
      }
    }

    // Cache the last 3 messages (excluding the very last message which is the current user input)
    const fromEnd = messages.length - 1 - index
    const shouldCache = fromEnd >= 1 && fromEnd <= 3

    if (shouldCache) {
      return {
        ...message,
        providerOptions: {
          ...message.providerOptions,
          ...cacheControl,
        },
      }
    }

    return message
  })
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
   *
   * New architecture: Frontend sends only the new user message,
   * backend fetches history from database. This ensures:
   * - Database is single source of truth for messages
   * - No ID synchronization issues
   * - Smaller request payloads
   */
  fastify.post(
    '/builder/chat',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!

      // Validate request body with schema
      const parseResult = builderChatRequestSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          message: parseResult.error.issues[0]?.message || 'Invalid request',
        })
      }

      const { message, agentId, toolResults } = parseResult.data

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

      // Set CORS headers
      setCorsHeaders(request, reply)

      // 1. Save messages to database
      // - If there's a text message, save it as a user message
      // - If there are tool results, save them as a separate user message (tool results)
      if (message?.trim()) {
        await saveUserMessage(userId, context.currentAgentId, message.trim())
      }

      if (toolResults && toolResults.length > 0) {
        await saveToolResultMessage(userId, context.currentAgentId, toolResults)
      }

      // 2. Fetch message history from database (now includes the just-saved messages)
      const messageHistory = await getMessageHistoryForAI(userId, context.currentAgentId, 20)

      // 3. Convert to model messages for AI using our custom converter
      const modelMessages = convertStoredMessagesToModelMessages(messageHistory)

      // Generate system prompt with current context
      const systemPrompt = await generateBuilderSystemPrompt(context.currentAgentId, userId)

      // Create builder tools with context
      const builderTools = createBuilderTools(context)

      // Track usage for this request
      const modelId = 'anthropic/claude-sonnet-4'
      interface StepUsage {
        stepNumber: number
        stepType: string
        promptTokens: number
        completionTokens: number
        cost: number
      }
      const stepUsages: StepUsage[] = []
      let stepNumber = 0

      // Stream the response with prepareStep for dynamic prompt caching
      const result = streamText({
        model: openrouter.chat(modelId),
        system: systemPrompt,
        messages: modelMessages,
        tools: builderTools,
        stopWhen: stepCountIs(5),
        // Apply prompt caching before each step for Anthropic models via OpenRouter
        prepareStep: ({ messages: stepMessages }) => ({
          messages: addCacheControlToMessages({ messages: stepMessages, modelId }),
        }),
        onStepFinish: async ({ toolCalls: stepToolCalls, usage, providerMetadata }) => {
          stepNumber++
          if (usage) {
            const promptTokens = usage.inputTokens ?? 0
            const completionTokens = usage.outputTokens ?? 0
            const openrouterMeta = providerMetadata?.openrouter as { usage?: { cost?: number } } | undefined
            const cost = openrouterMeta?.usage?.cost ?? 0
            const stepType = stepToolCalls && stepToolCalls.length > 0 ? 'tool-call' : stepNumber === 1 ? 'initial' : 'continue'

            stepUsages.push({
              stepNumber,
              stepType,
              promptTokens,
              completionTokens,
              cost,
            })
          }
        },
      })

      // Create the UI message stream response
      // No originalMessages or generateMessageId needed - DB is source of truth
      const webResponse = result.toUIMessageStreamResponse({
        onFinish: async ({ responseMessage }) => {
          try {
            // Extract text content and parts from the response message
            let textContent = ''
            const parts: MessagePart[] = []

            if (responseMessage.parts) {
              for (const part of responseMessage.parts) {
                if (part.type === 'text' && 'text' in part) {
                  textContent = part.text
                  parts.push({ type: 'text', text: part.text })
                } else if (part.type.startsWith('tool-')) {
                  // AI SDK returns tool parts with type like "tool-createOrUpdateAgent"
                  // Convert to standard tool-invocation format for convertToModelMessages compatibility
                  const toolPart = part as Record<string, unknown>
                  const toolName = toolPart.toolName as string || part.type.replace('tool-', '')
                  const state = toolPart.state as string
                  const hasResult = state === 'result' || toolPart.output !== undefined

                  parts.push({
                    type: hasResult ? 'tool-result' : 'tool-invocation',
                    toolCallId: toolPart.toolCallId as string,
                    toolName,
                    state,
                    args: toolPart.input, // convertToModelMessages expects 'args' not 'input'
                    result: toolPart.output, // and 'result' not 'output'
                  } as MessagePart)
                }
              }
            }

            // Save the assistant message to database
            const savedAssistantMessage = await saveAssistantMessage(
              userId,
              context.currentAgentId,
              textContent,
              parts
            )

            // Log usage for each step, linked to the saved assistant message
            if (stepUsages.length > 0) {
              for (const step of stepUsages) {
                try {
                  await createBuilderUsage({
                    builderMessageId: savedAssistantMessage.id,
                    userId,
                    agentId: context.currentAgentId || undefined,
                    stepNumber: step.stepNumber,
                    stepType: step.stepType,
                    model: modelId,
                    promptTokens: step.promptTokens,
                    completionTokens: step.completionTokens,
                    totalTokens: step.promptTokens + step.completionTokens,
                    cost: step.cost,
                  })
                } catch (error) {
                  console.error('[builder] Failed to log builder usage:', error)
                }
              }
            }
          } catch (error) {
            console.error('[builder] onFinish error:', error)
          }
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
