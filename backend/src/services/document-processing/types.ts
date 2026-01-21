/**
 * Document processing type definitions
 */

/**
 * Parsed document content from any source
 */
export interface ParsedDocument {
  /** Extracted text content */
  content: string
  /** Document metadata */
  metadata: DocumentMetadata
  /** Individual pages/sections if applicable */
  sections?: DocumentSection[]
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  /** Source file name or URL */
  source: string
  /** MIME type or document type */
  type: string
  /** Total page count (for PDFs) */
  pageCount?: number
  /** Total word count */
  wordCount?: number
  /** Total character count */
  characterCount?: number
  /** Document title if available */
  title?: string
  /** Document author if available */
  author?: string
  /** Creation date if available */
  createdAt?: string
}

/**
 * Document section (page, sheet, or heading section)
 */
export interface DocumentSection {
  /** Section index (0-based) */
  index: number
  /** Section title or identifier */
  title?: string
  /** Section content */
  content: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Text chunk for embedding
 */
export interface TextChunk {
  /** Chunk index within the document */
  index: number
  /** Chunk text content */
  content: string
  /** Character count */
  length: number
  /** Chunk metadata */
  metadata: ChunkMetadata
}

/**
 * Chunk metadata for context
 */
export interface ChunkMetadata {
  /** Source file name or URL */
  source: string
  /** Page number (for PDFs) */
  pageNumber?: number
  /** Section or heading */
  section?: string
  /** Sheet name (for Excel) */
  sheetName?: string
  /** Start character position in original */
  charStart: number
  /** End character position in original */
  charEnd: number
}

/**
 * Crawled page from website
 */
export interface CrawledPage {
  /** Page URL */
  url: string
  /** Page title */
  title: string
  /** Extracted text content */
  content: string
  /** Links found on the page */
  links: string[]
  /** HTTP status code */
  statusCode: number
  /** Content type */
  contentType: string
  /** Crawl timestamp */
  crawledAt: string
}

/**
 * Website crawl result
 */
export interface CrawlResult {
  /** Starting URL */
  startUrl: string
  /** Successfully crawled pages */
  pages: CrawledPage[]
  /** Failed URLs with error messages */
  failed: { url: string; error: string }[]
  /** Crawl statistics */
  stats: {
    totalDiscovered: number
    totalCrawled: number
    totalFailed: number
    durationMs: number
  }
}

/**
 * Document parser interface
 */
export interface DocumentParser {
  /** Parse document and extract text */
  parse(buffer: Buffer, fileName: string): Promise<ParsedDocument>
  /** Check if this parser supports the given MIME type */
  supports(mimeType: string): boolean
}
