import { eq, and, isNull, desc } from 'drizzle-orm'
import { db } from '../../index'
import {
  builderMessages,
  type BuilderMessage,
  type InsertBuilderMessage,
} from '../../schema'

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
