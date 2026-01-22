/**
 * Text document parser
 * Handles plain text, markdown, JSON, HTML, XML, YAML, and code files
 */

import type { DocumentParser, ParsedDocument, DocumentSection } from './types'
import { htmlToMarkdown } from './html-to-markdown'
import { CHUNKING_DEFAULTS } from '../../config/knowledge.defaults'

/**
 * Text parser implementation
 */
export class TextParser implements DocumentParser {
  /** Supported MIME types */
  private readonly supportedTypes = [
    'text/plain',
    'text/markdown',
    'application/json',
    'text/typescript',
    'text/javascript',
    'application/typescript',
    'application/javascript',
    // HTML
    'text/html',
    // XML
    'text/xml',
    'application/xml',
    // YAML
    'text/yaml',
    'application/x-yaml',
    // Additional code file types
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
      } else if (mimeType === 'text/html') {
        // Convert HTML to markdown then parse as markdown
        const markdown = htmlToMarkdown(rawContent)
        const result = this.parseMarkdown(markdown, fileName)
        content = result.content
        sections = result.sections
      } else if (mimeType === 'text/xml' || mimeType === 'application/xml') {
        // Parse XML - extract text content, preserve structure
        const result = this.parseXml(rawContent, fileName)
        content = result.content
        sections = result.sections
      } else if (mimeType === 'text/yaml' || mimeType === 'application/x-yaml') {
        // Parse YAML as structured text
        content = this.cleanText(rawContent)
        sections = this.extractTextSections(content)
      } else if (this.isCodeFile(mimeType)) {
        // Parse code files - extract code blocks and comments
        const result = this.parseCode(rawContent, fileName)
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
   * Parse TypeScript/JavaScript code into sections
   * Splits by top-level declarations (functions, classes, interfaces, etc.)
   * Keeps JSDoc comments attached to their declarations
   * @param rawContent - Raw code string
   * @param fileName - File name
   * @returns Parsed content and sections
   */
  private parseCode(
    rawContent: string,
    fileName: string
  ): { content: string; sections: DocumentSection[] } {
    const content = this.cleanText(rawContent)
    const sections: DocumentSection[] = []

    const lines = content.split('\n')

    let currentSection: string[] = []
    let currentTitle = fileName
    let sectionIndex = 0
    let bracketDepth = 0
    let inDeclaration = false
    let inJsDoc = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      const trimmedLine = line.trim()

      // Track JSDoc comments - they should be attached to the NEXT declaration
      if (trimmedLine.startsWith('/**')) {
        inJsDoc = true
        // If we have content before this JSDoc (and not in a declaration), save it first
        if (!inDeclaration && currentSection.length > 0) {
          const prevContent = currentSection.join('\n').trim()
          if (prevContent.length > 0 && !prevContent.startsWith('/**')) {
            sections.push({
              index: sectionIndex++,
              title: currentTitle,
              content: prevContent,
            })
            currentSection = []
            currentTitle = fileName
          }
        }
      }

      currentSection.push(line)

      // End of JSDoc
      if (inJsDoc && trimmedLine.endsWith('*/')) {
        inJsDoc = false
      }

      // Track bracket depth to find end of declarations
      // Don't count brackets inside strings
      let inString = false
      let stringChar = ''
      for (let j = 0; j < line.length; j++) {
        const char = line[j]!
        const prevChar = j > 0 ? line[j - 1] : ''

        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true
          stringChar = char
        } else if (inString && char === stringChar && prevChar !== '\\') {
          inString = false
        } else if (!inString) {
          if (char === '{') bracketDepth++
          if (char === '}') bracketDepth--
        }
      }

      // Check if this line starts a new declaration (not in JSDoc or string)
      const match = line.match(/^(export\s+)?(async\s+)?(function|class|interface|type|const|let|var|enum)\s+(\w+)/)
      if (match && !inDeclaration && !inJsDoc) {
        // Declaration found - DON'T save previous section here
        // (JSDoc should already be in currentSection from above)
        currentTitle = `${match[3]} ${match[4]}`
        inDeclaration = true
        // Reset bracket depth for this declaration
        bracketDepth = 0
        for (const char of line) {
          if (char === '{') bracketDepth++
          if (char === '}') bracketDepth--
        }
      }

      // End of declaration (back to depth 0 or single-line declaration)
      const isEndOfDeclaration = inDeclaration && (
        // Multi-line declaration ending with }
        (bracketDepth <= 0 && line.includes('}')) ||
        // Single-line interface/type without braces
        (bracketDepth === 0 && !line.includes('{') && (
          currentTitle.startsWith('interface ') ||
          currentTitle.startsWith('type ')
        ) && (trimmedLine.endsWith('}') || trimmedLine.endsWith(';') || i === lines.length - 1))
      )

      if (isEndOfDeclaration) {
        const sectionContent = currentSection.join('\n').trim()
        if (sectionContent.length > 0) {
          sections.push({
            index: sectionIndex++,
            title: currentTitle,
            content: sectionContent,
          })
        }
        currentSection = []
        currentTitle = fileName
        inDeclaration = false
        bracketDepth = 0
      }
    }

    // Save remaining content
    if (currentSection.length > 0) {
      const remaining = currentSection.join('\n').trim()
      if (remaining.length > 0) {
        sections.push({
          index: sectionIndex,
          title: currentTitle,
          content: remaining,
        })
      }
    }

    // If no sections were created, treat entire file as one section
    if (sections.length === 0 && content.length > 0) {
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

      // Create a new section based on configured chunk size
      const totalLength = currentContent.join('\n\n').length
      if (totalLength >= CHUNKING_DEFAULTS.chunkSize) {
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
      case 'ts':
      case 'tsx':
        return 'text/typescript'
      case 'js':
      case 'jsx':
        return 'text/javascript'
      case 'html':
      case 'htm':
        return 'text/html'
      case 'xml':
        return 'text/xml'
      case 'yaml':
      case 'yml':
        return 'text/yaml'
      case 'py':
        return 'text/x-python'
      case 'java':
        return 'text/x-java'
      case 'go':
        return 'text/x-go'
      case 'rb':
        return 'text/x-ruby'
      case 'php':
        return 'text/x-php'
      case 'c':
      case 'h':
        return 'text/x-c'
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'hpp':
        return 'text/x-cpp'
      case 'rs':
        return 'text/x-rust'
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

  /**
   * Check if MIME type is a code file
   * @param mimeType - MIME type to check
   * @returns True if code file
   */
  private isCodeFile(mimeType: string): boolean {
    return [
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
    ].includes(mimeType)
  }

  /**
   * Parse XML content - extract text while preserving structure info
   * @param rawContent - Raw XML string
   * @param fileName - File name
   * @returns Parsed content and sections
   */
  private parseXml(
    rawContent: string,
    fileName: string
  ): { content: string; sections: DocumentSection[] } {
    // Simple XML text extraction - strip tags but preserve text
    const content = rawContent
      // Remove XML declaration and processing instructions
      .replace(/<\?[^?]*\?>/g, '')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove CDATA wrappers but keep content
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      // Replace closing tags with newline
      .replace(/<\/[^>]+>/g, '\n')
      // Replace opening tags with space
      .replace(/<[^>]+>/g, ' ')
      // Clean up whitespace
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')

    const sections = this.extractTextSections(content)

    return { content, sections }
  }
}

/** Singleton text parser instance */
export const textParser = new TextParser()
