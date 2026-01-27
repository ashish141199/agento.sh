/**
 * Builder Messages Database Module
 * Handles persistence of Agent Builder chat messages
 * @module db/modules/builder/builder.db
 */

import { eq, and, isNull, desc } from 'drizzle-orm'
import { db } from '../../index'
import {
  builderMessages,
  type BuilderMessage,
  type InsertBuilderMessage,
  type MessagePart,
} from '../../schema'

// Re-export MessagePart for use in routes
export type { MessagePart }

/**
 * UIMessage structure from Vercel AI SDK
 * Represents a message in the chat interface
 */
export interface UIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content?: string
  parts?: Array<{ type: string; text?: string; [key: string]: unknown }>
}

/**
 * Find builder messages by agent ID
 * @param agentId - The agent ID
 * @returns Array of messages ordered by creation time
 */
export async function findBuilderMessagesByAgentId(
  agentId: string
): Promise<BuilderMessage[]> {
  return db
    .select()
    .from(builderMessages)
    .where(eq(builderMessages.agentId, agentId))
    .orderBy(builderMessages.createdAt)
}

/**
 * Find builder messages for a user without an agent (new agent creation)
 * @param userId - The user ID
 * @returns Array of messages ordered by creation time
 */
export async function findBuilderMessagesWithoutAgent(
  userId: string
): Promise<BuilderMessage[]> {
  return db
    .select()
    .from(builderMessages)
    .where(
      and(
        eq(builderMessages.userId, userId),
        isNull(builderMessages.agentId)
      )
    )
    .orderBy(builderMessages.createdAt)
}

/**
 * Create a new builder message
 * @param data - The message data
 * @returns The created message
 */
export async function createBuilderMessage(
  data: InsertBuilderMessage
): Promise<BuilderMessage> {
  const result = await db
    .insert(builderMessages)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Link orphan builder messages to an agent
 * Updates all messages for a user without an agentId to link them to the newly created agent
 * @param userId - The user ID
 * @param agentId - The agent ID to link to
 * @returns Number of messages updated
 */
export async function linkBuilderMessagesToAgent(
  userId: string,
  agentId: string
): Promise<number> {
  const result = await db
    .update(builderMessages)
    .set({ agentId })
    .where(
      and(
        eq(builderMessages.userId, userId),
        isNull(builderMessages.agentId)
      )
    )
    .returning()
  return result.length
}

/**
 * Delete builder messages for an agent
 * @param agentId - The agent ID
 * @returns Number of messages deleted
 */
export async function deleteBuilderMessagesByAgentId(
  agentId: string
): Promise<number> {
  const result = await db
    .delete(builderMessages)
    .where(eq(builderMessages.agentId, agentId))
    .returning()
  return result.length
}

/**
 * Delete orphan builder messages for a user (messages without an agent)
 * @param userId - The user ID
 * @returns Number of messages deleted
 */
export async function deleteOrphanBuilderMessages(
  userId: string
): Promise<number> {
  const result = await db
    .delete(builderMessages)
    .where(
      and(
        eq(builderMessages.userId, userId),
        isNull(builderMessages.agentId)
      )
    )
    .returning()
  return result.length
}

/**
 * Get builder messages for a user/agent context
 * Returns messages for the given agent, or orphan messages if no agentId
 * @param userId - The user ID
 * @param agentId - The agent ID (optional)
 * @returns Array of messages
 */
export async function getBuilderMessages(
  userId: string,
  agentId?: string | null
): Promise<BuilderMessage[]> {
  if (agentId) {
    return findBuilderMessagesByAgentId(agentId)
  }
  return findBuilderMessagesWithoutAgent(userId)
}

/**
 * Get message history for AI in UIMessage format
 * Fetches the last N messages for context
 * @param userId - The user ID
 * @param agentId - The agent ID (optional)
 * @param limit - Maximum number of messages to fetch (default 20)
 * @returns Array of UIMessages for AI SDK
 */
export async function getMessageHistoryForAI(
  userId: string,
  agentId: string | null,
  limit = 20
): Promise<UIMessage[]> {
  // Build the query based on whether we have an agentId
  const whereClause = agentId
    ? eq(builderMessages.agentId, agentId)
    : and(
        eq(builderMessages.userId, userId),
        isNull(builderMessages.agentId)
      )

  // Fetch messages ordered by createdAt descending (newest first), then reverse
  const messages = await db
    .select()
    .from(builderMessages)
    .where(whereClause)
    .orderBy(desc(builderMessages.createdAt))
    .limit(limit)

  // Reverse to get chronological order (oldest first)
  const chronologicalMessages = messages.reverse()

  // Convert to UIMessage format
  return chronologicalMessages.map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    parts: Array.isArray(msg.parts) ? msg.parts : undefined,
  }))
}

/**
 * Save a user message to the database
 * @param userId - The user ID
 * @param agentId - The agent ID (optional)
 * @param content - The message content
 * @returns The created message
 */
export async function saveUserMessage(
  userId: string,
  agentId: string | null,
  content: string
): Promise<BuilderMessage> {
  const result = await db
    .insert(builderMessages)
    .values({
      userId,
      agentId,
      role: 'user',
      content,
      parts: [{ type: 'text', text: content }],
    })
    .returning()
  return result[0]!
}

/**
 * Save tool results as a user message to the database
 * Used when continuing after askUser or other human-in-the-loop tools
 * @param userId - The user ID
 * @param agentId - The agent ID (optional)
 * @param toolResults - Array of tool results to save
 * @returns The created message
 */
export async function saveToolResultMessage(
  userId: string,
  agentId: string | null,
  toolResults: Array<{ toolCallId: string; toolName: string; result: unknown }>
): Promise<BuilderMessage> {
  const parts: MessagePart[] = toolResults.map(tr => ({
    type: 'tool-result',
    toolCallId: tr.toolCallId,
    toolName: tr.toolName,
    result: tr.result,
  }))

  const result = await db
    .insert(builderMessages)
    .values({
      userId,
      agentId,
      role: 'user',
      content: '', // Tool results don't have text content
      parts,
    })
    .returning()
  return result[0]!
}

/**
 * Save an assistant message to the database
 * @param userId - The user ID
 * @param agentId - The agent ID (optional)
 * @param content - The text content
 * @param parts - The message parts (including tool calls, etc.)
 * @returns The created message
 */
export async function saveAssistantMessage(
  userId: string,
  agentId: string | null,
  content: string,
  parts: MessagePart[]
): Promise<BuilderMessage> {
  const result = await db
    .insert(builderMessages)
    .values({
      userId,
      agentId,
      role: 'assistant',
      content,
      parts: parts.length > 0 ? parts : null,
    })
    .returning()
  return result[0]!
}

/**
 * Update an assistant message (e.g., after tool calls complete)
 * @param messageId - The message ID to update
 * @param content - The updated text content
 * @param parts - The updated message parts
 * @returns The updated message
 */
export async function updateAssistantMessage(
  messageId: string,
  content: string,
  parts: MessagePart[]
): Promise<BuilderMessage> {
  const result = await db
    .update(builderMessages)
    .set({
      content,
      parts: parts.length > 0 ? parts : null,
    })
    .where(eq(builderMessages.id, messageId))
    .returning()
  return result[0]!
}

