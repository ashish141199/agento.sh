/**
 * DOCX document parser
 * Extracts text content from Word documents using mammoth
 */

import mammoth from 'mammoth'
import type { DocumentParser, ParsedDocument, DocumentSection } from './types'

/**
 * DOCX parser implementation
 */
export class DocxParser implements DocumentParser {
  /**
   * Check if this parser supports the given MIME type
   * @param mimeType - MIME type to check
   * @returns True if DOCX type
   */
  supports(mimeType: string): boolean {
    return mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }

  /**
   * Parse DOCX document and extract text
   * @param buffer - DOCX file buffer
   * @param fileName - Original file name
   * @returns Parsed document with text content
   */
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    try {
      // Extract text from DOCX using mammoth
      const result = await mammoth.extractRawText({ buffer })

      const content = this.cleanText(result.value)
      const sections = this.extractSections(content)

      return {
        content,
        metadata: {
          source: fileName,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          wordCount: this.countWords(content),
          characterCount: content.length,
        },
        sections,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Clean extracted text by normalizing whitespace
   * @param text - Raw extracted text
   * @returns Cleaned text with proper paragraphs
   */
  private cleanText(text: string): string {
    // Step 1: Normalize line endings and whitespace
    let cleaned = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    // Step 2: Join lines that are mid-sentence (similar to PDF logic)
    const paragraphs: string[] = []
    let currentParagraph = ''

    for (let i = 0; i < cleaned.length; i++) {
      const line = cleaned[i]!
      const nextLine = cleaned[i + 1]

      currentParagraph += (currentParagraph ? ' ' : '') + line

      // Check if this line ends a paragraph
      const endsWithPunctuation = /[.!?:]["']?$/.test(line)
      const nextStartsWithCapital = nextLine && /^[A-Z]/.test(nextLine)
      const nextLooksLikeHeading = nextLine && nextLine.length < 80 && /^[A-Z]/.test(nextLine) && !/[.!?,]$/.test(nextLine)
      const nextStartsWithBullet = nextLine && /^[-•*\d]/.test(nextLine)

      const shouldBreak = !nextLine ||
        (endsWithPunctuation && nextStartsWithCapital) ||
        nextLooksLikeHeading ||
        nextStartsWithBullet

      if (shouldBreak) {
        paragraphs.push(currentParagraph)
        currentParagraph = ''
      }
    }

    if (currentParagraph) {
      paragraphs.push(currentParagraph)
    }

    return paragraphs.join('\n\n').trim()
  }

  /**
   * Extract sections from content by detecting headings or paragraph breaks
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

/** Singleton DOCX parser instance */
export const docxParser = new DocxParser()
