/**
 * HTML to Markdown converter
 * Converts HTML content to clean Markdown for better chunking
 */

import TurndownService from 'turndown'

/**
 * Create a configured Turndown instance for HTML to Markdown conversion
 */
function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: 'atx', // Use # style headings
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  })

  // Remove script and style tags completely
  turndown.remove(['script', 'style', 'noscript', 'iframe', 'svg'])

  // Keep important structural elements
  turndown.addRule('preserveLineBreaks', {
    filter: 'br',
    replacement: () => '\n',
  })

  // Handle buttons as text
  turndown.addRule('buttons', {
    filter: 'button',
    replacement: (content) => content ? `[${content.trim()}]` : '',
  })

  // Handle navigation as simple list
  turndown.addRule('nav', {
    filter: 'nav',
    replacement: () => '', // Remove navigation entirely
  })

  // Handle footer
  turndown.addRule('footer', {
    filter: 'footer',
    replacement: () => '', // Remove footer
  })

  // Handle header
  turndown.addRule('header', {
    filter: 'header',
    replacement: (content) => content + '\n\n',
  })

  // Handle aside (sidebars)
  turndown.addRule('aside', {
    filter: 'aside',
    replacement: () => '', // Remove sidebars
  })

  // Handle figures with captions
  turndown.addRule('figure', {
    filter: 'figure',
    replacement: (content, node) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const figcaption = (node as any).querySelector?.('figcaption')
      if (figcaption) {
        return `\n\n*${figcaption.textContent?.trim() || ''}*\n\n`
      }
      return content
    },
  })

  // Handle definition lists
  turndown.addRule('definitionList', {
    filter: 'dl',
    replacement: (content) => '\n\n' + content + '\n\n',
  })

  turndown.addRule('definitionTerm', {
    filter: 'dt',
    replacement: (content) => `**${content.trim()}**\n`,
  })

  turndown.addRule('definitionDescription', {
    filter: 'dd',
    replacement: (content) => `: ${content.trim()}\n\n`,
  })

  return turndown
}

// Singleton instance
const turndownService = createTurndownService()

/**
 * Convert HTML to Markdown
 * @param html - HTML content to convert
 * @returns Clean Markdown content
 */
export function htmlToMarkdown(html: string): string {
  // Convert to markdown
  let markdown = turndownService.turndown(html)

  // Clean up the output
  markdown = markdown
    // Remove excessive blank lines (more than 2)
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove trailing whitespace from lines
    .replace(/[ \t]+$/gm, '')
    // Remove leading/trailing whitespace
    .trim()

  return markdown
}

/**
 * Convert HTML to Markdown with additional cleaning for website content
 * @param html - HTML content
 * @param options - Cleaning options
 * @returns Clean Markdown content
 */
export function htmlToMarkdownClean(
  html: string,
  options?: {
    removeNavigation?: boolean
    removeFooter?: boolean
    minContentLength?: number
  }
): string {
  const markdown = htmlToMarkdown(html)

  // Additional cleaning for website content
  let cleaned = markdown

  // Remove common boilerplate patterns
  cleaned = cleaned
    // Remove cookie consent text
    .replace(/cookie[s]?\s*(policy|consent|notice|settings)[^\n]*/gi, '')
    // Remove "skip to content" links
    .replace(/skip to (main )?content/gi, '')
    // Remove social media share prompts
    .replace(/share (this|on)[^\n]*/gi, '')
    // Remove "read more" standalone links
    .replace(/^\s*\[?read more\]?\s*$/gim, '')
    // Remove empty links
    .replace(/\[\s*\]\([^)]*\)/g, '')
    // Remove empty headings
    .replace(/^#{1,6}\s*$/gm, '')
    // Clean up multiple blank lines again
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()

  // Check minimum content length
  if (options?.minContentLength && cleaned.length < options.minContentLength) {
    return ''
  }

  return cleaned
}
