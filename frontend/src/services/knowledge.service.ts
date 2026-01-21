/**
 * Knowledge service
 * API operations for agent knowledge sources
 */

import { api, API_BASE_URL } from '@/lib/api'
import type {
  KnowledgeSource,
  KnowledgeFile,
  KnowledgeSourceResult,
  KnowledgeSearchResult,
} from '@/types/api/knowledge'

/**
 * Response types
 */
interface KnowledgeSourcesResponse {
  sources: KnowledgeSource[]
}

interface KnowledgeSourceResponse {
  source: KnowledgeSource
  files: KnowledgeFile[]
}

interface KnowledgeUploadResponse {
  source: KnowledgeSource
  files: Array<{
    success: boolean
    fileName: string
    fileId?: string
    error?: string
    chunkCount?: number
  }>
}

interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[]
}

interface WebsiteDiscoveryResponse {
  pages: Array<{ url: string; title: string }>
  stats: {
    totalDiscovered: number
    durationMs: number
  }
}

interface WebsiteIndexResponse {
  source: KnowledgeSource
}

/**
 * Knowledge service for managing agent knowledge sources
 */
export const knowledgeService = {
  /**
   * Get all knowledge sources for an agent
   * @param agentId - Agent ID
   * @param token - Access token
   */
  list: (agentId: string, token: string) =>
    api.get<KnowledgeSourcesResponse>(`/agents/${agentId}/knowledge`, token),

  /**
   * Get a specific knowledge source with files
   * @param agentId - Agent ID
   * @param sourceId - Source ID
   * @param token - Access token
   */
  get: (agentId: string, sourceId: string, token: string) =>
    api.get<KnowledgeSourceResponse>(
      `/agents/${agentId}/knowledge/${sourceId}`,
      token
    ),

  /**
   * Upload files to create a knowledge source
   * @param agentId - Agent ID
   * @param files - Files to upload
   * @param token - Access token
   * @returns Upload result
   */
  uploadFiles: async (
    agentId: string,
    files: File[],
    token: string
  ): Promise<{ success: boolean; message: string; data?: KnowledgeUploadResponse }> => {
    const formData = new FormData()

    for (const file of files) {
      formData.append('files', file)
    }

    const response = await fetch(
      `${API_BASE_URL}/agents/${agentId}/knowledge/files`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    )

    const data = await response.json()
    return data
  },

  /**
   * Add a website as knowledge source (legacy - crawls and indexes immediately)
   * @param agentId - Agent ID
   * @param url - Website URL
   * @param token - Access token
   */
  addWebsite: (agentId: string, url: string, token: string) =>
    api.post<{ source: KnowledgeSource }>(
      `/agents/${agentId}/knowledge/website`,
      { url },
      token
    ),

  /**
   * Discover pages of a website without indexing
   * Fast operation that only fetches page titles and links
   * @param agentId - Agent ID
   * @param url - Website URL to discover
   * @param token - Access token
   */
  discoverWebsite: (agentId: string, url: string, token: string) =>
    api.post<WebsiteDiscoveryResponse>(
      `/agents/${agentId}/knowledge/website/discover`,
      { url },
      token
    ),

  /**
   * Index specific pages of a website
   * @param agentId - Agent ID
   * @param url - Base website URL
   * @param pageUrls - Specific page URLs to index
   * @param token - Access token
   */
  indexWebsite: (agentId: string, url: string, pageUrls: string[], token: string) =>
    api.post<WebsiteIndexResponse>(
      `/agents/${agentId}/knowledge/website/index`,
      { url, pageUrls },
      token
    ),

  /**
   * Retrain a knowledge source
   * @param agentId - Agent ID
   * @param sourceId - Source ID
   * @param token - Access token
   */
  retrain: (agentId: string, sourceId: string, token: string) =>
    api.post<{ source: KnowledgeSource }>(
      `/agents/${agentId}/knowledge/${sourceId}/retrain`,
      undefined,
      token
    ),

  /**
   * Delete a knowledge source
   * @param agentId - Agent ID
   * @param sourceId - Source ID
   * @param token - Access token
   */
  delete: (agentId: string, sourceId: string, token: string) =>
    api.delete<void>(`/agents/${agentId}/knowledge/${sourceId}`, token),

  /**
   * Search knowledge for an agent
   * @param agentId - Agent ID
   * @param query - Search query
   * @param token - Access token
   * @param options - Search options
   */
  search: (
    agentId: string,
    query: string,
    token: string,
    options?: { limit?: number; similarityThreshold?: number }
  ) =>
    api.post<KnowledgeSearchResponse>(
      `/agents/${agentId}/knowledge/search`,
      { query, ...options },
      token
    ),
}
