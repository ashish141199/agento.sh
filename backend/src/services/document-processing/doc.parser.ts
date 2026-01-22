/**
 * Legacy Word document parser (.doc)
 * Extracts text content from .doc files using word-extractor
 */

import WordExtractor from 'word-extractor'
import type { DocumentParser, ParsedDocument, DocumentSection } from './types'

/**
 * Legacy Word (.doc) parser implementation
 */
export class DocParser implements DocumentParser {
  private extractor = new WordExtractor()

  /**
   * Check if this parser supports the given MIME type
   * @param mimeType - MIME type to check
   * @returns True if legacy Word type
   */
  supports(mimeType: string): boolean {
    return mimeType === 'application/msword'
  }

  /**
   * Parse legacy Word document and extract text
   * @param buffer - DOC file buffer
   * @param fileName - Original file name
   * @returns Parsed document with text content
   */
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    try {
      // Extract text from DOC
      const doc = await this.extractor.extract(buffer)
      const rawText = doc.getBody()

      const content = this.cleanText(rawText)
      const sections = this.extractSections(content)

      return {
        content,
        metadata: {
          source: fileName,
          type: 'application/msword',
          wordCount: this.countWords(content),
          characterCount: content.length,
        },
        sections,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse DOC: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Clean extracted text by normalizing whitespace
   * @param text - Raw extracted text
   * @returns Cleaned text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, '  ')
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()
  }

  /**
   * Extract sections from content
   * @param content - Clean text content
   * @returns Array of document sections
   */
  private extractSections(content: string): DocumentSection[] {
    // Split by double newlines (paragraph breaks)
    const paragraphs = content
      .split(/\n\n+/)
      .filter(p => p.trim().length > 0)

    // Group paragraphs into sections (~1000 chars each)
    const sections: DocumentSection[] = []
    let currentContent: string[] = []
    let sectionIndex = 0

    for (const paragraph of paragraphs) {
      currentContent.push(paragraph)

      const totalLength = currentContent.join('\n\n').length
      if (totalLength >= 1000) {
        sections.push({
          index: sectionIndex++,
          content: currentContent.join('\n\n'),
        })
        currentContent = []
      }
    }

    // Add remaining content
    if (currentContent.length > 0) {
      sections.push({
        index: sectionIndex,
        content: currentContent.join('\n\n'),
      })
    }

    return sections
  }

  /**
   * Count words in text
   * @param text - Text to count
   * @returns Word count
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length
  }
}

/** Singleton DOC parser instance */
export const docParser = new DocParser()
