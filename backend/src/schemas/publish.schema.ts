import { z } from 'zod'
import { DEFAULT_EMBED_POSITION, DEFAULT_EMBED_THEME } from '../config/defaults'

/**
 * Embed config schema
 */
export const embedConfigSchema = z.object({
  position: z.enum(['fullscreen', 'bottom-right', 'bottom-left', 'top-right', 'top-left']).default(DEFAULT_EMBED_POSITION),
  theme: z.enum(['light', 'dark']).default(DEFAULT_EMBED_THEME),
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
