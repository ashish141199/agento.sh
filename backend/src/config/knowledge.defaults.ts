/**
 * Knowledge feature default configurations
 * All knowledge-related settings are centralized here for easy modification
 */

/**
 * Embedding configuration defaults
 */
export const EMBEDDING_DEFAULTS = {
  /** OpenAI embedding model to use */
  model: 'text-embedding-3-small',
  /** Embedding vector dimensions */
  dimensions: 1536,
  /** Maximum tokens per embedding request */
  maxTokensPerRequest: 8191,
  /** Batch size for embedding multiple chunks */
  batchSize: 100,
} as const

/**
 * Chunking configuration defaults
 */
export const CHUNKING_DEFAULTS = {
  /** Target chunk size in characters */
  chunkSize: 1000,
  /** Overlap between chunks in characters */
  chunkOverlap: 200,
  /** Minimum chunk size (chunks smaller than this are merged) */
  minChunkSize: 100,
  /** Maximum chunk size (hard limit) */
  maxChunkSize: 2000,
  /** Delimiters for semantic chunking (in priority order) */
  delimiters: ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' '],
} as const

/**
 * File upload configuration defaults
 */
export const FILE_UPLOAD_DEFAULTS = {
  /** Maximum file size in bytes (5MB) */
  maxFileSizeBytes: 5 * 1024 * 1024,
  /** Maximum total size per agent in bytes (20MB) */
  maxTotalSizePerAgentBytes: 20 * 1024 * 1024,
  /** Allowed MIME types for upload */
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/json',
  ] as const,
  /** File extensions mapped to MIME types */
  extensionToMimeType: {
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.md': 'text/markdown',
    '.json': 'application/json',
  } as const,
} as const

/**
 * Website crawling configuration defaults
 */
export const WEBSITE_CRAWL_DEFAULTS = {
  /** Maximum pages to crawl per website */
  maxPages: 100,
  /** Maximum crawl depth from starting URL */
  maxDepth: 10,
  /** Request timeout in milliseconds */
  requestTimeoutMs: 10000,
  /** Delay between requests in milliseconds */
  delayBetweenRequestsMs: 500,
  /** User agent string for requests */
  userAgent: 'Autive-Bot/1.0 (Knowledge Crawler)',
  /** Maximum content size per page in bytes (1MB) */
  maxContentSizeBytes: 1024 * 1024,
} as const

/**
 * Knowledge retrieval configuration defaults
 */
export const RETRIEVAL_DEFAULTS = {
  /** Default number of chunks to retrieve */
  topK: 5,
  /** Minimum similarity score (0-1, cosine similarity) */
  similarityThreshold: 0.5,
  /** Default retrieval mode */
  mode: 'tool' as const,
  /** Maximum chunks to inject in auto-inject mode */
  maxAutoInjectChunks: 10,
} as const

/**
 * Knowledge settings for agents
 */
export interface KnowledgeSettings {
  /** Whether knowledge is enabled for this agent */
  enabled: boolean
  /** Retrieval mode: 'tool' = use searchKnowledge tool, 'auto_inject' = inject with every message */
  mode: 'tool' | 'auto_inject'
  /** Number of chunks to retrieve */
  topK: number
  /** Minimum similarity score for results */
  similarityThreshold: number
}

/**
 * Default knowledge settings
 */
export const DEFAULT_KNOWLEDGE_SETTINGS: KnowledgeSettings = {
  enabled: true,
  mode: RETRIEVAL_DEFAULTS.mode,
  topK: RETRIEVAL_DEFAULTS.topK,
  similarityThreshold: RETRIEVAL_DEFAULTS.similarityThreshold,
}

/**
 * S3 configuration for knowledge files
 */
export const S3_KNOWLEDGE_DEFAULTS = {
  /** S3 bucket name */
  bucket: 'autive',
  /** Base folder path for knowledge files */
  basePath: 'agents',
  /** Subfolder for knowledge files */
  knowledgeFolder: 'knowledge',
} as const

/**
 * Processing status enum values
 */
export const KNOWLEDGE_SOURCE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const

/**
 * Knowledge source type enum values
 */
export const KNOWLEDGE_SOURCE_TYPE = {
  FILE: 'file',
  WEBSITE: 'website',
  NOTION: 'notion',
  GOOGLE_DRIVE: 'google_drive',
} as const

export type KnowledgeSourceStatus = typeof KNOWLEDGE_SOURCE_STATUS[keyof typeof KNOWLEDGE_SOURCE_STATUS]
export type KnowledgeSourceType = typeof KNOWLEDGE_SOURCE_TYPE[keyof typeof KNOWLEDGE_SOURCE_TYPE]
