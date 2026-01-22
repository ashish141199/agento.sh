/**
 * Test script to verify chunks are meaningful
 * Checks that code boundaries, sections, and structures are preserved
 */

import { parseAndChunk } from '../../src/services/document-processing'
import { readFileSync } from 'fs'
import { join } from 'path'

const filesDir = join(import.meta.dir, 'files')

interface ChunkAnalysis {
  file: string
  totalChunks: number
  issues: string[]
  examples: { title: string; preview: string }[]
}

async function analyzeChunks(fileName: string, mimeType: string): Promise<ChunkAnalysis> {
  const filePath = join(filesDir, fileName)
  const buffer = readFileSync(filePath)
  const chunks = await parseAndChunk(buffer, fileName, mimeType)

  const issues: string[] = []
  const examples: { title: string; preview: string }[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!
    const content = chunk.content

    // Check for code-specific issues
    if (mimeType.includes('python') || mimeType.includes('java') ||
        mimeType.includes('typescript') || mimeType.includes('javascript') ||
        mimeType.includes('go') || mimeType.includes('rust') ||
        mimeType.includes('ruby') || mimeType.includes('php') ||
        mimeType.includes('x-c')) {

      // Check if chunk starts mid-function (has closing brace without opening)
      const openBraces = (content.match(/\{/g) || []).length
      const closeBraces = (content.match(/\}/g) || []).length
      if (closeBraces > openBraces + 1) {
        issues.push(`Chunk ${i + 1}: May start mid-block (${closeBraces} close vs ${openBraces} open braces)`)
      }

      // Check if JSDoc is separated from its declaration
      if (content.trim().endsWith('*/') && !content.includes('function') &&
          !content.includes('class') && !content.includes('const') &&
          !content.includes('def ') && !content.includes('func ')) {
        issues.push(`Chunk ${i + 1}: JSDoc/docstring may be separated from declaration`)
      }
    }

    // Store example with section info
    if (i < 3 || (chunk.metadata?.section && !examples.find(e => e.title === chunk.metadata?.section))) {
      examples.push({
        title: chunk.metadata?.section || `Chunk ${i + 1}`,
        preview: content.slice(0, 150).replace(/\n/g, '\\n') + (content.length > 150 ? '...' : '')
      })
    }
  }

  return { file: fileName, totalChunks: chunks.length, issues, examples }
}

async function main() {
  console.log('='.repeat(70))
  console.log('MEANINGFUL CHUNKS VERIFICATION')
  console.log('='.repeat(70))
  console.log()

  const testCases = [
    { file: 'test-python.py', mime: 'text/x-python', desc: 'Python - should keep classes/functions intact' },
    { file: 'test-go.go', mime: 'text/x-go', desc: 'Go - should keep functions/structs intact' },
    { file: 'test-java.java', mime: 'text/x-java', desc: 'Java - should keep classes/methods intact' },
    { file: 'test-rust.rs', mime: 'text/x-rust', desc: 'Rust - should keep impl blocks intact' },
    { file: 'test-html.html', mime: 'text/html', desc: 'HTML - should convert to markdown sections' },
    { file: 'test-xml.xml', mime: 'text/xml', desc: 'XML - should extract meaningful text' },
    { file: 'test-yaml.yaml', mime: 'text/yaml', desc: 'YAML - should preserve structure' },
    { file: 'test-ts.ts', mime: 'text/typescript', desc: 'TypeScript - should keep JSDoc with declarations' },
    { file: 'test-pptx.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', desc: 'PowerPoint - should extract slide content' },
    { file: 'test-doc.doc', mime: 'application/msword', desc: 'Legacy Word - should extract paragraphs' },
    { file: 'test-zip.zip', mime: 'application/zip', desc: 'ZIP - should extract and process contained files' },
    { file: 'test-epub.epub', mime: 'application/epub+zip', desc: 'EPUB - should extract chapters' },
    { file: 'test-rtf.rtf', mime: 'application/rtf', desc: 'RTF - should extract text content' },
  ]

  for (const { file, mime, desc } of testCases) {
    console.log('-'.repeat(70))
    console.log(`FILE: ${file}`)
    console.log(`DESC: ${desc}`)
    console.log('-'.repeat(70))

    try {
      const analysis = await analyzeChunks(file, mime)

      console.log(`Total chunks: ${analysis.totalChunks}`)

      if (analysis.issues.length > 0) {
        console.log(`WARNING - Potential issues:`)
        for (const issue of analysis.issues) {
          console.log(`  - ${issue}`)
        }
      } else {
        console.log(`OK - No obvious chunking issues detected`)
      }

      console.log()
      console.log(`Chunk samples:`)
      for (const ex of analysis.examples.slice(0, 4)) {
        console.log(`  [${ex.title}]`)
        console.log(`  "${ex.preview}"`)
        console.log()
      }
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : err}`)
    }
    console.log()
  }
}

main().catch(console.error)
