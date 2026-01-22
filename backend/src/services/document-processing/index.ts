/**
 * Document processing service
 * Main entry point for parsing and chunking documents
 */

import { pdfParser } from './pdf.parser'
import { excelParser } from './excel.parser'
import { textParser } from './text.parser'
import { websiteCrawler, WebsiteCrawler } from './website.crawler'
import { textChunker, TextChunker, createChunker, chunkMarkdown } from './chunker.service'
import type {
  DocumentParser,
  ParsedDocument,
  TextChunk,
  CrawlResult,
  CrawledPage,
} from './types'

/** All available parsers */
const parsers: DocumentParser[] = [pdfParser, excelParser, textParser]

/**
 * Get appropriate parser for a MIME type
 * @param mimeType - MIME type
 * @returns Parser instance or null if unsupported
 */
function getParser(mimeType: string): DocumentParser | null {
  for (const parser of parsers) {
    if (parser.supports(mimeType)) {
      return parser
    }
  }
  return null
}

/**
 * Check if a MIME type is supported for parsing
 * @param mimeType - MIME type to check
 * @returns True if supported
 */
export function isSupported(mimeType: string): boolean {
  return getParser(mimeType) !== null
}

/**
 * Parse a document from buffer
 * @param buffer - File buffer
 * @param fileName - Original file name
 * @param mimeType - MIME type
 * @returns Parsed document
 */
export async function parseDocument(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParsedDocument> {
  const parser = getParser(mimeType)

  if (!parser) {
    throw new Error(`Unsupported file type: ${mimeType}`)
  }

  return parser.parse(buffer, fileName)
}

/**
 * Parse and chunk a document in one operation
 * @param buffer - File buffer
 * @param fileName - Original file name
 * @param mimeType - MIME type
 * @returns Array of text chunks
 */
export async function parseAndChunk(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<TextChunk[]> {
  const document = await parseDocument(buffer, fileName, mimeType)
  return textChunker.chunkDocument(document)
}

/**
 * Crawl a website and chunk all pages
 * @param url - Starting URL
 * @param onProgress - Optional progress callback
 * @returns Array of text chunks from all pages
 */
export async function crawlAndChunk(
  url: string,
  onProgress?: (crawled: number, discovered: number) => void
): Promise<{ chunks: TextChunk[]; result: CrawlResult }> {
  const result = await websiteCrawler.crawl(url, onProgress)

  const allChunks: TextChunk[] = []
  let chunkIndex = 0

  for (const page of result.pages) {
    if (!page.content || page.content.trim().length === 0) continue

    // Create a pseudo-document for chunking
    const document: ParsedDocument = {
      content: page.content,
      metadata: {
        source: page.url,
        type: 'text/html',
        title: page.title,
        wordCount: page.content.split(/\s+/).length,
        characterCount: page.content.length,
      },
    }

    const pageChunks = textChunker.chunkDocument(document)

    // Re-index chunks and add page URL to metadata
    for (const chunk of pageChunks) {
      allChunks.push({
        ...chunk,
        index: chunkIndex++,
        metadata: {
          ...chunk.metadata,
          source: page.url,
          section: page.title,
        },
      })
    }
  }

  return { chunks: allChunks, result }
}

/**
 * Chunk already parsed text (useful for re-processing)
 * @param text - Text content
 * @param source - Source identifier
 * @returns Array of text chunks
 */
export function chunkText(text: string, source: string): TextChunk[] {
  const document: ParsedDocument = {
    content: text,
    metadata: {
      source,
      type: 'text/plain',
      wordCount: text.split(/\s+/).length,
      characterCount: text.length,
    },
  }

  return textChunker.chunkDocument(document)
}

// Re-export types and utilities
export type {
  ParsedDocument,
  TextChunk,
  ChunkMetadata,
  CrawlResult,
  CrawledPage,
  DocumentSection,
  DocumentMetadata,
} from './types'

export { createChunker, TextChunker, WebsiteCrawler, websiteCrawler, textChunker, chunkMarkdown }
