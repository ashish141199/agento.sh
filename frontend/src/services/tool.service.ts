import { api } from '@/lib/api'

/**
 * Tool input types
 */
export type ToolInputType = 'text' | 'number' | 'boolean' | 'list' | 'object'

/**
 * Single tool input definition
 */
export interface ToolInput {
  name: string
  description: string
  type: ToolInputType
  required: boolean
  default?: unknown
  listItemType?: ToolInputType
  listItemProperties?: ToolInput[]
  properties?: ToolInput[]
}

/**
 * Tool input schema
 */
export interface ToolInputSchema {
  inputs: ToolInput[]
}

/**
 * API Connector authentication config
 */
export interface ApiConnectorAuth {
  type: 'none' | 'bearer' | 'api_key' | 'basic'
  token?: string
  apiKey?: string
  username?: string
  password?: string
}

/**
 * API Connector config
 */
export interface ApiConnectorConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: { key: string; value: string }[]
  queryParams?: { key: string; value: string }[]
  body?: string
  authentication?: ApiConnectorAuth
}

/**
 * MCP Connector config
 * Each MCP tool stores its own server connection info
 */
export interface McpConnectorConfig {
  serverUrl: string
  toolName: string // The specific tool from this server
  authentication?: {
    type: 'none' | 'bearer'
    token?: string
  }
}

/**
 * MCP tool discovered from a server
 */
export interface McpDiscoveredTool {
  name: string
  description: string
  inputSchema: ToolInputSchema
}

/**
 * Tool config union type
 */
export type ToolConfig = ApiConnectorConfig | McpConnectorConfig

/**
 * Tool type
 */
export type ToolType = 'api_connector' | 'mcp_connector'

/**
 * Tool type
 */
export interface Tool {
  id: string
  userId: string
  type: ToolType
  name: string
  description: string | null
  enabled: boolean
  inputSchema: ToolInputSchema | null
  config: ToolConfig | null
  createdAt: string
  updatedAt: string
}

/**
 * Tool with agent assignment info
 */
export interface ToolWithAssignment extends Tool {
  agentToolId?: string
  agentEnabled?: boolean
}

/**
 * Agent-Tool assignment
 */
export interface AgentTool {
  id: string
  agentId: string
  toolId: string
  enabled: boolean
  createdAt: string
}

/**
 * Create tool input (Step 1 - basic info)
 */
export interface CreateToolInput {
  type?: ToolType
  name: string
  description?: string
  enabled?: boolean
  inputSchema?: ToolInputSchema
  config?: ToolConfig | null
}

/**
 * Update tool input
 */
export interface UpdateToolInput {
  name?: string
  description?: string
  enabled?: boolean
  inputSchema?: ToolInputSchema
  config?: ToolConfig | null
}

/**
 * Assign tool input
 */
export interface AssignToolInput {
  toolId: string
  enabled?: boolean
}

/**
 * Tool service for tool operations
 */
export const toolService = {
  /**
   * List all tools for the current user
   * @param token - Access token
   */
  list: (token: string) =>
    api.get<{ tools: Tool[] }>('/tools', token),

  /**
   * Get a specific tool
   * @param id - Tool ID
   * @param token - Access token
   */
  get: (id: string, token: string) =>
    api.get<{ tool: Tool }>(`/tools/${id}`, token),

  /**
   * Create a new tool
   * @param data - Tool data
   * @param token - Access token
   */
  create: (data: CreateToolInput, token: string) =>
    api.post<{ tool: Tool }>('/tools', data, token),

  /**
   * Update a tool
   * @param id - Tool ID
   * @param data - Tool data
   * @param token - Access token
   */
  update: (id: string, data: UpdateToolInput, token: string) =>
    api.patch<{ tool: Tool }>(`/tools/${id}`, data, token),

  /**
   * Delete a tool
   * @param id - Tool ID
   * @param token - Access token
   */
  delete: (id: string, token: string) =>
    api.delete<void>(`/tools/${id}`, token),

  /**
   * Get all tools assigned to an agent
   * @param agentId - Agent ID
   * @param token - Access token
   */
  getAgentTools: (agentId: string, token: string) =>
    api.get<{ tools: ToolWithAssignment[] }>(`/agents/${agentId}/tools`, token),

  /**
   * Assign a tool to an agent
   * @param agentId - Agent ID
   * @param data - Assignment data
   * @param token - Access token
   */
  assignToAgent: (agentId: string, data: AssignToolInput, token: string) =>
    api.post<{ agentTool: AgentTool }>(`/agents/${agentId}/tools`, data, token),

  /**
   * Update a tool assignment
   * @param agentId - Agent ID
   * @param toolId - Tool ID
   * @param data - Update data
   * @param token - Access token
   */
  updateAgentTool: (agentId: string, toolId: string, data: { enabled: boolean }, token: string) =>
    api.patch<{ agentTool: AgentTool }>(`/agents/${agentId}/tools/${toolId}`, data, token),

  /**
   * Remove a tool from an agent
   * @param agentId - Agent ID
   * @param toolId - Tool ID
   * @param token - Access token
   */
  removeFromAgent: (agentId: string, toolId: string, token: string) =>
    api.delete<void>(`/agents/${agentId}/tools/${toolId}`, token),

  /**
   * Discover tools from an MCP server
   * @param serverUrl - MCP server URL
   * @param auth - Optional authentication
   * @param token - Access token
   */
  discoverMcpTools: (
    serverUrl: string,
    auth: McpConnectorConfig['authentication'] | undefined,
    token: string
  ) =>
    api.post<{ tools: McpDiscoveredTool[] }>('/tools/mcp/discover', { serverUrl, authentication: auth }, token),

  /**
   * Import multiple tools from an MCP server
   * @param agentId - Agent ID to assign tools to
   * @param tools - Tools to import
   * @param serverUrl - MCP server URL
   * @param auth - Optional authentication
   * @param token - Access token
   */
  importMcpTools: (
    agentId: string,
    tools: McpDiscoveredTool[],
    serverUrl: string,
    auth: McpConnectorConfig['authentication'] | undefined,
    token: string
  ) =>
    api.post<{ tools: Tool[] }>(`/agents/${agentId}/tools/mcp/import`, {
      tools,
      serverUrl,
      authentication: auth,
    }, token),
}
