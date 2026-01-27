import { z } from 'zod'

/**
 * Schema for creating a builder session
 */
export const createBuilderSessionSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID').optional(),
  initialMessage: z.string().min(1, 'Message is required').max(5000, 'Message too long').optional(),
})

/**
 * Schema for tool result in builder chat
 */
export const toolResultSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  result: z.unknown(),
})

/**
 * Schema for builder chat request
 * Frontend sends only the new user message, backend fetches history from DB
 * When continuing after a tool call (e.g., askUser), toolResults should be provided
 */
export const builderChatRequestSchema = z.object({
  // Message is optional when providing tool results (continuation after tool call)
  message: z.string().max(5000, 'Message too long').optional(),
  agentId: z.string().uuid('Invalid agent ID').nullish(),
  // Tool results for continuing after askUser or other human-in-the-loop tools
  toolResults: z.array(toolResultSchema).optional(),
}).refine(
  (data) => data.message?.trim() || (data.toolResults && data.toolResults.length > 0),
  { message: 'Either message or toolResults is required' }
)

/**
 * Schema for builder tool: createOrUpdateAgent
 * Used by the AI to configure the agent
 */
export const builderCreateOrUpdateAgentSchema = z.object({
  // Identity
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),

  // Instructions
  whatDoesAgentDo: z.string().max(2000).optional(),
  howShouldItSpeak: z.string().max(2000).optional(),
  whatShouldItNeverDo: z.string().max(2000).optional(),
  anythingElse: z.string().max(2000).optional(),

  // Settings
  modelId: z.string().optional(),
  conversationHistoryLimit: z.number().min(1).max(100).optional(),
  welcomeMessage: z.string().max(500).optional(),
  suggestedPrompts: z.array(z.string().max(200)).max(10).optional(),
})

/**
 * Schema for builder tool: createTool
 * Used by the AI to create tools for the agent
 */
export const builderCreateToolSchema = z.object({
  type: z.enum(['api_connector']),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  apiConfig: z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    authentication: z.object({
      type: z.enum(['none', 'bearer', 'api_key', 'basic']),
      token: z.string().optional(),
      apiKey: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    }).optional(),
    headers: z.array(z.object({
      key: z.string(),
      value: z.string(),
    })).optional(),
    body: z.string().optional(),
  }).optional(),
})

/**
 * Schema for builder tool: updateTool
 * Used by the AI to update existing tools
 */
export const builderUpdateToolSchema = z.object({
  toolId: z.string().uuid('Invalid tool ID'),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  apiConfig: z.object({
    url: z.string().url().optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
    authentication: z.object({
      type: z.enum(['none', 'bearer', 'api_key', 'basic']),
      token: z.string().optional(),
      apiKey: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    }).optional(),
    headers: z.array(z.object({
      key: z.string(),
      value: z.string(),
    })).optional(),
    body: z.string().optional(),
  }).optional(),
})

/**
 * Schema for builder tool: deleteTool
 * Used by the AI to remove tools from the agent
 */
export const builderDeleteToolSchema = z.object({
  toolId: z.string().uuid('Invalid tool ID'),
})

/**
 * Type exports
 */
export type CreateBuilderSessionInput = z.infer<typeof createBuilderSessionSchema>
export type BuilderChatRequest = z.infer<typeof builderChatRequestSchema>
export type ToolResult = z.infer<typeof toolResultSchema>
export type BuilderCreateOrUpdateAgentInput = z.infer<typeof builderCreateOrUpdateAgentSchema>
export type BuilderCreateToolInput = z.infer<typeof builderCreateToolSchema>
export type BuilderUpdateToolInput = z.infer<typeof builderUpdateToolSchema>
export type BuilderDeleteToolInput = z.infer<typeof builderDeleteToolSchema>
