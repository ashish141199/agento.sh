/**
 * Excel document parser
 * Extracts text content from Excel files (.xlsx, .xls, .csv)
 */

import * as XLSX from 'xlsx'
import type { DocumentParser, ParsedDocument, DocumentSection } from './types'

/**
 * Excel parser implementation
 */
export class ExcelParser implements DocumentParser {
  /** Supported MIME types */
  private readonly supportedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'text/csv', // csv
  ]

  /**
   * Check if this parser supports the given MIME type
   * @param mimeType - MIME type to check
   * @returns True if Excel/CSV type
   */
  supports(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType)
  }

  /**
   * Parse Excel/CSV document and extract text
   * @param buffer - File buffer
   * @param fileName - Original file name
   * @returns Parsed document with text content
   */
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sections: DocumentSection[] = []
      const allContent: string[] = []

      // Process each sheet
      for (let i = 0; i < workbook.SheetNames.length; i++) {
        const sheetName = workbook.SheetNames[i]
        if (!sheetName) continue

        const sheet = workbook.Sheets[sheetName]
        if (!sheet) continue

        const sheetContent = this.extractSheetContent(sheet, sheetName)

        if (sheetContent.trim()) {
          allContent.push(`## ${sheetName}\n\n${sheetContent}`)

          sections.push({
            index: i,
            title: sheetName,
            content: sheetContent,
            metadata: { sheetName },
          })
        }
      }

      const content = allContent.join('\n\n')

      return {
        content,
        metadata: {
          source: fileName,
          type: this.getMimeType(fileName),
          pageCount: workbook.SheetNames.length,
          wordCount: this.countWords(content),
          characterCount: content.length,
        },
        sections,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse Excel: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Extract content from a single sheet
   * @param sheet - XLSX worksheet
   * @param sheetName - Name of the sheet
   * @returns Extracted text content
   */
  private extractSheetContent(sheet: XLSX.WorkSheet, sheetName: string): string {
    const rows: string[] = []
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')

    // Get headers from first row
    const headers: string[] = []
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
      const cell = sheet[cellAddress]
      headers.push(cell?.v?.toString() || `Column ${col + 1}`)
    }

    // Check if first row looks like headers (all strings, mostly unique)
    const isFirstRowHeaders = this.looksLikeHeaders(sheet, range)

    if (isFirstRowHeaders) {
      // Format as structured data with headers
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const rowData: string[] = []
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          const cell = sheet[cellAddress]
          const header = headers[col - range.s.c] || `Field ${col + 1}`
          const value = this.formatCellValue(cell)
          if (value) {
            rowData.push(`${header}: ${value}`)
          }
        }
        if (rowData.length > 0) {
          rows.push(rowData.join(', '))
        }
      }
    } else {
      // Format as plain table
      for (let row = range.s.r; row <= range.e.r; row++) {
        const rowData: string[] = []
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          const cell = sheet[cellAddress]
          rowData.push(this.formatCellValue(cell))
        }
        const rowText = rowData.join(' | ').trim()
        if (rowText && rowText !== '|'.repeat(rowData.length - 1)) {
          rows.push(rowText)
        }
      }
    }

    return rows.join('\n')
  }

  /**
   * Check if first row looks like headers
   * @param sheet - Worksheet
   * @param range - Sheet range
   * @returns True if first row appears to be headers
   */
  private looksLikeHeaders(sheet: XLSX.WorkSheet, range: XLSX.Range): boolean {
    const firstRowValues: string[] = []

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
      const cell = sheet[cellAddress]
      if (cell?.t === 's') { // string type
        firstRowValues.push(cell.v?.toString() || '')
      } else {
        return false // First row has non-string values
      }
    }

    // Check if values are mostly unique (typical of headers)
    const uniqueValues = new Set(firstRowValues.filter(v => v))
    return uniqueValues.size >= firstRowValues.length * 0.7
  }

  /**
   * Format cell value to string
   * @param cell - XLSX cell
   * @returns Formatted string value
   */
  private formatCellValue(cell: XLSX.CellObject | undefined): string {
    if (!cell) return ''

    switch (cell.t) {
      case 'n': // number
        return cell.v?.toString() || ''
      case 's': // string
        return cell.v?.toString() || ''
      case 'b': // boolean
        return cell.v ? 'Yes' : 'No'
      case 'd': // date
        return cell.v?.toString() || ''
      case 'e': // error
        return ''
      default:
        return cell.v?.toString() || ''
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
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      case 'xls':
        return 'application/vnd.ms-excel'
      case 'csv':
        return 'text/csv'
      default:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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

/** Singleton Excel parser instance */
export const excelParser = new ExcelParser()
