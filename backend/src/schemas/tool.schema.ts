import { z } from 'zod'

/**
 * API Connector authentication schema
 */
export const apiConnectorAuthSchema = z.object({
  type: z.enum(['none', 'bearer', 'api_key', 'basic']),
  token: z.string().optional(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
})

/**
 * API Connector config schema
 */
export const apiConnectorConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  url: z.string().url('Invalid URL'),
  headers: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional(),
  body: z.string().optional(),
  authentication: apiConnectorAuthSchema.optional(),
})

/**
 * Schema for creating a tool
 */
export const createToolSchema = z.object({
  type: z.enum(['api_connector']).default('api_connector'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  enabled: z.boolean().default(true),
  config: apiConnectorConfigSchema,
})

/**
 * Schema for updating a tool
 */
export const updateToolSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  enabled: z.boolean().optional(),
  config: apiConnectorConfigSchema.optional(),
})

/**
 * Schema for assigning a tool to an agent
 */
export const assignToolSchema = z.object({
  toolId: z.string().uuid('Invalid tool ID'),
  enabled: z.boolean().default(true),
})

/**
 * Schema for updating an agent-tool assignment
 */
export const updateAgentToolSchema = z.object({
  enabled: z.boolean(),
})

/**
 * Type exports
 */
export type ApiConnectorAuth = z.infer<typeof apiConnectorAuthSchema>
export type ApiConnectorConfig = z.infer<typeof apiConnectorConfigSchema>
export type CreateToolInput = z.infer<typeof createToolSchema>
export type UpdateToolInput = z.infer<typeof updateToolSchema>
export type AssignToolInput = z.infer<typeof assignToolSchema>
export type UpdateAgentToolInput = z.infer<typeof updateAgentToolSchema>
