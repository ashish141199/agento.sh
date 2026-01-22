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
   * Clean extracted text by removing excess whitespace and joining wrapped lines
   * PDFs often have hard line breaks that aren't paragraph breaks - this joins them
   * @param text - Raw extracted text
   * @returns Cleaned text with proper paragraphs
   */
  private cleanText(text: string): string {
    // Step 1: Normalize spaces and trim lines
    let cleaned = text
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    // Step 2: Join lines that are mid-sentence (PDF wrapping)
    // A line is mid-sentence if it doesn't end with sentence-ending punctuation
    // and the next line doesn't look like a new section/paragraph
    const paragraphs: string[] = []
    let currentParagraph = ''

    for (let i = 0; i < cleaned.length; i++) {
      const line = cleaned[i]!
      const nextLine = cleaned[i + 1]

      currentParagraph += (currentParagraph ? ' ' : '') + line

      // Check if this line ends a paragraph:
      // 1. Ends with sentence-ending punctuation (.!?) and next line starts with capital
      // 2. Next line looks like a heading (short, starts with capital, no ending punctuation)
      // 3. This is the last line
      // 4. Next line starts with a bullet or number
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
