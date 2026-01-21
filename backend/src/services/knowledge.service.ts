/**
 * Knowledge service
 * Orchestrates knowledge source creation, processing, and search
 */

import { s3Service } from './s3.service'
import { embeddingService } from './embedding.service'
import {
  parseAndChunk,
  crawlAndChunk,
  isSupported,
  type TextChunk,
} from './document-processing'
import { websiteCrawler, type DiscoveryResult } from './document-processing/website.crawler'
import { textChunker } from './document-processing/chunker.service'
import {
  createKnowledgeSource,
  updateKnowledgeSource,
  deleteKnowledgeSource,
  findKnowledgeSourceById,
  findKnowledgeSourcesByAgentId,
  createKnowledgeFile,
  updateKnowledgeFile,
  findKnowledgeFilesBySourceId,
  createKnowledgeChunks,
  deleteChunksBySourceId,
  searchKnowledgeChunks,
  getTotalFileSizeForAgent,
  knowledgeSourceBelongsToUser,
  agentHasKnowledge,
  type KnowledgeSource,
  type KnowledgeFile,
} from '../db/modules/knowledge/knowledge.db'
import {
  FILE_UPLOAD_DEFAULTS,
  KNOWLEDGE_SOURCE_STATUS,
  KNOWLEDGE_SOURCE_TYPE,
  type KnowledgeSourceStatus,
} from '../config/knowledge.defaults'
import type { FileSourceMetadata, WebsiteSourceMetadata } from '../db/schema/knowledge'

// Re-export from db module for convenience
export {
  findKnowledgeSourceById,
  findKnowledgeSourcesByAgentId,
  findKnowledgeFilesBySourceId,
  knowledgeSourceBelongsToUser,
  agentHasKnowledge,
}
export type { KnowledgeSource, KnowledgeFile }

/**
 * File upload input
 */
export interface FileUploadInput {
  /** File buffer */
  buffer: Buffer
  /** Original file name */
  fileName: string
  /** MIME type */
  mimeType: string
  /** File size in bytes */
  size: number
}

/**
 * Processing result for a single file
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
 * Search result item
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
 * Auto-generate a name from filename or URL
 * @param input - File name or URL
 * @returns Human-readable name
 */
function generateSourceName(input: string): string {
  // For URLs, extract domain and path
  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const url = new URL(input)
      const domain = url.hostname.replace('www.', '')
      return `Website: ${domain}`
    } catch {
      return input.slice(0, 50)
    }
  }

  // For files, use filename without extension
  const baseName = input.split('/').pop() || input
  const nameWithoutExt = baseName.replace(/\.[^.]+$/, '')

  // Clean up and limit length
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

/**
 * Create a file-based knowledge source with uploaded files
 * @param agentId - Agent ID
 * @param userId - User ID
 * @param files - Array of file uploads
 * @returns Created source with processing results
 */
export async function createFileKnowledgeSource(
  agentId: string,
  userId: string,
  files: FileUploadInput[]
): Promise<KnowledgeSourceResult> {
  console.log('[KnowledgeService] Creating file knowledge source:', {
    agentId,
    fileCount: files.length,
    files: files.map(f => ({ name: f.fileName, size: f.size, mimeType: f.mimeType, bufferSize: f.buffer?.length })),
  })

  // Validate total size
  const currentSize = await getTotalFileSizeForAgent(agentId)
  const newSize = files.reduce((sum, f) => sum + (f.size || 0), 0)

  console.log('[KnowledgeService] Size check:', {
    currentSize,
    newSize,
    limit: FILE_UPLOAD_DEFAULTS.maxTotalSizePerAgentBytes,
    willExceed: currentSize + newSize > FILE_UPLOAD_DEFAULTS.maxTotalSizePerAgentBytes,
  })

  if (currentSize + newSize > FILE_UPLOAD_DEFAULTS.maxTotalSizePerAgentBytes) {
    throw new Error(
      `Total file size exceeds limit. Current: ${Math.round(currentSize / 1024 / 1024)}MB, ` +
      `New: ${Math.round(newSize / 1024 / 1024)}MB, ` +
      `Limit: ${Math.round(FILE_UPLOAD_DEFAULTS.maxTotalSizePerAgentBytes / 1024 / 1024)}MB`
    )
  }

  // Validate individual file sizes and types
  for (const file of files) {
    if (file.size > FILE_UPLOAD_DEFAULTS.maxFileSizeBytes) {
      throw new Error(
        `File "${file.fileName}" exceeds size limit of ${FILE_UPLOAD_DEFAULTS.maxFileSizeBytes / 1024 / 1024}MB`
      )
    }

    if (!isSupported(file.mimeType)) {
      throw new Error(`File type "${file.mimeType}" is not supported for "${file.fileName}"`)
    }
  }

  // Generate source name from first file
  const sourceName = files.length === 1
    ? generateSourceName(files[0]!.fileName)
    : `${files.length} files`

  // Create knowledge source
  const source = await createKnowledgeSource({
    agentId,
    userId,
    name: sourceName,
    type: KNOWLEDGE_SOURCE_TYPE.FILE,
    status: KNOWLEDGE_SOURCE_STATUS.PROCESSING,
    metadata: {
      totalFiles: files.length,
      totalSizeBytes: newSize,
    } as FileSourceMetadata,
  })

  const fileResults: FileProcessingResult[] = []

  // Process each file
  for (const file of files) {
    try {
      const result = await processFileUpload(source.id, agentId, file)
      fileResults.push(result)
    } catch (error) {
      fileResults.push({
        success: false,
        fileName: file.fileName,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Update source status based on results
  const successCount = fileResults.filter(r => r.success).length
  const totalChunks = fileResults.reduce((sum, r) => sum + (r.chunkCount || 0), 0)

  let finalStatus: KnowledgeSourceStatus
  let errorMessage: string | undefined

  if (successCount === 0) {
    finalStatus = KNOWLEDGE_SOURCE_STATUS.FAILED
    errorMessage = fileResults.map(r => r.error).filter(Boolean).join('; ')
  } else if (successCount < files.length) {
    // Partial success - mark as ready but note errors
    finalStatus = KNOWLEDGE_SOURCE_STATUS.READY
    const failures = fileResults.filter(r => !r.success)
    errorMessage = `${failures.length} file(s) failed: ${failures.map(r => r.fileName).join(', ')}`
  } else {
    finalStatus = KNOWLEDGE_SOURCE_STATUS.READY
  }

  const updatedSource = await updateKnowledgeSource(source.id, {
    status: finalStatus,
    errorMessage,
    chunkCount: totalChunks,
    totalCharacters: totalChunks * 500, // Approximate
    lastTrainedAt: new Date(),
  })

  return { source: updatedSource, files: fileResults }
}

/**
 * Process a single file upload
 * @param sourceId - Knowledge source ID
 * @param agentId - Agent ID
 * @param file - File upload data
 * @returns Processing result
 */
async function processFileUpload(
  sourceId: string,
  agentId: string,
  file: FileUploadInput
): Promise<FileProcessingResult> {
  // Upload to S3
  const uploadResult = await s3Service.uploadFile({
    file: file.buffer,
    fileName: file.fileName,
    contentType: file.mimeType,
    agentId,
  })

  if (!uploadResult.success || !uploadResult.data) {
    throw new Error(`S3 upload failed: ${uploadResult.message}`)
  }

  // Create file record
  const fileRecord = await createKnowledgeFile({
    sourceId,
    fileName: file.fileName,
    fileKey: uploadResult.data.key,
    fileSizeBytes: file.size,
    mimeType: file.mimeType,
    status: 'processing',
  })

  try {
    // Parse and chunk the document
    const chunks = await parseAndChunk(file.buffer, file.fileName, file.mimeType)

    if (chunks.length === 0) {
      throw new Error('No content could be extracted from file')
    }

    // Generate embeddings
    const texts = chunks.map(c => c.content)
    const embeddingResult = await embeddingService.embedTexts(texts)

    if (embeddingResult.errors.length > 0) {
      console.warn('[KnowledgeService] Some embeddings failed', embeddingResult.errors)
    }

    // Store chunks with embeddings
    const chunksToStore = embeddingResult.results.map((result, index) => {
      const chunk = chunks[index]!
      return {
        sourceId,
        fileId: fileRecord.id,
        chunkIndex: index,
        content: result.text,
        contentLength: result.text.length,
        metadata: chunk.metadata,
        embedding: result.embedding,
      }
    })

    const storedCount = await createKnowledgeChunks(chunksToStore)

    // Update file record
    await updateKnowledgeFile(fileRecord.id, {
      status: 'ready',
      chunkCount: storedCount,
    })

    return {
      success: true,
      fileName: file.fileName,
      fileId: fileRecord.id,
      chunkCount: storedCount,
    }
  } catch (error) {
    // Mark file as failed
    await updateKnowledgeFile(fileRecord.id, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    throw error
  }
}

/**
 * Create a website knowledge source
 * @param agentId - Agent ID
 * @param userId - User ID
 * @param url - Website URL to crawl
 * @param onProgress - Optional progress callback
 * @returns Created source
 */
export async function createWebsiteKnowledgeSource(
  agentId: string,
  userId: string,
  url: string,
  onProgress?: (status: string, progress: number) => void
): Promise<KnowledgeSource> {
  // Validate URL
  try {
    new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  // Create knowledge source
  const source = await createKnowledgeSource({
    agentId,
    userId,
    name: generateSourceName(url),
    type: KNOWLEDGE_SOURCE_TYPE.WEBSITE,
    status: KNOWLEDGE_SOURCE_STATUS.PROCESSING,
    metadata: {
      url,
      pagesDiscovered: 0,
      pagesCrawled: 0,
    } as WebsiteSourceMetadata,
  })

  try {
    console.log(`[KnowledgeService] Creating website knowledge source for ${url}`)

    if (onProgress) onProgress('Crawling website...', 0)

    // Crawl and chunk the website
    const { chunks, result } = await crawlAndChunk(url, (crawled, discovered) => {
      if (onProgress) {
        const progress = Math.round((crawled / Math.max(discovered, 1)) * 50)
        onProgress(`Crawled ${crawled}/${discovered} pages`, progress)
      }
    })

    console.log(`[KnowledgeService] Crawl result for ${url}:`, {
      pagesCount: result.pages.length,
      chunksCount: chunks.length,
      failed: result.failed,
      stats: result.stats,
    })

    // Update metadata with crawl stats
    await updateKnowledgeSource(source.id, {
      metadata: {
        url,
        pagesDiscovered: result.stats.totalDiscovered,
        pagesCrawled: result.stats.totalCrawled,
        lastCrawledAt: new Date().toISOString(),
      } as WebsiteSourceMetadata,
    })

    if (chunks.length === 0) {
      throw new Error('No content could be extracted from website')
    }

    if (onProgress) onProgress('Generating embeddings...', 50)

    // Generate embeddings
    const texts = chunks.map(c => c.content)
    const embeddingResult = await embeddingService.embedTexts(texts, (completed, total) => {
      if (onProgress) {
        const progress = 50 + Math.round((completed / total) * 40)
        onProgress(`Embedding ${completed}/${total} chunks`, progress)
      }
    })

    if (onProgress) onProgress('Storing knowledge...', 90)

    // Store chunks
    const chunksToStore = embeddingResult.results.map((result, index) => {
      const chunk = chunks[index]!
      return {
        sourceId: source.id,
        chunkIndex: index,
        content: result.text,
        contentLength: result.text.length,
        metadata: chunk.metadata,
        embedding: result.embedding,
      }
    })

    const storedCount = await createKnowledgeChunks(chunksToStore)

    // Update source
    const updatedSource = await updateKnowledgeSource(source.id, {
      status: KNOWLEDGE_SOURCE_STATUS.READY,
      chunkCount: storedCount,
      totalCharacters: chunks.reduce((sum, c) => sum + c.length, 0),
      lastTrainedAt: new Date(),
    })

    if (onProgress) onProgress('Complete', 100)

    return updatedSource
  } catch (error) {
    // Mark as failed
    await updateKnowledgeSource(source.id, {
      status: KNOWLEDGE_SOURCE_STATUS.FAILED,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    throw error
  }
}

/**
 * Re-process an existing website source (for retraining)
 * @param source - Existing knowledge source
 * @param url - Website URL to crawl
 * @returns Updated source
 */
async function reprocessWebsiteSource(
  source: KnowledgeSource,
  url: string
): Promise<KnowledgeSource> {
  console.log(`[KnowledgeService] Reprocessing website source ${source.id}: ${url}`)

  try {
    // Crawl and chunk the website
    const { chunks, result } = await crawlAndChunk(url)

    console.log(`[KnowledgeService] Crawl result for ${url}:`, {
      pagesCount: result.pages.length,
      chunksCount: chunks.length,
      failed: result.failed.length,
      stats: result.stats,
    })

    // Update metadata with crawl stats
    await updateKnowledgeSource(source.id, {
      metadata: {
        url,
        pagesDiscovered: result.stats.totalDiscovered,
        pagesCrawled: result.stats.totalCrawled,
        lastCrawledAt: new Date().toISOString(),
      } as WebsiteSourceMetadata,
    })

    if (chunks.length === 0) {
      throw new Error('No content could be extracted from website')
    }

    // Generate embeddings
    const texts = chunks.map(c => c.content)
    const embeddingResult = await embeddingService.embedTexts(texts)

    // Store chunks for the EXISTING source
    const chunksToStore = embeddingResult.results.map((result, index) => {
      const chunk = chunks[index]!
      return {
        sourceId: source.id,
        chunkIndex: index,
        content: result.text,
        contentLength: result.text.length,
        metadata: chunk.metadata,
        embedding: result.embedding,
      }
    })

    const storedCount = await createKnowledgeChunks(chunksToStore)

    // Update source status
    return updateKnowledgeSource(source.id, {
      status: KNOWLEDGE_SOURCE_STATUS.READY,
      chunkCount: storedCount,
      totalCharacters: chunks.reduce((sum, c) => sum + c.length, 0),
      lastTrainedAt: new Date(),
      errorMessage: null,
    })
  } catch (error) {
    // Mark as failed
    await updateKnowledgeSource(source.id, {
      status: KNOWLEDGE_SOURCE_STATUS.FAILED,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    throw error
  }
}

/**
 * Retrain a knowledge source (delete chunks and re-process)
 * @param sourceId - Source ID
 * @param userId - User ID for auth check
 * @returns Updated source
 */
export async function retrainKnowledgeSource(
  sourceId: string,
  userId: string
): Promise<KnowledgeSource> {
  // Check ownership
  const belongsToUser = await knowledgeSourceBelongsToUser(sourceId, userId)
  if (!belongsToUser) {
    throw new Error('Knowledge source not found')
  }

  const source = await findKnowledgeSourceById(sourceId)
  if (!source) {
    throw new Error('Knowledge source not found')
  }

  // Delete existing chunks
  await deleteChunksBySourceId(sourceId)

  // Mark as processing
  await updateKnowledgeSource(sourceId, {
    status: KNOWLEDGE_SOURCE_STATUS.PROCESSING,
    errorMessage: null,
  })

  if (source.type === 'website') {
    // Re-crawl website for existing source
    const metadata = source.metadata as WebsiteSourceMetadata
    if (!metadata?.url) {
      throw new Error('Website URL not found')
    }

    return reprocessWebsiteSource(source, metadata.url)
  } else if (source.type === 'file') {
    // Re-process files from S3 without re-uploading
    const files = await findKnowledgeFilesBySourceId(sourceId)
    let totalChunks = 0

    for (const file of files) {
      try {
        // Get file from S3
        const buffer = await s3Service.getFile(file.fileKey)
        if (!buffer) {
          await updateKnowledgeFile(file.id, {
            status: 'failed',
            errorMessage: 'File not found in storage',
          })
          continue
        }

        // Mark file as processing
        await updateKnowledgeFile(file.id, {
          status: 'processing',
          errorMessage: null,
        })

        // Parse and chunk the document
        const chunks = await parseAndChunk(buffer, file.fileName, file.mimeType)

        if (chunks.length === 0) {
          throw new Error('No content could be extracted from file')
        }

        // Generate embeddings
        const texts = chunks.map(c => c.content)
        const embeddingResult = await embeddingService.embedTexts(texts)

        // Store chunks with embeddings for existing file
        const chunksToStore = embeddingResult.results.map((result, index) => {
          const chunk = chunks[index]!
          return {
            sourceId,
            fileId: file.id,
            chunkIndex: index,
            content: result.text,
            contentLength: result.text.length,
            metadata: chunk.metadata,
            embedding: result.embedding,
          }
        })

        const storedCount = await createKnowledgeChunks(chunksToStore)
        totalChunks += storedCount

        // Update file record
        await updateKnowledgeFile(file.id, {
          status: 'ready',
          chunkCount: storedCount,
        })
      } catch (error) {
        await updateKnowledgeFile(file.id, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Update source status
    return updateKnowledgeSource(sourceId, {
      status: KNOWLEDGE_SOURCE_STATUS.READY,
      chunkCount: totalChunks,
      lastTrainedAt: new Date(),
      errorMessage: null,
    })
  }

  throw new Error(`Unsupported source type: ${source.type}`)
}

/**
 * Delete a knowledge source and all associated data
 * @param sourceId - Source ID
 * @param userId - User ID for auth check
 */
export async function deleteKnowledgeSourceWithFiles(
  sourceId: string,
  userId: string
): Promise<void> {
  // Check ownership
  const belongsToUser = await knowledgeSourceBelongsToUser(sourceId, userId)
  if (!belongsToUser) {
    throw new Error('Knowledge source not found')
  }

  const source = await findKnowledgeSourceById(sourceId)
  if (!source) {
    throw new Error('Knowledge source not found')
  }

  // Delete files from S3 if file-based source
  if (source.type === 'file') {
    const files = await findKnowledgeFilesBySourceId(sourceId)
    for (const file of files) {
      await s3Service.deleteFile({ key: file.fileKey })
    }
  }

  // Delete source (cascades to files and chunks)
  await deleteKnowledgeSource(sourceId)
}

/**
 * Website discovery result for frontend
 */
export interface WebsiteDiscoveryResult {
  pages: Array<{ url: string; title: string }>
  stats: {
    totalDiscovered: number
    durationMs: number
  }
}

/**
 * Discover all pages of a website without indexing
 * This is a fast operation that only fetches page titles and links
 * @param url - Website URL to discover
 * @param onProgress - Optional progress callback
 * @returns Discovery result with all found pages
 */
export async function discoverWebsitePages(
  url: string,
  onProgress?: (discovered: number, queue: number) => void
): Promise<WebsiteDiscoveryResult> {
  // Validate URL
  try {
    new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  console.log(`[KnowledgeService] Starting website discovery for ${url}`)

  const result = await websiteCrawler.discoverPages(url, onProgress)

  console.log(`[KnowledgeService] Discovery complete for ${url}:`, {
    pages: result.pages.length,
    failed: result.failed.length,
    durationMs: result.stats.durationMs,
  })

  return {
    pages: result.pages,
    stats: result.stats,
  }
}

/**
 * Index specific pages of a website (crawl, chunk, embed)
 * @param agentId - Agent ID
 * @param userId - User ID
 * @param url - Base website URL
 * @param pageUrls - Specific page URLs to index
 * @param onProgress - Optional progress callback
 * @returns Created knowledge source
 */
export async function indexWebsitePages(
  agentId: string,
  userId: string,
  url: string,
  pageUrls: string[],
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<KnowledgeSource> {
  if (pageUrls.length === 0) {
    throw new Error('No pages to index')
  }

  console.log(`[KnowledgeService] Starting website indexing for ${url} with ${pageUrls.length} pages`)

  // Create knowledge source
  const source = await createKnowledgeSource({
    agentId,
    userId,
    name: generateSourceName(url),
    type: KNOWLEDGE_SOURCE_TYPE.WEBSITE,
    status: KNOWLEDGE_SOURCE_STATUS.PROCESSING,
    metadata: {
      url,
      pagesDiscovered: pageUrls.length,
      pagesCrawled: 0,
    } as WebsiteSourceMetadata,
  })

  try {
    // Phase 1: Crawl pages in parallel
    if (onProgress) onProgress('crawling', 0, pageUrls.length)

    const crawlResult = await websiteCrawler.crawlPages(pageUrls, (crawled, total) => {
      if (onProgress) onProgress('crawling', crawled, total)
    })

    console.log(`[KnowledgeService] Crawl result for ${url}:`, {
      pagesCount: crawlResult.pages.length,
      failed: crawlResult.failed.length,
      stats: crawlResult.stats,
    })

    // Update metadata with crawl stats
    await updateKnowledgeSource(source.id, {
      metadata: {
        url,
        pagesDiscovered: pageUrls.length,
        pagesCrawled: crawlResult.pages.length,
        lastCrawledAt: new Date().toISOString(),
      } as WebsiteSourceMetadata,
    })

    if (crawlResult.pages.length === 0) {
      throw new Error('No content could be extracted from any page')
    }

    // Phase 2: Chunk all pages
    if (onProgress) onProgress('chunking', 0, crawlResult.pages.length)

    const allChunks: TextChunk[] = []
    for (let i = 0; i < crawlResult.pages.length; i++) {
      const page = crawlResult.pages[i]!
      if (page.content && page.content.length > 0) {
        const chunks = textChunker.chunk(page.content, {
          source: page.url,
          section: page.title,
        })
        allChunks.push(...chunks)
      }
      if (onProgress) onProgress('chunking', i + 1, crawlResult.pages.length)
    }

    console.log(`[KnowledgeService] Created ${allChunks.length} chunks from ${crawlResult.pages.length} pages`)

    if (allChunks.length === 0) {
      throw new Error('No content could be extracted from website')
    }

    // Phase 3: Generate embeddings
    if (onProgress) onProgress('embedding', 0, allChunks.length)

    const texts = allChunks.map(c => c.content)
    const embeddingResult = await embeddingService.embedTexts(texts, (completed, total) => {
      if (onProgress) onProgress('embedding', completed, total)
    })

    // Phase 4: Store chunks
    if (onProgress) onProgress('storing', 0, embeddingResult.results.length)

    const chunksToStore = embeddingResult.results.map((result, index) => {
      const chunk = allChunks[index]!
      return {
        sourceId: source.id,
        chunkIndex: index,
        content: result.text,
        contentLength: result.text.length,
        metadata: chunk.metadata,
        embedding: result.embedding,
      }
    })

    const storedCount = await createKnowledgeChunks(chunksToStore)

    if (onProgress) onProgress('storing', storedCount, storedCount)

    // Update source
    const updatedSource = await updateKnowledgeSource(source.id, {
      status: KNOWLEDGE_SOURCE_STATUS.READY,
      chunkCount: storedCount,
      totalCharacters: allChunks.reduce((sum, c) => sum + c.length, 0),
      lastTrainedAt: new Date(),
    })

    console.log(`[KnowledgeService] Website indexing complete for ${url}: ${storedCount} chunks`)

    return updatedSource
  } catch (error) {
    // Mark as failed
    await updateKnowledgeSource(source.id, {
      status: KNOWLEDGE_SOURCE_STATUS.FAILED,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    throw error
  }
}

/**
 * Search knowledge for an agent
 * @param agentId - Agent ID
 * @param query - Search query
 * @param limit - Maximum results
 * @param similarityThreshold - Minimum similarity
 * @returns Search results
 */
export async function searchKnowledge(
  agentId: string,
  query: string,
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<KnowledgeSearchResult[]> {
  console.log(`[KnowledgeService] searchKnowledge called:`, {
    agentId,
    query: query.substring(0, 100),
    limit,
    similarityThreshold,
  })

  // Check if agent has knowledge
  const hasKnowledge = await agentHasKnowledge(agentId)
  console.log(`[KnowledgeService] Agent has knowledge: ${hasKnowledge}`)

  if (!hasKnowledge) {
    console.log(`[KnowledgeService] No knowledge found for agent ${agentId}`)
    return []
  }

  // Generate query embedding
  console.log(`[KnowledgeService] Generating query embedding...`)
  const queryResult = await embeddingService.embedText(query)
  console.log(`[KnowledgeService] Query embedding generated, dimensions: ${queryResult.embedding.length}`)

  // Search chunks
  console.log(`[KnowledgeService] Searching chunks...`)
  const results = await searchKnowledgeChunks(
    agentId,
    queryResult.embedding,
    limit,
    similarityThreshold
  )

  console.log(`[KnowledgeService] Search returned ${results.length} results`)
  if (results.length > 0) {
    console.log(`[KnowledgeService] Top result similarity: ${results[0]?.similarity}`)
  }

  return results.map(r => ({
    content: r.chunk.content,
    source: r.sourceName,
    similarity: r.similarity,
    metadata: r.chunk.metadata ? {
      section: r.chunk.metadata.section,
      pageNumber: r.chunk.metadata.pageNumber,
    } : undefined,
  }))
}
