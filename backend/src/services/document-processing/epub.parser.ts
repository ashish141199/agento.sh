/**
 * EPUB document parser
 * Extracts text content from .epub files using epub2
 */

import EPub from 'epub2'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { htmlToMarkdown } from './html-to-markdown'
import type { DocumentParser, ParsedDocument, DocumentSection } from './types'

/**
 * EPUB parser implementation
 */
export class EpubParser implements DocumentParser {
  /**
   * Check if this parser supports the given MIME type
   * @param mimeType - MIME type to check
   * @returns True if EPUB type
   */
  supports(mimeType: string): boolean {
    return mimeType === 'application/epub+zip'
  }

  /**
   * Parse EPUB document and extract text
   * @param buffer - EPUB file buffer
   * @param fileName - Original file name
   * @returns Parsed document with text content
   */
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    // epub2 requires a file path, so write to temp file
    const tempPath = join(tmpdir(), `epub-${Date.now()}-${Math.random().toString(36).slice(2)}.epub`)

    try {
      writeFileSync(tempPath, buffer)

      // Parse EPUB
      const epub = await EPub.createAsync(tempPath)

      // Extract text from all chapters
      const sections: DocumentSection[] = []
      let allContent: string[] = []
      let sectionIndex = 0

      // Get chapters from flow (reading order)
      for (const chapter of epub.flow) {
        if (!chapter.id) continue

        try {
          const chapterHtml = await new Promise<string>((resolve, reject) => {
            epub.getChapter(chapter.id!, (err: Error | null, text: string) => {
              if (err) reject(err)
              else resolve(text || '')
            })
          })

          if (chapterHtml && chapterHtml.trim()) {
            // Convert HTML to markdown for cleaner text
            const markdown = htmlToMarkdown(chapterHtml)
            const cleanContent = this.cleanText(markdown)

            if (cleanContent.length > 0) {
              const title = chapter.title || `Chapter ${sectionIndex + 1}`
              sections.push({
                index: sectionIndex++,
                title,
                content: cleanContent,
              })
              allContent.push(cleanContent)
            }
          }
        } catch {
          // Skip chapters that can't be read
          continue
        }
      }

      const content = allContent.join('\n\n')

      return {
        content,
        metadata: {
          source: fileName,
          type: 'application/epub+zip',
          title: epub.metadata?.title,
          wordCount: this.countWords(content),
          characterCount: content.length,
        },
        sections,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      // Clean up temp file
      try {
        unlinkSync(tempPath)
      } catch {
        // Ignore cleanup errors
      }
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
   * Count words in text
   * @param text - Text to count
   * @returns Word count
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length
  }
}

/** Singleton EPUB parser instance */
export const epubParser = new EpubParser()
