import { z } from 'zod'
import {
  DEFAULT_INSTRUCTIONS_CONFIG,
  DEFAULT_CONVERSATION_HISTORY_LIMIT,
  DEFAULT_WELCOME_MESSAGE,
  DEFAULT_SUGGESTED_PROMPTS,
  DEFAULT_KNOWLEDGE_SETTINGS,
  MAX_CONVERSATION_HISTORY_LIMIT,
  MAX_INSTRUCTIONS_LENGTH,
  MAX_WELCOME_MESSAGE_LENGTH,
  MAX_SUGGESTED_PROMPT_LENGTH,
  MAX_SUGGESTED_PROMPTS_COUNT,
} from '../config/defaults'

/**
 * Instructions config schema
 */
export const instructionsConfigSchema = z.object({
  whatDoesAgentDo: z.string().max(MAX_INSTRUCTIONS_LENGTH, 'Answer too long').default(DEFAULT_INSTRUCTIONS_CONFIG.whatDoesAgentDo),
  howShouldItSpeak: z.string().max(MAX_INSTRUCTIONS_LENGTH, 'Answer too long').default(DEFAULT_INSTRUCTIONS_CONFIG.howShouldItSpeak),
  whatShouldItNeverDo: z.string().max(MAX_INSTRUCTIONS_LENGTH, 'Answer too long').default(DEFAULT_INSTRUCTIONS_CONFIG.whatShouldItNeverDo),
  anythingElse: z.string().max(MAX_INSTRUCTIONS_LENGTH, 'Answer too long').default(DEFAULT_INSTRUCTIONS_CONFIG.anythingElse),
})

/**
 * Knowledge settings schema
 */
export const knowledgeSettingsSchema = z.object({
  enabled: z.boolean().default(DEFAULT_KNOWLEDGE_SETTINGS.enabled),
  mode: z.enum(['tool', 'auto_inject']).default(DEFAULT_KNOWLEDGE_SETTINGS.mode),
  topK: z.number().min(1).max(20).default(DEFAULT_KNOWLEDGE_SETTINGS.topK),
  similarityThreshold: z.number().min(0).max(1).default(DEFAULT_KNOWLEDGE_SETTINGS.similarityThreshold),
})

/**
 * Agent settings schema
 */
export const agentSettingsSchema = z.object({
  memory: z.object({
    conversationHistoryLimit: z.number().min(1).max(MAX_CONVERSATION_HISTORY_LIMIT).default(DEFAULT_CONVERSATION_HISTORY_LIMIT),
  }),
  chat: z.object({
    welcomeMessage: z.string().max(MAX_WELCOME_MESSAGE_LENGTH, 'Welcome message too long').default(DEFAULT_WELCOME_MESSAGE),
    suggestedPrompts: z.array(z.string().max(MAX_SUGGESTED_PROMPT_LENGTH, 'Prompt too long')).max(MAX_SUGGESTED_PROMPTS_COUNT).default(DEFAULT_SUGGESTED_PROMPTS),
  }),
  knowledge: knowledgeSettingsSchema.optional(),
})

/**
 * Schema for creating an agent
 */
export const createAgentSchema = z.object({
  name: z.string().max(100, 'Name too long').optional().default(''),
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
export type KnowledgeSettings = z.infer<typeof knowledgeSettingsSchema>
export type AgentSettings = z.infer<typeof agentSettingsSchema>
export type ListAgentsInput = z.infer<typeof listAgentsSchema>
