import { eq, asc, count } from 'drizzle-orm'
import { db } from '../../index'
import { messages, type Message, type InsertMessage } from '../../schema'

/**
 * Find all messages for an agent, ordered by creation time
 * @param agentId - The agent ID
 * @returns List of messages
 */
export async function findMessagesByAgentId(agentId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.agentId, agentId))
    .orderBy(asc(messages.createdAt))
}

/**
 * Check if an agent has any messages
 * @param agentId - The agent ID
 * @returns True if agent has messages
 */
export async function hasMessages(agentId: string): Promise<boolean> {
  const result = await db
    .select({ count: count() })
    .from(messages)
    .where(eq(messages.agentId, agentId))
  return (result[0]?.count ?? 0) > 0
}

/**
 * Create a new message
 * @param data - The message data
 * @returns The created message
 */
export async function createMessage(data: InsertMessage): Promise<Message> {
  const result = await db
    .insert(messages)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Delete all messages for an agent
 * @param agentId - The agent ID
 * @returns Number of deleted messages
 */
export async function deleteMessagesByAgentId(agentId: string): Promise<number> {
  const result = await db
    .delete(messages)
    .where(eq(messages.agentId, agentId))
    .returning()
  return result.length
}
