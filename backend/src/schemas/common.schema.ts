import { z } from 'zod'

/**
 * Common UUID schema for ID validation
 */
export const idSchema = z.string().uuid('Invalid ID format')

/**
 * Common pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

/**
 * Standard API response schema
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema.optional(),
  })

/**
 * Type exports
 */
export type PaginationInput = z.infer<typeof paginationSchema>
