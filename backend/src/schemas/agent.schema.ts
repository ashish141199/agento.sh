import { z } from 'zod'

/**
 * Instructions config schema
 */
export const instructionsConfigSchema = z.object({
  whatDoesAgentDo: z.string().max(2000, 'Answer too long').default(''),
  howShouldItSpeak: z.string().max(2000, 'Answer too long').default(''),
  whatShouldItNeverDo: z.string().max(2000, 'Answer too long').default(''),
  anythingElse: z.string().max(2000, 'Answer too long').default(''),
})

/**
 * Agent settings schema
 */
export const agentSettingsSchema = z.object({
  memory: z.object({
    conversationHistoryLimit: z.number().min(1).max(100).default(10),
  }),
  chat: z.object({
    welcomeMessage: z.string().max(500, 'Welcome message too long').default(''),
    suggestedPrompts: z.array(z.string().max(200, 'Prompt too long')).max(10).default([]),
  }),
})

/**
 * Schema for creating an agent
 */
export const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  modelId: z.string().uuid('Invalid model ID').optional(),
})

/**
 * Schema for updating an agent
 */
export const updateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  modelId: z.string().uuid('Invalid model ID').optional().nullable(),
  instructionsConfig: instructionsConfigSchema.optional(),
  settings: agentSettingsSchema.optional(),
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
export type InstructionsConfig = z.infer<typeof instructionsConfigSchema>
export type AgentSettings = z.infer<typeof agentSettingsSchema>
export type ListAgentsInput = z.infer<typeof listAgentsSchema>
