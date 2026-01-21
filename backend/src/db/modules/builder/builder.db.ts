import { eq, and, isNull, desc, inArray } from 'drizzle-orm'
import { db } from '../../index'
import {
  builderMessages,
  type BuilderMessage,
  type InsertBuilderMessage,
  type MessagePart,
} from '../../schema'

/**
 * UIMessage structure from Vercel AI SDK
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
 * Save complete conversation state
 * Replaces all existing messages with the new ones
 * This follows the AI SDK's recommended pattern for message persistence
 * @param userId - The user ID
 * @param agentId - The agent ID (optional, but may have changed during conversation)
 * @param messages - Complete UIMessage array from AI SDK
 */
export async function saveBuilderConversation(
  userId: string,
  agentId: string | null,
  messages: UIMessage[]
): Promise<void> {
  // Delete existing messages for this context
  // We need to handle both:
  // 1. Messages with the current agentId (if set)
  // 2. Orphan messages (agentId is null) - for when an agent was just created
  if (agentId) {
    // Delete messages for this agent
    await db
      .delete(builderMessages)
      .where(eq(builderMessages.agentId, agentId))
    // Also delete any orphan messages for this user (conversation that created this agent)
    await db
      .delete(builderMessages)
      .where(
        and(
          eq(builderMessages.userId, userId),
          isNull(builderMessages.agentId)
        )
      )
  } else {
    // No agent yet, just delete orphan messages
    await db
      .delete(builderMessages)
      .where(
        and(
          eq(builderMessages.userId, userId),
          isNull(builderMessages.agentId)
        )
      )
  }

  // Insert all messages with their parts
  if (messages.length > 0) {
    const messagesToInsert: InsertBuilderMessage[] = messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => {
        // Extract text content for the content field
        let textContent = ''
        const parts: MessagePart[] = []

        if (msg.parts) {
          for (const part of msg.parts) {
            if (part.type === 'text' && part.text) {
              textContent = part.text
              parts.push({ type: 'text', text: part.text })
            } else {
              // Store tool call parts with all their data
              parts.push({
                type: part.type,
                toolCallId: part.toolCallId as string | undefined,
                toolName: part.toolName as string | undefined,
                state: part.state as string | undefined,
                input: part.input,
                output: part.output,
              })
            }
          }
        }

        return {
          id: msg.id,
          userId,
          agentId,
          role: msg.role as 'user' | 'assistant',
          content: textContent || msg.content || '',
          parts: parts.length > 0 ? parts : null,
        }
      })

    if (messagesToInsert.length > 0) {
      await db.insert(builderMessages).values(messagesToInsert)
    }
  }
}
