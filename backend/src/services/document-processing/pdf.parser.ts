/**
 * PDF document parser
 * Extracts text content from PDF files using pdf-parse v2
 */

import { PDFParse } from 'pdf-parse'
import type { DocumentParser, ParsedDocument, DocumentSection } from './types'

/**
 * PDF parser implementation
 */
export class PdfParser implements DocumentParser {
  /**
   * Check if this parser supports the given MIME type
   * @param mimeType - MIME type to check
   * @returns True if PDF type
   */
  supports(mimeType: string): boolean {
    return mimeType === 'application/pdf'
  }

  /**
   * Parse PDF document and extract text
   * @param buffer - PDF file buffer
   * @param fileName - Original file name
   * @returns Parsed document with text content
   */
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    let pdfParser: PDFParse | null = null

    try {
      // Create PDF parser with buffer data
      pdfParser = new PDFParse({ data: buffer })

      // Get document info
      const info = await pdfParser.getInfo()

      // Get text content
      const textResult = await pdfParser.getText()

      const content = this.cleanText(textResult.text)
      const sections = this.extractSections(textResult.pages)

      return {
        content,
        metadata: {
          source: fileName,
          type: 'application/pdf',
          pageCount: info.total,
          wordCount: this.countWords(content),
          characterCount: content.length,
          title: info.info?.Title || undefined,
          author: info.info?.Author || undefined,
          createdAt: info.info?.CreationDate?.toString() || undefined,
        },
        sections,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      // Clean up parser resources
      if (pdfParser) {
        try {
          await pdfParser.destroy()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Clean extracted text by removing excess whitespace
   * @param text - Raw extracted text
   * @returns Cleaned text
   */
  private cleanText(text: string): string {
    return text
      // Replace multiple spaces with single space
      .replace(/[ \t]+/g, ' ')
      // Replace multiple newlines with double newline (paragraph break)
      .replace(/\n{3,}/g, '\n\n')
      // Trim lines
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Final trim
      .trim()
  }

  /**
   * Extract sections from page results
   * @param pages - Array of page text results
   * @returns Array of document sections
   */
  private extractSections(
    pages: Array<{ num: number; text: string }>
  ): DocumentSection[] {
    if (!pages || pages.length === 0) {
      return []
    }

    return pages.map((page, index) => ({
      index,
      title: `Page ${page.num}`,
      content: this.cleanText(page.text),
      metadata: { pageNumber: page.num },
    })).filter(section => section.content.length > 0)
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

/** Singleton PDF parser instance */
export const pdfParser = new PdfParser()
