/**
 * Text document parser
 * Handles plain text, markdown, and JSON files
 */

import type { DocumentParser, ParsedDocument, DocumentSection } from './types'

/**
 * Text parser implementation
 */
export class TextParser implements DocumentParser {
  /** Supported MIME types */
  private readonly supportedTypes = [
    'text/plain',
    'text/markdown',
    'application/json',
  ]

  /**
   * Check if this parser supports the given MIME type
   * @param mimeType - MIME type to check
   * @returns True if text type
   */
  supports(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType)
  }

  /**
   * Parse text document
   * @param buffer - File buffer
   * @param fileName - Original file name
   * @returns Parsed document with text content
   */
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    try {
      const rawContent = buffer.toString('utf-8')
      const mimeType = this.getMimeType(fileName)

      let content: string
      let sections: DocumentSection[] = []

      if (mimeType === 'application/json') {
        // Format JSON for readability
        const result = this.parseJson(rawContent, fileName)
        content = result.content
        sections = result.sections
      } else if (mimeType === 'text/markdown') {
        // Parse markdown sections
        const result = this.parseMarkdown(rawContent, fileName)
        content = result.content
        sections = result.sections
      } else {
        // Plain text
        content = this.cleanText(rawContent)
        sections = this.extractTextSections(content)
      }

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
        `Failed to parse text: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Parse JSON content into readable text
   * @param rawContent - Raw JSON string
   * @param fileName - File name
   * @returns Parsed content and sections
   */
  private parseJson(
    rawContent: string,
    fileName: string
  ): { content: string; sections: DocumentSection[] } {
    try {
      const data = JSON.parse(rawContent)
      const content = this.jsonToText(data)

      return {
        content,
        sections: [{
          index: 0,
          title: fileName,
          content,
          metadata: { type: 'json' },
        }],
      }
    } catch {
      // If JSON is invalid, treat as plain text
      return {
        content: this.cleanText(rawContent),
        sections: [],
      }
    }
  }

  /**
   * Convert JSON object to readable text
   * @param data - Parsed JSON data
   * @param prefix - Key prefix for nested objects
   * @returns Formatted text
   */
  private jsonToText(data: unknown, prefix: string = ''): string {
    const lines: string[] = []

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${prefix}Item ${index + 1}:`)
          lines.push(this.jsonToText(item, '  '))
        } else {
          lines.push(`${prefix}- ${item}`)
        }
      })
    } else if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null) {
          lines.push(`${prefix}${key}:`)
          lines.push(this.jsonToText(value, prefix + '  '))
        } else {
          lines.push(`${prefix}${key}: ${value}`)
        }
      }
    } else {
      lines.push(`${prefix}${data}`)
    }

    return lines.join('\n')
  }

  /**
   * Parse markdown into sections by headings
   * @param rawContent - Raw markdown string
   * @param fileName - File name
   * @returns Parsed content and sections
   */
  private parseMarkdown(
    rawContent: string,
    fileName: string
  ): { content: string; sections: DocumentSection[] } {
    const content = this.cleanText(rawContent)
    const sections: DocumentSection[] = []

    // Split by headings (# ## ### etc)
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    let lastIndex = 0
    let lastHeading = fileName
    let sectionIndex = 0
    let match

    while ((match = headingRegex.exec(content)) !== null) {
      // Save previous section
      if (match.index > lastIndex) {
        const sectionContent = content.slice(lastIndex, match.index).trim()
        if (sectionContent) {
          sections.push({
            index: sectionIndex++,
            title: lastHeading,
            content: sectionContent,
          })
        }
      }

      lastHeading = match[2] || 'Section'
      lastIndex = match.index + match[0].length
    }

    // Save final section
    const finalContent = content.slice(lastIndex).trim()
    if (finalContent) {
      sections.push({
        index: sectionIndex,
        title: lastHeading,
        content: finalContent,
      })
    }

    // If no sections found, create one for entire content
    if (sections.length === 0 && content) {
      sections.push({
        index: 0,
        title: fileName,
        content,
      })
    }

    return { content, sections }
  }

  /**
   * Extract sections from plain text by paragraph breaks
   * @param content - Clean text content
   * @returns Array of sections
   */
  private extractTextSections(content: string): DocumentSection[] {
    // Split by double newlines (paragraphs)
    const paragraphs = content
      .split(/\n\n+/)
      .filter(p => p.trim().length > 0)

    // Group small paragraphs together
    const sections: DocumentSection[] = []
    let currentContent: string[] = []
    let sectionIndex = 0

    for (const paragraph of paragraphs) {
      currentContent.push(paragraph)

      // Create a new section every ~1000 characters or at natural breaks
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
   * Clean text by normalizing whitespace
   * @param text - Raw text
   * @returns Cleaned text
   */
  private cleanText(text: string): string {
    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Replace tabs with spaces
      .replace(/\t/g, '  ')
      // Remove excess whitespace within lines
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      // Remove excessive blank lines
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()
  }

  /**
   * Get MIME type from file extension
   * @param fileName - File name
   * @returns MIME type
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop()
    switch (ext) {
      case 'md':
      case 'markdown':
        return 'text/markdown'
      case 'json':
        return 'application/json'
      default:
        return 'text/plain'
    }
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

/** Singleton text parser instance */
export const textParser = new TextParser()
