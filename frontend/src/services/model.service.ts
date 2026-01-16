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
 * Model service for model operations
 */
export const modelService = {
  /**
   * List all available models
   * @param token - Access token
   */
  list: (token: string) =>
    api.get<{ models: Model[] }>('/models', token),
}
