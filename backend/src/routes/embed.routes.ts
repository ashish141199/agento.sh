import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { streamText, convertToModelMessages, tool, type UIMessage, type ToolSet, stepCountIs } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'
import { findAgentByIdWithModel } from '../db/modules/agent/agent.db'
import { findAgentByIdOrSlug } from '../db/modules/agent/publish.db'
import { findToolsByAgentId, type ToolWithAssignment } from '../db/modules/tool/tool.db'
import type { ApiConnectorConfig, ApiConnectorAuth, McpConnectorConfig, ToolInputSchema } from '../db/schema/tools'
import type { EmbedConfig } from '../db/schema/agents'
import { McpClient, type McpAuth } from '../services/mcp.service'
import { DEFAULT_MODEL_ID, DEFAULT_KNOWLEDGE_SETTINGS, DEFAULT_EMBED_CONFIG } from '../config/defaults'
import { searchKnowledge, agentHasKnowledge } from '../services/knowledge.service'
import { interpolate, buildToolInputZodSchema } from '../utils/tool-utils'

/**
 * Extract core domain from origin or referer header
 * Returns lowercase domain without protocol, www, path, port
 */
function extractDomain(url: string | undefined): string | null {
  if (!url) return null
  try {
    // Handle cases where URL might not have protocol
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`
    const parsed = new URL(urlWithProtocol)
    let domain = parsed.hostname.toLowerCase()
    // Remove www. prefix
    if (domain.startsWith('www.')) {
      domain = domain.slice(4)
    }
    return domain
  } catch {
    return null
  }
}

/**
 * Check if a domain is allowed based on the allowed domains list
 * Returns true if allowed, false if blocked
 */
function isDomainAllowed(
  requestDomain: string | null,
  allowedDomains: string[]
): boolean {
  // If no allowed domains configured, allow all
  if (!allowedDomains || allowedDomains.length === 0) {
    return true
  }

  // If no domain could be extracted (direct access), block if restrictions exist
  if (!requestDomain) {
    return false
  }

  // Check if request domain matches any allowed domain
  // Also allow subdomains (e.g., "example.com" allows "app.example.com")
  return allowedDomains.some(allowed => {
    const normalizedAllowed = allowed.toLowerCase()
    return requestDomain === normalizedAllowed ||
           requestDomain.endsWith('.' + normalizedAllowed)
  })
}

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
 * Execute an API connector tool with input interpolation
 */
async function executeApiConnector(
  config: ApiConnectorConfig,
  inputs: Record<string, unknown>
): Promise<{ status: number; data: unknown }> {
  let url = interpolate(config.url, inputs)

  if (config.queryParams && config.queryParams.length > 0) {
    const queryParts: string[] = []
    for (const param of config.queryParams) {
      const value = interpolate(param.value, inputs)
      if (value) {
        queryParts.push(`${encodeURIComponent(param.key)}=${encodeURIComponent(value)}`)
      }
    }
    if (queryParts.length > 0) {
      url += (url.includes('?') ? '&' : '?') + queryParts.join('&')
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(config.authentication),
  }

  if (config.headers) {
    for (const header of config.headers) {
      headers[header.key] = interpolate(header.value, inputs)
    }
  }

  const fetchOptions: RequestInit = {
    method: config.method,
    headers,
  }

  if (['POST', 'PUT', 'PATCH'].includes(config.method) && config.body) {
    fetchOptions.body = interpolate(config.body, inputs)
  }

  const response = await fetch(url, fetchOptions)

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
 * Execute an MCP connector tool
 */
async function executeMcpConnector(
  config: McpConnectorConfig,
  inputs: Record<string, unknown>
): Promise<{ success: boolean; data: unknown }> {
  const auth: McpAuth | undefined = config.authentication?.type === 'bearer'
    ? { type: 'bearer', token: config.authentication.token }
    : undefined

  const client = new McpClient(config.serverUrl, auth)

  try {
    await client.connect()
    const result = await client.callTool(config.toolName, inputs)
    return { success: true, data: result.content }
  } finally {
    await client.disconnect()
  }
}

/**
 * Sanitize tool name
 */
function sanitizeToolName(name: string): string {
  return name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .replace(/^[^a-zA-Z]+/, '')
    || 'tool'
}

/**
 * Create API connector tool
 */
function createApiConnectorTool(
  config: ApiConnectorConfig,
  inputSchema: ToolInputSchema | null | undefined,
  description: string,
  title: string
) {
  const zodInputSchema = buildToolInputZodSchema(inputSchema)

  return tool({
    description,
    title,
    inputSchema: zodInputSchema,
    execute: async (inputs: Record<string, unknown>) => {
      try {
        return await executeApiConnector(config, inputs)
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
 * Create MCP connector tool
 */
function createMcpConnectorTool(
  config: McpConnectorConfig,
  inputSchema: ToolInputSchema | null | undefined,
  description: string,
  title: string
) {
  const zodInputSchema = buildToolInputZodSchema(inputSchema)

  return tool({
    description,
    title,
    inputSchema: zodInputSchema,
    execute: async (inputs: Record<string, unknown>) => {
      try {
        return await executeMcpConnector(config, inputs)
      } catch (error) {
        return {
          success: false,
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },
  })
}

/**
 * Build AI SDK tools from database tools
 */
function buildAiSdkTools(dbTools: ToolWithAssignment[]): ToolSet {
  const aiTools: ToolSet = {}

  for (const dbTool of dbTools) {
    if (!dbTool.enabled || dbTool.agentEnabled === false) continue
    if (!dbTool.config) continue

    const toolName = sanitizeToolName(dbTool.name)
    const title = dbTool.name

    if (dbTool.type === 'api_connector') {
      const config = dbTool.config as ApiConnectorConfig
      const description = dbTool.description || `API call to ${config.url}`
      const inputSchema = dbTool.inputSchema as ToolInputSchema | null

      aiTools[toolName] = createApiConnectorTool(config, inputSchema, description, title)
    } else if (dbTool.type === 'mcp_connector') {
      const config = dbTool.config as McpConnectorConfig
      const description = dbTool.description || `MCP tool: ${config.toolName}`
      const inputSchema = dbTool.inputSchema as ToolInputSchema | null

      aiTools[toolName] = createMcpConnectorTool(config, inputSchema, description, title)
    }
  }

  return aiTools
}

/**
 * Create searchKnowledge tool for RAG
 */
function createSearchKnowledgeTool(agentId: string, topK: number = 5, threshold: number = 0.7) {
  return tool({
    description: 'Search the knowledge base for relevant information.',
    inputSchema: z.object({
      query: z.string().describe('The search query'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        const results = await searchKnowledge(agentId, query, topK, threshold)
        if (results.length === 0) {
          return { found: false, message: 'No relevant information found.', results: [] }
        }
        return {
          found: true,
          message: `Found ${results.length} result(s).`,
          results: results.map(r => ({
            content: r.content,
            source: r.source,
            relevance: Math.round(r.similarity * 100) + '%',
          })),
        }
      } catch (error) {
        return { found: false, message: 'Failed to search.', results: [] }
      }
    },
  })
}

/**
 * Get knowledge context for auto-inject mode
 */
async function getKnowledgeContext(
  agentId: string,
  query: string,
  topK: number,
  threshold: number
): Promise<string | null> {
  try {
    const results = await searchKnowledge(agentId, query, topK, threshold)
    if (results.length === 0) return null

    const contextParts = results.map((r, i) =>
      `[Source ${i + 1}: ${r.source}]\n${r.content}`
    )

    return `\n\n## Relevant Knowledge\n${contextParts.join('\n\n---\n\n')}\n\n---\n`
  } catch {
    return null
  }
}

/**
 * Register embed routes (PUBLIC - no auth)
 */
export async function embedRoutes(fastify: FastifyInstance): Promise<void> {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || '',
  })

  /**
   * Get agent info for embed
   * GET /embed/:id
   * Accepts either agent ID (UUID) or slug
   */
  fastify.get('/embed/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }

    const agent = await findAgentByIdOrSlug(id)

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

    // Check domain restrictions
    const embedConfig = (agent.embedConfig as EmbedConfig) || DEFAULT_EMBED_CONFIG
    const allowedDomains = embedConfig.allowedDomains || []
    const requestDomain = extractDomain(request.headers.origin || request.headers.referer)

    if (!isDomainAllowed(requestDomain, allowedDomains)) {
      return reply.status(403).send({
        success: false,
        message: 'Embedding not allowed on this domain',
      })
    }

    return reply.send({
      success: true,
      message: 'Agent retrieved',
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          description: agent.description,
        },
      },
    })
  })

  /**
   * Chat with agent via embed (streaming, no auth)
   * POST /embed/:id/chat
   * Stateless - messages are not persisted
   */
  fastify.post('/embed/:id/chat', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const { messages } = request.body as { messages: UIMessage[] }

    // Find agent by ID or slug
    const agent = await findAgentByIdOrSlug(id)

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

    // Check domain restrictions
    const embedConfig = (agent.embedConfig as EmbedConfig) || DEFAULT_EMBED_CONFIG
    const allowedDomains = embedConfig.allowedDomains || []
    const requestDomain = extractDomain(request.headers.origin || request.headers.referer)

    if (!isDomainAllowed(requestDomain, allowedDomains)) {
      return reply.status(403).send({
        success: false,
        message: 'Embedding not allowed on this domain',
      })
    }

    // Get agent with model info
    const agentWithModel = await findAgentByIdWithModel(agent.id)
    if (!agentWithModel) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const modelId = agentWithModel.model?.modelId || DEFAULT_MODEL_ID

    // Get the agent's tools
    const dbTools = await findToolsByAgentId(agent.id)
    const agentTools = buildAiSdkTools(dbTools)

    // Check if agent has knowledge
    const knowledgeSettings = agentWithModel.settings?.knowledge || DEFAULT_KNOWLEDGE_SETTINGS
    const hasKnowledge = knowledgeSettings.enabled && await agentHasKnowledge(agent.id)

    // Add searchKnowledge tool if enabled
    if (hasKnowledge && knowledgeSettings.mode === 'tool') {
      agentTools['searchKnowledge'] = createSearchKnowledgeTool(
        agent.id,
        knowledgeSettings.topK,
        knowledgeSettings.similarityThreshold
      )
    }

    // Build system prompt with optional knowledge context
    let systemPrompt = agentWithModel.systemPrompt || `You are ${agent.name}.`

    if (hasKnowledge && knowledgeSettings.mode === 'auto_inject') {
      const lastUserMessage = messages[messages.length - 1]
      if (lastUserMessage?.role === 'user') {
        const textPart = lastUserMessage.parts?.find(p => p.type === 'text')
        if (textPart && 'text' in textPart) {
          const knowledgeContext = await getKnowledgeContext(
            agent.id,
            textPart.text,
            knowledgeSettings.topK,
            knowledgeSettings.similarityThreshold
          )
          if (knowledgeContext) {
            systemPrompt += knowledgeContext
          }
        }
      }
    }

    // Set CORS headers
    const origin = request.headers.origin || '*'
    reply.raw.setHeader('Access-Control-Allow-Origin', origin)
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')

    // Stream the response (stateless - no message persistence)
    const result = streamText({
      model: openrouter.chat(modelId),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(25),
      tools: Object.keys(agentTools).length > 0 ? agentTools : undefined,
    })

    result.pipeUIMessageStreamToResponse(reply.raw)
  })
}
