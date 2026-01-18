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
 * Instructions config type
 */
export interface InstructionsConfig {
  whatDoesAgentDo: string
  howShouldItSpeak: string
  whatShouldItNeverDo: string
  anythingElse: string
}

/**
 * Agent type
 */
export interface Agent {
  id: string
  userId: string
  name: string
  description: string | null
  modelId: string | null
  model: Model | null
  instructionsConfig: InstructionsConfig | null
  systemPrompt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Create agent input
 */
export interface CreateAgentInput {
  name: string
  description?: string
  modelId?: string
}

/**
 * Update agent input
 */
export interface UpdateAgentInput {
  name?: string
  description?: string
  modelId?: string | null
  instructionsConfig?: InstructionsConfig
}

/**
 * Embed config type
 */
export interface EmbedConfig {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  theme: 'light' | 'dark'
}

/**
 * Publish status response type
 */
export interface PublishStatus {
  isPublished: boolean
  hasChanges: boolean
  slug: string | null
  publishedAt: string | null
  toolsCount: number
  modelName: string | null
  embedConfig: EmbedConfig
}

/**
 * Publish response type
 */
export interface PublishResponse {
  slug: string
  publishedAt: string
}

/**
 * Public agent info (for published agents)
 */
export interface PublicAgent {
  id: string
  name: string
  description: string | null
  slug: string
  modelName: string | null
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
  update: (id: string, data: UpdateAgentInput, token: string) =>
    api.patch<{ agent: Agent }>(`/agents/${id}`, data, token),

  /**
   * Delete an agent
   * @param id - Agent ID
   * @param token - Access token
   */
  delete: (id: string, token: string) =>
    api.delete<void>(`/agents/${id}`, token),

  /**
   * Get publish status for an agent
   * @param id - Agent ID
   * @param token - Access token
   */
  getPublishStatus: (id: string, token: string) =>
    api.get<PublishStatus>(`/agents/${id}/publish-status`, token),

  /**
   * Publish an agent
   * @param id - Agent ID
   * @param token - Access token
   */
  publish: (id: string, token: string) =>
    api.post<PublishResponse>(`/agents/${id}/publish`, undefined, token),

  /**
   * Unpublish an agent
   * @param id - Agent ID
   * @param token - Access token
   */
  unpublish: (id: string, token: string) =>
    api.post<void>(`/agents/${id}/unpublish`, undefined, token),

  /**
   * Update embed config for an agent
   * @param id - Agent ID
   * @param config - Embed config
   * @param token - Access token
   */
  updateEmbedConfig: (id: string, config: Partial<EmbedConfig>, token: string) =>
    api.patch<{ embedConfig: EmbedConfig }>(`/agents/${id}/embed-config`, config, token),

  /**
   * Get a published agent by slug (public endpoint)
   * @param slug - Agent slug
   */
  getPublishedBySlug: (slug: string) =>
    api.get<{ agent: PublicAgent }>(`/chat/${slug}`),
}
