/**
 * Website crawler service
 * Crawls all pages of a website and extracts content as Markdown
 * Note: JS-rendered pages (SPAs) are not fully supported - content may be incomplete
 */

import * as cheerio from 'cheerio'
import type { CrawledPage, CrawlResult } from './types'
import { WEBSITE_CRAWL_DEFAULTS } from '../../config/knowledge.defaults'
import { htmlToMarkdownClean } from './html-to-markdown'

/**
 * Discovery result for a website
 */
export interface DiscoveryResult {
  startUrl: string
  pages: Array<{ url: string; title: string }>
  failed: Array<{ url: string; error: string }>
  stats: {
    totalDiscovered: number
    durationMs: number
  }
}

/**
 * Website crawler implementation
 */
export class WebsiteCrawler {
  private readonly config = WEBSITE_CRAWL_DEFAULTS

  /**
   * Discover all pages of a website without extracting full content
   * This is a fast operation that only fetches page titles and links
   * @param startUrl - Starting URL to discover
   * @param onProgress - Optional callback for progress updates
   * @returns Discovery result with all found pages
   */
  async discoverPages(
    startUrl: string,
    onProgress?: (discovered: number, queue: number) => void
  ): Promise<DiscoveryResult> {
    const startTime = Date.now()
    const baseUrl = this.getBaseUrl(startUrl)

    const discovered = new Set<string>([this.normalizeUrl(startUrl)])
    const pages: Array<{ url: string; title: string }> = []
    const failed: Array<{ url: string; error: string }> = []
    const queue: string[] = [startUrl]

    console.log(`[WebsiteCrawler] Starting discovery of ${baseUrl}`)

    console.log(`[WebsiteCrawler] Discovery loop starting. maxPages: ${this.config.maxPages}`)

    while (queue.length > 0 && pages.length < this.config.maxPages) {
      // Process multiple URLs in parallel for faster discovery
      // Limit batch size to not exceed maxPages
      const remainingSlots = this.config.maxPages - pages.length
      const batch = queue.splice(0, Math.min(5, queue.length, remainingSlots))

      console.log(`[WebsiteCrawler] Processing batch of ${batch.length} URLs. pages: ${pages.length}, queue: ${queue.length}`)

      const results = await Promise.allSettled(
        batch.map(url => this.discoverPage(url, baseUrl))
      )

      for (let i = 0; i < results.length; i++) {
        const url = batch[i]!
        const result = results[i]!

        if (result.status === 'fulfilled' && result.value) {
          const { title, links } = result.value
          pages.push({ url, title })

          // Add new links to queue (only if we haven't reached maxPages yet)
          let newLinksAdded = 0
          for (const link of links) {
            const normalizedLink = this.normalizeUrl(link)
            if (!discovered.has(normalizedLink) && this.isSameDomain(link, baseUrl)) {
              discovered.add(normalizedLink)
              newLinksAdded++
              // Always add to queue - we'll stop processing when pages.length reaches maxPages
              queue.push(link)
            }
          }
          console.log(`[WebsiteCrawler] Page ${url}: ${links.length} links found, ${newLinksAdded} new added to queue`)
        } else if (result.status === 'rejected') {
          const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error'
          failed.push({ url, error: errorMessage })
          console.log(`[WebsiteCrawler] Page ${url} failed: ${errorMessage}`)
        }
      }

      // Report progress
      if (onProgress) {
        onProgress(pages.length, queue.length)
      }

      console.log(`[WebsiteCrawler] Discovered ${pages.length} pages, ${queue.length} in queue, ${discovered.size} URLs seen`)

      // Small delay to be respectful to servers
      await this.delay(100)
    }

    console.log(`[WebsiteCrawler] Discovery loop ended. Final: pages=${pages.length}, queue=${queue.length}, discovered=${discovered.size}`)

    const durationMs = Date.now() - startTime

    console.log(`[WebsiteCrawler] Discovery completed: ${pages.length} pages in ${durationMs}ms`)

    return {
      startUrl,
      pages,
      failed,
      stats: {
        totalDiscovered: pages.length,
        durationMs,
      },
    }
  }

  /**
   * Discover a single page - fetch only title and links (fast)
   * @param url - Page URL
   * @param baseUrl - Base URL for relative link resolution
   * @returns Page title and links, or null if failed
   */
  private async discoverPage(
    url: string,
    baseUrl: string
  ): Promise<{ title: string; links: string[] } | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout for discovery

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
        redirect: 'follow',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.log(`[WebsiteCrawler] discoverPage failed for ${url}: ${response.status}`)
        return null
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        console.log(`[WebsiteCrawler] discoverPage skipping non-HTML ${url}: ${contentType}`)
        return null
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract title
      const title = $('title').text().trim() || url

      // Extract links
      const links = this.extractLinks($, url, baseUrl)

      console.log(`[WebsiteCrawler] discoverPage ${url}: found ${links.length} links, title: "${title.substring(0, 50)}"`)

      return { title, links }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Crawl specific pages in parallel with content extraction
   * @param urls - URLs to crawl
   * @param onProgress - Optional callback for progress updates
   * @returns Crawl result with all pages
   */
  async crawlPages(
    urls: string[],
    onProgress?: (crawled: number, total: number) => void
  ): Promise<CrawlResult> {
    const startTime = Date.now()
    const baseUrl = urls.length > 0 ? this.getBaseUrl(urls[0]!) : ''

    const pages: CrawledPage[] = []
    const failed: Array<{ url: string; error: string }> = []

    console.log(`[WebsiteCrawler] Starting parallel crawl of ${urls.length} pages`)

    // Process in batches of 5 for parallel crawling
    const batchSize = 5
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)

      const results = await Promise.allSettled(
        batch.map(url => this.crawlPage(url, baseUrl))
      )

      for (let j = 0; j < results.length; j++) {
        const url = batch[j]!
        const result = results[j]!

        if (result.status === 'fulfilled' && result.value) {
          pages.push(result.value)
        } else {
          const errorMessage = result.status === 'rejected'
            ? (result.reason instanceof Error ? result.reason.message : 'Unknown error')
            : 'No content extracted'
          failed.push({ url, error: errorMessage })
        }
      }

      // Report progress
      if (onProgress) {
        onProgress(pages.length + failed.length, urls.length)
      }

      console.log(`[WebsiteCrawler] Crawled ${pages.length + failed.length}/${urls.length} pages`)

      // Small delay between batches
      if (i + batchSize < urls.length) {
        await this.delay(200)
      }
    }

    const durationMs = Date.now() - startTime

    console.log(`[WebsiteCrawler] Parallel crawl completed: ${pages.length} pages in ${durationMs}ms`)

    return {
      startUrl: urls[0] || '',
      pages,
      failed,
      stats: {
        totalDiscovered: urls.length,
        totalCrawled: pages.length,
        totalFailed: failed.length,
        durationMs,
      },
    }
  }

  /**
   * Crawl all pages of a website starting from the given URL
   * @param startUrl - Starting URL to crawl
   * @param onProgress - Optional callback for progress updates
   * @returns Crawl result with all pages and statistics
   */
  async crawl(
    startUrl: string,
    onProgress?: (crawled: number, discovered: number) => void
  ): Promise<CrawlResult> {
    const startTime = Date.now()
    const baseUrl = this.getBaseUrl(startUrl)

    const discovered = new Set<string>([this.normalizeUrl(startUrl)])
    const crawled = new Map<string, CrawledPage>()
    const failed: { url: string; error: string }[] = []
    const queue: string[] = [startUrl]

    console.log(`[WebsiteCrawler] Starting crawl of ${baseUrl}`)

    while (queue.length > 0 && crawled.size < this.config.maxPages) {
      const url = queue.shift()!

      // Skip if already crawled
      if (crawled.has(url)) continue

      try {
        const page = await this.crawlPage(url, baseUrl)

        if (page) {
          crawled.set(url, page)

          // Add new links to queue
          for (const link of page.links) {
            const normalizedLink = this.normalizeUrl(link)
            if (!discovered.has(normalizedLink) && this.isSameDomain(link, baseUrl)) {
              discovered.add(normalizedLink)
              queue.push(link)
            }
          }

          // Report progress
          if (onProgress) {
            onProgress(crawled.size, discovered.size)
          }

          console.log(
            `[WebsiteCrawler] Crawled ${crawled.size}/${discovered.size}: ${url}`
          )
        }

        // Rate limiting delay
        await this.delay(this.config.delayBetweenRequestsMs)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        failed.push({ url, error: errorMessage })
        console.error(`[WebsiteCrawler] Failed to crawl ${url}: ${errorMessage}`)
      }
    }

    const durationMs = Date.now() - startTime

    console.log(
      `[WebsiteCrawler] Completed: ${crawled.size} pages in ${durationMs}ms`
    )

    return {
      startUrl,
      pages: Array.from(crawled.values()),
      failed,
      stats: {
        totalDiscovered: discovered.size,
        totalCrawled: crawled.size,
        totalFailed: failed.length,
        durationMs,
      },
    }
  }

  /**
   * Crawl a single page
   * @param url - Page URL
   * @param baseUrl - Base URL for relative link resolution
   * @returns Crawled page or null if failed
   */
  private async crawlPage(url: string, baseUrl: string): Promise<CrawledPage | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeoutMs)

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
        redirect: 'follow',
      })

      clearTimeout(timeoutId)

      console.log(`[WebsiteCrawler] Response for ${url}: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        console.log(`[WebsiteCrawler] Non-OK response for ${url}: ${response.status}`)
        return null
      }

      const contentType = response.headers.get('content-type') || ''
      console.log(`[WebsiteCrawler] Content-Type for ${url}: ${contentType}`)

      // Only process HTML pages
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        console.log(`[WebsiteCrawler] Skipping non-HTML content: ${contentType}`)
        return null
      }

      // Check content size
      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > this.config.maxContentSizeBytes) {
        return null
      }

      const html = await response.text()

      // Parse HTML
      const $ = cheerio.load(html)

      // Extract title
      const title = $('title').text().trim() || url

      // Try to find main content area for better markdown conversion
      let contentHtml = ''
      const mainSelectors = ['main', 'article', '.content', '.main-content', '#content', '#main']

      for (const selector of mainSelectors) {
        const main = $(selector)
        if (main.length > 0) {
          contentHtml = main.html() || ''
          break
        }
      }

      // Fallback to body if no main content found
      if (!contentHtml) {
        // Remove non-content elements before extracting body
        $('script, style, nav, footer, header, aside, .sidebar, .navigation, .menu, .ad, .advertisement, .cookie-banner, .popup').remove()
        contentHtml = $('body').html() || ''
      }

      // Convert HTML to Markdown
      const content = htmlToMarkdownClean(contentHtml, {
        removeNavigation: true,
        removeFooter: true,
        minContentLength: 50,
      })

      console.log(`[WebsiteCrawler] Extracted markdown for ${url}: ${content.length} chars, title: "${title}"`)

      // Extract links
      const links = this.extractLinks($, url, baseUrl)

      return {
        url,
        title,
        content,
        links,
        statusCode: response.status,
        contentType,
        crawledAt: new Date().toISOString(),
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Extract valid links from a page
   * @param $ - Cheerio instance
   * @param currentUrl - Current page URL
   * @param baseUrl - Base URL for relative resolution
   * @returns Array of absolute URLs
   */
  private extractLinks(
    $: cheerio.CheerioAPI,
    currentUrl: string,
    baseUrl: string
  ): string[] {
    const links: string[] = []
    const seen = new Set<string>()
    let totalAnchors = 0
    let skippedExternal = 0

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href')
      if (!href) return

      totalAnchors++

      try {
        // Skip anchors, javascript, mailto, tel links
        if (
          href.startsWith('#') ||
          href.startsWith('javascript:') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:')
        ) {
          return
        }

        // Resolve relative URLs
        const absoluteUrl = new URL(href, currentUrl).href

        // Remove hash and normalize
        const cleanUrl = absoluteUrl.split('#')[0]
        if (!cleanUrl) return

        const normalizedUrl = this.normalizeUrl(cleanUrl)

        // Skip duplicates and external links
        if (!seen.has(normalizedUrl) && this.isSameDomain(cleanUrl, baseUrl)) {
          seen.add(normalizedUrl)
          links.push(cleanUrl)
        } else if (!this.isSameDomain(cleanUrl, baseUrl)) {
          skippedExternal++
        }
      } catch {
        // Invalid URL, skip
      }
    })

    console.log(`[WebsiteCrawler] extractLinks from ${currentUrl}: ${totalAnchors} anchors, ${links.length} same-domain, ${skippedExternal} external`)

    return links
  }

  /**
   * Get base URL (protocol + hostname) from a URL
   * @param url - Full URL
   * @returns Base URL
   */
  private getBaseUrl(url: string): string {
    try {
      const parsed = new URL(url)
      return `${parsed.protocol}//${parsed.hostname}`
    } catch {
      return url
    }
  }

  /**
   * Normalize URL for comparison
   * @param url - URL to normalize
   * @returns Normalized URL
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      // Remove trailing slash, lowercase hostname
      let path = parsed.pathname.replace(/\/+$/, '') || '/'
      return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}${parsed.search}`
    } catch {
      return url.toLowerCase()
    }
  }

  /**
   * Check if URL is on the same domain as base
   * @param url - URL to check
   * @param baseUrl - Base URL
   * @returns True if same domain
   */
  private isSameDomain(url: string, baseUrl: string): boolean {
    try {
      const urlHostname = new URL(url).hostname.toLowerCase()
      const baseHostname = new URL(baseUrl).hostname.toLowerCase()

      // Allow same domain and subdomains
      return urlHostname === baseHostname || urlHostname.endsWith(`.${baseHostname}`)
    } catch {
      return false
    }
  }

  /**
   * Delay execution
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/** Singleton website crawler instance */
export const websiteCrawler = new WebsiteCrawler()
