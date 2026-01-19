import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { streamText, convertToModelMessages, tool, type UIMessage, stepCountIs } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware'
import {
  getBuilderMessages,
  createBuilderMessage,
  linkBuilderMessagesToAgent,
} from '../db/modules/builder/builder.db'
import {
  createAgent,
  updateAgent,
  findAgentByIdWithModel,
  generateSystemPrompt,
  findAgentsByUserId,
} from '../db/modules/agent/agent.db'
import {
  createTool as dbCreateTool,
  updateTool as dbUpdateTool,
  deleteTool as dbDeleteTool,
  assignToolToAgent,
  findToolsByAgentId,
  findToolById,
  removeToolFromAgent,
} from '../db/modules/tool/tool.db'
import { findAllModels, findModelByModelId } from '../db/modules/model/model.db'
import type { BuilderMessage } from '../db/schema/builder-messages'
import type { InstructionsConfig, AgentSettings } from '../db/schema/agents'
import type { ApiConnectorConfig } from '../db/schema/tools'
import { DEFAULT_MODEL_ID } from '../config/defaults'

/**
 * Generate the builder system prompt with current agent context
 */
async function generateBuilderSystemPrompt(
  agentId: string | null,
  userId: string
): Promise<string> {
  const models = await findAllModels()
  const modelList = models.map(m => `- ${m.modelId} (${m.name})`).join('\n')

  let agentStatus = ''
  let toolsList = ''

  if (agentId) {
    const agent = await findAgentByIdWithModel(agentId)
    if (agent) {
      const tools = await findToolsByAgentId(agentId)
      toolsList = tools.length > 0
        ? tools.map((t, i) => `${i + 1}. ${t.name} - ${t.description || 'No description'}`).join('\n')
        : 'No tools configured yet.'

      agentStatus = `
Status: CREATED
Agent ID: ${agent.id}

Current Configuration:
- Name: "${agent.name}"
- Description: "${agent.description || 'Not set'}"
- Model: ${agent.model?.name || 'Default (auto)'}
- Conversation History Limit: ${agent.settings?.memory?.conversationHistoryLimit || 10} messages

Instructions:
- Purpose: ${agent.instructionsConfig?.whatDoesAgentDo || 'Not set'}
- Communication Style: ${agent.instructionsConfig?.howShouldItSpeak || 'Not set'}
- Restrictions: ${agent.instructionsConfig?.whatShouldItNeverDo || 'Not set'}
- Additional Context: ${agent.instructionsConfig?.anythingElse || 'Not set'}

Tools:
${toolsList}

Settings:
- Welcome Message: "${agent.settings?.chat?.welcomeMessage || 'Not set'}"
- Suggested Prompts: ${agent.settings?.chat?.suggestedPrompts?.length ? agent.settings.chat.suggestedPrompts.map(p => `"${p}"`).join(', ') : 'None'}`
    }
  } else {
    agentStatus = `
Status: NOT_CREATED
No agent has been created yet. Use the createOrUpdateAgent tool with at least a name to create one.`
  }

  return `You are the Agent Builder for Agento - an AI assistant that helps users create custom AI agents through conversation.

## About Agento
Agento is a platform where users create, customize, and deploy AI agents. Each agent consists of:

**Identity**
- Name: The agent's display name
- Description: A brief summary of what the agent does

**Instructions** (defines the agent's behavior through 4 key questions)
- What does this agent do? - Core purpose and responsibilities
- How should it speak? - Tone, personality, communication style
- What should it never do? - Restrictions and boundaries
- Anything else? - Additional context or domain knowledge

**Tools** (extend capabilities)
- API Connectors: Connect to external APIs and services to fetch data or perform actions

**Settings**
- Model: Which AI model powers the agent
- Memory: How many previous messages to remember (conversation history limit)
- Welcome Message: First message shown to users when they start a conversation
- Suggested Prompts: Quick-click options shown to help users get started

## Your Approach
1. **Understand first**: Ask questions to understand what the user wants to build. Don't rush to create.
2. **One question at a time**: Keep the conversation focused. Don't overwhelm with multiple questions.
3. **Suggest and explain**: When you have enough info, explain what you're configuring and why.
4. **Iterate**: After initial creation, offer to refine and improve.

## Guidelines
- **KEEP RESPONSES SHORT AND CONCISE** - Use 1-3 sentences max for most responses. Avoid long explanations.
- Be conversational and helpful, but brief
- Ask one question at a time - don't overwhelm with multiple questions
- When using tools, give a brief confirmation (1 line) of what was done
- For complex agents, gather requirements before using tools
- For simple requests, you can create with minimal questions
- Suggest best practices briefly when relevant
- If the user mentions needing external data/APIs, ask about the specific endpoints and authentication

## Available Models
${modelList}

## Current Agent Status
${agentStatus}

## Important Notes
- When creating tools, make sure to gather all required information: URL, HTTP method, authentication details, and any custom headers
- Always set appropriate restrictions in "whatShouldItNeverDo" to keep the agent safe
- Suggest a welcome message that matches the agent's personality
- Recommend 2-4 suggested prompts that showcase the agent's main capabilities`
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
  fastify.get('/builder/messages', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
    const { agentId } = request.query as { agentId?: string }

    // Verify agent belongs to user if agentId provided
    if (agentId) {
      const agent = await findAgentByIdWithModel(agentId)
      if (!agent || agent.userId !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Forbidden',
        })
      }
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
  })

  /**
   * Chat with the builder agent (streaming)
   * POST /builder/chat
   */
  fastify.post('/builder/chat', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
    const { messages, agentId } = request.body as { messages: UIMessage[]; agentId?: string | null }

    // Track the current agentId (may be updated by tool calls)
    let currentAgentId = agentId || null

    // Verify agent belongs to user if agentId provided
    if (currentAgentId) {
      const agent = await findAgentByIdWithModel(currentAgentId)
      if (!agent || agent.userId !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Forbidden',
        })
      }
    }

    // Save the user's message
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage && lastUserMessage.role === 'user') {
      const textPart = lastUserMessage.parts?.find(p => p.type === 'text')
      if (textPart && 'text' in textPart) {
        await createBuilderMessage({
          userId,
          agentId: currentAgentId,
          role: 'user',
          content: textPart.text,
        })
      }
    }

    // Generate system prompt with current context
    const systemPrompt = await generateBuilderSystemPrompt(currentAgentId, userId)

    // Set CORS headers
    const origin = request.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000'
    reply.raw.setHeader('Access-Control-Allow-Origin', origin)
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')

    // Define schemas for tools
    const createOrUpdateAgentSchema = z.object({
      name: z.string().min(1).max(100).optional().describe('The agent name (required for first creation)'),
      description: z.string().max(500).optional().describe('Brief description of what the agent does'),
      whatDoesAgentDo: z.string().max(2000).optional().describe('The agent\'s core purpose and main responsibilities'),
      howShouldItSpeak: z.string().max(2000).optional().describe('The agent\'s tone, personality, and communication style'),
      whatShouldItNeverDo: z.string().max(2000).optional().describe('Restrictions, boundaries, and things the agent must avoid'),
      anythingElse: z.string().max(2000).optional().describe('Additional context, special instructions, or domain knowledge'),
      modelId: z.string().optional().describe('The AI model identifier to use (e.g., "openrouter/auto")'),
      conversationHistoryLimit: z.number().min(1).max(100).optional().describe('Number of previous messages to include (default 10)'),
      welcomeMessage: z.string().max(500).optional().describe('Initial message shown when users start a conversation'),
      suggestedPrompts: z.array(z.string().max(200)).max(10).optional().describe('Quick-click prompts shown to help users get started'),
    })

    // Define builder tools
    const builderTools = {
      createOrUpdateAgent: tool({
        description: 'Creates a new agent or updates the current agent configuration. Use this after gathering enough information from the user. All fields are optional except name is required for initial creation.',
        inputSchema: createOrUpdateAgentSchema,
        execute: async (params: z.infer<typeof createOrUpdateAgentSchema>) => {
          try {
            let agentIdToUse = currentAgentId
            let action: 'created' | 'updated' = 'updated'

            if (!agentIdToUse) {
              // Create new agent
              if (!params.name) {
                return {
                  success: false,
                  error: 'Agent name is required for initial creation',
                }
              }

              // Find model by modelId string if provided
              let modelUuid: string | undefined
              if (params.modelId) {
                const model = await findModelByModelId(params.modelId)
                modelUuid = model?.id
              }

              const newAgent = await createAgent({
                userId,
                name: params.name,
                description: params.description,
                modelId: modelUuid,
              })

              agentIdToUse = newAgent.id
              currentAgentId = newAgent.id
              action = 'created'

              // Link orphan messages to the new agent
              await linkBuilderMessagesToAgent(userId, agentIdToUse)
            }

            // Build update data
            const instructionsConfig: Partial<InstructionsConfig> = {}
            if (params.whatDoesAgentDo !== undefined) instructionsConfig.whatDoesAgentDo = params.whatDoesAgentDo
            if (params.howShouldItSpeak !== undefined) instructionsConfig.howShouldItSpeak = params.howShouldItSpeak
            if (params.whatShouldItNeverDo !== undefined) instructionsConfig.whatShouldItNeverDo = params.whatShouldItNeverDo
            if (params.anythingElse !== undefined) instructionsConfig.anythingElse = params.anythingElse

            const settings: Partial<AgentSettings> = {}
            if (params.conversationHistoryLimit !== undefined) {
              settings.memory = { conversationHistoryLimit: params.conversationHistoryLimit }
            }
            if (params.welcomeMessage !== undefined || params.suggestedPrompts !== undefined) {
              settings.chat = {
                welcomeMessage: params.welcomeMessage || '',
                suggestedPrompts: params.suggestedPrompts || [],
              }
            }

            // Find model UUID if modelId provided
            let modelUuid: string | null | undefined
            if (params.modelId !== undefined) {
              if (params.modelId) {
                const model = await findModelByModelId(params.modelId)
                modelUuid = model?.id
              } else {
                modelUuid = null
              }
            }

            // Prepare update payload
            const updatePayload: Record<string, unknown> = {}
            if (params.name !== undefined) updatePayload.name = params.name
            if (params.description !== undefined) updatePayload.description = params.description
            if (modelUuid !== undefined) updatePayload.modelId = modelUuid

            // Get existing agent to merge configs
            const existingAgent = await findAgentByIdWithModel(agentIdToUse)
            if (existingAgent) {
              // Merge instructions config
              if (Object.keys(instructionsConfig).length > 0) {
                updatePayload.instructionsConfig = {
                  ...existingAgent.instructionsConfig,
                  ...instructionsConfig,
                }
              }

              // Merge settings
              if (Object.keys(settings).length > 0) {
                updatePayload.settings = {
                  memory: {
                    ...existingAgent.settings?.memory,
                    ...settings.memory,
                  },
                  chat: {
                    ...existingAgent.settings?.chat,
                    ...settings.chat,
                  },
                }
              }

              // Generate system prompt if any relevant fields changed
              if (updatePayload.name || updatePayload.description !== undefined || updatePayload.instructionsConfig) {
                updatePayload.systemPrompt = generateSystemPrompt(
                  (updatePayload.name as string) || existingAgent.name,
                  (updatePayload.description as string | null) ?? existingAgent.description,
                  (updatePayload.instructionsConfig as InstructionsConfig) || existingAgent.instructionsConfig
                )
              }
            }

            // Update agent if we have anything to update
            if (Object.keys(updatePayload).length > 0) {
              await updateAgent(agentIdToUse, updatePayload)
            }

            // Get updated agent
            const updatedAgent = await findAgentByIdWithModel(agentIdToUse)

            return {
              success: true,
              action,
              agentId: agentIdToUse,
              agent: {
                id: updatedAgent?.id,
                name: updatedAgent?.name,
                description: updatedAgent?.description,
                model: updatedAgent?.model?.name || 'Default',
                instructionsConfigured: !!(
                  updatedAgent?.instructionsConfig?.whatDoesAgentDo ||
                  updatedAgent?.instructionsConfig?.howShouldItSpeak ||
                  updatedAgent?.instructionsConfig?.whatShouldItNeverDo ||
                  updatedAgent?.instructionsConfig?.anythingElse
                ),
                welcomeMessage: updatedAgent?.settings?.chat?.welcomeMessage || null,
                suggestedPrompts: updatedAgent?.settings?.chat?.suggestedPrompts || [],
              },
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to create/update agent',
            }
          }
        },
      }),

      createTool: tool({
        description: 'Creates a new API connector tool for the agent. Tools allow the agent to interact with external APIs.',
        inputSchema: z.object({
          name: z.string().min(1).max(100).describe('Tool name (used as function name, alphanumeric and underscores)'),
          description: z.string().max(500).optional().describe('Description of what this tool does'),
          url: z.string().url().describe('The API endpoint URL'),
          method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('HTTP method'),
          authenticationType: z.enum(['none', 'bearer', 'api_key', 'basic']).optional().describe('Authentication type'),
          authToken: z.string().optional().describe('Bearer token or API key value'),
          authUsername: z.string().optional().describe('Username for basic auth'),
          authPassword: z.string().optional().describe('Password for basic auth'),
          headers: z.array(z.object({
            key: z.string(),
            value: z.string(),
          })).optional().describe('Custom headers to include'),
          body: z.string().optional().describe('Request body template for POST/PUT/PATCH'),
        }),
        execute: async (params: {
          name: string
          description?: string
          url: string
          method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
          authenticationType?: 'none' | 'bearer' | 'api_key' | 'basic'
          authToken?: string
          authUsername?: string
          authPassword?: string
          headers?: { key: string; value: string }[]
          body?: string
        }) => {
          try {
            if (!currentAgentId) {
              return {
                success: false,
                error: 'Please create the agent first before adding tools',
              }
            }

            // Build API config
            const apiConfig: ApiConnectorConfig = {
              url: params.url,
              method: params.method,
              headers: params.headers,
              body: params.body,
            }

            // Add authentication if provided
            if (params.authenticationType && params.authenticationType !== 'none') {
              apiConfig.authentication = {
                type: params.authenticationType,
                token: params.authToken,
                apiKey: params.authToken, // Use same field for API key
                username: params.authUsername,
                password: params.authPassword,
              }
            }

            // Create the tool
            const newTool = await dbCreateTool({
              userId,
              type: 'api_connector',
              name: params.name,
              description: params.description,
              config: apiConfig,
              enabled: true,
            })

            // Assign to agent
            await assignToolToAgent({
              agentId: currentAgentId,
              toolId: newTool.id,
              enabled: true,
            })

            return {
              success: true,
              toolId: newTool.id,
              tool: {
                id: newTool.id,
                name: newTool.name,
                description: newTool.description,
                type: 'api_connector',
                url: params.url,
                method: params.method,
              },
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to create tool',
            }
          }
        },
      }),

      updateTool: tool({
        description: 'Updates an existing tool configuration',
        inputSchema: z.object({
          toolId: z.string().uuid().describe('The tool ID to update'),
          name: z.string().min(1).max(100).optional().describe('New tool name'),
          description: z.string().max(500).optional().describe('New description'),
          url: z.string().url().optional().describe('New API endpoint URL'),
          method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().describe('New HTTP method'),
          authenticationType: z.enum(['none', 'bearer', 'api_key', 'basic']).optional().describe('New authentication type'),
          authToken: z.string().optional().describe('New bearer token or API key'),
          authUsername: z.string().optional().describe('New username for basic auth'),
          authPassword: z.string().optional().describe('New password for basic auth'),
          headers: z.array(z.object({
            key: z.string(),
            value: z.string(),
          })).optional().describe('New custom headers'),
          body: z.string().optional().describe('New request body template'),
        }),
        execute: async (params: {
          toolId: string
          name?: string
          description?: string
          url?: string
          method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
          authenticationType?: 'none' | 'bearer' | 'api_key' | 'basic'
          authToken?: string
          authUsername?: string
          authPassword?: string
          headers?: { key: string; value: string }[]
          body?: string
        }) => {
          try {
            const existingTool = await findToolById(params.toolId)
            if (!existingTool) {
              return { success: false, error: 'Tool not found' }
            }

            if (existingTool.userId !== userId) {
              return { success: false, error: 'Not authorized to update this tool' }
            }

            const existingConfig = existingTool.config as ApiConnectorConfig
            const updateData: Record<string, unknown> = {}

            if (params.name) updateData.name = params.name
            if (params.description !== undefined) updateData.description = params.description

            // Build updated config
            const newConfig: ApiConnectorConfig = {
              url: params.url || existingConfig.url,
              method: params.method || existingConfig.method,
              headers: params.headers !== undefined ? params.headers : existingConfig.headers,
              body: params.body !== undefined ? params.body : existingConfig.body,
            }

            if (params.authenticationType !== undefined) {
              if (params.authenticationType === 'none') {
                newConfig.authentication = undefined
              } else {
                newConfig.authentication = {
                  type: params.authenticationType,
                  token: params.authToken,
                  apiKey: params.authToken,
                  username: params.authUsername,
                  password: params.authPassword,
                }
              }
            } else {
              newConfig.authentication = existingConfig.authentication
            }

            updateData.config = newConfig

            const updatedTool = await dbUpdateTool(params.toolId, updateData)

            return {
              success: true,
              tool: {
                id: updatedTool?.id,
                name: updatedTool?.name,
                description: updatedTool?.description,
              },
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to update tool',
            }
          }
        },
      }),

      deleteTool: tool({
        description: 'Removes a tool from the agent',
        inputSchema: z.object({
          toolId: z.string().uuid().describe('The tool ID to delete'),
        }),
        execute: async (params: { toolId: string }) => {
          try {
            const existingTool = await findToolById(params.toolId)
            if (!existingTool) {
              return { success: false, error: 'Tool not found' }
            }

            if (existingTool.userId !== userId) {
              return { success: false, error: 'Not authorized to delete this tool' }
            }

            // Remove from agent first
            if (currentAgentId) {
              await removeToolFromAgent(currentAgentId, params.toolId)
            }

            // Delete the tool
            await dbDeleteTool(params.toolId)

            return {
              success: true,
              message: `Tool "${existingTool.name}" has been deleted`,
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to delete tool',
            }
          }
        },
      }),
    }

    // Stream the response
    const result = streamText({
      model: openrouter.chat('anthropic/claude-sonnet-4'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: builderTools,
      stopWhen: stepCountIs(5),
      onFinish: async ({ text }) => {
        // Save the assistant's response
        await createBuilderMessage({
          userId,
          agentId: currentAgentId,
          role: 'assistant',
          content: text || '',
        })
      },
    })

    // Pipe the stream to response
    result.pipeUIMessageStreamToResponse(reply.raw)
  })

  /**
   * Get current agent data for builder context
   * GET /builder/agent?agentId=xxx
   */
  fastify.get('/builder/agent', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!
    const { agentId } = request.query as { agentId?: string }

    if (!agentId) {
      return reply.send({
        success: true,
        message: 'No agent specified',
        data: { agent: null },
      })
    }

    const agent = await findAgentByIdWithModel(agentId)
    if (!agent || agent.userId !== userId) {
      return reply.status(403).send({
        success: false,
        message: 'Forbidden',
      })
    }

    const tools = await findToolsByAgentId(agentId)

    return reply.send({
      success: true,
      message: 'Agent retrieved',
      data: {
        agent,
        tools,
      },
    })
  })
}
