/**
 * Text chunking service
 * Splits documents into semantic chunks for embedding
 */

import type { TextChunk, ChunkMetadata, ParsedDocument, DocumentSection } from './types'
import { CHUNKING_DEFAULTS } from '../../config/knowledge.defaults'

/**
 * Chunking configuration
 */
interface ChunkingConfig {
  chunkSize: number
  chunkOverlap: number
  minChunkSize: number
  maxChunkSize: number
  delimiters: string[]
}

/**
 * Text chunker implementation
 * Uses semantic chunking with configurable parameters
 */
export class TextChunker {
  private readonly config: ChunkingConfig

  constructor(config?: Partial<ChunkingConfig>) {
    this.config = {
      chunkSize: config?.chunkSize ?? CHUNKING_DEFAULTS.chunkSize,
      chunkOverlap: config?.chunkOverlap ?? CHUNKING_DEFAULTS.chunkOverlap,
      minChunkSize: config?.minChunkSize ?? CHUNKING_DEFAULTS.minChunkSize,
      maxChunkSize: config?.maxChunkSize ?? CHUNKING_DEFAULTS.maxChunkSize,
      delimiters: config?.delimiters ?? [...CHUNKING_DEFAULTS.delimiters],
    }
  }

  /**
   * Chunk plain text with metadata
   * Simple method for chunking text from a single source
   * @param text - Text content to chunk
   * @param metadata - Optional metadata (source and section)
   * @returns Array of text chunks
   */
  chunk(text: string, metadata?: { source?: string; section?: string }): TextChunk[] {
    const source = metadata?.source ?? 'unknown'
    const chunks: TextChunk[] = []

    if (!text || text.length < this.config.minChunkSize) {
      if (text && text.trim().length > 0) {
        chunks.push({
          index: 0,
          content: text.trim(),
          length: text.trim().length,
          metadata: {
            source,
            section: metadata?.section,
            charStart: 0,
            charEnd: text.length,
          },
        })
      }
      return chunks
    }

    const textChunks = this.splitIntoChunks(text)

    let charOffset = 0
    for (let i = 0; i < textChunks.length; i++) {
      const chunkContent = textChunks[i]
      if (!chunkContent) continue

      chunks.push({
        index: i,
        content: chunkContent,
        length: chunkContent.length,
        metadata: {
          source,
          section: metadata?.section,
          charStart: charOffset,
          charEnd: charOffset + chunkContent.length,
        },
      })

      charOffset += chunkContent.length - this.config.chunkOverlap
    }

    return chunks
  }

  /**
   * Chunk a parsed document into text chunks
   * @param document - Parsed document
   * @returns Array of text chunks
   */
  chunkDocument(document: ParsedDocument): TextChunk[] {
    const chunks: TextChunk[] = []

    // If document has sections, chunk by section for better context
    if (document.sections && document.sections.length > 0) {
      for (const section of document.sections) {
        const sectionChunks = this.chunkSection(
          section,
          document.metadata.source,
          chunks.length
        )
        chunks.push(...sectionChunks)
      }
    } else {
      // Chunk entire content
      const contentChunks = this.chunkText(
        document.content,
        document.metadata.source,
        chunks.length
      )
      chunks.push(...contentChunks)
    }

    return chunks
  }

  /**
   * Chunk a document section
   * @param section - Document section
   * @param source - Source file/URL
   * @param startIndex - Starting chunk index
   * @returns Array of chunks
   */
  private chunkSection(
    section: DocumentSection,
    source: string,
    startIndex: number
  ): TextChunk[] {
    const chunks: TextChunk[] = []
    const text = section.content

    if (!text || text.length < this.config.minChunkSize) {
      // Section too small, return as single chunk if not empty
      if (text && text.trim().length > 0) {
        chunks.push({
          index: startIndex,
          content: text.trim(),
          length: text.trim().length,
          metadata: {
            source,
            section: section.title,
            pageNumber: section.metadata?.pageNumber as number | undefined,
            sheetName: section.metadata?.sheetName as string | undefined,
            charStart: 0,
            charEnd: text.length,
          },
        })
      }
      return chunks
    }

    // Split into chunks
    const textChunks = this.splitIntoChunks(text)

    let charOffset = 0
    for (let i = 0; i < textChunks.length; i++) {
      const chunkContent = textChunks[i]
      if (!chunkContent) continue

      chunks.push({
        index: startIndex + i,
        content: chunkContent,
        length: chunkContent.length,
        metadata: {
          source,
          section: section.title,
          pageNumber: section.metadata?.pageNumber as number | undefined,
          sheetName: section.metadata?.sheetName as string | undefined,
          charStart: charOffset,
          charEnd: charOffset + chunkContent.length,
        },
      })

      // Update offset (account for overlap)
      charOffset += chunkContent.length - this.config.chunkOverlap
    }

    return chunks
  }

  /**
   * Chunk plain text
   * @param text - Text to chunk
   * @param source - Source identifier
   * @param startIndex - Starting chunk index
   * @returns Array of chunks
   */
  private chunkText(
    text: string,
    source: string,
    startIndex: number
  ): TextChunk[] {
    const chunks: TextChunk[] = []

    if (!text || text.length < this.config.minChunkSize) {
      if (text && text.trim().length > 0) {
        chunks.push({
          index: startIndex,
          content: text.trim(),
          length: text.trim().length,
          metadata: {
            source,
            charStart: 0,
            charEnd: text.length,
          },
        })
      }
      return chunks
    }

    const textChunks = this.splitIntoChunks(text)

    let charOffset = 0
    for (let i = 0; i < textChunks.length; i++) {
      const chunkContent = textChunks[i]
      if (!chunkContent) continue

      chunks.push({
        index: startIndex + i,
        content: chunkContent,
        length: chunkContent.length,
        metadata: {
          source,
          charStart: charOffset,
          charEnd: charOffset + chunkContent.length,
        },
      })

      charOffset += chunkContent.length - this.config.chunkOverlap
    }

    return chunks
  }

  /**
   * Split text into chunks using semantic delimiters
   * @param text - Text to split
   * @returns Array of chunk strings
   */
  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = []
    let remainingText = text

    while (remainingText.length > 0) {
      let chunkEnd = this.config.chunkSize

      // If remaining text is smaller than chunk size, take it all
      if (remainingText.length <= this.config.chunkSize) {
        chunks.push(remainingText.trim())
        break
      }

      // Find the best split point using semantic delimiters
      chunkEnd = this.findBestSplitPoint(remainingText, this.config.chunkSize)

      // Extract chunk
      const chunk = remainingText.slice(0, chunkEnd).trim()

      if (chunk.length >= this.config.minChunkSize) {
        chunks.push(chunk)
      } else if (chunks.length > 0) {
        // Merge small chunk with previous
        const lastChunk = chunks.pop()
        if (lastChunk) {
          chunks.push(lastChunk + ' ' + chunk)
        }
      } else {
        chunks.push(chunk)
      }

      // Calculate overlap start point with word boundary respect
      let overlapStart = Math.max(0, chunkEnd - this.config.chunkOverlap)

      // Adjust overlapStart to the nearest word boundary (find previous space)
      // This ensures chunks don't start in the middle of a word
      if (overlapStart > 0 && remainingText[overlapStart] !== ' ' && remainingText[overlapStart] !== '\n') {
        // Search backwards for a space or newline
        let adjustedStart = overlapStart
        while (adjustedStart > 0 && remainingText[adjustedStart] !== ' ' && remainingText[adjustedStart] !== '\n') {
          adjustedStart--
        }
        // If we found a space/newline, start after it
        if (adjustedStart > 0) {
          overlapStart = adjustedStart + 1
        }
      }

      remainingText = remainingText.slice(overlapStart)

      // Prevent infinite loop
      if (remainingText === text) {
        chunks.push(remainingText.trim())
        break
      }
    }

    return chunks.filter(c => c.length > 0)
  }

  /**
   * Markdown header patterns that should start new chunks
   */
  private readonly headerPatterns = ['\n## ', '\n### ', '\n#### ', '\n##### ', '\n###### ']

  /**
   * Find the best semantic split point near the target position
   * @param text - Text to analyze
   * @param targetPosition - Target split position
   * @returns Best split position
   */
  private findBestSplitPoint(text: string, targetPosition: number): number {
    // Look for delimiters within a window around target
    const windowStart = Math.max(0, targetPosition - 200)
    const windowEnd = Math.min(text.length, targetPosition + 100)

    let bestPosition = targetPosition

    // Try each delimiter in priority order
    for (const delimiter of this.config.delimiters) {
      // Check if this is a markdown header delimiter
      const isHeaderDelimiter = this.headerPatterns.includes(delimiter)

      // Search backwards from target for delimiter
      let searchEnd = Math.min(targetPosition + 50, windowEnd)

      for (let pos = searchEnd; pos >= windowStart; pos--) {
        if (text.slice(pos, pos + delimiter.length) === delimiter) {
          let splitPos: number

          if (isHeaderDelimiter) {
            // For headers, split BEFORE the newline so header stays with next chunk
            // The delimiter is '\n## ', so we split at pos (before the \n)
            splitPos = pos
          } else {
            // For other delimiters, split after
            splitPos = pos + delimiter.length
          }

          if (splitPos >= this.config.minChunkSize && splitPos <= this.config.maxChunkSize) {
            return splitPos
          }
        }
      }
    }

    // No good delimiter found, use target position
    // But avoid splitting in middle of word
    if (text[bestPosition] !== ' ' && bestPosition < text.length) {
      // Find next space
      const nextSpace = text.indexOf(' ', bestPosition)
      if (nextSpace !== -1 && nextSpace - bestPosition < 50) {
        bestPosition = nextSpace + 1
      }
    }

    return Math.min(bestPosition, text.length)
  }
}

/** Default text chunker instance */
export const textChunker = new TextChunker()

/**
 * Create a custom chunker with specific configuration
 * @param config - Chunking configuration overrides
 * @returns New TextChunker instance
 */
export function createChunker(config: Partial<ChunkingConfig>): TextChunker {
  return new TextChunker(config)
}
