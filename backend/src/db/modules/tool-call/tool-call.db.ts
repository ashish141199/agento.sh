import { eq, asc, desc } from 'drizzle-orm'
import { db } from '../../index'
import { toolCalls, type ToolCall, type InsertToolCall } from '../../schema'

/**
 * Create a new tool call log
 * @param data - The tool call data
 * @returns The created tool call
 */
export async function createToolCall(data: InsertToolCall): Promise<ToolCall> {
  const result = await db
    .insert(toolCalls)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Create multiple tool call logs
 * @param data - Array of tool call data
 * @returns The created tool calls
 */
export async function createToolCalls(data: InsertToolCall[]): Promise<ToolCall[]> {
  if (data.length === 0) return []
  const result = await db
    .insert(toolCalls)
    .values(data)
    .returning()
  return result
}

/**
 * Update a tool call with result
 * @param id - Tool call ID
 * @param data - Update data (output, status, durationMs, errorMessage)
 * @returns The updated tool call
 */
export async function updateToolCall(
  id: string,
  data: Partial<Pick<ToolCall, 'output' | 'status' | 'durationMs' | 'errorMessage'>>
): Promise<ToolCall | null> {
  const result = await db
    .update(toolCalls)
    .set(data)
    .where(eq(toolCalls.id, id))
    .returning()
  return result[0] ?? null
}

/**
 * Find all tool calls for a message
 * @param messageId - The message ID
 * @returns List of tool calls ordered by step number
 */
export async function findToolCallsByMessageId(messageId: string): Promise<ToolCall[]> {
  return db
    .select()
    .from(toolCalls)
    .where(eq(toolCalls.messageId, messageId))
    .orderBy(asc(toolCalls.stepNumber), asc(toolCalls.createdAt))
}

/**
 * Find all tool calls for an agent
 * @param agentId - The agent ID
 * @param limit - Maximum number of results (default 100)
 * @returns List of tool calls ordered by creation time descending
 */
export async function findToolCallsByAgentId(agentId: string, limit = 100): Promise<ToolCall[]> {
  return db
    .select()
    .from(toolCalls)
    .where(eq(toolCalls.agentId, agentId))
    .orderBy(desc(toolCalls.createdAt))
    .limit(limit)
}

/**
 * Find all tool calls for a conversation
 * @param conversationId - The conversation ID
 * @returns List of tool calls ordered by creation time
 */
export async function findToolCallsByConversationId(conversationId: string): Promise<ToolCall[]> {
  return db
    .select()
    .from(toolCalls)
    .where(eq(toolCalls.conversationId, conversationId))
    .orderBy(asc(toolCalls.createdAt))
}
