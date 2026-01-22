/**
 * Office document parser
 * Extracts text content from PowerPoint (.pptx) and RTF files using officeparser
 */

import officeParser from 'officeparser'
import type { DocumentParser, ParsedDocument, DocumentSection } from './types'

/** Supported MIME types */
const SUPPORTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/rtf', // .rtf
  'text/rtf', // .rtf (alternative)
]

/**
 * Office parser implementation for PPTX and RTF
 */
export class OfficeDocParser implements DocumentParser {
  /**
   * Check if this parser supports the given MIME type
   * @param mimeType - MIME type to check
   * @returns True if supported type
   */
  supports(mimeType: string): boolean {
    return SUPPORTED_MIME_TYPES.includes(mimeType)
  }

  /**
   * Parse document and extract text
   * @param buffer - File buffer
   * @param fileName - Original file name
   * @returns Parsed document with text content
   */
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    try {
      // Extract text using officeparser v6 API
      // parseOffice returns an AST object, use toText() to get plain text
      const ast = await officeParser.parseOffice(buffer)
      const text = ast.toText()

      const content = this.cleanText(text)
      const sections = this.extractSections(content)
      const mimeType = this.getMimeType(fileName)

      return {
        content,
        metadata: {
          source: fileName,
          type: mimeType,
          wordCount: this.countWords(content),
          characterCount: content.length,
        },
        sections,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get MIME type from file extension
   * @param fileName - File name
   * @returns MIME type
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      case 'rtf':
        return 'application/rtf'
      default:
        return 'application/octet-stream'
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

    // Step 2: Join lines that are mid-sentence
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

/** Singleton office document parser instance */
export const officeDocParser = new OfficeDocParser()

// Re-export as pptxParser for backward compatibility
export const pptxParser = officeDocParser
