import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { streamText, convertToModelMessages, tool, type UIMessage, type ToolSet, stepCountIs } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware'
import { findAgentByIdWithModel, agentBelongsToUser } from '../db/modules/agent/agent.db'
import {
  findMessagesByAgentId,
  createMessage,
  deleteMessagesByAgentId,
  hasMessages,
} from '../db/modules/message/message.db'
import { findToolsByAgentId, type ToolWithAssignment } from '../db/modules/tool/tool.db'
import type { ApiConnectorConfig, ApiConnectorAuth } from '../db/schema/tools'
import { DEFAULT_CONVERSATION_HISTORY_LIMIT, DEFAULT_MODEL_ID } from '../config/defaults'

/**
 * Build authentication headers for API connector
 * @param auth - Authentication configuration
 * @returns Headers object
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
 * @param config - API connector configuration
 * @param body - Optional body override from tool call
 * @returns API response
 */
async function executeApiConnector(
  config: ApiConnectorConfig,
  body?: string
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(config.authentication),
  }

  // Add custom headers
  if (config.headers) {
    for (const header of config.headers) {
      headers[header.key] = header.value
    }
  }

  const fetchOptions: RequestInit = {
    method: config.method,
    headers,
  }

  // Add body for methods that support it
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
 * Apply conversation history limit to messages
 * Keeps the most recent N messages while preserving conversation context
 * @param messages - All messages from the conversation
 * @param limit - Maximum number of messages to include
 * @returns Limited messages array
 */
function applyHistoryLimit(messages: UIMessage[], limit: number): UIMessage[] {
  if (limit <= 0 || messages.length <= limit) {
    return messages
  }
  return messages.slice(-limit)
}

/**
 * Sanitize tool name to match OpenAI's pattern: ^[a-zA-Z0-9_\.-]+
 * Replaces spaces with underscores and removes invalid characters
 */
function sanitizeToolName(name: string): string {
  return name
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_.-]/g, '') // Remove invalid characters
    .replace(/^[^a-zA-Z]+/, '')      // Ensure starts with a letter
    || 'tool'                        // Fallback if empty
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
 * Create the askUser tool that forwards to the frontend for user input
 * This tool has no execute function, so it will be handled client-side
 */
function createAskUserTool() {
  return tool({
    description: `Ask the user clarification questions when you need more information to proceed. Use this tool sparingly and only when you have genuine uncertainty that cannot be resolved otherwise.

Guidelines for using this tool:
- Only ask when you have a genuine doubt that affects your ability to help the user
- Prefer MCQ (single_choice or multiple_choice) over text questions when possible
- Keep questions clear and concise
- Maximum 5 questions per call, minimum 1
- Use allowOther: true for MCQ when the user might have an answer not in the options
- Each question must have a unique id`,
    title: 'Ask User',
    inputSchema: z.object({
      questions: z
        .array(
          z.object({
            id: z.string().describe('Unique identifier for this question'),
            text: z.string().describe('The question text to display to the user'),
            type: z
              .enum(['single_choice', 'multiple_choice', 'text'])
              .describe('Type of question: single_choice (radio), multiple_choice (checkbox), or text (free input)'),
            options: z
              .array(
                z.object({
                  label: z.string().describe('Display label for this option'),
                  value: z.string().describe('Value to return when selected'),
                })
              )
              .optional()
              .describe('Options for MCQ questions (required for single_choice and multiple_choice)'),
            allowOther: z
              .boolean()
              .optional()
              .describe('If true, adds an "Other" option that lets the user type a custom answer'),
          })
        )
        .min(1)
        .max(5)
        .describe('Array of questions to ask the user (1-5 questions)'),
    }),
    // No execute function - this tool is handled client-side
  })
}

/**
 * Build AI SDK tools from database tools
 * @param dbTools - Tools from database
 * @returns AI SDK ToolSet for streamText
 */
function buildAiSdkTools(dbTools: ToolWithAssignment[]): ToolSet {
  const aiTools: ToolSet = {}

  // Always add the askUser tool
  aiTools['askUser'] = createAskUserTool()

  for (const dbTool of dbTools) {
    // Skip disabled tools
    if (!dbTool.enabled || dbTool.agentEnabled === false) continue

    const config = dbTool.config as ApiConnectorConfig
    const description = dbTool.description || `API call to ${config.url}`
    const toolName = sanitizeToolName(dbTool.name)
    const title = dbTool.name // Original name for display

    aiTools[toolName] = createApiConnectorTool(config, description, title)
  }

  return aiTools
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
  fastify.get('/agents/:agentId/chat/messages', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
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
  fastify.post('/agents/:agentId/chat', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
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

    // Get the model ID from agent's model
    const modelId = agent.model?.modelId || DEFAULT_MODEL_ID

    // Get the agent's tools
    const dbTools = await findToolsByAgentId(agentId)
    const agentTools = buildAiSdkTools(dbTools)

    // Apply conversation history limit from agent settings
    const historyLimit = agent.settings?.memory?.conversationHistoryLimit || DEFAULT_CONVERSATION_HISTORY_LIMIT
    const limitedMessages = applyHistoryLimit(messages, historyLimit)

    // Check if this is the first message in the conversation
    const isFirstMessage = !(await hasMessages(agentId))

    // If first message and agent has a welcome message, save it first
    const welcomeMessage = agent.settings?.chat?.welcomeMessage
    if (isFirstMessage && welcomeMessage) {
      await createMessage({
        agentId,
        content: welcomeMessage,
        isAgent: true,
      })
    }

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

    // Stream the response with history-limited messages
    const result = streamText({
      model: openrouter.chat(modelId),
      system: agent.systemPrompt || `You are ${agent.name}.`,
      messages: await convertToModelMessages(limitedMessages),
      stopWhen: stepCountIs(25),
      tools: Object.keys(agentTools).length > 0 ? agentTools : undefined,
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
  fastify.delete('/agents/:agentId/chat/messages', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
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
