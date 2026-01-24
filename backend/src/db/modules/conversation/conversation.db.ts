import { eq, and, desc } from 'drizzle-orm'
import { db } from '../../index'
import { conversations, type Conversation, type InsertConversation } from '../../schema/conversations'
import { messages } from '../../schema/messages'

/**
 * Create a new conversation
 * @param data - Conversation data
 * @returns Created conversation
 */
export async function createConversation(data: InsertConversation): Promise<Conversation> {
  const [conversation] = await db.insert(conversations).values(data).returning()
  return conversation!
}

/**
 * Find a conversation by ID
 * @param id - Conversation ID
 * @returns Conversation or null
 */
export async function findConversationById(id: string): Promise<Conversation | null> {
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id))
  return conversation || null
}

/**
 * Find all conversations for a user and agent
 * @param agentId - Agent ID
 * @param userId - User ID
 * @returns List of conversations ordered by most recent
 */
export async function findConversationsByAgentAndUser(
  agentId: string,
  userId: string
): Promise<Conversation[]> {
  return db
    .select()
    .from(conversations)
    .where(and(eq(conversations.agentId, agentId), eq(conversations.userId, userId)))
    .orderBy(desc(conversations.updatedAt))
}

/**
 * Update conversation title
 * @param id - Conversation ID
 * @param title - New title
 * @returns Updated conversation or null
 */
export async function updateConversationTitle(
  id: string,
  title: string
): Promise<Conversation | null> {
  const [conversation] = await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning()
  return conversation || null
}

/**
 * Update conversation's updatedAt timestamp
 * @param id - Conversation ID
 * @returns Updated conversation or null
 */
export async function touchConversation(id: string): Promise<Conversation | null> {
  const [conversation] = await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning()
  return conversation || null
}

/**
 * Delete a conversation and all its messages
 * @param id - Conversation ID
 */
export async function deleteConversation(id: string): Promise<void> {
  await db.delete(conversations).where(eq(conversations.id, id))
}

/**
 * Check if a conversation belongs to a user
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @returns True if conversation belongs to user
 */
export async function conversationBelongsToUser(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const [conversation] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
  return !!conversation
}

/**
 * Find messages by conversation ID
 * @param conversationId - Conversation ID
 * @returns List of messages ordered by creation time
 */
export async function findMessagesByConversationId(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
}

/**
 * Create a message in a conversation
 * @param data - Message data including conversationId and optional usage fields
 * @returns Created message
 */
export async function createConversationMessage(data: {
  id?: string
  agentId: string
  conversationId: string
  userId?: string
  content: string
  isAgent: boolean
  model?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  cost?: number
}) {
  const [message] = await db.insert(messages).values(data).returning()

  // Update conversation's updatedAt
  await touchConversation(data.conversationId)

  return message
}

/**
 * Update a conversation message
 * @param id - Message ID
 * @param data - Fields to update
 * @returns Updated message or null
 */
export async function updateConversationMessage(
  id: string,
  data: {
    content?: string
    model?: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    cost?: number
  }
) {
  const [message] = await db.update(messages).set(data).where(eq(messages.id, id)).returning()
  return message || null
}
