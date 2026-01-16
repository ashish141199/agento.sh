import { api } from '@/lib/api'

/**
 * Model type
 */
export interface Model {
  id: string
  modelId: string
  name: string
  provider: string
  createdAt: string
}

/**
 * Agent type
 */
export interface Agent {
  id: string
  userId: string
  name: string
  description: string | null
  modelId: string
  model: Model
  createdAt: string
  updatedAt: string
}

/**
 * Create agent input
 */
export interface CreateAgentInput {
  name: string
  description?: string
  modelId: string
}

/**
 * List agents options
 */
export interface ListAgentsOptions {
  search?: string
  sortBy?: 'name' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Agent service for agent operations
 */
export const agentService = {
  /**
   * List all agents
   * @param token - Access token
   * @param options - Search and sort options
   */
  list: (token: string, options?: ListAgentsOptions) => {
    const params = new URLSearchParams()
    if (options?.search) params.set('search', options.search)
    if (options?.sortBy) params.set('sortBy', options.sortBy)
    if (options?.sortOrder) params.set('sortOrder', options.sortOrder)
    const query = params.toString()
    return api.get<{ agents: Agent[] }>(`/agents${query ? `?${query}` : ''}`, token)
  },

  /**
   * Get a specific agent
   * @param id - Agent ID
   * @param token - Access token
   */
  get: (id: string, token: string) =>
    api.get<{ agent: Agent }>(`/agents/${id}`, token),

  /**
   * Create a new agent
   * @param data - Agent data
   * @param token - Access token
   */
  create: (data: CreateAgentInput, token: string) =>
    api.post<{ agent: Agent }>('/agents', data, token),

  /**
   * Update an agent
   * @param id - Agent ID
   * @param data - Agent data
   * @param token - Access token
   */
  update: (id: string, data: Partial<CreateAgentInput>, token: string) =>
    api.patch<{ agent: Agent }>(`/agents/${id}`, data, token),

  /**
   * Delete an agent
   * @param id - Agent ID
   * @param token - Access token
   */
  delete: (id: string, token: string) =>
    api.delete<void>(`/agents/${id}`, token),
}
