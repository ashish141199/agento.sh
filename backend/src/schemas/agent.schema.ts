import { z } from 'zod'

/**
 * Schema for creating an agent
 */
export const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  model: z.string().default('auto'),
})

/**
 * Schema for updating an agent
 */
export const updateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  model: z.string().optional(),
})

/**
 * Schema for listing agents with search/sort
 */
export const listAgentsSchema = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

/**
 * Type exports
 */
export type CreateAgentInput = z.infer<typeof createAgentSchema>
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>
export type ListAgentsInput = z.infer<typeof listAgentsSchema>
