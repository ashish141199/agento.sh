/**
 * Knowledge API types
 */

/**
 * Knowledge source type
 */
export type KnowledgeSourceType = 'file' | 'website' | 'notion' | 'google_drive'

/**
 * Knowledge source status
 */
export type KnowledgeSourceStatus = 'pending' | 'processing' | 'ready' | 'failed'

/**
 * Knowledge file status
 */
export type KnowledgeFileStatus = 'pending' | 'processing' | 'ready' | 'failed'

/**
 * Website source metadata
 */
export interface WebsiteSourceMetadata {
  url: string
  pagesDiscovered?: number
  pagesCrawled?: number
  lastCrawledAt?: string
}

/**
 * File source metadata
 */
export interface FileSourceMetadata {
  totalFiles?: number
  totalSizeBytes?: number
}

/**
 * Knowledge source
 */
export interface KnowledgeSource {
  id: string
  agentId: string
  userId: string
  name: string
  type: KnowledgeSourceType
  status: KnowledgeSourceStatus
  errorMessage?: string | null
  metadata?: WebsiteSourceMetadata | FileSourceMetadata | null
  chunkCount: number
  totalCharacters: number
  lastTrainedAt?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Knowledge file
 */
export interface KnowledgeFile {
  id: string
  sourceId: string
  fileName: string
  fileKey: string
  fileSizeBytes: number
  mimeType: string
  status: KnowledgeFileStatus
  errorMessage?: string | null
  chunkCount: number
  createdAt: string
  updatedAt: string
}

/**
 * File upload result
 */
export interface FileProcessingResult {
  success: boolean
  fileName: string
  fileId?: string
  error?: string
  chunkCount?: number
}

/**
 * Knowledge source creation result
 */
export interface KnowledgeSourceResult {
  source: KnowledgeSource
  files: FileProcessingResult[]
}

/**
 * Knowledge search result
 */
export interface KnowledgeSearchResult {
  content: string
  source: string
  similarity: number
  metadata?: {
    section?: string
    pageNumber?: number
  }
}

/**
 * Knowledge retrieval settings
 */
export interface KnowledgeSettings {
  enabled: boolean
  mode: 'tool' | 'auto_inject'
  topK: number
  similarityThreshold: number
}
