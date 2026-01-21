/**
 * Knowledge database module
 * Handles all database operations for knowledge sources, files, and chunks
 */

import { eq, and, sql, desc } from 'drizzle-orm'
import { db } from '../../index'
import {
  knowledgeSources,
  knowledgeFiles,
  knowledgeChunks,
  type InsertKnowledgeSource,
  type InsertKnowledgeFile,
  type InsertKnowledgeChunk,
  type ChunkMetadata,
} from '../../schema/knowledge'

// Re-export types for use in other modules
export type { KnowledgeSource, KnowledgeFile, KnowledgeChunk } from '../../schema/knowledge'
import type { KnowledgeSource, KnowledgeFile, KnowledgeChunk } from '../../schema/knowledge'

// ============================================================================
// Knowledge Sources
// ============================================================================

/**
 * Create a new knowledge source
 * @param data - Knowledge source data
 * @returns Created knowledge source
 */
export async function createKnowledgeSource(
  data: InsertKnowledgeSource
): Promise<KnowledgeSource> {
  const [source] = await db.insert(knowledgeSources).values(data).returning()
  if (!source) {
    throw new Error('Failed to create knowledge source')
  }
  return source
}

/**
 * Find knowledge source by ID
 * @param id - Source ID
 * @returns Knowledge source or null
 */
export async function findKnowledgeSourceById(
  id: string
): Promise<KnowledgeSource | null> {
  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, id))
    .limit(1)

  return source || null
}

/**
 * Find all knowledge sources for an agent
 * @param agentId - Agent ID
 * @returns Array of knowledge sources
 */
export async function findKnowledgeSourcesByAgentId(
  agentId: string
): Promise<KnowledgeSource[]> {
  return db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.agentId, agentId))
    .orderBy(desc(knowledgeSources.createdAt))
}

/**
 * Update knowledge source
 * @param id - Source ID
 * @param data - Fields to update
 * @returns Updated knowledge source
 */
export async function updateKnowledgeSource(
  id: string,
  data: Partial<InsertKnowledgeSource>
): Promise<KnowledgeSource> {
  const [source] = await db
    .update(knowledgeSources)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(knowledgeSources.id, id))
    .returning()

  if (!source) {
    throw new Error('Knowledge source not found')
  }
  return source
}

/**
 * Delete knowledge source (cascades to files and chunks)
 * @param id - Source ID
 */
export async function deleteKnowledgeSource(id: string): Promise<void> {
  await db.delete(knowledgeSources).where(eq(knowledgeSources.id, id))
}

/**
 * Check if knowledge source belongs to user
 * @param sourceId - Source ID
 * @param userId - User ID
 * @returns True if belongs to user
 */
export async function knowledgeSourceBelongsToUser(
  sourceId: string,
  userId: string
): Promise<boolean> {
  const [source] = await db
    .select({ id: knowledgeSources.id })
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.id, sourceId),
        eq(knowledgeSources.userId, userId)
      )
    )
    .limit(1)

  return !!source
}

/**
 * Get total file size for an agent's knowledge
 * @param agentId - Agent ID
 * @returns Total size in bytes
 */
export async function getTotalFileSizeForAgent(agentId: string): Promise<number> {
  const result = await db
    .select({
      totalSize: sql<string>`COALESCE(SUM(${knowledgeFiles.fileSizeBytes}), 0)::text`,
    })
    .from(knowledgeFiles)
    .innerJoin(
      knowledgeSources,
      eq(knowledgeFiles.sourceId, knowledgeSources.id)
    )
    .where(eq(knowledgeSources.agentId, agentId))

  // PostgreSQL returns bigint as string, so parse it
  const totalSize = result[0]?.totalSize
  return totalSize ? parseInt(totalSize, 10) : 0
}

// ============================================================================
// Knowledge Files
// ============================================================================

/**
 * Create a new knowledge file
 * @param data - File data
 * @returns Created file record
 */
export async function createKnowledgeFile(
  data: InsertKnowledgeFile
): Promise<KnowledgeFile> {
  const [file] = await db.insert(knowledgeFiles).values(data).returning()
  if (!file) {
    throw new Error('Failed to create knowledge file')
  }
  return file
}

/**
 * Find knowledge file by ID
 * @param id - File ID
 * @returns Knowledge file or null
 */
export async function findKnowledgeFileById(
  id: string
): Promise<KnowledgeFile | null> {
  const [file] = await db
    .select()
    .from(knowledgeFiles)
    .where(eq(knowledgeFiles.id, id))
    .limit(1)

  return file || null
}

/**
 * Find all files for a knowledge source
 * @param sourceId - Source ID
 * @returns Array of files
 */
export async function findKnowledgeFilesBySourceId(
  sourceId: string
): Promise<KnowledgeFile[]> {
  return db
    .select()
    .from(knowledgeFiles)
    .where(eq(knowledgeFiles.sourceId, sourceId))
    .orderBy(desc(knowledgeFiles.createdAt))
}

/**
 * Update knowledge file
 * @param id - File ID
 * @param data - Fields to update
 * @returns Updated file
 */
export async function updateKnowledgeFile(
  id: string,
  data: Partial<InsertKnowledgeFile>
): Promise<KnowledgeFile> {
  const [file] = await db
    .update(knowledgeFiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(knowledgeFiles.id, id))
    .returning()

  if (!file) {
    throw new Error('Knowledge file not found')
  }
  return file
}

/**
 * Delete knowledge file
 * @param id - File ID
 */
export async function deleteKnowledgeFile(id: string): Promise<void> {
  await db.delete(knowledgeFiles).where(eq(knowledgeFiles.id, id))
}

// ============================================================================
// Knowledge Chunks
// ============================================================================

/**
 * Create multiple knowledge chunks in a batch
 * @param chunks - Array of chunk data
 * @returns Number of chunks created
 */
export async function createKnowledgeChunks(
  chunks: Array<{
    sourceId: string
    fileId?: string
    chunkIndex: number
    content: string
    contentLength: number
    metadata?: ChunkMetadata
    embedding: number[]
  }>
): Promise<number> {
  if (chunks.length === 0) return 0

  // Insert chunks in batches of 100 to avoid query size limits
  const batchSize = 100
  let totalInserted = 0

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)

    // Use raw SQL for vector insertion
    const values = batch.map((chunk) => ({
      sourceId: chunk.sourceId,
      fileId: chunk.fileId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      contentLength: chunk.contentLength,
      metadata: chunk.metadata,
      embedding: chunk.embedding,
    }))

    await db.insert(knowledgeChunks).values(values)
    totalInserted += batch.length
  }

  return totalInserted
}

/**
 * Delete all chunks for a knowledge source
 * @param sourceId - Source ID
 * @returns Number of chunks deleted
 */
export async function deleteChunksBySourceId(sourceId: string): Promise<number> {
  const result = await db
    .delete(knowledgeChunks)
    .where(eq(knowledgeChunks.sourceId, sourceId))
    .returning()

  return result.length
}

/**
 * Delete all chunks for a knowledge file
 * @param fileId - File ID
 * @returns Number of chunks deleted
 */
export async function deleteChunksByFileId(fileId: string): Promise<number> {
  const result = await db
    .delete(knowledgeChunks)
    .where(eq(knowledgeChunks.fileId, fileId))
    .returning()

  return result.length
}

/**
 * Search result row type
 */
interface SearchResultRow {
  id: string
  source_id: string
  file_id: string | null
  chunk_index: number
  content: string
  content_length: number
  metadata: ChunkMetadata | null
  created_at: Date
  similarity: number
  source_name: string
}

/**
 * Search knowledge chunks by vector similarity (cosine distance)
 * @param agentId - Agent ID to search within
 * @param queryEmbedding - Query vector
 * @param limit - Maximum results
 * @param similarityThreshold - Minimum similarity (0-1)
 * @returns Array of matching chunks with similarity scores
 */
export async function searchKnowledgeChunks(
  agentId: string,
  queryEmbedding: number[],
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<Array<{
  chunk: KnowledgeChunk
  similarity: number
  sourceName: string
}>> {
  // Convert embedding array to pgvector format
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  // Use cosine similarity (1 - cosine distance)
  // pgvector uses <=> for cosine distance
  const results = await db.execute(sql`
    SELECT
      kc.id,
      kc.source_id,
      kc.file_id,
      kc.chunk_index,
      kc.content,
      kc.content_length,
      kc.metadata,
      kc.created_at,
      1 - (kc.embedding <=> ${embeddingStr}::vector) as similarity,
      ks.name as source_name
    FROM knowledge_chunks kc
    INNER JOIN knowledge_sources ks ON kc.source_id = ks.id
    WHERE ks.agent_id = ${agentId}
      AND ks.status = 'ready'
      AND 1 - (kc.embedding <=> ${embeddingStr}::vector) >= ${similarityThreshold}
    ORDER BY kc.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `)

  // Cast results to expected type
  const rows = results as unknown as SearchResultRow[]

  return rows.map((row) => ({
    chunk: {
      id: row.id,
      sourceId: row.source_id,
      fileId: row.file_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      contentLength: row.content_length,
      metadata: row.metadata,
      embedding: [], // Don't return embedding to save bandwidth
      createdAt: row.created_at,
    },
    similarity: row.similarity,
    sourceName: row.source_name,
  }))
}

/**
 * Get chunk count for a source
 * @param sourceId - Source ID
 * @returns Number of chunks
 */
export async function getChunkCountForSource(sourceId: string): Promise<number> {
  const result = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.sourceId, sourceId))

  return result[0]?.count || 0
}

/**
 * Check if agent has any ready knowledge sources
 * @param agentId - Agent ID
 * @returns True if has ready knowledge
 */
export async function agentHasKnowledge(agentId: string): Promise<boolean> {
  const [source] = await db
    .select({ id: knowledgeSources.id })
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.agentId, agentId),
        eq(knowledgeSources.status, 'ready')
      )
    )
    .limit(1)

  return !!source
}
