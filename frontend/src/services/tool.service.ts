import { api } from '@/lib/api'

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
  body?: string
  authentication?: ApiConnectorAuth
}

/**
 * Tool type
 */
export interface Tool {
  id: string
  userId: string
  type: 'api_connector'
  name: string
  description: string | null
  enabled: boolean
  config: ApiConnectorConfig
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
 * Create tool input
 */
export interface CreateToolInput {
  type?: 'api_connector'
  name: string
  description?: string
  enabled?: boolean
  config: ApiConnectorConfig
}

/**
 * Update tool input
 */
export interface UpdateToolInput {
  name?: string
  description?: string
  enabled?: boolean
  config?: ApiConnectorConfig
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
}
