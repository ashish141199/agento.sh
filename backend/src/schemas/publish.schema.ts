import { z } from 'zod'
import { DEFAULT_EMBED_POSITION, DEFAULT_EMBED_THEME, DEFAULT_EMBED_ALLOWED_DOMAINS } from '../config/defaults'

/**
 * Domain validation - extracts and validates core domain (no protocol, no www, no path)
 */
const domainSchema = z.string()
  .min(1)
  .max(253)
  .transform((val) => {
    // Remove protocol if present
    let domain = val.replace(/^https?:\/\//, '')
    // Remove www. prefix
    domain = domain.replace(/^www\./, '')
    // Remove path and query string (split always returns at least one element)
    domain = domain.split('/')[0]!.split('?')[0]!
    // Remove port
    domain = domain.split(':')[0]!
    return domain.toLowerCase()
  })
  .refine((val) => {
    // Basic domain format validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/
    return domainRegex.test(val)
  }, { message: 'Invalid domain format' })

/**
 * Embed config schema
 */
export const embedConfigSchema = z.object({
  position: z.enum(['expanded', 'widget']).default(DEFAULT_EMBED_POSITION),
  theme: z.enum(['light', 'dark']).default(DEFAULT_EMBED_THEME),
  allowedDomains: z.array(domainSchema).default(DEFAULT_EMBED_ALLOWED_DOMAINS),
})

/**
 * Update embed config schema
 */
export const updateEmbedConfigSchema = embedConfigSchema.partial()

/**
 * Type exports
 */
export type EmbedConfig = z.infer<typeof embedConfigSchema>
export type UpdateEmbedConfigInput = z.infer<typeof updateEmbedConfigSchema>
