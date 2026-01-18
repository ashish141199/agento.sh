import { z } from 'zod'

/**
 * Embed config schema
 */
export const embedConfigSchema = z.object({
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).default('bottom-right'),
  theme: z.enum(['light', 'dark']).default('light'),
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
