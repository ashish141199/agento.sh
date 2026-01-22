import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../services/auth.service'
import {
  findToolsByUserId,
  findToolById,
  createTool,
  updateTool,
  deleteTool,
  toolBelongsToUser,
  findToolsByAgentId,
  assignToolToAgent,
  removeToolFromAgent,
  updateAgentTool,
  isToolAssignedToAgent,
} from '../db/modules/tool/tool.db'
import { agentBelongsToUser } from '../db/modules/agent/agent.db'
import {
  createToolSchema,
  updateToolSchema,
  assignToolSchema,
  updateAgentToolSchema,
  discoverMcpToolsSchema,
  importMcpToolsSchema,
} from '../schemas/tool.schema'
import type { McpConnectorConfig } from '../db/schema/tools'
import { discoverMcpTools } from '../services/mcp.service'

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
 * Register tool routes
 * @param fastify - Fastify instance
 */
export async function toolRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * List all tools for the current user
   * GET /tools
   */
  fastify.get('/tools', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const tools = await findToolsByUserId(userId)

    return reply.send({
      success: true,
      message: 'Tools retrieved',
      data: { tools },
    })
  })

  /**
   * Get a specific tool
   * GET /tools/:id
   */
  fastify.get('/tools/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { id } = request.params as { id: string }

    const tool = await findToolById(id)

    if (!tool) {
      return reply.status(404).send({
        success: false,
        message: 'Tool not found',
      })
    }

    if (tool.userId !== userId) {
      return reply.status(403).send({
        success: false,
        message: 'Forbidden',
      })
    }

    return reply.send({
      success: true,
      message: 'Tool retrieved',
      data: { tool },
    })
  })

  /**
   * Create a new tool
   * POST /tools
   */
  fastify.post('/tools', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const result = createToolSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    const tool = await createTool({
      ...result.data,
      userId,
    })

    return reply.status(201).send({
      success: true,
      message: 'Tool created',
      data: { tool },
    })
  })

  /**
   * Update a tool
   * PATCH /tools/:id
   */
  fastify.patch('/tools/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { id } = request.params as { id: string }

    const belongsToUser = await toolBelongsToUser(id, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Tool not found',
      })
    }

    const result = updateToolSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    const tool = await updateTool(id, result.data)

    return reply.send({
      success: true,
      message: 'Tool updated',
      data: { tool },
    })
  })

  /**
   * Delete a tool
   * DELETE /tools/:id
   */
  fastify.delete('/tools/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { id } = request.params as { id: string }

    const belongsToUser = await toolBelongsToUser(id, userId)
    if (!belongsToUser) {
      return reply.status(404).send({
        success: false,
        message: 'Tool not found',
      })
    }

    await deleteTool(id)

    return reply.send({
      success: true,
      message: 'Tool deleted',
    })
  })

  /**
   * Get all tools assigned to an agent
   * GET /agents/:agentId/tools
   */
  fastify.get('/agents/:agentId/tools', async (request: FastifyRequest, reply: FastifyReply) => {
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

    const tools = await findToolsByAgentId(agentId)

    return reply.send({
      success: true,
      message: 'Agent tools retrieved',
      data: { tools },
    })
  })

  /**
   * Assign a tool to an agent
   * POST /agents/:agentId/tools
   */
  fastify.post('/agents/:agentId/tools', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { agentId } = request.params as { agentId: string }

    const agentBelongs = await agentBelongsToUser(agentId, userId)
    if (!agentBelongs) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const result = assignToolSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    // Check if tool belongs to user
    const toolBelongs = await toolBelongsToUser(result.data.toolId, userId)
    if (!toolBelongs) {
      return reply.status(404).send({
        success: false,
        message: 'Tool not found',
      })
    }

    // Check if already assigned
    const alreadyAssigned = await isToolAssignedToAgent(agentId, result.data.toolId)
    if (alreadyAssigned) {
      return reply.status(400).send({
        success: false,
        message: 'Tool already assigned to this agent',
      })
    }

    const agentTool = await assignToolToAgent({
      agentId,
      toolId: result.data.toolId,
      enabled: result.data.enabled,
    })

    return reply.status(201).send({
      success: true,
      message: 'Tool assigned to agent',
      data: { agentTool },
    })
  })

  /**
   * Update a tool assignment
   * PATCH /agents/:agentId/tools/:toolId
   */
  fastify.patch('/agents/:agentId/tools/:toolId', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { agentId, toolId } = request.params as { agentId: string; toolId: string }

    const agentBelongs = await agentBelongsToUser(agentId, userId)
    if (!agentBelongs) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const isAssigned = await isToolAssignedToAgent(agentId, toolId)
    if (!isAssigned) {
      return reply.status(404).send({
        success: false,
        message: 'Tool not assigned to this agent',
      })
    }

    const result = updateAgentToolSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    const agentTool = await updateAgentTool(agentId, toolId, result.data)

    return reply.send({
      success: true,
      message: 'Tool assignment updated',
      data: { agentTool },
    })
  })

  /**
   * Remove a tool from an agent
   * DELETE /agents/:agentId/tools/:toolId
   */
  fastify.delete('/agents/:agentId/tools/:toolId', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { agentId, toolId } = request.params as { agentId: string; toolId: string }

    const agentBelongs = await agentBelongsToUser(agentId, userId)
    if (!agentBelongs) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const removed = await removeToolFromAgent(agentId, toolId)

    if (!removed) {
      return reply.status(404).send({
        success: false,
        message: 'Tool not assigned to this agent',
      })
    }

    return reply.send({
      success: true,
      message: 'Tool removed from agent',
    })
  })

  /**
   * Discover tools from an MCP server
   * POST /tools/mcp/discover
   */
  fastify.post('/tools/mcp/discover', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const result = discoverMcpToolsSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    const { serverUrl, authentication } = result.data

    try {
      const tools = await discoverMcpTools(serverUrl, authentication)

      return reply.send({
        success: true,
        message: `Discovered ${tools.length} tool${tools.length !== 1 ? 's' : ''}`,
        data: { tools },
      })
    } catch (error) {
      console.error('[MCP Discovery] Error:', error)
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to discover MCP tools',
      })
    }
  })

  /**
   * Import MCP tools and assign them to an agent
   * POST /agents/:agentId/tools/mcp/import
   */
  fastify.post('/agents/:agentId/tools/mcp/import', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request)
    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { agentId } = request.params as { agentId: string }

    const agentBelongs = await agentBelongsToUser(agentId, userId)
    if (!agentBelongs) {
      return reply.status(404).send({
        success: false,
        message: 'Agent not found',
      })
    }

    const result = importMcpToolsSchema.safeParse(request.body)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      return reply.status(400).send({
        success: false,
        message: firstIssue?.message || 'Validation error',
      })
    }

    const { tools, serverUrl, authentication } = result.data

    try {
      const createdTools = []

      // Create each tool and assign it to the agent
      for (const mcpTool of tools) {
        // Create the tool with MCP config
        const config: McpConnectorConfig = {
          serverUrl,
          toolName: mcpTool.name,
          authentication,
        }

        const tool = await createTool({
          userId,
          type: 'mcp_connector',
          name: mcpTool.name,
          description: mcpTool.description,
          inputSchema: mcpTool.inputSchema,
          config,
        })

        // Assign to agent
        await assignToolToAgent({
          agentId,
          toolId: tool.id,
          enabled: true,
        })

        createdTools.push(tool)
      }

      return reply.status(201).send({
        success: true,
        message: `Imported ${createdTools.length} tool${createdTools.length !== 1 ? 's' : ''}`,
        data: { tools: createdTools },
      })
    } catch (error) {
      console.error('[MCP Import] Error:', error)
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import MCP tools',
      })
    }
  })
}
