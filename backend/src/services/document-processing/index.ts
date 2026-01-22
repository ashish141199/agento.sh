/**
 * Document processing service
 * Main entry point for parsing and chunking documents
 */

import { pdfParser } from './pdf.parser'
import { excelParser } from './excel.parser'
import { textParser } from './text.parser'
import { docxParser } from './docx.parser'
import { officeDocParser } from './office.parser'
import { epubParser } from './epub.parser'
import { docParser } from './doc.parser'
import { zipParser } from './zip.parser'
import { websiteCrawler, WebsiteCrawler } from './website.crawler'
import {
  textChunker,
  TextChunker,
  createChunker,
  chunkMarkdown,
  chunkTabular,
  chunkCode,
} from './chunker.service'
import type {
  DocumentParser,
  ParsedDocument,
  TextChunk,
  CrawlResult,
  CrawledPage,
} from './types'

/** All available parsers */
const parsers: DocumentParser[] = [pdfParser, excelParser, docxParser, docParser, officeDocParser, epubParser, zipParser, textParser]

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
 * MIME types that should use row-based (tabular) chunking
 */
const TABULAR_MIME_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

/**
 * MIME types that should use code-aware chunking
 */
const CODE_MIME_TYPES = [
  'text/typescript',
  'text/javascript',
  'application/typescript',
  'application/javascript',
  'text/x-python',
  'text/x-java',
  'text/x-go',
  'text/x-ruby',
  'text/x-php',
  'text/x-c',
  'text/x-cpp',
  'text/x-rust',
]

/**
 * Parse and chunk a document in one operation
 * Uses content-aware chunking based on MIME type:
 * - Tabular data (CSV, Excel): Row-based chunking (never splits mid-row)
 * - Code files (TS, JS): Code-aware chunking (respects functions/classes)
 * - Markdown: Section-based chunking (splits at headers)
 * - Other: Semantic chunking (splits at sentences)
 *
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

  // Use content-aware chunking based on MIME type
  if (TABULAR_MIME_TYPES.includes(mimeType)) {
    // For tabular data: chunk by rows within each section (sheet)
    const allChunks: TextChunk[] = []

    if (document.sections && document.sections.length > 0) {
      for (const section of document.sections) {
        const sectionChunks = chunkTabular(section.content, document.metadata.source, {
          sheetName: section.metadata?.sheetName as string | undefined,
        })
        // Re-index chunks
        for (const chunk of sectionChunks) {
          allChunks.push({
            ...chunk,
            index: allChunks.length,
            metadata: {
              ...chunk.metadata,
              section: section.title,
            },
          })
        }
      }
    } else {
      return chunkTabular(document.content, document.metadata.source)
    }

    return allChunks
  }

  if (CODE_MIME_TYPES.includes(mimeType)) {
    // For code files: use code-aware chunking that respects functions/classes
    if (document.sections && document.sections.length > 0) {
      return chunkCode(document.content, document.metadata.source, document.sections)
    }
    // Fallback to regular chunking if no sections
    return textChunker.chunkDocument(document)
  }

  if (mimeType === 'text/markdown') {
    // For markdown: use section-based chunking
    return chunkMarkdown(document.content, document.metadata.source)
  }

  // For other types (PDF, DOCX, plain text): use semantic chunking
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

export {
  createChunker,
  TextChunker,
  WebsiteCrawler,
  websiteCrawler,
  textChunker,
  chunkMarkdown,
  chunkTabular,
  chunkCode,
}
