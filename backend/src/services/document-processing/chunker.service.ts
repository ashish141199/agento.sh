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
    // Use a wider window to find better split points
    const windowStart = Math.max(0, targetPosition - 400)
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

    // No good delimiter found - try harder to find a sentence boundary
    // Search backwards for sentence-ending punctuation followed by space
    const sentenceEnders = ['. ', '? ', '! ', '.\n', '?\n', '!\n']
    for (let pos = targetPosition; pos >= windowStart; pos--) {
      for (const ender of sentenceEnders) {
        if (text.slice(pos, pos + ender.length) === ender) {
          const splitPos = pos + ender.length
          if (splitPos >= this.config.minChunkSize) {
            return splitPos
          }
        }
      }
    }

    // Still no sentence boundary - at least don't split mid-word
    // Search backwards for a space
    for (let pos = targetPosition; pos >= windowStart; pos--) {
      if (text[pos] === ' ' || text[pos] === '\n') {
        return pos + 1
      }
    }

    // Last resort: use target position
    return Math.min(bestPosition, text.length)
  }
}

/**
 * Markdown section chunk (internal representation)
 */
interface MarkdownSectionChunk {
  content: string
  header?: string
  headerLevel?: number
  charCount: number
}

/**
 * Markdown chunking configuration
 */
export interface MarkdownChunkingConfig {
  /** Maximum characters per chunk (default: 1500) */
  maxChunkSize: number
  /** Minimum characters per chunk (default: 100) */
  minChunkSize: number
}

/**
 * Chunk markdown content by sections (headers)
 * Keeps each section intact, only subdividing if it exceeds maxChunkSize
 * This produces semantically meaningful chunks where each chunk is a complete section.
 *
 * @param markdown - Markdown content to chunk
 * @param source - Source identifier (URL, filename, etc.)
 * @param options - Chunking options
 * @returns Array of TextChunk objects
 */
export function chunkMarkdown(
  markdown: string,
  source: string,
  options: Partial<MarkdownChunkingConfig> = {}
): TextChunk[] {
  const maxChunkSize = options.maxChunkSize ?? 1500
  const minChunkSize = options.minChunkSize ?? 100

  const sectionChunks = splitMarkdownBySections(markdown, maxChunkSize, minChunkSize)

  // Convert to TextChunk format
  let charOffset = 0
  return sectionChunks.map((section, index) => {
    const chunk: TextChunk = {
      index,
      content: section.content,
      length: section.charCount,
      metadata: {
        source,
        section: section.header,
        charStart: charOffset,
        charEnd: charOffset + section.charCount,
      },
    }
    charOffset += section.charCount
    return chunk
  })
}

/**
 * Split markdown into sections by headers
 */
function splitMarkdownBySections(
  markdown: string,
  maxChunkSize: number,
  minChunkSize: number
): MarkdownSectionChunk[] {
  const chunks: MarkdownSectionChunk[] = []

  // Split into lines and process
  const lines = markdown.split('\n')
  let currentSection: { header: string; headerLevel: number; content: string[] } | null = null
  let preambleLines: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headerMatch) {
      // Save previous section or preamble
      if (currentSection) {
        const sectionContent = `${currentSection.header}\n\n${currentSection.content.join('\n')}`.trim()
        if (sectionContent.length >= minChunkSize) {
          if (sectionContent.length > maxChunkSize) {
            chunks.push(...splitLargeSection(sectionContent, currentSection.header, currentSection.headerLevel, maxChunkSize, minChunkSize))
          } else {
            chunks.push({
              content: sectionContent,
              header: currentSection.header,
              headerLevel: currentSection.headerLevel,
              charCount: sectionContent.length,
            })
          }
        }
      } else if (preambleLines.length > 0) {
        // Save preamble (content before first header)
        const preamble = preambleLines.join('\n').trim()
        if (preamble.length >= minChunkSize) {
          chunks.push({
            content: preamble,
            charCount: preamble.length,
          })
        }
      }

      // Start new section
      currentSection = {
        header: line,
        headerLevel: headerMatch[1]!.length,
        content: [],
      }
      preambleLines = []
    } else if (currentSection) {
      currentSection.content.push(line)
    } else {
      preambleLines.push(line)
    }
  }

  // Handle last section or remaining preamble
  if (currentSection) {
    const sectionContent = `${currentSection.header}\n\n${currentSection.content.join('\n')}`.trim()
    if (sectionContent.length >= minChunkSize) {
      if (sectionContent.length > maxChunkSize) {
        chunks.push(...splitLargeSection(sectionContent, currentSection.header, currentSection.headerLevel, maxChunkSize, minChunkSize))
      } else {
        chunks.push({
          content: sectionContent,
          header: currentSection.header,
          headerLevel: currentSection.headerLevel,
          charCount: sectionContent.length,
        })
      }
    }
  } else if (preambleLines.length > 0) {
    const preamble = preambleLines.join('\n').trim()
    if (preamble.length >= minChunkSize) {
      chunks.push({
        content: preamble,
        charCount: preamble.length,
      })
    }
  }

  // Merge tiny chunks with previous
  const mergedChunks: MarkdownSectionChunk[] = []
  for (const chunk of chunks) {
    if (chunk.charCount < minChunkSize && mergedChunks.length > 0) {
      const last = mergedChunks[mergedChunks.length - 1]!
      last.content += '\n\n' + chunk.content
      last.charCount = last.content.length
    } else {
      mergedChunks.push(chunk)
    }
  }

  return mergedChunks
}

/**
 * Split a large section by paragraphs, then sentences if needed
 */
function splitLargeSection(
  content: string,
  header: string,
  headerLevel: number,
  maxChunkSize: number,
  minChunkSize: number
): MarkdownSectionChunk[] {
  const chunks: MarkdownSectionChunk[] = []

  // Try splitting by paragraphs first
  const paragraphs = content.split(/\n\n+/)
  let currentChunk = ''
  let isFirstChunk = true

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    } else {
      // Save current chunk if it's big enough
      if (currentChunk.length >= minChunkSize) {
        chunks.push({
          content: currentChunk.trim(),
          header: isFirstChunk ? header : `${header} (continued)`,
          headerLevel,
          charCount: currentChunk.trim().length,
        })
        isFirstChunk = false
      }

      // Start new chunk
      if (para.length <= maxChunkSize) {
        currentChunk = para
      } else {
        // Paragraph itself is too large, split by sentences
        const sentences = para.split(/(?<=[.!?])\s+/)
        currentChunk = ''
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + sentence
          } else {
            if (currentChunk.length >= minChunkSize) {
              chunks.push({
                content: currentChunk.trim(),
                header: isFirstChunk ? header : `${header} (continued)`,
                headerLevel,
                charCount: currentChunk.trim().length,
              })
              isFirstChunk = false
            }
            currentChunk = sentence
          }
        }
      }
    }
  }

  // Don't forget remaining content
  if (currentChunk.length >= minChunkSize) {
    chunks.push({
      content: currentChunk.trim(),
      header: isFirstChunk ? header : `${header} (continued)`,
      headerLevel,
      charCount: currentChunk.trim().length,
    })
  }

  return chunks
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

/**
 * Chunk tabular data (CSV, Excel) by rows
 * Never splits mid-row - each chunk contains complete rows
 *
 * @param content - Tabular content with rows separated by newlines
 * @param source - Source identifier
 * @param options - Chunking options
 * @returns Array of TextChunk objects
 */
export function chunkTabular(
  content: string,
  source: string,
  options: { maxChunkSize?: number; sheetName?: string } = {}
): TextChunk[] {
  const maxChunkSize = options.maxChunkSize ?? CHUNKING_DEFAULTS.chunkSize
  const minChunkSize = CHUNKING_DEFAULTS.minChunkSize

  const rows = content.split('\n').filter(row => row.trim().length > 0)
  const chunks: TextChunk[] = []

  let currentRows: string[] = []
  let currentLength = 0
  let charOffset = 0

  for (const row of rows) {
    // If adding this row would exceed max size, save current chunk first
    if (currentLength > 0 && currentLength + row.length + 1 > maxChunkSize) {
      const chunkContent = currentRows.join('\n')
      if (chunkContent.length >= minChunkSize) {
        chunks.push({
          index: chunks.length,
          content: chunkContent,
          length: chunkContent.length,
          metadata: {
            source,
            sheetName: options.sheetName,
            charStart: charOffset,
            charEnd: charOffset + chunkContent.length,
          },
        })
        charOffset += chunkContent.length + 1 // +1 for the newline between chunks
      }
      currentRows = []
      currentLength = 0
    }

    currentRows.push(row)
    currentLength += row.length + 1 // +1 for newline
  }

  // Don't forget the last chunk
  if (currentRows.length > 0) {
    const chunkContent = currentRows.join('\n')
    if (chunkContent.length >= minChunkSize || chunks.length === 0) {
      chunks.push({
        index: chunks.length,
        content: chunkContent,
        length: chunkContent.length,
        metadata: {
          source,
          sheetName: options.sheetName,
          charStart: charOffset,
          charEnd: charOffset + chunkContent.length,
        },
      })
    } else if (chunks.length > 0) {
      // Merge small last chunk with previous
      const lastChunk = chunks[chunks.length - 1]!
      lastChunk.content += '\n' + chunkContent
      lastChunk.length = lastChunk.content.length
      lastChunk.metadata.charEnd = lastChunk.metadata.charStart + lastChunk.length
    }
  }

  return chunks
}

/**
 * Chunk code files by logical units (functions, classes, etc.)
 * Keeps complete code blocks together, only splitting very large blocks
 * When splitting is necessary, tries to split at logical boundaries (blank lines, closing braces)
 *
 * @param content - Code content
 * @param source - Source identifier
 * @param sections - Pre-extracted sections from parser
 * @param options - Chunking options
 * @returns Array of TextChunk objects
 */
export function chunkCode(
  content: string,
  source: string,
  sections: Array<{ title?: string; content: string }>,
  options: { maxChunkSize?: number } = {}
): TextChunk[] {
  const maxChunkSize = options.maxChunkSize ?? 1500
  const minChunkSize = CHUNKING_DEFAULTS.minChunkSize
  const chunks: TextChunk[] = []
  let charOffset = 0

  for (const section of sections) {
    const sectionContent = section.content.trim()
    if (!sectionContent) continue

    if (sectionContent.length <= maxChunkSize) {
      // Section fits in one chunk
      chunks.push({
        index: chunks.length,
        content: sectionContent,
        length: sectionContent.length,
        metadata: {
          source,
          section: section.title,
          charStart: charOffset,
          charEnd: charOffset + sectionContent.length,
        },
      })
      charOffset += sectionContent.length
    } else {
      // Section too large - split at logical boundaries
      const subChunks = splitCodeAtLogicalBoundaries(sectionContent, maxChunkSize, minChunkSize)

      for (let i = 0; i < subChunks.length; i++) {
        const chunkContent = subChunks[i]!
        const isFirst = i === 0
        chunks.push({
          index: chunks.length,
          content: chunkContent,
          length: chunkContent.length,
          metadata: {
            source,
            section: isFirst ? section.title : (section.title ? `${section.title} (continued)` : undefined),
            charStart: charOffset,
            charEnd: charOffset + chunkContent.length,
          },
        })
        charOffset += chunkContent.length
      }
    }
  }

  return chunks
}

/**
 * Split code at logical boundaries (blank lines, after closing braces)
 * Prioritizes keeping code blocks intact
 */
function splitCodeAtLogicalBoundaries(
  content: string,
  maxChunkSize: number,
  minChunkSize: number
): string[] {
  const chunks: string[] = []
  const lines = content.split('\n')
  let currentChunk: string[] = []
  let currentLength = 0

  // Track brace depth to find good split points
  let braceDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const trimmedLine = line.trim()

    // Update brace depth
    for (const char of line) {
      if (char === '{') braceDepth++
      if (char === '}') braceDepth--
    }

    // Check if we need to split
    if (currentLength > 0 && currentLength + line.length + 1 > maxChunkSize) {
      // Try to find a better split point by looking back
      let splitIndex = currentChunk.length

      // Look for a good split point (blank line or closing brace at depth 0)
      for (let j = currentChunk.length - 1; j >= Math.max(0, currentChunk.length - 20); j--) {
        const prevLine = currentChunk[j]!.trim()
        // Good split points: blank line, line ending with }, line ending with ;
        if (prevLine === '' || prevLine.endsWith('}') || prevLine.endsWith(';')) {
          // Check if this gives us a chunk of reasonable size
          const potentialChunk = currentChunk.slice(0, j + 1).join('\n')
          if (potentialChunk.length >= minChunkSize) {
            splitIndex = j + 1
            break
          }
        }
      }

      // Save chunk up to split point
      const chunkContent = currentChunk.slice(0, splitIndex).join('\n').trim()
      if (chunkContent.length >= minChunkSize) {
        chunks.push(chunkContent)
      }

      // Keep remaining lines for next chunk
      currentChunk = currentChunk.slice(splitIndex)
      currentLength = currentChunk.join('\n').length
    }

    currentChunk.push(line)
    currentLength += line.length + 1
  }

  // Save remaining
  if (currentChunk.length > 0) {
    const chunkContent = currentChunk.join('\n').trim()
    if (chunkContent.length > 0) {
      // If too small, merge with previous chunk
      if (chunkContent.length < minChunkSize && chunks.length > 0) {
        chunks[chunks.length - 1] += '\n' + chunkContent
      } else {
        chunks.push(chunkContent)
      }
    }
  }

  return chunks
}
