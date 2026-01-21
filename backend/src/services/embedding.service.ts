/**
 * Embedding service
 * Creates vector embeddings using OpenAI's embedding models
 */

import { EMBEDDING_DEFAULTS } from '../config/knowledge.defaults'

/**
 * Embedding result for a single text
 */
export interface EmbeddingResult {
  /** The text that was embedded */
  text: string
  /** The embedding vector */
  embedding: number[]
  /** Token count for this text */
  tokenCount: number
}

/**
 * Batch embedding result
 */
export interface BatchEmbeddingResult {
  /** Successfully embedded texts */
  results: EmbeddingResult[]
  /** Total tokens used */
  totalTokens: number
  /** Any errors encountered */
  errors: { index: number; text: string; error: string }[]
}

/**
 * OpenAI embedding response structure
 */
interface OpenAIEmbeddingResponse {
  object: string
  data: Array<{
    object: string
    index: number
    embedding: number[]
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

/**
 * Embedding service class
 * Handles text embedding using OpenAI's embedding API
 */
export class EmbeddingService {
  private readonly apiKey: string
  private readonly model: string
  private readonly dimensions: number
  private readonly batchSize: number
  private readonly baseUrl = 'https://api.openai.com/v1/embeddings'

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    this.model = EMBEDDING_DEFAULTS.model
    this.dimensions = EMBEDDING_DEFAULTS.dimensions
    this.batchSize = EMBEDDING_DEFAULTS.batchSize

    if (!this.apiKey) {
      console.warn('[EmbeddingService] OPENAI_API_KEY not set - embeddings will fail')
    }

    console.log('[EmbeddingService] Initialized', {
      model: this.model,
      dimensions: this.dimensions,
      batchSize: this.batchSize,
    })
  }

  /**
   * Embed a single text string
   * @param text - Text to embed
   * @returns Embedding result with vector
   */
  async embedText(text: string): Promise<EmbeddingResult> {
    const results = await this.embedTexts([text])

    if (results.errors.length > 0) {
      throw new Error(results.errors[0]?.error || 'Embedding failed')
    }

    const result = results.results[0]
    if (!result) {
      throw new Error('No embedding result returned')
    }

    return result
  }

  /**
   * Embed multiple texts in batches
   * @param texts - Array of texts to embed
   * @param onProgress - Optional progress callback
   * @returns Batch embedding result
   */
  async embedTexts(
    texts: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchEmbeddingResult> {
    const results: EmbeddingResult[] = []
    const errors: { index: number; text: string; error: string }[] = []
    let totalTokens = 0

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize)
      const batchIndices = batch.map((_, idx) => i + idx)

      try {
        const batchResults = await this.embedBatch(batch)

        // Map results to original indices
        for (let j = 0; j < batchResults.embeddings.length; j++) {
          const embedding = batchResults.embeddings[j]
          const text = batch[j]

          if (embedding && text) {
            results.push({
              text,
              embedding,
              tokenCount: Math.ceil(batchResults.totalTokens / batch.length),
            })
          }
        }

        totalTokens += batchResults.totalTokens
      } catch (error) {
        // Add errors for this batch
        for (let j = 0; j < batch.length; j++) {
          const originalIndex = batchIndices[j]
          const text = batch[j]
          if (originalIndex !== undefined && text) {
            errors.push({
              index: originalIndex,
              text: text.slice(0, 100),
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }

      // Report progress
      if (onProgress) {
        onProgress(Math.min(i + this.batchSize, texts.length), texts.length)
      }

      // Rate limiting - small delay between batches
      if (i + this.batchSize < texts.length) {
        await this.delay(100)
      }
    }

    return { results, totalTokens, errors }
  }

  /**
   * Embed a single batch of texts
   * @param texts - Batch of texts (max batchSize)
   * @returns Embeddings and token count
   */
  private async embedBatch(
    texts: string[]
  ): Promise<{ embeddings: number[][]; totalTokens: number }> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // Clean texts - remove null bytes and excessive whitespace
    const cleanedTexts = texts.map(text =>
      text.replace(/\0/g, '').trim()
    ).filter(text => text.length > 0)

    if (cleanedTexts.length === 0) {
      return { embeddings: [], totalTokens: 0 }
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: cleanedTexts,
        dimensions: this.dimensions,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[EmbeddingService] API error', {
        status: response.status,
        body: errorBody,
      })
      throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`)
    }

    const data = await response.json() as OpenAIEmbeddingResponse

    // Sort by index to maintain order
    const sortedData = [...data.data].sort((a, b) => a.index - b.index)
    const embeddings = sortedData.map(item => item.embedding)

    return {
      embeddings,
      totalTokens: data.usage.total_tokens,
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param a - First vector
   * @param b - Second vector
   * @returns Similarity score (0-1)
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0
      const bVal = b[i] ?? 0
      dotProduct += aVal * bVal
      normA += aVal * aVal
      normB += bVal * bVal
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)

    if (magnitude === 0) {
      return 0
    }

    return dotProduct / magnitude
  }

  /**
   * Get embedding dimensions
   * @returns Number of dimensions
   */
  getDimensions(): number {
    return this.dimensions
  }

  /**
   * Delay helper for rate limiting
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/** Singleton embedding service instance */
export const embeddingService = new EmbeddingService()
