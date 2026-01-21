/**
 * Knowledge database schema
 * Tables for storing knowledge sources, files, and vector chunks
 */

import { pgTable, text, timestamp, jsonb, pgEnum, integer, index, uniqueIndex, customType } from 'drizzle-orm/pg-core'
import { agents } from './agents'
import { users } from './users'

/**
 * Custom vector type for pgvector extension
 * @param dimensions - Number of dimensions for the vector (default: 1536 for OpenAI text-embedding-3-small)
 */
const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config) {
    const dimensions = (config as { dimensions?: number })?.dimensions ?? 1536
    return `vector(${dimensions})`
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    // pgvector returns format: [0.1,0.2,0.3,...]
    return value
      .slice(1, -1)
      .split(',')
      .map(Number)
  },
})

/**
 * Knowledge source type enum
 */
export const knowledgeSourceTypeEnum = pgEnum('knowledge_source_type', [
  'file',
  'website',
  'notion',
  'google_drive',
])

/**
 * Knowledge source status enum
 */
export const knowledgeSourceStatusEnum = pgEnum('knowledge_source_status', [
  'pending',
  'processing',
  'ready',
  'failed',
])

/**
 * Knowledge file status enum
 */
export const knowledgeFileStatusEnum = pgEnum('knowledge_file_status', [
  'pending',
  'processing',
  'ready',
  'failed',
])

/**
 * Metadata for website sources
 */
export interface WebsiteSourceMetadata {
  url: string
  pagesDiscovered?: number
  pagesCrawled?: number
  lastCrawledAt?: string
}

/**
 * Metadata for file sources
 */
export interface FileSourceMetadata {
  totalFiles?: number
  totalSizeBytes?: number
}

/**
 * Metadata for integration sources (Notion, Google Drive)
 */
export interface IntegrationSourceMetadata {
  connectionId?: string
  lastSyncedAt?: string
  itemCount?: number
}

/**
 * Union type for source metadata
 */
export type KnowledgeSourceMetadata = WebsiteSourceMetadata | FileSourceMetadata | IntegrationSourceMetadata

/**
 * Chunk metadata for additional context
 */
export interface ChunkMetadata {
  /** Source file name or page URL */
  source?: string
  /** Page number (for PDFs) */
  pageNumber?: number
  /** Section or heading */
  section?: string
  /** Character position in original document */
  charStart?: number
  /** Character end position */
  charEnd?: number
}

/**
 * Knowledge sources table
 * Stores the main knowledge source records (files, websites, integrations)
 */
export const knowledgeSources = pgTable('knowledge_sources', {
  /** Unique identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Agent this knowledge belongs to */
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),

  /** User who owns this knowledge source */
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** Auto-generated name from filename or URL */
  name: text('name').notNull(),

  /** Type of knowledge source */
  type: knowledgeSourceTypeEnum('type').notNull(),

  /** Processing status */
  status: knowledgeSourceStatusEnum('status').notNull().default('pending'),

  /** Error message if processing failed */
  errorMessage: text('error_message'),

  /** Type-specific metadata */
  metadata: jsonb('metadata').$type<KnowledgeSourceMetadata>(),

  /** Total chunks created from this source */
  chunkCount: integer('chunk_count').notNull().default(0),

  /** Total characters in all chunks */
  totalCharacters: integer('total_characters').notNull().default(0),

  /** Timestamp when source was last trained/embedded */
  lastTrainedAt: timestamp('last_trained_at'),

  /** Timestamp when source was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),

  /** Timestamp when source was last updated */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('knowledge_sources_agent_id_idx').on(table.agentId),
  index('knowledge_sources_user_id_idx').on(table.userId),
  index('knowledge_sources_status_idx').on(table.status),
])

/**
 * Knowledge files table
 * Stores individual files within a knowledge source
 */
export const knowledgeFiles = pgTable('knowledge_files', {
  /** Unique identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Parent knowledge source */
  sourceId: text('source_id')
    .notNull()
    .references(() => knowledgeSources.id, { onDelete: 'cascade' }),

  /** Original filename */
  fileName: text('file_name').notNull(),

  /** S3 object key */
  fileKey: text('file_key').notNull(),

  /** File size in bytes */
  fileSizeBytes: integer('file_size_bytes').notNull(),

  /** MIME type */
  mimeType: text('mime_type').notNull(),

  /** Processing status */
  status: knowledgeFileStatusEnum('status').notNull().default('pending'),

  /** Error message if processing failed */
  errorMessage: text('error_message'),

  /** Number of chunks created from this file */
  chunkCount: integer('chunk_count').notNull().default(0),

  /** Timestamp when file was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),

  /** Timestamp when file was last updated */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('knowledge_files_source_id_idx').on(table.sourceId),
  uniqueIndex('knowledge_files_file_key_idx').on(table.fileKey),
])

/**
 * Knowledge chunks table
 * Stores chunked content with vector embeddings for semantic search
 * Note: The embedding column uses pgvector extension
 */
export const knowledgeChunks = pgTable('knowledge_chunks', {
  /** Unique identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Parent knowledge source */
  sourceId: text('source_id')
    .notNull()
    .references(() => knowledgeSources.id, { onDelete: 'cascade' }),

  /** Parent file (null for website chunks) */
  fileId: text('file_id')
    .references(() => knowledgeFiles.id, { onDelete: 'cascade' }),

  /** Chunk index within the source/file */
  chunkIndex: integer('chunk_index').notNull(),

  /** The actual text content */
  content: text('content').notNull(),

  /** Character count */
  contentLength: integer('content_length').notNull(),

  /** Additional metadata about this chunk */
  metadata: jsonb('metadata').$type<ChunkMetadata>(),

  /** Vector embedding (1536 dimensions for text-embedding-3-small) */
  embedding: vector('embedding', { dimensions: 1536 }),

  /** Timestamp when chunk was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('knowledge_chunks_source_id_idx').on(table.sourceId),
  index('knowledge_chunks_file_id_idx').on(table.fileId),
])

/**
 * Knowledge source type inferred from schema
 */
export type KnowledgeSource = typeof knowledgeSources.$inferSelect

/**
 * Insert knowledge source type
 */
export type InsertKnowledgeSource = typeof knowledgeSources.$inferInsert

/**
 * Knowledge file type inferred from schema
 */
export type KnowledgeFile = typeof knowledgeFiles.$inferSelect

/**
 * Insert knowledge file type
 */
export type InsertKnowledgeFile = typeof knowledgeFiles.$inferInsert

/**
 * Knowledge chunk type inferred from schema
 */
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect

/**
 * Insert knowledge chunk type
 */
export type InsertKnowledgeChunk = typeof knowledgeChunks.$inferInsert
