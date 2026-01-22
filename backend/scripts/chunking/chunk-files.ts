#!/usr/bin/env bun
/**
 * File Extraction & Chunking Test Script
 *
 * Tests the extraction and chunking of various file types using our internal functions.
 * Supported file types: PDF, Excel (.xlsx), CSV, Markdown (.md), Text (.txt)
 *
 * Usage:
 *   bun run scripts/chunking/chunk-files.ts [file-path]
 *   bun run scripts/chunking/chunk-files.ts                           # Test all files in files/
 *   bun run scripts/chunking/chunk-files.ts scripts/chunking/files/test-pdf.pdf
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  parseDocument,
  parseAndChunk,
  isSupported,
  chunkMarkdown,
  type ParsedDocument,
  type TextChunk,
} from '../../src/services/document-processing'
import { FILE_UPLOAD_DEFAULTS } from '../../src/config/knowledge.defaults'

const FILES_DIR = path.join(__dirname, 'files')

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase() as keyof typeof FILE_UPLOAD_DEFAULTS.extensionToMimeType
  return FILE_UPLOAD_DEFAULTS.extensionToMimeType[ext] || null
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Test extraction for a single file
 */
async function testExtraction(filePath: string): Promise<ParsedDocument | null> {
  const fileName = path.basename(filePath)
  const mimeType = getMimeType(filePath)

  console.log(`\n${'─'.repeat(70)}`)
  console.log(`📄 EXTRACTION TEST: ${fileName}`)
  console.log('─'.repeat(70))

  if (!mimeType) {
    console.log(`❌ Unsupported file extension: ${path.extname(filePath)}`)
    return null
  }

  if (!isSupported(mimeType)) {
    console.log(`❌ Unsupported MIME type: ${mimeType}`)
    return null
  }

  console.log(`   MIME Type: ${mimeType}`)

  try {
    const buffer = fs.readFileSync(filePath)
    console.log(`   File Size: ${formatBytes(buffer.length)}`)

    const startTime = Date.now()
    const document = await parseDocument(buffer, fileName, mimeType)
    const duration = Date.now() - startTime

    console.log(`\n✅ Extraction successful in ${duration}ms`)
    console.log(`   Title: ${document.metadata.title || '(none)'}`)
    console.log(`   Type: ${document.metadata.type}`)
    console.log(`   Characters: ${document.metadata.characterCount}`)
    console.log(`   Words: ${document.metadata.wordCount}`)
    if (document.sections) {
      console.log(`   Sections: ${document.sections.length}`)
    }

    // Show content preview
    console.log(`\n📝 Content Preview (first 500 chars):`)
    console.log('─'.repeat(50))
    console.log(document.content.substring(0, 500))
    if (document.content.length > 500) {
      console.log(`\n... (${document.content.length - 500} more chars)`)
    }

    return document
  } catch (error) {
    console.log(`\n❌ Extraction failed: ${error instanceof Error ? error.message : error}`)
    return null
  }
}

/**
 * Test chunking for a document
 */
async function testChunking(
  filePath: string,
  document: ParsedDocument
): Promise<TextChunk[]> {
  const fileName = path.basename(filePath)
  const mimeType = getMimeType(filePath)!

  console.log(`\n${'─'.repeat(70)}`)
  console.log(`🔪 CHUNKING TEST: ${fileName}`)
  console.log('─'.repeat(70))

  try {
    const buffer = fs.readFileSync(filePath)

    const startTime = Date.now()

    let chunks: TextChunk[]

    // Use markdown-aware chunking for markdown files
    if (mimeType === 'text/markdown') {
      console.log(`   Using: chunkMarkdown() (markdown-aware)`)
      chunks = chunkMarkdown(document.content, fileName)
    } else {
      console.log(`   Using: parseAndChunk() (standard)`)
      chunks = await parseAndChunk(buffer, fileName, mimeType)
    }

    const duration = Date.now() - startTime

    console.log(`\n✅ Chunking successful in ${duration}ms`)
    console.log(`   Total chunks: ${chunks.length}`)
    console.log(`   Total characters: ${chunks.reduce((sum, c) => sum + c.length, 0)}`)
    console.log(`   Average chunk size: ${Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length)} chars`)
    console.log(`   Chunk sizes: ${chunks.map(c => c.length).join(', ')}`)

    // Show each chunk
    console.log(`\n📦 CHUNKS:`)
    chunks.forEach((chunk, index) => {
      console.log(`\n${'─'.repeat(50)}`)
      console.log(`Chunk ${index + 1}/${chunks.length}`)
      console.log(`   Length: ${chunk.length} chars`)
      if (chunk.metadata?.section) {
        console.log(`   Section: ${chunk.metadata.section}`)
      }
      if (chunk.metadata?.pageNumber) {
        console.log(`   Page: ${chunk.metadata.pageNumber}`)
      }
      if (chunk.metadata?.sheetName) {
        console.log(`   Sheet: ${chunk.metadata.sheetName}`)
      }
      console.log('─'.repeat(50))
      // Show start
      console.log('START: ' + chunk.content.substring(0, 100).replace(/\n/g, '\\n'))
      // Show end
      console.log('END: ' + chunk.content.substring(Math.max(0, chunk.content.length - 100)).replace(/\n/g, '\\n'))
    })

    return chunks
  } catch (error) {
    console.log(`\n❌ Chunking failed: ${error instanceof Error ? error.message : error}`)
    return []
  }
}

/**
 * Test a single file (extraction + chunking)
 */
async function testFile(filePath: string): Promise<void> {
  console.log('\n' + '═'.repeat(70))
  console.log(`🧪 TESTING FILE: ${path.basename(filePath)}`)
  console.log('═'.repeat(70))

  // Step 1: Test extraction
  const document = await testExtraction(filePath)
  if (!document) {
    return
  }

  // Step 2: Test chunking
  const chunks = await testChunking(filePath, document)

  // Summary
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`📊 SUMMARY: ${path.basename(filePath)}`)
  console.log('═'.repeat(70))
  console.log(`   Extraction: ✅ Success`)
  console.log(`   Characters extracted: ${document.metadata.characterCount}`)
  console.log(`   Chunking: ${chunks.length > 0 ? '✅ Success' : '❌ Failed'}`)
  console.log(`   Chunks created: ${chunks.length}`)
}

/**
 * Test all files in the files directory
 */
async function testAllFiles(): Promise<void> {
  console.log('═'.repeat(70))
  console.log('🧪 FILE EXTRACTION & CHUNKING TEST SUITE')
  console.log('═'.repeat(70))
  console.log(`\nTest files directory: ${FILES_DIR}`)

  const files = fs.readdirSync(FILES_DIR)
    .filter(f => !f.startsWith('.'))
    .map(f => path.join(FILES_DIR, f))

  console.log(`Found ${files.length} files to test:`)
  files.forEach(f => console.log(`   - ${path.basename(f)}`))

  const results: Array<{ file: string; extraction: boolean; chunks: number }> = []

  for (const filePath of files) {
    const document = await testExtraction(filePath)
    let chunkCount = 0

    if (document) {
      const chunks = await testChunking(filePath, document)
      chunkCount = chunks.length
    }

    results.push({
      file: path.basename(filePath),
      extraction: document !== null,
      chunks: chunkCount,
    })
  }

  // Final summary
  console.log('\n' + '═'.repeat(70))
  console.log('📊 FINAL SUMMARY')
  console.log('═'.repeat(70))
  console.log('\n| File | Extraction | Chunks |')
  console.log('|------|------------|--------|')
  results.forEach(r => {
    console.log(`| ${r.file.padEnd(30)} | ${r.extraction ? '✅' : '❌'}          | ${String(r.chunks).padStart(6)} |`)
  })

  const successCount = results.filter(r => r.extraction).length
  console.log(`\nTotal: ${successCount}/${results.length} files processed successfully`)
}

async function main() {
  const filePath = process.argv[2]

  if (filePath) {
    // Test specific file
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`)
      process.exit(1)
    }
    await testFile(fullPath)
  } else {
    // Test all files
    await testAllFiles()
  }
}

main().catch(console.error)
