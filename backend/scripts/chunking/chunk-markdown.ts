#!/usr/bin/env bun
/**
 * Markdown Chunking Demo
 *
 * Tests the markdown section-aware chunking from chunker.service.ts
 * This demo takes a website URL, fetches and converts it to markdown,
 * then chunks it using the chunkMarkdown function.
 *
 * Usage:
 *   bun run scripts/chunking/ChunkMarkdown.ts <url>
 *   bun run scripts/chunking/ChunkMarkdown.ts https://platoona.com/pricing
 */

import * as cheerio from 'cheerio'
import { chunkMarkdown } from '../../src/services/document-processing'
import { htmlToMarkdownClean } from '../../src/services/document-processing/html-to-markdown'

const WEBSITE_CONFIG = {
  userAgent: 'Autive-Bot/1.0 (Knowledge Crawler)',
  requestTimeoutMs: 15000,
}

/**
 * Clean markdown content to remove noise
 */
function cleanMarkdown(markdown: string): string {
  let cleaned = markdown

  // Remove image-only lines (standalone images without context)
  cleaned = cleaned.replace(/^\s*!\[[^\]]*\]\([^)]+\)\s*$/gm, '')

  // Remove empty links
  cleaned = cleaned.replace(/\[\s*\]\([^)]*\)/g, '')

  // Remove links that are just images
  cleaned = cleaned.replace(/\[!\[[^\]]*\]\([^)]+\)\s*\]\([^)]+\)/g, '')

  // Remove standalone URLs in brackets
  cleaned = cleaned.replace(/\[\s*\/?[a-z-]+\s*\]/gi, '')

  // Remove lines that are just markdown image syntax
  cleaned = cleaned.replace(/^!\[.*?\]\(.*?\)$/gm, '')

  // Collapse multiple blank lines into two
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n')

  // Remove lines that start with [/ (broken link fragments)
  cleaned = cleaned.replace(/^\[\/?[^\]]*$/gm, '')

  // Remove empty headers
  cleaned = cleaned.replace(/^#{1,6}\s*$/gm, '')

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/[ \t]+$/gm, '')
  cleaned = cleaned.trim()

  return cleaned
}

async function fetchPage(url: string): Promise<string> {
  console.log(`\n📥 Fetching: ${url}`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), WEBSITE_CONFIG.requestTimeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': WEBSITE_CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error(`Not HTML: ${contentType}`)
    }

    return await response.text()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

function extractMainContent(html: string): string {
  const $ = cheerio.load(html)

  // Try to find main content area
  let contentHtml = ''
  const mainSelectors = ['main', 'article', '.content', '.main-content', '#content', '#main']

  for (const selector of mainSelectors) {
    const main = $(selector)
    if (main.length > 0) {
      contentHtml = main.html() || ''
      console.log(`📄 Found content in: ${selector}`)
      break
    }
  }

  // Fallback to body
  if (!contentHtml) {
    $('script, style, nav, footer, header, aside, .sidebar, .navigation, .menu, .ad, .advertisement, .cookie-banner, .popup').remove()
    contentHtml = $('body').html() || ''
    console.log('📄 Using body content (fallback)')
  }

  return contentHtml
}

async function main() {
  const url = process.argv[2]

  if (!url) {
    console.log('Markdown Chunking Demo')
    console.log('=' .repeat(50))
    console.log('\nUsage: bun run scripts/chunking/ChunkMarkdown.ts <url>')
    console.log('\nExamples:')
    console.log('  bun run scripts/chunking/ChunkMarkdown.ts https://platoona.com/pricing')
    console.log('  bun run scripts/chunking/ChunkMarkdown.ts https://platoona.com/integrations/whatsapp')
    process.exit(1)
  }

  try {
    // Step 1: Fetch HTML
    const html = await fetchPage(url)
    console.log(`✅ Fetched ${html.length} chars of HTML`)

    // Step 2: Extract main content
    const contentHtml = extractMainContent(html)
    console.log(`✅ Extracted ${contentHtml.length} chars of content HTML`)

    // Step 3: Convert to Markdown
    const markdown = htmlToMarkdownClean(contentHtml, {
      removeNavigation: true,
      removeFooter: true,
      minContentLength: 50,
    })
    console.log(`✅ Converted to ${markdown.length} chars of Markdown`)

    // Step 4: Clean markdown (remove noise)
    const cleanedMarkdown = cleanMarkdown(markdown)
    console.log(`✅ Cleaned to ${cleanedMarkdown.length} chars of Markdown`)

    // Step 5: Chunk using the service function
    console.log('\n' + '='.repeat(80))
    console.log('🔪 CHUNKING WITH chunkMarkdown() FROM chunker.service.ts:')
    console.log('='.repeat(80))

    const chunks = chunkMarkdown(cleanedMarkdown, url)

    console.log(`\n✅ Created ${chunks.length} chunks\n`)

    // Display chunks
    chunks.forEach((chunk, index) => {
      console.log(`\n${'─'.repeat(60)}`)
      console.log(`📦 CHUNK ${index + 1}/${chunks.length}`)
      console.log(`   Chars: ${chunk.length}${chunk.metadata?.section ? ` | Section: "${chunk.metadata.section.substring(0, 50)}"` : ''}`)
      console.log('─'.repeat(60))
      console.log(chunk.content.substring(0, 600))
      if (chunk.content.length > 600) {
        console.log(`\n... (${chunk.content.length - 600} more chars)`)
      }
    })

    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 SUMMARY:')
    console.log('='.repeat(80))
    console.log(`URL: ${url}`)
    console.log(`HTML size: ${html.length} chars`)
    console.log(`Raw Markdown size: ${markdown.length} chars`)
    console.log(`Cleaned Markdown size: ${cleanedMarkdown.length} chars`)
    console.log(`Total chunks: ${chunks.length}`)
    console.log(`Average chunk size: ${Math.round(cleanedMarkdown.length / chunks.length)} chars`)
    console.log(`Chunk sizes: ${chunks.map(c => c.length).join(', ')}`)

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
