/**
 * ZIP archive parser
 * Extracts and processes supported files from ZIP archives
 */

import AdmZip from 'adm-zip'
import { basename } from 'path'
import type { DocumentParser, ParsedDocument, DocumentSection } from './types'
import { FILE_UPLOAD_DEFAULTS } from '../../config/knowledge.defaults'

// Import parsers - we'll use dynamic lookup to avoid circular dependencies
import { pdfParser } from './pdf.parser'
import { excelParser } from './excel.parser'
import { docxParser } from './docx.parser'
import { docParser } from './doc.parser'
import { officeDocParser } from './office.parser'
import { epubParser } from './epub.parser'
import { textParser } from './text.parser'

/** All available parsers for ZIP contents */
const contentParsers: DocumentParser[] = [
  pdfParser,
  excelParser,
  docxParser,
  docParser,
  officeDocParser,
  epubParser,
  textParser,
]

/**
 * Get parser for a MIME type
 */
function getParserForMimeType(mimeType: string): DocumentParser | null {
  for (const parser of contentParsers) {
    if (parser.supports(mimeType)) {
      return parser
    }
  }
  return null
}

/**
 * Get MIME type from file extension
 */
function getMimeTypeFromExtension(fileName: string): string | null {
  const ext = '.' + fileName.toLowerCase().split('.').pop()
  const mapping = FILE_UPLOAD_DEFAULTS.extensionToMimeType as Record<string, string>
  return mapping[ext] || null
}

/**
 * ZIP archive parser implementation
 */
export class ZipParser implements DocumentParser {
  /**
   * Check if this parser supports the given MIME type
   * @param mimeType - MIME type to check
   * @returns True if ZIP type
   */
  supports(mimeType: string): boolean {
    return mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed'
  }

  /**
   * Parse ZIP archive and extract text from all supported files
   * @param buffer - ZIP file buffer
   * @param fileName - Original file name
   * @returns Parsed document with combined text content
   */
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    try {
      const zip = new AdmZip(buffer)
      const entries = zip.getEntries()

      const allSections: DocumentSection[] = []
      const allContent: string[] = []
      let totalWords = 0
      let totalChars = 0
      let sectionIndex = 0

      // Process each entry in the ZIP
      for (const entry of entries) {
        // Skip directories and hidden files
        if (entry.isDirectory || entry.name.startsWith('.') || entry.name.includes('/__MACOSX/')) {
          continue
        }

        const entryFileName = basename(entry.name)
        const mimeType = getMimeTypeFromExtension(entryFileName)

        // Skip unsupported file types
        if (!mimeType) {
          continue
        }

        const parser = getParserForMimeType(mimeType)
        if (!parser) {
          continue
        }

        try {
          const entryBuffer = entry.getData()

          // Skip empty files
          if (entryBuffer.length === 0) {
            continue
          }

          // Skip files that are too large (5MB limit per file)
          if (entryBuffer.length > 5 * 1024 * 1024) {
            continue
          }

          const parsed = await parser.parse(entryBuffer, entryFileName)

          if (parsed.content && parsed.content.trim().length > 0) {
            totalWords += parsed.metadata.wordCount || 0
            totalChars += parsed.content.length

            // Add file header section
            allContent.push(`--- ${entryFileName} ---\n${parsed.content}`)

            // Add sections with file context
            if (parsed.sections && parsed.sections.length > 0) {
              for (const section of parsed.sections) {
                allSections.push({
                  index: sectionIndex++,
                  title: section.title ? `${entryFileName}: ${section.title}` : entryFileName,
                  content: section.content,
                  metadata: {
                    ...section.metadata,
                    sourceFile: entryFileName,
                  },
                })
              }
            } else {
              allSections.push({
                index: sectionIndex++,
                title: entryFileName,
                content: parsed.content,
                metadata: {
                  sourceFile: entryFileName,
                },
              })
            }
          }
        } catch {
          // Skip files that fail to parse
          continue
        }
      }

      const content = allContent.join('\n\n')

      return {
        content,
        metadata: {
          source: fileName,
          type: 'application/zip',
          wordCount: totalWords,
          characterCount: totalChars,
        },
        sections: allSections,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

/** Singleton ZIP parser instance */
export const zipParser = new ZipParser()
