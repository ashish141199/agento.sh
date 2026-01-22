import { z } from 'zod'
import type { ToolInput as DbToolInput, ToolInputSchema as DbToolInputSchema } from '../db/schema/tools'

/**
 * Tool input types
 */
export const toolInputTypeSchema = z.enum(['text', 'number', 'boolean', 'list', 'object'])

/**
 * Base tool input schema (without recursive properties)
 */
const baseToolInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long').regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Name must start with a letter and contain only letters, numbers, and underscores'),
  description: z.string().min(1, 'Description is required').max(200, 'Description too long'),
  type: toolInputTypeSchema,
  required: z.boolean().default(false),
  default: z.any().optional(),
  listItemType: toolInputTypeSchema.optional(),
})

/**
 * Tool input schema (recursive for nested objects/lists)
 * Uses database types for proper recursive type inference
 */
export const toolInputSchema: z.ZodType<DbToolInput> = baseToolInputSchema.extend({
  listItemProperties: z.lazy(() => z.array(toolInputSchema)).optional(),
  properties: z.lazy(() => z.array(toolInputSchema)).optional(),
}) as z.ZodType<DbToolInput>

/**
 * Tool input schema definition
 */
export const toolInputSchemaSchema = z.object({
  inputs: z.array(toolInputSchema).default([]),
})

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
 * Key-value pair schema for headers and query params
 */
const keyValuePairSchema = z.object({
  key: z.string(),
  value: z.string(),
})

/**
 * API Connector config schema
 * Supports {{inputName}} interpolation in url, headers, queryParams, and body
 */
export const apiConnectorConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  url: z.string().min(1, 'URL is required'),
  headers: z.array(keyValuePairSchema).optional(),
  queryParams: z.array(keyValuePairSchema).optional(),
  body: z.string().optional(),
  authentication: apiConnectorAuthSchema.optional(),
})

/**
 * MCP Connector config schema
 */
export const mcpConnectorConfigSchema = z.object({
  serverUrl: z.string().url('Invalid MCP server URL'),
  selectedTools: z.array(z.string()).optional(),
  authentication: z.object({
    type: z.enum(['none', 'bearer', 'oauth2']),
    token: z.string().optional(),
  }).optional(),
})

/**
 * Tool config schema (union of all tool types)
 */
export const toolConfigSchema = z.union([apiConnectorConfigSchema, mcpConnectorConfigSchema])

/**
 * Schema for creating a tool (Step 1 - basic info + inputs)
 */
export const createToolSchema = z.object({
  type: z.enum(['api_connector', 'mcp_connector']).default('api_connector'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  enabled: z.boolean().default(true),
  inputSchema: toolInputSchemaSchema.optional(),
  config: toolConfigSchema.nullable().optional(),
})

/**
 * Schema for updating a tool
 */
export const updateToolSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  enabled: z.boolean().optional(),
  inputSchema: toolInputSchemaSchema.optional(),
  config: toolConfigSchema.nullable().optional(),
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
export type ToolInputType = z.infer<typeof toolInputTypeSchema>
export type ToolInput = z.infer<typeof toolInputSchema>
export type ToolInputSchema = z.infer<typeof toolInputSchemaSchema>
export type ApiConnectorAuth = z.infer<typeof apiConnectorAuthSchema>
export type ApiConnectorConfig = z.infer<typeof apiConnectorConfigSchema>
export type McpConnectorConfig = z.infer<typeof mcpConnectorConfigSchema>
export type ToolConfig = z.infer<typeof toolConfigSchema>
export type CreateToolInput = z.infer<typeof createToolSchema>
export type UpdateToolInput = z.infer<typeof updateToolSchema>
export type AssignToolInput = z.infer<typeof assignToolSchema>
export type UpdateAgentToolInput = z.infer<typeof updateAgentToolSchema>
